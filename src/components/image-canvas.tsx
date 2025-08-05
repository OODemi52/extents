import { useRef, useEffect } from "react";

export function ImageCanvas({
  imageUrl,
  brightness,
  contrast,
}: {
  imageUrl: string;
  brightness: number;
  contrast: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !imageUrl) return;

    const gl = canvas.getContext("webgl");

    if (!gl) {
      console.error("WebGL not supported");

      return;
    }

    const image = new Image();

    image.crossOrigin = "anonymous";
    image.src = imageUrl;

    image.onload = () => {
      // Upload image to GPU
      const texture = gl.createTexture();

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image,
      );

      // Texture settings
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      // Flip the image vertically
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

      drawImage(
        gl,
        texture as WebGLTexture,
        image,
        canvas,
        brightness,
        contrast,
      );
    };
  }, [imageUrl, brightness, contrast]);

  return <canvas ref={canvasRef} height={600} width={800} />;
}

function drawImage(
  gl: WebGLRenderingContext,
  texture: WebGLTexture,
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  brightness: number,
  contrast: number,
) {
  const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
      gl_Position = vec4(a_position, 0, 1);
      v_texCoord = a_texCoord;
    }
  `;

  const fragmentShaderSource = `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      uniform float u_brightness;
      uniform float u_contrast;

      void main() {
        vec4 color = texture2D(u_image, v_texCoord);
        color.rgb += u_brightness;
        color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
        gl_FragColor = color;
      }
    `;

  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram()!;

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Shader program link failed:", gl.getProgramInfoLog(program));

    return;
  }

  gl.useProgram(program);

  // Calculate aspect-corrected quad size
  const imageAspect = image.width / image.height;
  const canvasAspect = canvas.width / canvas.height;

  let drawWidth = 1;
  let drawHeight = 1;

  if (imageAspect > canvasAspect) {
    drawHeight = canvasAspect / imageAspect;
  } else {
    drawWidth = imageAspect / canvasAspect;
  }

  const positions = new Float32Array([
    -drawWidth,
    -drawHeight,
    drawWidth,
    -drawHeight,
    -drawWidth,
    drawHeight,
    -drawWidth,
    drawHeight,
    drawWidth,
    -drawHeight,
    drawWidth,
    drawHeight,
  ]);

  const positionBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const texCoords = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);

  const texCoordBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

  // Attributes
  const posLoc = gl.getAttribLocation(program, "a_position");

  gl.enableVertexAttribArray(posLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const texLoc = gl.getAttribLocation(program, "a_texCoord");

  gl.enableVertexAttribArray(texLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

  const uImageLoc = gl.getUniformLocation(program, "u_image");
  const uBrightnessLoc = gl.getUniformLocation(program, "u_brightness");
  const uContrastLoc = gl.getUniformLocation(program, "u_contrast");

  gl.uniform1i(uImageLoc, 0); // use texture unit 0
  gl.uniform1f(uBrightnessLoc, brightness);
  gl.uniform1f(uContrastLoc, contrast);

  // Draw the quad
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)!;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    throw new Error("Shader compile failed");
  }

  return shader;
}
