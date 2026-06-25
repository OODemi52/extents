struct OutputTransformParameters {
  display: vec4<u32>,
};

@group(0) @binding(0)
var source_texture: texture_2d<f32>;

@group(0) @binding(1)
var output_texture: texture_storage_2d<rgba16float, write>;

@group(0) @binding(2)
var<uniform> output_transform_parameters: OutputTransformParameters;

const DISPLAY_INTENT_TONEMAP_TO_SDR: u32 = 1u;
const HABLE_A: f32 = 0.15;
const HABLE_B: f32 = 0.50;
const HABLE_C: f32 = 0.10;
const HABLE_D: f32 = 0.20;
const HABLE_E: f32 = 0.02;
const HABLE_F: f32 = 0.30;
const HABLE_WHITE_POINT: f32 = 11.2;

fn rec2020_luminance(color: vec3<f32>) -> f32 {
  return dot(color, vec3<f32>(0.2627, 0.6780, 0.0593));
}

fn hable_tone_map_luminance(luminance: f32) -> f32 {
  return ((luminance * (HABLE_A * luminance + (HABLE_C * HABLE_B))) + (HABLE_D * HABLE_E)) /
      ((luminance * (HABLE_A * luminance + HABLE_B)) + (HABLE_D * HABLE_F)) -
    (HABLE_E / HABLE_F);
}

fn tone_map_scene_color(color: vec3<f32>) -> vec3<f32> {
  let scene_luminance = rec2020_luminance(color);

  if (scene_luminance <= 0.0) {
    return vec3<f32>(0.0, 0.0, 0.0);
  }

  let white_scale = 1.0 / hable_tone_map_luminance(HABLE_WHITE_POINT);
  let mapped_luminance = hable_tone_map_luminance(scene_luminance) * white_scale;
  let scale = mapped_luminance / scene_luminance;

  return color * scale;
}

fn apply_display_transform(color: vec3<f32>, display_render_intent: u32) -> vec3<f32> {
  if (display_render_intent == DISPLAY_INTENT_TONEMAP_TO_SDR) {
    return tone_map_scene_color(color);
  }

  return color;
}

fn linear_rec2020_to_linear_srgb(color: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    (1.6605 * color.r) + (-0.5876 * color.g) + (-0.0728 * color.b),
    (-0.1246 * color.r) + (1.1329 * color.g) + (-0.0083 * color.b),
    (-0.0182 * color.r) + (-0.1006 * color.g) + (1.1187 * color.b)
  );
}

fn clamp_output_linear_srgb_to_display_range(color: vec3<f32>) -> vec3<f32> {
  return clamp(color, vec3<f32>(0.0, 0.0, 0.0), vec3<f32>(1.0, 1.0, 1.0));
}

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let output_size = textureDimensions(output_texture);

  if (global_id.x >= output_size.x || global_id.y >= output_size.y) {
    return;
  }

  let pixel = vec2<i32>(i32(global_id.x), i32(global_id.y));
  let source_color = textureLoad(source_texture, pixel, 0);
  let display_domain_color =
    apply_display_transform(source_color.rgb, output_transform_parameters.display.x);
  let output_linear_srgb = linear_rec2020_to_linear_srgb(display_domain_color);
  let display_color = clamp_output_linear_srgb_to_display_range(output_linear_srgb);

  textureStore(output_texture, pixel, vec4<f32>(display_color, source_color.a));
}
