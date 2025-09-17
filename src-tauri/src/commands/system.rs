#[tauri::command]
pub fn backend_ready() -> bool {
    true
}

#[tauri::command]
pub fn quit_app(app: tauri::AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}
