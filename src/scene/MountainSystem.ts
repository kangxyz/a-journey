import { makeMountainStrip } from "../assets/procedural/makeMountainStrip";
import type { MountainLayerSpec } from "../assets/procedural/makeMountainStrip";
import { createMeshGpu, disposeMeshGpu } from "../renderer/BufferUtils";
import type { MeshGpu } from "../renderer/BufferUtils";
import { ShaderProgram } from "../renderer/ShaderProgram";
import { mountainFragmentShader, mountainVertexShader } from "../shaders/mountain";
import type { FrameContext } from "./FrameContext";
import type { RGB, SceneConfig } from "./SceneConfig";

interface Layer {
  mesh: MeshGpu;
  color: RGB;
}

export class MountainSystem {
  private readonly program: ShaderProgram;
  private readonly layers: Layer[];

  constructor(private readonly gl: WebGL2RenderingContext, config: SceneConfig) {
    this.program = new ShaderProgram(gl, mountainVertexShader, mountainFragmentShader);
    const specs: Array<MountainLayerSpec & { color: RGB }> = [
      { distance: 4600, width: 12400, baseHeight: -18.0, amplitude: 92.0, seed: config.seed + 18, color: [0.000, 0.0, 0] },
      { distance: 6400, width: 17800, baseHeight: -16.0, amplitude: 118.0, seed: config.seed + 44, color: [0.010, 0.0, 0] },
      { distance: 8600, width: 25400, baseHeight: -14.0, amplitude: 142.0, seed: config.seed + 79, color: [0.032, 0.0, 0] }
    ];

    this.layers = specs.map((spec) => ({
      mesh: createMeshGpu(gl, makeMountainStrip(spec)),
      color: spec.color
    }));
  }

  render(frame: FrameContext): void {
    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

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

    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (!layer) continue;
      this.program.set3fv("uBaseColor", layer.color);
      gl.bindVertexArray(layer.mesh.vao);
      gl.drawElements(gl.TRIANGLES, layer.mesh.indexCount, layer.mesh.indexType, 0);
      frame.stats.drawCalls += 1;
    }

    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
  }

  dispose(): void {
    this.program.dispose();
    for (const layer of this.layers) {
      disposeMeshGpu(this.gl, layer.mesh);
    }
  }
}
