pub fn apply_aliases() {
    alias_env("AAI_API_KEY", &["ASSEMBLYAI_API_KEY"]);
    alias_env("AIRTABLE_PAT", &["AIRTABLE_API_KEY"]);
    alias_env("AIRTABLE_BASE", &["AIRTABLE_BASE_ID"]);
    alias_env("AIRTABLE_TABLE", &["AIRTABLE_TABLE_NAME"]);
}

fn alias_env(target: &str, candidates: &[&str]) {
    if std::env::var(target).is_ok() {
        return;
    }
    for candidate in candidates {
        if let Ok(value) = std::env::var(candidate) {
            std::env::set_var(target, value);
            break;
        }
    }
}
