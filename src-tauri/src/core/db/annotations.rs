use rusqlite::{params, Connection};
use std::error::Error;
use tracing::info;

use crate::core::db::util::now_timestamp;

#[derive(Debug, Clone, serde::Serialize)]
pub struct ImageAnnotationEntry {
    pub file_path: String,
    pub rating: i64,
    pub flag: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct AnnotationEntry<T> {
    pub path: String,
    pub value: T,
}

pub type RatingEntry = AnnotationEntry<i64>;
pub type FlagEntry = AnnotationEntry<String>;

pub fn init_annotations_table(connection: &Connection) -> Result<(), Box<dyn Error>> {
    connection.execute(
        "
        CREATE TABLE IF NOT EXISTS image_annotations (
            file_path TEXT PRIMARY KEY,
            rating INTEGER NOT NULL DEFAULT 0,
            flag TEXT NOT NULL DEFAULT 'unflagged',
            updated_at INTEGER NOT NULL
        );
        ",
        [],
    )?;

    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_image_annotations_path ON image_annotations(file_path);",
        [],
    )?;

    Ok(())
}

pub fn set_rating_values(
    connection: &mut Connection,
    entries: &[RatingEntry],
) -> Result<(), Box<dyn Error>> {
    if entries.is_empty() {
        return Ok(());
    }

    let timestamp = now_timestamp();

    let transaction = connection.transaction()?;

    {
        let mut statement = transaction.prepare(
            "
            INSERT INTO image_annotations (file_path, rating, updated_at)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(file_path) DO UPDATE SET
                rating=excluded.rating,
                updated_at=excluded.updated_at;
            ",
        )?;

        for entry in entries {
            let rating_value = entry.value.clamp(0, 5);

            statement.execute(params![entry.path, rating_value, timestamp])?;
        }
    }

    transaction.commit()?;

    info!("[annotations] persisted ratings count={}", entries.len());

    Ok(())
}

pub fn set_flag_value(
    connection: &Connection,
    path: &str,
    value: &str,
) -> Result<(), Box<dyn Error>> {
    let flag_status_match = match value {
        "picked" | "rejected" | "unflagged" => value,
        _ => "unflagged",
    };

    connection.execute(
        "
        INSERT INTO image_annotations (file_path, flag, updated_at)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(file_path) DO UPDATE SET
            flag=excluded.flag,
            updated_at=excluded.updated_at;
        ",
        params![path, flag_status_match, now_timestamp()],
    )?;

    info!(
        "[annotations] persisted flag path={} flag={}",
        path, flag_status_match
    );

    Ok(())
}

pub fn set_flag_values(
    connection: &mut Connection,
    entries: &[FlagEntry],
) -> Result<(), Box<dyn Error>> {
    if entries.is_empty() {
        return Ok(());
    }

    let timestamp = now_timestamp();
    let transaction = connection.transaction()?;

    {
        let mut statement = transaction.prepare(
            "
            INSERT INTO image_annotations (file_path, flag, updated_at)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(file_path) DO UPDATE SET
                flag=excluded.flag,
                updated_at=excluded.updated_at;
            ",
        )?;

        for entry in entries {
            let flag_status_match = match entry.value.as_str() {
                "picked" | "rejected" | "unflagged" => entry.value.as_str(),
                _ => "unflagged",
            };

            statement.execute(params![entry.path, flag_status_match, timestamp])?;
        }
    }

    transaction.commit()?;

    info!("[annotations] persisted flags count={}", entries.len());

    Ok(())
}

pub fn get_annotation_values(
    connection: &Connection,
    paths: &[String],
) -> Result<Vec<ImageAnnotationEntry>, Box<dyn Error>> {
    if paths.is_empty() {
        return Ok(Vec::new());
    }

    let mut results = Vec::new();

    let placeholders = std::iter::repeat("?")
        .take(paths.len())
        .collect::<Vec<_>>()
        .join(", ");

    let sql = format!(
        "SELECT file_path, rating, flag FROM image_annotations WHERE file_path IN ({})",
        placeholders
    );

    let mut statement = connection.prepare(&sql)?;

    let rows = statement.query_map(rusqlite::params_from_iter(paths), |row| {
        Ok(ImageAnnotationEntry {
            file_path: row.get(0)?,
            rating: row.get(1)?,
            flag: row.get(2)?,
        })
    })?;

    for row in rows {
        results.push(row?);
    }

    Ok(results)
}
