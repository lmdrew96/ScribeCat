use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};

use crate::commands::util::{env_or_alias, HTTP_CLIENT};

fn airtable_base() -> Result<String, String> {
    env_or_alias("AIRTABLE_BASE", &["AIRTABLE_BASE_ID"])
        .ok_or_else(|| "Missing AIRTABLE_BASE / AIRTABLE_BASE_ID".to_string())
}

fn airtable_table() -> String {
    env_or_alias("AIRTABLE_TABLE", &["AIRTABLE_TABLE_NAME"])
        .unwrap_or_else(|| "Recordings".to_string())
}

fn airtable_pat() -> Result<String, String> {
    env_or_alias("AIRTABLE_PAT", &["AIRTABLE_API_KEY"])
        .ok_or_else(|| "Missing AIRTABLE_PAT / AIRTABLE_API_KEY".to_string())
}

async fn airtable_create(fields: Map<String, Value>) -> Result<Value, String> {
    let base = airtable_base()?;
    let table = airtable_table();
    let pat = airtable_pat()?;
    let url = format!(
        "https://api.airtable.com/v0/{}/{}",
        base,
        urlencoding::encode(&table)
    );

    let response = HTTP_CLIENT
        .post(url)
        .bearer_auth(pat)
        .json(&json!({ "fields": fields }))
        .send()
        .await
        .map_err(|e| format!("Airtable create failed: {}", e))?;

    let status = response.status();
    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("Airtable create parse failed: {}", e))?;

    if !status.is_success() {
        return Err(format!("Airtable create returned {}: {}", status, json));
    }

    Ok(json)
}

async fn airtable_delete(record_id: &str) -> Result<Value, String> {
    let base = airtable_base()?;
    let table = airtable_table();
    let pat = airtable_pat()?;
    let url = format!(
        "https://api.airtable.com/v0/{}/{}/{}",
        base,
        urlencoding::encode(&table),
        record_id
    );

    let response = HTTP_CLIENT
        .delete(url)
        .bearer_auth(pat)
        .send()
        .await
        .map_err(|e| format!("Airtable delete failed: {}", e))?;

    let status = response.status();
    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("Airtable delete parse failed: {}", e))?;

    if !status.is_success() {
        return Err(format!("Airtable delete returned {}: {}", status, json));
    }

    Ok(json)
}

#[derive(Debug, Deserialize)]
pub struct SavePayload {
    pub title: Option<String>,
    pub class_name: Option<String>,
    pub audio_url: Option<String>,
    pub duration_seconds: Option<f64>,
    pub confidence: Option<f64>,
    pub notes_html: Option<String>,
    pub transcript_text: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MakeWebhookResult {
    pub skipped: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SaveResponse {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub airtable_record_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub make: Option<MakeWebhookResult>,
}

fn build_fields(payload: &SavePayload) -> Map<String, Value> {
    let mut fields = Map::new();
    fields.insert(
        "Title".into(),
        json!(payload.title.clone().unwrap_or_else(|| "Lecture".into())),
    );
    fields.insert(
        "Class".into(),
        json!(payload.class_name.clone().unwrap_or_default()),
    );
    if let Some(url) = &payload.audio_url {
        if !url.trim().is_empty() {
            fields.insert("Audio URL".into(), json!(url));
        }
    }
    if let Some(d) = payload.duration_seconds {
        if d.is_finite() && d > 0.0 {
            fields.insert("Duration (s)".into(), json!(d));
        }
    }
    if let Some(conf) = payload.confidence {
        if conf.is_finite() {
            fields.insert("Confidence".into(), json!(conf));
        }
    }
    if let Some(notes) = &payload.notes_html {
        if !notes.trim().is_empty() {
            fields.insert("Notes (HTML)".into(), json!(notes));
        }
    }
    if let Some(transcript) = &payload.transcript_text {
        if !transcript.trim().is_empty() {
            fields.insert("Transcript (Text)".into(), json!(transcript));
        }
    }
    fields
}

async fn trigger_make(payload: &SavePayload, record_id: &str) -> MakeWebhookResult {
    let Some(url) = env_or_alias("MAKE_WEBHOOK_URL", &[]) else {
        return MakeWebhookResult {
            skipped: true,
            status: None,
            body: None,
            error: None,
        };
    };

    let body = json!({
        "title": payload.title.clone().unwrap_or_else(|| "Lecture".into()),
        "class_name": payload.class_name.clone().unwrap_or_default(),
        "notes_html": payload.notes_html.clone().unwrap_or_default(),
        "transcript_text": payload.transcript_text.clone().unwrap_or_default(),
        "airtable": {
            "baseId": airtable_base().unwrap_or_default(),
            "table": airtable_table(),
            "recordId": record_id
        }
    });

    match HTTP_CLIENT.post(url).json(&body).send().await {
        Ok(resp) => {
            let status = resp.status().as_u16();
            let bytes = resp.bytes().await.unwrap_or_default();
            let body_json = serde_json::from_slice::<Value>(&bytes).ok();
            MakeWebhookResult {
                skipped: false,
                status: Some(status),
                body: body_json,
                error: None,
            }
        }
        Err(e) => MakeWebhookResult {
            skipped: false,
            status: None,
            body: None,
            error: Some(e.to_string()),
        },
    }
}

#[tauri::command]
pub async fn save_record(payload: SavePayload) -> Result<SaveResponse, String> {
    let fields = build_fields(&payload);
    let created = airtable_create(fields).await?;
    let record_id = created
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Airtable response missing record id".to_string())?
        .to_string();

    let make = trigger_make(&payload, &record_id).await;

    Ok(SaveResponse {
        ok: true,
        airtable_record_id: Some(record_id),
        make: Some(make),
    })
}

#[derive(Debug, Serialize)]
pub struct DiagAirtableResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub create: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delete: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[tauri::command]
pub async fn diag_airtable() -> Result<DiagAirtableResponse, String> {
    let mut create_result: Option<Value> = None;
    let mut delete_result: Option<Value> = None;
    let mut error: Option<String> = None;

    match airtable_create(
        json!({
            "Title": "_diag",
            "Class": "_diag"
        })
        .as_object()
        .cloned()
        .unwrap_or_default(),
    )
    .await
    {
        Ok(created) => {
            if let Some(id) = created.get("id").and_then(|v| v.as_str()) {
                create_result = Some(created.clone());
                match airtable_delete(id).await {
                    Ok(deleted) => {
                        delete_result = Some(deleted);
                    }
                    Err(e) => {
                        error = Some(e);
                    }
                }
            } else {
                error = Some("Airtable create missing id".into());
            }
        }
        Err(e) => {
            error = Some(e);
        }
    }

    Ok(DiagAirtableResponse {
        create: create_result,
        delete: delete_result,
        error,
    })
}
