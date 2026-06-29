
const CFA_COLOR_RED: u32 = 0u;
const CFA_COLOR_GREEN: u32 = 1u;
const CFA_COLOR_BLUE: u32 = 2u;

const RCD_EPSILON: f32 = 0.000001;
const RCD_MAX_COLOR_RATIO: f32 = 8.0;
const DUAL_DEMOSAIC_DETAIL_LOW: f32 = 0.01;
const DUAL_DEMOSAIC_DETAIL_HIGH: f32 = 0.08;

fn clamp_source_pixel(pixel: vec2<i32>) -> vec2<i32> {
  let source_size = textureDimensions(source_texture);
  let max_pixel = vec2<i32>(i32(source_size.x) - 1, i32(source_size.y) - 1);

  return clamp(pixel, vec2<i32>(0, 0), max_pixel);
}

fn raw_cfa_slot(pixel: vec2<i32>) -> u32 {
  let clamped_pixel = clamp_source_pixel(pixel);

  return (u32(clamped_pixel.y % 2) * 2u) + u32(clamped_pixel.x % 2);
}

fn raw_cfa_color_at(pixel: vec2<i32>) -> u32 {
  return development_parameters.cfa_pattern[raw_cfa_slot(pixel)];
}

fn bayer_sample_at(pixel: vec2<i32>) -> f32 {
  return textureLoad(source_texture, clamp_source_pixel(pixel), 0).r;
}

fn clipped_bayer_sample_at(pixel: vec2<i32>) -> f32 {
  return textureLoad(source_texture, clamp_source_pixel(pixel), 0).g;
}

fn is_border_pixel(pixel: vec2<i32>) -> bool {
  let source_size = textureDimensions(source_texture);
  let max_pixel = vec2<i32>(i32(source_size.x) - 1, i32(source_size.y) - 1);

  return pixel.x < 2 || pixel.y < 2 || pixel.x > max_pixel.x - 2 || pixel.y > max_pixel.y - 2;
}

fn gradient_weighted_blend(
  first_value: f32,
  first_gradient: f32,
  second_value: f32,
  second_gradient: f32
) -> f32 {
  let first_weight = 1.0 / (first_gradient + RCD_EPSILON);
  let second_weight = 1.0 / (second_gradient + RCD_EPSILON);

  return ((first_value * first_weight) + (second_value * second_weight))
    / (first_weight + second_weight);
}

fn green_at_red_or_blue(pixel: vec2<i32>) -> f32 {
  let center = bayer_sample_at(pixel);
  let left = bayer_sample_at(pixel + vec2<i32>(-1, 0));
  let right = bayer_sample_at(pixel + vec2<i32>(1, 0));
  let up = bayer_sample_at(pixel + vec2<i32>(0, -1));
  let down = bayer_sample_at(pixel + vec2<i32>(0, 1));
  let left_same_color = bayer_sample_at(pixel + vec2<i32>(-2, 0));
  let right_same_color = bayer_sample_at(pixel + vec2<i32>(2, 0));
  let up_same_color = bayer_sample_at(pixel + vec2<i32>(0, -2));
  let down_same_color = bayer_sample_at(pixel + vec2<i32>(0, 2));

  let horizontal_green = ((left + right) * 0.5)
    + ((2.0 * center - left_same_color - right_same_color) * 0.25);
  let vertical_green = ((up + down) * 0.5)
    + ((2.0 * center - up_same_color - down_same_color) * 0.25);
  let horizontal_gradient = abs(left - right)
    + abs((2.0 * center) - left_same_color - right_same_color);
  let vertical_gradient = abs(up - down)
    + abs((2.0 * center) - up_same_color - down_same_color);

  return max(
    gradient_weighted_blend(
      horizontal_green,
      horizontal_gradient,
      vertical_green,
      vertical_gradient
    ),
    0.0
  );
}

fn green_at(pixel: vec2<i32>) -> f32 {
  if (raw_cfa_color_at(pixel) == CFA_COLOR_GREEN) {
    return bayer_sample_at(pixel);
  }

  return green_at_red_or_blue(pixel);
}

fn color_ratio_at(pixel: vec2<i32>) -> f32 {
  return clamp(
    bayer_sample_at(pixel) / max(green_at(pixel), RCD_EPSILON),
    0.0,
    RCD_MAX_COLOR_RATIO
  );
}

