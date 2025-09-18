#!/bin/zsh
set -euo pipefail
mkdir -p src-tauri/src
[ -f src-tauri/Cargo.toml ] || cat > src-tauri/Cargo.toml <<'TOML'
[package]
name = "scribecat"
version = "0.1.0"
edition = "2021"
[dependencies]
tauri = { version = "2.8.5", features = [] }
[build-dependencies]
tauri-build = "2.4.1"
TOML
[ -f src-tauri/build.rs ] || printf '%s\n' 'fn main(){ tauri_build::build(); }' > src-tauri/build.rs
[ -f src-tauri/src/main.rs ] || cat > src-tauri/src/main.rs <<'RS'
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
fn main(){
    std::panic::set_hook(Box::new(|info| eprintln!("[scribecat panic] {info}")));
    tauri::Builder::default()
        .setup(|app| {
            WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External("http://localhost:1420".parse().unwrap()),
            )
            .title("ScribeCat")
            .inner_size(1100.0,760.0)
            .build()
            .expect("create window");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("tauri run failed");
}
RS
[ -f src-tauri/tauri.conf.json ] || cat > src-tauri/tauri.conf.json <<'JSON'
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "ScribeCat",
  "version": "0.1.0",
  "identifier": "com.scribecat.app",
  "build": {
    "beforeDevCommand": "node scripts/fetch_assets.mjs && bash scripts/ensure_icon.sh && bash scripts/start_static.sh",
    "devUrl": "http://localhost:1420",
    "frontendDist": "../web"
  }
}
JSON
