use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use super::locate::{build_enriched_path, find_bun_binary, resolve_server_entry};
use super::ready_reader::{spawn_ready_reader, wait_for_ready_url};
use super::ManagedBackend;

const GRACEFUL_SHUTDOWN_TIMEOUT: Duration = Duration::from_millis(1500);

pub fn spawn_bun_backend(app: &AppHandle) -> Result<ManagedBackend, String> {
    let bun = find_bun_binary();
    let (entry, cwd) = resolve_server_entry(app)?;
    let token = format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple());

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app data dir: {e}"))?;
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("failed to create app data dir: {e}"))?;

    let mut child = Command::new(&bun)
        .arg("run")
        .arg(&entry)
        .current_dir(&cwd)
        .env("PATH", build_enriched_path())
        .env("AGENTS_OFFICE_PORT", "0")
        .env("AGENTS_OFFICE_TOKEN", &token)
        .env("AGENTS_OFFICE_DATA_DIR", &data_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("failed to spawn Bun backend ({}): {e}", bun.display()))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "failed to capture Bun backend stdout".to_string())?;
    let rx = spawn_ready_reader(stdout);
    let base_url = wait_for_ready_url(&mut child, rx)?;

    Ok(ManagedBackend {
        base_url,
        token,
        child: Arc::new(Mutex::new(Some(child))),
    })
}

#[cfg(unix)]
fn send_sigterm(child: &Child) {
    let _ = Command::new("/bin/kill")
        .args(["-TERM", &child.id().to_string()])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
}

pub fn shutdown_backend(child_slot: &Arc<Mutex<Option<Child>>>) {
    if let Ok(mut guard) = child_slot.lock() {
        if let Some(mut child) = guard.take() {
            #[cfg(unix)]
            {
                send_sigterm(&child);
                let deadline = Instant::now() + GRACEFUL_SHUTDOWN_TIMEOUT;
                while Instant::now() < deadline {
                    if let Ok(Some(_)) = child.try_wait() {
                        return;
                    }
                    std::thread::sleep(Duration::from_millis(50));
                }
            }
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}
