export class Input {
  private keys = new Set<string>();
  private pressed = new Set<string>();
  private mouseDx = 0;
  private mouseDy = 0;
  private dragging = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (event) => {
      if (!this.keys.has(event.code)) {
        this.pressed.add(event.code);
      }
      this.keys.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
    });

    canvas.addEventListener("mousedown", () => {
      this.dragging = true;
      try {
        const pointerLock = canvas.requestPointerLock() as Promise<void> | void;
        if (pointerLock) {
          void pointerLock.catch(() => undefined);
        }
      } catch {
        // Pointer lock can be denied in automated or embedded browser contexts.
      }
    });

    window.addEventListener("mouseup", () => {
      this.dragging = false;
    });

    window.addEventListener("mousemove", (event) => {
      if (document.pointerLockElement === canvas || this.dragging) {
        this.mouseDx += event.movementX;
        this.mouseDy += event.movementY;
      }
    });
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  consumePressed(code: string): boolean {
    const hit = this.pressed.has(code);
    this.pressed.delete(code);
    return hit;
  }

  consumeMouseDelta(): [number, number] {
    const delta: [number, number] = [this.mouseDx, this.mouseDy];
    this.mouseDx = 0;
    this.mouseDy = 0;
    return delta;
  }

  dispose(): void {
    this.canvas.ownerDocument.exitPointerLock?.();
  }
}
