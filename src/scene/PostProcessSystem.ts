import { FullscreenTriangle } from "../renderer/FullscreenTriangle";
import { ShaderProgram } from "../renderer/ShaderProgram";
import { postFragmentShader, postVertexShader } from "../shaders/post";
import type { FrameContext } from "./FrameContext";

export class PostProcessSystem {
  private readonly program: ShaderProgram;
  private readonly triangle: FullscreenTriangle;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.program = new ShaderProgram(gl, postVertexShader, postFragmentShader);
    this.triangle = new FullscreenTriangle(gl);
  }

  render(frame: FrameContext, sceneColor: WebGLTexture, sceneDepth: WebGLTexture): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, frame.width, frame.height);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);

    this.program.use();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneColor);
    this.program.set1i("uSceneColor", 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, sceneDepth);
    this.program.set1i("uSceneDepth", 1);
    this.program.set1f("uTime", frame.time);
    this.program.set1f("uRedBoost", frame.config.post.redBoost);
    this.program.set1f("uGreenScale", frame.config.post.greenScale);
    this.program.set1f("uBlueScale", frame.config.post.blueScale);
    this.program.set1f("uContrast", frame.config.post.contrast);
    this.program.set1f("uVignette", frame.config.post.vignette);
    this.program.set1f("uGrain", frame.config.post.grain);
    this.program.set1f("uExposure", frame.config.post.exposure);
    this.program.set1f("uGamma", frame.config.post.gamma);
    this.program.set1f("uDofStrength", frame.config.post.dofStrength);
    this.program.set1f("uDofFocusDistance", frame.config.post.dofFocusDistance);
    this.program.set1f("uDofRange", frame.config.post.dofRange);
    this.program.set1f("uCameraNear", frame.config.camera.near);
    this.program.set1f("uCameraFar", frame.config.camera.far);
    this.program.set2f("uTexelSize", 1 / Math.max(1, frame.width), 1 / Math.max(1, frame.height));
    this.program.set1i("uBypass", frame.debugMode === 5 ? 1 : 0);
    this.triangle.render();
    frame.stats.drawCalls += 1;

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
  }

  dispose(): void {
    this.program.dispose();
    this.triangle.dispose();
  }
}
