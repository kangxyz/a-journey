export type RGB = [number, number, number];

export interface SceneConfig {
  seed: number;
  camera: {
    position: [number, number, number];
    yaw: number;
    pitch: number;
    fovDeg: number;
    near: number;
    far: number;
    moveSpeed: number;
    mouseSensitivity: number;
  };
  world: {
    size: number;
    terrainResolution: number;
    horizonDistance: number;
  };
  sky: {
    topColor: RGB;
    horizonColor: RGB;
    lowerColor: RGB;
    cloudScale: number;
    cloudStrength: number;
    horizonLine: number;
  };
  fog: {
    color: RGB;
    density: number;
    start: number;
    heightMin: number;
    heightMax: number;
    heightStrength: number;
  };
  terrain: {
    baseHeight: number;
    heightAmplitude: number;
    noiseScale: number;
    colorDark: RGB;
    colorLight: RGB;
  };
  grass: {
    tileSize: number;
    activeRadius: number;
    instancesPerTileNear: number;
    instancesPerTileMid: number;
    instancesPerTileFar: number;
    bladeCount: number;
    bladeSegments: number;
    fieldClumpScale: number;
    nearDistance: number;
    midDistance: number;
    farDistance: number;
    windStrength: number;
    alphaCutoff: number;
  };
  poles: {
    count: number;
    corridorCount: number;
    minDistance: number;
    maxDistance: number;
  };
  wires: {
    samplesNear: number;
    samplesFar: number;
    sagMin: number;
    sagMax: number;
    widthNear: number;
    widthFar: number;
    windStrength: number;
    windSpeed: number;
  };
  clouds: {
    sheetCount: number;
    alpha: number;
    speed: number;
  };
  post: {
    redBoost: number;
    greenScale: number;
    blueScale: number;
    contrast: number;
    vignette: number;
    grain: number;
    exposure: number;
    gamma: number;
    dofStrength: number;
    dofFocusDistance: number;
    dofRange: number;
  };
  performance: {
    horizonDetailScale: number;
    farTowerStride: number;
    farWireMode: "full" | "reduced" | "minimal";
  };
}

export const defaultSceneConfig: SceneConfig = {
  seed: 20260602,
  camera: {
    position: [-66, 1.30, 66],
    yaw: 3.025,
    pitch: 0.265,
    fovDeg: 50,
    near: 0.05,
    far: 11200,
    moveSpeed: 9.5,
    mouseSensitivity: 0.0022
  },
  world: {
    size: 2600,
    terrainResolution: 192,
    horizonDistance: 6800
  },
  sky: {
    topColor: [0.94, 0.008, 0.0],
    horizonColor: [0.72, 0.014, 0.0],
    lowerColor: [0.055, 0.0, 0.0],
    cloudScale: 2.35,
    cloudStrength: 0.58,
    horizonLine: 0.28
  },
  fog: {
    color: [0.52, 0.012, 0.0],
    density: 0.011,
    start: 68,
    heightMin: -2,
    heightMax: 14,
    heightStrength: 0.48
  },
  terrain: {
    baseHeight: 0,
    heightAmplitude: 2.2,
    noiseScale: 0.012,
    colorDark: [0.050, 0.132, 0.024],
    colorLight: [0.315, 0.455, 0.092]
  },
  grass: {
    tileSize: 16,
    activeRadius: 48,
    instancesPerTileNear: 64,
    instancesPerTileMid: 10,
    instancesPerTileFar: 1,
    bladeCount: 6,
    bladeSegments: 3,
    fieldClumpScale: 1.08,
    nearDistance: 24,
    midDistance: 42,
    farDistance: 68,
    windStrength: 0.14,
    alphaCutoff: 0.44
  },
  poles: {
    count: 58,
    corridorCount: 4,
    minDistance: 18,
    maxDistance: 640
  },
  wires: {
    samplesNear: 72,
    samplesFar: 24,
    sagMin: 0.06,
    sagMax: 1.10,
    widthNear: 0.028,
    widthFar: 0.023,
    windStrength: 0.22,
    windSpeed: 1.15
  },
  clouds: {
    sheetCount: 5,
    alpha: 0.11,
    speed: 0.020
  },
  post: {
    redBoost: 0.38,
    greenScale: 0.94,
    blueScale: 0.36,
    contrast: 1.32,
    vignette: 0.27,
    grain: 0.020,
    exposure: 1.02,
    gamma: 0.96,
    dofStrength: 0.34,
    dofFocusDistance: 360,
    dofRange: 520
  },
  performance: {
    horizonDetailScale: 0.65,
    farTowerStride: 2,
    farWireMode: "reduced"
  }
};
