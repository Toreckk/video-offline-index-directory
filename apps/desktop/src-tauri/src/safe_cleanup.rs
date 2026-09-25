//! Verified-handle staging closes the hash-to-path-replacement race.
use crate::state::display_error;
use std::{
    fs::{File, OpenOptions},
    path::Path,
};

pub fn open_keeper(path: &Path) -> Result<File, String> {
    let mut options = OpenOptions::new();
    options.read(true);
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        options.share_mode(windows_sys::Win32::Storage::FileSystem::FILE_SHARE_READ);
    }
    options.open(path).map_err(display_error)
}

pub fn open_candidate(path: &Path) -> Result<File, String> {
    let mut options = OpenOptions::new();
    options.read(true);
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        use windows_sys::Win32::{
            Foundation::GENERIC_READ,
            Storage::FileSystem::{DELETE, FILE_SHARE_READ},
        };
        options
            .access_mode(GENERIC_READ | DELETE)
            .share_mode(FILE_SHARE_READ);
    }
    options.open(path).map_err(display_error)
}

#[cfg(windows)]
fn rename_handle(file: &File, destination: &Path) -> Result<(), String> {
    use std::os::windows::{ffi::OsStrExt, io::AsRawHandle};
    use windows_sys::Win32::Storage::FileSystem::{
        FILE_RENAME_INFO, FileRenameInfo, SetFileInformationByHandle,
    };
    let name: Vec<u16> = destination
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect();
    let bytes = std::mem::size_of::<FILE_RENAME_INFO>() + name.len() * 2;
    // Aligned backing allocation includes the trailing variable-length UTF-16 filename.
    let mut storage = vec![0usize; bytes.div_ceil(std::mem::size_of::<usize>())];
    unsafe {
        let info = storage.as_mut_ptr().cast::<FILE_RENAME_INFO>();
        (*info).FileNameLength = ((name.len() - 1) * 2) as u32;
        std::ptr::copy_nonoverlapping(
            name.as_ptr(),
            std::ptr::addr_of_mut!((*info).FileName).cast::<u16>(),
            name.len(),
        );
        // Zeroed ReplaceIfExists is false. Never resolve the source pathname again.
        if SetFileInformationByHandle(
            file.as_raw_handle(),
            FileRenameInfo,
            info.cast(),
            bytes as u32,
        ) == 0
        {
            return Err(display_error(std::io::Error::last_os_error()));
        }
    }
    Ok(())
}

pub fn recycle_verified(file: File, original: &Path) -> Result<(), String> {
    #[cfg(not(windows))]
    {
        let _ = (file, original);
        Err("Verified duplicate cleanup is supported on Windows only.".into())
    }
    #[cfg(windows)]
    {
        use std::io::Write;
        let parent = original
            .parent()
            .ok_or("Missing duplicate parent directory.")?;
        let recovery_root = parent.join(".void");
        std::fs::create_dir_all(&recovery_root).map_err(display_error)?;
        if !recovery_root
            .canonicalize()
            .map_err(display_error)?
            .starts_with(parent)
        {
            return Err(
                "The cleanup recovery directory points outside the selected folder.".into(),
            );
        }
        let directory = tempfile::Builder::new()
            .prefix("cleanup-")
            .tempdir_in(&recovery_root)
            .map_err(display_error)?
            .keep();
        let staged = directory.join(original.file_name().ok_or("Missing filename.")?);
        let journal = serde_json::json!({ "version": 1, "original": original, "staged": staged,
            "recovery": "If the file is here, move it to original only when that path is empty. If recycled, restore from Windows Recycle Bin first, then move it to original. Never overwrite a replacement." });
        let mut manifest = File::create(directory.join("recovery.json")).map_err(display_error)?;
        manifest
            .write_all(
                serde_json::to_string_pretty(&journal)
                    .map_err(display_error)?
                    .as_bytes(),
            )
            .map_err(display_error)?;
        manifest.sync_all().map_err(display_error)?;
        rename_handle(&file, &staged)?;
        drop(file);
        match recycle_only(&staged) {
            Ok(()) => Ok(()),
            Err(error) => {
                let restored =
                    open_candidate(&staged).and_then(|file| rename_handle(&file, original));
                match restored {
                    Ok(()) => Err(format!(
                        "Recycle Bin failed; the original file was restored. {error}"
                    )),
                    Err(_) => Err(format!(
                        "Recycle Bin failed. Recover the retained file from {} using recovery.json; the original path was not overwritten. {error}",
                        directory.display()
                    )),
                }
            }
        }
    }
}

