use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Number, Value};
use tauri::State;

use crate::{airtable, http_client::HttpClient, make};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRequest {
    pub title: Option<String>,
    pub class_name: Option<String>,
    pub audio_url: Option<String>,
    pub duration_seconds: Option<u64>,
    pub confidence: Option<f64>,
    pub notes_html: Option<String>,
    pub transcript_text: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveResponse {
    pub ok: bool,
    pub airtable_record_id: Option<String>,
    pub make: Value,
}

#[tauri::command]
pub async fn save_session(
    client: State<HttpClient>,
    payload: SaveRequest,
) -> Result<SaveResponse, String> {
    let title = payload.title.unwrap_or_else(|| "Lecture".to_string());
    let class_name = payload.class_name.unwrap_or_default();
    let audio_url = payload.audio_url.unwrap_or_default();
    let duration = payload.duration_seconds.unwrap_or_default();
    let confidence = payload.confidence;
    let notes_html = payload.notes_html.unwrap_or_default();
    let transcript_text = payload.transcript_text.unwrap_or_default();

    let mut fields = Map::new();
    fields.insert("Title".to_string(), Value::String(title.clone()));
    fields.insert("Class".to_string(), Value::String(class_name.clone()));
    if !audio_url.trim().is_empty() {
        fields.insert("Audio URL".to_string(), Value::String(audio_url.clone()));
    }
    if duration > 0 {
        fields.insert(
            "Duration (s)".to_string(),
            Value::Number(Number::from(duration)),
        );
    }
    if let Some(conf) = confidence {
        if let Some(number) = Number::from_f64(conf) {
            fields.insert("Confidence".to_string(), Value::Number(number));
        }
    }
    if !notes_html.trim().is_empty() {
        fields.insert(
            "Notes (HTML)".to_string(),
            Value::String(notes_html.clone()),
        );
    }
    if !transcript_text.trim().is_empty() {
        fields.insert(
            "Transcript (Text)".to_string(),
            Value::String(transcript_text.clone()),
        );
    }

    let created = airtable::create_record(&client, fields)
        .await
        .map_err(|e| format!("airtable save failed: {}", e))?;
    let record_id = created
        .get("id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let make_payload = json!({
        "title": title,
        "class_name": class_name,
        "notes_html": notes_html,
        "transcript_text": transcript_text,
        "airtable": {
            "baseId": std::env::var("AIRTABLE_BASE").unwrap_or_default(),
            "table": std::env::var("AIRTABLE_TABLE").unwrap_or_else(|_| "Recordings".to_string()),
            "recordId": record_id.clone()
        }
    });

    let make_result = make::trigger_webhook(&client, &make_payload)
        .await
        .unwrap_or_else(|e| json!({"error": e}));

    Ok(SaveResponse {
        ok: true,
        airtable_record_id: record_id,
        make: make_result,
    })
}
