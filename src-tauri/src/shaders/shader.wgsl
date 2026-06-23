// ---------- Vertex Structures ----------
struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) texture_coordinates: vec2<f32>,
};

struct VertexOutput {
  @builtin(position) clip_position: vec4<f32>,
  @location(0) texture_coordinates: vec2<f32>,
};

// ---------- Uniforms ----------
struct Transform {
  scale: vec2<f32>,
  offset: vec2<f32>,
  display_checkerboard: vec2<f32>,
};

struct DisplayParameters {
  exposure_ev: f32,
  display_render_intent: u32,
  debug_view: u32,
  _padding: u32,
};

@group(0) @binding(2)
var<uniform> uTransform: Transform;

@group(0) @binding(3)
var<uniform> uDisplayParameters: DisplayParameters;

// ---------- Texture Bindings ----------
@group(0) @binding(0)
var imageTexture: texture_2d<f32>;

// ---------- Sampler Bindings ----------
@group(0) @binding(1)
var imageSampler: sampler;

// ---------- Constants ----------
const DISPLAY_INTENT_DIRECT_SDR: u32 = 0u;
const DISPLAY_INTENT_TONEMAP_TO_SDR: u32 = 1u;
const DEBUG_VIEW_FINAL_DISPLAY: u32 = 0u;
const DEBUG_VIEW_WORKING_LUMINANCE: u32 = 1u;
const DEBUG_VIEW_EXPOSED_LUMINANCE: u32 = 2u;
const DEBUG_VIEW_TONE_MAPPED_LUMINANCE: u32 = 3u;
const DEBUG_VIEW_OUTPUT_LINEAR_SRGB_LUMINANCE: u32 = 4u;
const DEBUG_VIEW_OUT_OF_RANGE_MASK: u32 = 5u;
const DEBUG_VIEW_WORKING_RGB_CHANNELS: u32 = 6u;
const DEBUG_VIEW_EXPOSED_RGB_CHANNELS: u32 = 7u;
const DEBUG_VIEW_DISPLAY_DOMAIN_RGB_CHANNELS: u32 = 8u;
const DEBUG_VIEW_OUTPUT_LINEAR_SRGB_COLOR: u32 = 9u;
const DEBUG_VIEW_FINAL_DISPLAY_NO_TONE_MAP: u32 = 10u;
const DEBUG_VIEW_FINAL_DISPLAY_WITH_OUTPUT_SOFT_CLIP: u32 = 11u;
const CHECKERBOARD_TILE_SIZE: f32 = 4.0;
const CHECKERBOARD_DARK_TILE: vec3<f32> = vec3<f32>(0.50, 0.50, 0.50);
const CHECKERBOARD_LIGHT_TILE: vec3<f32> = vec3<f32>(0.85, 0.85, 0.85);
const OUTPUT_LINEAR_SRGB_SOFT_CLIP_KNEE_START: f32 = 0.90;
const HABLE_A: f32 = 0.15;
const HABLE_B: f32 = 0.50;
const HABLE_C: f32 = 0.10;
const HABLE_D: f32 = 0.20;
const HABLE_E: f32 = 0.02;
const HABLE_F: f32 = 0.30;
const HABLE_WHITE_POINT: f32 = 11.2;

// ---------- Vertex Shader ----------
@vertex
fn vs_main(model: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  let transformed = model.position.xy * uTransform.scale + uTransform.offset;

  output.clip_position = vec4<f32>(transformed, model.position.z, 1.0);
  output.texture_coordinates = model.texture_coordinates;

  return output;
}

// ---------- Working-Space Utility Math ----------
fn rec2020_luminance(color: vec3<f32>) -> f32 {
  return dot(color, vec3<f32>(0.2627, 0.6780, 0.0593));
}

fn hable_tone_map_luminance(luminance: f32) -> f32 {
  return ((luminance * (HABLE_A * luminance + (HABLE_C * HABLE_B))) + (HABLE_D * HABLE_E)) /
      ((luminance * (HABLE_A * luminance + HABLE_B)) + (HABLE_D * HABLE_F)) -
    (HABLE_E / HABLE_F);
}

