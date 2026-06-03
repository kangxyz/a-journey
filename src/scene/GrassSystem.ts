import { makeGrassTuftMesh } from "../assets/procedural/makeGrassTuftMesh";
import { terrainHeight } from "../assets/procedural/makeTerrainMesh";
import { fbm2, smoothstep } from "../math/Noise";
import { RNG } from "../math/RNG";
import type { Vec3 } from "../math/Vec3";
import { vec3 } from "../math/Vec3";
import { createArrayBuffer, createMeshGpu, disposeMeshGpu, updateArrayBuffer } from "../renderer/BufferUtils";
import type { MeshGpu } from "../renderer/BufferUtils";
import { ShaderProgram } from "../renderer/ShaderProgram";
import { grassFragmentShader, grassVertexShader } from "../shaders/grass";
import type { FrameContext } from "./FrameContext";
import type { SceneConfig } from "./SceneConfig";

interface GrassInstance {
  x: number;
  z: number;
  y: number;
  rotation: number;
  height: number;
  width: number;
  jitter: number;
  phase: number;
  variant: number;
}

interface GrassTile {
  ix: number;
  iz: number;
  center: Vec3;
  instances: GrassInstance[];
}

export class GrassSystem {
  private readonly program: ShaderProgram;
  private readonly mesh: MeshGpu;
  private readonly instanceBuffer: WebGLBuffer;
  private readonly tiles = new Map<string, GrassTile>();
  private instanceCount = 0;
  private activeTileCount = 0;
  private lastRebuildPos: Vec3 = [Number.POSITIVE_INFINITY, 0, Number.POSITIVE_INFINITY];
  private lastCenterKey = "";

  constructor(private readonly gl: WebGL2RenderingContext, private readonly config: SceneConfig) {
    this.program = new ShaderProgram(gl, grassVertexShader, grassFragmentShader);
    this.mesh = createMeshGpu(gl, makeGrassTuftMesh(config.grass.bladeSegments, config.grass.bladeCount));
    this.instanceBuffer = createArrayBuffer(gl, new Float32Array(10), gl.DYNAMIC_DRAW);
    this.attachInstanceAttributes();
  }

  update(_dt: number, cameraPos: Vec3, cameraForward: Vec3): void {
    const tileSize = this.config.grass.tileSize;
    const centerIx = Math.floor(cameraPos[0] / tileSize);
    const centerIz = Math.floor(cameraPos[2] / tileSize);
    const centerKey = `${centerIx},${centerIz}`;
    const moved = vec3.length(vec3.sub(cameraPos, this.lastRebuildPos)) > 4.0;

    if (centerKey === this.lastCenterKey && !moved) {
      return;
    }

    this.lastCenterKey = centerKey;
    this.lastRebuildPos = [...cameraPos];
    const radiusTiles = Math.ceil(this.config.grass.activeRadius / tileSize);
    const needed = new Set<string>();
    const active: GrassTile[] = [];

    for (let dz = -radiusTiles; dz <= radiusTiles; dz++) {
      for (let dx = -radiusTiles; dx <= radiusTiles; dx++) {
        const ix = centerIx + dx;
        const iz = centerIz + dz;
        const key = this.key(ix, iz);
        const cx = (ix + 0.5) * tileSize;
        const cz = (iz + 0.5) * tileSize;
        const toTile: Vec3 = [cx - cameraPos[0], 0, cz - cameraPos[2]];
        const dist = vec3.length(toTile);

        if (dist > this.config.grass.activeRadius) {
          continue;
        }

        const forwardDot = dist > 0.001 ? vec3.dot(vec3.normalize(toTile), vec3.normalize([cameraForward[0], 0, cameraForward[2]])) : 1;
        if (dist > 28 && forwardDot < -0.32) {
          continue;
        }

        needed.add(key);
        const tile = this.tiles.get(key) ?? this.createTile(ix, iz);
        this.tiles.set(key, tile);
        active.push(tile);
      }
    }

    for (const key of this.tiles.keys()) {
      if (!needed.has(key)) {
        this.tiles.delete(key);
      }
    }

    this.rebuildInstanceBuffer(active, cameraPos);
  }

  render(frame: FrameContext): void {
    if (this.instanceCount === 0) {
      return;
    }

    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);

    this.program.use();
    this.program.setMatrix4("uViewProj", frame.viewProj);
    this.program.set1f("uTime", frame.time);
    this.program.set1f("uWindStrength", frame.config.grass.windStrength);
    this.program.set3fv("uCameraPos", frame.cameraPos);
    this.program.set3fv("uFogColor", frame.config.fog.color);
    this.program.set1f("uFogDensity", frame.config.fog.density);
    this.program.set1f("uFogStart", frame.config.fog.start);
    this.program.set1f("uFogHeightMin", frame.config.fog.heightMin);
    this.program.set1f("uFogHeightMax", frame.config.fog.heightMax);
    this.program.set1f("uFogHeightStrength", frame.config.fog.heightStrength);
    this.program.set1f("uAlphaCutoff", frame.config.grass.alphaCutoff);
    this.program.set1i("uDebugMode", frame.debugMode);

