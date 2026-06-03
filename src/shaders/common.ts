export const fullscreenVertexShader = `#version 300 es
precision highp float;

const vec2 POS[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2( 3.0, -1.0),
  vec2(-1.0,  3.0)
);

out vec2 vUv;

void main() {
  vec2 p = POS[gl_VertexID];
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

export const noiseGLSL = `
float hash12(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise2(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}`;

export const fogGLSL = `
float redFogAmount(
  vec3 worldPos,
  vec3 cameraPos,
  float fogDensity,
  float fogStart,
  float fogHeightMin,
  float fogHeightMax,
  float heightFogStrength
) {
  float d = max(0.0, distance(worldPos, cameraPos) - fogStart);
  float distFog = 1.0 - exp(-d * fogDensity);
  float h = 1.0 - smoothstep(fogHeightMin, fogHeightMax, worldPos.y);
  float heightFog = h * heightFogStrength;
  return clamp(distFog + heightFog * distFog, 0.0, 1.0);
}

vec3 applyRedDistanceFog(
  vec3 baseColor,
  vec3 worldPos,
  vec3 cameraPos,
  vec3 fogColor,
  float fogDensity,
  float fogStart,
  float fogHeightMin,
  float fogHeightMax,
  float heightFogStrength
) {
  float fog = redFogAmount(
    worldPos,
    cameraPos,
    fogDensity,
    fogStart,
    fogHeightMin,
    fogHeightMax,
    heightFogStrength
  );
  return mix(baseColor, fogColor, fog);
}`;
