import { makeHorizonDetailMesh } from "../assets/procedural/makeHorizonDetailMesh";
import { createMeshGpu, disposeMeshGpu } from "../renderer/BufferUtils";
import type { MeshGpu } from "../renderer/BufferUtils";
import { ShaderProgram } from "../renderer/ShaderProgram";
import { horizonDetailFragmentShader, horizonDetailVertexShader } from "../shaders/horizonDetail";
import type { FrameContext } from "./FrameContext";
import type { SceneConfig } from "./SceneConfig";

export class HorizonDetailSystem {
  private readonly program: ShaderProgram;
  private readonly mesh: MeshGpu;

  constructor(private readonly gl: WebGL2RenderingContext, config: SceneConfig) {
    this.program = new ShaderProgram(gl, horizonDetailVertexShader, horizonDetailFragmentShader);
    this.mesh = createMeshGpu(
      gl,
      makeHorizonDetailMesh({
        seed: config.seed,
        terrainAmplitude: config.terrain.heightAmplitude,
        detailScale: config.performance.horizonDetailScale
      })
    );
  }

  render(frame: FrameContext): void {
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
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

    gl.bindVertexArray(this.mesh.vao);
    gl.drawElements(gl.TRIANGLES, this.mesh.indexCount, this.mesh.indexType, 0);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    frame.stats.drawCalls += 1;
  }

  dispose(): void {
    this.program.dispose();
    disposeMeshGpu(this.gl, this.mesh);
  }
}
