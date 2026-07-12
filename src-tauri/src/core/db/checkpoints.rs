use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;
use std::error::Error;

use crate::core::db::util::{column_exists, json_to_sql_error, now_timestamp};

/// Persisted visual inspection checkpoint.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectionCheckpoint {
    pub id: i64,
    pub created_at: i64,
    pub label: String,
    pub source_path: String,
    pub active_layout: String,
    pub viewport: Value,
    pub edit_recipe: Value,
    pub renderer_snapshot: Value,
    pub app_version: String,
    pub notes: String,
    pub artifacts: Vec<InspectionCheckpointArtifact>,
}

/// File artifact attached to a visual inspection checkpoint.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectionCheckpointArtifact {
    pub id: i64,
    pub checkpoint_id: i64,
    pub kind: String,
    pub label: String,
    pub path: String,
    pub width: u32,
    pub height: u32,
    pub mime_type: String,
    pub created_at: i64,
}

/// Checkpoint values supplied when inserting a new database row.
pub struct InspectionCheckpointInsert {
    pub label: String,
    pub source_path: String,
    pub active_layout: String,
    pub viewport: Value,
    pub edit_recipe: Value,
    pub renderer_snapshot: Value,
    pub app_version: String,
    pub notes: String,
}

/// Checkpoint artifact values supplied when inserting a new database row.
pub struct InspectionCheckpointArtifactInsert {
    pub checkpoint_id: i64,
    pub kind: String,
    pub label: String,
    pub path: String,
    pub width: u32,
    pub height: u32,
    pub mime_type: String,
}

/// Initializes tables used by the Inspector checkpoint workflow.
pub fn init_checkpoints_table(connection: &Connection) -> Result<(), Box<dyn Error>> {
    connection.execute(
        "
        CREATE TABLE IF NOT EXISTS inspection_checkpoints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at INTEGER NOT NULL,
            label TEXT NOT NULL,
            source_path TEXT NOT NULL,
            active_layout TEXT NOT NULL,
            viewport_json TEXT NOT NULL,
            edit_recipe_json TEXT NOT NULL,
            renderer_snapshot_json TEXT NOT NULL,
            app_version TEXT NOT NULL,
            notes TEXT NOT NULL DEFAULT ''
        );
        ",
        [],
    )?;

    connection.execute(
        "
        CREATE TABLE IF NOT EXISTS inspection_checkpoint_artifacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            checkpoint_id INTEGER NOT NULL,
            kind TEXT NOT NULL,
            label TEXT NOT NULL DEFAULT '',
            path TEXT NOT NULL,
            width INTEGER NOT NULL,
            height INTEGER NOT NULL,
            mime_type TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY(checkpoint_id) REFERENCES inspection_checkpoints(id)
                ON DELETE CASCADE
        );
        ",
        [],
    )?;

    ensure_checkpoint_artifact_label_column(connection)?;

    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_inspection_checkpoints_source_path ON inspection_checkpoints(source_path);",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_inspection_checkpoints_created_at ON inspection_checkpoints(created_at);",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_inspection_checkpoint_artifacts_checkpoint_id ON inspection_checkpoint_artifacts(checkpoint_id);",
        [],
    )?;

    Ok(())
}

fn ensure_checkpoint_artifact_label_column(connection: &Connection) -> Result<(), Box<dyn Error>> {
    if column_exists(connection, "inspection_checkpoint_artifacts", "label")? {
        return Ok(());
    }

    connection.execute(
        "ALTER TABLE inspection_checkpoint_artifacts ADD COLUMN label TEXT NOT NULL DEFAULT '';",
        [],
    )?;

    Ok(())
}

/// Inserts a checkpoint record and returns the persisted row without artifacts.
pub fn insert_checkpoint(
    connection: &Connection,
    checkpoint: &InspectionCheckpointInsert,
) -> Result<InspectionCheckpoint, Box<dyn Error>> {
    let created_at = now_timestamp();
    let viewport_json = serde_json::to_string(&checkpoint.viewport)?;
    let edit_recipe_json = serde_json::to_string(&checkpoint.edit_recipe)?;
    let renderer_snapshot_json = serde_json::to_string(&checkpoint.renderer_snapshot)?;

    connection.execute(
        "
        INSERT INTO inspection_checkpoints (
            created_at,
            label,
            source_path,
            active_layout,
            viewport_json,
            edit_recipe_json,
            renderer_snapshot_json,
            app_version,
            notes
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9);
        ",
        params![
            created_at,
            checkpoint.label,
            checkpoint.source_path,
            checkpoint.active_layout,
            viewport_json,
            edit_recipe_json,
            renderer_snapshot_json,
            checkpoint.app_version,
            checkpoint.notes,
        ],
    )?;

    let id = connection.last_insert_rowid();

    get_checkpoint(connection, id)?.ok_or_else(|| "inserted checkpoint was not found".into())
}

