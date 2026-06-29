
const RAW_HIGHLIGHT_RECONSTRUCTION_RADIUS: i32 = 2;

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

fn clipped_bayer_sample_at(pixel: vec2<i32>) -> bool {
  return textureLoad(source_texture, clamp_source_pixel(pixel), 0).g > 0.5;
}

fn unclipped_neighbor_estimates(pixel: vec2<i32>, target_color: u32) -> vec4<f32> {
  var same_color_sum = 0.0;
  var same_color_count = 0.0;
  var any_color_sum = 0.0;
  var any_color_count = 0.0;

  for (
    var offset_y: i32 = -RAW_HIGHLIGHT_RECONSTRUCTION_RADIUS;
    offset_y <= RAW_HIGHLIGHT_RECONSTRUCTION_RADIUS;
    offset_y = offset_y + 1
  ) {
    for (
      var offset_x: i32 = -RAW_HIGHLIGHT_RECONSTRUCTION_RADIUS;
      offset_x <= RAW_HIGHLIGHT_RECONSTRUCTION_RADIUS;
      offset_x = offset_x + 1
    ) {
      let neighbor = clamp_source_pixel(pixel + vec2<i32>(offset_x, offset_y));
      let sample = normalized_bayer_sample_at(neighbor);

      if (!clipped_bayer_sample_at(neighbor)) {
        any_color_sum = any_color_sum + sample;
        any_color_count = any_color_count + 1.0;

        if (raw_cfa_color_at(neighbor) == target_color) {
          same_color_sum = same_color_sum + sample;
          same_color_count = same_color_count + 1.0;
        }
      }
    }
  }

  return vec4<f32>(same_color_sum, same_color_count, any_color_sum, any_color_count);
}

fn reconstruct_highlight_sample(pixel: vec2<i32>) -> f32 {
  let sample = normalized_bayer_sample_at(pixel);

  if (!clipped_bayer_sample_at(pixel)) {
    return sample;
  }

  let estimates = unclipped_neighbor_estimates(pixel, raw_cfa_color_at(pixel));

  if (estimates.y > 0.0) {
    return estimates.x / estimates.y;
  }

  if (estimates.w > 0.0) {
    return estimates.z / estimates.w;
  }

  return min(sample, 1.0);
}

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let output_size = textureDimensions(output_texture);

  if (global_id.x >= output_size.x || global_id.y >= output_size.y) {
    return;
  }

  let pixel = vec2<i32>(i32(global_id.x), i32(global_id.y));
  let reconstructed_sample = reconstruct_highlight_sample(pixel);
  let clipped = select(0.0, 1.0, clipped_bayer_sample_at(pixel));

  textureStore(output_texture, pixel, vec4<f32>(reconstructed_sample, clipped, 0.0, 1.0));
}