fn interpolate_axis_ratio(
  pixel: vec2<i32>,
  center_green: f32,
  first_offset: vec2<i32>,
  second_offset: vec2<i32>
) -> f32 {
  let first = pixel + first_offset;
  let second = pixel + second_offset;
  let ratio = (color_ratio_at(first) + color_ratio_at(second)) * 0.5;

  return center_green * ratio;
}

fn interpolate_diagonal_ratio(
  pixel: vec2<i32>,
  center_green: f32,
  first_offset: vec2<i32>,
  second_offset: vec2<i32>
) -> vec2<f32> {
  let first = pixel + first_offset;
  let second = pixel + second_offset;
  let first_sample = bayer_sample_at(first);
  let second_sample = bayer_sample_at(second);
  let first_green = green_at(first);
  let second_green = green_at(second);
  let ratio = (color_ratio_at(first) + color_ratio_at(second)) * 0.5;
  let gradient = abs(first_sample - second_sample) + abs(first_green - second_green);

  return vec2<f32>(center_green * ratio, gradient);
}

fn interpolate_diagonal_channel(pixel: vec2<i32>, center_green: f32) -> f32 {
  let descending = interpolate_diagonal_ratio(
    pixel,
    center_green,
    vec2<i32>(-1, -1),
    vec2<i32>(1, 1)
  );
  let ascending = interpolate_diagonal_ratio(
    pixel,
    center_green,
    vec2<i32>(-1, 1),
    vec2<i32>(1, -1)
  );

  return gradient_weighted_blend(descending.x, descending.y, ascending.x, ascending.y);
}

fn demosaic_green_pixel(pixel: vec2<i32>) -> vec3<f32> {
  let center_green = bayer_sample_at(pixel);
  let horizontal_color = raw_cfa_color_at(pixel + vec2<i32>(-1, 0));
  let horizontal_value = interpolate_axis_ratio(
    pixel,
    center_green,
    vec2<i32>(-1, 0),
    vec2<i32>(1, 0)
  );
  let vertical_value = interpolate_axis_ratio(
    pixel,
    center_green,
    vec2<i32>(0, -1),
    vec2<i32>(0, 1)
  );
  var color = vec3<f32>(0.0, center_green, 0.0);

  if (horizontal_color == CFA_COLOR_RED) {
    color.r = horizontal_value;
    color.b = vertical_value;
  } else {
    color.r = vertical_value;
    color.b = horizontal_value;
  }

  return color;
}

fn demosaic_red_or_blue_pixel(pixel: vec2<i32>, source_color: u32) -> vec3<f32> {
  let center_sample = bayer_sample_at(pixel);
  let center_green = green_at_red_or_blue(pixel);
  let diagonal_value = interpolate_diagonal_channel(pixel, center_green);

  if (source_color == CFA_COLOR_RED) {
    return vec3<f32>(center_sample, center_green, diagonal_value);
  }

  return vec3<f32>(diagonal_value, center_green, center_sample);
}

fn smooth_green_at_red_or_blue(pixel: vec2<i32>) -> f32 {
  let center = bayer_sample_at(pixel);
  let left = bayer_sample_at(pixel + vec2<i32>(-1, 0));
  let right = bayer_sample_at(pixel + vec2<i32>(1, 0));
  let up = bayer_sample_at(pixel + vec2<i32>(0, -1));
  let down = bayer_sample_at(pixel + vec2<i32>(0, 1));
  let left_same_color = bayer_sample_at(pixel + vec2<i32>(-2, 0));
  let right_same_color = bayer_sample_at(pixel + vec2<i32>(2, 0));
  let up_same_color = bayer_sample_at(pixel + vec2<i32>(0, -2));
  let down_same_color = bayer_sample_at(pixel + vec2<i32>(0, 2));

  let green = (
    (2.0 * (left + right + up + down))
    + (4.0 * center)
    - left_same_color
    - right_same_color
    - up_same_color
    - down_same_color
  ) * 0.125;

  return max(green, 0.0);
}

fn smooth_green_at(pixel: vec2<i32>) -> f32 {
  if (raw_cfa_color_at(pixel) == CFA_COLOR_GREEN) {
    return bayer_sample_at(pixel);
  }

  return smooth_green_at_red_or_blue(pixel);
}

