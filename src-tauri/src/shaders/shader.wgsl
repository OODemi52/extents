// ---------- Vertex Structures ----------
struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) texture_coordinates: vec2<f32>,
};

struct VertexOutput {
  @builtin(position) clip_position: vec4<f32>,
  @location(0) texture_coordinates: vec2<f32>,
};

// ---------- Uniform for Transform (matches Rust's TransformUniforms) ----------
struct Transform {
  scale: vec2<f32>,
  offset: vec2<f32>,
  display_checkerboard: vec2<f32>,
};

struct DisplayParams {
  exposure_ev: f32,
  display_render_intent: u32,
  _padding: vec2<u32>,
};

@group(0) @binding(2)
var<uniform> uTransform: Transform;

@group(0) @binding(3)
var<uniform> uDisplayParams: DisplayParams;

// ---------- Vertex Shader ----------
@vertex
fn vs_main(model: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  // Zoom (scale) and pan (offset) applied to XY.
  let transformed = model.position.xy * uTransform.scale + uTransform.offset;

  output.clip_position = vec4<f32>(transformed, model.position.z, 1.0);
  output.texture_coordinates = model.texture_coordinates;

  return output;
}

// ---------- Texture Bindings ----------
@group(0) @binding(0)
var imageTexture: texture_2d<f32>;

// ---------- Sampler Bindings ----------
@group(0) @binding(1)
var imageSampler: sampler;

fn rec2020_luminance(color: vec3<f32>) -> f32 {
  return dot(color, vec3<f32>(0.2627, 0.6780, 0.0593));
}

fn reinhard_tone_map_luminance(luminance: f32) -> f32 {
  return luminance / (1.0 + luminance);
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

fn tone_map_scene_color(color: vec3<f32>) -> vec3<f32> {
  let scene_luminance = rec2020_luminance(color);

  if (scene_luminance <= 0.0) {
    return vec3<f32>(0.0, 0.0, 0.0);
  }

  let mapped_luminance = reinhard_tone_map_luminance(scene_luminance);
  let scale = mapped_luminance / scene_luminance;

  return color * scale;
}

fn map_working_color_to_display(color: vec3<f32>, display_render_intent: u32) -> vec3<f32> {
  var display_domain = color;

  if (display_render_intent == 1u) {
    display_domain = tone_map_scene_color(color);
  }

  return clamp(
    linear_rec2020_to_linear_srgb(display_domain),
    vec3<f32>(0.0, 0.0, 0.0),
    vec3<f32>(1.0, 1.0, 1.0)
  );
}

// ---------- Fragment Shader ----------
@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  let texture_sample = textureSample(imageTexture, imageSampler, input.texture_coordinates);
  let texture_size = vec2<f32>(textureDimensions(imageTexture, 0));
  let texture_element = input.texture_coordinates * texture_size;
  let working_color = apply_exposure(texture_sample.rgb, uDisplayParams.exposure_ev);
  let display_color =
    map_working_color_to_display(working_color, uDisplayParams.display_render_intent);

  let checkboard_tile_size = 4.0; // Pixels
  let checkboard = vec2<u32>(floor((texture_element * uTransform.scale) / checkboard_tile_size));

  let dark_tile = vec3<f32>(0.50, 0.50, 0.50);
  let light_tile = vec3<f32>(0.85, 0.85, 0.85);
  let is_dark_tile = ((checkboard.x + checkboard.y) % 2u) == 0u;

  let tile_checker = select(light_tile, dark_tile, is_dark_tile);

  if (uTransform.display_checkerboard.x < 0.5) {
    return vec4<f32>(display_color, 1.0);
  }

  let rgb_values = tile_checker * (1.0 - texture_sample.a) + display_color * texture_sample.a;

  return vec4<f32>(rgb_values, 1.0);
}
