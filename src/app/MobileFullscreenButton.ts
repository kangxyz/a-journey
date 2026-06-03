type WebkitFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
};

type WebkitFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => void;
};

export class MobileFullscreenButton {
  private readonly button: HTMLButtonElement;
  private readonly scrollZone: HTMLDivElement;

  private readonly handlePointerDown = (): void => {
    void this.enterFullscreen();
  };

  private readonly handleFullscreenChange = (): void => {
    this.updateVisibility();
  };

  constructor(root: HTMLElement) {
    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.className = "fullscreen-button";
    this.button.setAttribute("aria-label", "Enter fullscreen");
    this.button.innerHTML = '<span class="fullscreen-glyph" aria-hidden="true"></span>';

    this.scrollZone = document.createElement("div");
    this.scrollZone.className = "browser-chrome-swipe";
    this.scrollZone.setAttribute("aria-hidden", "true");

    root.append(this.button, this.scrollZone);

    this.button.addEventListener("pointerdown", this.handlePointerDown, { passive: true });
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", this.handleFullscreenChange);
    this.updateVisibility();
  }

  dispose(): void {
    this.button.removeEventListener("pointerdown", this.handlePointerDown);
    document.removeEventListener("fullscreenchange", this.handleFullscreenChange);
    document.removeEventListener("webkitfullscreenchange", this.handleFullscreenChange);
    this.button.remove();
    this.scrollZone.remove();
  }

  private async enterFullscreen(): Promise<void> {
    const target = document.documentElement as WebkitFullscreenElement;

    try {
      if (document.fullscreenElement || (document as WebkitFullscreenDocument).webkitFullscreenElement) {
        return;
      }

      if (target.requestFullscreen) {
        await target.requestFullscreen({ navigationUI: "hide" });
      } else {
        target.webkitRequestFullscreen?.();
      }
    } catch {
      this.button.classList.add("failed");
    } finally {
      this.updateVisibility();
    }
  }

  private updateVisibility(): void {
    const fullscreenElement = document.fullscreenElement ?? (document as WebkitFullscreenDocument).webkitFullscreenElement;
    this.button.classList.toggle("hidden", Boolean(fullscreenElement));
  }
}
