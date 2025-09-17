#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, State};

struct AppState {
    http: reqwest::Client,
    canvas_courses: Mutex<Vec<Course>>, // already sorted by name
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            http: reqwest::Client::builder()
                .user_agent("ScribeCat-Desktop/1.0")
                .build()
                .expect("failed to build HTTP client"),
            canvas_courses: Mutex::new(Vec::new()),
        }
    }
}

#[derive(Clone, Serialize)]
struct Course {
    id: String,
    name: String,
}

#[derive(Debug, Deserialize)]
struct CanvasCourseInput {
    id: Option<String>,
    name: Option<String>,
}

#[derive(Debug, Serialize)]
struct CanvasPushResult {
    count: usize,
    courses: Vec<Course>,
}

#[derive(Debug, Serialize)]
struct CanvasPullResult {
    courses: Vec<Course>,
}

#[derive(Debug, Deserialize)]
struct SavePayload {
    title: Option<String>,
    class_name: Option<String>,
    duration_seconds: Option<u64>,
    confidence: Option<f64>,
    notes_html: Option<String>,
    transcript_text: Option<String>,
    audio_url: Option<String>,
}

#[derive(Debug, Serialize)]
struct SaveResult {
    ok: bool,
    airtable_record_id: Option<String>,
    make: Option<Value>,
}

#[derive(Debug, Serialize)]
struct UploadAudioResult {
    url: Option<String>,
    path: Option<String>,
    skipped: bool,
    reason: Option<String>,
}

#[derive(Debug, Serialize)]
struct EnvDiagnostics {
    healthy: bool,
    assemblyai_api_key: bool,
    airtable_pat: bool,
    airtable_base: bool,
    airtable_table: String,
    make_webhook_url: bool,
    openai_api_key: bool,
}

#[derive(Debug, Serialize)]
struct AirtableDiagResult {
    create: Option<Value>,
    delete: Option<Value>,
    error: Option<String>,
}

#[tauri::command]
async fn request_aai_token(
    state: State<'_, AppState>,
    expires_in_seconds: Option<u32>,
) -> Result<Value, String> {
    let key = env_alias(["ASSEMBLYAI_API_KEY", "AAI_API_KEY"]) 
        .ok_or_else(|| "Missing ASSEMBLYAI_API_KEY".to_string())?;
    let expires = expires_in_seconds.unwrap_or(300);
    let url = format!(
        "https://streaming.assemblyai.com/v3/token?expires_in_seconds={}",
        expires
    );

    let resp = state
        .http
        .get(url)
        .header("Authorization", key)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = resp.status();
    let body: Value = resp.json().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(body.to_string());
    }
    Ok(body)
}

