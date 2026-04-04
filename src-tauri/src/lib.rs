mod indexer;
mod watcher;
mod ai;

use indexer::{build_full_index, extract_wikilinks, NoteLinkData};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};
use tauri::path::BaseDirectory;
use tokio::sync::Mutex;

// ─── App State ──────────────────────────────────────────────────────────────

pub struct AppState {
    pub notes_dir: Mutex<String>,
    pub ai_manager: Mutex<Option<ai::AiManager>>,
}

// ─── Serializable Types ──────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NoteFile {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

// ─── Tauri Commands ──────────────────────────────────────────────────────────

/// Initializes or updates the AI Manager with a specific API key.
#[tauri::command]
async fn init_ai(state: State<'_, AppState>, api_key: String) -> Result<String, String> {
    let mgr = ai::AiManager::new(Some(api_key))?;
    let mut mgr_lock = state.ai_manager.lock().await;
    *mgr_lock = Some(mgr);
    Ok("// AI CORE INITIALIZED".to_string())
}

/// Checks if the AI is currently online.
#[tauri::command]
async fn get_ai_status(state: State<'_, AppState>) -> Result<bool, String> {
    let mgr_lock = state.ai_manager.lock().await;
    Ok(mgr_lock.is_some())
}

/// Returns the current notes directory path.
#[tauri::command]
async fn get_notes_dir(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state.notes_dir.lock().await.clone())
}

/// Sets and persists the notes directory, then restarts the watcher.
#[tauri::command]
async fn set_notes_dir(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    let mut dir = state.notes_dir.lock().await;
    *dir = path.clone();
    watcher::start_watcher(app, path);
    Ok(())
}

/// Lists all .md files (and folders) in the specified directory (defaults to notes_dir).
#[tauri::command]
async fn read_notes_directory(
    state: State<'_, AppState>,
    sub_path: Option<String>,
) -> Result<Vec<NoteFile>, String> {
    let base_dir = state.notes_dir.lock().await.clone();
    let path = match sub_path {
        Some(s) => PathBuf::from(&base_dir).join(s),
        None => PathBuf::from(&base_dir),
    };

    if !path.exists() {
        return Ok(vec![]);
    }

    let mut entries: Vec<NoteFile> = fs::read_dir(&path)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .map(|e| {
            let is_dir = e.path().is_dir();
            let name = if is_dir {
                e.file_name().to_string_lossy().to_string()
            } else {
                e.path()
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string()
            };
            NoteFile {
                name,
                path: e.path().to_string_lossy().to_string(),
                is_dir,
            }
        })
        .filter(|f| {
            f.is_dir
                || PathBuf::from(&f.path)
                    .extension()
                    .map(|e| e == "md")
                    .unwrap_or(false)
        })
        .collect();

    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries)
}

/// Reads the content of a single .md file.
#[tauri::command]
async fn read_note(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Saves content to a .md file, creating it if it doesn't exist.
#[tauri::command]
async fn save_note(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

/// Creates a new note with an optional initial title as H1 heading.
#[tauri::command]
async fn create_note(
    state: State<'_, AppState>,
    title: String,
    content: Option<String>,
) -> Result<String, String> {
    let dir = state.notes_dir.lock().await.clone();
    let safe_title = title
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' || c == ' ' { c } else { '-' })
        .collect::<String>()
        .trim()
        .to_string();

    let file_name = format!("{}.md", safe_title);
    let full_path = PathBuf::from(&dir).join(&file_name);
    let body = match content {
        Some(c) => c,
        None => String::new(), // Initializing as pure unconfined prose
    };
    fs::write(&full_path, &body).map_err(|e| e.to_string())?;
    Ok(full_path.to_string_lossy().to_string())
}

/// Deletes a note file.
#[tauri::command]
async fn delete_note(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| e.to_string())
}

/// Renames a note file.
#[tauri::command]
async fn rename_note(
    path: String,
    new_name: String,
) -> Result<String, String> {
    let old_path = PathBuf::from(&path);
    let parent = old_path.parent().ok_or("Invalid path")?;
    
    // Ensure new name has .md extension if it's a file
    let clean_name = if new_name.to_lowercase().ends_with(".md") {
        new_name
    } else {
        format!("{}.md", new_name)
    };
    
    let new_path = parent.join(clean_name);
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;
    
    Ok(new_path.to_string_lossy().to_string())
}

/// Scans a single file's content and returns its [[Wikilinks]].
#[tauri::command]
async fn get_note_links(content: String) -> Result<Vec<String>, String> {
    Ok(extract_wikilinks(&content))
}

/// Builds the full link index for all notes in the directory.
/// Returns a map of { note_name -> { file_name, file_path, links[] } }
#[tauri::command]
async fn get_full_link_index(
    state: State<'_, AppState>,
) -> Result<HashMap<String, NoteLinkData>, String> {
    let dir = state.notes_dir.lock().await.clone();
    Ok(build_full_index(&dir))
}

/// Asks Gemini a question with full system context.
#[tauri::command]
async fn ask_ai(
    state: State<'_, AppState>,
    query: String,
    context: String,
) -> Result<ai::AiResponse, String> {
    let mgr_lock = state.ai_manager.lock().await;
    let mgr = mgr_lock.as_ref().ok_or("AI Manager not initialized. Check your .env file.")?;
    
    mgr.ask(&query, &context).await
}

/// Processes an image via Gemini Vision for OCR.
#[tauri::command]
async fn process_ocr_image(
    state: State<'_, AppState>,
    base64_data: String,
) -> Result<String, String> {
    let mgr_lock = state.ai_manager.lock().await;
    let mgr = mgr_lock.as_ref().ok_or("AI Manager not initialized. Check your .env file.")?;
    
    mgr.process_image(&base64_data).await
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_log::Builder::default().build())
        .manage(AppState {
            notes_dir: Mutex::new(String::new()),
            ai_manager: Mutex::new(None),
        })
        .setup(|app| {
            // Robust Path Strategy: 
            // 1. Check for documents dir
            // 2. Fallback to app data dir (safest for Android/iOS)
            let path_resolver = app.path();
            let default_dir = path_resolver
                .document_dir()
                .unwrap_or_else(|_| path_resolver.app_data_dir().unwrap_or_default())
                .join("EnchantedObsidian");

            let notes_dir_str = default_dir.to_string_lossy().to_string();
            let _ = fs::create_dir_all(&default_dir);

            // Set initial state
            {
                let mut state_notes = app.state::<AppState>().notes_dir.blocking_lock();
                *state_notes = notes_dir_str.clone();
            }

            // Attempt auto-init of AI from .env if it exists (Desktop Developer Mode)
            if let Ok(mgr) = ai::AiManager::new(None) {
                let mut state_ai = app.state::<AppState>().ai_manager.blocking_lock();
                *state_ai = Some(mgr);
            }

            // Start the file watcher
            watcher::start_watcher(app.handle().clone(), notes_dir_str);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            init_ai,
            get_ai_status,
            get_notes_dir,
            set_notes_dir,
            read_notes_directory,
            read_note,
            save_note,
            create_note,
            delete_note,
            rename_note,
            get_note_links,
            get_full_link_index,
            ask_ai,
            process_ocr_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
