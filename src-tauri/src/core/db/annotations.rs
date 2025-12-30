use rusqlite::{params, Connection};
use std::error::Error;
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::info;

#[derive(Debug, Clone, serde::Serialize)]
pub struct ImageMetadataRow {
    pub file_path: String,
    pub rating: i64,
    pub flag: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct RatingEntry {
    pub path: String,
    pub rating: i64,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct FlagEntry {
    pub path: String,
    pub flag: String,
}

pub fn init_metadata_table(connection: &Connection) -> Result<(), Box<dyn Error>> {
    connection.execute(
        "
        CREATE TABLE IF NOT EXISTS image_metadata (
            file_path TEXT PRIMARY KEY,
            rating INTEGER NOT NULL DEFAULT 0,
            flag TEXT NOT NULL DEFAULT 'unflagged',
            updated_at INTEGER NOT NULL
        );
        ",
        [],
    )?;

    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_image_metadata_path ON image_metadata(file_path);",
        [],
    )?;

    Ok(())
}

fn now_ts() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

pub fn set_rating_values(
    connection: &mut Connection,
    entries: &[RatingEntry],
) -> Result<(), Box<dyn Error>> {
    if entries.is_empty() {
        return Ok(());
    }

    let timestamp = now_ts();

    let transaction = connection.transaction()?;

    {
        let mut statement = transaction.prepare(
            "
            INSERT INTO image_metadata (file_path, rating, updated_at)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(file_path) DO UPDATE SET
                rating=excluded.rating,
                updated_at=excluded.updated_at;
            ",
        )?;

        for entry in entries {
            let rating_value = entry.rating.clamp(0, 5);

            statement.execute(params![entry.path, rating_value, timestamp])?;
        }
    }

    transaction.commit()?;

    info!("[metadata] persisted ratings count={}", entries.len());

    Ok(())
}

pub fn set_flag_value(
    connection: &Connection,
    path: &str,
    flag: &str,
) -> Result<(), Box<dyn Error>> {
    let flag_status_match = match flag {
        "picked" | "rejected" | "unflagged" => flag,
        _ => "unflagged",
    };

    connection.execute(
        "
        INSERT INTO image_metadata (file_path, flag, updated_at)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(file_path) DO UPDATE SET
            flag=excluded.flag,
            updated_at=excluded.updated_at;
        ",
        params![path, flag_status_match, now_ts()],
    )?;

    info!(
        "[metadata] persisted flag path={} flag={}",
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

    let timestamp = now_ts();
    let transaction = connection.transaction()?;

    {
        let mut statement = transaction.prepare(
            "
            INSERT INTO image_metadata (file_path, flag, updated_at)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(file_path) DO UPDATE SET
                flag=excluded.flag,
                updated_at=excluded.updated_at;
            ",
        )?;

        for entry in entries {
            let flag_status_match = match entry.flag.as_str() {
                "picked" | "rejected" | "unflagged" => entry.flag.as_str(),
                _ => "unflagged",
            };

            statement.execute(params![entry.path, flag_status_match, timestamp])?;
        }
    }

    transaction.commit()?;

    info!("[metadata] persisted flags count={}", entries.len());

    Ok(())
}

pub fn get_annotation_values(
    connection: &Connection,
    paths: &[String],
) -> Result<Vec<ImageMetadataRow>, Box<dyn Error>> {
    if paths.is_empty() {
        return Ok(Vec::new());
    }

    let mut results = Vec::new();

    let placeholders = std::iter::repeat("?")
        .take(paths.len())
        .collect::<Vec<_>>()
        .join(", ");

    let sql = format!(
        "SELECT file_path, rating, flag FROM image_metadata WHERE file_path IN ({})",
        placeholders
    );

    let mut statement = connection.prepare(&sql)?;

    let rows = statement.query_map(rusqlite::params_from_iter(paths), |row| {
        Ok(ImageMetadataRow {
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
