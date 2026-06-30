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

@group(0) @binding(2)
var<uniform> uTransform: Transform;

// ---------- Texture Bindings ----------
@group(0) @binding(0)
var imageTexture: texture_2d<f32>;

// ---------- Sampler Bindings ----------
@group(0) @binding(1)
var imageSampler: sampler;

// ---------- Constants ----------
const CHECKERBOARD_TILE_SIZE: f32 = 4.0;
const CHECKERBOARD_DARK_TILE: vec3<f32> = vec3<f32>(0.50, 0.50, 0.50);
const CHECKERBOARD_LIGHT_TILE: vec3<f32> = vec3<f32>(0.85, 0.85, 0.85);

// ---------- Vertex Shader ----------
@vertex
fn vs_main(model: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  let transformed = model.position.xy * uTransform.scale + uTransform.offset;

  output.clip_position = vec4<f32>(transformed, model.position.z, 1.0);
  output.texture_coordinates = model.texture_coordinates;

  return output;
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
  let display_color = texture_sample.rgb;
  let tile_checker = checkerboard_tile_color(texture_element);

  if (uTransform.display_checkerboard.x < 0.5) {
    return vec4<f32>(display_color, 1.0);
  }

  let rgb_values = tile_checker * (1.0 - texture_sample.a) + display_color * texture_sample.a;

  return vec4<f32>(rgb_values, 1.0);
}
