use serde::Deserialize;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use super::locate::{build_enriched_path, find_bun_binary, resolve_server_entry};
use super::ManagedBackend;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReadyLine {
    #[serde(rename = "type")]
    kind: String,
    base_url: Option<String>,
}

fn spawn_ready_reader(
    stdout: std::process::ChildStdout,
) -> std::sync::mpsc::Receiver<Result<String, String>> {
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
    rx
}

fn wait_for_ready_url(
    child: &mut Child,
    rx: std::sync::mpsc::Receiver<Result<String, String>>,
) -> Result<String, String> {
    let deadline = Instant::now() + Duration::from_secs(12);
    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            let _ = child.kill();
            return Err("timed out waiting for Bun backend ready handshake".to_string());
        }
        match rx.recv_timeout(remaining.min(Duration::from_millis(250))) {
            Ok(Ok(url)) => return Ok(url),
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
    }
}

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

pub fn shutdown_backend(child_slot: &Arc<Mutex<Option<Child>>>) {
    if let Ok(mut guard) = child_slot.lock() {
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}
