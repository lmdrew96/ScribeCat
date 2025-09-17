#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod airtable;
mod assemblyai;
mod audio;
mod canvas;
mod diagnostics;
mod env_alias;
mod http_client;
mod ics;
mod make;
mod openai;
mod save;

use assemblyai::get_assemblyai_token;
use audio::persist_audio_wav;
use canvas::{canvas_pull, canvas_push, CanvasState};
use diagnostics::{diag_airtable, diag_env, ping, quit_app};
use http_client::HttpClient;
use ics::fetch_ics;
use openai::{openai_chat, polish_transcript, summarize_transcript};
use save::save_session;

fn main() {
    #[cfg(debug_assertions)]
    {
        let _ = dotenvy::from_filename(".env").or_else(|_| dotenvy::from_filename("../.env"));
    }

    env_alias::apply_aliases();

    let http_client = HttpClient::new().expect("failed to create reqwest client");

    tauri::Builder::default()
        .manage(http_client)
        .manage(CanvasState::default())
        .invoke_handler(tauri::generate_handler![
            ping,
            get_assemblyai_token,
            fetch_ics,
            canvas_push,
            canvas_pull,
            summarize_transcript,
            polish_transcript,
            openai_chat,
            save_session,
            diag_env,
            diag_airtable,
            persist_audio_wav,
            quit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
