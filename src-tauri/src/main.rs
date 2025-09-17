#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::ffi::OsStr;
use std::fs::{create_dir_all, remove_file, OpenOptions};
use std::io;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use tauri::{Manager, RunEvent, State, WindowEvent};

struct ServerProc {
    child: Mutex<Option<Child>>,
    script: PathBuf,
    work_dir: PathBuf,
    log_path: PathBuf,
    pid_path: PathBuf,
}

impl ServerProc {
    fn from_app(app: &tauri::App) -> io::Result<Self> {
        let resolver = app.path_resolver();
        let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));

        let mut script_path = None;
        let mut search_dir = Some(cwd.as_path());
        while let Some(dir) = search_dir {
            let candidate = dir.join("server.mjs");
            if candidate.exists() {
                script_path = Some(candidate);
                break;
            }
            search_dir = dir.parent();
        }

        if script_path.is_none() {
            if let Some(resource) = resolver.resolve_resource("server.mjs") {
                script_path = Some(resource);
            }
        }

        let script = script_path.ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "server.mjs not found; ensure ScribeCat server resources are available",
            )
        })?;

        let work_dir = script
            .parent()
            .map(Path::to_path_buf)
            .unwrap_or_else(|| PathBuf::from("."));

        let fallback_dir = work_dir.join("server");
        let log_dir = resolver
            .app_log_dir()
            .or_else(|| resolver.app_data_dir())
            .unwrap_or_else(|| fallback_dir.clone());
        create_dir_all(&log_dir)?;
        let log_path = log_dir.join("scribecat-server.log");

        let data_dir = resolver
            .app_data_dir()
            .or_else(|| resolver.app_log_dir())
            .unwrap_or_else(|| fallback_dir.clone());
        create_dir_all(&data_dir)?;
        let pid_path = if data_dir
            .file_name()
            .map(|name| name == OsStr::new("server"))
            .unwrap_or(false)
        {
            data_dir.join(".server.pid")
        } else {
            data_dir.join("scribecat-server.pid")
        };

        Ok(Self {
            child: Mutex::new(None),
            script,
            work_dir,
            log_path,
            pid_path,
        })
    }

    fn spawn_child(&self) -> io::Result<Child> {
        let log_file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_path)?;
        let log_file_err = log_file.try_clone()?;

        let mut cmd = Command::new("node");
        cmd.arg(&self.script)
            .current_dir(&self.work_dir)
            .stdin(Stdio::null())
            .stdout(Stdio::from(log_file))
            .stderr(Stdio::from(log_file_err));

        let mut child = cmd.spawn()?;
        if let Some(parent) = self.pid_path.parent() {
            let _ = create_dir_all(parent);
        }
        let _ = std::fs::write(&self.pid_path, child.id().to_string());
        Ok(child)
    }

    fn ensure_started(&self) -> io::Result<()> {
        let mut guard = self.child.lock().map_err(|_| {
            io::Error::new(io::ErrorKind::Other, "failed to lock server process guard")
        })?;
        if guard.is_none() {
            let child = self.spawn_child()?;
            *guard = Some(child);
        }
        Ok(())
    }

    fn stop_with_guard(&self, guard: &mut Option<Child>) {
        if let Some(child) = guard {
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
        let _ = remove_file(&self.pid_path);
        *guard = None;
    }

    fn stop(&self) {
        if let Ok(mut guard) = self.child.lock() {
            self.stop_with_guard(&mut guard);
        }
    }
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle, state: State<ServerProc>) -> Result<(), String> {
    state.stop();
    app.exit(0);
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![quit_app])
        .setup(|app| {
            let server = ServerProc::from_app(app)
                .map_err(|e| -> Box<dyn std::error::Error> { Box::new(e) })?;
            server
                .ensure_started()
                .map_err(|e| -> Box<dyn std::error::Error> { Box::new(e) })?;
            app.manage(server);
            Ok(())
        })
        .on_window_event(|event| {
            if let WindowEvent::CloseRequested { .. } = event.event() {
                event.window().state::<ServerProc>().stop();
            }
        })
        .run(|app_handle, event| match event {
            RunEvent::ExitRequested { .. } => {
                app_handle.state::<ServerProc>().stop();
            }
            _ => {}
        });
}
