import { fogGLSL, noiseGLSL } from "./common";

export const mountainVertexShader = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;

uniform mat4 uViewProj;

out vec3 vWorldPos;
out vec3 vNormal;
out vec2 vUv;

void main() {
  vWorldPos = aPosition;
  vNormal = aNormal;
  vUv = aUv;
  gl_Position = uViewProj * vec4(aPosition, 1.0);
}`;

export const mountainFragmentShader = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vNormal;
in vec2 vUv;
out vec4 fragColor;

uniform vec3 uCameraPos;
uniform vec3 uBaseColor;
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
  float slopeShade = clamp(dot(normalize(vNormal), normalize(vec3(-0.25, 0.72, 0.38))) * 0.5 + 0.5, 0.0, 1.0);
  float ridge = smoothstep(-8.0, 18.0, vWorldPos.y);
  float crown = smoothstep(0.46, 0.98, vUv.y) * smoothstep(-4.0, 18.0, vWorldPos.y);
  float face = 1.0 - smoothstep(-24.0, -7.0, vWorldPos.y);
  float distanceToCamera = distance(vWorldPos, uCameraPos);
  float distanceFade = smoothstep(3200.0, 7600.0, distanceToCamera);
  float farHaze = smoothstep(5600.0, 9800.0, distanceToCamera);
  vec3 base = mix(vec3(0.0), uBaseColor, distanceFade * 0.55);
  vec3 rim = vec3(0.004, 0.0, 0.0) * crown * slopeShade * distanceFade * 0.035;
  vec3 col = base + rim;
  col *= 1.0 - face * 0.18;
  col = mix(col, vec3(0.002, 0.0, 0.0), farHaze * ridge * 0.04);
  col = mix(col, vec3(0.001, 0.0, 0.0), fog * ridge * 0.010);
  float sideFeather = smoothstep(0.0, 0.30, vUv.x) * smoothstep(1.0, 0.70, vUv.x);
  float ridgeNoise = fbm(vec2(vWorldPos.x * 0.010 + vUv.x * 1.8, vWorldPos.y * 0.120));
  float grain = hash12(floor(gl_FragCoord.xy * 0.72) + floor(vWorldPos.xz * 0.018));
  float upperRidge = smoothstep(-6.0, 16.0, vWorldPos.y);
  float brokenMist = smoothstep(0.26, 0.86, ridgeNoise * 0.72 + grain * 0.28);
  float edgeVeil = crown * upperRidge * (0.50 + brokenMist * 0.50) * (0.74 + farHaze * 0.26);
  col = mix(col, vec3(0.008, 0.0, 0.0), edgeVeil * 0.12);
  col += vec3(0.002, 0.0, 0.0) * grain * edgeVeil * 0.04;
  float skirtFeather = smoothstep(-17.0, -7.0, vWorldPos.y);
  col = mix(uFogColor * 0.10, col, skirtFeather);
  float alpha = mix(1.0, 0.90 + brokenMist * 0.08, edgeVeil * 0.20);
  alpha = mix(alpha, 0.92 + brokenMist * 0.06, farHaze * crown * 0.10);
  alpha *= mix(0.28, 1.0, skirtFeather);
  if (uDebugMode == 1) {
    col = vec3(fog, fog * 0.12, 0.0);
    alpha = 1.0;
  }
  col = mix(uFogColor * 0.14, col, sideFeather);
  alpha *= smoothstep(0.0, 0.62, sideFeather);
  fragColor = vec4(col, alpha);
}`;
