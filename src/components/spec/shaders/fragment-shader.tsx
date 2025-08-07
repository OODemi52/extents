export const fragmentShader = `
uniform float u_red;
uniform float u_blue;
uniform float u_green;

void main() {
  gl_FragColor = vec4(vec3(u_red, u_green, u_blue), 0);
}
`;
