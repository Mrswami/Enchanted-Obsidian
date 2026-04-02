use regex::Regex;
use std::collections::HashMap;
use walkdir::WalkDir;

/// Extracts all [[Wikilinks]] from a markdown string.
/// Returns a Vec of unique link targets found in the content.
pub fn extract_wikilinks(content: &str) -> Vec<String> {
    let re = Regex::new(r"\[\[([^\[\]]+)\]\]").unwrap();
    let mut links: Vec<String> = re
        .captures_iter(content)
        .map(|cap| cap[1].trim().to_string())
        .collect();
    links.sort();
    links.dedup();
    links
}

/// Represents a note's link metadata for building the graph.
#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct NoteLinkData {
    pub file_name: String,
    pub file_path: String,
    pub links: Vec<String>,
}

/// Scans every .md file in the given directory and builds a full link index.
/// Returns a map of { filename -> NoteLinkData }.
pub fn build_full_index(notes_dir: &str) -> HashMap<String, NoteLinkData> {
    let mut index: HashMap<String, NoteLinkData> = HashMap::new();

    for entry in WalkDir::new(notes_dir)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension() {
                if ext == "md" {
                    let file_name = path
                        .file_stem()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();
                    let file_path = path.to_string_lossy().to_string();

                    if let Ok(content) = std::fs::read_to_string(path) {
                        let links = extract_wikilinks(&content);
                        index.insert(
                            file_name.clone(),
                            NoteLinkData {
                                file_name,
                                file_path,
                                links,
                            },
                        );
                    }
                }
            }
        }
    }

    index
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_wikilinks() {
        let content = "Hello [[World]] and [[Rust]] are great. Also [[World]] again.";
        let links = extract_wikilinks(content);
        assert_eq!(links, vec!["Rust", "World"]);
    }

    #[test]
    fn test_empty_content() {
        let links = extract_wikilinks("No links here at all.");
        assert!(links.is_empty());
    }
}
