import { fogGLSL } from "./common";

export const grassVertexShader = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 2) in vec2 aUv;
layout(location = 3) in vec2 aInstanceXZ;
layout(location = 4) in vec4 aPropsA; // baseY, rotation, height, width
layout(location = 5) in vec4 aPropsB; // jitter, phase, lodFade, variant

uniform mat4 uViewProj;
uniform float uTime;
uniform float uWindStrength;
uniform vec3 uCameraPos;

out vec3 vWorldPos;
out vec2 vUv;
out float vJitter;
out float vLodFade;
out float vVariant;

void main() {
  float v = clamp(aPosition.y, 0.0, 1.0);
  float s = sin(aPropsA.y);
  float c = cos(aPropsA.y);
  vec3 local = vec3(aPosition.x * aPropsA.w, aPosition.y * aPropsA.z, aPosition.z * aPropsA.w);
  float wave = sin(uTime * 1.35 + aPropsB.y + dot(aInstanceXZ, vec2(0.075, 0.046)));
  vec2 windDir = normalize(vec2(0.82, 0.57));
  local.xz += windDir * wave * uWindStrength * v * v;
  local.x += (aPropsB.w - 0.5) * 0.045 * v;

  vec2 fromPlayer = aInstanceXZ - uCameraPos.xz;
  float playerPush = smoothstep(1.7, 0.0, length(fromPlayer));
  if (playerPush > 0.0) {
    local.xz += normalize(fromPlayer + vec2(0.001)) * playerPush * v * v * 0.48;
  }

  vec2 rotated = vec2(local.x * c - local.z * s, local.x * s + local.z * c);
  vWorldPos = vec3(aInstanceXZ.x + rotated.x, aPropsA.x + local.y, aInstanceXZ.y + rotated.y);
  vUv = aUv;
  vJitter = aPropsB.x;
  vLodFade = aPropsB.z;
  vVariant = aPropsB.w;
  gl_Position = uViewProj * vec4(vWorldPos, 1.0);
}`;

export const grassFragmentShader = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec2 vUv;
in float vJitter;
in float vLodFade;
in float vVariant;
out vec4 fragColor;

uniform vec3 uCameraPos;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uFogStart;
uniform float uFogHeightMin;
uniform float uFogHeightMax;
uniform float uFogHeightStrength;
uniform float uAlphaCutoff;
uniform int uDebugMode;

${fogGLSL}

float dither4x4(vec2 p) {
  int x = int(mod(p.x, 4.0));
  int y = int(mod(p.y, 4.0));
  int i = x + y * 4;
  float threshold[16] = float[16](
    0.0, 0.5, 0.125, 0.625,
    0.75, 0.25, 0.875, 0.375,
    0.1875, 0.6875, 0.0625, 0.5625,
    0.9375, 0.4375, 0.8125, 0.3125
  );
  return threshold[i];
}

void main() {
  float blade = smoothstep(0.03, 0.18, vUv.x) * smoothstep(0.97, 0.82, vUv.x);
  float tip = smoothstep(1.0, 0.70, vUv.y);
  float ragged = sin(vUv.y * 24.0 + vWorldPos.x * 5.2 + vWorldPos.z * 3.7 + vVariant * 14.0) * 0.5 + 0.5;
  float chippedSide = smoothstep(0.18, 0.74, ragged + abs(vUv.x - 0.5) * 0.55);
  float alpha = blade * tip * mix(0.80, 1.0, chippedSide);
  if (alpha < uAlphaCutoff || vLodFade < dither4x4(gl_FragCoord.xy)) {
    discard;
  }

  float rootShade = smoothstep(0.72, 0.0, vUv.y);
  float side = abs(vUv.x - 0.5) * 2.0;
  float vein = 1.0 - smoothstep(0.025, 0.18, abs(vUv.x - 0.50));
  float wetNoise = sin(vWorldPos.x * 8.0 + vWorldPos.z * 4.6 + vVariant * 9.0) * 0.5 + 0.5;
  vec3 root = vec3(0.006, 0.026, 0.003);
  vec3 body = vec3(0.040, 0.106, 0.012);
  vec3 tipCol = vec3(0.098, 0.150, 0.022);
  vec3 col = mix(root, mix(body, tipCol, smoothstep(0.45, 1.0, vUv.y)), vUv.y);
  col = mix(col, vec3(0.002, 0.018, 0.002), rootShade * (0.32 + wetNoise * 0.18));
  col = mix(col, vec3(0.010, 0.040, 0.004), vein * (0.20 + rootShade * 0.18));
  col += vec3(0.018, 0.026, 0.002) * side * smoothstep(0.30, 0.94, vUv.y) * (0.28 + vVariant * 0.18);
  col += vJitter * vec3(0.010, 0.009, 0.001);
  float dryEdge = smoothstep(0.68, 0.98, side + vVariant * 0.18) * smoothstep(0.44, 0.94, vUv.y);
  col = mix(col, vec3(0.125, 0.090, 0.018), dryEdge * 0.18);
  col = mix(col, vec3(0.11, 0.010, 0.0), 0.050);
  float fog = redFogAmount(vWorldPos, uCameraPos, uFogDensity, uFogStart, uFogHeightMin, uFogHeightMax, uFogHeightStrength);
  float farField = smoothstep(110.0, 380.0, -vWorldPos.z);
  vec3 grassFog = mix(uFogColor, vec3(0.020, 0.036, 0.004), farField * 0.72);
  col = mix(col, grassFog, fog * 0.58);
  if (uDebugMode == 3) {
    col = mix(vec3(0.0, 0.1, 0.0), vec3(1.0, 0.0, 0.0), 1.0 - vLodFade);
  }
  fragColor = vec4(col, 1.0);
}`;
