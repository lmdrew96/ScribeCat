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
