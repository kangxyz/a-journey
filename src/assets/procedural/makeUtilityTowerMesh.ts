import { MeshBuilder } from "../MeshBuilder";
import type { MeshData } from "../MeshData";

type P3 = [number, number, number];

export function makeUtilityTowerMesh(): MeshData {
  const b = new MeshBuilder();
  const main = 0.0054;
  const brace = 0.00265;
  const fine = 0.00165;
  const halfX = (y: number) => 0.027 + (0.012 - 0.027) * y;
  const halfZ = (y: number) => 0.020 + (0.008 - 0.020) * y;
  const corner = (sx: number, sz: number, y: number): P3 => [sx * halfX(y), y, sz * halfZ(y)];

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.addBoxBetween(corner(sx, sz, 0), corner(sx, sz, 1), main);
    }
  }

  for (const y of [0.13, 0.26, 0.39, 0.52, 0.65, 0.78, 0.91]) {
    addRing(b, y, halfX(y), halfZ(y), brace);
  }

  for (const [y0, y1] of [
    [0.0, 0.13],
    [0.13, 0.26],
    [0.26, 0.39],
    [0.39, 0.52],
    [0.52, 0.65],
    [0.65, 0.78],
    [0.78, 0.91],
    [0.91, 1.0]
  ] as Array<[number, number]>) {
    addPanelBraces(b, y0, y1, halfX, halfZ, fine);
  }

  addUtilityArm(b, 0.84, 0.132, 0.018, brace, fine);
  addUtilityArm(b, 0.68, 0.108, 0.016, brace, fine);
  addUtilityArm(b, 0.53, 0.086, 0.014, brace, fine);
  b.addBoxBetween([0, 0.90, 0], [0, 1.10, 0], main * 0.68);
  b.addBoxBetween([-0.020, 1.015, 0], [0.020, 1.015, 0], brace * 0.82);

  return b.build();
}

function addRing(b: MeshBuilder, y: number, x: number, z: number, t: number): void {
  b.addBoxBetween([-x, y, -z], [x, y, -z], t);
  b.addBoxBetween([-x, y, z], [x, y, z], t);
  b.addBoxBetween([-x, y, -z], [-x, y, z], t);
  b.addBoxBetween([x, y, -z], [x, y, z], t);
}

function addPanelBraces(
  b: MeshBuilder,
  y0: number,
  y1: number,
  halfX: (y: number) => number,
  halfZ: (y: number) => number,
  t: number
): void {
  const ym = (y0 + y1) * 0.5;
  for (const zSign of [-1, 1]) {
    const z0 = zSign * halfZ(y0);
    const z1 = zSign * halfZ(y1);
    const zm = zSign * halfZ(ym);
    b.addBoxBetween([-halfX(y0), y0, z0], [0, ym, zm], t);
    b.addBoxBetween([halfX(y0), y0, z0], [0, ym, zm], t);
    b.addBoxBetween([0, ym, zm], [-halfX(y1), y1, z1], t);
    b.addBoxBetween([0, ym, zm], [halfX(y1), y1, z1], t);
  }
  for (const xSign of [-1, 1]) {
    const x0 = xSign * halfX(y0);
    const x1 = xSign * halfX(y1);
    const xm = xSign * halfX(ym);
    b.addBoxBetween([x0, y0, -halfZ(y0)], [xm, ym, halfZ(ym)], t * 0.85);
    b.addBoxBetween([x0, y0, halfZ(y0)], [xm, ym, -halfZ(ym)], t * 0.85);
    b.addBoxBetween([xm, ym, halfZ(ym)], [x1, y1, -halfZ(y1)], t * 0.85);
    b.addBoxBetween([xm, ym, -halfZ(ym)], [x1, y1, halfZ(y1)], t * 0.85);
  }
}

function addUtilityArm(b: MeshBuilder, y: number, span: number, depth: number, t: number, fine: number): void {
  const left: P3 = [-span, y, 0];
  const right: P3 = [span, y, 0];
  b.addBoxBetween(left, right, t);
  b.addBoxBetween([-span * 0.82, y - 0.032, -depth], [span * 0.82, y - 0.032, -depth], fine);
  b.addBoxBetween([-span * 0.82, y - 0.032, depth], [span * 0.82, y - 0.032, depth], fine);
  b.addBoxBetween(left, [0, y + 0.04, -depth], fine);
  b.addBoxBetween(right, [0, y + 0.04, -depth], fine);
  b.addBoxBetween(left, [0, y + 0.04, depth], fine);
  b.addBoxBetween(right, [0, y + 0.04, depth], fine);
  b.addBoxBetween(left, [0, y - 0.052, 0], fine);
  b.addBoxBetween(right, [0, y - 0.052, 0], fine);
  addHanger(b, left, -1, fine);
  addHanger(b, right, 1, fine);
}

function addHanger(b: MeshBuilder, anchor: P3, sign: number, t: number): void {
  const bottom: P3 = [anchor[0] + sign * 0.016, anchor[1] - 0.058, 0];
  b.addBoxBetween(anchor, bottom, t * 0.65);
  for (let i = 0; i < 5; i++) {
    const y = anchor[1] - 0.012 - i * 0.009;
    const x = anchor[0] + sign * (0.005 + i * 0.002);
    b.addBoxBetween([x - 0.007, y, -0.002], [x + 0.007, y, 0.002], t * 0.78);
  }
}
