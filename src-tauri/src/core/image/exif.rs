use std::fs::File;
use std::io::BufReader;
use std::path::Path;

use anyhow::{Context, Result};
use exif::{In, Reader, Tag, Value};
use rawler::decoders::{Decoder, RawDecodeParams};
use rawler::formats::tiff::{Rational, SRational};
use rawler::rawsource::RawSource;

use crate::core::image::is_supported_raw_extension;

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExifMetadata {
    pub make: Option<String>,
    pub model: Option<String>,
    pub lens_make: Option<String>,
    pub lens_model: Option<String>,
    pub iso: Option<u32>,
    pub shutter_speed: Option<f32>,
    pub aperture: Option<f32>,
    pub focal_length: Option<f32>,
    pub exposure_bias: Option<f32>,
    pub white_balance: Option<u16>,
    pub metering_mode: Option<u16>,
    pub exposure_program: Option<u16>,
    pub color_space: Option<u16>,
    pub flash: Option<u16>,
    pub date_taken: Option<String>,
    pub orientation: Option<u32>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub gps_lat: Option<f64>,
    pub gps_lon: Option<f64>,
    pub gps_alt: Option<f64>,
}

pub fn extract_exif_metadata(path: &str) -> Result<ExifMetadata> {
    if is_supported_raw_extension(path) {
        extract_raw_exif_metadata(path)
    } else {
        extract_raster_exif_metadata(path)
    }
}

fn extract_raw_exif_metadata(path: &str) -> Result<ExifMetadata> {
    let raw_file = RawSource::new(Path::new(path))
        .with_context(|| format!("Failed to open raw file for metadata: {}", path))?;
    let decoder = rawler::get_decoder(&raw_file)
        .with_context(|| format!("Failed to get raw decoder for metadata: {}", path))?;
    let metadata = decoder
        .raw_metadata(&raw_file, &RawDecodeParams::default())
        .with_context(|| format!("Failed to read raw metadata: {}", path))?;

    let mut exif = ExifMetadata::default();

    exif.make = Some(metadata.make.clone()).filter(|value| !value.is_empty());
    exif.model = Some(metadata.model.clone()).filter(|value| !value.is_empty());

    if let Some(lens) = metadata.lens.as_ref() {
        exif.lens_make = Some(lens.lens_make.clone()).filter(|value| !value.is_empty());
        exif.lens_model = Some(lens.lens_model.clone()).filter(|value| !value.is_empty());
    } else {
        exif.lens_make = metadata.exif.lens_make.clone();
        exif.lens_model = metadata.exif.lens_model.clone();
    }

    exif.iso = metadata
        .exif
        .iso_speed
        .or_else(|| metadata.exif.iso_speed_ratings.map(|value| value as u32));
    exif.shutter_speed = metadata.exif.exposure_time.map(rational_to_f32);
    exif.aperture = metadata.exif.fnumber.map(rational_to_f32);
    exif.focal_length = metadata.exif.focal_length.map(rational_to_f32);
    exif.exposure_bias = metadata.exif.exposure_bias.map(srational_to_f32);
    exif.white_balance = metadata.exif.white_balance;
    exif.metering_mode = metadata.exif.metering_mode;
    exif.exposure_program = metadata.exif.exposure_program;
    exif.color_space = metadata.exif.color_space;
    exif.flash = metadata.exif.flash;
    exif.orientation = metadata.exif.orientation.map(|value| value as u32);
    exif.date_taken = metadata
        .exif
        .date_time_original
        .clone()
        .or_else(|| metadata.exif.create_date.clone());

    if let Some(gps) = metadata.exif.gps.as_ref() {
        exif.gps_lat =
            gps_lat_lon_to_decimal(gps.gps_latitude_ref.as_deref(), gps.gps_latitude.as_ref());
        exif.gps_lon =
            gps_lat_lon_to_decimal(gps.gps_longitude_ref.as_deref(), gps.gps_longitude.as_ref());
        exif.gps_alt = gps_altitude_to_decimal(gps.gps_altitude_ref, gps.gps_altitude.as_ref());
    }

    if exif.width.is_none() || exif.height.is_none() {
        if let Some((width, height)) = read_raw_dimensions(&raw_file, decoder.as_ref()) {
            exif.width = Some(width);
            exif.height = Some(height);
        } else if let Some((width, height)) = read_dimensions_from_exif_path(path) {
            exif.width = Some(width);
            exif.height = Some(height);
        }
    }

    Ok(exif)
}