#[tauri::command]
async fn save_session(state: State<'_, AppState>, payload: SavePayload) -> Result<SaveResult, String> {
    let pat = env_alias(["AIRTABLE_PAT", "AIRTABLE_API_KEY"]).ok_or_else(|| {
        "Missing AIRTABLE_PAT (or AIRTABLE_API_KEY) for Airtable save".to_string()
    })?;
    let base = env_alias(["AIRTABLE_BASE", "AIRTABLE_BASE_ID"]).ok_or_else(|| {
        "Missing AIRTABLE_BASE (or AIRTABLE_BASE_ID) for Airtable save".to_string()
    })?;
    let table = env_alias(["AIRTABLE_TABLE", "AIRTABLE_TABLE_NAME"]).unwrap_or_else(|| "Recordings".to_string());

    let mut fields = serde_json::Map::new();
    fields.insert(
        "Title".into(),
        json!(payload.title.unwrap_or_else(|| "Lecture".to_string())),
    );
    fields.insert(
        "Class".into(),
        json!(payload.class_name.unwrap_or_default()),
    );
    if let Some(seconds) = payload.duration_seconds {
        if seconds > 0 {
            fields.insert("Duration (s)".into(), json!(seconds));
        }
    }
    if let Some(conf) = payload.confidence {
        fields.insert("Confidence".into(), json!(conf));
    }
    if let Some(notes) = payload.notes_html {
        if !notes.trim().is_empty() {
            fields.insert("Notes (HTML)".into(), json!(notes));
        }
    }
    if let Some(txt) = payload.transcript_text {
        if !txt.trim().is_empty() {
            fields.insert("Transcript (Text)".into(), json!(txt));
        }
    }
    if let Some(audio_url) = payload.audio_url {
        if !audio_url.trim().is_empty() {
            fields.insert("Audio URL".into(), json!(audio_url));
        }
    }

    let airtable_url = format!(
        "https://api.airtable.com/v0/{}/{}",
        base,
        urlencoding::encode(&table)
    );

    let resp = state
        .http
        .post(&airtable_url)
        .header("Authorization", format!("Bearer {}", pat))
        .json(&json!({ "fields": fields }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = resp.status();
    let body: Value = resp.json().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("Airtable {}: {}", status, body));
    }
    let record_id = body
        .get("id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let make_result = if let Some(webhook) = env_alias(["MAKE_WEBHOOK_URL"]) {
        let payload = json!({
            "title": body
                .get("fields")
                .and_then(|f| f.get("Title"))
                .cloned()
                .unwrap_or_else(|| json!("Lecture")),
            "class_name": payload.class_name.unwrap_or_default(),
            "notes_html": body
                .get("fields")
                .and_then(|f| f.get("Notes (HTML)"))
                .cloned()
                .unwrap_or_default(),
            "transcript_text": body
                .get("fields")
                .and_then(|f| f.get("Transcript (Text)"))
                .cloned()
                .unwrap_or_default(),
            "audio_url": fields.get("Audio URL").cloned().unwrap_or_default(),
            "airtable": {
                "baseId": base,
                "table": table,
                "recordId": record_id.clone().unwrap_or_default()
            }
        });
        let resp = state
            .http
            .post(webhook)
            .json(&payload)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        let status = resp.status();
        let body: Value = resp.json().await.unwrap_or_default();
        Some(json!({ "status": status.as_u16(), "body": body }))
    } else {
        None
    };

    Ok(SaveResult {
        ok: true,
        airtable_record_id: record_id,
        make: make_result,
    })
}

#[tauri::command]
async fn upload_audio(
    app: AppHandle,
    filename: String,
    bytes: Vec<u8>,
) -> Result<UploadAudioResult, String> {
    if bytes.is_empty() {
        return Ok(UploadAudioResult {
            url: None,
            path: None,
            skipped: true,
            reason: Some("No audio data provided".into()),
        });
    }

    let safe_name = sanitize_filename(&filename).unwrap_or_else(|| "recording.wav".into());
    let resolver = app.path_resolver();
    let base_dir = resolver
        .app_data_dir()
        .or_else(|| resolver.app_local_data_dir())
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
    let store_dir = base_dir.join("recordings");
    fs::create_dir_all(&store_dir).map_err(|e| e.to_string())?;
    let path = store_dir.join(&safe_name);
    let mut file = File::create(&path).map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;

    Ok(UploadAudioResult {
        url: None,
        path: Some(path.to_string_lossy().into()),
        skipped: false,
        reason: None,
    })
}

#[tauri::command]
fn diag_env() -> EnvDiagnostics {
    let assemblyai = env_alias(["ASSEMBLYAI_API_KEY", "AAI_API_KEY"]).is_some();
    let airtable_pat = env_alias(["AIRTABLE_PAT", "AIRTABLE_API_KEY"]).is_some();
    let airtable_base = env_alias(["AIRTABLE_BASE", "AIRTABLE_BASE_ID"]).is_some();
    let airtable_table = env_alias(["AIRTABLE_TABLE", "AIRTABLE_TABLE_NAME"]).unwrap_or_else(|| "Recordings".to_string());
    let make_webhook = env_alias(["MAKE_WEBHOOK_URL"]).is_some();
    let openai = env_alias(["OPENAI_API_KEY"]).is_some();

    EnvDiagnostics {
        healthy: assemblyai && airtable_pat && airtable_base,
        assemblyai_api_key: assemblyai,
        airtable_pat,
        airtable_base,
        airtable_table,
        make_webhook_url: make_webhook,
        openai_api_key: openai,
    }
}

