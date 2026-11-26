mod backend;
mod native_ops;
mod tray;
mod window;

use std::process::Child;
use std::sync::{Arc, Mutex};
use tauri::{Manager, RunEvent};

use backend::{get_backend_config, shutdown_backend, spawn_bun_backend, ManagedBackend};
use native_ops::{
    open_path_in_finder, open_path_in_terminal, pick_workspace_directory, send_native_notification,
};
use tray::{setup_tray, update_tray_summary};
use window::{set_always_on_top, set_window_mode, WindowLayoutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let backend_child_holder: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));
    let shutdown_ref = Arc::clone(&backend_child_holder);

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .manage(WindowLayoutState::new())
        .setup(move |app| {
            let handle = app.handle().clone();
            let backend = spawn_bun_backend(&handle)
                .map_err(|err| std::io::Error::new(std::io::ErrorKind::Other, err))?;

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
