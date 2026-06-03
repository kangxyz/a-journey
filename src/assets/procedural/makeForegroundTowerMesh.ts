import { MeshBuilder } from "../MeshBuilder";
import type { MeshData } from "../MeshData";

type P3 = [number, number, number];

export function makeForegroundTowerMesh(): MeshData {
  const b = new MeshBuilder();
  const main = 0.0074;
  const brace = 0.00335;
  const fine = 0.00195;
  const halfX = (y: number) => 0.072 + (0.030 - 0.072) * y;
  const halfZ = (y: number) => 0.038 + (0.016 - 0.038) * y;
  const corner = (sx: number, sz: number, y: number): P3 => [sx * halfX(y), y, sz * halfZ(y)];

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.addBoxBetween(corner(sx, sz, -0.10), corner(sx, sz, 1.12), main);
    }
  }

  for (let y = 0.02; y <= 1.04; y += 0.092) {
    addRing(b, y, halfX(y), halfZ(y), brace);
  }

  for (let y0 = -0.02; y0 < 1.02; y0 += 0.092) {
    const y1 = y0 + 0.092;
    addPanel(b, y0, y1, halfX, halfZ, fine);
  }

  addCroppedTowerFace(b, main, brace, fine);
  addLongCrossArm(b, 0.770, 0.22, 0.034, brace * 0.82, fine * 0.78);
  addTensionHardware(b, 0.875, 0.35, main, brace, fine);
  b.addBoxBetween([-0.054, 0.03, 0.0], [-0.043, 1.09, 0.0], main * 0.92);
  b.addBoxBetween([0.054, 0.04, 0.0], [0.040, 1.07, 0.0], main * 0.78);
  b.addBoxBetween([-0.034, 1.015, 0.0], [0.076, 1.040, 0.0], fine * 1.10);
  for (let y = 0.10; y < 0.95; y += 0.12) {
    b.addBoxBetween([-halfX(y) * 0.82, y, -0.004], [halfX(y + 0.08) * 0.82, y + 0.08, -0.004], fine * 0.88);
    b.addBoxBetween([halfX(y) * 0.82, y, -0.004], [-halfX(y + 0.08) * 0.82, y + 0.08, -0.004], fine * 0.88);
  }

  return b.build();
}

function addCroppedTowerFace(b: MeshBuilder, main: number, brace: number, fine: number): void {
  const z = -0.010;
  const outerLeft = -0.132;
  const innerLeft = -0.072;
  const innerRight = -0.018;
  b.addBoxBetween([outerLeft, -0.10, z], [outerLeft + 0.012, 1.17, z], main * 1.34);
  b.addBoxBetween([innerLeft, -0.07, z], [innerLeft + 0.005, 1.14, z], main * 1.10);
  b.addBoxBetween([innerRight, 0.00, z], [innerRight - 0.006, 1.08, z], main * 0.86);

  for (let y = 0.03; y < 1.05; y += 0.082) {
    const sway = Math.sin(y * 7.0) * 0.003;
    b.addBoxBetween([outerLeft + sway, y, z], [innerRight - sway * 0.6, y + 0.004, z], brace * 0.88);
  }

  for (let y = 0.05; y < 0.99; y += 0.082) {
    const y1 = y + 0.082;
    b.addBoxBetween([outerLeft, y, z], [innerLeft, y1, z], fine * 1.20);
    b.addBoxBetween([innerLeft, y, z], [outerLeft, y1, z], fine * 1.05);
    b.addBoxBetween([innerLeft, y + 0.006, z], [innerRight, y1 - 0.002, z], fine * 1.00);
    b.addBoxBetween([innerRight, y + 0.002, z], [innerLeft, y1 + 0.004, z], fine * 0.92);
  }

  const highY = 0.905;
  const midY = 0.760;
  b.addBoxBetween([outerLeft, highY, z], [0.245, highY + 0.014, z], main * 1.16);
  b.addBoxBetween([outerLeft + 0.008, highY - 0.034, z], [0.205, highY - 0.012, z], brace * 0.84);
  b.addBoxBetween([innerLeft, highY - 0.135, z], [0.195, highY + 0.010, z], brace * 0.94);
  b.addBoxBetween([outerLeft, midY, z], [0.165, midY + 0.004, z], brace * 1.02);
  b.addBoxBetween([innerLeft, midY - 0.092, z], [0.145, midY + 0.006, z], fine * 1.16);

  for (const x of [0.145, 0.215]) {
    addHeavyInsulator(b, [x, highY + 0.004, z], fine * 1.05);
  }
}

function addRing(b: MeshBuilder, y: number, x: number, z: number, t: number): void {
  b.addBoxBetween([-x, y, -z], [x, y, -z], t);
  b.addBoxBetween([-x, y, z], [x, y, z], t);
  b.addBoxBetween([-x, y, -z], [-x, y, z], t * 0.72);
  b.addBoxBetween([x, y, -z], [x, y, z], t * 0.72);
}

