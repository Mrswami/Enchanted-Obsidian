mod indexer;
mod watcher;
mod ai;

use indexer::{build_full_index, extract_wikilinks, NoteLinkData};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};
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
    pub title: String,
    pub preview: String,
    pub modified_at: u64,
    pub todo_count: u32,
    pub triage_score: f32,
    pub semantic_vector: Vec<f32>, // The foundation for Sector: Deep Providence
}

#[derive(Debug, Serialize, Deserialize)]
struct RadarIndex {
    pub cache: HashMap<String, NoteFile>,
}

// ─── Tauri Commands ──────────────────────────────────────────────────────────

/// Initializes or updates the AI Manager with a specific API key (Gemini).
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

    // Load the Intelligence Index (Cache)
    let index_path = PathBuf::from(&base_dir).join(".radar_index.json");
    let mut index: RadarIndex = if index_path.exists() {
        let content = fs::read_to_string(&index_path).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or(RadarIndex { cache: HashMap::new() })
    } else {
        RadarIndex { cache: HashMap::new() }
    };

    let entries: Vec<fs::DirEntry> = fs::read_dir(&path)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .collect();

    // VORTEX PARALLEL SCAN ⚡
    let results: Vec<NoteFile> = entries
        .into_par_iter()
        .filter_map(|e| {
            let path = e.path();
            let path_str = path.to_string_lossy().to_string();
            let is_dir = path.is_dir();
            
            // Filter non-markdown files early
            if !is_dir && !path_str.to_lowercase().ends_with(".md") {
                return None;
            }

            let name = if is_dir {
                path.file_name().unwrap_or_default().to_string_lossy().to_string()
            } else {
                path.file_stem().unwrap_or_default().to_string_lossy().to_string()
            };

            let mut modified_at = 0;
            if let Ok(metadata) = e.metadata() {
                if let Ok(modified) = metadata.modified() {
                    modified_at = modified
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs();
                }
            }

            // CHECK THE CACHE: Only re-scan if file was changed
            if let Some(cached) = index.cache.get(&path_str) {
                if cached.modified_at == modified_at && !cached.preview.is_empty() {
                    return Some(cached.clone());
                }
            }

            let mut title = name.clone();
            let mut preview = String::new();
            let mut todo_count = 0;

            // Deep Peek into Markdown files - OPTIMIZED: Only read what's needed
            if !is_dir && path.extension().map_or(false, |ext| ext == "md") {
                if let Ok(content) = fs::read_to_string(&path) {
                    for line in content.lines().take(50) { 
                        let trimmed = line.trim();
                        if trimmed.starts_with("# ") {
                            title = trimmed[2..].to_string();
                            break;
                        }
                    }
                    todo_count = content.matches("- [ ]").count() as u32;
                    let h1_title = title.clone();
                    let mut clean_preview = String::new();
                    
                    // PROSE SEEKER: Skip metadata, links, and system noise
                    for line in content.lines() {
                        let t = line.trim();
                        if t.is_empty() || t.starts_with("#") || t.starts_with("---") || t == &h1_title {
                            continue;
                        }
                        
                        // Filter common metadata keys and raw links
                        let lower = t.to_lowercase();
                        if lower.starts_with("source:") || lower.starts_with("source url:") || 
                           lower.starts_with("ingested:") || lower.starts_with("http") || 
                           lower.starts_with("gemini://") || lower.starts_with(">") {
                            continue;
                        }
                        
                        clean_preview = t.to_string();
                        break;
                    }

                    preview = clean_preview.chars().take(150).collect();
                    if clean_preview.len() > 150 { preview.push_str("..."); }
                }
            }

            let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs();
            let age_secs = now.saturating_sub(modified_at);
            let recency_score = 1.0 / ((age_secs as f32 / 86400.0) + 1.0);
            let todo_score = (todo_count as f32 * 0.5).min(1.0);
            let triage_score = (recency_score * 0.4) + (todo_score * 0.6);

            Some(NoteFile {
                name, path: path_str, is_dir, title, preview, modified_at, todo_count, triage_score,
                semantic_vector: Vec::new(),
            })
        })
        .collect();

    let mut new_cache = HashMap::new();
    for res in &results { 
        // Populate the fresh cache with live results
        new_cache.insert(res.path.clone(), res.clone()); 
    }
    
    // Total Sync: Replace the old index cache with our fresh, audited one
    index.cache = new_cache;
    
    let _ = fs::write(&index_path, serde_json::to_string(&index).unwrap_or_default());
    let mut sorted_entries = results;
    sorted_entries.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then(b.triage_score.partial_cmp(&a.triage_score).unwrap_or(std::cmp::Ordering::Equal))
    });
    Ok(sorted_entries)
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

