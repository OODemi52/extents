// ---------- Vertex Structures ----------
struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) tex_coords: vec2<f32>,
};

struct VertexOutput {
  @builtin(position) clip_position: vec4<f32>,
  @location(0) tex_coords: vec2<f32>,
};

// ---------- Uniform for Transform (matches Rust's TransformUniforms) ----------
struct Transform {
  scale: vec2<f32>,
  offset: vec2<f32>,
};

@group(0) @binding(2)
var<uniform> uTransform: Transform;

// ---------- Vertex Shader ----------
@vertex
fn vs_main(model: VertexInput) -> VertexOutput {
  var out: VertexOutput;

  // apply zoom (scale) and pan (offset) to XY.
  let transformed = model.position.xy * uTransform.scale + uTransform.offset;

  out.clip_position = vec4<f32>(transformed, model.position.z, 1.0);
  out.tex_coords = model.tex_coords;

  return out;
}

// ---------- Texture & Sampler Bindings (group 0 binding 0 & 1) ----------
@group(0) @binding(0)
var t_diffuse: texture_2d<f32>;
@group(0) @binding(1)
var s_diffuse: sampler;

// ---------- Fragment Shader ----------
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  return textureSample(t_diffuse, s_diffuse, in.tex_coords);
}
