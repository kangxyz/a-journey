import { makeGrassTuftMesh } from "../assets/procedural/makeGrassTuftMesh";
import { terrainHeight } from "../assets/procedural/makeTerrainMesh";
import { fbm2, smoothstep } from "../math/Noise";
import { RNG } from "../math/RNG";
import type { Vec3 } from "../math/Vec3";
import { vec3 } from "../math/Vec3";
import { createArrayBuffer, createMeshGpu, disposeMeshGpu } from "../renderer/BufferUtils";
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
  lodRank: number;
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
  private instanceData: Float32Array;
  private instanceCapacity = 16384;
  private instanceCount = 0;
  private activeTileCount = 0;
  private lastRebuildPos: Vec3 = [Number.POSITIVE_INFINITY, 0, Number.POSITIVE_INFINITY];
  private lastCenterKey = "";

  constructor(private readonly gl: WebGL2RenderingContext, private readonly config: SceneConfig) {
    this.program = new ShaderProgram(gl, grassVertexShader, grassFragmentShader);
    this.mesh = createMeshGpu(gl, makeGrassTuftMesh(config.grass.bladeSegments, config.grass.bladeCount));
    this.instanceData = new Float32Array(this.instanceCapacity * 10);
    this.instanceBuffer = createArrayBuffer(gl, this.instanceData, gl.DYNAMIC_DRAW);
    this.attachInstanceAttributes();
  }

  update(_dt: number, cameraPos: Vec3, _cameraForward: Vec3): void {
    const tileSize = this.config.grass.tileSize;
    const centerIx = Math.floor(cameraPos[0] / tileSize);
    const centerIz = Math.floor(cameraPos[2] / tileSize);
    const centerKey = `${centerIx},${centerIz}`;
    const moved = vec3.length(vec3.sub(cameraPos, this.lastRebuildPos)) > 5.5;

    if (centerKey === this.lastCenterKey && !moved) {
      return;
    }

    this.lastCenterKey = centerKey;
    this.lastRebuildPos = [...cameraPos];
    const radiusTiles = Math.ceil(this.config.grass.activeRadius / tileSize);
    const visibleRadius = Math.min(this.config.grass.activeRadius, this.config.grass.farDistance + tileSize);
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

        if (dist > visibleRadius) {
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
    let uploadedTileCount = 0;
    let cursor = 0;

    for (const tile of active) {
      let tileUploaded = false;

      for (let i = 0; i < tile.instances.length; i++) {
        const instance = tile.instances[i];
        if (!instance) continue;
        const instanceDist = Math.hypot(instance.x - cameraPos[0], instance.z - cameraPos[2]);
        if (instanceDist > this.config.grass.farDistance) {
          continue;
        }
        const distanceDensity =
          instanceDist <= this.config.grass.nearDistance
            ? 1
            : instanceDist <= this.config.grass.midDistance
              ? 1 - smoothstep(this.config.grass.nearDistance, this.config.grass.midDistance, instanceDist) * 0.94
              : 0.055 * (1 - smoothstep(this.config.grass.midDistance, this.config.grass.farDistance, instanceDist) * 0.68);
        if (instance.lodRank > distanceDensity) {
          continue;
        }
        let lodFade = 1;
        if (instanceDist > this.config.grass.midDistance) {
          lodFade = 1 - smoothstep(this.config.grass.midDistance, this.config.grass.farDistance, instanceDist);
        } else if (instanceDist > this.config.grass.nearDistance) {
          lodFade = 1 - smoothstep(this.config.grass.nearDistance, this.config.grass.midDistance, instanceDist) * 0.18;
        }
        if (lodFade <= 0.015) {
          continue;
        }
        if (cursor + 10 > this.instanceData.length) {
          this.growInstanceBuffer(Math.ceil((cursor + 10) / 10));
        }
        this.instanceData[cursor++] = instance.x;
        this.instanceData[cursor++] = instance.z;
        this.instanceData[cursor++] = instance.y;
        this.instanceData[cursor++] = instance.rotation;
        this.instanceData[cursor++] = instance.height;
        this.instanceData[cursor++] = instance.width;
        this.instanceData[cursor++] = instance.jitter;
        this.instanceData[cursor++] = instance.phase;
        this.instanceData[cursor++] = lodFade;
        this.instanceData[cursor++] = instance.variant;
        tileUploaded = true;
      }

      if (tileUploaded) {
        uploadedTileCount++;
      }
    }

    this.activeTileCount = uploadedTileCount;
    this.instanceCount = cursor / 10;
    this.uploadInstanceData(cursor);
  }

  private growInstanceBuffer(requiredInstances: number): void {
    const previousData = this.instanceData;
    while (this.instanceCapacity < requiredInstances) {
      this.instanceCapacity *= 2;
    }
    this.instanceData = new Float32Array(this.instanceCapacity * 10);
    this.instanceData.set(previousData.subarray(0, Math.min(previousData.length, this.instanceData.length)));
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private uploadInstanceData(floatCount: number): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.instanceData.subarray(0, floatCount));
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private createTile(ix: number, iz: number): GrassTile {
    const tileSize = this.config.grass.tileSize;
    const seed = (this.config.seed ^ (ix * 73856093) ^ (iz * 19349663)) >>> 0;
    const rng = new RNG(seed);
    const instances: GrassInstance[] = [];
    const maxCount = Math.round(this.config.grass.instancesPerTileNear * this.config.grass.densityScale);
    const startX = ix * tileSize;
    const startZ = iz * tileSize;

    for (let i = 0; i < maxCount; i++) {
      const x = startX + rng.next() * tileSize;
      const z = startZ + rng.next() * tileSize;
      const patches = fbm2(x * 0.026, z * 0.030, this.config.seed + 20, 4);
      const fine = fbm2(x * 0.115, z * 0.135, this.config.seed + 21, 3);
      const broad = fbm2(x * 0.010, z * 0.014, this.config.seed + 22, 3);
      const rows = 0.5 + 0.5 * Math.sin(x * 0.16 + z * 0.090 + patches * 4.6);
      const clump = smoothstep(0.42, 0.78, patches * 0.56 + fine * 0.18 + broad * 0.20 + rows * 0.18);
      const patchOpen = smoothstep(0.20, 0.78, broad * 0.44 + patches * 0.34 + rows * 0.16 + fine * 0.06);
      const dampBand = 1 - smoothstep(42, 180, Math.max(0, -z));
      const dryPatch = smoothstep(0.70, 0.94, fine * 0.76 + broad * 0.24);
      const densityField = smoothstep(0.08, 0.68, broad * 0.38 + patches * 0.34 + fine * 0.16 + rows * 0.20);
      const density = Math.min(
        1,
        (0.20 + densityField * 0.48 + clump * 0.36 + patchOpen * 0.30 + dampBand * 0.05 - dryPatch * 0.08) *
          (0.72 + this.config.grass.densityScale * 0.28)
      );

      if (rng.next() > density) {
        continue;
      }

      const variant = rng.next();
      const lodRank = rng.next();
      const canopyWave = Math.sin(z * 0.044 + x * 0.010 + broad * 4.8) * 0.5 + 0.5;
      const weedTall = smoothstep(0.58, 0.96, variant + clump * 0.20 + broad * 0.12);
      const heightField = Math.max(0.62, 0.76 + broad * 0.16 + canopyWave * 0.18 + clump * 0.24 + patchOpen * 0.10 - dryPatch * 0.02);
      const rawHeight = rng.float(0.62, 1.16) * heightField * (1 + weedTall * rng.float(0.06, 0.18));
      const height = Math.min(rawHeight, 1.32 + weedTall * 0.14 + clump * 0.08);
      const width = rng.float(0.062, 0.164) * (0.96 + clump * 0.30 + patchOpen * 0.10) * (1 - weedTall * 0.05);

      instances.push({
        x,
        z,
        y: terrainHeight(x, z, this.config.seed, this.config.terrain.heightAmplitude),
        rotation: rng.float(0, Math.PI * 2),
        height,
        width,
        jitter: density * 2 - 1,
        phase: rng.float(0, Math.PI * 2),
        variant,
        lodRank
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
