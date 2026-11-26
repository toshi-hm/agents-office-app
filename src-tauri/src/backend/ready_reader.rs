use serde::Deserialize;
use std::io::{BufRead, BufReader};
use std::process::{Child, ChildStdout};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError};
use std::time::{Duration, Instant};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReadyLine {
    #[serde(rename = "type")]
    kind: String,
    base_url: Option<String>,
}

fn kill_and_reap(child: &mut Child) {
    let _ = child.kill();
    let _ = child.wait();
}

pub fn spawn_ready_reader(stdout: ChildStdout) -> Receiver<Result<String, String>> {
    let (tx, rx) = mpsc::channel::<Result<String, String>>();
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

pub fn wait_for_ready_url(
    child: &mut Child,
    rx: Receiver<Result<String, String>>,
) -> Result<String, String> {
    let deadline = Instant::now() + Duration::from_secs(12);
    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            kill_and_reap(child);
            return Err("timed out waiting for Bun backend ready handshake".to_string());
        }
        match rx.recv_timeout(remaining.min(Duration::from_millis(250))) {
            Ok(Ok(url)) => return Ok(url),
            Ok(Err(err)) => {
                kill_and_reap(child);
                return Err(err);
            }
            Err(RecvTimeoutError::Timeout) => {
                if let Ok(Some(status)) = child.try_wait() {
                    return Err(format!("Bun backend exited early with status {status}"));
                }
            }
            Err(RecvTimeoutError::Disconnected) => {
                kill_and_reap(child);
                return Err("Bun backend stdout closed before ready".to_string());
            }
        }
    }
}
