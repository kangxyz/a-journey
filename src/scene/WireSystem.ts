import { makeWireRibbon } from "../assets/procedural/makeWireRibbon";
import type { WireSpan } from "../assets/procedural/makeWireRibbon";
import { createMeshGpu, disposeMeshGpu } from "../renderer/BufferUtils";
import type { MeshGpu } from "../renderer/BufferUtils";
import { ShaderProgram } from "../renderer/ShaderProgram";
import { RNG } from "../math/RNG";
import type { Vec3 } from "../math/Vec3";
import { vec3 } from "../math/Vec3";
import { wireFragmentShader, wireVertexShader } from "../shaders/wire";
import type { FrameContext } from "./FrameContext";
import type { SceneConfig } from "./SceneConfig";
import type { TowerSystem } from "./TowerSystem";

export class WireSystem {
  private readonly program: ShaderProgram;
  private readonly mesh: MeshGpu;
  private readonly segmentCount: number;

  constructor(private readonly gl: WebGL2RenderingContext, config: SceneConfig, towers: TowerSystem) {
    this.program = new ShaderProgram(gl, wireVertexShader, wireFragmentShader);
    const spans = this.makeSpans(config, towers);
    this.mesh = createMeshGpu(gl, makeWireRibbon(spans));
    this.segmentCount = spans.reduce((sum, span) => sum + span.samples, 0);
  }

  render(frame: FrameContext): void {
    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);

    this.program.use();
    this.program.setMatrix4("uViewProj", frame.viewProj);
    this.program.set3fv("uCameraPos", frame.cameraPos);
    this.program.set3fv("uCameraRight", frame.cameraRight);
    this.program.set2f("uViewport", frame.width, frame.height);
    this.program.set3fv("uFogColor", frame.config.fog.color);
    this.program.set1f("uFogDensity", frame.config.fog.density);
    this.program.set1f("uFogStart", frame.config.fog.start);
    this.program.set1f("uFogHeightMin", frame.config.fog.heightMin);
    this.program.set1f("uFogHeightMax", frame.config.fog.heightMax);
    this.program.set1f("uFogHeightStrength", frame.config.fog.heightStrength);
    this.program.set1i("uDebugMode", frame.debugMode);

    gl.bindVertexArray(this.mesh.vao);
    gl.drawElements(gl.TRIANGLES, this.mesh.indexCount, this.mesh.indexType, 0);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);

    frame.stats.drawCalls += 1;
    frame.stats.wireSegments = this.segmentCount;
  }

  dispose(): void {
    this.program.dispose();
    disposeMeshGpu(this.gl, this.mesh);
  }

  private makeSpans(config: SceneConfig, towers: TowerSystem): WireSpan[] {
    const rng = new RNG(config.seed + 900);
    const spans: WireSpan[] = [];

    for (const corridor of towers.wireCorridors) {
      for (const group of corridor.groups) {
        for (let i = 0; i < group.length - 1; i++) {
          const start = group[i];
          const end = group[i + 1];
          if (!start || !end) continue;
          spans.push(this.spanFor(config, start, end, rng, 0));
        }
      }
    }

    return spans;
  }

  private spanFor(config: SceneConfig, start: Vec3, end: Vec3, rng: RNG, sagBias: number): WireSpan {
    const length = vec3.length(vec3.sub(end, start));
    const avgZ = Math.max(0, -(start[2] + end[2]) * 0.5);
    const farT = Math.min(1, avgZ / 520);
    const samples = Math.round(config.wires.samplesNear + (config.wires.samplesFar - config.wires.samplesNear) * farT);
    const width = config.wires.widthNear + (config.wires.widthFar - config.wires.widthNear) * farT;
    const tautness = 1 - Math.min(0.42, length / 1900);
    const sag = Math.min(
      config.wires.sagMax,
      Math.max(config.wires.sagMin, length * 0.0045 * tautness + sagBias + rng.float(-0.025, 0.08))
    );
    return { start, end, sag, samples, width };
  }
}
