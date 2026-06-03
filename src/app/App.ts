import { BroadcastAudio } from "../audio/BroadcastAudio";
import { GLDevice } from "../renderer/GLDevice";
import { DebugOverlay } from "../scene/DebugOverlay";
import { Input } from "../scene/Input";
import { Scene } from "../scene/Scene";

export class App {
  private readonly canvas: HTMLCanvasElement;
  private readonly overlayElement: HTMLDivElement;
  private readonly device: GLDevice;
  private readonly input: Input;
  private readonly scene: Scene;
  private readonly overlay: DebugOverlay;
  private readonly audio: BroadcastAudio;
  private readonly targetFrameMs: number;
  private readonly maxRenderPixels: number;
  private readonly renderScale: number;
  private readonly dprCap: number;
  private lastTime = performance.now();
  private lastRenderTime = 0;
  private frameHandle = 0;

  constructor(root: HTMLElement) {
    const params = new URLSearchParams(window.location.search);
    const quality = params.get("quality") ?? "balanced";
    this.canvas = document.createElement("canvas");
    this.overlayElement = document.createElement("div");
    this.overlayElement.className = "debug-overlay";
    root.append(this.canvas, this.overlayElement);

    this.device = new GLDevice(this.canvas);
    this.input = new Input(this.canvas);
    this.scene = new Scene(this.device.gl, this.input);
    this.overlay = new DebugOverlay(this.overlayElement);
    this.audio = new BroadcastAudio();

    const fps = numberParam(params, "fps") ?? (quality === "high" ? 60 : quality === "low" ? 24 : 30);
    this.targetFrameMs = 1000 / clamp(fps, 24, 60);
    this.renderScale = numberParam(params, "scale") ?? (quality === "high" ? 1 : quality === "low" ? 0.68 : 0.78);
    this.dprCap = quality === "high" ? 2 : 1;
    this.maxRenderPixels = quality === "high" ? 3_200_000 : quality === "low" ? 720_000 : 900_000;
  }

  start(): void {
    this.audio.arm();

    const tick = (now: number) => {
      this.frameHandle = requestAnimationFrame(tick);

      if (document.hidden || now - this.lastRenderTime < this.targetFrameMs) {
        return;
      }

      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.lastRenderTime = now;
      this.resize();
      const stats = this.scene.frame(dt, this.canvas.width, this.canvas.height);

      if (this.input.consumePressed("KeyF")) {
        this.overlay.toggle();
      }

      this.overlay.update(stats);
    };

    this.frameHandle = requestAnimationFrame(tick);
  }

  dispose(): void {
    cancelAnimationFrame(this.frameHandle);
    this.audio.dispose();
    this.scene.dispose();
    this.input.dispose();
  }

  private resize(): void {
    const cssWidth = Math.max(1, this.canvas.clientWidth);
    const cssHeight = Math.max(1, this.canvas.clientHeight);
    const baseDpr = Math.min(this.dprCap, window.devicePixelRatio || 1) * this.renderScale;
    const pixelBudgetScale = Math.min(1, Math.sqrt(this.maxRenderPixels / Math.max(1, cssWidth * cssHeight * baseDpr * baseDpr)));
    const dpr = Math.max(0.55, baseDpr * pixelBudgetScale);
    const width = Math.max(1, Math.floor(cssWidth * dpr));
    const height = Math.max(1, Math.floor(cssHeight * dpr));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }
}

function numberParam(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
