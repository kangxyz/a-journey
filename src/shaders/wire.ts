import { fogGLSL, noiseGLSL } from "./common";

export const wireVertexShader = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aCenter;
layout(location = 1) in vec3 aTangent;
layout(location = 2) in vec2 aSideWidth;
layout(location = 3) in vec4 aWind;

uniform mat4 uViewProj;
uniform float uTime;
uniform vec3 uCameraPos;
uniform vec3 uCameraRight;
uniform vec2 uViewport;
uniform float uWindStrength;
uniform float uWindSpeed;

out vec3 vWorldPos;
out float vRibbonSide;

void main() {
  vec3 tangent = normalize(aTangent);
  float t = aWind.x;
  float endFade = smoothstep(0.025, 0.18, t) * smoothstep(0.025, 0.18, 1.0 - t);
  float lengthFade = smoothstep(0.12, 1.0, aWind.z);
  float dist = distance(aCenter, uCameraPos);
  float nearFade = 1.0 - smoothstep(780.0, 1900.0, dist);
  float phase = aWind.y * 6.2831853;
  float time = uTime * uWindSpeed;
  vec3 sideAxis = cross(tangent, vec3(0.0, 1.0, 0.0));
  if (dot(sideAxis, sideAxis) < 0.0001) {
    sideAxis = vec3(1.0, 0.0, 0.0);
  }
  sideAxis = normalize(sideAxis);
  float longWave = sin(time + phase + t * 6.2831853);
  float fineWave = sin(time * 1.73 + phase * 1.41 + t * 17.0 + aCenter.z * 0.018);
  float sway = (longWave * 0.66 + fineWave * 0.34) * uWindStrength * endFade * lengthFade * nearFade;
  vec3 center = aCenter + sideAxis * sway + vec3(0.0, sway * 0.26, 0.0);
  vec4 centerClip = uViewProj * vec4(center, 1.0);
  vec4 tangentClip = uViewProj * vec4(center + tangent, 1.0);
  vec2 centerNdc = centerClip.xy / centerClip.w;
  vec2 tangentPx = (tangentClip.xy / tangentClip.w - centerNdc) * uViewport;
  if (dot(tangentPx, tangentPx) < 0.0001) {
    vec4 fallbackClip = uViewProj * vec4(center + uCameraRight, 1.0);
    tangentPx = (fallbackClip.xy / fallbackClip.w - centerNdc) * uViewport;
  }
  vec2 normalPx = normalize(vec2(-tangentPx.y, tangentPx.x));
  float distantSoft = smoothstep(360.0, 1120.0, dist);
  float halfWidthPx = clamp(aSideWidth.y * 30.0, 1.18, 1.55) * mix(1.0, 1.72, distantSoft);
  vec2 offsetNdc = normalPx * aSideWidth.x * halfWidthPx * 2.0 / uViewport;
  vWorldPos = center;
  vRibbonSide = aSideWidth.x;
  gl_Position = centerClip;
  gl_Position.xy += offsetNdc * centerClip.w;
}`;

export const wireFragmentShader = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in float vRibbonSide;
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
  vec3 base = uDebugMode == 4 ? vec3(0.02, 0.0, 0.0) : vec3(0.002, 0.0, 0.0);
  float dist = distance(vWorldPos, uCameraPos);
  float farFade = smoothstep(130.0, 720.0, dist);
  float distantSoft = smoothstep(360.0, 1120.0, dist);
  float hazeSoft = smoothstep(420.0, 1520.0, dist);
  float coarse = hash12(floor(vWorldPos.xz * 0.050) + floor(vWorldPos.yy * 0.18));
  float streak = fbm(vec2(vWorldPos.x * 0.030 + vWorldPos.z * 0.006, vWorldPos.z * 0.012 + vWorldPos.y * 0.050));
  vec3 farWire = vec3(0.040, 0.0, 0.0);
  vec3 col = mix(base, farWire, distantSoft * 0.84 + fog * farFade * 0.08);
  col = mix(col, vec3(0.074, 0.001, 0.0), hazeSoft * (0.20 + streak * 0.16));
  col += vec3(0.026, 0.0, 0.0) * (coarse - 0.5) * hazeSoft * 0.18;
  float coreEdge = mix(0.08, 0.24, distantSoft);
  float coreFalloff = mix(0.78, 1.20, distantSoft);
  float featherStart = mix(0.58, 0.20, distantSoft);
  float featherEnd = mix(1.0, 1.34, distantSoft);
  float core = 1.0 - smoothstep(coreEdge, coreFalloff, abs(vRibbonSide));
  float feather = 1.0 - smoothstep(featherStart, featherEnd, abs(vRibbonSide));
  float nearAlpha = max(core * 0.94, feather * 0.68);
  float farAlpha = max(core * 0.18, feather * 0.10);
  float alpha = mix(nearAlpha, farAlpha, distantSoft) * mix(1.0, 0.56, farFade);
  float dust = smoothstep(0.18, 0.74, streak * 0.56 + coarse * 0.44);
  alpha *= mix(1.0, 0.30 + dust * 0.42, hazeSoft);
  alpha += hazeSoft * feather * dust * 0.032;
  fragColor = vec4(col, alpha);
}`;
