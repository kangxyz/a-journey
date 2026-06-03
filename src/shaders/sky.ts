import { fullscreenVertexShader, noiseGLSL } from "./common";

export const skyVertexShader = fullscreenVertexShader;

export const skyFragmentShader = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyLower;
uniform float uCloudScale;
uniform float uCloudStrength;
uniform float uHorizonLine;
uniform vec3 uCameraPos;
uniform vec3 uCameraForward;
uniform vec3 uCameraRight;
uniform vec3 uCameraUp;
uniform float uAspect;
uniform float uTanHalfFov;

${noiseGLSL}

float bandMask(float y, float low, float high) {
  return smoothstep(low, low + 0.055, y) * smoothstep(high, high - 0.075, y);
}

float softLine(float y, float center, float width) {
  return 1.0 - smoothstep(width * 0.28, width, abs(y - center));
}

float ridgeFill(float y, float ridge, float base, float blur) {
  float body = smoothstep(base, base + 0.030, y);
  float edge = 1.0 - smoothstep(ridge - blur, ridge + blur, y);
  return body * edge;
}

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec3 ray = normalize(
    uCameraForward +
    uCameraRight * ndc.x * uAspect * uTanHalfFov +
    uCameraUp * ndc.y * uTanHalfFov
  );

  vec2 skyBasis = vec2(
    dot(ray, normalize(vec3(0.92, 0.0, -0.38))),
    dot(ray, normalize(vec3(0.28, 0.0, 0.96)))
  );
  float y = clamp(ray.y * 0.96 + 0.34, 0.0, 1.0);
  float worldSkyX = skyBasis.x;
  float upperLeftWeight = mix(0.18, 1.22, smoothstep(0.62, -0.36, worldSkyX));
  float centerOpening = smoothstep(0.16, 0.58, abs(worldSkyX - 0.08));
  float upperCenterClear = mix(1.0, centerOpening, smoothstep(0.50, 0.78, y));
  vec2 parallax = uCameraPos.xz * vec2(0.00055, -0.00038);
  vec2 cloudDrift = vec2(uTime * 0.014, -uTime * 0.002);
  vec2 p = vec2(
    skyBasis.x * 2.1 + ray.y * 0.48 + parallax.x,
    y + skyBasis.y * 0.10 + parallax.y
  ) + cloudDrift;

  vec3 cleanLower = vec3(0.58, 0.006, 0.0);
  vec3 cleanMid = vec3(0.86, 0.006, 0.0);
  vec3 cleanTop = vec3(1.02, 0.008, 0.0);
  vec3 col = mix(cleanLower, cleanMid, smoothstep(0.02, uHorizonLine + 0.08, y));
  col = mix(col, cleanTop, smoothstep(0.38, 0.92, y));

  float glow = bandMask(y, 0.16, 0.46);
  col += vec3(0.18, 0.001, 0.0) * glow * (1.0 - smoothstep(0.44, 0.78, y));

  float shear = fbm(vec2(p.x * 0.58 - uTime * 0.003, p.y * 4.6));
  float broad = fbm(vec2(p.x * 2.4 + shear * 1.7 - uTime * 0.006, y * 15.0));
  float fine = fbm(vec2(p.x * 13.0 + broad * 2.4 - uTime * 0.012, y * 78.0));
  float rib = sin(y * 132.0 + p.x * 1.15 + broad * 9.0) * 0.5 + 0.5;

  float lowMask = bandMask(y, 0.080, 0.520);
  float lowNoise = smoothstep(0.36, 0.78, broad * 0.58 + fine * 0.34);
  float lowRibs = smoothstep(0.47, 0.88, rib + fine * 0.16);
  float blackFog = lowMask * lowNoise * (0.46 + lowRibs * 0.54);
  float blackCore = blackFog * smoothstep(0.54, 0.86, fine + lowRibs * 0.20);

  float shelfA = softLine(y, 0.180 + sin(p.x * 1.15 + shear * 2.1) * 0.012, 0.070);
  float shelfB = softLine(y, 0.275 + sin(p.x * 0.92 + broad * 2.0) * 0.018, 0.095);
  float shelfC = softLine(y, 0.390 + sin(p.x * 0.78 + broad * 2.7) * 0.026, 0.145);
  float lowDeck = lowMask * lowNoise * clamp(shelfA * 0.76 + shelfB * 0.74 + shelfC * 0.48 + lowRibs * 0.20, 0.0, 1.0);

  float midMask = bandMask(y, 0.350, 0.610);
  float midFlow = fbm(vec2(p.x * 4.4 + shear * 2.2 - uTime * 0.005, y * 42.0 + broad * 4.0));
  float midFine = fbm(vec2(p.x * 24.0 + midFlow * 3.1, y * 144.0 + fine * 2.0));
  float midLineA = softLine(y, 0.315 + sin(p.x * 0.70 + midFlow * 2.1) * 0.022, 0.120);
  float midLineB = softLine(y, 0.385 + sin(p.x * 0.54 + shear * 2.0) * 0.028, 0.150);
  float midCloud = midMask *
    smoothstep(0.42, 0.80, midFlow * 0.62 + midFine * 0.28) *
    clamp(midLineA * 0.52 + midLineB * 0.34 + smoothstep(0.48, 0.86, midFine) * 0.22, 0.0, 1.0);

  float upperClean = smoothstep(0.50, 0.76, y);
  float highMask = bandMask(y, 0.56, 0.84);
  float highFlow = fbm(vec2(p.x * 0.82 + p.y * 1.2 - uTime * 0.002, y * 4.8));
  float highFine = fbm(vec2(p.x * 5.2 + highFlow * 2.0 - uTime * 0.006, y * 25.0));
  float highShelf = highMask *
    softLine(y, 0.70 + sin(p.x * 0.62 + highFlow * 2.5) * 0.045, 0.200) *
    smoothstep(0.44, 0.80, highFlow * 0.68 + highFine * 0.24);

  float hugeFlow = fbm(vec2(p.x * 0.38 + p.y * 0.22 - uTime * 0.0015, y * 2.6 + shear * 0.55));
  float hugeFine = fbm(vec2(p.x * 2.1 + hugeFlow * 2.2 - uTime * 0.004, y * 14.0 + broad * 2.4));
  float hugeRib = sin(y * 19.0 + p.x * 0.64 + hugeFlow * 4.4) * 0.5 + 0.5;
  float upperMassMask = bandMask(y, 0.54, 0.96);
  float upperMass = upperMassMask *
    smoothstep(0.36, 0.70, hugeFlow * 0.70 + hugeFine * 0.22) *
    (0.62 + smoothstep(0.36, 0.78, hugeRib + hugeFine * 0.16) * 0.38);
  float upperMassCore = upperMass * smoothstep(0.48, 0.82, hugeFine * 0.62 + hugeFlow * 0.24 + hugeRib * 0.16);
  float upperSwathA = upperMassMask *
    softLine(y, 0.74 + sin(p.x * 0.36 + hugeFlow * 2.2) * 0.065, 0.260) *
    smoothstep(0.26, 0.64, hugeFlow * 0.62 + hugeFine * 0.24 + hugeRib * 0.14);
  float upperSwathB = bandMask(y, 0.46, 0.78) *
    softLine(y, 0.57 + sin(p.x * 0.55 + shear * 1.8) * 0.055, 0.210) *
    smoothstep(0.30, 0.68, hugeFlow * 0.50 + hugeFine * 0.30 + broad * 0.18);

  float blanketFlow = fbm(vec2(p.x * 0.24 + p.y * 0.18 - uTime * 0.0012, y * 2.05 + shear * 0.72));
  float blanketTexture = fbm(vec2(p.x * 1.18 + blanketFlow * 3.4 - uTime * 0.0032, y * 8.6 + hugeFlow * 2.2));
  float blanketFilament = fbm(vec2(p.x * 5.6 + blanketTexture * 3.8, y * 32.0 + blanketFlow * 4.2));
  float upperBlanketA = bandMask(y, 0.56, 0.99) *
    softLine(y, 0.78 + sin(p.x * 0.30 + blanketFlow * 2.6) * 0.090, 0.360) *
    smoothstep(0.20, 0.58, blanketFlow * 0.62 + blanketTexture * 0.28 + hugeRib * 0.10);
  float upperBlanketB = bandMask(y, 0.41, 0.78) *
    softLine(y, 0.58 + sin(p.x * 0.42 + shear * 1.5 + blanketFlow * 1.6) * 0.075, 0.270) *
    smoothstep(0.22, 0.62, blanketFlow * 0.48 + blanketTexture * 0.34 + broad * 0.16);
  float upperBlanketBreak = smoothstep(0.18, 0.64, blanketFlow * 0.54 + blanketTexture * 0.32 + blanketFilament * 0.14);
  float upperBlanket = clamp(upperBlanketA * 0.88 + upperBlanketB * 0.72, 0.0, 1.0) * upperBlanketBreak;
  float upperBlanketCore = upperBlanket * smoothstep(0.34, 0.70, blanketTexture * 0.56 + blanketFlow * 0.32 + blanketFilament * 0.18);
  float upperBlanketFeather = upperBlanket * (0.54 + blanketTexture * 0.46) * (1.0 - upperBlanketCore * 0.24);
  float cinematicSmokeA = bandMask(y, 0.43, 0.76) *
    softLine(y, 0.540 + sin(p.x * 0.34 + blanketFlow * 2.9) * 0.075, 0.250) *
    smoothstep(0.16, 0.54, blanketFlow * 0.54 + blanketTexture * 0.30 + blanketFilament * 0.16);
  float cinematicSmokeB = bandMask(y, 0.59, 0.94) *
    softLine(y, 0.765 + sin(p.x * 0.25 + hugeFlow * 2.4 + blanketFlow) * 0.082, 0.310) *
    smoothstep(0.18, 0.58, blanketFlow * 0.48 + hugeFlow * 0.30 + blanketTexture * 0.22);
  float cinematicSmoke = clamp(cinematicSmokeA * 0.82 + cinematicSmokeB * 0.66, 0.0, 1.0) *
    (0.66 + blanketFilament * 0.34);
  float cinematicSmokeCore = cinematicSmoke *
    smoothstep(0.32, 0.68, blanketTexture * 0.54 + blanketFlow * 0.30 + blanketFilament * 0.18);

  float upperCloudComposition = upperLeftWeight * upperCenterClear;
  upperMass *= upperCloudComposition;
  upperMassCore *= upperCloudComposition;
  upperSwathA *= upperCloudComposition;
  upperSwathB *= mix(1.0, upperCloudComposition, 0.68);
  upperBlanket *= upperCloudComposition;
  upperBlanketCore *= upperCloudComposition;
  upperBlanketFeather *= upperCloudComposition;
  cinematicSmoke *= upperCloudComposition;
  cinematicSmokeCore *= upperCloudComposition;

  float middleMassMask = bandMask(y, 0.36, 0.66);
  float middleMassFlow = fbm(vec2(p.x * 0.72 + p.y * 0.30 - uTime * 0.002, y * 4.8 + hugeFlow * 2.0));
  float middleMassFine = fbm(vec2(p.x * 4.6 + middleMassFlow * 2.6, y * 34.0 + hugeFine * 2.0));
  float middleMass = middleMassMask *
    smoothstep(0.38, 0.74, middleMassFlow * 0.66 + middleMassFine * 0.26) *
    (0.45 + smoothstep(0.42, 0.84, hugeRib + middleMassFine * 0.18) * 0.55);
  float middleMassCore = middleMass * smoothstep(0.46, 0.82, middleMassFine * 0.64 + middleMassFlow * 0.24);

  float lowerBulkMask = bandMask(y, 0.22, 0.44);
  float lowerBulk = lowerBulkMask *
    smoothstep(0.36, 0.76, broad * 0.48 + hugeFlow * 0.34 + fine * 0.20) *
    (0.52 + smoothstep(0.42, 0.86, rib + hugeFine * 0.14) * 0.48);
  float largeCloudPreserve = clamp(
    upperBlanket * 0.96 +
    upperBlanketCore * 1.18 +
    cinematicSmoke * 0.88 +
    cinematicSmokeCore * 1.10 +
    upperSwathA * 0.86 +
    upperSwathB * 0.70 +
    upperMassCore * 0.78 +
    middleMassCore * 0.58 +
    lowerBulk * 0.34,
    0.0,
    0.96
  );

  col = mix(col, vec3(0.20, 0.0010, 0.0), upperBlanketFeather * 0.42 * uCloudStrength);
  col = mix(col, vec3(0.038, 0.0, 0.0), upperBlanket * 0.70 * uCloudStrength);
  col = mix(col, vec3(0.004, 0.0, 0.0), upperBlanketCore * 0.92 * uCloudStrength);
  col = mix(col, vec3(0.090, 0.0004, 0.0), cinematicSmoke * 0.34 * uCloudStrength);
  col = mix(col, vec3(0.010, 0.0, 0.0), cinematicSmokeCore * 0.72 * uCloudStrength);
  col = mix(col, vec3(0.16, 0.0010, 0.0), upperMass * 0.20 * uCloudStrength);
  col = mix(col, vec3(0.040, 0.0, 0.0), upperSwathA * 0.64 * uCloudStrength);
  col = mix(col, vec3(0.024, 0.0, 0.0), upperSwathB * 0.58 * uCloudStrength);
  col = mix(col, vec3(0.010, 0.0, 0.0), upperMassCore * 0.76 * uCloudStrength);
  col = mix(col, vec3(0.13, 0.0008, 0.0), middleMass * 0.12 * uCloudStrength);
  col = mix(col, vec3(0.020, 0.0, 0.0), middleMassCore * 0.40 * uCloudStrength);
  col = mix(col, vec3(0.018, 0.0, 0.0), lowerBulk * 0.34 * uCloudStrength);

  float horizonBlack = bandMask(y, 0.110, 0.450) * (0.44 + broad * 0.34 + fine * 0.22);
  float sootWall = bandMask(y, 0.185, 0.560) * smoothstep(0.24, 0.66, broad * 0.56 + fine * 0.32 + lowRibs * 0.14);
  col = mix(col, vec3(0.004, 0.0, 0.0), horizonBlack * 0.74 * uCloudStrength);
  col = mix(col, vec3(0.008, 0.0, 0.0), sootWall * 0.58 * uCloudStrength);
  col = mix(col, vec3(0.010, 0.0, 0.0), blackFog * 1.12 * uCloudStrength);
  col = mix(col, vec3(0.000, 0.0, 0.0), blackCore * 0.58 * uCloudStrength);
  col = mix(col, vec3(0.014, 0.0, 0.0), lowDeck * 0.72 * uCloudStrength);
  col = mix(col, vec3(0.026, 0.0, 0.0), midCloud * 0.28 * uCloudStrength);
  col = mix(col, vec3(0.13, 0.001, 0.0), midCloud * midFine * 0.035 * uCloudStrength);
  col = mix(col, vec3(0.070, 0.0004, 0.0), highShelf * 0.040 * uCloudStrength * (1.0 - upperClean * 0.45));

  float mountainX = skyBasis.x * 1.06 + skyBasis.y * 0.13 + uCameraPos.x * 0.00026 - uCameraPos.z * 0.00011;
  float mountainLargeA = pow(0.5 + 0.5 * sin(mountainX * 3.10 + 0.35), 1.18);
  float mountainLargeB = pow(0.5 + 0.5 * sin(mountainX * 4.65 + 2.10), 1.36);
  float mountainMidA = pow(0.5 + 0.5 * sin(mountainX * 7.40 + 1.35), 1.62);
  float mountainMidB = pow(0.5 + 0.5 * sin(mountainX * 10.80 + 3.15), 1.92);
  float mountainCut = pow(0.5 + 0.5 * sin(mountainX * 5.55 + 4.05), 2.25);
  float mountainNoise = fbm(vec2(mountainX * 1.65 + parallax.x * 1.8, 4.35));
  float mountainEdgeNoise = fbm(vec2(mountainX * 7.20 + mountainNoise * 1.4, 8.80));

  float farRidge =
    0.270 +
    mountainLargeA * 0.038 +
    mountainLargeB * 0.024 +
    mountainNoise * 0.014 -
    mountainCut * 0.014;
  float midRidge =
    0.284 +
    mountainLargeA * 0.040 +
    mountainMidA * 0.026 +
    mountainNoise * 0.012 -
    mountainCut * 0.016;
  float nearRidge =
    0.272 +
    mountainLargeA * 0.032 +
    mountainMidA * 0.020 +
    mountainMidB * 0.010 +
    mountainEdgeNoise * 0.007 -
    mountainCut * 0.012;

  float farMountain = ridgeFill(y, farRidge, 0.180, 0.012);
  float midMountain = ridgeFill(y, midRidge, 0.188, 0.010);
  float nearMountain = ridgeFill(y, nearRidge, 0.196, 0.008);
  float ridgeSmoke = softLine(y, farRidge + 0.014, 0.040) * (0.40 + mountainNoise * 0.60);
  float mountainFade = 1.0 - smoothstep(1.02, 1.72, abs(skyBasis.x));
  float mountainBand = smoothstep(0.160, 0.218, y) * (1.0 - smoothstep(0.405, 0.470, y));
  col = mix(col, vec3(0.088, 0.0010, 0.0), farMountain * mountainFade * mountainBand * 0.70);
  col = mix(col, vec3(0.034, 0.0, 0.0), midMountain * mountainFade * mountainBand * 0.78);
  col = mix(col, vec3(0.0), nearMountain * mountainFade * mountainBand * 0.96);
  col = mix(col, vec3(0.010, 0.0, 0.0), ridgeSmoke * mountainFade * mountainBand * 0.24);

  float cleanGate = smoothstep(0.54, 0.82, y);
  float cleanPreserve = clamp(1.0 - blackFog * 0.55 - largeCloudPreserve * 0.95, 0.0, 1.0);
  col = mix(col, cleanTop, cleanGate * 0.24 * cleanPreserve);
  float filmGrain = hash12(vUv * vec2(1365.0, 768.0) + uTime * 0.21) - 0.5;
  col += filmGrain * 0.0025;

  fragColor = vec4(max(col, vec3(0.0)), 1.0);
}`;
