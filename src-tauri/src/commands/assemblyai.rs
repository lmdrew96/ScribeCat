use serde_json::Value;

use crate::commands::util::{env_or_alias, HTTP_CLIENT};

#[tauri::command]
pub async fn get_aai_token(expires_in_seconds: Option<u32>) -> Result<Value, String> {
    let api_key = env_or_alias("AAI_API_KEY", &["ASSEMBLYAI_API_KEY"])
        .ok_or_else(|| "Missing AAI_API_KEY / ASSEMBLYAI_API_KEY".to_string())?;
    let expires = expires_in_seconds.unwrap_or(300);
    let url = format!(
        "https://streaming.assemblyai.com/v3/token?expires_in_seconds={}",
        expires
    );

    let response = HTTP_CLIENT
        .get(&url)
        .header("Authorization", api_key)
        .send()
        .await
        .map_err(|e| format!("AssemblyAI token request failed: {}", e))?;

    let status = response.status();
    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("AssemblyAI response parse failed: {}", e))?;

    if !status.is_success() {
        return Err(format!("AssemblyAI returned {}: {}", status, json));
    }

    Ok(json)
}
