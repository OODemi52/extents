struct AdjustmentParameters {
  exposure: vec4<f32>,
};

@group(0) @binding(0)
var source_texture: texture_2d<f32>;

@group(0) @binding(1)
var output_texture: texture_storage_2d<rgba32float, write>;

@group(0) @binding(2)
var<uniform> adjustment_parameters: AdjustmentParameters;

fn apply_exposure(color: vec3<f32>, exposure_ev: f32) -> vec3<f32> {
  return color * exp2(exposure_ev);
}

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let output_size = textureDimensions(output_texture);

  if (global_id.x >= output_size.x || global_id.y >= output_size.y) {
    return;
  }

  let pixel = vec2<i32>(i32(global_id.x), i32(global_id.y));
  let source_color = textureLoad(source_texture, pixel, 0);
  let adjusted_color = apply_exposure(source_color.rgb, adjustment_parameters.exposure.x);

  textureStore(output_texture, pixel, vec4<f32>(adjusted_color, source_color.a));
}
