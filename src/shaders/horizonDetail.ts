import { fogGLSL, noiseGLSL } from "./common";

export const horizonDetailVertexShader = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 2) in vec2 aUv;

uniform mat4 uViewProj;

out vec3 vWorldPos;
out vec2 vUv;

void main() {
  vWorldPos = aPosition;
  vUv = aUv;
  gl_Position = uViewProj * vec4(aPosition, 1.0);
}`;

export const horizonDetailFragmentShader = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec2 vUv;
out vec4 fragColor;

uniform vec3 uCameraPos;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uFogStart;
uniform float uFogHeightMin;
uniform float uFogHeightMax;
uniform float uFogHeightStrength;
uniform int uDebugMode;

${fogGLSL}
${noiseGLSL}

void main() {
  float fog = redFogAmount(vWorldPos, uCameraPos, uFogDensity, uFogStart, uFogHeightMin, uFogHeightMax, uFogHeightStrength);
  float grain = hash12(floor(vWorldPos.xz * 2.6) + floor(vWorldPos.yy * 9.0));
  float veilNoise = fbm(vec2(vWorldPos.x * 0.010, vWorldPos.y * 0.080 + vWorldPos.z * 0.0015));
  float atmosphericGrain = hash12(floor(vWorldPos.xz * 0.075) + floor(vWorldPos.yy * 0.24));
  float atmosphericVeil = fbm(vec2(vWorldPos.x * 0.020 + vWorldPos.z * 0.004, vWorldPos.y * 0.030 + vWorldPos.z * 0.007));
  float horizonDistance = smoothstep(520.0, 1420.0, -vWorldPos.z);
  float horizontalFeather = 1.0 - smoothstep(4400.0, 6100.0, abs(vWorldPos.x));
  float lowBand = smoothstep(-18.0, 5.0, vWorldPos.y) * smoothstep(118.0, 48.0, vWorldPos.y);
  float verticalFeather = smoothstep(0.30, 0.92, vUv.y);
  float broken = smoothstep(0.46, 0.92, veilNoise * 0.68 + grain * 0.32);
  vec3 col = mix(vec3(0.010, 0.0, 0.0), vec3(0.040, 0.0, 0.0), fog * 0.20 + horizonDistance * 0.12 + broken * 0.10);
  float alpha = (0.030 + broken * 0.105 + fog * 0.025) * horizonDistance * lowBand * verticalFeather;
  alpha *= smoothstep(0.012, 0.045, alpha);
  float seamCover = smoothstep(0.30, 0.02, vUv.y) * horizonDistance * smoothstep(-34.0, -3.0, vWorldPos.y) * smoothstep(18.0, 6.0, vWorldPos.y);
  col = mix(col, vec3(0.0, 0.001, 0.0), seamCover);
  alpha = max(alpha, seamCover * 0.32);
  float ridgeShape = smoothstep(0.06, 0.24, vUv.y) * smoothstep(1.10, 0.82, vUv.y);
  float ridgeBreakup = 0.78 + smoothstep(0.32, 0.78, veilNoise * 0.58 + grain * 0.16) * 0.22;
  float ridgeSilhouette = ridgeShape * horizonDistance * lowBand * ridgeBreakup;
  col = mix(col, vec3(0.0), ridgeSilhouette * 0.78);
  alpha = max(alpha, ridgeSilhouette * 0.68);
  float redDust = horizonDistance * lowBand * smoothstep(0.26, 0.82, atmosphericVeil * 0.72 + atmosphericGrain * 0.28);
  col = mix(col, vec3(0.050, 0.001, 0.0), redDust * 0.34);
  alpha = max(alpha, redDust * 0.18);
  if (uDebugMode == 1) {
    col = vec3(fog, fog * 0.1, 0.0);
    alpha = 0.55;
  }
  col = mix(uFogColor * 0.10, col, horizontalFeather);
  alpha *= horizontalFeather;
  fragColor = vec4(col, alpha);
}`;
