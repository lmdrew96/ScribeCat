use serde::Serialize;
use serde_json::{json, Map, Value};
use tauri::{AppHandle, State};

use crate::{airtable, http_client::HttpClient};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingResponse {
    pub ok: bool,
}

#[derive(Serialize)]
pub struct EnvDiagnostics {
    #[serde(rename = "AAI_API_KEY")]
    pub aai_api_key: bool,
    #[serde(rename = "OPENAI_API_KEY")]
    pub openai_api_key: bool,
    #[serde(rename = "AIRTABLE_PAT")]
    pub airtable_pat: bool,
    #[serde(rename = "AIRTABLE_BASE")]
    pub airtable_base: bool,
    #[serde(rename = "AIRTABLE_TABLE")]
    pub airtable_table: String,
    #[serde(rename = "MAKE_WEBHOOK_URL")]
    pub make_webhook_url: bool,
}

#[derive(Serialize)]
pub struct AirtableDiagnostics {
    pub create: Value,
    pub delete: Value,
    pub error: Option<String>,
}

#[tauri::command]
pub fn ping() -> PingResponse {
    PingResponse { ok: true }
}

#[tauri::command]
pub fn diag_env() -> EnvDiagnostics {
    EnvDiagnostics {
        aai_api_key: std::env::var("AAI_API_KEY").is_ok(),
        openai_api_key: std::env::var("OPENAI_API_KEY").is_ok(),
        airtable_pat: std::env::var("AIRTABLE_PAT").is_ok(),
        airtable_base: std::env::var("AIRTABLE_BASE").is_ok(),
        airtable_table: std::env::var("AIRTABLE_TABLE")
            .unwrap_or_else(|_| "Recordings".to_string()),
        make_webhook_url: std::env::var("MAKE_WEBHOOK_URL").is_ok(),
    }
}

#[tauri::command]
pub async fn diag_airtable(client: State<HttpClient>) -> Result<AirtableDiagnostics, String> {
    let mut fields = Map::new();
    fields.insert("Title".to_string(), Value::String("_diag".to_string()));
    fields.insert("Class".to_string(), Value::String("_diag".to_string()));

    let mut create_json = Value::Null;
    let mut delete_json = Value::Null;
    let mut error: Option<String> = None;

    match airtable::create_record(&client, fields).await {
        Ok(created) => {
            let record_id = created
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            create_json = created.clone();
            if !record_id.is_empty() {
                delete_json = match airtable::delete_record(&client, &record_id).await {
                    Ok(deleted) => deleted,
                    Err(e) => {
                        error = Some(e.clone());
                        json!({"error": e})
                    }
                };
            }
        }
        Err(e) => {
            error = Some(e.clone());
            create_json = json!({"error": e});
        }
    }

    Ok(AirtableDiagnostics {
        create: create_json,
        delete: delete_json,
        error,
    })
}

#[tauri::command]
pub fn quit_app(app: AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}
