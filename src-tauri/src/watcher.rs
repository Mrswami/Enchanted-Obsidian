use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc;
use tauri::{AppHandle, Emitter};

/// Spawns a file system watcher on `notes_dir`.
/// Any create/modify/delete event emits a `file-changed` event to the frontend.
pub fn start_watcher(app: AppHandle, notes_dir: String) {
    std::thread::spawn(move || {
        let (tx, rx) = mpsc::channel::<notify::Result<Event>>();

        let mut watcher = RecommendedWatcher::new(tx, Config::default())
            .expect("Failed to create file watcher");

        watcher
            .watch(Path::new(&notes_dir), RecursiveMode::Recursive)
            .expect("Failed to watch notes directory");

        log::info!("Watching notes directory: {}", notes_dir);

        for res in rx {
            match res {
                Ok(event) => {
                    let kind_str = match event.kind {
                        EventKind::Create(_) => "created",
                        EventKind::Modify(_) => "modified",
                        EventKind::Remove(_) => "removed",
                        _ => continue,
                    };

                    let paths: Vec<String> = event
                        .paths
                        .iter()
                        .filter(|p| {
                            p.extension().map(|e| e == "md").unwrap_or(false)
                        })
                        .map(|p| p.to_string_lossy().to_string())
                        .collect();

                    if !paths.is_empty() {
                        let payload = serde_json::json!({
                            "kind": kind_str,
                            "paths": paths
                        });
                        let _ = app.emit("file-changed", payload);
                        log::info!("File event: {} -> {:?}", kind_str, paths);
                    }
                }
                Err(e) => {
                    log::error!("File watcher error: {:?}", e);
                }
            }
        }
    });
}