#[cfg(windows)]
fn recycle_only(path: &Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows::{
        Win32::{System::Com::*, UI::Shell::*},
        core::PCWSTR,
    };
    unsafe {
        CoInitializeEx(None, COINIT_APARTMENTTHREADED)
            .ok()
            .map_err(display_error)?;
        struct Apartment;
        impl Drop for Apartment {
            fn drop(&mut self) {
                unsafe { CoUninitialize() }
            }
        }
        let _apartment = Apartment;
        let operation: IFileOperation =
            CoCreateInstance(&FileOperation, None, CLSCTX_INPROC_SERVER).map_err(display_error)?;
        operation
            .SetOperationFlags(
                FOF_SILENT
                    | FOF_NOERRORUI
                    | FOF_NOCONFIRMATION
                    | FOFX_EARLYFAILURE
                    | FOFX_RECYCLEONDELETE
                    | FOFX_ADDUNDORECORD,
            )
            .map_err(display_error)?;
        let path_text = path.to_string_lossy();
        let path = Path::new(path_text.strip_prefix(r"\\?\").unwrap_or(&path_text));
        let wide: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
        let item: IShellItem =
            SHCreateItemFromParsingName(PCWSTR(wide.as_ptr()), None).map_err(display_error)?;
        operation.DeleteItem(&item, None).map_err(display_error)?;
        operation.PerformOperations().map_err(display_error)?;
        if operation
            .GetAnyOperationsAborted()
            .map_err(display_error)?
            .as_bool()
            || path.exists()
        {
            return Err("Windows did not complete the recycle operation.".into());
        }
        Ok(())
    }
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;
    #[test]
    fn locked_handles_reject_concurrent_writes_and_path_replacement() {
        let directory = tempfile::tempdir().unwrap();
        let source = directory.path().join("duplicate.mp4");
        let destination = directory.path().join("staged.mp4");
        std::fs::write(&source, b"original").unwrap();
        let file = open_candidate(&source).unwrap();
        assert!(std::fs::write(&source, b"changed").is_err());
        assert!(std::fs::rename(&source, &destination).is_err());
        rename_handle(&file, &destination).unwrap();
        std::fs::write(&source, b"replacement").unwrap();
        assert!(rename_handle(&file, &source).is_err());
        drop(file);
        assert_eq!(std::fs::read(&source).unwrap(), b"replacement");
        assert_eq!(std::fs::read(&destination).unwrap(), b"original");
        let keeper = open_keeper(&source).unwrap();
        assert!(std::fs::write(&source, b"changed").is_err());
        assert!(std::fs::remove_file(&source).is_err());
        drop(keeper);
    }

    #[test]
    #[ignore = "exercises Windows Recycle Bin using one newly-created disposable fixture"]
    fn disposable_file_round_trip_through_windows_recycle_bin() {
        let workspace = std::env::var_os("VOID_RECYCLE_FIXTURE_ROOT")
            .expect("Set VOID_RECYCLE_FIXTURE_ROOT to the workspace artifacts directory");
        let directory = tempfile::tempdir_in(workspace).unwrap();
        let source = directory
            .path()
            .join("void-disposable-cleanup-test.mp4")
            .canonicalize()
            .unwrap_or_else(|_| {
                directory
                    .path()
                    .canonicalize()
                    .unwrap()
                    .join("void-disposable-cleanup-test.mp4")
            });
        std::fs::write(&source, b"VOID synthetic recycle fixture").unwrap();
        recycle_verified(open_candidate(&source).unwrap(), &source).unwrap();
        assert!(!source.exists());
        let journal_path = walkdir::WalkDir::new(directory.path())
            .into_iter()
            .filter_map(Result::ok)
            .find(|e| e.file_name() == "recovery.json")
            .unwrap()
            .into_path();
        let journal: serde_json::Value =
            serde_json::from_slice(&std::fs::read(journal_path).unwrap()).unwrap();
        let staged = std::path::PathBuf::from(journal["staged"].as_str().unwrap());
        // Match only the generated random directory; never modify unrelated bin contents.
        let candidates = trash::os_limited::list().unwrap();
        for item in &candidates {
            if item
                .name
                .to_string_lossy()
                .contains("void-disposable-cleanup-test")
            {
                eprintln!(
                    "Disposable bin entry: {:?} {:?}; expected {:?}",
                    item.name, item.original_parent, staged
                );
            }
        }
        let items = candidates
            .into_iter()
            .filter(|item| {
                let parent = item.original_parent.to_string_lossy();
                let expected = staged.parent().unwrap().to_string_lossy();
                parent
                    .trim_start_matches(r"\\?\")
                    .eq_ignore_ascii_case(expected.trim_start_matches(r"\\?\"))
                    && item.name == staged.file_name().unwrap()
            })
            .collect::<Vec<_>>();
        assert_eq!(
            items.len(),
            1,
            "the disposable fixture must exist in Recycle Bin"
        );
        trash::os_limited::restore_all(items).unwrap();
        assert_eq!(
            std::fs::read(&staged).unwrap(),
            b"VOID synthetic recycle fixture"
        );
        rename_handle(&open_candidate(&staged).unwrap(), &source).unwrap();
        assert_eq!(
            std::fs::read(source).unwrap(),
            b"VOID synthetic recycle fixture"
        );
    }
}
