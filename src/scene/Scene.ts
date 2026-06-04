import { Framebuffer } from "../renderer/Framebuffer";
import { Camera } from "./Camera";
import { CloudSheetSystem } from "./CloudSheetSystem";
import { FieldClumpSystem } from "./FieldClumpSystem";
import type { FrameContext } from "./FrameContext";
import { GrassSystem } from "./GrassSystem";
import { HorizonDetailSystem } from "./HorizonDetailSystem";
import type { Input } from "./Input";
import { MountainSystem } from "./MountainSystem";
import { PostProcessSystem } from "./PostProcessSystem";
import { defaultSceneConfig } from "./SceneConfig";
import type { SceneConfig } from "./SceneConfig";
import { SkySystem } from "./SkySystem";
import { TerrainSystem } from "./TerrainSystem";
import { TowerSystem } from "./TowerSystem";
import { WireSystem } from "./WireSystem";

export interface SceneStats {
  fps: number;
  drawCalls: number;
  grassTiles: number;
  grassInstances: number;
  wireSegments: number;
  towerCount: number;
  debugMode: string;
  cameraPosition: [number, number, number];
}

export class Scene {
  private config: SceneConfig;
  private readonly fbo: Framebuffer;
  private camera: Camera;
  private sky: SkySystem;
  private terrain: TerrainSystem;
  private mountains: MountainSystem;
  private horizonDetails: HorizonDetailSystem;
  private towers: TowerSystem;
  private wires: WireSystem;
  private fieldClumps: FieldClumpSystem;
  private grass: GrassSystem;
  private clouds: CloudSheetSystem;
  private post: PostProcessSystem;
  private time = 0;
  private fps = 60;
  private debugMode = 0;
  private seedOffset = 0;

  constructor(private readonly gl: WebGL2RenderingContext, private readonly input: Input) {
    this.config = this.makeInitialConfig();
    this.fbo = new Framebuffer(gl);
    this.camera = new Camera(this.config);
    this.sky = new SkySystem(gl);
    this.terrain = new TerrainSystem(gl, this.config);
    this.mountains = new MountainSystem(gl, this.config);
    this.horizonDetails = new HorizonDetailSystem(gl, this.config);
    this.towers = new TowerSystem(gl, this.config);
    this.wires = new WireSystem(gl, this.config, this.towers);
    this.fieldClumps = new FieldClumpSystem(gl, this.config);
    this.grass = new GrassSystem(gl, this.config);
    this.clouds = new CloudSheetSystem(gl, this.config);
    this.post = new PostProcessSystem(gl);
  }

  frame(dt: number, width: number, height: number): SceneStats {
    this.time += dt;
    this.handleDebugKeys();
    this.fps += ((dt > 0 ? 1 / dt : 60) - this.fps) * 0.08;

    this.fbo.resize(width, height);
    this.camera.update(dt, this.input, width / Math.max(1, height));
    this.grass.update(dt, this.camera.position, this.camera.forward);

    const stats = {
      drawCalls: 0,
      wireSegments: 0,
      grassTiles: 0,
      grassInstances: 0,
      towerCount: 0
    };

    const frame: FrameContext = {
      gl: this.gl,
      time: this.time,
      dt,
      width,
      height,
      view: this.camera.view,
      proj: this.camera.proj,
      viewProj: this.camera.viewProj,
      cameraPos: this.camera.position,
      cameraForward: this.camera.forward,
      cameraRight: this.camera.right,
      cameraUp: this.camera.up,
      config: this.config,
      debugMode: this.debugMode,
      stats
    };

    this.render(frame);

    return {
      fps: this.fps,
      drawCalls: stats.drawCalls,
      grassTiles: stats.grassTiles,
      grassInstances: stats.grassInstances,
      wireSegments: stats.wireSegments,
      towerCount: stats.towerCount,
      debugMode: this.debugModeLabel(),
      cameraPosition: this.camera.position
    };
  }

  dispose(): void {
    this.sky.dispose();
    this.terrain.dispose();
    this.mountains.dispose();
    this.horizonDetails.dispose();
    this.towers.dispose();
    this.wires.dispose();
    this.fieldClumps.dispose();
    this.grass.dispose();
    this.clouds.dispose();
    this.post.dispose();
    this.fbo.dispose();
  }

