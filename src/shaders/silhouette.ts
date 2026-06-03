import { fogGLSL, noiseGLSL } from "./common";

export const silhouetteVertexShader = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 3) in vec4 aInstanceA; // xyz base, height
layout(location = 4) in vec4 aInstanceB; // yaw, tint, unused, unused

uniform mat4 uViewProj;

out vec3 vWorldPos;
out float vTint;

void main() {
  float height = aInstanceA.w;
  float s = sin(aInstanceB.x);
  float c = cos(aInstanceB.x);
  vec3 scaled = aPosition * height;
  vec2 rotated = vec2(
    scaled.x * c - scaled.z * s,
    scaled.x * s + scaled.z * c
  );
  vWorldPos = vec3(aInstanceA.x + rotated.x, aInstanceA.y + scaled.y, aInstanceA.z + rotated.y);
  vTint = aInstanceB.y;
  gl_Position = uViewProj * vec4(vWorldPos, 1.0);
}`;

export const silhouetteFragmentShader = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in float vTint;
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
  float dist = distance(vWorldPos, uCameraPos);
  float steelNoise = hash12(floor(vWorldPos.xz * 7.5) + floor(vWorldPos.yy * 19.0));
  float grain = hash12(floor(vWorldPos.xz * 0.090) + floor(vWorldPos.yy * 0.34));
  float coarseGrain = hash12(floor(vWorldPos.xz * 0.034) + floor(vWorldPos.yy * 0.16));
  float mistNoise = fbm(vec2(vWorldPos.x * 0.020 + vWorldPos.z * 0.006, vWorldPos.y * 0.040 + vWorldPos.z * 0.010));
  float farSilhouette = smoothstep(0.58, 1.0, vTint);
  float atmospheric = smoothstep(380.0, 1540.0, dist) * smoothstep(0.44, 1.0, vTint);
  float lowHaze = smoothstep(34.0, 2.0, vWorldPos.y) * farSilhouette;
  float breakup = smoothstep(0.20, 0.78, mistNoise * 0.62 + coarseGrain * 0.38);
  vec3 base = mix(vec3(0.0, 0.0, 0.0), vec3(0.004, 0.0, 0.0), vTint);
  base += steelNoise * vec3(0.0009, 0.0, 0.0);
  vec3 col = mix(base, vec3(0.018, 0.0, 0.0), fog * 0.035 * smoothstep(0.55, 1.0, vTint));
  col = mix(col, vec3(0.040, 0.0, 0.0), farSilhouette * 0.42 + lowHaze * 0.22);
  col = mix(col, vec3(0.070, 0.001, 0.0), atmospheric * (0.22 + breakup * 0.20));
  col += vec3(0.010, 0.0, 0.0) * grain * farSilhouette * 0.14;
  col += vec3(0.030, 0.0, 0.0) * (coarseGrain - 0.5) * atmospheric * 0.20;
  float alpha = mix(1.0, 0.50 + grain * 0.10, farSilhouette);
  alpha = mix(alpha, 0.34 + grain * 0.12, lowHaze);
  alpha *= mix(1.0, 0.88, fog * farSilhouette);
  alpha *= mix(1.0, 0.32 + breakup * 0.36 + coarseGrain * 0.12, atmospheric);
  alpha += atmospheric * breakup * 0.046;
  if (uDebugMode == 1) {
    col = vec3(fog, fog * 0.1, 0.0);
    alpha = 1.0;
  }
  fragColor = vec4(col, alpha);
}`;
