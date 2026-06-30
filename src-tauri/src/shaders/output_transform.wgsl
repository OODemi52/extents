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
const DISPLAY_EPSILON: f32 = 0.000001;
const RAW_DISPLAY_BASE_EXPOSURE_EV: f32 = 1.0;

fn rec2020_luminance(color: vec3<f32>) -> f32 {
  return dot(color, vec3<f32>(0.2627, 0.6780, 0.0593));
}

fn linear_srgb_luminance(color: vec3<f32>) -> f32 {
  return dot(color, vec3<f32>(0.2126, 0.7152, 0.0722));
}

fn aces_fitted_tone_curve(value: f32) -> f32 {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;

  return clamp(
    (value * ((a * value) + b)) / ((value * ((c * value) + d)) + e),
    0.0,
    1.0
  );
}

fn tone_map_scene_color(color: vec3<f32>) -> vec3<f32> {
  let scene_luminance = rec2020_luminance(color);

  if (scene_luminance <= DISPLAY_EPSILON) {
    return vec3<f32>(0.0);
  }

  let display_luminance = aces_fitted_tone_curve(scene_luminance);

  return color * (display_luminance / scene_luminance);
}

fn linear_rec2020_to_linear_srgb(color: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    (1.6605 * color.r) + (-0.5876 * color.g) + (-0.0728 * color.b),
    (-0.1246 * color.r) + (1.1329 * color.g) + (-0.0083 * color.b),
    (-0.0182 * color.r) + (-0.1006 * color.g) + (1.1187 * color.b)
  );
}

fn highlight_chroma_rolloff(color: vec3<f32>) -> vec3<f32> {
  let luminance = clamp(linear_srgb_luminance(color), 0.0, 1.0);
  let neutral = vec3<f32>(luminance);
  let strength = smoothstep(0.70, 0.98, luminance) * 0.28;

  return color + ((neutral - color) * strength);
}

fn channel_gamut_scale(channel: f32, luminance: f32) -> f32 {
  if (channel < 0.0) {
    return clamp(luminance / max(luminance - channel, DISPLAY_EPSILON), 0.0, 1.0);
  }

  if (channel > 1.0) {
    return clamp((1.0 - luminance) / max(channel - luminance, DISPLAY_EPSILON), 0.0, 1.0);
  }

  return 1.0;
}

fn compress_linear_srgb_to_display_gamut(color: vec3<f32>) -> vec3<f32> {
  let luminance = clamp(linear_srgb_luminance(color), 0.0, 1.0);
  let neutral = vec3<f32>(luminance);
  let scale = min(
    channel_gamut_scale(color.r, luminance),
    min(
      channel_gamut_scale(color.g, luminance),
      channel_gamut_scale(color.b, luminance)
    )
  );
  let compressed_color = neutral + ((color - neutral) * scale);

  return clamp(compressed_color, vec3<f32>(0.0), vec3<f32>(1.0));
}

fn render_scene_to_display(color: vec3<f32>, display_render_intent: u32) -> vec3<f32> {
  var rendered_rec2020 = max(color, vec3<f32>(0.0));
  var use_photographic_rolloff = false;

  if (display_render_intent == DISPLAY_INTENT_TONEMAP_TO_SDR) {
    rendered_rec2020 *= exp2(RAW_DISPLAY_BASE_EXPOSURE_EV);
    rendered_rec2020 = tone_map_scene_color(rendered_rec2020);
    use_photographic_rolloff = true;
  }

  let rendered_linear_srgb = linear_rec2020_to_linear_srgb(rendered_rec2020);
  var display_linear_srgb = rendered_linear_srgb;

  if (use_photographic_rolloff) {
    display_linear_srgb = highlight_chroma_rolloff(display_linear_srgb);
  }

  return compress_linear_srgb_to_display_gamut(display_linear_srgb);
}

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let output_size = textureDimensions(output_texture);

  if (global_id.x >= output_size.x || global_id.y >= output_size.y) {
    return;
  }

  let pixel = vec2<i32>(i32(global_id.x), i32(global_id.y));
  let source_color = textureLoad(source_texture, pixel, 0);
  let display_color = render_scene_to_display(
    source_color.rgb,
    output_transform_parameters.display.x
  );

  textureStore(output_texture, pixel, vec4<f32>(display_color, source_color.a));
}