  private render(frame: FrameContext): void {
    const gl = this.gl;
    this.fbo.bind();
    gl.viewport(0, 0, frame.width, frame.height);
    gl.clearColor(0.025, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.sky.render(frame);
    this.clouds.render(frame);
    this.mountains.render(frame);
    this.terrain.render(frame);
    this.horizonDetails.render(frame);
    this.towers.render(frame);
    this.wires.render(frame);
    this.fieldClumps.render(frame);
    this.grass.render(frame);

    this.fbo.unbind();
    this.post.render(frame, this.fbo.colorTexture, this.fbo.depthTexture);
  }

  private handleDebugKeys(): void {
    if (this.input.consumePressed("Digit1")) this.debugMode = 0;
    if (this.input.consumePressed("Digit2")) this.debugMode = 1;
    if (this.input.consumePressed("Digit3")) this.debugMode = 3;
    if (this.input.consumePressed("Digit4")) this.debugMode = 4;
    if (this.input.consumePressed("Digit5")) this.debugMode = 5;
    if (this.input.consumePressed("KeyR")) this.regenerate();
  }

  private regenerate(): void {
    this.terrain.dispose();
    this.mountains.dispose();
    this.horizonDetails.dispose();
    this.towers.dispose();
    this.wires.dispose();
    this.fieldClumps.dispose();
    this.grass.dispose();
    this.clouds.dispose();
    this.seedOffset += 1;
    this.config = this.makeInitialConfig();
    this.config.seed += this.seedOffset * 101;
    this.camera = new Camera(this.config);
    this.terrain = new TerrainSystem(this.gl, this.config);
    this.mountains = new MountainSystem(this.gl, this.config);
    this.horizonDetails = new HorizonDetailSystem(this.gl, this.config);
    this.towers = new TowerSystem(this.gl, this.config);
    this.wires = new WireSystem(this.gl, this.config, this.towers);
    this.fieldClumps = new FieldClumpSystem(this.gl, this.config);
    this.grass = new GrassSystem(this.gl, this.config);
    this.clouds = new CloudSheetSystem(this.gl, this.config);
  }

  private makeInitialConfig(): SceneConfig {
    const config = structuredClone(defaultSceneConfig);
    const params = new URLSearchParams(window.location.search);
    const quality = params.get("quality");
    const numberParam = (name: string): number | null => {
      if (!params.has(name)) {
        return null;
      }
      const value = Number(params.get(name));
      return Number.isFinite(value) ? value : null;
    };
    const fov = numberParam("fov");
    const dof = numberParam("dof");
    const camX = numberParam("camX");
    const camY = numberParam("camY");
    const camZ = numberParam("camZ");
    const yaw = numberParam("yaw");
    const pitch = numberParam("pitch");

    if (isMobilePortraitViewport()) {
      config.camera.position[0] = -70;
      config.camera.position[2] = 74;
      config.camera.yaw = 3.52;
    }

    if (quality === "high") {
      config.world.terrainResolution = 288;
      config.grass.tileSize = 12;
      config.grass.activeRadius = 72;
      config.grass.instancesPerTileNear = 560;
      config.grass.instancesPerTileMid = 48;
      config.grass.instancesPerTileFar = 0;
      config.grass.densityScale = 2.0;
      config.grass.bladeCount = 6;
      config.grass.bladeSegments = 4;
      config.grass.fieldClumpScale = 1.15;
      config.grass.nearDistance = 30;
      config.grass.midDistance = 52;
      config.grass.farDistance = 72;
      config.grass.windStrength = 0.86;
      config.grass.alphaCutoff = 0.16;
      config.poles.count = 76;
      config.wires.samplesNear = 112;
      config.wires.samplesFar = 42;
      config.wires.windStrength = 0.28;
      config.wires.windSpeed = 1.25;
      config.post.dofStrength = 0.42;
      config.clouds.sheetCount = 6;
      config.performance.horizonDetailScale = 1.0;
      config.performance.farTowerStride = 1;
      config.performance.farWireMode = "full";
    }

    if (params.get("preset") === "low" || quality === "low") {
      config.world.terrainResolution = 128;
      config.grass.activeRadius = 42;
      config.grass.instancesPerTileNear = 48;
      config.grass.instancesPerTileMid = 8;
      config.grass.instancesPerTileFar = 0;
      config.grass.densityScale = 0.85;
      config.grass.bladeCount = 4;
      config.grass.bladeSegments = 3;
      config.grass.fieldClumpScale = 0.75;
      config.grass.nearDistance = 22;
      config.grass.midDistance = 30;
      config.grass.farDistance = 42;
      config.grass.windStrength = 0.55;
      config.poles.count = 40;
      config.wires.samplesNear = 30;
      config.wires.samplesFar = 8;
      config.wires.windStrength = 0.12;
      config.wires.windSpeed = 0.95;
      config.clouds.sheetCount = 4;
      config.post.grain = 0.012;
      config.post.dofStrength = 0.18;
      config.performance.horizonDetailScale = 0.45;
      config.performance.farTowerStride = 3;
      config.performance.farWireMode = "minimal";
    }

    if (fov !== null) {
      config.camera.fovDeg = Math.min(72, Math.max(36, fov));
    }

    if (dof !== null) {
      config.post.dofStrength = Math.min(0.7, Math.max(0, dof));
    }

    if (camX !== null) {
      config.camera.position[0] = Math.min(260, Math.max(-260, camX));
    }

    if (camY !== null) {
      config.camera.position[1] = Math.min(2.2, Math.max(0.8, camY));
    }

    if (camZ !== null) {
      config.camera.position[2] = Math.min(160, Math.max(-80, camZ));
    }

    if (yaw !== null) {
      config.camera.yaw = yaw;
    }

    if (pitch !== null) {
      config.camera.pitch = Math.min(0.64, Math.max(-0.16, pitch));
    }

    return config;
  }

  private debugModeLabel(): string {
    if (this.debugMode === 1) return "fog";
    if (this.debugMode === 3) return "grass-lod";
    if (this.debugMode === 4) return "wire";
    if (this.debugMode === 5) return "no-post";
    return "final";
  }
}

function isMobilePortraitViewport(): boolean {
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  return window.innerHeight > window.innerWidth && (coarsePointer || window.innerWidth <= 640);
}
