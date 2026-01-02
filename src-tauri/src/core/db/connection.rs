use rusqlite::Connection;
use std::error::Error;
use std::sync::{Arc, Mutex};
use tracing::info;

use super::annotations::init_annotations_table;
use super::exif::init_exif_table;

#[derive(Clone)]
pub struct DbConnection {
    pub connection: Arc<Mutex<Connection>>,
}

impl DbConnection {
    pub fn init_db_connection() -> Result<Self, Box<dyn Error>> {
        let cache_dir = dirs::cache_dir()
            .unwrap_or_else(|| std::env::temp_dir())
            .join("com.extents.cache");

        std::fs::create_dir_all(&cache_dir)?;

        let db_path = cache_dir.join("extents.db");

        let connection = Connection::open(db_path)?;

        run_migrations(&connection)?;

        info!("Database initialized");

        Ok(Self {
            connection: Arc::new(Mutex::new(connection)),
        })
    }
}

fn run_migrations(connection: &Connection) -> Result<(), Box<dyn Error>> {
    init_annotations_table(connection)?;
    init_exif_table(connection)?;

    info!("Migrations applied");

    Ok(())
}
