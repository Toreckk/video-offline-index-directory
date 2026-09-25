use std::{fs::File, path::Path};

/// File identity is evidence for a move, never authorization for file access.
pub fn identity(path: &Path) -> Option<String> {
    identity_from_file(&File::open(path).ok()?)
}

#[cfg(windows)]
pub fn identity_from_file(file: &File) -> Option<String> {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::Storage::FileSystem::{
        BY_HANDLE_FILE_INFORMATION, GetFileInformationByHandle,
    };
    let mut info: BY_HANDLE_FILE_INFORMATION = unsafe { std::mem::zeroed() };
    // SAFETY: the borrowed handle remains open and info points to a valid output buffer.
    if unsafe { GetFileInformationByHandle(file.as_raw_handle(), &mut info) } == 0 {
        return None;
    }
    Some(format!(
        "{:x}:{:x}:{:x}:{:x}:{:x}",
        info.dwVolumeSerialNumber,
        info.nFileIndexHigh,
        info.nFileIndexLow,
        info.ftCreationTime.dwHighDateTime,
        info.ftCreationTime.dwLowDateTime,
    ))
}

#[cfg(unix)]
pub fn identity_from_file(file: &File) -> Option<String> {
    use std::os::unix::fs::MetadataExt;
    let metadata = file.metadata().ok()?;
    Some(format!("{}:{}", metadata.dev(), metadata.ino()))
}

#[cfg(not(any(windows, unix)))]
pub fn identity_from_file(_file: &File) -> Option<String> {
    None
}
