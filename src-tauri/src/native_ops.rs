use std::path::PathBuf;
use std::process::Command;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;

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
    let target = PathBuf::from(&path);
    if !target.exists() {
        return Err(format!("path does not exist: {path}"));
    }
    Command::new("open")
        .arg(&target)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_path_in_terminal(path: String) -> Result<(), String> {
    let target = PathBuf::from(&path);
    if !target.exists() {
        return Err(format!("path does not exist: {path}"));
    }
    Command::new("open")
        .args(["-a", "Terminal"])
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
    let mut builder = app.dialog().file();
    if let Some(dir) = default_path {
        let p = PathBuf::from(dir);
        if p.is_dir() {
            builder = builder.set_directory(p);
        }
    }
    let picked = builder.blocking_pick_folder();
    Ok(picked.map(|p| p.to_string()))
}
