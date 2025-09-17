use serde::Serialize;

use crate::commands::util::{env_bool, env_or_alias};

#[derive(Debug, Serialize)]
pub struct DiagEnvResponse {
    pub aai_api_key: bool,
    pub openai_api_key: bool,
    pub airtable_pat: bool,
    pub airtable_base: bool,
    pub airtable_table: String,
    pub make_webhook_url: bool,
}

#[tauri::command]
pub fn diag_env() -> DiagEnvResponse {
    DiagEnvResponse {
        aai_api_key: env_bool("AAI_API_KEY", &["ASSEMBLYAI_API_KEY"]),
        openai_api_key: env_bool("OPENAI_API_KEY", &[]),
        airtable_pat: env_bool("AIRTABLE_PAT", &["AIRTABLE_API_KEY"]),
        airtable_base: env_bool("AIRTABLE_BASE", &["AIRTABLE_BASE_ID"]),
        airtable_table: env_or_alias("AIRTABLE_TABLE", &["AIRTABLE_TABLE_NAME"])
            .unwrap_or_else(|| "Recordings".into()),
        make_webhook_url: env_bool("MAKE_WEBHOOK_URL", &[]),
    }
}
