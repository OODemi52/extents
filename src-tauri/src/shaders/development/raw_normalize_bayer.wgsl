
fn raw_cfa_slot(pixel: vec2<i32>) -> u32 {
  return (u32(pixel.y % 2) * 2u) + u32(pixel.x % 2);
}

fn raw_normalized_sample_at(pixel: vec2<i32>) -> f32 {
  let slot = raw_cfa_slot(pixel);
  let source_sample = textureLoad(source_texture, pixel, 0).r;
  let black_level = development_parameters.black_levels[slot];
  let white_level = development_parameters.white_levels[slot];
  let sample_range = max(white_level - black_level, 0.000001);

  return max((source_sample - black_level) / sample_range, 0.0);
}

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let output_size = textureDimensions(output_texture);

  if (global_id.x >= output_size.x || global_id.y >= output_size.y) {
    return;
  }

  let pixel = vec2<i32>(i32(global_id.x), i32(global_id.y));
  let normalized_sample = raw_normalized_sample_at(pixel);

  textureStore(output_texture, pixel, vec4<f32>(normalized_sample, 0.0, 0.0, 1.0));
}
