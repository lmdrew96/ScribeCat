#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

use std::fs::{create_dir_all, remove_file, OpenOptions};
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread::sleep;
use std::time::Duration;

use tauri::path::BaseDirectory;
use tauri::{Manager, RunEvent, WindowEvent};

struct AppState {
    server: Mutex<Option<Child>>,
    runtime_dir: PathBuf,
    log_dir: PathBuf,
}

fn development_root() -> PathBuf {
    if let Ok(dir) = std::env::current_dir() {
        if dir.join("server.mjs").exists() {
            return dir;
        }
    }

    if let Ok(mut exe_path) = std::env::current_exe() {
        exe_path.pop();
        if exe_path.join("server.mjs").exists() {
            return exe_path;
        }
    }

    PathBuf::from(".")
}

fn log_file_path(log_dir: &Path) -> PathBuf {
    log_dir.join("scribecat-server.log")
}

fn pid_file_path(log_dir: &Path) -> PathBuf {
    log_dir.join("scribecat-server.pid")
}

fn spawn_server(runtime_dir: &Path, log_dir: &Path) -> std::io::Result<Child> {
    create_dir_all(log_dir)?;

    let log_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_file_path(log_dir))?;
    let log_file_err = log_file.try_clone()?;

    let mut child = Command::new("node")
        .arg("server.mjs")
        .current_dir(runtime_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::from(log_file))
        .stderr(Stdio::from(log_file_err))
        .spawn()?;

    let _ = std::fs::write(pid_file_path(log_dir), child.id().to_string());
    Ok(child)
}

fn wait_for_server_ready() {
    for _ in 0..50 {
        if TcpStream::connect("127.0.0.1:8787").is_ok() {
            return;
        }
        sleep(Duration::from_millis(100));
    }
}

fn terminate_server(state: &AppState) {
    let mut guard = state.server.lock().unwrap();
    if let Some(mut child) = guard.take() {
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
    let _ = remove_file(pid_file_path(&state.log_dir));
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();
            let path_resolver = handle.path();

            let resource_runtime = path_resolver
                .resolve("runtime", BaseDirectory::Resource)
                .ok()
                .filter(|p| p.exists());

            let (runtime_dir, log_dir) = if let Some(runtime) = resource_runtime {
                let log_dir = path_resolver
                    .resolve("logs", BaseDirectory::AppData)
                    .unwrap_or_else(|_| development_root().join("logs"));
                (runtime, log_dir)
            } else {
                let runtime = development_root();
                let log_dir = runtime.join("server");
                (runtime, log_dir)
            };

            let state = AppState {
                server: Mutex::new(None),
                runtime_dir,
                log_dir,
            };
            app.manage(state);

            let state = app.state::<AppState>();
            {
                let mut guard = state.server.lock().unwrap();
                if guard.is_none() {
                    let child = spawn_server(&state.runtime_dir, &state.log_dir)
                        .map_err(|e| -> Box<dyn std::error::Error> { Box::new(e) })?;
                    wait_for_server_ready();
                    *guard = Some(child);
                }
            }

            Ok(())
        })
        .on_window_event(|event| {
            if let WindowEvent::CloseRequested { .. } = event.event() {
                let state = event.window().state::<AppState>();
                terminate_server(&state);
            }
        })
        .run(|app_handle, event| match event {
            RunEvent::ExitRequested { .. } | RunEvent::Exit { .. } => {
                let state = app_handle.state::<AppState>();
                terminate_server(&state);
            }
            _ => {}
        });
}
