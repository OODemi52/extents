struct DevelopmentParameters {
  cfa_pattern: vec4<u32>,
  black_levels: vec4<f32>,
  white_levels: vec4<f32>,
  white_balance: vec4<f32>,
  camera_to_working_red: vec4<f32>,
  camera_to_working_green: vec4<f32>,
  camera_to_working_blue: vec4<f32>,
};

@group(0) @binding(0)
var source_texture: texture_2d<f32>;

@group(0) @binding(1)
var output_texture: texture_storage_2d<rgba16float, write>;

@group(0) @binding(2)
var<uniform> development_parameters: DevelopmentParameters;
