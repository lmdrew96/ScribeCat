use serde::Serialize;
use tauri::State;

use crate::http_client::HttpClient;

#[derive(Serialize)]
pub struct IcsResponse {
    pub body: String,
}

#[tauri::command]
pub async fn fetch_ics(client: State<HttpClient>, url: String) -> Result<IcsResponse, String> {
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err("Only http(s) URLs are supported".to_string());
    }

    let response = client
        .inner()
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("ICS fetch failed: {}", e))?;
    let status = response.status();
    if !status.is_success() {
        return Err(format!("ICS fetch status {}", status));
    }
    let text = response
        .text()
        .await
        .map_err(|e| format!("ICS fetch parse failed: {}", e))?;

    Ok(IcsResponse { body: text })
}
