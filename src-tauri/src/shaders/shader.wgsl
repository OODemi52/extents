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

@group(0) @binding(2)
var<uniform> uTransform: Transform;

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

// ---------- Fragment Shader ----------
@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {

  let texture_sample = textureSample(imageTexture, imageSampler, input.texture_coordinates);
  let texture_size = vec2<f32>(textureDimensions(imageTexture, 0));
  let texture_element = input.texture_coordinates * texture_size;

  let checkboard_tile_size = 4.0; // Pixels
  let checkboard = vec2<u32>(floor((texture_element * uTransform.scale) / checkboard_tile_size));

  let dark_tile = vec3<f32>(0.50, 0.50, 0.50);
  let light_tile = vec3<f32>(0.85, 0.85, 0.85);
  let is_dark_tile = ((checkboard.x + checkboard.y) % 2u) == 0u;

  let tile_checker = select(light_tile, dark_tile, is_dark_tile);

  if (uTransform.display_checkerboard.x < 0.5) {
    return vec4<f32>(texture_sample.rgb, 1.0);
  }

  let rgb_values = tile_checker * (1.0 - texture_sample.a) + texture_sample.rgb * texture_sample.a;

  return vec4<f32>(rgb_values, 1.0);
}
