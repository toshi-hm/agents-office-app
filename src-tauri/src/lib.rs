use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, LogicalSize, Manager, RunEvent, Size, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;
use uuid::Uuid;

const FULL_DEFAULT_WIDTH: f64 = 1280.0;
const FULL_DEFAULT_HEIGHT: f64 = 820.0;
const MINI_WIDTH: f64 = 430.0;
const MINI_HEIGHT: f64 = 330.0;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackendConfig {
    pub base_url: String,
    pub token: String,
    pub platform: &'static str,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowModeResult {
    pub mode: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlwaysOnTopResult {
    pub enabled: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReadyLine {
    #[serde(rename = "type")]
    kind: String,
    base_url: Option<String>,
}

struct ManagedBackend {
    base_url: String,
    token: String,
    child: Arc<Mutex<Option<Child>>>,
}

struct WindowLayoutState {
    mode: Mutex<String>,
    saved_full_size: Mutex<(f64, f64)>,
}

fn find_bun_binary() -> PathBuf {
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in std::env::split_paths(&path_var) {
            let candidate = dir.join("bun");
            if candidate.is_file() {
                return candidate;
            }
        }
    }

    let home = std::env::var("HOME").unwrap_or_default();
    let candidates = [
        PathBuf::from(&home).join(".nix-profile/bin/bun"),
        PathBuf::from(&home).join(".bun/bin/bun"),
        PathBuf::from("/opt/homebrew/bin/bun"),
        PathBuf::from("/usr/local/bin/bun"),
    ];

    for candidate in candidates {
        if candidate.is_file() {
            return candidate;
        }
    }

    PathBuf::from("bun")
}

fn resolve_server_entry(app: &AppHandle) -> Result<(PathBuf, PathBuf), String> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let workspace_root = manifest_dir
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| manifest_dir.clone());

    let dev_entry = workspace_root.join("apps/server/src/index.ts");
    let built_entry = workspace_root.join("apps/server/dist/index.js");

    if cfg!(debug_assertions) && dev_entry.is_file() {
        return Ok((dev_entry, workspace_root));
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("apps/server/dist/index.js");
        if bundled.is_file() {
            return Ok((bundled, resource_dir));
        }
        let flat_bundled = resource_dir.join("index.js");
        if flat_bundled.is_file() {
            return Ok((flat_bundled, resource_dir));
        }
    }

    if built_entry.is_file() {
        return Ok((built_entry, workspace_root));
    }
    if dev_entry.is_file() {
        return Ok((dev_entry, workspace_root));
    }

    Err("Bun backend entrypoint not found (expected apps/server/src/index.ts or apps/server/dist/index.js)".to_string())
}

fn build_enriched_path() -> String {
    let home = std::env::var("HOME").unwrap_or_default();
    let existing = std::env::var("PATH").unwrap_or_default();
    let extra = [
        format!("{home}/.local/bin"),
        format!("{home}/.nix-profile/bin"),
        format!("{home}/.bun/bin"),
        "/opt/homebrew/bin".to_string(),
        "/usr/local/bin".to_string(),
        "/usr/bin".to_string(),
        "/bin".to_string(),
    ];

    let mut parts: Vec<String> = extra
        .into_iter()
        .filter(|p| !p.is_empty())
        .collect();
    if !existing.is_empty() {
        parts.push(existing);
    }
    parts.join(":")
}

