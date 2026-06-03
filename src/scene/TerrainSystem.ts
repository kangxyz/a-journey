import { createMeshGpu, disposeMeshGpu } from "../renderer/BufferUtils";
import type { MeshGpu } from "../renderer/BufferUtils";
import { ShaderProgram } from "../renderer/ShaderProgram";
import { makeTerrainMesh, terrainHeight } from "../assets/procedural/makeTerrainMesh";
import { terrainFragmentShader, terrainVertexShader } from "../shaders/terrain";
import type { FrameContext } from "./FrameContext";
import type { SceneConfig } from "./SceneConfig";

export class TerrainSystem {
  private readonly program: ShaderProgram;
  private readonly mesh: MeshGpu;

  constructor(private readonly gl: WebGL2RenderingContext, private readonly config: SceneConfig) {
    this.program = new ShaderProgram(gl, terrainVertexShader, terrainFragmentShader);
    this.mesh = createMeshGpu(
      gl,
      makeTerrainMesh(config.world.size, config.world.terrainResolution, config.seed, config.terrain.heightAmplitude)
    );
  }

  heightAt(x: number, z: number): number {
    return this.config.terrain.baseHeight + terrainHeight(x, z, this.config.seed, this.config.terrain.heightAmplitude);
  }

  render(frame: FrameContext): void {
    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.disable(gl.BLEND);

    this.program.use();
    this.program.setMatrix4("uViewProj", frame.viewProj);
    this.program.set3fv("uCameraPos", frame.cameraPos);
    this.program.set3fv("uFogColor", frame.config.fog.color);
    this.program.set1f("uFogDensity", frame.config.fog.density);
    this.program.set1f("uFogStart", frame.config.fog.start);
    this.program.set1f("uFogHeightMin", frame.config.fog.heightMin);
    this.program.set1f("uFogHeightMax", frame.config.fog.heightMax);
    this.program.set1f("uFogHeightStrength", frame.config.fog.heightStrength);
    this.program.set3fv("uColorDark", frame.config.terrain.colorDark);
    this.program.set3fv("uColorLight", frame.config.terrain.colorLight);
    this.program.set1i("uDebugMode", frame.debugMode);

    gl.bindVertexArray(this.mesh.vao);
    gl.drawElements(gl.TRIANGLES, this.mesh.indexCount, this.mesh.indexType, 0);
    gl.bindVertexArray(null);
    frame.stats.drawCalls += 1;
  }

  dispose(): void {
    this.program.dispose();
    disposeMeshGpu(this.gl, this.mesh);
  }
}
