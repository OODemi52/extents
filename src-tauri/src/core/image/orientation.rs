use std::fs::File;
use std::io::BufReader;
use std::path::Path;

use exif::{In, Reader, Tag};
use image::{imageops, RgbaImage};
use rawler::decoders::RawDecodeParams;
use rawler::rawsource::RawSource;

pub fn resolve_file_orientation(path: &str, is_raw: bool) -> Option<u32> {
    let orientation = if is_raw {
        read_orientation_from_raw_metadata(path)
            .or_else(|| read_orientation_from_file_container(path))
    } else {
        read_orientation_from_file_container(path)
    };

    match orientation {
        Some(value @ 2..=8) => Some(value),
        _ => None,
    }
}

pub fn apply_orientation(image: RgbaImage, orientation: u32) -> RgbaImage {
    match orientation {
        2 => imageops::flip_horizontal(&image),
        3 => imageops::rotate180(&image),
        4 => imageops::flip_vertical(&image),
        5 => imageops::rotate270(&imageops::flip_horizontal(&image)),
        6 => imageops::rotate90(&image),
        7 => imageops::rotate90(&imageops::flip_horizontal(&image)),
        8 => imageops::rotate270(&image),
        _ => image,
    }
}

fn read_orientation_from_raw_metadata(path: &str) -> Option<u32> {
    let rawfile = RawSource::new(Path::new(path)).ok()?;

    // Not actually decoding, reads the exif data from the file, but doesnt open it
    let decoder = rawler::get_decoder(&rawfile).ok()?;
    let metadata = decoder
        .raw_metadata(&rawfile, &RawDecodeParams::default())
        .ok()?;

    metadata.exif.orientation.map(|value| value as u32)
}

fn read_orientation_from_file_container(path: &str) -> Option<u32> {
    let file = File::open(path).ok()?;
    let mut reader = BufReader::new(file);
    let exif = Reader::new().read_from_container(&mut reader).ok()?;

    exif.get_field(Tag::Orientation, In::PRIMARY)?
        .value
        .get_uint(0)
}
