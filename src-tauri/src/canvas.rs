use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

static TERM_SEASON_PAREN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\((?:Fall|Spring|Summer|Winter)\s*20\d{2}\)").expect("valid regex"));
static TERM_SEASON_WORD: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\b(Fall|Spring|Summer|Winter)\s*20\d{2}\b").expect("valid regex"));
static TERM_SHORT: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\b(FA|SP|SU|WI)\s*\d{2}\b").expect("valid regex"));
static SECTION_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\bsection\s*\d+[A-Za-z]?\b").expect("valid regex"));
static DASH_NUMBER_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\b-?\s*\d{2,3}[A-Za-z]?\b").expect("valid regex"));
static CODE_NOISE_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\b\d{2}F?-?[A-Z]{2,5}\d{3}\b").expect("valid regex"));
static LONG_CODE_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\b[A-Z]{2,5}\d{3,4}-\d{2,3}20\d{2}\b").expect("valid regex"));
static MULTI_SPACE_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\s{2,}").expect("valid regex"));
static LOOKS_JUNK_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(points|submission|submissions|needs grading|Quiz|Assignment|Unit|EXAM|Chapter|Lab\b.*Cells|out of|required)\b")
        .expect("valid regex")
});
static CODE_TITLE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b([A-Za-z]{2,6})\s*-?\s*(\d{3,4}[A-Za-z]?)\s*:\s*(.+)$").expect("valid regex")
});
static SUBJECT_NUMBER_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b([A-Za-z]{2,6})\s*[- ]?\s*(\d{3,4}[A-Za-z]?)\b").expect("valid regex")
});
static COLON_TITLE_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i):\s*([A-Za-z].*)$").expect("valid regex"));
static DASH_TITLE_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)[–—-]\s*([A-Za-z].*)$").expect("valid regex"));
static CODE_TITLE_SCORE_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[A-Z]{2,6}\d{3,4}[A-Z]?: ").expect("valid regex"));
static CODE_ONLY_EXACT_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[A-Z]{2,6}\d{3,4}[A-Z]?$").expect("valid regex"));

#[derive(Default)]
pub struct CanvasState {
    courses: Mutex<Vec<CanvasCourse>>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct CanvasCourse {
    pub id: String,
    pub name: String,
}

#[derive(Deserialize)]
pub struct CanvasPushCourse {
    pub id: Option<String>,
    pub name: Option<String>,
}

#[derive(Deserialize)]
pub struct CanvasPushPayload {
    pub courses: Option<Vec<CanvasPushCourse>>,
}

#[derive(Serialize)]
pub struct CanvasPushResponse {
    pub ok: bool,
    pub count: usize,
}

#[derive(Serialize)]
pub struct CanvasPullResponse {
    pub courses: Vec<CanvasCourse>,
}

#[tauri::command]
pub fn canvas_push(
    state: State<CanvasState>,
    payload: CanvasPushPayload,
) -> Result<CanvasPushResponse, String> {
    let mut grouped: HashMap<String, Vec<String>> = HashMap::new();
    for course in payload.courses.unwrap_or_default() {
        let id = course.id.unwrap_or_default();
        let id = id.trim();
        if id.is_empty() {
            continue;
        }
        let candidate = format_code_title(course.name.unwrap_or_default());
        if candidate.is_empty() {
            continue;
        }
        grouped.entry(id.to_string()).or_default().push(candidate);
    }

    let mut clean: Vec<CanvasCourse> = grouped
        .into_iter()
        .filter_map(|(id, names)| pick_best_name(&names).map(|name| CanvasCourse { id, name }))
        .collect();

    clean.sort_by(|a, b| a.name.cmp(&b.name));
    if clean.len() > 200 {
        clean.truncate(200);
    }

    {
        let mut guard = state
            .courses
            .lock()
            .map_err(|_| "canvas state poisoned".to_string())?;
        *guard = clean.clone();
    }

    Ok(CanvasPushResponse {
        ok: true,
        count: clean.len(),
    })
}

#[tauri::command]
pub fn canvas_pull(state: State<CanvasState>) -> Result<CanvasPullResponse, String> {
    let guard = state
        .courses
        .lock()
        .map_err(|_| "canvas state poisoned".to_string())?;
    let courses = guard
        .iter()
        .map(|course| CanvasCourse {
            id: course.id.clone(),
            name: format_code_title(course.name.clone()),
        })
        .collect();
    Ok(CanvasPullResponse { courses })
}

fn strip_noise(input: String) -> String {
    let mut s = input;
    s = TERM_SEASON_PAREN.replace_all(&s, "").into_owned();
    s = TERM_SEASON_WORD.replace_all(&s, "").into_owned();
    s = TERM_SHORT.replace_all(&s, "").into_owned();
    s = SECTION_RE.replace_all(&s, "").into_owned();
    s = DASH_NUMBER_RE.replace_all(&s, "").into_owned();
    s = CODE_NOISE_RE.replace_all(&s, "").into_owned();
    s = LONG_CODE_RE.replace_all(&s, "").into_owned();
    s = MULTI_SPACE_RE.replace_all(&s, " ").into_owned();
    s.trim().to_string()
}

fn looks_like_junk(input: &str) -> bool {
    LOOKS_JUNK_RE.is_match(input)
}

pub fn format_code_title(raw: String) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    if looks_like_junk(trimmed) {
        return String::new();
    }

    if let Some(caps) = CODE_TITLE_RE.captures(trimmed) {
        let code = format!("{}{}", &caps[1].to_uppercase(), &caps[2].to_uppercase());
        let title = strip_noise(caps[3].to_string());
        return format!("{}: {}", code, title).trim().to_string();
    }

    let mut title = String::new();
    if let Some(caps) = COLON_TITLE_RE.captures(trimmed) {
        title = strip_noise(caps[1].to_string());
    } else if let Some(caps) = DASH_TITLE_RE.captures(trimmed) {
        title = strip_noise(caps[1].to_string());
    }

    if let Some(caps) = SUBJECT_NUMBER_RE.captures(trimmed) {
        let code = format!("{}{}", &caps[1].to_uppercase(), &caps[2].to_uppercase());
        if !title.is_empty() {
            return format!("{}: {}", code, title);
        }
        return code;
    }

    strip_noise(trimmed.to_string())
}

fn pick_best_name(candidates: &[String]) -> Option<String> {
    let mut best_score = i32::MIN;
    let mut best = None;
    for name in candidates {
        if name.trim().is_empty() {
            continue;
        }
        let mut score = 0;
        if CODE_TITLE_SCORE_RE.is_match(name) {
            score += 5;
        }
        if CODE_ONLY_EXACT_RE.is_match(name) {
            score += 3;
        }
        let len = name.len() as i32;
        score += (40 - (len - 28).abs()).max(0);
        if score > best_score {
            best_score = score;
            best = Some(name.clone());
        }
    }
    best
}
