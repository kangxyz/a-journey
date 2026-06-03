import { fullscreenVertexShader, noiseGLSL } from "./common";

export const postVertexShader = fullscreenVertexShader;

export const postFragmentShader = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSceneColor;
uniform sampler2D uSceneDepth;
uniform float uTime;
uniform float uRedBoost;
uniform float uGreenScale;
uniform float uBlueScale;
uniform float uContrast;
uniform float uVignette;
uniform float uGrain;
uniform float uExposure;
uniform float uGamma;
uniform float uDofStrength;
uniform float uDofFocusDistance;
uniform float uDofRange;
uniform float uCameraNear;
uniform float uCameraFar;
uniform vec2 uTexelSize;
uniform int uBypass;

${noiseGLSL}

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

vec3 edgeAwareSample(sampler2D tex, vec2 uv) {
  vec3 center = texture(tex, uv).rgb;
  vec3 left = texture(tex, uv + vec2(-uTexelSize.x, 0.0)).rgb;
  vec3 right = texture(tex, uv + vec2(uTexelSize.x, 0.0)).rgb;
  vec3 up = texture(tex, uv + vec2(0.0, uTexelSize.y)).rgb;
  vec3 down = texture(tex, uv + vec2(0.0, -uTexelSize.y)).rgb;
  float contrast = max(
    max(abs(luma(center) - luma(left)), abs(luma(center) - luma(right))),
    max(abs(luma(center) - luma(up)), abs(luma(center) - luma(down)))
  );
  float edge = smoothstep(0.08, 0.42, contrast);
  vec3 cross = (left + right + up + down) * 0.25;
  float centerLuma = luma(center);
  float crossLuma = luma(cross);
  float neighborMin = min(min(luma(left), luma(right)), min(luma(up), luma(down)));
  float darkSilhouette = smoothstep(0.11, 0.018, centerLuma) * smoothstep(0.04, 0.20, crossLuma - centerLuma);
  float amount = edge * mix(0.30, 0.04, darkSilhouette);
  vec3 softened = mix(center, cross, amount);
  vec3 result = mix(softened, min(softened, center), darkSilhouette);
  float silhouetteHalo = smoothstep(0.090, 0.018, neighborMin) * smoothstep(0.060, 0.210, centerLuma - neighborMin);
  float darkCore = smoothstep(0.055, 0.010, centerLuma) * smoothstep(0.018, 0.120, crossLuma - centerLuma);
  vec3 ink = min(result, vec3(0.004, 0.0, 0.0));
  result = mix(result, ink, silhouetteHalo * 0.42);
  return mix(result, min(result, center * 0.72), darkCore * 0.18);
}

float linearDepth(float rawDepth) {
  float z = rawDepth * 2.0 - 1.0;
  return (2.0 * uCameraNear * uCameraFar) / max(0.0001, uCameraFar + uCameraNear - z * (uCameraFar - uCameraNear));
}

vec3 depthOfFieldSample(sampler2D tex, vec2 uv, vec3 center, float amount) {
  vec2 radius = uTexelSize * mix(vec2(0.0), vec2(3.6, 2.2), clamp(amount, 0.0, 1.0));
  vec3 col = center * 0.28;
  col += texture(tex, uv + vec2(radius.x, 0.0)).rgb * 0.13;
  col += texture(tex, uv + vec2(-radius.x, 0.0)).rgb * 0.13;
  col += texture(tex, uv + vec2(0.0, radius.y)).rgb * 0.13;
  col += texture(tex, uv + vec2(0.0, -radius.y)).rgb * 0.13;
  col += texture(tex, uv + radius * vec2(0.78, 0.72)).rgb * 0.10;
  col += texture(tex, uv - radius * vec2(0.78, 0.72)).rgb * 0.10;
  return col;
}

