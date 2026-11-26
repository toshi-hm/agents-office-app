use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, LogicalSize, Manager, Size, State};

pub const FULL_DEFAULT_WIDTH: f64 = 1280.0;
pub const FULL_DEFAULT_HEIGHT: f64 = 820.0;
const MINI_WIDTH: f64 = 430.0;
const MINI_HEIGHT: f64 = 330.0;

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

pub struct WindowLayoutState {
    mode: Mutex<String>,
    saved_full_size: Mutex<(f64, f64)>,
}

impl WindowLayoutState {
    pub fn new() -> Self {
        Self {
            mode: Mutex::new("full".to_string()),
            saved_full_size: Mutex::new((FULL_DEFAULT_WIDTH, FULL_DEFAULT_HEIGHT)),
        }
    }
}

#[tauri::command]
pub fn set_window_mode(
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
pub fn set_always_on_top(app: AppHandle, enabled: bool) -> Result<AlwaysOnTopResult, String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;
    window
        .set_always_on_top(enabled)
        .map_err(|e| e.to_string())?;
    Ok(AlwaysOnTopResult { enabled })
}