#[tauri::command]
async fn diag_airtable(state: State<'_, AppState>) -> Result<AirtableDiagResult, String> {
    let pat = env_alias(["AIRTABLE_PAT", "AIRTABLE_API_KEY"]).ok_or_else(|| {
        "Missing AIRTABLE_PAT (or AIRTABLE_API_KEY) for Airtable diagnostics".to_string()
    })?;
    let base = env_alias(["AIRTABLE_BASE", "AIRTABLE_BASE_ID"]).ok_or_else(|| {
        "Missing AIRTABLE_BASE (or AIRTABLE_BASE_ID) for Airtable diagnostics".to_string()
    })?;
    let table = env_alias(["AIRTABLE_TABLE", "AIRTABLE_TABLE_NAME"]).unwrap_or_else(|| "Recordings".to_string());
    let url = format!(
        "https://api.airtable.com/v0/{}/{}",
        base,
        urlencoding::encode(&table)
    );

    let client = &state.http;
    let create_resp = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", pat))
        .json(&json!({ "fields": { "Title": "_diag", "Class": "_diag" } }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let create_json: Value = create_resp.json().await.map_err(|e| e.to_string())?;

    let record_id = create_json
        .get("id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let delete_result = if let Some(id) = &record_id {
        let del_url = format!("{}/{}", url, id);
        let resp = client
            .delete(del_url)
            .header("Authorization", format!("Bearer {}", pat))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        let json: Value = resp.json().await.unwrap_or_default();
        Some(json)
    } else {
        None
    };

    Ok(AirtableDiagResult {
        create: Some(create_json),
        delete: delete_result,
        error: None,
    })
}

#[tauri::command]
fn canvas_push(state: State<'_, AppState>, courses: Vec<CanvasCourseInput>) -> Result<CanvasPushResult, String> {
    let mut by_id: HashMap<String, Vec<String>> = HashMap::new();
    for course in courses {
        let id = course.id.unwrap_or_default();
        if id.trim().is_empty() {
            continue;
        }
        if let Some(name) = course.name {
            let formatted = format_code_title(&name);
            if formatted.is_empty() {
                continue;
            }
            by_id
                .entry(id.clone())
                .or_default()
                .push(formatted);
        }
    }

    let mut clean: Vec<Course> = by_id
        .into_iter()
        .filter_map(|(id, names)| {
            let best = pick_best_name(&names);
            if best.is_empty() {
                None
            } else {
                Some(Course { id, name: best })
            }
        })
        .collect();
    clean.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    clean.truncate(200);

    if let Ok(mut guard) = state.canvas_courses.lock() {
        *guard = clean.clone();
    }

    Ok(CanvasPushResult {
        count: clean.len(),
        courses: clean,
    })
}

#[tauri::command]
fn canvas_pull(state: State<'_, AppState>) -> Result<CanvasPullResult, String> {
    let list = state
        .canvas_courses
        .lock()
        .map_err(|_| "Failed to lock canvas course cache".to_string())?
        .clone();
    Ok(CanvasPullResult { courses: list })
}

#[tauri::command]
fn quit_app(app: AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}

fn env_alias<const N: usize>(keys: [&str; N]) -> Option<String> {
    keys.iter()
        .filter_map(|k| std::env::var(k).ok())
        .find(|v| !v.trim().is_empty())
}

fn sanitize_filename(name: &str) -> Option<String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return None;
    }
    let sanitized: String = trimmed
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c,
        })
        .collect();
    Some(sanitized)
}

