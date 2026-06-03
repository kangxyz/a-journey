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
  float sway = sin(uTime * 0.62 + aInstanceB.w + aPosition.y * 2.6) * 0.035 * aPosition.y * aPosition.y;
  local.x += sway;
  vec2 rotated = vec2(local.x * c - local.z * s, local.x * s + local.z * c);
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
  float ragged = fbm(vec2(vUv.x * 7.0 + vPhase, vUv.y * 9.5 + vWorldPos.x * 0.05));
  float fineRagged = fbm(vec2(vUv.x * 28.0 + vPhase * 1.7, vUv.y * 19.0 + vWorldPos.z * 0.025));
  float bladeStripes = sin(vUv.x * 72.0 + fineRagged * 8.0 + vPhase) * 0.5 + 0.5;
  float verticalCuts = smoothstep(0.34, 0.86, bladeStripes + ragged * 0.28);
  float brokenTop = 0.52 + ragged * 0.22 + verticalCuts * 0.16 + fineRagged * 0.10;
  float top = smoothstep(1.02, brokenTop, vUv.y);
  float depth = max(0.0, -vWorldPos.z);
  float foreground = 1.0 - smoothstep(68.0, 210.0, depth);
  float horizonBand = smoothstep(300.0, 620.0, depth);
  float baseMass = smoothstep(0.08, 0.48, ragged + (1.0 - vUv.y) * 0.50);
  float bladeBreakup = mix(0.62, 1.12, verticalCuts) * mix(0.82, 1.14, fineRagged);
  float alpha = edge * top * baseMass * mix(0.72, 1.08, vDensity) * bladeBreakup;
  alpha *= 1.16 + foreground * 0.28 + horizonBand * 0.22;
  if (alpha < 0.18) {
    discard;
  }

  float rootShade = smoothstep(1.0, 0.0, vUv.y);
  float bladePepper = smoothstep(0.48, 0.90, ragged * 0.58 + verticalCuts * 0.30 + fineRagged * 0.20);
  vec3 col = mix(vec3(0.102, 0.196, 0.030), vec3(0.042, 0.110, 0.014), rootShade * 0.56);
  col = mix(col, vec3(0.032, 0.096, 0.010), verticalCuts * vDensity * (0.12 + foreground * 0.06));
  col = mix(col, vec3(0.034, 0.092, 0.011), horizonBand * (0.10 + bladePepper * 0.06));
  col += vec3(0.070, 0.112, 0.012) * ragged * 0.092;
  col = mix(col, vec3(0.144, 0.118, 0.026), bladePepper * smoothstep(0.48, 1.0, vUv.y) * 0.08);
  float fog = redFogAmount(vWorldPos, uCameraPos, uFogDensity, uFogStart, uFogHeightMin, uFogHeightMax, uFogHeightStrength);
  vec3 clumpFog = mix(uFogColor, vec3(0.038, 0.088, 0.010), smoothstep(80.0, 360.0, depth) * 0.76);
  col = mix(col, clumpFog, fog * 0.28);
  if (uDebugMode == 3) {
    col = vec3(0.0, vDensity * 0.18, 0.0);
  }
  fragColor = vec4(col, alpha * (0.68 + vDensity * 0.26) * mix(1.0, 0.82, horizonBand));
}`;
