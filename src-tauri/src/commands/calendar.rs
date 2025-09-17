use crate::commands::util::HTTP_CLIENT;

#[tauri::command]
pub async fn fetch_ics(url: String) -> Result<String, String> {
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err("Only http/https URLs are supported".into());
    }

    let response = HTTP_CLIENT
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("ICS fetch failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("ICS fetch returned {}", response.status()));
    }

    response
        .text()
        .await
        .map_err(|e| format!("ICS body parse failed: {}", e))
}
