use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

pub fn find_bun_binary() -> PathBuf {
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

pub fn resolve_server_entry(app: &AppHandle) -> Result<(PathBuf, PathBuf), String> {
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
        for rel in [
            "_up_/apps/server/dist/index.js",
            "apps/server/dist/index.js",
            "index.js",
        ] {
            let bundled = resource_dir.join(rel);
            if bundled.is_file() {
                return Ok((bundled, resource_dir));
            }
        }
    }

    if built_entry.is_file() {
        return Ok((built_entry, workspace_root));
    }
    if dev_entry.is_file() {
        return Ok((dev_entry, workspace_root));
    }

    Err(
        "Bun backend entrypoint not found (expected apps/server/src/index.ts or apps/server/dist/index.js)"
            .to_string(),
    )
}

pub fn build_enriched_path() -> String {
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

    let mut parts: Vec<String> = extra.into_iter().filter(|p| !p.is_empty()).collect();
    if !existing.is_empty() {
        parts.push(existing);
    }
    parts.join(":")
}
