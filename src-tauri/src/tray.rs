use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};

fn focus_main_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

#[tauri::command]
pub fn update_tray_summary(
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

pub fn setup_tray(app: &AppHandle) -> Result<(), tauri::Error> {
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
            "show" => focus_main_window(app),
            "toggle-mini" => {
                focus_main_window(app);
                let _ = app.emit("office:tray-action", "toggle-mini");
            }
            "new-task" => {
                focus_main_window(app);
                let _ = app.emit("office:tray-action", "new-task");
            }
            "refresh" => {
                let _ = app.emit("office:tray-action", "refresh");
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                focus_main_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    builder.build(app)?;
    Ok(())
}
