use once_cell::sync::Lazy;
use reqwest::Client;

pub static HTTP_CLIENT: Lazy<Client> = Lazy::new(|| {
    Client::builder()
        .user_agent("ScribeCat Desktop/1.0")
        .build()
        .expect("failed to build HTTP client")
});

pub fn env_or_alias(primary: &str, fallbacks: &[&str]) -> Option<String> {
    if let Ok(value) = std::env::var(primary) {
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }
    }
    for key in fallbacks {
        if let Ok(value) = std::env::var(key) {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
    }
    None
}

pub fn env_bool(primary: &str, fallbacks: &[&str]) -> bool {
    env_or_alias(primary, fallbacks).is_some()
}

pub fn sanitize_filename(input: &str) -> String {
    let candidate = input
        .split(&['/', '\\'][..])
        .last()
        .unwrap_or("recording.wav")
        .trim();
    let fallback = "recording.wav";
    let mut cleaned = String::new();
    for ch in candidate.chars() {
        if ch.is_ascii_alphanumeric() || matches!(ch, '.' | '-' | '_' | ' ') {
            cleaned.push(ch);
        } else {
            cleaned.push('_');
        }
    }
    let trimmed = cleaned.trim_matches('_').trim();
    if trimmed.is_empty() {
        fallback.to_string()
    } else {
        trimmed.to_string()
    }
}
