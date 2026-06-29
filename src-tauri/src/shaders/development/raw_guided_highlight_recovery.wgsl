
const GUIDED_RECOVERY_RADIUS: i32 = 4;
const GUIDED_RECOVERY_EPSILON: f32 = 0.000001;
const GUIDED_RECOVERY_MIN_VALID_LUMA: f32 = 0.02;
const GUIDED_RECOVERY_CHROMA_LIMIT: f32 = 4.0;

fn clamp_source_pixel(pixel: vec2<i32>) -> vec2<i32> {
  let source_size = textureDimensions(source_texture);
  let max_pixel = vec2<i32>(i32(source_size.x) - 1, i32(source_size.y) - 1);

  return clamp(pixel, vec2<i32>(0, 0), max_pixel);
}

fn camera_color_at(pixel: vec2<i32>) -> vec3<f32> {
  return max(textureLoad(source_texture, clamp_source_pixel(pixel), 0).rgb, vec3<f32>(0.0, 0.0, 0.0));
}

fn clipped_mask_at(pixel: vec2<i32>) -> f32 {
  return clamp(textureLoad(source_texture, clamp_source_pixel(pixel), 0).a, 0.0, 1.0);
}

fn camera_luma(color: vec3<f32>) -> f32 {
  return max(dot(color, vec3<f32>(0.25, 0.5, 0.25)), 0.0);
}

fn camera_chroma_ratio(color: vec3<f32>) -> vec3<f32> {
  let luma = max(camera_luma(color), GUIDED_RECOVERY_EPSILON);

  return clamp(color / luma, vec3<f32>(0.0, 0.0, 0.0), vec3<f32>(GUIDED_RECOVERY_CHROMA_LIMIT));
}

fn spatial_weight(offset: vec2<i32>) -> f32 {
  let distance_squared = f32((offset.x * offset.x) + (offset.y * offset.y));

  return 1.0 / (1.0 + distance_squared);
}

fn valid_neighbor_weight(center_luma: f32, offset: vec2<i32>, neighbor: vec2<i32>) -> f32 {
  let color = camera_color_at(neighbor);
  let luma = camera_luma(color);
  let clipped = clipped_mask_at(neighbor);
  let luma_similarity = 1.0 / (1.0 + abs(luma - center_luma) * 4.0);
  let valid_luma = select(0.0, 1.0, luma >= GUIDED_RECOVERY_MIN_VALID_LUMA);
  let valid_clip = 1.0 - clipped;

  return spatial_weight(offset) * luma_similarity * valid_luma * valid_clip;
}

fn guided_neighbor_chroma(pixel: vec2<i32>, center_luma: f32) -> vec4<f32> {
  var chroma_sum = vec3<f32>(0.0, 0.0, 0.0);
  var weight_sum = 0.0;

  for (
    var offset_y: i32 = -GUIDED_RECOVERY_RADIUS;
    offset_y <= GUIDED_RECOVERY_RADIUS;
    offset_y = offset_y + 1
  ) {
    for (
      var offset_x: i32 = -GUIDED_RECOVERY_RADIUS;
      offset_x <= GUIDED_RECOVERY_RADIUS;
      offset_x = offset_x + 1
    ) {
      let offset = vec2<i32>(offset_x, offset_y);
      let neighbor = pixel + offset;
      let weight = valid_neighbor_weight(center_luma, offset, neighbor);
      let color = camera_color_at(neighbor);

      chroma_sum = chroma_sum + (camera_chroma_ratio(color) * weight);
      weight_sum = weight_sum + weight;
    }
  }

  if (weight_sum <= GUIDED_RECOVERY_EPSILON) {
    return vec4<f32>(1.0, 1.0, 1.0, 0.0);
  }

  return vec4<f32>(chroma_sum / weight_sum, weight_sum);
}

fn local_base_luma(pixel: vec2<i32>, center_luma: f32) -> vec2<f32> {
  var luma_sum = 0.0;
  var weight_sum = 0.0;

  for (
    var offset_y: i32 = -GUIDED_RECOVERY_RADIUS;
    offset_y <= GUIDED_RECOVERY_RADIUS;
    offset_y = offset_y + 1
  ) {
    for (
      var offset_x: i32 = -GUIDED_RECOVERY_RADIUS;
      offset_x <= GUIDED_RECOVERY_RADIUS;
      offset_x = offset_x + 1
    ) {
      let offset = vec2<i32>(offset_x, offset_y);
      let neighbor = pixel + offset;
      let color = camera_color_at(neighbor);
      let luma = camera_luma(color);
      let weight = spatial_weight(offset) / (1.0 + abs(luma - center_luma) * 2.0);

      luma_sum = luma_sum + (luma * weight);
      weight_sum = weight_sum + weight;
    }
  }

  if (weight_sum <= GUIDED_RECOVERY_EPSILON) {
    return vec2<f32>(center_luma, 0.0);
  }

  return vec2<f32>(luma_sum / weight_sum, weight_sum);
}

fn recover_highlight_color(pixel: vec2<i32>) -> vec3<f32> {
  let source_color = camera_color_at(pixel);
  let clipped_mask = clipped_mask_at(pixel);

  if (clipped_mask <= 0.001) {
    return source_color;
  }

  let source_luma = camera_luma(source_color);
  let base_luma = local_base_luma(pixel, source_luma).x;
  let luma_detail = source_luma - base_luma;
  let reconstructed_luma = max(base_luma + luma_detail, source_luma);
  let guided_chroma = guided_neighbor_chroma(pixel, source_luma);
  let neighbor_confidence = clamp(guided_chroma.a / 2.0, 0.0, 1.0);
  let neutral_chroma = vec3<f32>(1.0, 1.0, 1.0);
  let recovered_chroma = neutral_chroma + ((guided_chroma.rgb - neutral_chroma) * neighbor_confidence);
  let recovered_color = reconstructed_luma * recovered_chroma;
  let recovery_strength = smoothstep(0.05, 0.9, clipped_mask);

  return source_color + ((recovered_color - source_color) * recovery_strength);
}

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let output_size = textureDimensions(output_texture);

  if (global_id.x >= output_size.x || global_id.y >= output_size.y) {
    return;
  }

  let pixel = vec2<i32>(i32(global_id.x), i32(global_id.y));
  let recovered_color = max(recover_highlight_color(pixel), vec3<f32>(0.0, 0.0, 0.0));

  textureStore(output_texture, pixel, vec4<f32>(recovered_color, 1.0));
}
