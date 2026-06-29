struct DevelopmentParameters {
  source: vec4<u32>,
  cfa_pattern: vec4<u32>,
  black_levels: vec4<f32>,
  white_levels: vec4<f32>,
  white_balance: vec4<f32>,
  camera_to_working_red: vec4<f32>,
  camera_to_working_green: vec4<f32>,
  camera_to_working_blue: vec4<f32>,
};

@group(0) @binding(0)
var source_texture: texture_2d<f32>;

@group(0) @binding(1)
var output_texture: texture_storage_2d<rgba16float, write>;

@group(0) @binding(2)
var<uniform> development_parameters: DevelopmentParameters;

const SOURCE_KIND_RASTER_SRGB: u32 = 0u;
const SOURCE_KIND_RAW_BAYER_2X2: u32 = 1u;

const CFA_COLOR_RED: u32 = 0u;
const CFA_COLOR_GREEN: u32 = 1u;
const CFA_COLOR_BLUE: u32 = 2u;

fn srgb_channel_to_linear(channel: f32) -> f32 {
  if (channel <= 0.04045) {
    return channel / 12.92;
  }

  return pow((channel + 0.055) / 1.055, 2.4);
}

fn srgb_to_linear_srgb(color: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    srgb_channel_to_linear(color.r),
    srgb_channel_to_linear(color.g),
    srgb_channel_to_linear(color.b)
  );
}

fn linear_srgb_to_linear_rec2020(color: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    (0.627404 * color.r) + (0.329283 * color.g) + (0.043313 * color.b),
    (0.069097 * color.r) + (0.919540 * color.g) + (0.011362 * color.b),
    (0.016391 * color.r) + (0.088013 * color.g) + (0.895595 * color.b)
  );
}

fn clamp_source_pixel(pixel: vec2<i32>) -> vec2<i32> {
  let source_size = textureDimensions(source_texture);
  let max_pixel = vec2<i32>(i32(source_size.x) - 1, i32(source_size.y) - 1);

  return clamp(pixel, vec2<i32>(0, 0), max_pixel);
}

fn raw_cfa_slot(pixel: vec2<i32>) -> u32 {
  return (u32(pixel.y % 2) * 2u) + u32(pixel.x % 2);
}

fn raw_cfa_color_at(pixel: vec2<i32>) -> u32 {
  return development_parameters.cfa_pattern[raw_cfa_slot(pixel)];
}

fn raw_normalized_sample_at(pixel: vec2<i32>) -> f32 {
  let clamped_pixel = clamp_source_pixel(pixel);
  let slot = raw_cfa_slot(clamped_pixel);
  let source_sample = textureLoad(source_texture, clamped_pixel, 0).r;
  let black_level = development_parameters.black_levels[slot];
  let white_level = development_parameters.white_levels[slot];
  let sample_range = max(white_level - black_level, 0.000001);

  return max((source_sample - black_level) / sample_range, 0.0);
}

fn demosaic_raw_bayer_2x2(pixel: vec2<i32>) -> vec3<f32> {
  var sums = vec3<f32>(0.0, 0.0, 0.0);
  var counts = vec3<f32>(0.0, 0.0, 0.0);

  for (var offset_y: i32 = -1; offset_y <= 1; offset_y = offset_y + 1) {
    for (var offset_x: i32 = -1; offset_x <= 1; offset_x = offset_x + 1) {
      let neighbor = clamp_source_pixel(pixel + vec2<i32>(offset_x, offset_y));
      let sample = raw_normalized_sample_at(neighbor);
      let color = raw_cfa_color_at(neighbor);

      if (color == CFA_COLOR_RED) {
        sums.r = sums.r + sample;
        counts.r = counts.r + 1.0;
      } else if (color == CFA_COLOR_GREEN) {
        sums.g = sums.g + sample;
        counts.g = counts.g + 1.0;
      } else if (color == CFA_COLOR_BLUE) {
        sums.b = sums.b + sample;
        counts.b = counts.b + 1.0;
      }
    }
  }

  return sums / max(counts, vec3<f32>(1.0, 1.0, 1.0));
}

fn camera_to_working_space(camera_color: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    dot(development_parameters.camera_to_working_red.xyz, camera_color),
    dot(development_parameters.camera_to_working_green.xyz, camera_color),
    dot(development_parameters.camera_to_working_blue.xyz, camera_color)
  );
}

fn develop_raw_bayer_2x2(pixel: vec2<i32>) -> vec4<f32> {
  let camera_color = demosaic_raw_bayer_2x2(pixel);
  let white_balanced_camera_color = camera_color * development_parameters.white_balance.xyz;
  let working_color = max(
    camera_to_working_space(white_balanced_camera_color),
    vec3<f32>(0.0, 0.0, 0.0)
  );

  return vec4<f32>(working_color, 1.0);
}

fn develop_source_color(pixel: vec2<i32>, source_color: vec4<f32>, source_kind: u32) -> vec4<f32> {
  if (source_kind == SOURCE_KIND_RASTER_SRGB) {
    let linear_srgb = srgb_to_linear_srgb(source_color.rgb);
    let working_color = linear_srgb_to_linear_rec2020(linear_srgb);

    return vec4<f32>(working_color, source_color.a);
  }

  if (source_kind == SOURCE_KIND_RAW_BAYER_2X2) {
    return develop_raw_bayer_2x2(pixel);
  }

  return source_color;
}

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let output_size = textureDimensions(output_texture);

  if (global_id.x >= output_size.x || global_id.y >= output_size.y) {
    return;
  }

  let pixel = vec2<i32>(i32(global_id.x), i32(global_id.y));
  let source_color = textureLoad(source_texture, pixel, 0);
  let developed_color = develop_source_color(
    pixel,
    source_color,
    development_parameters.source.x
  );

  textureStore(output_texture, pixel, developed_color);
}