void main() {
  vec3 col = edgeAwareSample(uSceneColor, vUv);
  if (uBypass == 0) {
    if (uDofStrength > 0.001) {
      float rawDepth = texture(uSceneDepth, vUv).r;
      float sceneDepth = linearDepth(rawDepth);
      float farBlur = smoothstep(uDofFocusDistance, uDofFocusDistance + uDofRange, sceneDepth);
      float skyBlur = smoothstep(0.9975, 1.0, rawDepth) * smoothstep(0.20, 0.92, vUv.y);
      float silhouetteProtect = 1.0 - smoothstep(0.018, 0.15, luma(col));
      float frameFocus = 1.0 - smoothstep(0.12, 0.54, distance(vUv, vec2(0.48, 0.46)));
      float dof = max(farBlur, skyBlur * 0.76) * uDofStrength;
      dof *= 1.0 - silhouetteProtect * 0.82;
      dof *= mix(1.0, 0.72, frameFocus);
      col = mix(col, depthOfFieldSample(uSceneColor, vUv, col, dof), clamp(dof, 0.0, 0.46));
    }

    float horizonBand = smoothstep(0.14, 0.24, vUv.y) * smoothstep(0.60, 0.36, vUv.y);
    float hazeFlow = fbm(vec2(vUv.x * 9.0 + uTime * 0.012, vUv.y * 4.0));
    float smear = horizonBand * (0.22 + hazeFlow * 0.18);
    vec2 smearOffset = vec2((hazeFlow - 0.5) * 5.0 * uTexelSize.x, 1.35 * uTexelSize.y);
    vec3 smearA = texture(uSceneColor, vUv + smearOffset).rgb;
    vec3 smearB = texture(uSceneColor, vUv - smearOffset * vec2(1.8, 0.65)).rgb;
    vec3 smearC = texture(uSceneColor, vUv + vec2(13.0 * uTexelSize.x, -1.2 * uTexelSize.y)).rgb;
    vec3 horizonSmear = (smearA + smearB + smearC) / 3.0;
    float darkSmearMask = smoothstep(0.018, 0.18, max(luma(col), luma(horizonSmear))) * smoothstep(0.48, 0.08, luma(col));
    col = mix(col, horizonSmear, smear * darkSmearMask * 0.22);

    float redMask = smoothstep(0.02, 0.22, col.r - col.g * 0.72);
    col.r += uRedBoost * (1.0 - col.r) * redMask;
    col.g *= uGreenScale;
    col.b *= uBlueScale;
    col = (col - 0.5) * uContrast + 0.5;
    col *= uExposure;
    float vig = smoothstep(0.92, 0.18, distance(vUv, vec2(0.5)));
    col *= mix(1.0 - uVignette, 1.0, vig);
    float bottomCrush = 1.0 - smoothstep(0.02, 0.36, vUv.y);
    float lowerField = (1.0 - smoothstep(0.18, 0.46, vUv.y)) * smoothstep(0.004, 0.075, col.g);
    col *= 1.0 - bottomCrush * 0.11;
    col.g *= 1.0 - lowerField * 0.055;
    col.r *= 1.0 - lowerField * 0.035;
    float redFrame = smoothstep(0.18, 0.72, col.r) * smoothstep(0.42, 0.86, col.r - col.g * 0.65);
    float skyFrame = redFrame * smoothstep(0.18, 0.42, vUv.y);
    float scanRow = floor(vUv.y * 230.0);
    float scanNoise = hash12(vec2(scanRow, floor(uTime * 3.0)));
    float scan = sin(vUv.y * 720.0 + scanNoise * 6.2831) * 0.5 + 0.5;
    float fineStripe = smoothstep(0.52, 0.92, scan + scanNoise * 0.16) * skyFrame;
    vec2 blockId = floor(vUv * vec2(122.0, 72.0));
    float blockNoise = hash12(blockId + floor(uTime * 1.3));
    float blockField = (blockNoise - 0.5) * skyFrame;
    float horizonSmoke = fbm(vUv * vec2(18.0, 7.5) + vec2(uTime * 0.015, 0.0)) * horizonBand;
    col.r += blockField * 0.018;
    col.g += blockField * 0.0025;
    col = mix(col, vec3(0.058, 0.001, 0.0), horizonSmoke * 0.055);
    col = mix(col, vec3(col.r * 0.92, col.g * 0.70, 0.0), fineStripe * 0.055);
    vec3 quantized = floor(col * vec3(88.0, 44.0, 24.0)) / vec3(88.0, 44.0, 24.0);
    col = mix(col, quantized, skyFrame * 0.10);
    float grain = hash12(vUv * vec2(1920.0, 1080.0) + uTime) - 0.5;
    col += grain * uGrain * (1.0 + skyFrame * 0.72);
    col = pow(max(col, vec3(0.0)), vec3(1.0 / max(0.01, uGamma)));
  }
  fragColor = vec4(col, 1.0);
}`;