fn extract_raster_exif_metadata(path: &str) -> Result<ExifMetadata> {
    let file =
        File::open(path).with_context(|| format!("Failed to open image for EXIF: {}", path))?;
    let mut reader = BufReader::new(file);
    let exif = Reader::new().read_from_container(&mut reader).ok();

    let mut metadata = ExifMetadata::default();

    if let Some(exif) = exif.as_ref() {
        metadata.make = read_exif_string(exif, Tag::Make);
        metadata.model = read_exif_string(exif, Tag::Model);
        metadata.lens_make = read_exif_string(exif, Tag::LensMake);
        metadata.lens_model = read_exif_string(exif, Tag::LensModel);
        metadata.iso = read_exif_uint(exif, Tag::PhotographicSensitivity)
            .or_else(|| read_exif_uint(exif, Tag::ISOSpeed));
        metadata.shutter_speed = read_exif_rational(exif, Tag::ExposureTime);
        metadata.aperture = read_exif_rational(exif, Tag::FNumber);
        metadata.focal_length = read_exif_rational(exif, Tag::FocalLength);
        metadata.exposure_bias = read_exif_srational(exif, Tag::ExposureBiasValue);
        metadata.white_balance = read_exif_uint(exif, Tag::WhiteBalance).map(|value| value as u16);
        metadata.metering_mode = read_exif_uint(exif, Tag::MeteringMode).map(|value| value as u16);
        metadata.exposure_program =
            read_exif_uint(exif, Tag::ExposureProgram).map(|value| value as u16);
        metadata.color_space = read_exif_uint(exif, Tag::ColorSpace).map(|value| value as u16);
        metadata.flash = read_exif_uint(exif, Tag::Flash).map(|value| value as u16);
        metadata.orientation = read_exif_uint(exif, Tag::Orientation);
        metadata.date_taken = read_exif_string(exif, Tag::DateTimeOriginal)
            .or_else(|| read_exif_string(exif, Tag::DateTimeDigitized))
            .or_else(|| read_exif_string(exif, Tag::DateTime));

        if let Some((width, height)) = read_dimensions_from_exif(exif) {
            metadata.width = Some(width);
            metadata.height = Some(height);
        }

        if let Some((latitude, longitude, altitude)) = read_gps_from_exif(exif) {
            metadata.gps_lat = latitude;
            metadata.gps_lon = longitude;
            metadata.gps_alt = altitude;
        }
    }

    if metadata.width.is_none() || metadata.height.is_none() {
        if let Some((width, height)) = read_dimensions_from_exif_path(path) {
            metadata.width = metadata.width.or(Some(width));
            metadata.height = metadata.height.or(Some(height));
        }
    }

    Ok(metadata)
}

fn read_dimensions_from_exif(exif: &exif::Exif) -> Option<(u32, u32)> {
    let width = read_exif_uint(exif, Tag::PixelXDimension)
        .or_else(|| read_exif_uint(exif, Tag::ImageWidth));
    let height = read_exif_uint(exif, Tag::PixelYDimension)
        .or_else(|| read_exif_uint(exif, Tag::ImageLength));

    match (width, height) {
        (Some(width), Some(height)) => Some((width, height)),
        _ => None,
    }
}

fn read_dimensions_from_exif_path(path: &str) -> Option<(u32, u32)> {
    match imagesize::size(path) {
        Ok(dimensions) => Some((dimensions.width as u32, dimensions.height as u32)),
        Err(_) => None,
    }
}

fn read_raw_dimensions(rawfile: &RawSource, decoder: &dyn Decoder) -> Option<(u32, u32)> {
    let raw_image = decoder
        .raw_image(rawfile, &RawDecodeParams::default(), true)
        .ok()?;

    Some((raw_image.width as u32, raw_image.height as u32))
}

