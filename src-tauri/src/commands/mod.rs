pub mod airtable;
pub mod assemblyai;
pub mod calendar;
pub mod canvas;
pub mod diag;
pub mod files;
pub mod openai;
pub mod system;
pub mod util;

pub use airtable::{
    diag_airtable, save_record, DiagAirtableResponse, MakeWebhookResult, SavePayload, SaveResponse,
};
pub use assemblyai::get_aai_token;
pub use calendar::fetch_ics;
pub use canvas::{
    canvas_pull, canvas_push, CanvasCourse, CanvasCourseInput, CanvasPullResult, CanvasPushResult,
    CanvasState,
};
pub use diag::{diag_env, DiagEnvResponse};
pub use files::{upload_audio, UploadAudioArgs, UploadAudioResult};
pub use openai::{
    openai_chat, polish_transcript, summarize_transcript, ChatRequest, ChatResponse, PolishRequest,
    PolishResponse, SummarizeRequest, SummarizeResponse,
};
pub use system::{backend_ready, quit_app};