    gl.bindVertexArray(this.mesh.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, this.mesh.indexCount, this.mesh.indexType, 0, this.instanceCount);
    gl.bindVertexArray(null);
    gl.enable(gl.CULL_FACE);

    frame.stats.drawCalls += 1;
    frame.stats.grassTiles = this.activeTileCount;
    frame.stats.grassInstances = this.instanceCount;
  }

  dispose(): void {
    this.program.dispose();
    disposeMeshGpu(this.gl, this.mesh);
    this.gl.deleteBuffer(this.instanceBuffer);
  }

  private rebuildInstanceBuffer(active: GrassTile[], cameraPos: Vec3): void {
    const packed: number[] = [];
    this.activeTileCount = active.length;

    for (const tile of active) {
      const dist = Math.hypot(tile.center[0] - cameraPos[0], tile.center[2] - cameraPos[2]);
      let count = tile.instances.length;
      let lodFade = 1;

      if (dist > this.config.grass.midDistance) {
        count = Math.min(count, this.config.grass.instancesPerTileFar);
        lodFade = 1 - smoothstep(this.config.grass.midDistance, this.config.grass.farDistance, dist) * 0.55;
      } else if (dist > this.config.grass.nearDistance) {
        count = Math.min(count, this.config.grass.instancesPerTileMid);
        lodFade = 0.82;
      }

      for (let i = 0; i < count; i++) {
        const instance = tile.instances[i];
        if (!instance) continue;
        if (Math.hypot(instance.x - cameraPos[0], instance.z - cameraPos[2]) < 2.6) {
          continue;
        }
        packed.push(
          instance.x,
          instance.z,
          instance.y,
          instance.rotation,
          instance.height,
          instance.width,
          instance.jitter,
          instance.phase,
          lodFade,
          instance.variant
        );
      }
    }

    this.instanceCount = packed.length / 10;
    updateArrayBuffer(this.gl, this.instanceBuffer, new Float32Array(packed), this.gl.DYNAMIC_DRAW);
  }

  private createTile(ix: number, iz: number): GrassTile {
    const tileSize = this.config.grass.tileSize;
    const seed = (this.config.seed ^ (ix * 73856093) ^ (iz * 19349663)) >>> 0;
    const rng = new RNG(seed);
    const instances: GrassInstance[] = [];
    const maxCount = this.config.grass.instancesPerTileNear;
    const startX = ix * tileSize;
    const startZ = iz * tileSize;

    for (let i = 0; i < maxCount; i++) {
      const x = startX + rng.next() * tileSize;
      const z = startZ + rng.next() * tileSize;
      const patches = fbm2(x * 0.028, z * 0.028, this.config.seed + 20, 4);
      const fine = fbm2(x * 0.12, z * 0.12, this.config.seed + 21, 3);
      const rows = 0.5 + 0.5 * Math.sin(x * 0.18 + z * 0.085 + patches * 4.2);
      const clump = smoothstep(0.56, 0.86, patches * 0.72 + fine * 0.20 + rows * 0.14);
      const wetEdge = 1 - smoothstep(38, 150, Math.max(0, -z));
      const densityField = smoothstep(0.10, 0.70, patches * 0.58 + fine * 0.28 + rows * 0.22);
      const density = Math.min(1, 0.18 + densityField * 0.78 + wetEdge * 0.10);

      if (rng.next() > density) {
        continue;
      }

      const variant = rng.next();
      const height = rng.float(0.060, 0.245) * (0.78 + rows * 0.18 + clump * 0.40 + wetEdge * 0.34);
      const width = rng.float(0.008, 0.024) * (0.84 + clump * 0.30 + wetEdge * 0.12);

      instances.push({
        x,
        z,
        y: terrainHeight(x, z, this.config.seed, this.config.terrain.heightAmplitude),
        rotation: rng.float(0, Math.PI * 2),
        height,
        width,
        jitter: rng.float(-1, 1),
        phase: rng.float(0, Math.PI * 2),
        variant
      });
    }

    instances.sort((a, b) => b.height - a.height);
    return {
      ix,
      iz,
      center: [startX + tileSize * 0.5, 0, startZ + tileSize * 0.5],
      instances
    };
  }

  private attachInstanceAttributes(): void {
    const gl = this.gl;
    gl.bindVertexArray(this.mesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    const stride = 10 * 4;
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(3, 1);
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, stride, 2 * 4);
    gl.vertexAttribDivisor(4, 1);
    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 4, gl.FLOAT, false, stride, 6 * 4);
    gl.vertexAttribDivisor(5, 1);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private key(ix: number, iz: number): string {
    return `${ix},${iz}`;
  }
}