fn read_exif_string(exif: &exif::Exif, tag: Tag) -> Option<String> {
    let field = get_field_any(exif, tag)?;
    match &field.value {
        Value::Ascii(values) => values.get(0).map(|value| {
            let value = String::from_utf8_lossy(value);
            value.trim_end_matches('\u{0}').trim_end().to_string()
        }),
        _ => None,
    }
}

fn read_exif_uint(exif: &exif::Exif, tag: Tag) -> Option<u32> {
    get_field_any(exif, tag)?.value.get_uint(0)
}

fn read_exif_rational(exif: &exif::Exif, tag: Tag) -> Option<f32> {
    let field = get_field_any(exif, tag)?;
    match &field.value {
        Value::Rational(values) => values.get(0).map(|value| value.to_f32()),
        _ => None,
    }
}

fn read_exif_srational(exif: &exif::Exif, tag: Tag) -> Option<f32> {
    let field = get_field_any(exif, tag)?;
    match &field.value {
        Value::SRational(values) => values.get(0).map(|value| value.to_f32()),
        _ => None,
    }
}

fn get_field_any(exif: &exif::Exif, tag: Tag) -> Option<&exif::Field> {
    exif.get_field(tag, In::PRIMARY)
        .or_else(|| exif.get_field(tag, In::THUMBNAIL))
        .or_else(|| exif.fields().find(|field| field.tag == tag))
}

fn gps_lat_lon_to_decimal(reference: Option<&str>, coords: Option<&[Rational; 3]>) -> Option<f64> {
    let coords = coords?;
    let degrees = coords[0].n as f64 / coords[0].d as f64;
    let minutes = coords[1].n as f64 / coords[1].d as f64;
    let seconds = coords[2].n as f64 / coords[2].d as f64;
    let mut value = degrees + (minutes / 60.0) + (seconds / 3600.0);

    if matches!(reference, Some("S") | Some("W")) {
        value = -value;
    }

    Some(value)
}

fn gps_altitude_to_decimal(reference: Option<u8>, altitude: Option<&Rational>) -> Option<f64> {
    let altitude = altitude?;
    let mut value = altitude.n as f64 / altitude.d as f64;

    if matches!(reference, Some(1)) {
        value = -value;
    }

    Some(value)
}

fn rational_to_f32(rational: Rational) -> f32 {
    rational.n as f32 / rational.d as f32
}

fn srational_to_f32(rational: SRational) -> f32 {
    rational.n as f32 / rational.d as f32
}

fn read_gps_from_exif(exif: &exif::Exif) -> Option<(Option<f64>, Option<f64>, Option<f64>)> {
    let latitude_reference = read_exif_string(exif, Tag::GPSLatitudeRef);
    let longitude_reference = read_exif_string(exif, Tag::GPSLongitudeRef);

    let latitude = match get_field_any(exif, Tag::GPSLatitude)?.value {
        Value::Rational(ref values) if values.len() >= 3 => {
            let degrees = values[0].to_f64();
            let minutes = values[1].to_f64();
            let seconds = values[2].to_f64();
            let mut value = degrees + (minutes / 60.0) + (seconds / 3600.0);
            if matches!(latitude_reference.as_deref(), Some("S")) {
                value = -value;
            }
            Some(value)
        }
        _ => None,
    };

    let longitude = match get_field_any(exif, Tag::GPSLongitude)?.value {
        Value::Rational(ref values) if values.len() >= 3 => {
            let degrees = values[0].to_f64();
            let minutes = values[1].to_f64();
            let seconds = values[2].to_f64();
            let mut value = degrees + (minutes / 60.0) + (seconds / 3600.0);
            if matches!(longitude_reference.as_deref(), Some("W")) {
                value = -value;
            }
            Some(value)
        }
        _ => None,
    };

    let altitude_reference = read_exif_uint(exif, Tag::GPSAltitudeRef).map(|value| value as u8);
    let mut altitude = match get_field_any(exif, Tag::GPSAltitude) {
        Some(field) => match &field.value {
            Value::Rational(values) => values.get(0).map(|value| value.to_f64()),
            _ => None,
        },
        None => None,
    };

    if matches!(altitude_reference, Some(1)) {
        if let Some(value) = altitude.as_mut() {
            *value = -*value;
        }
    }

    Some((latitude, longitude, altitude))
}
