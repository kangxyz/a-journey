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
    const attemptCount = Math.round(940 * config.grass.fieldClumpScale);

    for (let i = 0; i < attemptCount; i++) {
      const bandRoll = rng.next();
      const zDepth =
        bandRoll < 0.30 ? rng.float(8, 125) :
        bandRoll < 0.84 ? rng.float(48, 360) :
        rng.float(270, 680);
      const widthAtDepth = bandRoll < 0.30 ? 38 + zDepth * 2.00 : 48 + zDepth * 2.50;
      const x = rng.float(-widthAtDepth, widthAtDepth);
      const z = -zDepth;
      const macro = fbm2(x * 0.018, z * 0.024, config.seed + 3301, 4);
      const fine = fbm2(x * 0.085, z * 0.115, config.seed + 3302, 3);
      const row = 0.5 + 0.5 * Math.sin(z * 0.085 + x * 0.018 + macro * 4.5);
      const density = smoothstep(0.48, 0.86, macro * 0.68 + fine * 0.22 + row * 0.20);
      const foreground = 1 - smoothstep(55, 190, zDepth);
      const horizonBand = smoothstep(260, 520, zDepth);

      if (rng.next() > 0.16 + density * 0.46 + foreground * 0.22 + horizonBand * 0.06) {
        continue;
      }

      const foregroundScale = bandRoll < 0.30 ? 1.0 : 0.0;
      const horizonScale = bandRoll >= 0.84 ? 1.0 : 0.0;
      const midScale = 1.0 - Math.max(foregroundScale, horizonScale);
      instances.push({
        x,
        z,
        y: terrainHeight(x, z, config.seed, config.terrain.heightAmplitude) - rng.float(0.04, 0.16),
        rotation: rng.float(0, Math.PI * 2),
        width:
          rng.float(0.22, 0.88) * (0.78 + density * 0.78 + foreground * 0.68) * foregroundScale +
          rng.float(0.30, 1.15) * (0.76 + density * 0.88) * midScale +
          rng.float(0.48, 1.72) * (0.62 + density * 0.42) * horizonScale,
        height:
          rng.float(0.26, 0.94) * (0.72 + density * 0.80 + foreground * 0.72) * foregroundScale +
          rng.float(0.10, 0.40) * (0.70 + density * 0.72) * midScale +
          rng.float(0.06, 0.18) * (0.72 + density * 0.36) * horizonScale,
        density: Math.min(1, density + foregroundScale * 0.16 + horizonScale * 0.04),
        phase: rng.float(0, Math.PI * 2)
      });
    }

    instances.sort((a, b) => b.z - a.z);
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
