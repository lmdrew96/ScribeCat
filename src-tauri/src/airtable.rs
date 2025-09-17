use serde_json::{json, Map, Value};

use crate::http_client::HttpClient;

pub async fn create_record(
    client: &HttpClient,
    fields: Map<String, Value>,
) -> Result<Value, String> {
    let pat =
        std::env::var("AIRTABLE_PAT").map_err(|_| "AIRTABLE_PAT env var missing".to_string())?;
    let base =
        std::env::var("AIRTABLE_BASE").map_err(|_| "AIRTABLE_BASE env var missing".to_string())?;
    let table = std::env::var("AIRTABLE_TABLE").unwrap_or_else(|_| "Recordings".to_string());
    let url = format!(
        "https://api.airtable.com/v0/{}/{}",
        base,
        urlencoding::encode(&table)
    );

    let response = client
        .inner()
        .post(url)
        .header("Authorization", format!("Bearer {}", pat))
        .json(&json!({ "fields": Value::Object(fields) }))
        .send()
        .await
        .map_err(|e| format!("airtable create failed: {}", e))?;

    let status = response.status();
    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("airtable create parse failed: {}", e))?;
    if !status.is_success() {
        return Err(format!("airtable create status {}: {}", status, json));
    }
    Ok(json)
}

pub async fn delete_record(client: &HttpClient, record_id: &str) -> Result<Value, String> {
    let pat =
        std::env::var("AIRTABLE_PAT").map_err(|_| "AIRTABLE_PAT env var missing".to_string())?;
    let base =
        std::env::var("AIRTABLE_BASE").map_err(|_| "AIRTABLE_BASE env var missing".to_string())?;
    let table = std::env::var("AIRTABLE_TABLE").unwrap_or_else(|_| "Recordings".to_string());
    let url = format!(
        "https://api.airtable.com/v0/{}/{}/{}",
        base,
        urlencoding::encode(&table),
        record_id
    );

    let response = client
        .inner()
        .delete(url)
        .header("Authorization", format!("Bearer {}", pat))
        .send()
        .await
        .map_err(|e| format!("airtable delete failed: {}", e))?;
    let status = response.status();
    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("airtable delete parse failed: {}", e))?;
    if !status.is_success() {
        return Err(format!("airtable delete status {}: {}", status, json));
    }
    Ok(json)
}
