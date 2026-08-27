use crate::{
    model::{NativeMediaMetadata, NativeMediaProbeStatus},
    state::{AppState, display_error},
};
use serde::Deserialize;
use serde_json::Value;
use std::{ffi::OsString, path::Path, process::Command};
use tauri::{AppHandle, Manager, async_runtime};

const PROVIDER: &str = "ffprobe";
const EXECUTABLE_OVERRIDE: &str = "VOID_FFPROBE_PATH";

#[derive(Debug, Deserialize)]
struct ProbeDocument {
    #[serde(default)]
    streams: Vec<ProbeStream>,
    format: Option<ProbeFormat>,
}

#[derive(Debug, Deserialize)]
struct ProbeFormat {
    duration: Option<Value>,
}

#[derive(Debug, Deserialize)]
struct ProbeStream {
    codec_type: Option<String>,
    codec_name: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    duration: Option<Value>,
}

#[tauri::command]
pub async fn media_probe_status() -> Result<NativeMediaProbeStatus, String> {
    async_runtime::spawn_blocking(probe_status)
        .await
        .map_err(display_error)
}

#[tauri::command]
pub async fn probe_media(
    app: AppHandle,
    absolute_path: String,
) -> Result<NativeMediaMetadata, String> {
    let path = app
        .state::<AppState>()
        .validate_file(Path::new(&absolute_path))?;
    async_runtime::spawn_blocking(move || probe_file(&path))
        .await
        .map_err(display_error)?
}

fn probe_status() -> NativeMediaProbeStatus {
    match Command::new(ffprobe_executable()).arg("-version").output() {
        Ok(output) if output.status.success() => NativeMediaProbeStatus {
            available: true,
            provider: PROVIDER.to_string(),
            detail: None,
        },
        Ok(output) => NativeMediaProbeStatus {
            available: false,
            provider: PROVIDER.to_string(),
            detail: Some(format!("ffprobe exited with status {}.", output.status)),
        },
        Err(error) => NativeMediaProbeStatus {
            available: false,
            provider: PROVIDER.to_string(),
            detail: Some(format!("ffprobe is unavailable: {error}")),
        },
    }
}

fn probe_file(path: &Path) -> Result<NativeMediaMetadata, String> {
    let output = Command::new(ffprobe_executable())
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=codec_type,codec_name,width,height,duration",
            "-of",
            "json",
        ])
        .arg(path)
        .output()
        .map_err(|error| format!("Unable to start ffprobe: {error}"))?;

    if !output.status.success() {
        let diagnostic = bounded_diagnostic(&output.stderr);
        return Err(if diagnostic.is_empty() {
            format!("ffprobe exited with status {}.", output.status)
        } else {
            format!("ffprobe could not analyze this video: {diagnostic}")
        });
    }

    let document: ProbeDocument = serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("ffprobe returned invalid metadata: {error}"))?;
    metadata_from_document(document)
}

fn metadata_from_document(document: ProbeDocument) -> Result<NativeMediaMetadata, String> {
    let video = document
        .streams
        .iter()
        .find(|stream| stream.codec_type.as_deref() == Some("video"))
        .ok_or_else(|| "ffprobe found no video stream.".to_string())?;
    let audio = document
        .streams
        .iter()
        .find(|stream| stream.codec_type.as_deref() == Some("audio"));
    let duration = document
        .format
        .as_ref()
        .and_then(|format| format.duration.as_ref())
        .and_then(scalar_to_f64)
        .or_else(|| video.duration.as_ref().and_then(scalar_to_f64))
        .filter(|value| value.is_finite() && *value >= 0.0);

    Ok(NativeMediaMetadata {
        duration,
        width: video.width,
        height: video.height,
        video_codec: video.codec_name.clone(),
        audio_codec: audio.and_then(|stream| stream.codec_name.clone()),
    })
}

fn scalar_to_f64(value: &Value) -> Option<f64> {
    match value {
        Value::Number(value) => value.as_f64(),
        Value::String(value) => value.parse().ok(),
        _ => None,
    }
}

fn bounded_diagnostic(bytes: &[u8]) -> String {
    let diagnostic = String::from_utf8_lossy(bytes);
    diagnostic.trim().chars().take(500).collect()
}

fn ffprobe_executable() -> OsString {
    std::env::var_os(EXECUTABLE_OVERRIDE).unwrap_or_else(|| OsString::from(PROVIDER))
}

#[cfg(test)]
mod tests {
    use super::{ProbeDocument, bounded_diagnostic, metadata_from_document, probe_file};
    use std::{path::Path, time::Instant};
    use walkdir::WalkDir;

    #[test]
    fn parses_video_audio_and_format_metadata() {
        let document: ProbeDocument = serde_json::from_str(
            r#"{
                "streams": [
                    {"codec_type":"video","codec_name":"h264","width":1920,"height":1080,"duration":"12.25"},
                    {"codec_type":"audio","codec_name":"aac"}
                ],
                "format":{"duration":"12.5"}
            }"#,
        )
        .expect("probe fixture");

        let metadata = metadata_from_document(document).expect("video metadata");
        assert_eq!(metadata.duration, Some(12.5));
        assert_eq!(metadata.width, Some(1920));
        assert_eq!(metadata.height, Some(1080));
        assert_eq!(metadata.video_codec.as_deref(), Some("h264"));
        assert_eq!(metadata.audio_codec.as_deref(), Some("aac"));
    }

    #[test]
    fn falls_back_to_stream_duration_and_rejects_audio_only_media() {
        let video: ProbeDocument =
            serde_json::from_str(r#"{"streams":[{"codec_type":"video","duration":3.75}]}"#)
                .expect("video fixture");
        assert_eq!(
            metadata_from_document(video)
                .expect("video metadata")
                .duration,
            Some(3.75)
        );

        let audio: ProbeDocument =
            serde_json::from_str(r#"{"streams":[{"codec_type":"audio","codec_name":"opus"}]}"#)
                .expect("audio fixture");
        assert!(metadata_from_document(audio).is_err());
    }

    #[test]
    fn bounds_external_diagnostics() {
        let diagnostic = bounded_diagnostic("x".repeat(800).as_bytes());
        assert_eq!(diagnostic.chars().count(), 500);
    }

    #[test]
    #[ignore = "requires VOID_MEDIA_PROBE_FIXTURE and an ffprobe executable"]
    fn benchmarks_a_configured_media_corpus() {
        let fixture = std::env::var_os("VOID_MEDIA_PROBE_FIXTURE")
            .expect("set VOID_MEDIA_PROBE_FIXTURE to a representative media directory");
        let files = WalkDir::new(Path::new(&fixture))
            .follow_links(false)
            .into_iter()
            .filter_map(Result::ok)
            .filter(|entry| entry.file_type().is_file())
            .map(|entry| entry.into_path())
            .filter(|path| {
                matches!(
                    path.extension()
                        .and_then(|extension| extension.to_str())
                        .map(str::to_ascii_lowercase)
                        .as_deref(),
                    Some("mp4" | "webm")
                )
            })
            .collect::<Vec<_>>();
        assert!(
            !files.is_empty(),
            "the configured corpus has no MP4 or WebM files"
        );

        let started = Instant::now();
        let successes = files.iter().filter(|path| probe_file(path).is_ok()).count();
        let elapsed = started.elapsed();
        eprintln!(
            "ffprobe corpus: {} succeeded, {} failed, {:?} total, {:?} average",
            successes,
            files.len() - successes,
            elapsed,
            elapsed / files.len() as u32
        );
        assert_eq!(successes, files.len(), "one or more corpus probes failed");
    }
}
