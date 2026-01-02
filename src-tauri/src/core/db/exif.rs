use crate::core::db::connection::DbConnection;
use crate::core::db::util::now_timestamp;
use crate::core::image::exif::{extract_exif_metadata, ExifMetadata};
use rusqlite::{params, Connection};
use std::collections::HashMap;
use std::error::Error;
use std::fs;
use std::time::SystemTime;
use tracing::{info, warn};

#[derive(Debug, Clone, serde::Serialize)]
pub struct ImageExifEntry {
    pub file_path: String,
    pub file_size: i64,
    pub modified_time: i64,
    pub metadata: ExifMetadata,
}

pub fn init_exif_table(connection: &Connection) -> Result<(), Box<dyn Error>> {
    connection.execute(
        "
        CREATE TABLE IF NOT EXISTS image_exif (
            file_path TEXT PRIMARY KEY,
            file_size INTEGER NOT NULL,
            modified_time INTEGER NOT NULL,
            metadata_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );
        ",
        [],
    )?;

    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_image_exif_path ON image_exif(file_path);",
        [],
    )?;

    Ok(())
}

pub fn get_exif_entries(
    connection: &Connection,
    paths: &[String],
) -> Result<Vec<ImageExifEntry>, Box<dyn Error>> {
    if paths.is_empty() {
        return Ok(Vec::new());
    }

    let placeholders = std::iter::repeat("?")
        .take(paths.len())
        .collect::<Vec<_>>()
        .join(", ");

    let sql = format!(
        "SELECT file_path, file_size, modified_time, metadata_json FROM image_exif WHERE file_path IN ({})",
        placeholders
    );

    let mut statement = connection.prepare(&sql)?;

    let rows = statement.query_map(rusqlite::params_from_iter(paths), |row| {
        let metadata_json: String = row.get(3)?;
        let metadata: ExifMetadata = serde_json::from_str(&metadata_json).map_err(|err| {
            rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(err))
        })?;

        Ok(ImageExifEntry {
            file_path: row.get(0)?,
            file_size: row.get(1)?,
            modified_time: row.get(2)?,
            metadata,
        })
    })?;

    let mut results = Vec::new();

    for row in rows {
        results.push(row?);
    }

    Ok(results)
}

pub fn upsert_exif_entries(
    connection: &mut Connection,
    entries: &[ImageExifEntry],
) -> Result<(), Box<dyn Error>> {
    if entries.is_empty() {
        return Ok(());
    }

    let timestamp = now_timestamp();
    let transaction = connection.transaction()?;

    {
        let mut statement = transaction.prepare(
            "
            INSERT INTO image_exif (file_path, file_size, modified_time, metadata_json, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ON CONFLICT(file_path) DO UPDATE SET
                file_size=excluded.file_size,
                modified_time=excluded.modified_time,
                metadata_json=excluded.metadata_json,
                updated_at=excluded.updated_at;
            ",
        )?;

        for entry in entries {
            let metadata_json = serde_json::to_string(&entry.metadata)?;
            statement.execute(params![
                entry.file_path,
                entry.file_size,
                entry.modified_time,
                metadata_json,
                timestamp
            ])?;
        }
    }

    transaction.commit()?;

    info!("[exif] persisted entries count={}", entries.len());

    Ok(())
}

pub fn map_exif_entries_by_path(rows: &[ImageExifEntry]) -> HashMap<&str, &ImageExifEntry> {
    let mut map = HashMap::new();
    for row in rows {
        map.insert(row.file_path.as_str(), row);
    }
    map
}

pub fn refresh_exif_entries(
    db: &DbConnection,
    paths: &[String],
) -> Result<Vec<ImageExifEntry>, Box<dyn Error>> {
    if paths.is_empty() {
        return Ok(Vec::new());
    }

    let existing_entries = {
        let connection = db
            .connection
            .lock()
            .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error.to_string()))?;
        get_exif_entries(&connection, paths)?
    };

    let existing_entries_map = map_exif_entries_by_path(&existing_entries);

    let mut results = Vec::with_capacity(paths.len());

    let mut pending_upserts = Vec::new();

    for path in paths {
        let Some((modified_time, file_size)) = read_file_signature(path) else {
            continue;
        };

        if let Some(existing_row) = existing_entries_map.get(path.as_str()) {
            if existing_row.modified_time == modified_time && existing_row.file_size == file_size {
                results.push((*existing_row).clone());
                continue;
            }
        }

        match extract_exif_metadata(path) {
            Ok(metadata) => {
                let entry = ImageExifEntry {
                    file_path: path.clone(),
                    file_size,
                    modified_time,
                    metadata,
                };

                pending_upserts.push(entry.clone());
                results.push(entry);
            }
            Err(error) => {
                warn!("[exif] failed to read {}: {}", path, error);
            }
        }
    }

    if !pending_upserts.is_empty() {
        let mut connection = db
            .connection
            .lock()
            .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error.to_string()))?;
        upsert_exif_entries(&mut *connection, &pending_upserts)?;
    }

    Ok(results)
}

fn read_file_signature(path: &str) -> Option<(i64, i64)> {
    let metadata = fs::metadata(path).ok()?;
    let modified_at = metadata.modified().ok()?;

    let modified_time = modified_at
        .duration_since(SystemTime::UNIX_EPOCH)
        .ok()?
        .as_secs() as i64;

    Some((modified_time, metadata.len() as i64))
}
