
fn camera_to_working_space(camera_color: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    dot(development_parameters.camera_to_working_red.xyz, camera_color),
    dot(development_parameters.camera_to_working_green.xyz, camera_color),
    dot(development_parameters.camera_to_working_blue.xyz, camera_color)
  );
}

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let output_size = textureDimensions(output_texture);

  if (global_id.x >= output_size.x || global_id.y >= output_size.y) {
    return;
  }

  let pixel = vec2<i32>(i32(global_id.x), i32(global_id.y));
  let camera_color = textureLoad(source_texture, pixel, 0).rgb;
  let white_balanced_camera_color = camera_color * development_parameters.white_balance.xyz;
  let working_color = max(
    camera_to_working_space(white_balanced_camera_color),
    vec3<f32>(0.0, 0.0, 0.0)
  );

  textureStore(output_texture, pixel, vec4<f32>(working_color, 1.0));
}
