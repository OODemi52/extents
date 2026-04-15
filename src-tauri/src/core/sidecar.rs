use crate::core::editing::EditRecipe;
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::fmt::{self, Display, Formatter};
use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

const SIDECAR_VERSION: u32 = 1;
const PROCESS_VERSION: u32 = 1;
const SIDECAR_EXTENSION: &str = "exts";

/// Versioned app sidecar schema persisted next to an image file.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct Sidecar {
    version: u32,
    process_version: u32,
    updated_at: String,
    app: SidecarAppInfo,
    source: SidecarSourceInfo,
    recipe: EditRecipe,
}

/// App metadata describing the build that wrote the sidecar file.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct SidecarAppInfo {
    name: String,
    version: String,
}

/// Source-image information stored alongside the persisted recipe.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct SidecarSourceInfo {
    path_hint: String,
}

/// Errors that can occur when loading or saving Extents sidecar files.
#[derive(Debug)]
pub enum SidecarError {
    InvalidSourcePath {
        path: String,
        reason: String,
    },
    ReadFailed {
        path: PathBuf,
        source: io::Error,
    },
    ParseFailed {
        path: PathBuf,
        source: serde_json::Error,
    },
    SerializeFailed {
        path: PathBuf,
        reason: String,
    },
    WriteFailed {
        path: PathBuf,
        source: io::Error,
    },
    RenameFailed {
        from: PathBuf,
        to: PathBuf,
        source: io::Error,
    },
}

impl Display for SidecarError {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        match self {
            SidecarError::InvalidSourcePath { path, reason } => {
                write!(f, "invalid source path {}: {}", path, reason)
            }
            SidecarError::ReadFailed { path, source } => {
                write!(f, "failed to read sidecar {}: {}", path.display(), source)
            }
            SidecarError::ParseFailed { path, source } => {
                write!(f, "failed to parse sidecar {}: {}", path.display(), source)
            }
            SidecarError::SerializeFailed { path, reason } => {
                write!(
                    f,
                    "failed to serialize sidecar {}: {}",
                    path.display(),
                    reason
                )
            }
            SidecarError::WriteFailed { path, source } => {
                write!(f, "failed to write sidecar {}: {}", path.display(), source)
            }
            SidecarError::RenameFailed { from, to, source } => write!(
                f,
                "failed to rename sidecar temp file {} to {}: {}",
                from.display(),
                to.display(),
                source
            ),
        }
    }
}

impl Error for SidecarError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            SidecarError::InvalidSourcePath { .. } => None,
            SidecarError::ReadFailed { source, .. } => Some(source),
            SidecarError::ParseFailed { source, .. } => Some(source),
            SidecarError::SerializeFailed { .. } => None,
            SidecarError::WriteFailed { source, .. } => Some(source),
            SidecarError::RenameFailed { source, .. } => Some(source),
        }
    }
}

impl Sidecar {
    /// Builds a persisted sidecar wrapper from an image path and in-memory recipe.
    fn from_recipe(image_path: &str, recipe: &EditRecipe) -> Result<Self, SidecarError> {
        let updated_at = match current_timestamp() {
            Ok(updated_at) => updated_at,
            Err(error) => return Err(error),
        };

        Ok(Self {
            version: SIDECAR_VERSION,
            process_version: PROCESS_VERSION,
            updated_at,
            app: SidecarAppInfo {
                name: env!("CARGO_PKG_NAME").to_string(),
                version: env!("CARGO_PKG_VERSION").to_string(),
            },
            source: SidecarSourceInfo {
                path_hint: image_path.to_string(),
            },
            recipe: recipe.clone(),
        })
    }
}

