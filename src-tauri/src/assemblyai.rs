use serde_json::Value;
use tauri::State;

use crate::http_client::HttpClient;

#[tauri::command]
pub async fn get_assemblyai_token(
    client: State<HttpClient>,
    expires_in_seconds: Option<u64>,
) -> Result<Value, String> {
    let key =
        std::env::var("AAI_API_KEY").map_err(|_| "AAI_API_KEY env var missing".to_string())?;
    let expires = expires_in_seconds.unwrap_or(300);
    let url = format!(
        "https://streaming.assemblyai.com/v3/token?expires_in_seconds={}",
        expires
    );
    let response = client
        .inner()
        .get(url)
        .header("Authorization", key)
        .send()
        .await
        .map_err(|e| format!("assemblyai token request failed: {}", e))?;

    let status = response.status();
    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("assemblyai token parse failed: {}", e))?;
    if !status.is_success() {
        return Err(format!("assemblyai token status {}: {}", status, json));
    }
    Ok(json)
}
