use std::collections::HashMap;
use std::sync::Mutex;

use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};

static CODE_TITLE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b([A-Za-z]{2,6})\s*-?\s*(\d{3,4}[A-Za-z]?)\s*:\s*(.+)$")
        .expect("code title regex")
});
static SUBJ_NUM_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b([A-Za-z]{2,6})\s*[- ]?\s*(\d{3,4}[A-Za-z]?)\b")
        .expect("subject number regex")
});
static TITLE_COLON_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i):\s*([A-Za-z].*)$").expect("title colon regex"));
static TITLE_DASH_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)[–—-]\s*([A-Za-z].*)$").expect("title dash regex"));
static CODE_TITLE_FMT_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[A-Z]{2,6}\d{3,4}[A-Z]?: ").expect("code title fmt regex"));
static CODE_ONLY_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[A-Z]{2,6}\d{3,4}[A-Z]?$").expect("code only regex"));
static JUNK_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(points|submission|submissions|needs grading|Quiz|Assignment|Unit|EXAM|Chapter|Lab\b.*Cells|out of|required)\b")
        .expect("junk regex")
});
static TERM_PAREN_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\((?:Fall|Spring|Summer|Winter)\s*20\d{2}\)").expect("term paren")
});
static TERM_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)\b(Fall|Spring|Summer|Winter)\s*20\d{2}\b").expect("term regex"));
static SHORT_TERM_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)\b(FA|SP|SU|WI)\s*\d{2}\b").expect("short term regex"));
static SECTION_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)\bsection\s*\d+[A-Za-z]?\b").expect("section regex"));
static DASH_NUM_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)\b-?\s*\d{2,3}[A-Za-z]?\b").expect("dash num regex"));
static SUBJ_SUFFIX_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)\b\d{2}F?-?[A-Z]{2,5}\d{3}\b").expect("subj suffix regex"));
static CODE_YEAR_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)\b[A-Z]{2,5}\d{3,4}-\d{2,3}20\d{2}\b").expect("code year regex"));
static MULTISPACE_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\s{2,}").expect("multi space regex"));

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CanvasCourse {
    pub id: String,
    pub name: String,
}

#[derive(Default)]
pub struct CanvasState(pub Mutex<Vec<CanvasCourse>>);

#[derive(Debug, Deserialize)]
pub struct CanvasCourseInput {
    pub id: Option<String>,
    pub name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CanvasPushResult {
    pub ok: bool,
    pub count: usize,
}

#[derive(Debug, Serialize)]
pub struct CanvasPullResult {
    pub courses: Vec<CanvasCourse>,
}

fn strip_noise(input: &str) -> String {
    let mut s = input.to_string();
    s = TERM_PAREN_RE.replace_all(&s, "").to_string();
    s = TERM_RE.replace_all(&s, "").to_string();
    s = SHORT_TERM_RE.replace_all(&s, "").to_string();
    s = SECTION_RE.replace_all(&s, "").to_string();
    s = SUBJ_SUFFIX_RE.replace_all(&s, "").to_string();
    s = CODE_YEAR_RE.replace_all(&s, "").to_string();
    s = DASH_NUM_RE.replace_all(&s, "").to_string();
    s = MULTISPACE_RE.replace_all(&s, " ").to_string();
    s.trim().to_string()
}

fn looks_like_junk(line: &str) -> bool {
    JUNK_RE.is_match(line)
}

fn format_code_title(raw: &str) -> String {
    if raw.trim().is_empty() {
        return String::new();
    }
    let condensed = raw.split_whitespace().collect::<Vec<_>>().join(" ");
    if looks_like_junk(&condensed) {
        return String::new();
    }

    if let Some(cap) = CODE_TITLE_RE.captures(&condensed) {
        let code = format!("{}{}", &cap[1], &cap[2]).to_uppercase();
        let title = strip_noise(&cap[3]);
        return format!("{}: {}", code, title).trim().to_string();
    }

    let subj_num = SUBJ_NUM_RE.captures(&condensed);
    let title = TITLE_COLON_RE
        .captures(&condensed)
        .and_then(|c| c.get(1))
        .map(|m| strip_noise(m.as_str()))
        .filter(|s| !s.is_empty())
        .or_else(|| {
            TITLE_DASH_RE
                .captures(&condensed)
                .and_then(|c| c.get(1))
                .map(|m| strip_noise(m.as_str()))
                .filter(|s| !s.is_empty())
        });

    if let Some(cap) = subj_num {
        let code = format!("{}{}", &cap[1], &cap[2]).to_uppercase();
        if let Some(title) = title {
            return format!("{}: {}", code, title);
        }
        return code;
    }

    strip_noise(&condensed)
}

fn pick_best_name(candidates: &[String]) -> Option<String> {
    let mut best: Option<String> = None;
    let mut best_score = i32::MIN;
    for candidate in candidates {
        if candidate.is_empty() {
            continue;
        }
        let mut score = 0;
        if CODE_TITLE_FMT_RE.is_match(candidate) {
            score += 5;
        }
        if CODE_ONLY_RE.is_match(candidate) {
            score += 3;
        }
        let length_score = 40 - (candidate.len() as i32 - 28).abs();
        if length_score > 0 {
            score += length_score;
        }
        if score > best_score {
            best_score = score;
            best = Some(candidate.clone());
        }
    }
    best
}

#[tauri::command]
pub fn canvas_push(
    state: tauri::State<CanvasState>,
    courses: Vec<CanvasCourseInput>,
) -> Result<CanvasPushResult, String> {
    let mut grouped: HashMap<String, Vec<String>> = HashMap::new();
    for entry in courses {
        let id = entry.id.unwrap_or_default().trim().to_string();
        if id.is_empty() {
            continue;
        }
        let name = format_code_title(entry.name.unwrap_or_default().as_str());
        if name.is_empty() {
            continue;
        }
        grouped.entry(id).or_default().push(name);
    }

    let mut cleaned: Vec<CanvasCourse> = grouped
        .into_iter()
        .filter_map(|(id, names)| pick_best_name(&names).map(|name| CanvasCourse { id, name }))
        .collect();
    cleaned.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    if cleaned.len() > 200 {
        cleaned.truncate(200);
    }

    let count = cleaned.len();
    let mut guard = state
        .0
        .lock()
        .map_err(|_| "Canvas state poisoned".to_string())?;
    *guard = cleaned;
    Ok(CanvasPushResult { ok: true, count })
}

#[tauri::command]
pub fn canvas_pull(state: tauri::State<CanvasState>) -> Result<CanvasPullResult, String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "Canvas state poisoned".to_string())?;
    let courses = guard
        .iter()
        .cloned()
        .map(|mut c| {
            c.name = format_code_title(&c.name);
            c
        })
        .collect();
    Ok(CanvasPullResult { courses })
}
