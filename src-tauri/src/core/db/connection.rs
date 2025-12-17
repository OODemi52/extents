use rusqlite::Connection;
use std::error::Error;
use std::sync::{Arc, Mutex};
use tracing::info;

use super::annotations::init_metadata_table;

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
    connection.execute_batch(
        "
            -- USERS
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                created_at INTEGER NOT NULL
            );

            -- IMAGES
            CREATE TABLE IF NOT EXISTS images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                file_path TEXT NOT NULL,
                hash TEXT UNIQUE,
                added_at INTEGER NOT NULL,
                metadata_json TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            -- FOLDERS
            CREATE TABLE IF NOT EXISTS folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL UNIQUE,
                parent_id INTEGER,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
            );

            -- TAGS (Many-to-many with images)
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS image_tags (
                image_id INTEGER NOT NULL,
                tag_id INTEGER NOT NULL,
                PRIMARY KEY (image_id, tag_id),
                FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
            );

            -- EDITS (Flexible schema using JSON for parameters)
            CREATE TABLE IF NOT EXISTS edits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image_id INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                edit_type TEXT NOT NULL,
                parameters_json TEXT NOT NULL,
                FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
            );

            -- PROJECTS (Grouping for images or edits)
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS project_images (
                project_id INTEGER NOT NULL,
                image_id INTEGER NOT NULL,
                PRIMARY KEY (project_id, image_id),
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
            );

            -- INDEXES for faster lookup
            CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
            CREATE INDEX IF NOT EXISTS idx_edits_image_id ON edits(image_id);
            CREATE INDEX IF NOT EXISTS idx_project_user_id ON projects(user_id);
            CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
            ",
    )?;

    init_metadata_table(connection)?;

    info!("Migrations applied");

    Ok(())
}
