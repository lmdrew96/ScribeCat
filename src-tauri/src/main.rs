#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

use std::fs::{remove_file, OpenOptions};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use tauri::{Manager, RunEvent, WindowEvent};

struct ServerProc(Mutex<Option<Child>>);

fn project_root() -> PathBuf {
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

fn pid_file_path() -> PathBuf {
    project_root().join("server/.server.pid")
}

fn log_file_path() -> PathBuf {
    project_root().join("server/scribecat-server.log")
}

fn spawn_server() -> std::io::Result<Child> {
    let cwd = project_root();
    let log_path = log_file_path();

    let log_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)?;
    let log_file_err = log_file.try_clone()?;

    let child = Command::new("node")
        .arg("server.mjs")
        .current_dir(&cwd)
        .stdin(Stdio::null())
        .stdout(Stdio::from(log_file))
        .stderr(Stdio::from(log_file_err))
        .spawn()?;

    let _ = std::fs::write(pid_file_path(), child.id().to_string());
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

fn main() {
    let server_state = ServerProc(Mutex::new(None));

    let app = tauri::Builder::default()
        .manage(server_state)
        .setup(|app| {
            let state = app.state::<ServerProc>();
            let mut guard = state.0.lock().unwrap();
            if guard.is_none() {
                let child = spawn_server().map_err(|e| -> Box<dyn std::error::Error> { Box::new(e) })?;
                *guard = Some(child);
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, WindowEvent::CloseRequested { .. }) {
                let state = window.state::<ServerProc>();
                let mut guard = state.0.lock().unwrap();
                terminate_server(&mut *guard);
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building ScribeCat");

    app.run(|app_handle: &tauri::AppHandle<tauri::Wry>, event| match event {
        RunEvent::ExitRequested { .. } => {
            let state = app_handle.state::<ServerProc>();
            let mut guard = state.0.lock().unwrap();
            terminate_server(&mut *guard);
        }
        _ => {}
    });
}
