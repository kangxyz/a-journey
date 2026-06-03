import { createArrayBuffer } from "../renderer/BufferUtils";
import { ShaderProgram } from "../renderer/ShaderProgram";
import { cloudSheetFragmentShader, cloudSheetVertexShader } from "../shaders/cloudSheet";
import type { FrameContext } from "./FrameContext";
import type { SceneConfig } from "./SceneConfig";

export class CloudSheetSystem {
  private readonly program: ShaderProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly vertexBuffer: WebGLBuffer;
  private readonly indexBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;
  private readonly instanceCount: number;

  constructor(private readonly gl: WebGL2RenderingContext, config: SceneConfig) {
    this.program = new ShaderProgram(gl, cloudSheetVertexShader, cloudSheetFragmentShader);
    const vao = gl.createVertexArray();
    const indexBuffer = gl.createBuffer();
    if (!vao || !indexBuffer) {
      throw new Error("Failed to create cloud sheet buffers.");
    }

    this.vao = vao;
    this.vertexBuffer = createArrayBuffer(gl, new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]));
    this.indexBuffer = indexBuffer;
    const instances = this.makeInstances(config);
    this.instanceCount = instances.length / 8;
    this.instanceBuffer = createArrayBuffer(gl, instances);

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * 4, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 8 * 4, 0);
    gl.vertexAttribDivisor(3, 1);
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 8 * 4, 4 * 4);
    gl.vertexAttribDivisor(4, 1);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
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
    this.program.set1f("uTime", frame.time);
    this.program.set3fv("uCameraPos", frame.cameraPos);
    this.program.set3fv("uFogColor", frame.config.fog.color);
    this.program.set1f("uFogDensity", frame.config.fog.density);
    this.program.set1f("uFogStart", frame.config.fog.start);
    this.program.set1f("uFogHeightMin", frame.config.fog.heightMin);
    this.program.set1f("uFogHeightMax", frame.config.fog.heightMax);
    this.program.set1f("uFogHeightStrength", frame.config.fog.heightStrength);

    gl.bindVertexArray(this.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, this.instanceCount);
    gl.bindVertexArray(null);

    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    frame.stats.drawCalls += 1;
  }

  dispose(): void {
    this.program.dispose();
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteBuffer(this.vertexBuffer);
    this.gl.deleteBuffer(this.indexBuffer);
    this.gl.deleteBuffer(this.instanceBuffer);
  }

  private makeInstances(config: SceneConfig): Float32Array {
    const sheets = [
      { center: [0, 5, -260], size: [1180, 20], alpha: 0.11, noise: 10.8, speed: 0.003 },
      { center: [0, 11, -430], size: [1580, 26], alpha: 0.105, noise: 10.0, speed: 0.003 },
      { center: [-120, 18, -610], size: [1900, 34], alpha: 0.088, noise: 8.8, speed: 0.004 },
      { center: [140, 30, -760], size: [2120, 46], alpha: 0.072, noise: 7.0, speed: 0.004 },
      { center: [-220, 44, -920], size: [2360, 58], alpha: 0.058, noise: 5.8, speed: 0.005 },
      { center: [160, 62, -1080], size: [2520, 72], alpha: 0.044, noise: 4.8, speed: 0.004 },
      { center: [0, 9, -720], size: [2320, 22], alpha: 0.082, noise: 11.6, speed: 0.002 },
      { center: [0, 15, -940], size: [2600, 24], alpha: 0.066, noise: 12.2, speed: 0.002 }
    ].sort((a, b) => a.center[2] - b.center[2]);
    const data: number[] = [];

    for (const sheet of sheets.slice(0, Math.max(1, config.clouds.sheetCount))) {
      data.push(
        sheet.center[0],
        sheet.center[1],
        sheet.center[2],
        sheet.alpha * (config.clouds.alpha / 0.16),
        sheet.size[0],
        sheet.size[1],
        sheet.noise,
        sheet.speed + config.clouds.speed * 0.25
      );
    }

    return new Float32Array(data);
  }
}