fn smooth_axis_channel(
  pixel: vec2<i32>,
  center_green: f32,
  first_offset: vec2<i32>,
  second_offset: vec2<i32>
) -> f32 {
  let first = pixel + first_offset;
  let second = pixel + second_offset;
  let first_difference = bayer_sample_at(first) - smooth_green_at(first);
  let second_difference = bayer_sample_at(second) - smooth_green_at(second);

  return max(center_green + ((first_difference + second_difference) * 0.5), 0.0);
}

fn smooth_diagonal_channel(pixel: vec2<i32>, center_green: f32) -> f32 {
  let top_left = pixel + vec2<i32>(-1, -1);
  let top_right = pixel + vec2<i32>(1, -1);
  let bottom_left = pixel + vec2<i32>(-1, 1);
  let bottom_right = pixel + vec2<i32>(1, 1);
  let color_difference = (
    (bayer_sample_at(top_left) - smooth_green_at(top_left))
    + (bayer_sample_at(top_right) - smooth_green_at(top_right))
    + (bayer_sample_at(bottom_left) - smooth_green_at(bottom_left))
    + (bayer_sample_at(bottom_right) - smooth_green_at(bottom_right))
  ) * 0.25;

  return max(center_green + color_difference, 0.0);
}

fn smooth_demosaic_green_pixel(pixel: vec2<i32>) -> vec3<f32> {
  let center_green = bayer_sample_at(pixel);
  let horizontal_color = raw_cfa_color_at(pixel + vec2<i32>(-1, 0));
  let horizontal_value = smooth_axis_channel(
    pixel,
    center_green,
    vec2<i32>(-1, 0),
    vec2<i32>(1, 0)
  );
  let vertical_value = smooth_axis_channel(
    pixel,
    center_green,
    vec2<i32>(0, -1),
    vec2<i32>(0, 1)
  );
  var color = vec3<f32>(0.0, center_green, 0.0);

  if (horizontal_color == CFA_COLOR_RED) {
    color.r = horizontal_value;
    color.b = vertical_value;
  } else {
    color.r = vertical_value;
    color.b = horizontal_value;
  }

  return color;
}

fn smooth_demosaic_red_or_blue_pixel(pixel: vec2<i32>, source_color: u32) -> vec3<f32> {
  let center_sample = bayer_sample_at(pixel);
  let center_green = smooth_green_at_red_or_blue(pixel);
  let diagonal_value = smooth_diagonal_channel(pixel, center_green);

  if (source_color == CFA_COLOR_RED) {
    return vec3<f32>(center_sample, center_green, diagonal_value);
  }

  return vec3<f32>(diagonal_value, center_green, center_sample);
}

fn smooth_demosaic_raw_bayer_2x2(pixel: vec2<i32>) -> vec3<f32> {
  let source_color = raw_cfa_color_at(pixel);

  if (source_color == CFA_COLOR_GREEN) {
    return smooth_demosaic_green_pixel(pixel);
  }

  return smooth_demosaic_red_or_blue_pixel(pixel, source_color);
}

fn local_detail_change_at(pixel: vec2<i32>) -> f32 {
  let center = bayer_sample_at(pixel);
  let left = bayer_sample_at(pixel + vec2<i32>(-1, 0));
  let right = bayer_sample_at(pixel + vec2<i32>(1, 0));
  let up = bayer_sample_at(pixel + vec2<i32>(0, -1));
  let down = bayer_sample_at(pixel + vec2<i32>(0, 1));
  let axis_change = max(abs(left - right), abs(up - down));
  let center_change = (
    abs(center - left)
    + abs(center - right)
    + abs(center - up)
    + abs(center - down)
  ) * 0.25;

  return max(axis_change, center_change);
}

fn local_detail_mask_at(pixel: vec2<i32>) -> f32 {
  return smoothstep(
    DUAL_DEMOSAIC_DETAIL_LOW,
    DUAL_DEMOSAIC_DETAIL_HIGH,
    local_detail_change_at(pixel)
  );
}

