import { fogGLSL, noiseGLSL } from "./common";

export const cloudSheetVertexShader = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;
layout(location = 3) in vec4 aCenterAlpha;
layout(location = 4) in vec4 aSizeNoiseSpeed;

uniform mat4 uViewProj;

out vec2 vUv;
out vec3 vWorldPos;
out float vAlpha;
out float vNoiseScale;
out float vSpeed;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  vAlpha = aCenterAlpha.w;
  vNoiseScale = aSizeNoiseSpeed.z;
  vSpeed = aSizeNoiseSpeed.w;
  vWorldPos = vec3(
    aCenterAlpha.x + aPosition.x * aSizeNoiseSpeed.x,
    aCenterAlpha.y + aPosition.y * aSizeNoiseSpeed.y,
    aCenterAlpha.z
  );
  gl_Position = uViewProj * vec4(vWorldPos, 1.0);
}`;

export const cloudSheetFragmentShader = `#version 300 es
precision highp float;

in vec2 vUv;
in vec3 vWorldPos;
in float vAlpha;
in float vNoiseScale;
in float vSpeed;
out vec4 fragColor;

uniform float uTime;
uniform vec3 uCameraPos;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uFogStart;
uniform float uFogHeightMin;
uniform float uFogHeightMax;
uniform float uFogHeightStrength;

${noiseGLSL}
${fogGLSL}

void main() {
  vec2 uv = vec2(vUv.x * 2.6 + vUv.y * 0.28 + uTime * vSpeed * 1.15, vUv.y);
  float longNoise = fbm(vec2(uv.x, uv.y * 5.4) * vNoiseScale);
  float ragged = fbm(vec2(uv.x * 2.4 + longNoise * 1.2, uv.y * 18.0) * 1.2);
  float ribs = sin(vUv.y * 58.0 + longNoise * 6.5 + vUv.x * 1.2) * 0.5 + 0.5;
  float soft = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
  soft *= smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.76, vUv.y);
  float streaks = smoothstep(0.52, 0.86, longNoise * 0.58 + ragged * 0.44);
  float bands = smoothstep(0.48, 0.78, ribs + ragged * 0.18);
  float heightGate = smoothstep(-4.0, 10.0, vWorldPos.y) * smoothstep(78.0, 18.0, vWorldPos.y);
  float alpha = streaks * bands * soft * heightGate * vAlpha * 0.72;
  if (alpha < 0.004) {
    discard;
  }
  vec3 col = vec3(0.006, 0.0, 0.0);
  vec3 fogged = applyRedDistanceFog(col, vWorldPos, uCameraPos, uFogColor, uFogDensity, uFogStart, uFogHeightMin, uFogHeightMax, uFogHeightStrength);
  col = mix(col, fogged, 0.22);
  fragColor = vec4(col, alpha);
}`;
