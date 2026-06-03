import { mat4 } from "../math/Mat4";
import type { Mat4 } from "../math/Mat4";
import type { Vec3 } from "../math/Vec3";
import { vec3 } from "../math/Vec3";
import { terrainHeight } from "../assets/procedural/makeTerrainMesh";
import type { SceneConfig } from "./SceneConfig";
import type { Input } from "./Input";

export class Camera {
  position: Vec3;
  yaw: number;
  pitch: number;
  forward: Vec3 = [0, 0, -1];
  right: Vec3 = [1, 0, 0];
  up: Vec3 = [0, 1, 0];
  view: Mat4 = mat4.identity();
  proj: Mat4 = mat4.identity();
  viewProj: Mat4 = mat4.identity();
  private readonly eyeHeight: number;

  constructor(private readonly config: SceneConfig) {
    this.eyeHeight = config.camera.position[1];
    this.position = [...config.camera.position];
    this.position[1] = this.groundHeightAt(this.position[0], this.position[2]) + this.eyeHeight;
    this.yaw = config.camera.yaw;
    this.pitch = config.camera.pitch;
    this.recalculateVectors();
  }

  update(dt: number, input: Input, aspect: number): void {
    const [dx, dy] = input.consumeMouseDelta();
    this.yaw -= dx * this.config.camera.mouseSensitivity;
    this.pitch -= dy * this.config.camera.mouseSensitivity;
    this.pitch = Math.max(-1.25, Math.min(1.08, this.pitch));
    this.recalculateVectors();

    const flatForward = vec3.normalize([this.forward[0], 0, this.forward[2]]);
    const flatRight = vec3.normalize([this.right[0], 0, this.right[2]]);
    let move: Vec3 = [0, 0, 0];

    if (input.isDown("KeyW")) move = vec3.add(move, flatForward);
    if (input.isDown("KeyS")) move = vec3.sub(move, flatForward);
    if (input.isDown("KeyD")) move = vec3.add(move, flatRight);
    if (input.isDown("KeyA")) move = vec3.sub(move, flatRight);

    const len = vec3.length(move);
    if (len > 0) {
      const sprinting = input.isDown("ShiftLeft") || input.isDown("ShiftRight");
      const speed = this.config.camera.moveSpeed * (sprinting ? 1.9 : 1);
      this.position = vec3.add(this.position, vec3.scale(move, (speed * dt) / len));
    }
    this.position[1] = this.groundHeightAt(this.position[0], this.position[2]) + this.eyeHeight;

    this.view = mat4.lookAt(this.position, vec3.add(this.position, this.forward), [0, 1, 0]);
    this.proj = mat4.perspective(
      (this.config.camera.fovDeg * Math.PI) / 180,
      aspect,
      this.config.camera.near,
      this.config.camera.far
    );
    this.viewProj = mat4.multiply(this.proj, this.view);
  }

  reset(): void {
    this.position = [...this.config.camera.position];
    this.position[1] = this.groundHeightAt(this.position[0], this.position[2]) + this.eyeHeight;
    this.yaw = this.config.camera.yaw;
    this.pitch = this.config.camera.pitch;
    this.recalculateVectors();
  }

  private groundHeightAt(x: number, z: number): number {
    return terrainHeight(x, z, this.config.seed, this.config.terrain.heightAmplitude);
  }

  private recalculateVectors(): void {
    const cp = Math.cos(this.pitch);
    this.forward = vec3.normalize([Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp]);
    this.right = vec3.normalize(vec3.cross(this.forward, [0, 1, 0]));
    this.up = vec3.normalize(vec3.cross(this.right, this.forward));
  }
}