/// Inserts one artifact for a checkpoint.
pub fn insert_checkpoint_artifact(
    connection: &Connection,
    artifact: &InspectionCheckpointArtifactInsert,
) -> Result<InspectionCheckpointArtifact, Box<dyn Error>> {
    let created_at = now_timestamp();

    connection.execute(
        "
        INSERT INTO inspection_checkpoint_artifacts (
            checkpoint_id,
            kind,
            label,
            path,
            width,
            height,
            mime_type,
            created_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8);
        ",
        params![
            artifact.checkpoint_id,
            artifact.kind,
            artifact.label,
            artifact.path,
            i64::from(artifact.width),
            i64::from(artifact.height),
            artifact.mime_type,
            created_at,
        ],
    )?;

    let id = connection.last_insert_rowid();

    Ok(InspectionCheckpointArtifact {
        id,
        checkpoint_id: artifact.checkpoint_id,
        kind: artifact.kind.clone(),
        label: artifact.label.clone(),
        path: artifact.path.clone(),
        width: artifact.width,
        height: artifact.height,
        mime_type: artifact.mime_type.clone(),
        created_at,
    })
}

/// Returns one checkpoint by id.
pub fn get_checkpoint(
    connection: &Connection,
    id: i64,
) -> Result<Option<InspectionCheckpoint>, Box<dyn Error>> {
    let mut statement = connection.prepare(
        "
        SELECT
            id,
            created_at,
            label,
            source_path,
            active_layout,
            viewport_json,
            edit_recipe_json,
            renderer_snapshot_json,
            app_version,
            notes
        FROM inspection_checkpoints
        WHERE id = ?1;
        ",
    )?;

    let checkpoint = statement
        .query_row(params![id], checkpoint_from_row)
        .optional()?;

    let Some(mut checkpoint) = checkpoint else {
        return Ok(None);
    };

    checkpoint.artifacts = list_checkpoint_artifacts(connection, checkpoint.id)?;

    Ok(Some(checkpoint))
}

/// Returns recent checkpoints, newest first.
pub fn list_recent_checkpoints(
    connection: &Connection,
    limit: u32,
) -> Result<Vec<InspectionCheckpoint>, Box<dyn Error>> {
    let bounded_limit = limit.clamp(1, 100);
    let mut statement = connection.prepare(
        "
        SELECT
            id,
            created_at,
            label,
            source_path,
            active_layout,
            viewport_json,
            edit_recipe_json,
            renderer_snapshot_json,
            app_version,
            notes
        FROM inspection_checkpoints
        ORDER BY created_at DESC, id DESC
        LIMIT ?1;
        ",
    )?;

    let rows = statement.query_map(params![bounded_limit], checkpoint_from_row)?;
    let mut checkpoints = Vec::new();

    for row in rows {
        let mut checkpoint = row?;
        checkpoint.artifacts = list_checkpoint_artifacts(connection, checkpoint.id)?;
        checkpoints.push(checkpoint);
    }

    Ok(checkpoints)
}

/// Returns recent checkpoints for one source path, newest first.
pub fn list_checkpoints_for_source_path(
    connection: &Connection,
    source_path: &str,
    limit: u32,
) -> Result<Vec<InspectionCheckpoint>, Box<dyn Error>> {
    let bounded_limit = limit.clamp(1, 100);
    let mut statement = connection.prepare(
        "
        SELECT
            id,
            created_at,
            label,
            source_path,
            active_layout,
            viewport_json,
            edit_recipe_json,
            renderer_snapshot_json,
            app_version,
            notes
        FROM inspection_checkpoints
        WHERE source_path = ?1
        ORDER BY created_at DESC, id DESC
        LIMIT ?2;
        ",
    )?;

    let rows = statement.query_map(params![source_path, bounded_limit], checkpoint_from_row)?;
    let mut checkpoints = Vec::new();

    for row in rows {
        let mut checkpoint = row?;
        checkpoint.artifacts = list_checkpoint_artifacts(connection, checkpoint.id)?;
        checkpoints.push(checkpoint);
    }

    Ok(checkpoints)
}

/// Deletes one checkpoint and returns artifact paths that should be removed from disk.
pub fn delete_checkpoint(
    connection: &Connection,
    checkpoint_id: i64,
) -> Result<Vec<String>, Box<dyn Error>> {
    let artifact_paths = list_checkpoint_artifact_paths(connection, checkpoint_id)?;

    connection.execute(
        "DELETE FROM inspection_checkpoint_artifacts WHERE checkpoint_id = ?1;",
        params![checkpoint_id],
    )?;
    connection.execute(
        "DELETE FROM inspection_checkpoints WHERE id = ?1;",
        params![checkpoint_id],
    )?;

    Ok(artifact_paths)
}

