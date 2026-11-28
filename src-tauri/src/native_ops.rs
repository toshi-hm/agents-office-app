use std::path::PathBuf;
use std::process::Command;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;

const MACOS_OPEN_BIN: &str = "/usr/bin/open";

fn require_directory(path: &str) -> Result<PathBuf, String> {
    let target = PathBuf::from(path);
    if !target.is_dir() {
        return Err(format!("directory does not exist: {path}"));
    }
    Ok(target)
}

#[tauri::command]
pub fn send_native_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_path_in_finder(path: String) -> Result<(), String> {
    let target = require_directory(&path)?;
    Command::new(MACOS_OPEN_BIN)
        .arg("--")
        .arg(&target)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_path_in_terminal(path: String) -> Result<(), String> {
    let target = require_directory(&path)?;
    Command::new(MACOS_OPEN_BIN)
        .args(["-a", "Terminal", "--"])
        .arg(&target)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn pick_workspace_directory(
    app: AppHandle,
    default_path: Option<String>,
) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut builder = app.dialog().file();
        if let Some(dir) = default_path {
            let p = PathBuf::from(dir);
            if p.is_dir() {
                builder = builder.set_directory(p);
            }
        }
        builder.blocking_pick_folder().map(|p| p.to_string())
    })
    .await
    .map_err(|e| format!("folder picker task failed: {e}"))
}
