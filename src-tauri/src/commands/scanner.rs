use ignore::WalkBuilder;
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::Instant;
use tracing::info;

#[derive(Debug, Serialize, Clone)]
pub struct TreeNode {
    id: String,
    name: String,
    children: Vec<TreeNode>,
}

#[tauri::command]
pub fn get_home_dir() -> Result<String, String> {
    match dirs::home_dir() {
        Some(path) => Ok(path.to_string_lossy().into_owned()),
        None => Err("Could not find home directory".to_string()),
    }
}

#[tauri::command]
pub fn get_children_dir_paths(
    root_dir_path: Option<PathBuf>,
    scan_level: usize,
) -> Result<Vec<TreeNode>, String> {
    let start_time = Instant::now();

    let scan_path = match root_dir_path {
        Some(path) => PathBuf::from(path),
        None => dirs::home_dir().expect("Could not find home directory"),
    };

    info!(?scan_path, "Starting directory scan...");

    let mut node_map: HashMap<PathBuf, TreeNode> = HashMap::new();

    let walker = WalkBuilder::new(&scan_path)
        .max_depth(Some(scan_level))
        .build();

    for entry in walker.filter_map(Result::ok) {
        if entry.depth() == 0 {
            continue;
        }

        if entry.file_type().map_or(false, |ft| ft.is_dir()) {
            let path = entry.into_path();
            let name = path
                .file_name()
                .unwrap_or(path.as_os_str())
                .to_string_lossy()
                .into_owned();

            let id = path.to_string_lossy().into_owned();

            node_map.insert(
                path.clone(),
                TreeNode {
                    id,
                    name,
                    children: Vec::new(),
                },
            );
        }
    }

    let mut roots: Vec<TreeNode> = Vec::new();
    let mut sorted_paths: Vec<PathBuf> = node_map.keys().cloned().collect();
    sorted_paths.sort();

    for path in sorted_paths {
        if let Some(node) = node_map.remove(&path) {
            if let Some(parent_path) = path.parent() {
                if let Some(parent_node) = node_map.get_mut(parent_path) {
                    parent_node.children.push(node);
                } else {
                    roots.push(node);
                }
            } else {
                roots.push(node);
            }
        }
    }

    info!(
        duration_ms = start_time.elapsed().as_millis(),
        count = roots.len(),
        "Directory scan complete."
    );

    Ok(roots)
}
