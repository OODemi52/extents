// Using WalkBuilder to leave room for more customization
// later in dev
use ignore::WalkBuilder;
use std::path::{Component, PathBuf};
use std::time::Instant;
use tracing::{debug, error, info};

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
pub fn scan_dir_struct(path: Option<PathBuf>) {
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
        .max_depth(Some(3))
        .follow_links(false)
        .build();

    let mut count = 0;

    for result in walker {
        match result {
            Ok(entry) => {
                if entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) {
                    count += 1;
                }
            }
            Err(err) => {
                error!(%err, "Error reading entry");
            }
        }
    }

    let duration = start_time.elapsed();
    info!(?duration, count, "Folder scan complete");
}
