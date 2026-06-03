import { fogGLSL, noiseGLSL } from "./common";

export const terrainVertexShader = `#version 300 es
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

export const terrainFragmentShader = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vNormal;
in vec2 vUv;
out vec4 fragColor;

uniform vec3 uCameraPos;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uFogStart;
uniform float uFogHeightMin;
uniform float uFogHeightMax;
uniform float uFogHeightStrength;
uniform vec3 uColorDark;
uniform vec3 uColorLight;
uniform int uDebugMode;

${noiseGLSL}
${fogGLSL}

void main() {
  float dist = distance(vWorldPos, uCameraPos);
  float stripe = smoothstep(
    0.42,
    0.58,
    sin(vWorldPos.z * 0.036 + fbm(vWorldPos.xz * 0.025) * 3.2) * 0.5 + 0.5
  );
  float patchNoise = fbm(vWorldPos.xz * 0.035 + vec2(5.7, 2.1));
  float clumps = fbm(vWorldPos.xz * 0.12 + vec2(13.1, 6.3));
  float longRows = smoothstep(0.36, 0.76, sin(vWorldPos.z * 0.105 + vWorldPos.x * 0.018 + patchNoise * 5.4) * 0.5 + 0.5);
  float fieldBands = smoothstep(0.28, 0.76, sin(vWorldPos.z * 0.028 + patchNoise * 2.7) * 0.5 + 0.5);
  float tuftPatches = smoothstep(0.48, 0.84, clumps * 0.74 + patchNoise * 0.30);
  float light = clamp(
    stripe * 0.24 +
      patchNoise * 0.24 +
      clumps * 0.14 +
      longRows * 0.24 +
      fieldBands * 0.24 +
      max(0.0, vNormal.y - 0.72) * 0.30,
    0.0,
    1.0
  );
  vec3 grass = mix(uColorDark, uColorLight, light);
  float grassDepth = max(0.0, -vWorldPos.z);
  float nearField = 1.0 - smoothstep(85.0, 260.0, -vWorldPos.z);
  float fiber = fbm(vec2(vWorldPos.x * 0.18, vWorldPos.z * 0.36));
  float microFiber = fbm(vec2(vWorldPos.x * 0.62 + fiber * 1.4, vWorldPos.z * 1.18));
  float drySpeckle = fbm(vec2(vWorldPos.x * 1.36, vWorldPos.z * 0.84 + patchNoise * 2.0));
  float rows = smoothstep(0.42, 0.86, sin(vWorldPos.x * 0.22 + vWorldPos.z * 0.11 + fiber * 2.6) * 0.5 + 0.5);
  float cropRows = smoothstep(
    0.47,
    0.82,
    sin(vWorldPos.z * 0.18 + vWorldPos.x * 0.035 + patchNoise * 4.8) * 0.5 + 0.5
  );
  float photoRows = smoothstep(
    0.44,
    0.68,
    sin(vWorldPos.z * 0.42 + patchNoise * 2.2 + clumps * 1.4) * 0.5 + 0.5
  );
  float broadFieldSheets = smoothstep(
    0.34,
    0.72,
    sin(vWorldPos.z * 0.018 + patchNoise * 2.0) * 0.5 + 0.5
  );
  float middleField = smoothstep(18.0, 135.0, dist) * (1.0 - smoothstep(230.0, 470.0, dist));
  float openField = smoothstep(24.0, 105.0, -vWorldPos.z) * (1.0 - smoothstep(270.0, 560.0, -vWorldPos.z));
  float photographicField = smoothstep(-8.0, 42.0, -vWorldPos.z) * (1.0 - smoothstep(240.0, 520.0, -vWorldPos.z));
  float bushMacro = fbm(vec2(vWorldPos.x * 0.022 + patchNoise * 0.8, vWorldPos.z * 0.030));
  float bushFine = fbm(vec2(vWorldPos.x * 0.155 + bushMacro * 1.8, vWorldPos.z * 0.210 + patchNoise * 2.1));
  float bushIslands = smoothstep(0.58, 0.84, bushMacro * 0.72 + bushFine * 0.26 + rows * 0.12) * photographicField;
  float reedScratch = smoothstep(0.54, 0.92, sin(vWorldPos.x * 1.85 + vWorldPos.z * 0.35 + bushFine * 4.0) * 0.5 + 0.5);
  float leafPepper = smoothstep(0.64, 0.92, drySpeckle * 0.70 + microFiber * 0.28) * photographicField;
  grass += vec3(0.018, 0.046, 0.006) * fiber * nearField;
  grass += vec3(0.026, 0.058, 0.007) * rows * nearField * 0.70;
  grass += vec3(0.030, 0.055, 0.004) * longRows * middleField * 0.42;
  grass += vec3(0.026, 0.042, 0.004) * microFiber * nearField * 0.42;
  grass += vec3(0.044, 0.060, 0.006) * cropRows * (nearField * 0.34 + middleField * 0.26);
  grass += vec3(0.040, 0.070, 0.008) * (fieldBands * 0.34 + cropRows * 0.28 + patchNoise * 0.18) * openField;
  grass += vec3(0.040, 0.076, 0.007) * photoRows * openField * 0.34;
  grass = mix(grass, vec3(0.026, 0.052, 0.004), broadFieldSheets * openField * 0.24);
  grass = mix(grass, vec3(0.054, 0.086, 0.010), fieldBands * openField * 0.12);
  grass = mix(grass, vec3(0.070, 0.095, 0.012), drySpeckle * openField * 0.16);
  grass = mix(grass, vec3(0.040, 0.052, 0.007), drySpeckle * nearField * 0.18);
  grass = mix(grass, vec3(0.010, 0.030, 0.004), tuftPatches * (0.20 + nearField * 0.26));
  grass = mix(grass, vec3(0.004, 0.018, 0.002), bushIslands * (0.48 + reedScratch * 0.22));
  grass += vec3(0.018, 0.036, 0.002) * leafPepper * (0.10 + reedScratch * 0.12);
  grass = mix(grass, vec3(0.000, 0.009, 0.000), bushIslands * leafPepper * 0.28);
  float horizonShade = smoothstep(160.0, 620.0, -vWorldPos.z);
  float horizonTreeShadow = smoothstep(560.0, 980.0, -vWorldPos.z);
  float brokenHorizonShadow = horizonTreeShadow * (0.36 + bushMacro * 0.28 + patchNoise * 0.18);
  grass = mix(grass, vec3(0.008, 0.028, 0.004), horizonShade * 0.24);
  grass = mix(grass, vec3(0.004, 0.014, 0.002), brokenHorizonShadow * 0.34);
  float fieldDepth = smoothstep(10.0, 92.0, -vWorldPos.z) * (1.0 - smoothstep(520.0, 760.0, -vWorldPos.z));
  float rowPerspective = 0.55 + smoothstep(0.0, 500.0, -vWorldPos.z) * 1.45;
  float fineFieldRows = smoothstep(
    0.43,
    0.70,
    sin(vWorldPos.z * (0.54 / rowPerspective) + patchNoise * 3.4 + vWorldPos.x * 0.018) * 0.5 + 0.5
  );
  float lowCropBands = smoothstep(
    0.34,
    0.68,
    sin(vWorldPos.z * 0.075 + vWorldPos.x * 0.010 + bushMacro * 4.2) * 0.5 + 0.5
  );
  float groundFleck = smoothstep(0.54, 0.88, microFiber * 0.58 + drySpeckle * 0.34 + leafPepper * 0.18);
  float lowGrassNeedles = smoothstep(
    0.50,
    0.86,
    sin(vWorldPos.z * 1.18 + vWorldPos.x * 0.095 + microFiber * 5.6) * 0.5 + 0.5
  ) * nearField;
  float brokenMats = smoothstep(
    0.52,
    0.88,
    fbm(vec2(vWorldPos.x * 0.48 + drySpeckle * 1.7, vWorldPos.z * 0.82)) * 0.58 + rows * 0.26 + cropRows * 0.14
  ) * fieldDepth;
  float stubbleHash = hash12(floor(vec2(vWorldPos.x * 3.8, vWorldPos.z * 7.5)) + vec2(17.0, 43.0));
  float stubble = smoothstep(0.70, 0.95, stubbleHash + microFiber * 0.24) * nearField;
  grass += vec3(0.034, 0.070, 0.006) * fineFieldRows * fieldDepth * 0.34;
  grass = mix(grass, vec3(0.046, 0.094, 0.008), lowCropBands * fieldDepth * 0.18);
  grass = mix(grass, vec3(0.008, 0.030, 0.002), groundFleck * fieldDepth * 0.20);
  grass = mix(grass, vec3(0.012, 0.042, 0.003), lowGrassNeedles * 0.16);
  grass = mix(grass, vec3(0.018, 0.052, 0.004), brokenMats * 0.14);
  grass += vec3(0.018, 0.034, 0.002) * stubble * 0.09;
  float wetForeground = (1.0 - smoothstep(42.0, 175.0, grassDepth)) * smoothstep(-12.0, 18.0, grassDepth);
  float dampMat = smoothstep(0.46, 0.86, bushMacro * 0.42 + patchNoise * 0.32 + microFiber * 0.22 + rows * 0.14);
  float blackEdge = smoothstep(0.50, 0.88, dampMat + reedScratch * 0.24) * wetForeground;
  float meadowDepth = smoothstep(28.0, 110.0, grassDepth) * (1.0 - smoothstep(390.0, 680.0, grassDepth));
  float meadowRows = smoothstep(
    0.38,
    0.72,
    sin(grassDepth * 0.135 + vWorldPos.x * 0.014 + patchNoise * 5.2) * 0.5 + 0.5
  );
  float mottledLowGrass = smoothstep(0.50, 0.84, patchNoise * 0.44 + bushFine * 0.28 + drySpeckle * 0.18 + meadowRows * 0.18);
  float horizonGrassBand = smoothstep(360.0, 760.0, grassDepth) * (1.0 - smoothstep(1250.0, 1650.0, grassDepth));
  float brokenHorizonGrass = horizonGrassBand * smoothstep(0.36, 0.80, bushMacro * 0.48 + patchNoise * 0.34 + broadFieldSheets * 0.20);
  float strawEdge = smoothstep(0.64, 0.93, drySpeckle * 0.62 + microFiber * 0.26 + meadowRows * 0.14);
  float targetGrassField = smoothstep(48.0, 120.0, grassDepth) * (1.0 - smoothstep(320.0, 560.0, grassDepth));
  float targetGrassNoise = smoothstep(0.48, 0.84, bushMacro * 0.34 + bushFine * 0.32 + patchNoise * 0.24 + meadowRows * 0.18);
  float targetGrassBlades = smoothstep(
    0.58,
    0.92,
    sin(vWorldPos.x * 2.45 + grassDepth * 0.46 + microFiber * 5.8) * 0.5 + 0.5
  );
  float targetGrassClumps = targetGrassField * targetGrassNoise * (0.64 + targetGrassBlades * 0.36);
  float targetHorizonTufts = horizonGrassBand * smoothstep(
    0.44,
    0.82,
    bushFine * 0.42 + patchNoise * 0.30 + sin(vWorldPos.x * 0.075 + bushMacro * 4.0) * 0.14 + 0.14
  );
  grass = mix(grass, vec3(0.010, 0.040, 0.005), blackEdge * 0.20);
  grass = mix(grass, vec3(0.018, 0.058, 0.007), dampMat * wetForeground * 0.12);
  grass = mix(grass, vec3(0.034, 0.088, 0.010), meadowRows * meadowDepth * 0.21);
  grass = mix(grass, vec3(0.016, 0.052, 0.006), mottledLowGrass * meadowDepth * 0.14);
  grass += vec3(0.048, 0.060, 0.007) * strawEdge * meadowDepth * 0.070;
  grass = mix(grass, vec3(0.050, 0.130, 0.017), targetGrassField * (0.20 + patchNoise * 0.10));
  grass = mix(grass, vec3(0.034, 0.098, 0.012), targetGrassClumps * 0.22);
  grass += vec3(0.062, 0.118, 0.012) * targetGrassBlades * targetGrassClumps * 0.18;
  grass = mix(grass, vec3(0.024, 0.076, 0.008), brokenHorizonGrass * 0.18);
  grass = mix(grass, vec3(0.014, 0.052, 0.005), targetHorizonTufts * 0.18);
  vec3 redPolluted = mix(grass, vec3(0.17, 0.018, 0.0), 0.035 + vUv.y * 0.055);
  float fog = redFogAmount(vWorldPos, uCameraPos, uFogDensity, uFogStart, uFogHeightMin, uFogHeightMax, uFogHeightStrength);
  float farField = smoothstep(300.0, 720.0, -vWorldPos.z);
  vec3 fieldFog = mix(uFogColor, vec3(0.018, 0.038, 0.004), farField * 0.84);
  vec3 col = mix(redPolluted, fieldFog, fog * (0.48 + farField * 0.08));
  col = mix(col, vec3(0.018, 0.042, 0.004), farField * 0.22);
  float horizonDitch = smoothstep(700.0, 1240.0, -vWorldPos.z);
  float brokenDitch = horizonDitch * (0.38 + patchNoise * 0.30 + bushMacro * 0.18);
  col = mix(col, vec3(0.004, 0.018, 0.002), brokenDitch * 0.24);

  if (uDebugMode == 1) {
    col = vec3(fog, fog * 0.15, 0.0);
  }

  fragColor = vec4(col, 1.0);
}`;
