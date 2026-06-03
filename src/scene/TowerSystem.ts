import { makePylonMesh } from "../assets/procedural/makePylonMesh";
import { makeForegroundTowerMesh } from "../assets/procedural/makeForegroundTowerMesh";
import { makeUtilityTowerMesh } from "../assets/procedural/makeUtilityTowerMesh";
import { terrainHeight } from "../assets/procedural/makeTerrainMesh";
import { createArrayBuffer, createMeshGpu, disposeMeshGpu } from "../renderer/BufferUtils";
import type { MeshGpu } from "../renderer/BufferUtils";
import { ShaderProgram } from "../renderer/ShaderProgram";
import type { Vec3 } from "../math/Vec3";
import { silhouetteFragmentShader, silhouetteVertexShader } from "../shaders/silhouette";
import type { FrameContext } from "./FrameContext";
import type { SceneConfig } from "./SceneConfig";

type StructureType = "utility" | "lattice" | "narrow" | "foreground";
type AnchorGroup = Vec3[];

interface StructureInstance {
  type: StructureType;
  position: Vec3;
  height: number;
  yaw: number;
  tint: number;
}

export interface WireAnchorCorridor {
  groups: AnchorGroup[];
}

export class TowerSystem {
  private readonly program: ShaderProgram;
  private readonly utilityMesh: MeshGpu;
  private readonly latticeMesh: MeshGpu;
  private readonly narrowMesh: MeshGpu;
  private readonly foregroundMesh: MeshGpu;
  private readonly utilityInstanceBuffer: WebGLBuffer;
  private readonly latticeInstanceBuffer: WebGLBuffer;
  private readonly narrowInstanceBuffer: WebGLBuffer;
  private readonly foregroundInstanceBuffer: WebGLBuffer;
  private readonly utilityInstanceCount: number;
  private readonly latticeInstanceCount: number;
  private readonly narrowInstanceCount: number;
  private readonly foregroundInstanceCount: number;
  readonly wireCorridors: WireAnchorCorridor[] = [];
  readonly towerCount: number;

  constructor(private readonly gl: WebGL2RenderingContext, private readonly config: SceneConfig) {
    this.program = new ShaderProgram(gl, silhouetteVertexShader, silhouetteFragmentShader);
    this.utilityMesh = createMeshGpu(gl, makeUtilityTowerMesh());
    this.latticeMesh = createMeshGpu(gl, makePylonMesh("lattice"));
    this.narrowMesh = createMeshGpu(gl, makePylonMesh("narrow"));
    this.foregroundMesh = createMeshGpu(gl, makeForegroundTowerMesh());

    const { utilities, lattices, narrows, foregrounds } = this.generateStructures();
    this.towerCount = utilities.length + lattices.length + narrows.length + foregrounds.length;
    this.utilityInstanceCount = utilities.length;
    this.latticeInstanceCount = lattices.length;
    this.narrowInstanceCount = narrows.length;
    this.foregroundInstanceCount = foregrounds.length;
    this.utilityInstanceBuffer = createArrayBuffer(gl, this.packInstances(utilities));
    this.latticeInstanceBuffer = createArrayBuffer(gl, this.packInstances(lattices));
    this.narrowInstanceBuffer = createArrayBuffer(gl, this.packInstances(narrows));
    this.foregroundInstanceBuffer = createArrayBuffer(gl, this.packInstances(foregrounds));
    this.attachInstanceAttributes(this.utilityMesh.vao, this.utilityInstanceBuffer);
    this.attachInstanceAttributes(this.latticeMesh.vao, this.latticeInstanceBuffer);
    this.attachInstanceAttributes(this.narrowMesh.vao, this.narrowInstanceBuffer);
    this.attachInstanceAttributes(this.foregroundMesh.vao, this.foregroundInstanceBuffer);
  }

  render(frame: FrameContext): void {
    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);