/// Splits a note into two separate files.
#[tauri::command]
async fn split_note(
    state: State<'_, AppState>,
    path: String,
    original_content: String,
    new_title: String,
    new_content: String,
) -> Result<String, String> {
    let old_path = PathBuf::from(&path);
    let parent = old_path.parent().ok_or("Invalid original path")?;
    
    // 1. Update original note
    fs::write(&old_path, original_content).map_err(|e| e.to_string())?;
    
    // 2. Create the child note
    let safe_title = new_title
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' || c == ' ' { c } else { '-' })
        .collect::<String>()
        .trim()
        .to_string();
    
    let new_filename = format!("{}.md", safe_title);
    let new_path = parent.join(new_filename);
    
    fs::write(&new_path, new_content).map_err(|e| e.to_string())?;
    
    Ok(new_path.to_string_lossy().to_string())
}

/// Merges the content of a source note into a target note, then trashes the source.
#[tauri::command]
async fn merge_notes(state: State<'_, AppState>, target_path: String, source_path: String) -> Result<(), String> {
    let source_content = fs::read_to_string(&source_path).map_err(|e| e.to_string())?;
    let mut target_content = fs::read_to_string(&target_path).map_err(|e| e.to_string())?;
    
    target_content.push_str("\n\n--- MERGED CONTENT ---\n\n");
    target_content.push_str(&source_content);
    
    fs::write(&target_path, target_content).map_err(|e| e.to_string())?;
    
    // Move source to trash using our Sovereign Protocol
    move_to_trash(state, source_path).await
}

/// Moves a note to a hidden .trash directory within the vault.
#[tauri::command]
async fn move_to_trash(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let dir = state.notes_dir.lock().await.clone();
    let trash_dir = PathBuf::from(&dir).join(".trash");
    fs::create_dir_all(&trash_dir).map_err(|e| e.to_string())?;

    let old_path = PathBuf::from(&path);
    let filename = old_path.file_name().ok_or("Invalid filename")?;
    
    // Prefix with timestamp to avoid collisions
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    
    let new_filename = format!("{}_{}", now, filename.to_string_lossy());
    let new_path = trash_dir.join(new_filename);

    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}

/// Purges any files in the .trash folder older than 30 days.
#[tauri::command]
async fn purge_old_trash(state: State<'_, AppState>) -> Result<(), String> {
    let dir = state.notes_dir.lock().await.clone();
    let trash_dir = PathBuf::from(&dir).join(".trash");
    
    if !trash_dir.exists() {
        return Ok(());
    }

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    
    let thirty_days_secs = 30 * 24 * 60 * 60;

    if let Ok(entries) = fs::read_dir(trash_dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if let Ok(modified) = metadata.modified() {
                    let mtime = modified
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs();
                    
                    if now.saturating_sub(mtime) > thirty_days_secs {
                        let _ = fs::remove_file(entry.path());
                    }
                }
            }
        }
    }
    Ok(())
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

/// Builds the full link index for all notes in the directory.
/// Returns a map of { note_name -> { file_name, file_path, links[] } }
#[tauri::command]
async fn get_full_link_index(
    state: State<'_, AppState>,
) -> Result<HashMap<String, NoteLinkData>, String> {
    let dir = state.notes_dir.lock().await.clone();
    Ok(build_full_index(&dir))
}

/// Reads the Sovereign Ingestion Manifest (SIM) from the vault.
#[tauri::command]
async fn get_ingestion_manifest(
    state: State<'_, AppState>
) -> Result<serde_json::Value, String> {
    let dir = state.notes_dir.lock().await.clone();
    let path = std::path::PathBuf::from(dir).join("ingestion_manifest.json");
    
    if !path.exists() {
        return Ok(serde_json::json!({}));
    }

    let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    let json: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(json)
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
                let state = app.state::<AppState>();
                let mut state_notes = state.notes_dir.blocking_lock();
                *state_notes = notes_dir_str.clone();
            }

            // Attempt auto-init of AI from .env if it exists (Desktop Developer Mode)
            if let Ok(mgr) = ai::AiManager::new(None) {
                let state = app.state::<AppState>();
                let mut state_ai = state.ai_manager.blocking_lock();
                *state_ai = Some(mgr);
            }

            // Start the file watcher
            watcher::start_watcher(app.handle().clone(), notes_dir_str);

            // Autonomous Trash Purge (Startup Sweep)
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let state = app_handle.state::<AppState>();
                let _ = purge_old_trash(state).await;
            });

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
            move_to_trash,
            purge_old_trash,
            rename_note,
            get_full_link_index,
            ask_ai,
            process_ocr_image,
            split_note,
            merge_notes,
            get_ingestion_manifest,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
