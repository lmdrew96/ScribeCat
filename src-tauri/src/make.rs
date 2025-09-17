use serde_json::{json, Value};

use crate::http_client::HttpClient;

pub async fn trigger_webhook(client: &HttpClient, payload: &Value) -> Result<Value, String> {
    let url = match std::env::var("MAKE_WEBHOOK_URL") {
        Ok(v) if !v.trim().is_empty() => v,
        _ => return Ok(json!({"skipped": true})),
    };

    let response = client
        .inner()
        .post(url)
        .json(payload)
        .send()
        .await
        .map_err(|e| format!("make webhook failed: {}", e))?;
    let status = response.status().as_u16();
    let text = response
        .text()
        .await
        .map_err(|e| format!("make webhook parse failed: {}", e))?;
    let body = serde_json::from_str::<Value>(&text).unwrap_or(Value::Null);
    Ok(json!({
        "status": status,
        "body": body
    }))
}
