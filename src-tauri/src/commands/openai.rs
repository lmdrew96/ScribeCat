use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::commands::util::{env_or_alias, HTTP_CLIENT};

static HTML_TAG_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"<[^>]+>").expect("html regex"));

fn openai_key() -> Option<String> {
    env_or_alias("OPENAI_API_KEY", &[])
}

#[derive(Debug, Deserialize)]
pub struct SummarizeRequest {
    pub transcript_text: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SummarizeResponse {
    pub summary_md: String,
}

#[tauri::command]
pub async fn summarize_transcript(payload: SummarizeRequest) -> Result<SummarizeResponse, String> {
    let key = openai_key().ok_or_else(|| "Missing OPENAI_API_KEY".to_string())?;
    let transcript = payload.transcript_text.unwrap_or_default();
    let prompt = format!(
        "Summarize this university lecture transcript into:\n- 5-10 bullet key points\n- key terms with one-line definitions\n- 3-5 potential exam questions\n- action items (if any)\n\nReturn Markdown. Transcript:\n{}",
        transcript
    );

    let response = HTTP_CLIENT
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(key)
        .json(&json!({
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3
        }))
        .send()
        .await
        .map_err(|e| format!("OpenAI summarize request failed: {}", e))?;

    let status = response.status();
    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("OpenAI summarize parse failed: {}", e))?;

    if !status.is_success() {
        return Err(format!("OpenAI summarize returned {}: {}", status, json));
    }

    let summary = json
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .unwrap_or_default()
        .to_string();

    Ok(SummarizeResponse {
        summary_md: summary,
    })
}

#[derive(Debug, Deserialize)]
pub struct PolishRequest {
    pub transcript_text: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PolishResponse {
    pub polished: String,
    pub skipped: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[tauri::command]
pub async fn polish_transcript(payload: PolishRequest) -> Result<PolishResponse, String> {
    let transcript = payload.transcript_text.unwrap_or_default();
    if transcript.is_empty() {
        return Ok(PolishResponse {
            polished: String::new(),
            skipped: true,
            reason: Some("empty_transcript".into()),
        });
    }
    let max_len = 100_000usize;
    let clipped = if transcript.len() > max_len {
        transcript.chars().take(max_len).collect::<String>()
    } else {
        transcript.clone()
    };

    let key = match openai_key() {
        Some(k) => k,
        None => {
            return Ok(PolishResponse {
                polished: transcript,
                skipped: true,
                reason: Some("no_openai_key".into()),
            });
        }
    };

    let prompt = format!(
        "Fix casing, punctuation, and obvious mis-hearings in this ASR transcript. Keep meaning; do not summarize.\n\nRAW:\n{}",
        clipped
    );

    let response = HTTP_CLIENT
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(key)
        .json(&json!({
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2
        }))
        .send()
        .await
        .map_err(|e| format!("OpenAI polish request failed: {}", e))?;

    let status = response.status();
    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("OpenAI polish parse failed: {}", e))?;

    if !status.is_success() {
        return Err(format!("OpenAI polish returned {}: {}", status, json));
    }

    let polished = json
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .unwrap_or(clipped.as_str())
        .to_string();

    Ok(PolishResponse {
        polished,
        skipped: false,
        reason: None,
    })
}

#[derive(Debug, Deserialize)]
pub struct ChatRequest {
    pub prompt: Option<String>,
    pub include_context: Option<bool>,
    pub notes_html: Option<String>,
    pub transcript_text: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub reply: String,
}

#[tauri::command]
pub async fn openai_chat(payload: ChatRequest) -> Result<ChatResponse, String> {
    let key = openai_key().ok_or_else(|| "Missing OPENAI_API_KEY".to_string())?;
    let include = payload.include_context.unwrap_or(false);
    let mut messages = vec![
        json!({"role": "system", "content": "You are ScribeCat, a study copilot. Be concise and structured."}),
    ];

    if include {
        let notes = HTML_TAG_RE
            .replace_all(&payload.notes_html.unwrap_or_default(), " ")
            .to_string();
        let transcript = payload.transcript_text.unwrap_or_default();
        messages.push(json!({
            "role": "user",
            "content": format!("CONTEXT\nNotes:\n{}\n\nTranscript:\n{}", notes, transcript)
        }));
    }

    messages.push(json!({
        "role": "user",
        "content": payload.prompt.unwrap_or_default()
    }));

    let response = HTTP_CLIENT
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(key)
        .json(&json!({
            "model": "gpt-4o-mini",
            "messages": messages,
            "temperature": 0.3
        }))
        .send()
        .await
        .map_err(|e| format!("OpenAI chat request failed: {}", e))?;

    let status = response.status();
    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("OpenAI chat parse failed: {}", e))?;

    if !status.is_success() {
        return Err(format!("OpenAI chat returned {}: {}", status, json));
    }

    let reply = json
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .unwrap_or_default()
        .to_string();

    Ok(ChatResponse { reply })
}
