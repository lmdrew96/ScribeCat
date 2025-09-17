use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::State;

use crate::http_client::HttpClient;

#[derive(Deserialize)]
pub struct SummarizeRequest {
    pub transcript_text: Option<String>,
}

#[derive(Serialize)]
pub struct SummarizeResponse {
    pub summary_md: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolishRequest {
    pub transcript_text: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PolishResponse {
    pub polished: String,
    pub skipped: bool,
    pub reason: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatRequest {
    pub prompt: String,
    pub include_context: Option<bool>,
    pub notes_html: Option<String>,
    pub transcript_text: Option<String>,
}

#[derive(Serialize)]
pub struct ChatResponse {
    pub reply: String,
}

#[tauri::command]
pub async fn summarize_transcript(
    client: State<HttpClient>,
    payload: SummarizeRequest,
) -> Result<SummarizeResponse, String> {
    let key = std::env::var("OPENAI_API_KEY")
        .map_err(|_| "OPENAI_API_KEY env var missing".to_string())?;
    let transcript = payload.transcript_text.unwrap_or_default();
    let prompt = format!(
        "Summarize this university lecture transcript into:\n- 5-10 bullet key points\n- key terms with one-line definitions\n- 3-5 potential exam questions\n- action items (if any)\n\nReturn Markdown. Transcript:\n{}",
        transcript
    );
    let body = json!({
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3
    });
    let response = client
        .inner()
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("openai summarize request failed: {}", e))?;
    let status = response.status();
    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("openai summarize parse failed: {}", e))?;
    if !status.is_success() {
        return Err(format!("openai summarize status {}: {}", status, json));
    }
    let summary = json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("");
    Ok(SummarizeResponse {
        summary_md: summary.to_string(),
    })
}

#[tauri::command]
pub async fn polish_transcript(
    client: State<HttpClient>,
    payload: PolishRequest,
) -> Result<PolishResponse, String> {
    let transcript = payload.transcript_text;
    let key = match std::env::var("OPENAI_API_KEY") {
        Ok(v) => v,
        Err(_) => {
            return Ok(PolishResponse {
                polished: transcript,
                skipped: true,
                reason: Some("no_openai_key".to_string()),
            })
        }
    };
    let clipped = transcript.chars().take(100_000).collect::<String>();
    let prompt = format!(
        "Fix casing, punctuation, and obvious mis-hearings in this ASR transcript. Keep meaning; do not summarize.\n\nRAW:\n{}",
        clipped
    );
    let body = json!({
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2
    });
    let response = client
        .inner()
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("openai polish request failed: {}", e))?;
    let status = response.status();
    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("openai polish parse failed: {}", e))?;
    if !status.is_success() {
        return Err(format!("openai polish status {}: {}", status, json));
    }
    let content = json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or(&clipped);
    Ok(PolishResponse {
        polished: content.to_string(),
        skipped: false,
        reason: None,
    })
}

#[tauri::command]
pub async fn openai_chat(
    client: State<HttpClient>,
    payload: ChatRequest,
) -> Result<ChatResponse, String> {
    let key = std::env::var("OPENAI_API_KEY")
        .map_err(|_| "OPENAI_API_KEY env var missing".to_string())?;
    let include_context = payload.include_context.unwrap_or(false);
    let mut messages = vec![json!({
        "role": "system",
        "content": "You are ScribeCat, a study copilot. Be concise and structured."
    })];
    if include_context {
        let notes = strip_tags(payload.notes_html.unwrap_or_default());
        let transcript = payload.transcript_text.unwrap_or_default();
        messages.push(json!({
            "role": "user",
            "content": format!("CONTEXT\nNotes:\n{}\n\nTranscript:\n{}", notes, transcript)
        }));
    }
    messages.push(json!({"role": "user", "content": payload.prompt}));

    let body = json!({
        "model": "gpt-4o-mini",
        "messages": messages,
        "temperature": 0.3
    });

    let response = client
        .inner()
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("openai chat request failed: {}", e))?;
    let status = response.status();
    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("openai chat parse failed: {}", e))?;
    if !status.is_success() {
        return Err(format!("openai chat status {}: {}", status, json));
    }
    let reply = json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("");
    Ok(ChatResponse {
        reply: reply.to_string(),
    })
}

fn strip_tags(input: String) -> String {
    static TAG_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"<[^>]+>").expect("valid regex"));
    TAG_RE.replace_all(&input, " ").into_owned()
}
