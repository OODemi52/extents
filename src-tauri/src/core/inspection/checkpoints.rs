use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use serde_json::Value;

use crate::core::db::checkpoints::{
    delete_all_checkpoints as delete_all_checkpoint_rows,
    delete_checkpoint as delete_checkpoint_row,
    delete_checkpoints_for_source_path as delete_checkpoint_rows_for_source_path, get_checkpoint,
    insert_checkpoint, insert_checkpoint_artifact,
    list_checkpoints_for_source_path as list_checkpoint_rows_for_source_path,
    list_recent_checkpoints as list_recent_checkpoint_rows, InspectionCheckpoint,
    InspectionCheckpointArtifact, InspectionCheckpointArtifactInsert, InspectionCheckpointInsert,
};
use crate::core::db::connection::DbConnection;
use crate::core::editing::EditRecipe;
use crate::renderer::{RendererManager, RendererManagerHandle};

/// Metadata used to create an inspection checkpoint set before artifacts exist.
pub struct InspectionCheckpointSetInput {
    pub source_path: String,
    pub label: Option<String>,
    pub active_layout: String,
    pub viewport: Value,
    pub edit_recipe: Value,
    pub notes: Option<String>,
}

/// One renderer-output artifact capture request for an existing checkpoint set.
pub struct InspectionCheckpointArtifactCaptureInput {
    pub checkpoint_id: i64,
    pub variant_index: usize,
    pub label: String,
    pub edit_recipe: Value,
    pub restore_edit_recipe: Value,
}

/// Creates a checkpoint set row from the current renderer inspection snapshot.
pub fn create_checkpoint_set(
    request: InspectionCheckpointSetInput,
    app_version: &str,
    renderer_manager: &RendererManagerHandle,
    db: &DbConnection,
) -> Result<InspectionCheckpoint, String> {
    let snapshot = {
        let manager = RendererManager::lock(renderer_manager)?;

        match manager.inspection_snapshot() {
            Some(snapshot) if snapshot.has_image => snapshot,
            Some(_) => return Err("Renderer has no active image to checkpoint".to_string()),
            None => return Err("Renderer not initialized".to_string()),
        }
    };

    let snapshot_json = match serde_json::to_value(snapshot) {
        Ok(snapshot_json) => snapshot_json,
        Err(error) => return Err(error.to_string()),
    };

    let checkpoint = InspectionCheckpointInsert {
        label: request.label.unwrap_or_default(),
        source_path: request.source_path,
        active_layout: request.active_layout,
        viewport: request.viewport,
        edit_recipe: request.edit_recipe,
        renderer_snapshot: snapshot_json,
        app_version: app_version.to_string(),
        notes: request.notes.unwrap_or_default(),
    };

    let connection = db
        .connection
        .lock()
        .map_err(|error| format!("Database lock poisoned: {error}"))?;

    insert_checkpoint(&connection, &checkpoint).map_err(|error| error.to_string())
}

/// Captures one checkpoint artifact using the active renderer output graph.
pub fn capture_checkpoint_artifact(
    request: InspectionCheckpointArtifactCaptureInput,
    artifact_dir: PathBuf,
    renderer_manager: RendererManagerHandle,
    db: DbConnection,
) -> Result<InspectionCheckpointArtifact, String> {
    let job = InspectionCheckpointArtifactCaptureJob::new(request, artifact_dir)?;

    let (capture_width, capture_height) = {
        let mut manager = RendererManager::lock(&renderer_manager)?;

        manager.capture_display_output_png_variant(&job.recipe, &job.path, &job.restore_recipe)?
    };

    let insert_result =
        insert_captured_checkpoint_artifact(&db, &job, capture_width, capture_height);

    match insert_result {
        Ok(artifact) => Ok(artifact),
        Err(error) => {
            let cleanup_result = remove_checkpoint_artifact_file(&job.path);

            match cleanup_result {
                Ok(()) => Err(error),
                Err(cleanup_error) => Err(format!("{error}; {cleanup_error}")),
            }
        }
    }
}

/// Lists recent checkpoint sets, newest first.
pub fn list_recent_checkpoints(
    db: &DbConnection,
    limit: Option<u32>,
) -> Result<Vec<InspectionCheckpoint>, String> {
    let connection = db
        .connection
        .lock()
        .map_err(|error| format!("Database lock poisoned: {error}"))?;

    list_recent_checkpoint_rows(&connection, limit.unwrap_or(20)).map_err(|error| error.to_string())
}

/// Lists recent checkpoint sets for one source path, newest first.
pub fn list_checkpoints_for_source_path(
    db: &DbConnection,
    source_path: &str,
    limit: Option<u32>,
) -> Result<Vec<InspectionCheckpoint>, String> {
    let connection = db
        .connection
        .lock()
        .map_err(|error| format!("Database lock poisoned: {error}"))?;

    list_checkpoint_rows_for_source_path(&connection, source_path, limit.unwrap_or(100))
        .map_err(|error| error.to_string())
}

/// Deletes one checkpoint set and its artifact files.
pub fn delete_checkpoint(db: &DbConnection, id: i64) -> Result<(), String> {
    let artifact_paths = {
        let connection = db
            .connection
            .lock()
            .map_err(|error| format!("Database lock poisoned: {error}"))?;

        delete_checkpoint_row(&connection, id).map_err(|error| error.to_string())?
    };

    remove_checkpoint_artifacts(artifact_paths)
}