fn spawn_bun_backend(app: &AppHandle) -> Result<ManagedBackend, String> {
    let bun = find_bun_binary();
    let (entry, cwd) = resolve_server_entry(app)?;
    let token = format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple());

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app data dir: {e}"))?;
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("failed to create app data dir: {e}"))?;

    let mut cmd = Command::new(&bun);
    cmd.arg("run")
        .arg(&entry)
        .current_dir(&cwd)
        .env("PATH", build_enriched_path())
        .env("AGENTS_OFFICE_PORT", "0")
        .env("AGENTS_OFFICE_TOKEN", &token)
        .env("AGENTS_OFFICE_DATA_DIR", &data_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("failed to spawn Bun backend ({}): {e}", bun.display()))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "failed to capture Bun backend stdout".to_string())?;

    let (tx, rx) = std::sync::mpsc::channel::<Result<String, String>>();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        let mut announced = false;
        for line_result in reader.lines() {
            match line_result {
                Ok(line) => {
                    if !announced {
                        if let Ok(parsed) = serde_json::from_str::<ReadyLine>(&line) {
                            if parsed.kind == "ready" {
                                if let Some(url) = parsed.base_url {
                                    announced = true;
                                    let _ = tx.send(Ok(url));
                                    continue;
                                }
                            }
                        }
                    }
                }
                Err(err) => {
                    if !announced {
                        let _ = tx.send(Err(format!("error reading backend stdout: {err}")));
                    }
                    break;
                }
            }
        }
        if !announced {
            let _ = tx.send(Err("Bun backend exited before announcing readiness".to_string()));
        }
    });

    let deadline = Instant::now() + Duration::from_secs(12);
    let base_url = loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            let _ = child.kill();
            return Err("timed out waiting for Bun backend ready handshake".to_string());
        }
        match rx.recv_timeout(remaining.min(Duration::from_millis(250))) {
            Ok(Ok(url)) => break url,
            Ok(Err(err)) => {
                let _ = child.kill();
                return Err(err);
            }
            Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                if let Ok(Some(status)) = child.try_wait() {
                    return Err(format!("Bun backend exited early with status {status}"));
                }
            }
            Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                let _ = child.kill();
                return Err("Bun backend stdout closed before ready".to_string());
            }
        }
    };

    Ok(ManagedBackend {
        base_url,
        token,
        child: Arc::new(Mutex::new(Some(child))),
    })
}

