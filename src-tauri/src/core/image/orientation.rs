use std::fs::File;
use std::io::BufReader;
use std::path::Path;

use anyhow::{bail, Context, Result};
use exif::{In, Reader, Tag};
use rawler::decoders::RawDecodeParams;
use rawler::rawsource::RawSource;

/// Image orientation expressed as transform semantics rather than raw EXIF tag values.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Orientation {
    Normal,
    FlipHorizontal,
    Rotate180,
    FlipVertical,
    Transpose,
    Rotate90,
    Transverse,
    Rotate270,
}

/// Resolves the orientation transform that should be applied to a raster file.
///
/// Returns `Ok(None)` when no orientation transform is needed or no usable
/// orientation metadata is present.
pub fn resolve_raster_file_orientation(path: &str) -> Result<Option<Orientation>> {
    let orientation = match read_orientation_from_file_container(path) {
        Ok(orientation) => orientation,
        Err(error) => return Err(error),
    };

    Ok(orientation.and_then(orientation_from_exif))
}

/// Resolves the orientation transform that should be applied to a RAW file.
///
/// RAW metadata is preferred and EXIF container metadata is used as a fallback.
/// Returns `Ok(None)` when no orientation transform is needed or no usable
/// orientation metadata is present.
pub fn resolve_raw_file_orientation(path: &str) -> Result<Option<Orientation>> {
    let orientation = match read_orientation_from_raw_metadata(path) {
        Ok(Some(orientation)) => Some(orientation),
        Ok(None) => match read_orientation_from_file_container(path) {
            Ok(orientation) => orientation,
            Err(error) => return Err(error),
        },
        Err(error) => return Err(error),
    };

    Ok(orientation.and_then(orientation_from_exif))
}

/// Applies an orientation transform to a flat row-major pixel grid.
///
/// Returns the reoriented samples together with the post-transform dimensions.
pub fn apply_orientation<T: Copy>(
    pixels: Vec<T>,
    width: u32,
    height: u32,
    orientation: Orientation,
) -> Result<(Vec<T>, u32, u32)> {
    let width_usize = width as usize;
    let height_usize = height as usize;

    let expected_pixel_count = match width_usize.checked_mul(height_usize) {
        Some(expected_pixel_count) => expected_pixel_count,
        None => bail!("image dimensions overflow grid size"),
    };

    if pixels.len() != expected_pixel_count {
        bail!(
            "grid sample count {} does not match dimensions {}x{}",
            pixels.len(),
            width,
            height
        );
    }

    if matches!(orientation, Orientation::Normal) {
        return Ok((pixels, width, height));
    }

    let (oriented_width, oriented_height) = match orientation {
        Orientation::Normal
        | Orientation::FlipHorizontal
        | Orientation::Rotate180
        | Orientation::FlipVertical => (width_usize, height_usize),
        Orientation::Transpose
        | Orientation::Rotate90
        | Orientation::Transverse
        | Orientation::Rotate270 => (height_usize, width_usize),
    };

    let mut oriented_pixels = vec![pixels[0]; expected_pixel_count];

    for y in 0..height_usize {
        for x in 0..width_usize {
            let source_index = (y * width_usize) + x;

            let (destination_x, destination_y) = match orientation {
                Orientation::Normal => (x, y),
                Orientation::FlipHorizontal => (width_usize - 1 - x, y),
                Orientation::Rotate180 => (width_usize - 1 - x, height_usize - 1 - y),
                Orientation::FlipVertical => (x, height_usize - 1 - y),
                Orientation::Transpose => (y, x),
                Orientation::Rotate90 => (height_usize - 1 - y, x),
                Orientation::Transverse => (height_usize - 1 - y, width_usize - 1 - x),
                Orientation::Rotate270 => (y, width_usize - 1 - x),
            };

            let destination_index = (destination_y * oriented_width) + destination_x;
            oriented_pixels[destination_index] = pixels[source_index];
        }
    }

    Ok((
        oriented_pixels,
        oriented_width as u32,
        oriented_height as u32,
    ))
}
/// Reads the raw numeric orientation value from RAW metadata, if present.
fn read_orientation_from_raw_metadata(path: &str) -> Result<Option<u32>> {
    let rawfile = match RawSource::new(Path::new(path))
        .with_context(|| format!("Failed to open RAW file for orientation metadata: {path}"))
    {
        Ok(rawfile) => rawfile,
        Err(error) => return Err(error),
    };

    let decoder = match rawler::get_decoder(&rawfile) {
        Ok(decoder) => decoder,
        Err(_) => return Ok(None),
    };

    // Not actually decoding, reads the EXIF data from the file, but doesnt open it.
    let metadata = match decoder.raw_metadata(&rawfile, &RawDecodeParams::default()) {
        Ok(metadata) => metadata,
        Err(_) => return Ok(None),
    };

    Ok(metadata.exif.orientation.map(|value| value as u32))
}

/// Reads the raw numeric EXIF orientation value from the file container, if present.
fn read_orientation_from_file_container(path: &str) -> Result<Option<u32>> {
    let file = match File::open(path)
        .with_context(|| format!("Failed to open file for EXIF orientation metadata: {path}"))
    {
        Ok(file) => file,
        Err(error) => return Err(error),
    };

    let mut reader = BufReader::new(file);
    let exif = match Reader::new().read_from_container(&mut reader) {
        Ok(exif) => exif,
        Err(_) => return Ok(None),
    };

    Ok(exif
        .get_field(Tag::Orientation, In::PRIMARY)
        .and_then(|field| field.value.get_uint(0)))
}

/// Maps a raw EXIF orientation value from to an orientation transform.
///
/// Returns `None` when the value indicates no transform is needed or is not a
/// supported EXIF orientation.
fn orientation_from_exif(value: u32) -> Option<Orientation> {
    match value {
        1 => None,
        2 => Some(Orientation::FlipHorizontal),
        3 => Some(Orientation::Rotate180),
        4 => Some(Orientation::FlipVertical),
        5 => Some(Orientation::Transpose),
        6 => Some(Orientation::Rotate90),
        7 => Some(Orientation::Transverse),
        8 => Some(Orientation::Rotate270),
        _ => None,
    }
}
