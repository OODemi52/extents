use rusqlite::Connection;
use std::error::Error;
use std::sync::{Arc, Mutex};
use tracing::info;

use super::annotations::init_annotations_table;
use super::checkpoints::init_checkpoints_table;
use super::exif::init_exif_table;

/// Shared SQLite connection wrapper used by Tauri command handlers.
#[derive(Clone)]
pub struct DbConnection {
    pub connection: Arc<Mutex<Connection>>,
}

impl DbConnection {
    /// Opens the app database and applies table migrations.
    pub fn init_db_connection() -> Result<Self, Box<dyn Error>> {
        let cache_dir = dirs::cache_dir()
            .unwrap_or_else(|| std::env::temp_dir())
            .join("com.extents.cache");

        match std::fs::create_dir_all(&cache_dir) {
            Ok(()) => {}
            Err(error) => return Err(Box::new(error)),
        }

        let db_path = cache_dir.join("extents.db");

        let connection = match Connection::open(db_path) {
            Ok(connection) => connection,
            Err(error) => return Err(Box::new(error)),
        };

        match run_migrations(&connection) {
            Ok(()) => {}
            Err(error) => return Err(error),
        }

        info!("Database initialized");

        Ok(Self {
            connection: Arc::new(Mutex::new(connection)),
        })
    }
}

/// Applies all table migrations required by the app.
fn run_migrations(connection: &Connection) -> Result<(), Box<dyn Error>> {
    match init_annotations_table(connection) {
        Ok(()) => {}
        Err(error) => return Err(error),
    }

    match init_exif_table(connection) {
        Ok(()) => {}
        Err(error) => return Err(error),
    }

    match init_checkpoints_table(connection) {
        Ok(()) => {}
        Err(error) => return Err(error),
    }

    info!("Migrations applied");

    Ok(())
}
