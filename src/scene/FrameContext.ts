import type { Vec3 } from "../math/Vec3";
import type { SceneConfig } from "./SceneConfig";

export interface FrameContext {
  gl: WebGL2RenderingContext;
  time: number;
  dt: number;
  width: number;
  height: number;
  view: Float32Array;
  proj: Float32Array;
  viewProj: Float32Array;
  cameraPos: Vec3;
  cameraForward: Vec3;
  cameraRight: Vec3;
  cameraUp: Vec3;
  config: SceneConfig;
  debugMode: number;
  stats: {
    drawCalls: number;
    wireSegments: number;
    grassTiles: number;
    grassInstances: number;
    towerCount: number;
  };
}

export interface Renderable {
  update(dt: number): void;
  render(frame: FrameContext): void;
  dispose(): void;
}
