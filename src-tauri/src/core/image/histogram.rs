use image::RgbaImage;

#[derive(Debug, Clone, serde::Serialize)]
pub struct Histogram {
    pub red: Vec<u32>,
    pub green: Vec<u32>,
    pub blue: Vec<u32>,
    pub luma: Vec<u32>,
}

pub fn compute_histogram(image: &RgbaImage) -> Histogram {
    let mut red = vec![0u32; 256];
    let mut green = vec![0u32; 256];
    let mut blue = vec![0u32; 256];
    let mut luma = vec![0u32; 256];

    for pixel in image.pixels() {
        let [r, g, b, _] = pixel.0;
        red[r as usize] += 1;
        green[g as usize] += 1;
        blue[b as usize] += 1;

        let luminence = 0.2126 * r as f32 + 0.7152 * g as f32 + 0.0722 * b as f32;

        let index = luminence.round().clamp(0.0, 255.0) as usize;

        luma[index] += 1;
    }

    Histogram {
        red,
        green,
        blue,
        luma,
    }
}
