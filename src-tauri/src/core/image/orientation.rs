use std::fs::File;
use std::io::BufReader;
use std::path::Path;

use exif::{In, Reader, Tag};
use image::{imageops, RgbaImage};
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

/// Resolves the orientation transform that should be applied to an image file.
///
/// For RAW files, RAW metadata is preferred and EXIF container metadata is used
/// as a fallback. Returns `None` when no orientation transform is needed or no
/// valid orientation metadata is present.
pub fn resolve_file_orientation(path: &str, is_raw: bool) -> Option<Orientation> {
    let orientation = if is_raw {
        read_orientation_from_raw_metadata(path)
            .or_else(|| read_orientation_from_file_container(path))
    } else {
        read_orientation_from_file_container(path)
    };

    match orientation {
        Some(value) => orientation_from_exif(value),
        None => None,
    }
}

/// Applies an orientation transform to an RGBA image buffer.
pub fn apply_orientation(image: RgbaImage, orientation: Orientation) -> RgbaImage {
    match orientation {
        Orientation::Normal => image,
        Orientation::FlipHorizontal => imageops::flip_horizontal(&image),
        Orientation::Rotate180 => imageops::rotate180(&image),
        Orientation::FlipVertical => imageops::flip_vertical(&image),
        Orientation::Transpose => imageops::rotate270(&imageops::flip_horizontal(&image)),
        Orientation::Rotate90 => imageops::rotate90(&image),
        Orientation::Transverse => imageops::rotate90(&imageops::flip_horizontal(&image)),
        Orientation::Rotate270 => imageops::rotate270(&image),
    }
}

/// Maps a rawler orientation value to the app's shared orientation type.
pub fn resolve_raw_orientation(orientation: rawler::Orientation) -> Option<Orientation> {
    match orientation {
        rawler::Orientation::Normal | rawler::Orientation::Unknown => None,
        rawler::Orientation::HorizontalFlip => Some(Orientation::FlipHorizontal),
        rawler::Orientation::Rotate180 => Some(Orientation::Rotate180),
        rawler::Orientation::VerticalFlip => Some(Orientation::FlipVertical),
        rawler::Orientation::Transpose => Some(Orientation::Transpose),
        rawler::Orientation::Rotate90 => Some(Orientation::Rotate90),
        rawler::Orientation::Transverse => Some(Orientation::Transverse),
        rawler::Orientation::Rotate270 => Some(Orientation::Rotate270),
    }
}

/// Reads the raw numeric orientation value from RAW metadata, if present.
fn read_orientation_from_raw_metadata(path: &str) -> Option<u32> {
    let rawfile = RawSource::new(Path::new(path)).ok()?;

    // Not actually decoding, reads the exif data from the file, but doesnt open it
    let decoder = rawler::get_decoder(&rawfile).ok()?;
    let metadata = decoder
        .raw_metadata(&rawfile, &RawDecodeParams::default())
        .ok()?;

    metadata.exif.orientation.map(|value| value as u32)
}

/// Reads the raw numeric EXIF orientation value from the file container, if present.
fn read_orientation_from_file_container(path: &str) -> Option<u32> {
    let file = File::open(path).ok()?;
    let mut reader = BufReader::new(file);
    let exif = Reader::new().read_from_container(&mut reader).ok()?;

    exif.get_field(Tag::Orientation, In::PRIMARY)?
        .value
        .get_uint(0)
}
