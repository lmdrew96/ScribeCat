#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::fs::{self, remove_file, OpenOptions};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use tauri::{Manager, RunEvent, WindowEvent};

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

struct ServerState {
    child: Mutex<Option<Child>>,
}

impl Default for ServerState {
    fn default() -> Self {
        Self {
            child: Mutex::new(None),
        }
    }
}

struct ConfigState {
    config_dir: PathBuf,
    env_path: PathBuf,
    template_path: PathBuf,
}

impl ConfigState {
    fn ensure_env_file(&self) -> std::io::Result<()> {
        if let Some(parent) = self.env_path.parent() {
            fs::create_dir_all(parent)?;
        }

        if self.env_path.exists() {
            return Ok(());
        }

        let template = fs::read_to_string(&self.template_path).unwrap_or_else(|_| {
            "ASSEMBLYAI_API_KEY=\nAIRTABLE_API_KEY=\nAIRTABLE_BASE_ID=\nAIRTABLE_TABLE_NAME=Recordings\nMAKE_WEBHOOK_URL=\nOPENAI_API_KEY=\n".to_string()
        });

        fs::write(&self.env_path, template)?;

        #[cfg(unix)]
        if let Ok(metadata) = fs::metadata(&self.env_path) {
            let mut perms = metadata.permissions();
            perms.set_mode(0o600);
            let _ = fs::set_permissions(&self.env_path, perms);
        }

        Ok(())
    }
}

fn project_root() -> PathBuf {
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

fn pid_file_path() -> PathBuf {
    project_root().join("server/.server.pid")
}

fn log_file_path() -> PathBuf {
    project_root().join("server/scribecat-server.log")
}

fn spawn_server(config_dir: &Path) -> std::io::Result<Child> {
    let cwd = project_root();
    let log_path = log_file_path();

    let log_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)?;
    let log_file_err = log_file.try_clone()?;

    let mut command = Command::new("node");
    command
        .arg("server.mjs")
        .current_dir(&cwd)
        .stdin(Stdio::null())
        .stdout(Stdio::from(log_file))
        .stderr(Stdio::from(log_file_err))
        .env("SCRIBECAT_CONFIG_DIR", config_dir);

    let mut child = command.spawn()?;

    let _ = fs::write(pid_file_path(), child.id().to_string());
    Ok(child)
}

fn terminate_server(child_opt: &mut Option<Child>) {
    if let Some(child) = child_opt {
        #[cfg(target_family = "windows")]
        {
            let _ = Command::new("taskkill")
                .args(["/PID", &child.id().to_string(), "/F", "/T"])
                .status();
        }
        #[cfg(not(target_family = "windows"))]
        {
            let _ = child.kill();
        }
        let _ = child.wait();
    }
    let _ = remove_file(pid_file_path());
    *child_opt = None;
}

#[tauri::command]
fn read_config(config: tauri::State<ConfigState>) -> Result<String, String> {
    config.ensure_env_file().map_err(|e| e.to_string())?;
    fs::read_to_string(&config.env_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_config(
    mut contents: String,
    server: tauri::State<ServerState>,
    config: tauri::State<ConfigState>,
) -> Result<(), String> {
    config.ensure_env_file().map_err(|e| e.to_string())?;

    if !contents.ends_with('\n') {
        contents.push('\n');
    }

    fs::write(&config.env_path, contents).map_err(|e| e.to_string())?;

    #[cfg(unix)]
    if let Ok(metadata) = fs::metadata(&config.env_path) {
        let mut perms = metadata.permissions();
        perms.set_mode(0o600);
        let _ = fs::set_permissions(&config.env_path, perms);
    }

    let mut guard = server
        .child
        .lock()
        .map_err(|_| "failed to lock server process".to_string())?;
    terminate_server(&mut *guard);
    match spawn_server(&config.config_dir) {
        Ok(child) => {
            *guard = Some(child);
            Ok(())
        }
        Err(err) => Err(err.to_string()),
    }
}

fn main() {
    tauri::Builder::default()
        .manage(ServerState::default())
        .setup(|app| {
            let config_dir = app
                .path()
                .app_config_dir()
                .map_err(|e| -> Box<dyn std::error::Error> { Box::new(e) })?;
            let env_path = config_dir.join(".env");
            let template_path = project_root().join("server/.env.template");
            let config_state = ConfigState {
                config_dir: config_dir.clone(),
                env_path,
                template_path,
            };
            config_state
                .ensure_env_file()
                .map_err(|e| -> Box<dyn std::error::Error> { Box::new(e) })?;
            app.manage(config_state);

            let state = app.state::<ServerState>();
            let mut guard = state.child.lock().unwrap();
            if guard.is_none() {
                let child = spawn_server(&config_dir)
                    .map_err(|e| -> Box<dyn std::error::Error> { Box::new(e) })?;
                *guard = Some(child);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![read_config, write_config])
        .on_window_event(|event| {
            if let WindowEvent::CloseRequested { .. } = event.event() {
                let state = event.window().state::<ServerState>();
                let mut guard = state.child.lock().unwrap();
                terminate_server(&mut *guard);
            }
        })
        .run(|app_handle, event| match event {
            RunEvent::ExitRequested { .. } => {
                let state = app_handle.state::<ServerState>();
                let mut guard = state.child.lock().unwrap();
                terminate_server(&mut *guard);
            }
            _ => {}
        });
}
