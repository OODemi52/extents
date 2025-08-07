use rusqlite::{Connection, Result as SqlResult};

pub fn init_db() -> SqlResult<Connection, String> {
    let cache_dir = dirs::cache_dir()
        .unwrap_or_else(|| std::env::temp_dir())
        .join("com.extents.cache");

    std::fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;

    let db_path = cache_dir.join("db.sqlite");

    let connection = Connection::open(db_path).map_err(|e| e.to_string())?;

    Ok(connection)
}
