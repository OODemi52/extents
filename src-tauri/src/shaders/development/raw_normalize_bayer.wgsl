
fn raw_cfa_slot(pixel: vec2<i32>) -> u32 {
  return (u32(pixel.y % 2) * 2u) + u32(pixel.x % 2);
}

fn raw_sample_metadata_at(pixel: vec2<i32>) -> vec4<f32> {
  let slot = raw_cfa_slot(pixel);
  let source_sample = textureLoad(source_texture, pixel, 0).r;
  let black_level = development_parameters.black_levels[slot];
  let white_level = development_parameters.white_levels[slot];
  let sample_range = max(white_level - black_level, 0.000001);
  let clip_epsilon = max(sample_range * 0.0005, 0.000001);
  let normalized_sample = max((source_sample - black_level) / sample_range, 0.0);
  let clipped = select(0.0, 1.0, source_sample >= white_level - clip_epsilon);

  return vec4<f32>(normalized_sample, clipped, 0.0, 1.0);
}

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let output_size = textureDimensions(output_texture);

  if (global_id.x >= output_size.x || global_id.y >= output_size.y) {
    return;
  }

  let pixel = vec2<i32>(i32(global_id.x), i32(global_id.y));
  let sample_metadata = raw_sample_metadata_at(pixel);

  textureStore(output_texture, pixel, sample_metadata);
}