    this.program.use();
    this.program.setMatrix4("uViewProj", frame.viewProj);
    this.program.set3fv("uCameraPos", frame.cameraPos);
    this.program.set3fv("uFogColor", frame.config.fog.color);
    this.program.set1f("uFogDensity", frame.config.fog.density);
    this.program.set1f("uFogStart", frame.config.fog.start);
    this.program.set1f("uFogHeightMin", frame.config.fog.heightMin);
    this.program.set1f("uFogHeightMax", frame.config.fog.heightMax);
    this.program.set1f("uFogHeightStrength", frame.config.fog.heightStrength);
    this.program.set1i("uDebugMode", frame.debugMode);

    if (this.foregroundInstanceCount > 0) {
      gl.bindVertexArray(this.foregroundMesh.vao);
      gl.drawElementsInstanced(
        gl.TRIANGLES,
        this.foregroundMesh.indexCount,
        this.foregroundMesh.indexType,
        0,
        this.foregroundInstanceCount
      );
      frame.stats.drawCalls += 1;
    }

    if (this.latticeInstanceCount > 0) {
      gl.bindVertexArray(this.latticeMesh.vao);
      gl.drawElementsInstanced(
        gl.TRIANGLES,
        this.latticeMesh.indexCount,
        this.latticeMesh.indexType,
        0,
        this.latticeInstanceCount
      );
      frame.stats.drawCalls += 1;
    }

    if (this.narrowInstanceCount > 0) {
      gl.bindVertexArray(this.narrowMesh.vao);
      gl.drawElementsInstanced(
        gl.TRIANGLES,
        this.narrowMesh.indexCount,
        this.narrowMesh.indexType,
        0,
        this.narrowInstanceCount
      );
      frame.stats.drawCalls += 1;
    }

    if (this.utilityInstanceCount > 0) {
      gl.bindVertexArray(this.utilityMesh.vao);
      gl.drawElementsInstanced(
        gl.TRIANGLES,
        this.utilityMesh.indexCount,
        this.utilityMesh.indexType,
        0,
        this.utilityInstanceCount
      );
      frame.stats.drawCalls += 1;
    }

