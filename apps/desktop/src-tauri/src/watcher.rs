use crate::{
    model::{NativeLibraryRename, NativeLibraryWatchEvent, NativeLibraryWatchOptions},
    state::{AppState, display_error},
};
use notify::{
    Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher,
    event::{ModifyKind, RenameMode},
};
use std::{
    collections::HashSet,
    path::{Component, Path},
    sync::mpsc::{self, RecvTimeoutError},
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter, State};

const WATCH_EVENT_NAME: &str = "void://library-watch";
const DEBOUNCE_WINDOW: Duration = Duration::from_millis(400);

#[tauri::command]
pub fn start_library_watch(
    app: AppHandle,
    state: State<'_, AppState>,
    options: NativeLibraryWatchOptions,
) -> Result<String, String> {
    let root = state.validate_root(Path::new(&options.root_path))?;
    let watch_id = state.next_watch_id();
    let (sender, receiver) = mpsc::channel();
    let mut watcher: RecommendedWatcher = notify::recommended_watcher(move |event| {
        let _ = sender.send(event);
    })
    .map_err(display_error)?;
    let recursive_mode = if options.scan_subfolders {
        RecursiveMode::Recursive
    } else {
        RecursiveMode::NonRecursive
    };
    watcher
        .watch(&root, recursive_mode)
        .map_err(display_error)?;
    state.store_watcher(watch_id.clone(), watcher)?;

    let event_watch_id = watch_id.clone();
    if let Err(error) = std::thread::Builder::new()
        .name(format!("void-{watch_id}"))
        .spawn(move || watch_event_loop(app, root, event_watch_id, receiver))
    {
        let _ = state.remove_watcher(&watch_id);
        return Err(display_error(error));
    }

    Ok(watch_id)
}

#[tauri::command]
pub fn stop_library_watch(state: State<'_, AppState>, watch_id: String) -> Result<(), String> {
    if !state.remove_watcher(&watch_id)? {
        return Err("The requested library watcher is not active.".to_string());
    }
    Ok(())
}

fn watch_event_loop(
    app: AppHandle,
    root: std::path::PathBuf,
    watch_id: String,
    receiver: mpsc::Receiver<notify::Result<Event>>,
) {
    while let Ok(first) = receiver.recv() {
        let mut batch = WatchBatch::default();
        batch.push(&root, first);
        let deadline = Instant::now() + DEBOUNCE_WINDOW;

        loop {
            let remaining = deadline.saturating_duration_since(Instant::now());
            if remaining.is_zero() {
                break;
            }
            match receiver.recv_timeout(remaining) {
                Ok(event) => batch.push(&root, event),
                Err(RecvTimeoutError::Timeout | RecvTimeoutError::Disconnected) => break,
            }
        }

        if let Some(payload) = batch.into_payload(watch_id.clone()) {
            let _ = app.emit(WATCH_EVENT_NAME, payload);
        }
    }
}

#[derive(Default)]
struct WatchBatch {
    paths: HashSet<String>,
    renames: Vec<NativeLibraryRename>,
    rename_from_paths: Vec<String>,
    rename_to_paths: Vec<String>,
    had_error: bool,
}

impl WatchBatch {
    fn push(&mut self, root: &Path, result: notify::Result<Event>) {
        let event = match result {
            Ok(event) => event,
            Err(_) => {
                self.had_error = true;
                return;
            }
        };

        let relative_paths: Vec<String> = event
            .paths
            .iter()
            .filter_map(|path| relative_watch_path(root, path))
            .collect();
        self.paths.extend(relative_paths.iter().cloned());

        match event.kind {
            EventKind::Modify(ModifyKind::Name(RenameMode::Both)) if relative_paths.len() >= 2 => {
                self.renames.push(NativeLibraryRename {
                    from_path: relative_paths[0].clone(),
                    to_path: relative_paths[relative_paths.len() - 1].clone(),
                });
            }
            EventKind::Modify(ModifyKind::Name(RenameMode::From)) => {
                self.rename_from_paths.extend(relative_paths);
            }
            EventKind::Modify(ModifyKind::Name(RenameMode::To)) => {
                self.rename_to_paths.extend(relative_paths);
            }
            _ => {}
        }
    }

