use serde::Deserialize;
use serde_json::Value;
use tauri::{Manager, State};

use crate::core::db::checkpoints::{InspectionCheckpoint, InspectionCheckpointArtifact};
use crate::core::inspection::checkpoints::{
    capture_checkpoint_artifact, checkpoint_artifact_dir, create_checkpoint_set,
    delete_all_checkpoints, delete_checkpoint, delete_checkpoints_for_source_path,
    list_checkpoints_for_source_path, list_recent_checkpoints,
    InspectionCheckpointArtifactCaptureInput, InspectionCheckpointSetInput,
};
use crate::state::AppState;

/// Delete request for source-scoped inspection checkpoints.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteInspectionCheckpointsForSourceRequest {
    source_path: String,
}

/// Checkpoint listing payload for one source image.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListInspectionCheckpointsForSourceRequest {
    source_path: String,
    limit: Option<u32>,
}

/// Checkpoint-set creation payload before any artifact images are captured.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateInspectionCheckpointSetRequest {
    source_path: String,
    label: Option<String>,
    active_layout: String,
    viewport: Value,
    edit_recipe: Value,
    notes: Option<String>,
}

/// Single artifact capture payload for an existing checkpoint set.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureInspectionCheckpointArtifactRequest {
    checkpoint_id: i64,
    variant_index: usize,
    label: String,
    edit_recipe: Value,
    restore_edit_recipe: Value,
}

#[tauri::command]
pub fn create_inspection_checkpoint_set(
    request: CreateInspectionCheckpointSetRequest,
    state: State<AppState>,
) -> Result<InspectionCheckpoint, String> {
    let app_version = state.window.app_handle().package_info().version.to_string();

    create_checkpoint_set(
        InspectionCheckpointSetInput {
            source_path: request.source_path,
            label: request.label,
            active_layout: request.active_layout,
            viewport: request.viewport,
            edit_recipe: request.edit_recipe,
            notes: request.notes,
        },
        &app_version,
        &state.renderer_manager,
        &state.db,
    )
}

#[tauri::command]
pub async fn capture_inspection_checkpoint_artifact(
    request: CaptureInspectionCheckpointArtifactRequest,
    state: State<'_, AppState>,
) -> Result<InspectionCheckpointArtifact, String> {
    let app_data_dir = state
        .window
        .app_handle()
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let artifact_dir = checkpoint_artifact_dir(app_data_dir)?;
    let renderer_manager = state.renderer_manager.clone();
    let db = state.db.clone();
    let artifact_request = InspectionCheckpointArtifactCaptureInput {
        checkpoint_id: request.checkpoint_id,
        variant_index: request.variant_index,
        label: request.label,
        edit_recipe: request.edit_recipe,
        restore_edit_recipe: request.restore_edit_recipe,
    };

    match tauri::async_runtime::spawn_blocking(move || {
        capture_checkpoint_artifact(artifact_request, artifact_dir, renderer_manager, db)
    })
    .await
    {
        Ok(result) => result,
        Err(error) => Err(format!(
            "Checkpoint artifact capture task failed: {error:?}"
        )),
    }
}

#[tauri::command]
pub fn list_inspection_checkpoints(
    limit: Option<u32>,
    state: State<AppState>,
) -> Result<Vec<InspectionCheckpoint>, String> {
    list_recent_checkpoints(&state.db, limit)
}

#[tauri::command]
pub fn list_inspection_checkpoints_for_source(
    request: ListInspectionCheckpointsForSourceRequest,
    state: State<AppState>,
) -> Result<Vec<InspectionCheckpoint>, String> {
    list_checkpoints_for_source_path(&state.db, &request.source_path, request.limit)
}

#[tauri::command]
pub fn delete_inspection_checkpoint(id: i64, state: State<AppState>) -> Result<(), String> {
    delete_checkpoint(&state.db, id)
}

#[tauri::command]
pub fn delete_inspection_checkpoints_for_source(
    request: DeleteInspectionCheckpointsForSourceRequest,
    state: State<AppState>,
) -> Result<(), String> {
    delete_checkpoints_for_source_path(&state.db, &request.source_path)
}

#[tauri::command]
pub fn delete_all_inspection_checkpoints(state: State<AppState>) -> Result<(), String> {
    delete_all_checkpoints(&state.db)
}
