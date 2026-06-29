
const CFA_COLOR_RED: u32 = 0u;
const CFA_COLOR_GREEN: u32 = 1u;
const CFA_COLOR_BLUE: u32 = 2u;

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

fn normalized_bayer_sample_at(pixel: vec2<i32>) -> f32 {
  return textureLoad(source_texture, clamp_source_pixel(pixel), 0).r;
}

fn demosaic_raw_bayer_2x2(pixel: vec2<i32>) -> vec3<f32> {
  var sums = vec3<f32>(0.0, 0.0, 0.0);
  var counts = vec3<f32>(0.0, 0.0, 0.0);

  for (var offset_y: i32 = -1; offset_y <= 1; offset_y = offset_y + 1) {
    for (var offset_x: i32 = -1; offset_x <= 1; offset_x = offset_x + 1) {
      let neighbor = clamp_source_pixel(pixel + vec2<i32>(offset_x, offset_y));
      let sample = normalized_bayer_sample_at(neighbor);
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

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let output_size = textureDimensions(output_texture);

  if (global_id.x >= output_size.x || global_id.y >= output_size.y) {
    return;
  }

  let pixel = vec2<i32>(i32(global_id.x), i32(global_id.y));
  let camera_color = demosaic_raw_bayer_2x2(pixel);

  textureStore(output_texture, pixel, vec4<f32>(camera_color, 1.0));
}
