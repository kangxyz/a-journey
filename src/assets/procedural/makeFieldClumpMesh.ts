import { MeshBuilder } from "../MeshBuilder";
import type { MeshData } from "../MeshData";

type P3 = [number, number, number];

export function makeFieldClumpMesh(): MeshData {
  const b = new MeshBuilder();

  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI;
    const right: P3 = [Math.cos(angle), 0, Math.sin(angle)];
    const normal: P3 = [-Math.sin(angle), 0, Math.cos(angle)];
    const width = 0.55 + (i % 3) * 0.14;
    const lean = (i - 3) * 0.015;
    addCard(b, right, normal, width, 0.84 + (i % 2) * 0.18, lean);
  }

  return b.build();
}

function addCard(b: MeshBuilder, right: P3, normal: P3, width: number, height: number, lean: number): void {
  const baseLeft: P3 = [-right[0] * width, 0, -right[2] * width];
  const baseRight: P3 = [right[0] * width, 0, right[2] * width];
  const topRight: P3 = [right[0] * width * 0.64 + normal[0] * lean, height, right[2] * width * 0.64 + normal[2] * lean];
  const topLeft: P3 = [-right[0] * width * 0.58 + normal[0] * lean, height * 0.94, -right[2] * width * 0.58 + normal[2] * lean];
  b.addQuad(baseLeft, baseRight, topRight, topLeft, normal);
}