fn linear_srgb_luminance(color: vec3<f32>) -> f32 {
  return dot(color, vec3<f32>(0.2126, 0.7152, 0.0722));
}

fn linear_rec2020_to_linear_srgb(color: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    (1.6605 * color.r) + (-0.5876 * color.g) + (-0.0728 * color.b),
    (-0.1246 * color.r) + (1.1329 * color.g) + (-0.0083 * color.b),
    (-0.0182 * color.r) + (-0.1006 * color.g) + (1.1187 * color.b)
  );
}

fn apply_exposure(color: vec3<f32>, exposure_ev: f32) -> vec3<f32> {
  return color * exp2(exposure_ev);
}

// ---------- Display-Transform Paths ----------
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

fn apply_soft_knee_to_luminance(luminance: f32, knee_start: f32) -> f32 {
  if (luminance <= knee_start) {
    return luminance;
  }

  let delta = luminance - knee_start;
  let remaining_headroom = 1.0 - knee_start;

  return knee_start + ((remaining_headroom * delta) / (delta + remaining_headroom));
}

fn grayscale_from_luminance(luminance: f32) -> vec3<f32> {
  let clamped_luminance = max(luminance, 0.0);

  return vec3<f32>(clamped_luminance, clamped_luminance, clamped_luminance);
}

fn debug_stage_rgb_channels(color: vec3<f32>) -> vec3<f32> {
  return clamp(color, vec3<f32>(0.0, 0.0, 0.0), vec3<f32>(1.0, 1.0, 1.0));
}

fn apply_direct_sdr_display_transform(color: vec3<f32>) -> vec3<f32> {
  return color;
}

fn apply_scene_to_sdr_display_transform(color: vec3<f32>) -> vec3<f32> {
  return tone_map_scene_color(color);
}

fn apply_display_transform(color: vec3<f32>, display_render_intent: u32) -> vec3<f32> {
  if (display_render_intent == DISPLAY_INTENT_TONEMAP_TO_SDR) {
    return apply_scene_to_sdr_display_transform(color);
  }

  return apply_direct_sdr_display_transform(color);
}

// ---------- Output Conversion ----------
fn working_to_output_linear_srgb(color: vec3<f32>) -> vec3<f32> {
  return linear_rec2020_to_linear_srgb(color);
}

fn soft_clip_output_linear_srgb(color: vec3<f32>) -> vec3<f32> {
  let peak = max(color.r, max(color.g, color.b));

  if (peak <= 1.0) {
    return color;
  }

  let mapped_peak =
    apply_soft_knee_to_luminance(peak, OUTPUT_LINEAR_SRGB_SOFT_CLIP_KNEE_START);
  let scale = mapped_peak / peak;

  return color * scale;
}

fn map_output_linear_srgb_to_display_range(color: vec3<f32>) -> vec3<f32> {
  return clamp_output_linear_srgb_to_display_range(color);
}

fn clamp_output_linear_srgb_to_display_range(color: vec3<f32>) -> vec3<f32> {
  return clamp(color, vec3<f32>(0.0, 0.0, 0.0), vec3<f32>(1.0, 1.0, 1.0));
}

fn output_linear_srgb_out_of_range_mask(color: vec3<f32>) -> vec3<f32> {
  let over_range = max(color - vec3<f32>(1.0, 1.0, 1.0), vec3<f32>(0.0, 0.0, 0.0));
  let under_range = max(-color, vec3<f32>(0.0, 0.0, 0.0));
  let over_strength = min(1.0, max(over_range.r, max(over_range.g, over_range.b)));
  let under_strength = min(1.0, max(under_range.r, max(under_range.g, under_range.b)));

  return vec3<f32>(over_strength, 0.0, under_strength);
}