static RE_TERM_SEMESTER_PAREN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\((?:Fall|Spring|Summer|Winter)\s*20\d{2}\)").expect("semester paren regex")
});
static RE_TERM_SEMESTER: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(Fall|Spring|Summer|Winter)\s*20\d{2}\b").expect("semester regex")
});
static RE_TERM_SHORT: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(FA|SP|SU|WI)\s*\d{2}\b").expect("short semester regex")
});
static RE_SECTION: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\bsection\s*\d+[A-Za-z]?\b").expect("section regex")
});
static RE_DASH_NUM: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\b-?\s*\d{2,3}[A-Za-z]?\b").expect("dash num regex")
});
static RE_SUBJECT_TRAIL: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b\d{2}F?-?[A-Z]{2,5}\d{3}\b").expect("subject trail regex")
});
static RE_LONG_CODE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b[A-Z]{2,5}\d{3,4}-\d{2,3}20\d{2}\b").expect("long code regex")
});
static RE_MULTI_SPACE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\s{2,}").unwrap());
static RE_JUNK: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(points|submission|submissions|needs grading|Quiz|Assignment|Unit|EXAM|Chapter|Lab\b.*Cells|out of|required)\b")
        .expect("junk regex")
});
static RE_CODE_TITLE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b([A-Za-z]{2,6})\s*-?\s*(\d{3,4}[A-Za-z]?)\s*:\s*(.+)$").expect("code title regex")
});
static RE_SUBJECT_NUMBER: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b([A-Za-z]{2,6})\s*[- ]?\s*(\d{3,4}[A-Za-z]?)\b").expect("subject number regex")
});
static RE_TITLE_COLON: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?i):\s*([A-Za-z].*)$").unwrap());
static RE_TITLE_DASH: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?i)[–—-]\s*([A-Za-z].*)$").unwrap());
static RE_SCORE_CODE_TITLE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[A-Z]{2,6}\d{3,4}[A-Z]?: ").expect("score code title regex")
});
static RE_SCORE_CODE_ONLY: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[A-Z]{2,6}\d{3,4}[A-Z]?$").expect("score code regex")
});

fn strip_noise(raw: &str) -> String {
    let mut s = raw.to_string();
    s = RE_TERM_SEMESTER_PAREN.replace_all(&s, "").into_owned();
    s = RE_TERM_SEMESTER.replace_all(&s, "").into_owned();
    s = RE_TERM_SHORT.replace_all(&s, "").into_owned();
    s = RE_SECTION.replace_all(&s, "").into_owned();
    s = RE_DASH_NUM.replace_all(&s, "").into_owned();
    s = RE_SUBJECT_TRAIL.replace_all(&s, "").into_owned();
    s = RE_LONG_CODE.replace_all(&s, "").into_owned();
    s = RE_MULTI_SPACE.replace_all(&s, " ").into_owned();
    s.trim().to_string()
}

fn looks_like_junk(line: &str) -> bool {
    RE_JUNK.is_match(line)
}

fn format_code_title(raw: &str) -> String {
    if raw.trim().is_empty() {
        return String::new();
    }
    let r = raw.replace('\n', " ").split_whitespace().collect::<Vec<_>>().join(" ");
    if looks_like_junk(&r) {
        return String::new();
    }

    if let Some(caps) = RE_CODE_TITLE.captures(&r) {
        let code = format!(
            "{}{}",
            caps.get(1).map(|m| m.as_str()).unwrap_or_default().to_uppercase(),
            caps.get(2).map(|m| m.as_str()).unwrap_or_default().to_uppercase()
        );
        let title = strip_noise(caps.get(3).map(|m| m.as_str()).unwrap_or(""));
        return format!("{}: {}", code, title).trim().to_string();
    }

    let subj_num = RE_SUBJECT_NUMBER.captures(&r);
    let title_part = RE_TITLE_COLON
        .captures(&r)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .or_else(|| {
            RE_TITLE_DASH
                .captures(&r)
                .and_then(|c| c.get(1))
                .map(|m| m.as_str().to_string())
        });
    let title = strip_noise(title_part.unwrap_or_default().trim());

    if let Some(caps) = subj_num {
        let code = format!(
            "{}{}",
            caps.get(1).map(|m| m.as_str()).unwrap_or_default().to_uppercase(),
            caps.get(2).map(|m| m.as_str()).unwrap_or_default().to_uppercase()
        );
        if !title.is_empty() {
            return format!("{}: {}", code, title);
        }
        return code;
    }

    strip_noise(&r)
}

fn pick_best_name(candidates: &[String]) -> String {
    let mut best = String::new();
    let mut best_score = -1;
    for name in candidates {
        if name.is_empty() {
            continue;
        }
        let mut score = 0;
        if RE_SCORE_CODE_TITLE.is_match(name) {
            score += 5;
        }
        if RE_SCORE_CODE_ONLY.is_match(name) {
            score += 3;
        }
        score += std::cmp::max(0, 40 - (name.len() as i32 - 28).abs());
        if score > best_score {
            best_score = score;
            best = name.clone();
        }
    }
    best
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            request_aai_token,
            save_session,
            upload_audio,
            diag_env,
            diag_airtable,
            canvas_push,
            canvas_pull,
            quit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running ScribeCat");
}
