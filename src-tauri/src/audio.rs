use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistAudioPayload {
    pub file_name: String,
    pub base64_data: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistAudioResponse {
    pub local_path: String,
}

#[tauri::command]
pub async fn persist_audio_wav(
    payload: PersistAudioPayload,
) -> Result<PersistAudioResponse, String> {
    let data = STANDARD
        .decode(payload.base64_data.trim())
        .map_err(|e| format!("audio decode failed: {}", e))?;
    let downloads = tauri::api::path::download_dir()
        .ok_or_else(|| "could not resolve download directory".to_string())?;
    let base_dir = downloads.join("ScribeCat");
    tauri::api::fs::create_dir_all(&base_dir, true)
        .map_err(|e| format!("create directory failed: {}", e))?;
    let file_name = sanitize_filename(&payload.file_name);
    let target = base_dir.join(file_name);
    tauri::api::fs::write_binary(&target, &data)
        .map_err(|e| format!("write audio failed: {}", e))?;
    Ok(PersistAudioResponse {
        local_path: target_to_string(&target),
    })
}

fn sanitize_filename(raw: &str) -> String {
    let candidate = Path::new(raw)
        .file_name()
        .map(|os| os.to_string_lossy().to_string())
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "recording.wav".to_string());
    let cleaned: String = candidate
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c,
        })
        .collect();
    if cleaned.to_lowercase().ends_with(".wav") {
        cleaned
    } else {
        format!("{}.wav", cleaned)
    }
}

fn target_to_string(path: &PathBuf) -> String {
    path.to_string_lossy().into_owned()
}
