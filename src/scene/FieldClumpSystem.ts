import { makeFieldClumpMesh } from "../assets/procedural/makeFieldClumpMesh";
import { terrainHeight } from "../assets/procedural/makeTerrainMesh";
import { fbm2, smoothstep } from "../math/Noise";
import { RNG } from "../math/RNG";
import { createArrayBuffer, createMeshGpu, disposeMeshGpu } from "../renderer/BufferUtils";
import type { MeshGpu } from "../renderer/BufferUtils";
import { ShaderProgram } from "../renderer/ShaderProgram";
import { fieldClumpFragmentShader, fieldClumpVertexShader } from "../shaders/fieldClump";
import type { FrameContext } from "./FrameContext";
import type { SceneConfig } from "./SceneConfig";

interface FieldClump {
  x: number;
  z: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  density: number;
  phase: number;
}

export class FieldClumpSystem {
  private readonly program: ShaderProgram;
  private readonly mesh: MeshGpu;
  private readonly instanceBuffer: WebGLBuffer;
  private readonly instanceCount: number;

  constructor(private readonly gl: WebGL2RenderingContext, config: SceneConfig) {
    this.program = new ShaderProgram(gl, fieldClumpVertexShader, fieldClumpFragmentShader);
    this.mesh = createMeshGpu(gl, makeFieldClumpMesh());
    const instances = this.makeInstances(config);
    this.instanceCount = instances.length;
    this.instanceBuffer = createArrayBuffer(gl, this.packInstances(instances));
    this.attachInstanceAttributes();
  }

  render(frame: FrameContext): void {
    if (this.instanceCount === 0) return;

    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.program.use();
    this.program.setMatrix4("uViewProj", frame.viewProj);
    this.program.set1f("uTime", frame.time);
    this.program.set3fv("uCameraPos", frame.cameraPos);
    this.program.set3fv("uFogColor", frame.config.fog.color);
    this.program.set1f("uFogDensity", frame.config.fog.density);
    this.program.set1f("uFogStart", frame.config.fog.start);
    this.program.set1f("uFogHeightMin", frame.config.fog.heightMin);
    this.program.set1f("uFogHeightMax", frame.config.fog.heightMax);
    this.program.set1f("uFogHeightStrength", frame.config.fog.heightStrength);
    this.program.set1i("uDebugMode", frame.debugMode);

    gl.bindVertexArray(this.mesh.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, this.mesh.indexCount, this.mesh.indexType, 0, this.instanceCount);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    frame.stats.drawCalls += 1;
  }

  dispose(): void {
    this.program.dispose();
    disposeMeshGpu(this.gl, this.mesh);
    this.gl.deleteBuffer(this.instanceBuffer);
  }

