use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

use crate::commands::util::sanitize_filename;

#[derive(Debug, Deserialize)]
pub struct UploadAudioArgs {
    pub filename: String,
    pub base64: String,
}

#[derive(Debug, Serialize)]
pub struct UploadAudioResult {
    pub url: String,
    pub path: String,
    pub bytes_written: usize,
}

#[tauri::command]
pub async fn upload_audio(
    app: tauri::AppHandle,
    args: UploadAudioArgs,
) -> Result<UploadAudioResult, String> {
    let decoded = BASE64_STANDARD
        .decode(args.base64.trim())
        .map_err(|e| format!("Audio decode failed: {}", e))?;
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("App data dir unavailable: {}", e))?;
    dir.push("recordings");
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create recordings dir: {}", e))?;

    let file_path: PathBuf = dir.join(sanitize_filename(&args.filename));
    fs::write(&file_path, &decoded).map_err(|e| format!("Failed to write audio: {}", e))?;

    let path_string = file_path.to_string_lossy().to_string();

    Ok(UploadAudioResult {
        url: path_string.clone(),
        path: path_string,
        bytes_written: decoded.len(),
    })
}