/// Deletes checkpoint sets for one source path and their artifact files.
pub fn delete_checkpoints_for_source_path(
    db: &DbConnection,
    source_path: &str,
) -> Result<(), String> {
    let artifact_paths = {
        let connection = db
            .connection
            .lock()
            .map_err(|error| format!("Database lock poisoned: {error}"))?;

        delete_checkpoint_rows_for_source_path(&connection, source_path)
            .map_err(|error| error.to_string())?
    };

    remove_checkpoint_artifacts(artifact_paths)
}

/// Deletes all checkpoint sets and their artifact files.
pub fn delete_all_checkpoints(db: &DbConnection) -> Result<(), String> {
    let artifact_paths = {
        let connection = db
            .connection
            .lock()
            .map_err(|error| format!("Database lock poisoned: {error}"))?;

        delete_all_checkpoint_rows(&connection).map_err(|error| error.to_string())?
    };

    remove_checkpoint_artifacts(artifact_paths)
}

/// Returns the artifact output directory under the application data directory.
pub fn checkpoint_artifact_dir(app_data_dir: PathBuf) -> Result<PathBuf, String> {
    let artifact_dir = app_data_dir
        .join("inspection-checkpoints")
        .join("artifacts");

    fs::create_dir_all(&artifact_dir).map_err(|error| {
        format!(
            "Failed to create checkpoint artifact directory {}: {error}",
            artifact_dir.display()
        )
    })?;

    Ok(artifact_dir)
}

struct InspectionCheckpointArtifactCaptureJob {
    checkpoint_id: i64,
    label: String,
    recipe: EditRecipe,
    restore_recipe: EditRecipe,
    path: PathBuf,
}

impl InspectionCheckpointArtifactCaptureJob {
    fn new(
        request: InspectionCheckpointArtifactCaptureInput,
        artifact_dir: PathBuf,
    ) -> Result<Self, String> {
        if request.checkpoint_id <= 0 {
            return Err("Checkpoint artifact capture requires a valid checkpoint id".to_string());
        }

        let recipe = edit_recipe_from_value(&request.edit_recipe)?;
        let restore_recipe = edit_recipe_from_value(&request.restore_edit_recipe)?;
        let capture_id = match u128::try_from(request.checkpoint_id) {
            Ok(capture_id) => capture_id,
            Err(_) => return Err("Checkpoint id could not be used for artifact naming".to_string()),
        };
        let path = checkpoint_artifact_path(
            &artifact_dir,
            capture_id,
            request.variant_index,
            &request.label,
        );

        Ok(Self {
            checkpoint_id: request.checkpoint_id,
            label: request.label,
            recipe,
            restore_recipe,
            path,
        })
    }
}

fn insert_captured_checkpoint_artifact(
    db: &DbConnection,
    job: &InspectionCheckpointArtifactCaptureJob,
    capture_width: u32,
    capture_height: u32,
) -> Result<InspectionCheckpointArtifact, String> {
    let connection = db
        .connection
        .lock()
        .map_err(|error| format!("Database lock poisoned: {error}"))?;

    match get_checkpoint(&connection, job.checkpoint_id).map_err(|error| error.to_string())? {
        Some(_) => {}
        None => return Err("Checkpoint set no longer exists".to_string()),
    }

    insert_checkpoint_artifact(
        &connection,
        &InspectionCheckpointArtifactInsert {
            checkpoint_id: job.checkpoint_id,
            kind: "renderer_output".to_string(),
            label: job.label.clone(),
            path: job.path.to_string_lossy().to_string(),
            width: capture_width,
            height: capture_height,
            mime_type: "image/png".to_string(),
        },
    )
    .map_err(|error| error.to_string())
}

fn edit_recipe_from_value(value: &Value) -> Result<EditRecipe, String> {
    serde_json::from_value(value.clone()).map_err(|error| error.to_string())
}

fn checkpoint_artifact_path(
    artifact_dir: &Path,
    capture_id: u128,
    index: usize,
    label: &str,
) -> PathBuf {
    let label_slug = slugify(label);

    artifact_dir.join(format!(
        "checkpoint-{capture_id}-{index:02}-{label_slug}.png"
    ))
}

fn slugify(value: &str) -> String {
    let mut slug = String::new();

    for character in value.chars() {
        if character.is_ascii_alphanumeric() {
            slug.push(character.to_ascii_lowercase());
        } else if !slug.ends_with('-') {
            slug.push('-');
        }
    }

    let slug = slug.trim_matches('-').to_string();

    if slug.is_empty() {
        "variant".to_string()
    } else {
        slug
    }
}

fn remove_checkpoint_artifacts(paths: Vec<String>) -> Result<(), String> {
    for path in paths {
        match fs::remove_file(&path) {
            Ok(()) => {}
            Err(error) if error.kind() == ErrorKind::NotFound => {}
            Err(error) => {
                return Err(format!(
                    "Failed to remove checkpoint artifact {}: {error}",
                    path
                ))
            }
        }
    }

    Ok(())
}

fn remove_checkpoint_artifact_file(path: &Path) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!(
            "failed to remove checkpoint artifact {}: {error}",
            path.display()
        )),
    }
}
