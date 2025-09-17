#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;

use commands::*;

fn main() {
    tauri::Builder::default()
        .manage(CanvasState::default())
        .invoke_handler(tauri::generate_handler![
            backend_ready,
            quit_app,
            get_aai_token,
            fetch_ics,
            canvas_push,
            canvas_pull,
            summarize_transcript,
            polish_transcript,
            openai_chat,
            save_record,
            diag_env,
            diag_airtable,
            upload_audio,
        ])
        .run(|_, _| {});
}