/// Deletes checkpoints for one source path and returns artifact paths to remove from disk.
pub fn delete_checkpoints_for_source_path(
    connection: &Connection,
    source_path: &str,
) -> Result<Vec<String>, Box<dyn Error>> {
    let checkpoint_ids = list_checkpoint_ids_for_source_path(connection, source_path)?;
    let mut artifact_paths = Vec::new();

    for checkpoint_id in checkpoint_ids {
        artifact_paths.extend(delete_checkpoint(connection, checkpoint_id)?);
    }

    Ok(artifact_paths)
}

/// Deletes every inspection checkpoint and returns artifact paths to remove from disk.
pub fn delete_all_checkpoints(connection: &Connection) -> Result<Vec<String>, Box<dyn Error>> {
    let artifact_paths = list_all_checkpoint_artifact_paths(connection)?;

    connection.execute("DELETE FROM inspection_checkpoint_artifacts;", [])?;
    connection.execute("DELETE FROM inspection_checkpoints;", [])?;

    Ok(artifact_paths)
}

fn list_checkpoint_artifacts(
    connection: &Connection,
    checkpoint_id: i64,
) -> Result<Vec<InspectionCheckpointArtifact>, Box<dyn Error>> {
    let mut statement = connection.prepare(
        "
        SELECT id, checkpoint_id, kind, label, path, width, height, mime_type, created_at
        FROM inspection_checkpoint_artifacts
        WHERE checkpoint_id = ?1
        ORDER BY created_at ASC, id ASC;
        ",
    )?;

    let rows = statement.query_map(params![checkpoint_id], |row| {
        let width: i64 = row.get(5)?;
        let height: i64 = row.get(6)?;

        Ok(InspectionCheckpointArtifact {
            id: row.get(0)?,
            checkpoint_id: row.get(1)?,
            kind: row.get(2)?,
            label: row.get(3)?,
            path: row.get(4)?,
            width: width.max(0) as u32,
            height: height.max(0) as u32,
            mime_type: row.get(7)?,
            created_at: row.get(8)?,
        })
    })?;

    let mut artifacts = Vec::new();

    for row in rows {
        artifacts.push(row?);
    }

    Ok(artifacts)
}

fn list_checkpoint_artifact_paths(
    connection: &Connection,
    checkpoint_id: i64,
) -> Result<Vec<String>, Box<dyn Error>> {
    let mut statement = connection.prepare(
        "
        SELECT path
        FROM inspection_checkpoint_artifacts
        WHERE checkpoint_id = ?1;
        ",
    )?;
    let rows = statement.query_map(params![checkpoint_id], |row| row.get(0))?;
    let mut paths = Vec::new();

    for row in rows {
        paths.push(row?);
    }

    Ok(paths)
}

fn list_all_checkpoint_artifact_paths(
    connection: &Connection,
) -> Result<Vec<String>, Box<dyn Error>> {
    let mut statement = connection.prepare(
        "
        SELECT path
        FROM inspection_checkpoint_artifacts;
        ",
    )?;
    let rows = statement.query_map([], |row| row.get(0))?;
    let mut paths = Vec::new();

    for row in rows {
        paths.push(row?);
    }

    Ok(paths)
}

fn list_checkpoint_ids_for_source_path(
    connection: &Connection,
    source_path: &str,
) -> Result<Vec<i64>, Box<dyn Error>> {
    let mut statement = connection.prepare(
        "
        SELECT id
        FROM inspection_checkpoints
        WHERE source_path = ?1;
        ",
    )?;
    let rows = statement.query_map(params![source_path], |row| row.get(0))?;
    let mut ids = Vec::new();

    for row in rows {
        ids.push(row?);
    }

    Ok(ids)
}

fn checkpoint_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<InspectionCheckpoint> {
    let viewport_json: String = row.get(5)?;
    let edit_recipe_json: String = row.get(6)?;
    let renderer_snapshot_json: String = row.get(7)?;

    let viewport = serde_json::from_str(&viewport_json).map_err(json_to_sql_error)?;
    let edit_recipe = serde_json::from_str(&edit_recipe_json).map_err(json_to_sql_error)?;
    let renderer_snapshot =
        serde_json::from_str(&renderer_snapshot_json).map_err(json_to_sql_error)?;

    Ok(InspectionCheckpoint {
        id: row.get(0)?,
        created_at: row.get(1)?,
        label: row.get(2)?,
        source_path: row.get(3)?,
        active_layout: row.get(4)?,
        viewport,
        edit_recipe,
        renderer_snapshot,
        app_version: row.get(8)?,
        notes: row.get(9)?,
        artifacts: Vec::new(),
    })
}
