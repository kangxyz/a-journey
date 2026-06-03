import { FullscreenTriangle } from "../renderer/FullscreenTriangle";
import { ShaderProgram } from "../renderer/ShaderProgram";
import { skyFragmentShader, skyVertexShader } from "../shaders/sky";
import type { FrameContext } from "./FrameContext";

export class SkySystem {
  private readonly program: ShaderProgram;
  private readonly triangle: FullscreenTriangle;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.program = new ShaderProgram(gl, skyVertexShader, skyFragmentShader);
    this.triangle = new FullscreenTriangle(gl);
  }

  render(frame: FrameContext): void {
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);

    this.program.use();
    this.program.set1f("uTime", frame.time);
    this.program.set3fv("uSkyTop", frame.config.sky.topColor);
    this.program.set3fv("uSkyHorizon", frame.config.sky.horizonColor);
    this.program.set3fv("uSkyLower", frame.config.sky.lowerColor);
    this.program.set1f("uCloudScale", frame.config.sky.cloudScale);
    this.program.set1f("uCloudStrength", frame.config.sky.cloudStrength);
    this.program.set1f("uHorizonLine", frame.config.sky.horizonLine);
    this.program.set3fv("uCameraPos", frame.cameraPos);
    this.program.set3fv("uCameraForward", frame.cameraForward);
    this.program.set3fv("uCameraRight", frame.cameraRight);
    this.program.set3fv("uCameraUp", frame.cameraUp);
    this.program.set1f("uAspect", frame.width / Math.max(1, frame.height));
    this.program.set1f("uTanHalfFov", Math.tan((frame.config.camera.fovDeg * Math.PI) / 360));
    this.triangle.render();
    frame.stats.drawCalls += 1;

    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
  }

  dispose(): void {
    this.program.dispose();
    this.triangle.dispose();
  }
}
