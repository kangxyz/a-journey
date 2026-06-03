import type { SceneStats } from "./Scene";

export class DebugOverlay {
  private visible = false;

  constructor(private readonly element: HTMLDivElement) {
    this.element.classList.add("hidden");
  }

  toggle(): void {
    this.visible = !this.visible;
    this.element.classList.toggle("hidden", !this.visible);
  }

  update(stats: SceneStats): void {
    if (!this.visible) {
      return;
    }

    const p = stats.cameraPosition;
    this.element.textContent = [
      `FPS ${stats.fps.toFixed(1)}`,
      `Draw ${stats.drawCalls}`,
      `Grass tiles ${stats.grassTiles}`,
      `Grass inst ${stats.grassInstances}`,
      `Wire seg ${stats.wireSegments}`,
      `Towers ${stats.towerCount}`,
      `Mode ${stats.debugMode}`,
      `Cam ${p[0].toFixed(1)}, ${p[1].toFixed(1)}, ${p[2].toFixed(1)}`
    ].join("\n");
  }
}
