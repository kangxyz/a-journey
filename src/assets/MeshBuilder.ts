import type { Vec3 } from "../math/Vec3";
import { vec3 } from "../math/Vec3";
import type { MeshData } from "./MeshData";

export class MeshBuilder {
  private positions: number[] = [];
  private normals: number[] = [];
  private uvs: number[] = [];
  private indices: number[] = [];

  addVertex(position: Vec3, normal: Vec3 = [0, 1, 0], uv: [number, number] = [0, 0]): number {
    const index = this.positions.length / 3;
    this.positions.push(position[0], position[1], position[2]);
    this.normals.push(normal[0], normal[1], normal[2]);
    this.uvs.push(uv[0], uv[1]);
    return index;
  }

  addQuad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, normal?: Vec3): void {
    const n = normal ?? vec3.normalize(vec3.cross(vec3.sub(b, a), vec3.sub(c, a)));
    const i = this.positions.length / 3;
    this.addVertex(a, n, [0, 0]);
    this.addVertex(b, n, [1, 0]);
    this.addVertex(c, n, [1, 1]);
    this.addVertex(d, n, [0, 1]);
    this.indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }

  addBoxBetween(a: Vec3, b: Vec3, thickness: number): void {
    const dir = vec3.normalize(vec3.sub(b, a));
    const helper: Vec3 = Math.abs(dir[1]) < 0.94 ? [0, 1, 0] : [1, 0, 0];
    const right = vec3.normalize(vec3.cross(helper, dir));
    const up = vec3.normalize(vec3.cross(dir, right));
    const r = vec3.scale(right, thickness * 0.5);
    const u = vec3.scale(up, thickness * 0.5);

    const a0 = vec3.add(vec3.add(a, r), u);
    const a1 = vec3.add(vec3.sub(a, r), u);
    const a2 = vec3.sub(vec3.sub(a, r), u);
    const a3 = vec3.add(vec3.sub(a, u), r);
    const b0 = vec3.add(vec3.add(b, r), u);
    const b1 = vec3.add(vec3.sub(b, r), u);
    const b2 = vec3.sub(vec3.sub(b, r), u);
    const b3 = vec3.add(vec3.sub(b, u), r);

    this.addQuad(a0, b0, b1, a1);
    this.addQuad(a1, b1, b2, a2);
    this.addQuad(a2, b2, b3, a3);
    this.addQuad(a3, b3, b0, a0);
    this.addQuad(a0, a1, a2, a3);
    this.addQuad(b1, b0, b3, b2);
  }

  build(): MeshData {
    const indexArray =
      this.positions.length / 3 > 65535 ? new Uint32Array(this.indices) : new Uint16Array(this.indices);

    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      uvs: new Float32Array(this.uvs),
      indices: indexArray
    };
  }
}