fn debug_view_color(
  working_color: vec3<f32>,
  exposed_working_color: vec3<f32>,
  display_domain_color: vec3<f32>,
  output_linear_srgb: vec3<f32>,
  final_display_color: vec3<f32>,
  final_display_no_tone_map: vec3<f32>,
  final_display_with_output_soft_clip: vec3<f32>,
  debug_view: u32,
) -> vec3<f32> {
  if (debug_view == DEBUG_VIEW_WORKING_LUMINANCE) {
    return grayscale_from_luminance(rec2020_luminance(working_color));
  }

  if (debug_view == DEBUG_VIEW_EXPOSED_LUMINANCE) {
    return grayscale_from_luminance(rec2020_luminance(exposed_working_color));
  }

  if (debug_view == DEBUG_VIEW_TONE_MAPPED_LUMINANCE) {
    return grayscale_from_luminance(rec2020_luminance(display_domain_color));
  }

  if (debug_view == DEBUG_VIEW_OUTPUT_LINEAR_SRGB_LUMINANCE) {
    return grayscale_from_luminance(linear_srgb_luminance(output_linear_srgb));
  }

  if (debug_view == DEBUG_VIEW_OUT_OF_RANGE_MASK) {
    return output_linear_srgb_out_of_range_mask(output_linear_srgb);
  }

  if (debug_view == DEBUG_VIEW_WORKING_RGB_CHANNELS) {
    return debug_stage_rgb_channels(working_color);
  }

  if (debug_view == DEBUG_VIEW_EXPOSED_RGB_CHANNELS) {
    return debug_stage_rgb_channels(exposed_working_color);
  }

  if (debug_view == DEBUG_VIEW_DISPLAY_DOMAIN_RGB_CHANNELS) {
    return debug_stage_rgb_channels(display_domain_color);
  }

  if (debug_view == DEBUG_VIEW_OUTPUT_LINEAR_SRGB_COLOR) {
    return debug_stage_rgb_channels(output_linear_srgb);
  }

  if (debug_view == DEBUG_VIEW_FINAL_DISPLAY_NO_TONE_MAP) {
    return final_display_no_tone_map;
  }

  if (debug_view == DEBUG_VIEW_FINAL_DISPLAY_WITH_OUTPUT_SOFT_CLIP) {
    return final_display_with_output_soft_clip;
  }

  if (debug_view == DEBUG_VIEW_FINAL_DISPLAY) {
    return final_display_color;
  }

  return final_display_color;
}

// ---------- Checkerboard ----------
fn checkerboard_tile_color(texture_element: vec2<f32>) -> vec3<f32> {
  let checkerboard = vec2<u32>(floor((texture_element * uTransform.scale) / CHECKERBOARD_TILE_SIZE));
  let is_dark_tile = ((checkerboard.x + checkerboard.y) % 2u) == 0u;

  return select(CHECKERBOARD_LIGHT_TILE, CHECKERBOARD_DARK_TILE, is_dark_tile);
}

// ---------- Fragment Shader ----------
@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  let texture_sample = textureSample(imageTexture, imageSampler, input.texture_coordinates);
  let texture_size = vec2<f32>(textureDimensions(imageTexture, 0));
  let texture_element = input.texture_coordinates * texture_size;
  let working_color = texture_sample.rgb;
  let exposed_working_color = apply_exposure(working_color, uDisplayParameters.exposure_ev);
  let display_domain_color =
    apply_display_transform(exposed_working_color, uDisplayParameters.display_render_intent);
  let output_linear_srgb = working_to_output_linear_srgb(display_domain_color);
  let display_color = map_output_linear_srgb_to_display_range(output_linear_srgb);
  let output_linear_srgb_no_tone_map = working_to_output_linear_srgb(exposed_working_color);
  let final_display_no_tone_map =
    map_output_linear_srgb_to_display_range(output_linear_srgb_no_tone_map);
  let final_display_with_output_soft_clip =
    clamp_output_linear_srgb_to_display_range(soft_clip_output_linear_srgb(output_linear_srgb));
  let debug_color =
    debug_view_color(
      working_color,
      exposed_working_color,
      display_domain_color,
      output_linear_srgb,
      display_color,
      final_display_no_tone_map,
      final_display_with_output_soft_clip,
      uDisplayParameters.debug_view,
    );
  let tile_checker = checkerboard_tile_color(texture_element);

  if (uTransform.display_checkerboard.x < 0.5) {
    return vec4<f32>(debug_color, 1.0);
  }

  let rgb_values = tile_checker * (1.0 - texture_sample.a) + debug_color * texture_sample.a;

  return vec4<f32>(rgb_values, 1.0);
}