    frame.stats.towerCount = this.towerCount;
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
  }

  dispose(): void {
    this.program.dispose();
    disposeMeshGpu(this.gl, this.utilityMesh);
    disposeMeshGpu(this.gl, this.latticeMesh);
    disposeMeshGpu(this.gl, this.narrowMesh);
    disposeMeshGpu(this.gl, this.foregroundMesh);
    this.gl.deleteBuffer(this.utilityInstanceBuffer);
    this.gl.deleteBuffer(this.latticeInstanceBuffer);
    this.gl.deleteBuffer(this.narrowInstanceBuffer);
    this.gl.deleteBuffer(this.foregroundInstanceBuffer);
  }

  private generateStructures(): {
    utilities: StructureInstance[];
    lattices: StructureInstance[];
    narrows: StructureInstance[];
    foregrounds: StructureInstance[];
  } {
    const utilities: StructureInstance[] = [];
    const lattices: StructureInstance[] = [];
    const narrows: StructureInstance[] = [];
    const foregrounds: StructureInstance[] = [];
    const visibleStructures = new Set<StructureInstance>();
    const add = (
      type: StructureType,
      x: number,
      z: number,
      height: number,
      yaw: number,
      tint?: number
    ): StructureInstance => {
      const distanceFade = tint ?? Math.min(1, Math.max(0, (-z - 70) / 760));
      const instance: StructureInstance = {
        type,
        position: [x, terrainHeight(x, z, this.config.seed, this.config.terrain.heightAmplitude), z],
        height,
        yaw,
        tint: distanceFade
      };
      if (type === "foreground") foregrounds.push(instance);
      else if (type === "lattice") lattices.push(instance);
      else if (type === "narrow") narrows.push(instance);
      else utilities.push(instance);
      return instance;
    };

    const addBundleChain = (chain: StructureInstance[], group: string, count = 1): void => {
      for (const instance of chain) {
        visibleStructures.add(instance);
      }

      const groups: AnchorGroup[] = [];
      for (let i = 0; i < count; i++) {
        groups.push(
          chain.map((instance) => {
            const offsets = this.bundleOffsets(instance.type, group);
            return this.anchorWorld(instance, group, offsets[Math.min(i, offsets.length - 1)] ?? [0, 0, 0]);
          })
        );
      }
      this.wireCorridors.push({ groups });
    };

    const foregroundPylon = add("foreground", -166, -124, 158, 0.016, 0);
    const heroPylon = add("lattice", -174, -245, 118, 0.018, 0);
    const leftSubstation = add("narrow", -326, -250, 42, 0.08, 0.20);
    const leftRelay = add("narrow", -264, -342, 34, 0.05, 0.36);
    const midRelay = add("lattice", 68, -294, 48, -0.025, 0.34);
    const rightRelay = add("lattice", 268, -430, 44, -0.105, 0.48);
    const rightAnchor = add("lattice", 548, -548, 38, -0.06, 0.62);
    const farRightAnchor = add("narrow", 802, -720, 30, -0.08, 0.78);

    const skylineNear = [
      add("narrow", -560, -500, 30, 0.05, 0.58),
      add("utility", -438, -510, 21, -0.01, 0.60),
      add("utility", -334, -532, 24, 0.02, 0.62),
      add("narrow", -196, -558, 33, 0.05, 0.64),
      add("utility", -58, -586, 20, -0.02, 0.66),
      add("lattice", 118, -612, 38, -0.04, 0.68),
      add("utility", 254, -632, 22, 0.03, 0.70),
      add("narrow", 410, -654, 34, -0.06, 0.72),
      add("utility", 552, -686, 21, 0.02, 0.76),
      add("narrow", 712, -720, 31, -0.05, 0.80),
      add("utility", 878, -756, 20, 0.01, 0.82),
      add("narrow", 1040, -794, 29, -0.04, 0.84)
    ];

    const skylineFar = [
      add("utility", -760, -940, 15, 0.00, 0.84),
      add("narrow", -588, -985, 22, 0.03, 0.86),
      add("utility", -418, -1030, 14, -0.01, 0.88),
      add("narrow", -214, -1080, 20, 0.04, 0.90),
      add("utility", -38, -1130, 13, 0.02, 0.92),
      add("narrow", 188, -1182, 21, -0.03, 0.94),
      add("utility", 410, -1235, 14, -0.02, 0.95),
      add("narrow", 642, -1294, 20, -0.05, 0.96),
      add("utility", 872, -1350, 13, 0.01, 0.97),
      add("utility", 1068, -1398, 15, -0.01, 0.98),
      add("narrow", 1260, -1452, 19, -0.04, 0.99)
    ];

    const skylineDistant = [
      add("utility", -1040, -1620, 8, -0.01, 1.0),
      add("narrow", -862, -1685, 14, 0.04, 1.0),
      add("utility", -706, -1742, 8, 0.02, 1.0),
      add("lattice", -526, -1810, 17, -0.03, 1.0),
      add("utility", -362, -1872, 8, 0.01, 1.0),
      add("narrow", -178, -1934, 13, 0.04, 1.0),
      add("utility", -10, -2000, 7, -0.02, 1.0),
      add("narrow", 176, -2060, 14, -0.04, 1.0),
      add("utility", 362, -2128, 8, 0.01, 1.0),
      add("lattice", 552, -2198, 18, -0.05, 1.0),
      add("utility", 744, -2262, 8, 0.02, 1.0),
      add("narrow", 944, -2328, 13, -0.03, 1.0),
      add("utility", 1138, -2394, 7, 0.0, 1.0)
    ];

    const skylinePoleline = [
      add("utility", -910, -980, 22, -0.01, 0.90),
      add("utility", -760, -1012, 25, 0.02, 0.91),
      add("narrow", -604, -1048, 38, 0.03, 0.92),
      add("utility", -458, -1082, 24, -0.02, 0.93),
      add("utility", -318, -1122, 28, 0.01, 0.94),
      add("narrow", -170, -1160, 40, 0.04, 0.95),
      add("utility", -28, -1198, 24, 0.00, 0.96),
      add("utility", 118, -1236, 30, -0.02, 0.96),
      add("narrow", 276, -1280, 42, -0.04, 0.97),
      add("utility", 432, -1322, 26, 0.01, 0.97),
      add("utility", 588, -1364, 31, 0.02, 0.98),
      add("narrow", 754, -1410, 39, -0.04, 0.98),
      add("utility", 920, -1454, 25, 0.01, 0.99),
      add("utility", 1090, -1498, 28, -0.01, 0.99),
      add("utility", 1246, -1542, 24, 0.02, 1.0),
      add("narrow", 1406, -1588, 32, -0.04, 1.0)
    ];

    const horizonGrid = [
      add("utility", -1060, -705, 34, -0.01, 0.78),
      add("narrow", -980, -718, 52, 0.02, 0.79),
      add("utility", -904, -735, 36, 0.01, 0.80),
      add("lattice", -818, -758, 76, -0.04, 0.81),
      add("utility", -742, -774, 38, 0.02, 0.82),
      add("narrow", -660, -795, 56, 0.03, 0.83),
      add("utility", -584, -812, 36, -0.02, 0.84),
      add("utility", -506, -832, 40, 0.01, 0.85),
      add("narrow", -424, -854, 60, 0.04, 0.86),
      add("utility", -344, -876, 38, -0.01, 0.87),
      add("lattice", -260, -900, 80, -0.03, 0.88),
      add("utility", -180, -920, 36, 0.02, 0.89),
      add("utility", -98, -944, 42, -0.01, 0.90),
      add("narrow", -16, -966, 62, 0.04, 0.91),
      add("utility", 68, -990, 38, 0.01, 0.92),
      add("utility", 152, -1014, 44, -0.02, 0.93),
      add("lattice", 240, -1040, 84, -0.04, 0.94),
      add("utility", 326, -1064, 39, 0.01, 0.94),
      add("narrow", 414, -1090, 64, -0.05, 0.95),
      add("utility", 502, -1114, 41, 0.02, 0.95),
      add("utility", 590, -1138, 37, -0.01, 0.96),
      add("narrow", 680, -1164, 60, 0.04, 0.96),
      add("utility", 770, -1188, 40, 0.01, 0.97),
      add("lattice", 862, -1216, 82, -0.05, 0.97),
      add("utility", 952, -1240, 38, 0.02, 0.98),
      add("narrow", 1044, -1268, 58, -0.03, 0.98),
      add("utility", 1136, -1294, 36, 0.00, 0.99),
      add("utility", 1228, -1320, 43, 0.02, 0.99),
      add("narrow", 1320, -1348, 57, -0.04, 1.0),
      add("utility", 1412, -1376, 35, 0.01, 1.0),
      add("utility", 1504, -1404, 39, -0.01, 1.0),
      add("narrow", 1596, -1432, 55, -0.04, 1.0)
    ];

    const distantGrid = [
      add("utility", -1400, -1450, 16, -0.01, 1.0),
      add("utility", -1260, -1508, 19, 0.02, 1.0),
      add("narrow", -1124, -1562, 28, 0.03, 1.0),
      add("utility", -986, -1620, 17, -0.02, 1.0),
      add("utility", -850, -1672, 21, 0.01, 1.0),
      add("narrow", -708, -1730, 31, 0.04, 1.0),
      add("utility", -570, -1788, 18, -0.01, 1.0),
      add("lattice", -430, -1844, 46, -0.04, 1.0),
      add("utility", -290, -1902, 17, 0.02, 1.0),
      add("utility", -150, -1960, 20, 0.00, 1.0),
      add("narrow", -8, -2022, 30, 0.04, 1.0),
      add("utility", 134, -2086, 18, -0.02, 1.0),
      add("utility", 276, -2148, 22, 0.01, 1.0),
      add("lattice", 420, -2212, 48, -0.05, 1.0),
      add("utility", 566, -2278, 17, 0.01, 1.0),
      add("narrow", 712, -2340, 29, -0.03, 1.0),
      add("utility", 858, -2408, 19, 0.02, 1.0),
      add("utility", 1006, -2472, 16, 0.00, 1.0),
      add("narrow", 1152, -2534, 27, -0.04, 1.0),
      add("utility", 1298, -2600, 18, 0.01, 1.0)
    ];

    const horizonPylonWall = [
      add("narrow", -650, -660, 62, 0.03, 0.80),
      add("lattice", -540, -688, 78, -0.04, 0.82),
      add("utility", -430, -714, 48, 0.01, 0.84),
      add("narrow", -318, -742, 66, 0.04, 0.86),
      add("lattice", -204, -770, 82, -0.03, 0.88),
      add("utility", -92, -798, 50, -0.01, 0.90),
      add("narrow", 24, -828, 68, 0.04, 0.91),
      add("utility", 136, -858, 52, 0.01, 0.92),
      add("lattice", 252, -890, 86, -0.04, 0.93),
      add("narrow", 370, -924, 70, -0.05, 0.94),
      add("utility", 486, -956, 50, 0.02, 0.95),
      add("narrow", 604, -990, 66, 0.04, 0.96),
      add("lattice", 724, -1024, 80, -0.05, 0.97),
      add("utility", 842, -1058, 48, 0.02, 0.98),
      add("narrow", 960, -1094, 64, -0.04, 0.99),
      add("lattice", 1080, -1128, 76, -0.05, 1.0)
    ];

    const visibleHorizonRow = ([
      ["utility", -930, -520, 34, -0.02, 0.70],
      ["narrow", -872, -548, 70, 0.03, 0.72],
      ["utility", -814, -575, 42, 0.01, 0.73],
      ["lattice", -742, -602, 128, -0.045, 0.75],
      ["utility", -675, -626, 45, 0.02, 0.77],
      ["narrow", -602, -666, 82, 0.04, 0.79],
      ["utility", -536, -646, 38, -0.02, 0.78],
      ["lattice", -462, -716, 112, -0.035, 0.82],
      ["utility", -390, -760, 50, 0.01, 0.84],
      ["narrow", -326, -708, 66, 0.04, 0.82],
      ["utility", -260, -812, 44, -0.01, 0.86],
      ["lattice", -184, -842, 142, -0.045, 0.88],
      ["utility", -112, -876, 46, 0.02, 0.89],
      ["narrow", -40, -792, 74, 0.035, 0.86],
      ["utility", 28, -930, 40, -0.01, 0.91],
      ["lattice", 104, -970, 118, -0.04, 0.92],
      ["utility", 176, -1008, 54, 0.01, 0.93],
      ["narrow", 250, -940, 88, 0.04, 0.91],
      ["utility", 320, -1054, 42, -0.02, 0.94],
      ["lattice", 398, -1102, 152, -0.05, 0.95],
      ["utility", 470, -1140, 50, 0.02, 0.96],
      ["narrow", 548, -1048, 72, 0.035, 0.94],
      ["utility", 616, -1188, 46, -0.01, 0.97],
      ["lattice", 700, -1228, 126, -0.05, 0.98],
      ["utility", 778, -1270, 55, 0.01, 0.99],
      ["narrow", 858, -1148, 84, -0.03, 0.96],
      ["utility", 934, -1328, 42, 0.02, 1.0],
      ["lattice", 1016, -1366, 144, -0.05, 1.0],
      ["utility", 1092, -1288, 52, 0.01, 1.0],
      ["narrow", 1172, -1218, 78, -0.04, 0.99],
      ["utility", 1250, -1388, 44, 0.02, 1.0],
      ["lattice", 1338, -1318, 116, -0.045, 1.0],
      ["utility", 1416, -1260, 48, 0.01, 1.0],
      ["narrow", 1502, -1342, 86, -0.04, 1.0],
      ["utility", 1584, -1226, 40, 0.02, 1.0],
      ["lattice", 1668, -1308, 132, -0.05, 1.0]
    ] as Array<[StructureType, number, number, number, number, number]>).map(([type, x, z, height, yaw, tint]) =>
      add(type, x, z, height, yaw, tint)
    );

    const upperRightOffscreen = add("lattice", 1640, -220, 140, -0.08, 0.76);
    const upperRightLowOffscreen = add("lattice", 1580, -390, 104, -0.10, 0.84);
    const upperRightFar = add("lattice", 1780, -620, 140, -0.11, 0.90);
    const horizonRightOffscreen = add("narrow", 1280, -820, 46, -0.06, 0.96);
    const horizonLeftOffscreen = add("narrow", -1120, -800, 43, 0.06, 0.96);
    const visibleHorizonLeft = add("narrow", -1040, -515, 64, 0.04, 0.76);
    const visibleHorizonRight = add("narrow", 1740, -1240, 70, -0.05, 1.0);
    const farHorizonRight = add("narrow", 1540, -2620, 22, -0.05, 1.0);
    const farHorizonLeft = add("narrow", -1420, -1580, 20, 0.05, 1.0);

    const farStride = Math.max(1, this.config.performance.farTowerStride);
    const farWireMode = this.config.performance.farWireMode;
    const skylineFarDetail = this.thinChain(skylineFar, farStride);
    const skylinePolelineDetail = this.thinChain(skylinePoleline, farStride);
    const horizonGridDetail = this.thinChain(horizonGrid, farStride);
    const horizonPylonWallDetail = this.thinChain(horizonPylonWall, farStride);
    const visibleHorizonRowDetail = this.thinChain(visibleHorizonRow, farStride);
    const skylineDistantDetail = this.thinChain(skylineDistant, farStride);
    const distantGridDetail = this.thinChain(distantGrid, farStride);

    addBundleChain([foregroundPylon, upperRightOffscreen], "leftHigh", 1);
    addBundleChain([foregroundPylon, upperRightOffscreen], "rightHigh", 1);
    addBundleChain([foregroundPylon, upperRightLowOffscreen], "leftMid", 1);
    addBundleChain([foregroundPylon, upperRightLowOffscreen], "rightMid", 1);
    addBundleChain([heroPylon, upperRightFar], "leftHigh", 1);
    addBundleChain([heroPylon, upperRightFar], "rightHigh", 1);
    addBundleChain([heroPylon, upperRightLowOffscreen], "leftMid", 1);
    addBundleChain([heroPylon, upperRightLowOffscreen], "rightMid", 1);

    addBundleChain([heroPylon, midRelay, rightRelay, rightAnchor], "leftHigh", 1);
    addBundleChain([heroPylon, midRelay, rightRelay, rightAnchor], "rightHigh", 1);
    addBundleChain([heroPylon, midRelay, rightRelay, rightAnchor, farRightAnchor], "leftMid", 1);
    addBundleChain([heroPylon, midRelay, rightRelay, rightAnchor, farRightAnchor], "rightMid", 1);

    addBundleChain([heroPylon, midRelay, rightRelay, rightAnchor], "center", 1);
    addBundleChain([leftSubstation, leftRelay, ...skylineNear.slice(3, 8)], "center", 1);
    addBundleChain([leftSubstation, heroPylon, midRelay, rightRelay, ...skylineNear.slice(7)], "leftMid", 1);
    addBundleChain([leftRelay, ...skylineNear, horizonRightOffscreen], "leftHigh", 1);
    addBundleChain([horizonLeftOffscreen, ...skylineNear, horizonRightOffscreen], "rightHigh", 1);
    addBundleChain([horizonLeftOffscreen, ...skylineNear, horizonRightOffscreen], "center", 1);

    if (farWireMode === "full") {
      addBundleChain([horizonLeftOffscreen, ...skylineNear, horizonRightOffscreen], "leftMid", 1);
      addBundleChain([horizonLeftOffscreen, ...skylineNear, horizonRightOffscreen], "rightMid", 1);
      addBundleChain([horizonLeftOffscreen, ...skylineFar, horizonRightOffscreen], "center", 1);
      addBundleChain([horizonLeftOffscreen, ...skylineFar, horizonRightOffscreen], "leftHigh", 1);
      addBundleChain([horizonLeftOffscreen, ...skylineFar, horizonRightOffscreen], "rightHigh", 1);
      addBundleChain([horizonLeftOffscreen, ...skylinePoleline, horizonRightOffscreen], "center", 1);
      addBundleChain([horizonLeftOffscreen, ...skylinePoleline, horizonRightOffscreen], "leftHigh", 1);
      addBundleChain([horizonLeftOffscreen, ...skylinePoleline, horizonRightOffscreen], "rightHigh", 1);
      addBundleChain([horizonLeftOffscreen, ...horizonGrid, horizonRightOffscreen], "center", 1);
      addBundleChain([horizonLeftOffscreen, ...horizonGrid, horizonRightOffscreen], "leftHigh", 1);
      addBundleChain([horizonLeftOffscreen, ...horizonGrid, horizonRightOffscreen], "rightHigh", 1);
      addBundleChain([horizonLeftOffscreen, ...horizonPylonWall, horizonRightOffscreen], "center", 1);
      addBundleChain([horizonLeftOffscreen, ...horizonPylonWall, horizonRightOffscreen], "leftHigh", 1);
      addBundleChain([horizonLeftOffscreen, ...horizonPylonWall, horizonRightOffscreen], "rightHigh", 1);
      addBundleChain([visibleHorizonLeft, ...visibleHorizonRow, visibleHorizonRight], "center", 1);
      addBundleChain([visibleHorizonLeft, ...visibleHorizonRow, visibleHorizonRight], "leftHigh", 1);
      addBundleChain([visibleHorizonLeft, ...visibleHorizonRow, visibleHorizonRight], "rightHigh", 1);
      addBundleChain([visibleHorizonLeft, ...visibleHorizonRow, visibleHorizonRight], "leftMid", 1);
      addBundleChain([visibleHorizonLeft, ...visibleHorizonRow, visibleHorizonRight], "rightMid", 1);
      addBundleChain([farHorizonLeft, ...skylineDistant, farHorizonRight], "center", 1);
      addBundleChain([farHorizonLeft, ...distantGrid, farHorizonRight], "center", 1);
      addBundleChain([farHorizonLeft, ...distantGrid, farHorizonRight], "leftHigh", 1);
      addBundleChain([farHorizonLeft, ...distantGrid, farHorizonRight], "rightHigh", 1);
    } else {
      addBundleChain([horizonLeftOffscreen, ...skylineFarDetail, horizonRightOffscreen], "center", 1);
      addBundleChain([horizonLeftOffscreen, ...skylinePolelineDetail, horizonRightOffscreen], "center", 1);
      addBundleChain([horizonLeftOffscreen, ...horizonGridDetail, horizonRightOffscreen], "center", 1);
      addBundleChain([visibleHorizonLeft, ...visibleHorizonRowDetail, visibleHorizonRight], "center", 1);
      addBundleChain([farHorizonLeft, ...skylineDistantDetail, farHorizonRight], "center", 1);
      addBundleChain([farHorizonLeft, ...distantGridDetail, farHorizonRight], "center", 1);

      if (farWireMode === "reduced") {
        addBundleChain([horizonLeftOffscreen, ...skylineFarDetail, horizonRightOffscreen], "leftHigh", 1);
        addBundleChain([horizonLeftOffscreen, ...horizonGridDetail, horizonRightOffscreen], "leftHigh", 1);
        addBundleChain([horizonLeftOffscreen, ...horizonPylonWallDetail, horizonRightOffscreen], "center", 1);
        addBundleChain([visibleHorizonLeft, ...visibleHorizonRowDetail, visibleHorizonRight], "leftHigh", 1);
        addBundleChain([visibleHorizonLeft, ...visibleHorizonRowDetail, visibleHorizonRight], "rightHigh", 1);
      }
    }

    const utilityRow = skylineNear.filter((instance) => instance.type === "utility");
    if (utilityRow.length > 1) {
      addBundleChain(utilityRow, "center", 1);
    }

    const poleUtilityRow = (farWireMode === "full" ? skylinePoleline : skylinePolelineDetail).filter(
      (instance) => instance.type === "utility"
    );
    if (farWireMode !== "minimal" && poleUtilityRow.length > 1) {
      addBundleChain(poleUtilityRow, "center", 1);
    }

    return {
      utilities: utilities.filter((instance) => visibleStructures.has(instance)),
      lattices: lattices.filter((instance) => visibleStructures.has(instance)),
      narrows: narrows.filter((instance) => visibleStructures.has(instance)),
      foregrounds: foregrounds.filter((instance) => visibleStructures.has(instance))
    };
  }

  private thinChain(chain: StructureInstance[], stride: number): StructureInstance[] {
    if (stride <= 1) {
      return chain;
    }

    return chain.filter(
      (instance, index) => index === 0 || index === chain.length - 1 || index % stride === 0 || instance.type === "lattice"
    );
  }

  private anchorWorld(instance: StructureInstance, group: string, localOffset: Vec3 = [0, 0, 0]): Vec3 {
    const local = this.localAnchor(instance.type, group);
    const scaled: Vec3 = [
      (local[0] + localOffset[0]) * instance.height,
      (local[1] + localOffset[1]) * instance.height,
      (local[2] + localOffset[2]) * instance.height
    ];
    const s = Math.sin(instance.yaw);
    const c = Math.cos(instance.yaw);
    return [
      instance.position[0] + scaled[0] * c - scaled[2] * s,
      instance.position[1] + scaled[1],
      instance.position[2] + scaled[0] * s + scaled[2] * c
    ];
  }

  private bundleOffsets(type: StructureType, group: string): Vec3[] {
    if (group === "center") {
      return [[0, 0, 0]];
    }

    if (type === "foreground") {
      return [
        [0, 0, 0],
        [0.012, -0.006, -0.012],
        [0.024, -0.012, 0.012]
      ];
    }

    if (type === "lattice") {
      return [
        [0, 0, 0],
        [0, -0.006, -0.012],
        [0, -0.012, 0.012]
      ];
    }

    if (type === "narrow") {
      return [
        [0, 0, 0],
        [0, -0.007, 0.01]
      ];
    }

    return [
      [0, 0, 0],
      [0, -0.006, 0.008]
    ];
  }

  private localAnchor(type: StructureType, group: string): Vec3 {
    if (type === "foreground") {
      if (group === "leftHigh") return [0.15, 0.875, 0];
      if (group === "rightHigh") return [0.24, 0.875, 0];
      if (group === "leftMid") return [0.12, 0.735, 0];
      if (group === "rightMid") return [0.20, 0.735, 0];
      return [0.075, 1.02, 0];
    }

    if (type === "lattice") {
      if (group === "leftHigh") return [-0.205, 0.8, 0];
      if (group === "rightHigh") return [0.205, 0.8, 0];
      if (group === "leftMid") return [-0.165, 0.635, 0];
      if (group === "rightMid") return [0.165, 0.635, 0];
      return [0, 0.935, 0];
    }

    if (type === "narrow") {
      if (group === "leftHigh") return [-0.13, 0.77, 0];
      if (group === "rightHigh") return [0.13, 0.77, 0];
      if (group === "leftMid") return [-0.108, 0.61, 0];
      if (group === "rightMid") return [0.108, 0.61, 0];
      return [0, 0.875, 0];
    }

    if (group === "left") return [-0.155, 0.82, 0];
    if (group === "right") return [0.155, 0.82, 0];
    return [0, 0.76, 0];
  }

  private packInstances(instances: StructureInstance[]): Float32Array {
    const data = new Float32Array(instances.length * 8);
    let o = 0;
    for (const instance of instances) {
      data[o++] = instance.position[0];
      data[o++] = instance.position[1];
      data[o++] = instance.position[2];
      data[o++] = instance.height;
      data[o++] = instance.yaw;
      data[o++] = instance.tint;
      data[o++] = 0;
      data[o++] = 0;
    }
    return data;
  }

  private attachInstanceAttributes(vao: WebGLVertexArrayObject, buffer: WebGLBuffer): void {
    const gl = this.gl;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const stride = 8 * 4;
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(3, 1);
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, stride, 4 * 4);
    gl.vertexAttribDivisor(4, 1);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
}
