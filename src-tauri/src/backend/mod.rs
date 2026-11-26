mod locate;
mod process;
mod ready_reader;

use serde::Serialize;
use std::process::Child;
use std::sync::{Arc, Mutex};
use tauri::State;

pub use process::{shutdown_backend, spawn_bun_backend};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackendConfig {
    pub base_url: String,
    pub token: String,
    pub platform: &'static str,
}

pub struct ManagedBackend {
    pub base_url: String,
    pub token: String,
    pub child: Arc<Mutex<Option<Child>>>,
}

#[tauri::command]
pub fn get_backend_config(backend: State<'_, ManagedBackend>) -> BackendConfig {
    BackendConfig {
        base_url: backend.base_url.clone(),
        token: backend.token.clone(),
        platform: "macos",
    }
}
