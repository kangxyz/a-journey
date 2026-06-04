import { fogGLSL, noiseGLSL } from "./common";

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
out float vDensity;
out float vWindShade;

void main() {
  float v = clamp(aPosition.y, 0.0, 1.0);
  float s = sin(aPropsA.y);
  float c = cos(aPropsA.y);
  float lodShape = smoothstep(0.10, 0.86, aPropsB.z);
  float lodHeight = mix(0.14, 1.0, lodShape);
  float lodWidth = mix(0.44, 1.0, lodShape);
  vec3 local = vec3(aPosition.x * aPropsA.w * lodWidth, aPosition.y * aPropsA.z * lodHeight, aPosition.z * aPropsA.w * lodWidth);
  vec2 windDir = normalize(vec2(-1.0, 0.10));
  vec2 windPerp = vec2(-windDir.y, windDir.x);
  float along = dot(aInstanceXZ, windDir);
  float across = dot(aInstanceXZ, windPerp);
  float broadWave = sin(along * 0.098 - uTime * 0.46 + sin(across * 0.036) * 0.62);
  float gustWave = sin(along * 0.026 - uTime * 0.23 + sin(across * 0.058) * 1.05);
  float flutter = sin(uTime * 0.92 + aPropsB.y + along * 0.28 + across * 0.12);
  float gust = smoothstep(0.08, 0.86, gustWave);
  float density = clamp(aPropsB.x * 0.5 + 0.5, 0.0, 1.0);
  float wind = (broadWave * 0.40 + (gust - 0.45) * 0.36 + flutter * 0.025) * uWindStrength * (0.72 + density * 0.28);
  float leanNoise = sin(aPropsB.y * 2.31 + aPropsB.w * 8.73);
  float sideLean = (leanNoise * 0.34 + aPropsB.x * 0.10) * (0.38 + density * 0.62);
  float forwardLeanJitter = 0.82 + sin(aPropsB.y * 1.70 + aPropsB.w * 2.0) * 0.18 + aPropsB.w * 0.10;
  vec2 staticLeanDir = normalize(windDir + windPerp * sideLean);
  float staticLean = (0.13 + aPropsB.w * 0.08 + density * 0.10) * forwardLeanJitter * aPropsA.z * lodHeight * v * v;
  vec2 windOffset = staticLeanDir * staticLean;
  windOffset += windDir * wind * aPropsA.z * 0.90 * lodHeight * v * v;
  windOffset += windPerp * (broadWave * 0.060 + flutter * 0.026 + sideLean * 0.070) * uWindStrength * aPropsA.z * lodHeight * v * v;
  local.x += ((aPropsB.w - 0.5) * 0.090 + leanNoise * 0.030) * v;
  local.z += sin(aPropsB.y * 3.10 + aPropsB.w * 5.0) * 0.032 * v * v;

  vec2 fromPlayer = aInstanceXZ - uCameraPos.xz;
  float playerPush = smoothstep(1.7, 0.0, length(fromPlayer));
  if (playerPush > 0.0) {
    local.xz += normalize(fromPlayer + vec2(0.001)) * playerPush * v * v * 0.48;
  }

  vec2 rotated = vec2(local.x * c - local.z * s, local.x * s + local.z * c);
  vec2 worldXZ = aInstanceXZ + rotated + windOffset;
  vWorldPos = vec3(worldXZ.x, aPropsA.x + local.y, worldXZ.y);
  vUv = aUv;
  vJitter = aPropsB.x;
  vLodFade = aPropsB.z;
  vVariant = aPropsB.w;
  vDensity = density;
  vWindShade = 0.98 + v * 0.045 + broadWave * 0.012;
  gl_Position = uViewProj * vec4(vWorldPos, 1.0);
}`;

export const grassFragmentShader = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec2 vUv;
in float vJitter;
in float vLodFade;
in float vVariant;
in float vDensity;
in float vWindShade;
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

${noiseGLSL}
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
  float x = vUv.x;
  float t = vUv.y;
  float taper = mix(0.43, 0.072, pow(t, 1.12));
  float silhouette = smoothstep(taper + 0.060, taper - 0.018, abs(x - 0.5));
  float stripeCount = 5.0 + floor(vVariant * 4.0);
  float stripes = abs(fract(x * stripeCount + vVariant * 4.7 + t * 0.34) - 0.5);
  float bladeStreaks = smoothstep(0.43, 0.075, stripes) * (1.0 - smoothstep(0.82, 1.04, t));
  float rootFade = smoothstep(0.0, 0.070, t);
  float tip = smoothstep(1.0, 0.60, t);
  float ragged = sin(t * 24.0 + vWorldPos.x * 4.4 + vWorldPos.z * 3.1 + vVariant * 14.0) * 0.5 + 0.5;
  float chippedSide = smoothstep(0.28, 0.82, ragged + abs(x - 0.5) * 0.60);
  float splitCuts = smoothstep(0.70, 0.96, sin(x * 72.0 + t * 6.0 + vVariant * 19.0) * 0.5 + 0.5) * smoothstep(0.25, 0.92, t);
  float shapeAlpha = rootFade * tip * silhouette * mix(0.90, 1.0, chippedSide);
  shapeAlpha *= 1.0 - splitCuts * 0.045;
  float baseAlpha = shapeAlpha * (0.76 + vDensity * 0.22);
  float playerFade = smoothstep(0.18, 0.95, length(vWorldPos.xz - uCameraPos.xz));
  float visibility = clamp(vLodFade * playerFade, 0.0, 1.0);
  float fadeDither = dither4x4(gl_FragCoord.xy + floor(vWorldPos.xz * 2.0));
  float cut = uAlphaCutoff * mix(0.96, 0.76, 1.0 - visibility);
  if (baseAlpha < cut || visibility < fadeDither) {
    discard;
  }

  float rootShade = smoothstep(0.74, 0.0, t);
  float side = abs(x - 0.5) * 2.0;
  float vein = 1.0 - smoothstep(0.025, 0.18, abs(x - 0.50));
  float wetNoise = sin(vWorldPos.x * 7.0 + vWorldPos.z * 4.2 + vVariant * 9.0) * 0.5 + 0.5;
  float groundPatch = fbm(vWorldPos.xz * 0.036 + vec2(5.7, 2.1));
  float groundClumps = fbm(vWorldPos.xz * 0.12 + vec2(13.1, 6.3));
  float groundRows = smoothstep(
    0.36,
    0.76,
    sin(vWorldPos.z * 0.105 + vWorldPos.x * 0.018 + groundPatch * 5.4) * 0.5 + 0.5
  );
  float groundBands = smoothstep(
    0.28,
    0.76,
    sin(vWorldPos.z * 0.028 + groundPatch * 2.7) * 0.5 + 0.5
  );
  float groundLight = clamp(
    0.22 + groundPatch * 0.18 + groundClumps * 0.10 + groundRows * 0.16 + groundBands * 0.14 + wetNoise * 0.045 + vDensity * 0.06,
    0.0,
    1.0
  );
  vec3 groundTone = mix(vec3(0.088, 0.150, 0.030), vec3(0.235, 0.300, 0.070), groundLight);
  vec3 root = groundTone;
  vec3 body = mix(vec3(0.118, 0.214, 0.046), vec3(0.218, 0.320, 0.076), vDensity);
  vec3 tipCol = vec3(0.360, 0.430, 0.106);
  float strawVariant = smoothstep(0.74, 0.98, vVariant + wetNoise * 0.18 - vDensity * 0.10);
  float strawTip = strawVariant * smoothstep(0.34, 1.0, t) * (0.42 + side * 0.28 + bladeStreaks * 0.18);
  body = mix(body, vec3(0.215, 0.205, 0.068), strawVariant * 0.24);
  tipCol = mix(tipCol, vec3(0.465, 0.410, 0.115), strawVariant * 0.46);
  float rootBlend = smoothstep(0.12, 0.62, t);
  vec3 leafCol = mix(body, tipCol, smoothstep(0.42, 1.0, t));
  vec3 col = mix(root, leafCol, rootBlend);
  float fadeShadow = 1.0 - visibility;
  col = mix(col, groundTone * 0.82, fadeShadow * 0.54);
  col = mix(col, groundTone * 0.98, rootShade * (0.08 + wetNoise * 0.04));
  col = mix(col, vec3(0.088, 0.152, 0.032), vein * (0.055 + rootShade * 0.028));
  col += vec3(0.030, 0.050, 0.006) * side * smoothstep(0.32, 0.94, t) * (0.12 + vVariant * 0.08);
  col += (vDensity - 0.5) * vec3(0.034, 0.062, 0.010);
  float reflectiveEdge = smoothstep(0.30, 0.96, t) * smoothstep(0.18, 0.86, side + bladeStreaks * 0.42);
  float grassSheen = reflectiveEdge * (0.20 + wetNoise * 0.18) * (0.72 + vDensity * 0.28);
  col += vec3(0.090, 0.105, 0.025) * grassSheen;
  float dryEdge = smoothstep(0.68, 0.98, side + vVariant * 0.18) * smoothstep(0.44, 0.94, t);
  col = mix(col, vec3(0.258, 0.230, 0.074), dryEdge * 0.09 + strawTip * 0.20);
  col = mix(col, vec3(0.11, 0.010, 0.0), 0.010);
  col *= mix(0.96, vWindShade, 0.42);
  float fog = redFogAmount(vWorldPos, uCameraPos, uFogDensity, uFogStart, uFogHeightMin, uFogHeightMax, uFogHeightStrength);
  float farField = smoothstep(110.0, 380.0, -vWorldPos.z);
  vec3 grassFog = mix(uFogColor, vec3(0.078, 0.142, 0.026), farField * 0.74);
  col = mix(col, grassFog, fog * 0.16);
  if (uDebugMode == 3) {
    col = mix(vec3(0.0, 0.1, 0.0), vec3(1.0, 0.0, 0.0), 1.0 - vLodFade);
  }
  fragColor = vec4(col, 1.0);
}`;