    fn into_payload(mut self, watch_id: String) -> Option<NativeLibraryWatchEvent> {
        if self.paths.is_empty() && !self.had_error {
            return None;
        }
        self.renames.extend(
            self.rename_from_paths
                .into_iter()
                .zip(self.rename_to_paths)
                .map(|(from_path, to_path)| NativeLibraryRename { from_path, to_path }),
        );
        let mut paths: Vec<String> = self.paths.into_iter().collect();
        paths.sort_unstable();
        Some(NativeLibraryWatchEvent {
            watch_id,
            kind: if self.had_error { "error" } else { "changed" }.to_string(),
            paths,
            renames: self.renames,
            message: self
                .had_error
                .then(|| "The native library watcher reported a filesystem error.".to_string()),
        })
    }
}

fn relative_watch_path(root: &Path, path: &Path) -> Option<String> {
    let relative = path.strip_prefix(root).ok()?;
    if relative
        .components()
        .any(|component| matches!(component, Component::Normal(value) if value == ".void"))
    {
        return None;
    }
    if relative.as_os_str().is_empty() {
        return Some(".".to_string());
    }
    Some(
        relative
            .components()
            .filter_map(|component| match component {
                Component::Normal(value) => Some(value.to_string_lossy().into_owned()),
                _ => None,
            })
            .collect::<Vec<_>>()
            .join("/"),
    )
}

#[cfg(test)]
mod tests {
    use super::{WatchBatch, relative_watch_path};
    use notify::{
        Event, EventKind, RecursiveMode, Watcher,
        event::{ModifyKind, RenameMode},
    };
    use std::{
        fs::File,
        path::Path,
        sync::mpsc,
        time::{Duration, Instant},
    };
    use tempfile::tempdir;

    #[test]
    fn watcher_payload_paths_are_relative_and_private_cache_is_ignored() {
        let root = Path::new(r"C:\Videos");
        assert_eq!(
            relative_watch_path(root, Path::new(r"C:\Videos\Trips\clip.mp4")),
            Some("Trips/clip.mp4".to_string())
        );
        assert_eq!(
            relative_watch_path(root, Path::new(r"C:\Videos\.void\cache.db")),
            None
        );
        assert_eq!(
            relative_watch_path(root, Path::new(r"C:\Outside\clip.mp4")),
            None
        );
    }

    #[test]
    fn recommended_native_watcher_observes_a_new_video() {
        let directory = tempdir().expect("watch fixture");
        let expected = directory.path().join("new-video.mp4");
        let (sender, receiver) = mpsc::channel();
        let mut watcher = notify::recommended_watcher(move |event| {
            let _ = sender.send(event);
        })
        .expect("native watcher");
        watcher
            .watch(directory.path(), RecursiveMode::Recursive)
            .expect("watch directory");

        File::create(&expected).expect("new video");
        let deadline = Instant::now() + Duration::from_secs(5);
        let mut observed = false;
        while Instant::now() < deadline {
            let remaining = deadline.saturating_duration_since(Instant::now());
            match receiver.recv_timeout(remaining) {
                Ok(Ok(event)) if event.paths.iter().any(|path| path == &expected) => {
                    observed = true;
                    break;
                }
                Ok(_) => continue,
                Err(_) => break,
            }
        }
        assert!(observed, "native watcher did not report the created video");
    }

    #[test]
    fn split_native_rename_events_are_paired_within_a_batch() {
        let root = Path::new(r"C:\Videos");
        let mut batch = WatchBatch::default();
        batch.push(
            root,
            Ok(
                Event::new(EventKind::Modify(ModifyKind::Name(RenameMode::From)))
                    .add_path(root.join("before.mp4")),
            ),
        );
        batch.push(
            root,
            Ok(
                Event::new(EventKind::Modify(ModifyKind::Name(RenameMode::To)))
                    .add_path(root.join("after.mp4")),
            ),
        );

        let payload = batch
            .into_payload("watch-test".to_string())
            .expect("payload");
        assert_eq!(payload.renames.len(), 1);
        assert_eq!(payload.renames[0].from_path, "before.mp4");
        assert_eq!(payload.renames[0].to_path, "after.mp4");
    }
}
