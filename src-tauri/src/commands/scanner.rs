// Using WalkBuilder to leave room for more customization
// later in dev
use ignore::WalkBuilder;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::Instant;
use std::{collections::HashMap, path::PathBuf};
use tracing::{error, info};

use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Directory {
    path: String,
    parent_id: Option<String>,
}

#[tauri::command]
pub fn scan_files(path: Option<PathBuf>) {
    let scan_path =
        path.unwrap_or_else(|| dirs::home_dir().expect("Could not determine the home directory"));

    let _skip_dirs = vec![
        "node_modules",
        ".git",
        "target",
        "Library",
        "Applications",
        "System",
        "Windows",
        "$RECYCLE.BIN",
        "AppData",
    ];

    let walker = WalkBuilder::new(scan_path).follow_links(false).build();

    for result in walker {
        match result {
            Ok(entry) => {
                if entry.file_type().map(|ft| ft.is_file()).unwrap_or(false) {
                    println!("Found: {:?}", entry.path());
                }
            }
            Err(err) => {
                eprintln!("Error reading entry: {err}");
            }
        }
    }
}

#[tauri::command]
pub fn scan_dir_struct(path: Option<PathBuf>, depth: usize) -> Vec<String> {
    let start_time = Instant::now();

    let scan_path =
        path.unwrap_or_else(|| dirs::home_dir().expect("Could not determine the home directory"));

    let _skip_dirs = vec![
        "node_modules",
        ".git",
        "target",
        "Library",
        "Applications",
        "System",
        "Windows",
        "$RECYCLE.BIN",
        "AppData",
    ];

    info!(?scan_path, "Starting folder scan");

    let walker = WalkBuilder::new(&scan_path)
        .max_depth(Some(depth))
        .follow_links(false)
        .build();

    let mut dirs_found = Vec::new();

    for result in walker {
        match result {
            Ok(entry) => {
                if entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) {
                    dirs_found.push(entry.path().display().to_string());
                }
            }
            Err(err) => {
                error!(%err, "Error reading entry");
            }
        }
    }

    let duration = start_time.elapsed();

    info!(?duration, count = dirs_found.len(), "Folder scan complete");

    dirs_found
}

#[tauri::command]
pub fn build_fs_tree(
    state: tauri::State<'_, AppState>,
    root: Option<PathBuf>,
    scan_level: usize,
) -> Result<HashMap<String, Directory>, String> {
    let scan_path =
        root.unwrap_or_else(|| dirs::home_dir().expect("Could not determine the home directory"));

    // Check db connection

    let db = state.db.connection.lock().unwrap();

    let dirs_vec = scan_dir_struct(Some(scan_path), scan_level);

    let dirs_map = dirs_vec_to_map(dirs_vec);

    // Make hash map:
    // map = {
    //     "000": {path: "User/oodemi", parent_id: None, ...},
    //     "001": {path: "User/oodemi/Desktop", parent_id: "001", ...},
    //     "002": {path: "User/oodemi/Downloads", parent_id: "001", ...},
    //     "003": {path: "User/oodemi/Documents", parent_id: "001", ...},
    //     "004": {path: "User/oodemi/Documents/Grad Pics", parent_id: "003", ...},
    //     "005": {path: "User/oodemi/Documents/Bday Pics", parent_id: "003", ...},
    // }

    // need to first scan, the do the db transaction, respond to ui, the finish rest in background
    // think this logic mmight be better written in frontend so after ui is loaded, then second call can be made

    Ok(dirs_map)
}

fn dirs_vec_to_map(dirs_vec: Vec<String>) -> HashMap<String, Directory> {
    let mut map: HashMap<String, Directory> = HashMap::new();
    let mut count: usize = 0;

    for dir in dirs_vec {
        let id = format!("{:03}", count);
        count += 1;

        let path = Path::new(&dir);

        let parent_id = path.parent().and_then(|parent| {
            map.iter()
                .find(|(_, folder)| Path::new(&folder.path) == parent)
                .map(|(pid, _)| pid.clone())
        });

        map.insert(
            id.clone(),
            Directory {
                path: dir,
                parent_id,
            },
        );
    }

    map
}
