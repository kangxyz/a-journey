const joystickRadius = 72;
const touchLookScale = 1.15;

export class Input {
  private keys = new Set<string>();
  private pressed = new Set<string>();
  private mouseDx = 0;
  private mouseDy = 0;
  private dragging = false;
  private movePointerId: number | null = null;
  private lookPointerId: number | null = null;
  private moveCenterX = 0;
  private moveCenterY = 0;
  private lookLastX = 0;
  private lookLastY = 0;
  private touchRight = 0;
  private touchForward = 0;
  private readonly touchControls: HTMLDivElement;
  private readonly joystick: HTMLDivElement;
  private readonly stick: HTMLDivElement;

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.keys.has(event.code)) {
      this.pressed.add(event.code);
    }
    this.keys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse") {
      this.dragging = true;
      try {
        const pointerLock = this.canvas.requestPointerLock() as Promise<void> | void;
        if (pointerLock) {
          void pointerLock.catch(() => undefined);
        }
      } catch {
        // Pointer lock can be denied in automated or embedded browser contexts.
      }
      return;
    }

    event.preventDefault();
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic or denied touch pointers may not be capturable.
    }

    const rect = this.canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const moveZone = localX < rect.width * 0.50 && localY > rect.height * 0.38;

    if (moveZone && this.movePointerId === null) {
      this.movePointerId = event.pointerId;
      this.moveCenterX = event.clientX;
      this.moveCenterY = event.clientY;
      this.touchRight = 0;
      this.touchForward = 0;
      this.joystick.style.left = `${event.clientX}px`;
      this.joystick.style.top = `${event.clientY}px`;
      this.stick.style.transform = "translate(-50%, -50%)";
      this.touchControls.classList.add("active");
      return;
    }

    if (this.lookPointerId === null) {
      this.lookPointerId = event.pointerId;
      this.lookLastX = event.clientX;
      this.lookLastY = event.clientY;
    }
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerType === "mouse") return;

    if (event.pointerId === this.movePointerId) {
      event.preventDefault();
      const dx = event.clientX - this.moveCenterX;
      const dy = event.clientY - this.moveCenterY;
      const len = Math.hypot(dx, dy);
      const scale = len > joystickRadius ? joystickRadius / len : 1;
      const clampedX = dx * scale;
      const clampedY = dy * scale;
      this.touchRight = clampedX / joystickRadius;
      this.touchForward = -clampedY / joystickRadius;
      this.stick.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
      return;
    }

    if (event.pointerId === this.lookPointerId) {
      event.preventDefault();
      this.mouseDx += (event.clientX - this.lookLastX) * touchLookScale;
      this.mouseDy += (event.clientY - this.lookLastY) * touchLookScale;
      this.lookLastX = event.clientX;
      this.lookLastY = event.clientY;
    }
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerType === "mouse") {
      this.dragging = false;
      return;
    }

    if (event.pointerId === this.movePointerId) {
      this.movePointerId = null;
      this.touchRight = 0;
      this.touchForward = 0;
      this.touchControls.classList.remove("active");
      this.stick.style.transform = "translate(-50%, -50%)";
    }

    if (event.pointerId === this.lookPointerId) {
      this.lookPointerId = null;
    }
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement === this.canvas || this.dragging) {
      this.mouseDx += event.movementX;
      this.mouseDy += event.movementY;
    }
  };

  private readonly handleMouseUp = (): void => {
    this.dragging = false;
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.touchControls = document.createElement("div");
    this.touchControls.className = "touch-controls";
    this.touchControls.setAttribute("aria-hidden", "true");
    this.joystick = document.createElement("div");
    this.joystick.className = "touch-joystick";
    this.stick = document.createElement("div");
    this.stick.className = "touch-stick";
    this.joystick.append(this.stick);
    this.touchControls.append(this.joystick);
    this.canvas.parentElement?.append(this.touchControls);

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("mouseup", this.handleMouseUp);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("pointermove", this.handlePointerMove, { passive: false });
    window.addEventListener("pointerup", this.handlePointerUp);
    window.addEventListener("pointercancel", this.handlePointerUp);
    canvas.addEventListener("pointerdown", this.handlePointerDown, { passive: false });
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

  getTouchMove(): [number, number] {
    return [this.touchRight, this.touchForward];
  }

  dispose(): void {
    this.canvas.ownerDocument.exitPointerLock?.();
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
    window.removeEventListener("pointercancel", this.handlePointerUp);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.touchControls.remove();
  }
}
