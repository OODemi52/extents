use rusqlite::Connection;
use std::error::Error;
use tracing::info;

pub fn init_db() -> Result<Connection, Box<dyn Error>> {
    let cache_dir = dirs::cache_dir()
        .unwrap_or_else(|| std::env::temp_dir())
        .join("com.extents.cache");

    std::fs::create_dir_all(&cache_dir)?;

    let db_path = cache_dir.join("extents.db");

    let connection = Connection::open(db_path)?;

    run_migrations(&connection)?;

    info!("Database initialized");

    Ok(connection)
}

fn run_migrations(connection: &Connection) -> Result<(), Box<dyn Error>> {
    connection.execute_batch(
        "


        CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY,
            file_path TEXT NOT NULL,
            hash TEXT,
            added_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS edits (
            id INTEGER PRIMARY KEY,
            image_id INTEGER NOT NULL,
            brightness REAL DEFAULT 0.0,
            contrast REAL DEFAULT 1.0,
            FOREIGN KEY (image_id) REFERENCES images(id)
        );
        ",
    )?;

    info!("Migrations applied");
    Ok(())
}