/// Loads an edit recipe from a sibling `.exts` sidecar file.
///
/// If no sidecar exists yet, this returns the default recipe.
pub fn load_recipe(path: &str) -> Result<EditRecipe, SidecarError> {
    let sidecar_path = match sidecar_path_for_image(path) {
        Ok(sidecar_path) => sidecar_path,
        Err(error) => return Err(error),
    };

    if !sidecar_path.exists() {
        return Ok(EditRecipe::default());
    }

    let sidecar_json = match fs::read_to_string(&sidecar_path) {
        Ok(sidecar_json) => sidecar_json,
        Err(source) => {
            return Err(SidecarError::ReadFailed {
                path: sidecar_path.clone(),
                source,
            });
        }
    };

    let sidecar: Sidecar = match serde_json::from_str(&sidecar_json) {
        Ok(sidecar) => sidecar,
        Err(source) => {
            return Err(SidecarError::ParseFailed {
                path: sidecar_path,
                source,
            });
        }
    };

    Ok(sidecar.recipe)
}

/// Saves an edit recipe to a sibling `.exts` sidecar file using an atomic write.
pub fn save_recipe(path: &str, recipe: &EditRecipe) -> Result<(), SidecarError> {
    let sidecar_path = match sidecar_path_for_image(path) {
        Ok(sidecar_path) => sidecar_path,
        Err(error) => return Err(error),
    };

    let temporary_path = match temporary_sidecar_path(&sidecar_path) {
        Ok(temporary_path) => temporary_path,
        Err(error) => return Err(error),
    };

    let sidecar = match Sidecar::from_recipe(path, recipe) {
        Ok(sidecar) => sidecar,
        Err(error) => return Err(error),
    };

    let serialized = match serde_json::to_vec_pretty(&sidecar) {
        Ok(serialized) => serialized,
        Err(source) => {
            return Err(SidecarError::SerializeFailed {
                path: sidecar_path.clone(),
                reason: source.to_string(),
            });
        }
    };

    let mut file = match File::create(&temporary_path) {
        Ok(file) => file,
        Err(source) => {
            return Err(SidecarError::WriteFailed {
                path: temporary_path.clone(),
                source,
            });
        }
    };

    if let Err(source) = file.write_all(&serialized) {
        return Err(SidecarError::WriteFailed {
            path: temporary_path.clone(),
            source,
        });
    }

    if let Err(source) = file.flush() {
        return Err(SidecarError::WriteFailed {
            path: temporary_path.clone(),
            source,
        });
    }

    if let Err(source) = file.sync_all() {
        return Err(SidecarError::WriteFailed {
            path: temporary_path.clone(),
            source,
        });
    }

    if let Err(source) = fs::rename(&temporary_path, &sidecar_path) {
        return Err(SidecarError::RenameFailed {
            from: temporary_path,
            to: sidecar_path,
            source,
        });
    }

    Ok(())
}

/// Derives the sibling `.exts` sidecar path for an image file.
fn sidecar_path_for_image(path: &str) -> Result<PathBuf, SidecarError> {
    if path.is_empty() {
        return Err(SidecarError::InvalidSourcePath {
            path: path.to_string(),
            reason: "path must not be empty".to_string(),
        });
    }

    let image_path = Path::new(path);

    if image_path.file_name().is_none() {
        return Err(SidecarError::InvalidSourcePath {
            path: path.to_string(),
            reason: "path must point to a file".to_string(),
        });
    }

    Ok(image_path.with_extension(SIDECAR_EXTENSION))
}

/// Builds the hidden temporary path used for atomic sidecar writes.
fn temporary_sidecar_path(sidecar_path: &Path) -> Result<PathBuf, SidecarError> {
    let file_name = match sidecar_path.file_name() {
        Some(file_name) => file_name,
        None => {
            return Err(SidecarError::InvalidSourcePath {
                path: sidecar_path.display().to_string(),
                reason: "sidecar path is missing a file name".to_string(),
            });
        }
    };

    let temporary_file_name = format!(".{}.tmp", file_name.to_string_lossy());

    Ok(sidecar_path.with_file_name(temporary_file_name))
}

/// Returns the current UTC timestamp formatted as RFC 3339.
fn current_timestamp() -> Result<String, SidecarError> {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .map_err(|error| SidecarError::SerializeFailed {
            path: PathBuf::from("<current-time>"),
            reason: format!("failed to format current timestamp: {}", error),
        })
}
