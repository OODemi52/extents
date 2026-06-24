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
  display: vec4<u32>,
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
const CHECKERBOARD_TILE_SIZE: f32 = 4.0;
const CHECKERBOARD_DARK_TILE: vec3<f32> = vec3<f32>(0.50, 0.50, 0.50);
const CHECKERBOARD_LIGHT_TILE: vec3<f32> = vec3<f32>(0.85, 0.85, 0.85);
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

fn linear_rec2020_to_linear_srgb(color: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(
    (1.6605 * color.r) + (-0.5876 * color.g) + (-0.0728 * color.b),
    (-0.1246 * color.r) + (1.1329 * color.g) + (-0.0083 * color.b),
    (-0.0182 * color.r) + (-0.1006 * color.g) + (1.1187 * color.b)
  );
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

fn map_output_linear_srgb_to_display_range(color: vec3<f32>) -> vec3<f32> {
  return clamp_output_linear_srgb_to_display_range(color);
}

fn clamp_output_linear_srgb_to_display_range(color: vec3<f32>) -> vec3<f32> {
  return clamp(color, vec3<f32>(0.0, 0.0, 0.0), vec3<f32>(1.0, 1.0, 1.0));
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
  let display_domain_color =
    apply_display_transform(working_color, uDisplayParameters.display.x);
  let output_linear_srgb = working_to_output_linear_srgb(display_domain_color);
  let display_color = map_output_linear_srgb_to_display_range(output_linear_srgb);
  let tile_checker = checkerboard_tile_color(texture_element);

  if (uTransform.display_checkerboard.x < 0.5) {
    return vec4<f32>(display_color, 1.0);
  }

  let rgb_values = tile_checker * (1.0 - texture_sample.a) + display_color * texture_sample.a;

  return vec4<f32>(rgb_values, 1.0);
}