fn weighted_clipped_mask_at(pixel: vec2<i32>) -> f32 {
  let clipped_weighted_sum =
    (clipped_bayer_sample_at(pixel) * 4.0)
    + ((clipped_bayer_sample_at(pixel + vec2<i32>(-1, 0))
      + clipped_bayer_sample_at(pixel + vec2<i32>(1, 0))
      + clipped_bayer_sample_at(pixel + vec2<i32>(0, -1))
      + clipped_bayer_sample_at(pixel + vec2<i32>(0, 1))) * 2.0)
    + clipped_bayer_sample_at(pixel + vec2<i32>(-1, -1))
    + clipped_bayer_sample_at(pixel + vec2<i32>(1, -1))
    + clipped_bayer_sample_at(pixel + vec2<i32>(-1, 1))
    + clipped_bayer_sample_at(pixel + vec2<i32>(1, 1));

  return clipped_weighted_sum / 16.0;
}

fn weighted_dual_demosaic_mask(pixel: vec2<i32>) -> f32 {
  let detail_weighted_sum =
    (local_detail_mask_at(pixel) * 4.0)
    + ((local_detail_mask_at(pixel + vec2<i32>(-1, 0))
      + local_detail_mask_at(pixel + vec2<i32>(1, 0))
      + local_detail_mask_at(pixel + vec2<i32>(0, -1))
      + local_detail_mask_at(pixel + vec2<i32>(0, 1))) * 2.0)
    + local_detail_mask_at(pixel + vec2<i32>(-1, -1))
    + local_detail_mask_at(pixel + vec2<i32>(1, -1))
    + local_detail_mask_at(pixel + vec2<i32>(-1, 1))
    + local_detail_mask_at(pixel + vec2<i32>(1, 1));
  let detail_mask = detail_weighted_sum / 16.0;
  let clipped_mask = weighted_clipped_mask_at(pixel);

  return clamp(detail_mask * (1.0 - (0.6 * clipped_mask)), 0.0, 1.0);
}

fn demosaic_border_pixel(pixel: vec2<i32>) -> vec3<f32> {
  var sums = vec3<f32>(0.0, 0.0, 0.0);
  var counts = vec3<f32>(0.0, 0.0, 0.0);

  for (var offset_y: i32 = -1; offset_y <= 1; offset_y = offset_y + 1) {
    for (var offset_x: i32 = -1; offset_x <= 1; offset_x = offset_x + 1) {
      let neighbor = pixel + vec2<i32>(offset_x, offset_y);
      let sample = bayer_sample_at(neighbor);
      let color = raw_cfa_color_at(neighbor);

      if (color == CFA_COLOR_RED) {
        sums.r = sums.r + sample;
        counts.r = counts.r + 1.0;
      } else if (color == CFA_COLOR_GREEN) {
        sums.g = sums.g + sample;
        counts.g = counts.g + 1.0;
      } else if (color == CFA_COLOR_BLUE) {
        sums.b = sums.b + sample;
        counts.b = counts.b + 1.0;
      }
    }
  }

  return sums / max(counts, vec3<f32>(1.0, 1.0, 1.0));
}

fn demosaic_raw_bayer_2x2(pixel: vec2<i32>) -> vec3<f32> {
  if (is_border_pixel(pixel)) {
    return demosaic_border_pixel(pixel);
  }

  let source_color = raw_cfa_color_at(pixel);

  if (source_color == CFA_COLOR_GREEN) {
    return demosaic_green_pixel(pixel);
  }

  return demosaic_red_or_blue_pixel(pixel, source_color);
}

fn dual_demosaic_raw_bayer_2x2(pixel: vec2<i32>) -> vec3<f32> {
  if (is_border_pixel(pixel)) {
    return demosaic_border_pixel(pixel);
  }

  let rcd_color = demosaic_raw_bayer_2x2(pixel);
  let smooth_color = smooth_demosaic_raw_bayer_2x2(pixel);
  let detail_mask = weighted_dual_demosaic_mask(pixel);

  return smooth_color + ((rcd_color - smooth_color) * detail_mask);
}

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let output_size = textureDimensions(output_texture);

  if (global_id.x >= output_size.x || global_id.y >= output_size.y) {
    return;
  }

  let pixel = vec2<i32>(i32(global_id.x), i32(global_id.y));
  let camera_color = max(dual_demosaic_raw_bayer_2x2(pixel), vec3<f32>(0.0, 0.0, 0.0));
  let clipped_mask = weighted_clipped_mask_at(pixel);

  textureStore(output_texture, pixel, vec4<f32>(camera_color, clipped_mask));
}