fn shutdown_backend(child_slot: &Arc<Mutex<Option<Child>>>) {
    if let Ok(mut guard) = child_slot.lock() {
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

#[tauri::command]
fn get_backend_config(backend: State<'_, ManagedBackend>) -> BackendConfig {
    BackendConfig {
        base_url: backend.base_url.clone(),
        token: backend.token.clone(),
        platform: "macos",
    }
}

#[tauri::command]
fn set_window_mode(
    app: AppHandle,
    layout: State<'_, WindowLayoutState>,
    mode: String,
) -> Result<WindowModeResult, String> {
    let normalized = match mode.as_str() {
        "mini" => "mini",
        "full" => "full",
        _ => return Err(format!("unsupported window mode: {mode}")),
    };

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    let mut current_mode = layout.mode.lock().map_err(|_| "layout lock poisoned")?;
    if normalized == "mini" {
        if *current_mode != "mini" {
            if let (Ok(outer), Ok(scale)) = (window.inner_size(), window.scale_factor()) {
                let logical_w = (outer.width as f64) / scale;
                let logical_h = (outer.height as f64) / scale;
                if logical_w >= 640.0 && logical_h >= 480.0 {
                    if let Ok(mut saved) = layout.saved_full_size.lock() {
                        *saved = (logical_w, logical_h);
                    }
                }
            }
        }
        window
            .set_size(Size::Logical(LogicalSize::new(MINI_WIDTH, MINI_HEIGHT)))
            .map_err(|e| e.to_string())?;
        window.set_always_on_top(true).map_err(|e| e.to_string())?;
    } else {
        let (w, h) = layout
            .saved_full_size
            .lock()
            .map(|guard| *guard)
            .unwrap_or((FULL_DEFAULT_WIDTH, FULL_DEFAULT_HEIGHT));
        window.set_always_on_top(false).map_err(|e| e.to_string())?;
        window
            .set_size(Size::Logical(LogicalSize::new(w, h)))
            .map_err(|e| e.to_string())?;
    }

    *current_mode = normalized.to_string();
    let _ = app.emit("office:window-mode-changed", normalized);

    Ok(WindowModeResult {
        mode: normalized.to_string(),
    })
}

#[tauri::command]
fn set_always_on_top(app: AppHandle, enabled: bool) -> Result<AlwaysOnTopResult, String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;
    window
        .set_always_on_top(enabled)
        .map_err(|e| e.to_string())?;
    Ok(AlwaysOnTopResult { enabled })
}

#[tauri::command]
fn send_native_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn open_path_in_finder(path: String) -> Result<(), String> {
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
fn open_path_in_terminal(path: String) -> Result<(), String> {
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
async fn pick_workspace_directory(
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

#[tauri::command]
fn update_tray_summary(
    app: AppHandle,
    running_count: u32,
    pending_approvals: u32,
) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let title = if pending_approvals > 0 {
            format!(" {running_count}稼働 · {pending_approvals}承認待")
        } else if running_count > 0 {
            format!(" {running_count}稼働")
        } else {
            String::new()
        };
        let _ = tray.set_title(Some(&title));
        let tooltip = format!(
            "Agents Office — 稼働中: {running_count} / 承認待ち: {pending_approvals}"
        );
        let _ = tray.set_tooltip(Some(&tooltip));
    }
    Ok(())
}

fn setup_tray(app: &AppHandle) -> Result<(), tauri::Error> {
    let show = MenuItem::with_id(app, "show", "バーチャルオフィスを表示", true, None::<&str>)?;
    let toggle_mini = MenuItem::with_id(
        app,
        "toggle-mini",
        "小さなオフィスモード切替",
        true,
        None::<&str>,
    )?;
    let new_task = MenuItem::with_id(app, "new-task", "新しい仕事を依頼…", true, None::<&str>)?;
    let refresh = MenuItem::with_id(app, "refresh", "最新の状態に更新", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Agents Office を終了", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show, &toggle_mini, &new_task, &refresh, &sep, &quit])?;

    let mut builder = TrayIconBuilder::with_id("main-tray")
        .menu(&menu)
        .tooltip("Agents Office")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.unminimize();
                    let _ = win.set_focus();
                }
            }
            "toggle-mini" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
                let _ = app.emit("office:tray-action", "toggle-mini");
            }
            "new-task" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
                let _ = app.emit("office:tray-action", "new-task");
            }
            "refresh" => {
                let _ = app.emit("office:tray-action", "refresh");
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.unminimize();
                    let _ = win.set_focus();
                }
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    builder.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let backend_child_holder: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));
    let shutdown_ref = Arc::clone(&backend_child_holder);

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .manage(WindowLayoutState {
            mode: Mutex::new("full".to_string()),
            saved_full_size: Mutex::new((FULL_DEFAULT_WIDTH, FULL_DEFAULT_HEIGHT)),
        })
        .setup(move |app| {
            let handle = app.handle().clone();
            let backend = spawn_bun_backend(&handle).map_err(|err| {
                std::io::Error::new(std::io::ErrorKind::Other, err)
            })?;

            if let (Ok(mut target), Ok(mut source)) =
                (backend_child_holder.lock(), backend.child.lock())
            {
                *target = source.take();
            }

            app.manage(ManagedBackend {
                base_url: backend.base_url,
                token: backend.token,
                child: Arc::clone(&backend_child_holder),
            });

            setup_tray(&handle)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_backend_config,
            set_window_mode,
            set_always_on_top,
            send_native_notification,
            open_path_in_finder,
            open_path_in_terminal,
            pick_workspace_directory,
            update_tray_summary,
        ])
        .build(tauri::generate_context!())
        .expect("failed to build Agents Office Tauri application");

    app.run(move |_app_handle, event| {
        if let RunEvent::Exit = event {
            shutdown_backend(&shutdown_ref);
        }
    });
}
