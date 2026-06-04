import { fogGLSL, noiseGLSL } from "./common";

export const fieldClumpVertexShader = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 2) in vec2 aUv;
layout(location = 3) in vec4 aInstanceA; // x, z, y, rotation
layout(location = 4) in vec4 aInstanceB; // width, height, density, phase

uniform mat4 uViewProj;
uniform float uTime;

out vec3 vWorldPos;
out vec2 vUv;
out vec3 vLocalPos;
out float vDensity;
out float vPhase;

void main() {
  float s = sin(aInstanceA.w);
  float c = cos(aInstanceA.w);
  vec3 local = vec3(aPosition.x * aInstanceB.x, aPosition.y * aInstanceB.y, aPosition.z * aInstanceB.x);
  float sway = sin(uTime * 0.44 + aInstanceB.w + aPosition.y * 2.2) * 0.028 * aPosition.y * aPosition.y;
  vec2 rotated = vec2(local.x * c - local.z * s, local.x * s + local.z * c);
  vec2 windDir = normalize(vec2(-1.0, 0.10));
  rotated += windDir * sway * aInstanceB.y;
  vWorldPos = vec3(aInstanceA.x + rotated.x, aInstanceA.z + local.y, aInstanceA.y + rotated.y);
  vUv = aUv;
  vLocalPos = aPosition;
  vDensity = aInstanceB.z;
  vPhase = aInstanceB.w;
  gl_Position = uViewProj * vec4(vWorldPos, 1.0);
}`;

export const fieldClumpFragmentShader = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec2 vUv;
in vec3 vLocalPos;
in float vDensity;
in float vPhase;
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
  float edge = smoothstep(0.015, 0.20, vUv.x) * smoothstep(0.985, 0.78, vUv.x);
  float top = smoothstep(1.02, 0.64, vUv.y);
  float ragged = fbm(vec2(vUv.x * 7.0 + vPhase, vUv.y * 9.5 + vWorldPos.x * 0.05));
  float verticalCuts = smoothstep(0.48, 0.88, sin(vUv.x * 36.0 + ragged * 7.0 + vPhase) * 0.5 + 0.5);
  float reedLines = smoothstep(0.62, 0.92, sin(vUv.x * 74.0 + ragged * 6.0 + vPhase * 1.6) * 0.5 + 0.5);
  float depth = max(0.0, -vWorldPos.z);
  float foreground = 1.0 - smoothstep(68.0, 210.0, depth);
  float horizonBand = smoothstep(300.0, 620.0, depth);
  float alpha = edge * top * mix(0.60, 1.0, vDensity) * (0.66 + verticalCuts * 0.34);
  alpha *= smoothstep(0.18, 0.72, ragged + (1.0 - vUv.y) * 0.42);
  alpha *= 0.76 + reedLines * 0.24 + foreground * 0.12;
  alpha *= mix(1.0, 0.92, horizonBand);
  if (alpha < 0.22) {
    discard;
  }

  float rootShade = smoothstep(1.0, 0.0, vUv.y);
  float bladePepper = smoothstep(0.55, 0.92, ragged * 0.72 + verticalCuts * 0.26);
  vec3 col = mix(vec3(0.100, 0.190, 0.038), vec3(0.070, 0.130, 0.026), rootShade * 0.52);
  col = mix(col, vec3(0.064, 0.124, 0.022), verticalCuts * vDensity * (0.06 + foreground * 0.04));
  col = mix(col, vec3(0.072, 0.138, 0.026), horizonBand * (0.12 + bladePepper * 0.05));
  col += vec3(0.052, 0.092, 0.010) * ragged * 0.070;
  col += vec3(0.035, 0.054, 0.006) * reedLines * foreground * 0.050;
  col = mix(col, vec3(0.185, 0.164, 0.046), bladePepper * smoothstep(0.48, 1.0, vUv.y) * 0.135);
  float fog = redFogAmount(vWorldPos, uCameraPos, uFogDensity, uFogStart, uFogHeightMin, uFogHeightMax, uFogHeightStrength);
  vec3 clumpFog = mix(uFogColor, vec3(0.068, 0.128, 0.022), smoothstep(80.0, 460.0, depth) * 0.92);
  col = mix(col, clumpFog, fog * 0.18);
  if (uDebugMode == 3) {
    col = vec3(0.0, vDensity * 0.18, 0.0);
  }
  fragColor = vec4(col, alpha * (0.48 + vDensity * 0.32) * mix(1.0, 0.94, horizonBand));
}`;
