
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

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let output_size = textureDimensions(output_texture);

  if (global_id.x >= output_size.x || global_id.y >= output_size.y) {
    return;
  }

  let pixel = vec2<i32>(i32(global_id.x), i32(global_id.y));
  let source_color = textureLoad(source_texture, pixel, 0);
  let linear_srgb = srgb_to_linear_srgb(source_color.rgb);
  let working_color = linear_srgb_to_linear_rec2020(linear_srgb);

  textureStore(output_texture, pixel, vec4<f32>(working_color, source_color.a));
}