  private makeInstances(config: SceneConfig): FieldClump[] {
    const rng = new RNG(config.seed + 3300);
    const instances: FieldClump[] = [];
    const attemptCount = Math.round(1420 * config.grass.fieldClumpScale);
    const forwardX = Math.sin(config.camera.yaw);
    const forwardZ = Math.cos(config.camera.yaw);
    const rightX = -Math.cos(config.camera.yaw);
    const rightZ = Math.sin(config.camera.yaw);

    for (let i = 0; i < attemptCount; i++) {
      const bandRoll = rng.next();
      const zone = bandRoll < 0.22 ? "foreground" : bandRoll < 0.72 ? "mid" : "horizon";
      const zDepth =
        zone === "foreground" ? rng.float(44, 210) :
        zone === "mid" ? rng.float(120, 520) :
        rng.float(360, 940);
      const widthAtDepth =
        zone === "foreground" ? 30 + zDepth * 1.85 :
        zone === "mid" ? 58 + zDepth * 2.10 :
        96 + zDepth * 2.55;
      const sideRoll = rng.next();
      const sideBias = zone === "foreground" && sideRoll < 0.58;
      const side = rng.next() < 0.5 ? -1 : 1;
      const x = sideBias ? side * rng.float(widthAtDepth * 0.34, widthAtDepth * 1.03) : rng.float(-widthAtDepth, widthAtDepth);
      const z = -zDepth;
      const macro = fbm2(x * 0.018, z * 0.024, config.seed + 3301, 4);
      const fine = fbm2(x * 0.085, z * 0.115, config.seed + 3302, 3);
      const row = 0.5 + 0.5 * Math.sin(z * 0.085 + x * 0.018 + macro * 4.5);
      const broadBreak = fbm2(x * 0.008, z * 0.013, config.seed + 3304, 3);
      const density = smoothstep(0.50, 0.88, macro * 0.58 + fine * 0.20 + row * 0.16 + broadBreak * 0.18);
      const horizonBand = smoothstep(260, 520, zDepth);
      const viewT = (z - config.camera.position[2]) / Math.min(-0.01, forwardZ);
      const viewCenterX = config.camera.position[0] + forwardX * Math.max(0, viewT);
      const centerDistance = Math.abs(x - viewCenterX);

      if (zone === "foreground" && centerDistance < rng.float(12, 30) && rng.next() < 0.72) {
        continue;
      }

      const keep =
        zone === "foreground" ? 0.16 + density * 0.34 + (sideBias ? 0.16 : 0.0) :
        zone === "mid" ? 0.16 + density * 0.48 + row * 0.08 :
        0.30 + density * 0.44 + horizonBand * 0.14;

      if (rng.next() > keep) {
        continue;
      }

      const foregroundScale = zone === "foreground" ? 1.0 : 0.0;
      const horizonScale = zone === "horizon" ? 1.0 : 0.0;
      const midScale = 1.0 - Math.max(foregroundScale, horizonScale);
      const lowMat = 0.70 + broadBreak * 0.34 + density * 0.36;
      instances.push({
        x,
        z,
        y: terrainHeight(x, z, config.seed, config.terrain.heightAmplitude) - rng.float(0.04, 0.16),
        rotation: rng.float(0, Math.PI * 2),
        width:
          rng.float(0.42, 1.48) * (0.82 + density * 0.72) * foregroundScale +
          rng.float(0.52, 2.05) * lowMat * midScale +
          rng.float(0.46, 2.10) * (0.64 + density * 0.46) * horizonScale,
        height:
          rng.float(0.54, 1.48) * (0.84 + density * 0.52) * foregroundScale +
          rng.float(0.24, 0.76) * (0.78 + density * 0.58) * midScale +
          rng.float(0.16, 0.48) * (0.80 + density * 0.38) * horizonScale,
        density: Math.min(1, density + foregroundScale * 0.12 + horizonScale * 0.10),
        phase: rng.float(0, Math.PI * 2)
      });
    }

    const addComposedClump = (screenOffset: number, depth: number, width: number, height: number, density: number): void => {
      const x = config.camera.position[0] + forwardX * depth + rightX * screenOffset + rng.float(-5.5, 5.5);
      const z = config.camera.position[2] + forwardZ * depth + rightZ * screenOffset + rng.float(-8.0, 8.0);
      instances.push({
        x,
        z,
        y: terrainHeight(x, z, config.seed, config.terrain.heightAmplitude) + rng.float(-0.02, 0.04),
        rotation: config.camera.yaw + rng.float(-0.34, 0.34),
        width: width * rng.float(0.78, 1.28),
        height: height * rng.float(0.76, 1.22),
        density: Math.min(1, density * rng.float(0.86, 1.12)),
        phase: rng.float(0, Math.PI * 2)
      });
    };

    for (let i = 0; i < 54; i++) {
      const side = rng.next() < 0.52 ? -1 : 1;
      const edgeBias = rng.next() < 0.54 ? rng.float(48, 160) * side : rng.float(-150, 160);
      const depth = rng.float(28, 128) + Math.abs(edgeBias) * 0.12;
      addComposedClump(
        edgeBias,
        depth,
        rng.float(0.46, 1.72),
        rng.float(0.76, 1.72),
        rng.float(0.82, 1.0)
      );
    }

    for (let i = 0; i < 16; i++) {
      addComposedClump(
        rng.float(-185, 205),
        rng.float(285, 610),
        rng.float(0.55, 2.20),
        rng.float(0.24, 0.60),
        rng.float(0.62, 0.92)
      );
    }

    instances.sort((a, b) => a.z - b.z);
    return instances;
  }

  private packInstances(instances: FieldClump[]): Float32Array {
    const data = new Float32Array(instances.length * 8);
    let o = 0;
    for (const instance of instances) {
      data[o++] = instance.x;
      data[o++] = instance.z;
      data[o++] = instance.y;
      data[o++] = instance.rotation;
      data[o++] = instance.width;
      data[o++] = instance.height;
      data[o++] = instance.density;
      data[o++] = instance.phase;
    }
    return data;
  }

  private attachInstanceAttributes(): void {
    const gl = this.gl;
    gl.bindVertexArray(this.mesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
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