function addPanel(
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
    b.addBoxBetween([x0, y0, -halfZ(y0)], [xm, ym, halfZ(ym)], t * 0.82);
    b.addBoxBetween([x0, y0, halfZ(y0)], [xm, ym, -halfZ(ym)], t * 0.82);
    b.addBoxBetween([xm, ym, halfZ(ym)], [x1, y1, -halfZ(y1)], t * 0.82);
    b.addBoxBetween([xm, ym, -halfZ(ym)], [x1, y1, halfZ(y1)], t * 0.82);
  }
}

function addLongCrossArm(b: MeshBuilder, y: number, span: number, depth: number, t: number, fine: number): void {
  const root: P3 = [-0.055, y - 0.004, 0.0];
  const tip: P3 = [span, y + 0.020, 0.0];
  const under: P3 = [span * 0.72, y - 0.050, 0.0];
  b.addBoxBetween(root, tip, t * 1.15);
  b.addBoxBetween([-0.040, y - 0.030, -depth], [span * 0.90, y - 0.014, -depth], fine * 1.05);
  b.addBoxBetween([-0.040, y - 0.030, depth], [span * 0.90, y - 0.014, depth], fine * 1.05);
  b.addBoxBetween([0.0, y - 0.125, 0.0], [span * 0.52, y + 0.006, 0.0], fine * 1.28);
  b.addBoxBetween([0.012, y - 0.075, -depth], [span * 0.70, y + 0.004, -depth], fine);
  b.addBoxBetween([0.012, y - 0.075, depth], [span * 0.70, y + 0.004, depth], fine);
  b.addBoxBetween(root, under, fine * 1.15);
  b.addBoxBetween(under, tip, fine * 0.95);

  for (const x of [span * 0.62]) {
    addHeavyInsulator(b, [x, y - 0.002, 0.0], fine);
  }
}

function addHeavyInsulator(b: MeshBuilder, anchor: P3, t: number): void {
  const bottom: P3 = [anchor[0] + 0.026, anchor[1] - 0.104, 0.0];
  b.addBoxBetween(anchor, bottom, t * 0.82);
  for (let i = 0; i < 5; i++) {
    const y = anchor[1] - 0.018 - i * 0.016;
    const x = anchor[0] + 0.004 + i * 0.0032;
    b.addBoxBetween([x - 0.014, y, -0.003], [x + 0.014, y, 0.003], t * 0.95);
  }
  b.addBoxBetween(bottom, [bottom[0] + 0.028, bottom[1] - 0.022, 0.0], t * 0.58);
  b.addBoxBetween([bottom[0] + 0.028, bottom[1] - 0.022, 0.0], [bottom[0] + 0.060, bottom[1] - 0.010, 0.0], t * 0.50);
}

function addTensionHardware(b: MeshBuilder, y: number, span: number, main: number, brace: number, fine: number): void {
  const mast: P3 = [-0.090, y - 0.018, 0.0];
  const end: P3 = [span, y + 0.060, 0.0];
  const lowerEnd: P3 = [span * 0.78, y - 0.050, 0.0];
  b.addBoxBetween(mast, end, main * 2.15);
  b.addBoxBetween([-0.080, y - 0.052, -0.010], [span * 0.86, y + 0.010, -0.010], brace * 1.05);
  b.addBoxBetween([-0.080, y - 0.052, 0.010], [span * 0.86, y + 0.010, 0.010], brace * 1.05);
  b.addBoxBetween([0.020, y - 0.120, 0.0], lowerEnd, brace * 1.12);
  b.addBoxBetween(lowerEnd, end, fine * 1.10);

  const blockStart = span * 0.18;
  const blockEnd = span * 0.46;
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    const x0 = blockStart + (blockEnd - blockStart) * t;
    const x1 = x0 + span * 0.052;
    const yy = y + 0.004 + t * 0.018;
    b.addBoxBetween([x0, yy - 0.018, -0.008], [x1, yy + 0.018, 0.008], main * 1.18);
  }

  const loopA: P3[] = [
    [span * 0.43, y - 0.020, 0.0],
    [span * 0.45, y - 0.125, 0.0],
    [span * 0.54, y - 0.175, 0.0],
    [span * 0.62, y - 0.122, 0.0],
    [span * 0.61, y - 0.016, 0.0]
  ];
  const loopB: P3[] = [
    [span * 0.54, y - 0.012, 0.0],
    [span * 0.57, y - 0.160, 0.0],
    [span * 0.66, y - 0.205, 0.0],
    [span * 0.73, y - 0.132, 0.0],
    [span * 0.72, y + 0.002, 0.0]
  ];
  addPolyline(b, loopA, fine * 0.75);
  addPolyline(b, loopB, fine * 0.66);
}

function addPolyline(b: MeshBuilder, points: P3[], t: number): void {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const c = points[i + 1];
    if (a && c) b.addBoxBetween(a, c, t);
  }
}
