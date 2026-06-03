import { MeshBuilder } from "../MeshBuilder";
import type { MeshData } from "../MeshData";

export type PylonVariant = "lattice" | "narrow";

type P3 = [number, number, number];

interface CrossArmSpec {
  y: number;
  span: number;
  depth: number;
  rise: number;
}

interface PylonProfile {
  baseX: number;
  waistX: number;
  topX: number;
  baseZ: number;
  topZ: number;
  main: number;
  brace: number;
  fine: number;
  levels: number[];
  arms: CrossArmSpec[];
  crown: number;
}

export function makePylonMesh(variant: PylonVariant = "lattice"): MeshData {
  const profile = profileFor(variant);
  const b = new MeshBuilder();
  const halfX = (y: number) => tapered(profile.baseX, profile.waistX, profile.topX, y, variant === "lattice" ? 0.58 : 0.52);
  const halfZ = (y: number) => tapered(profile.baseZ, profile.baseZ * 0.58, profile.topZ, y, 0.54);
  const corner = (sx: number, sz: number, y: number): P3 => [sx * halfX(y), y, sz * halfZ(y)];

  addSplayedFeet(b, halfX, halfZ, profile.main);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.addBoxBetween(corner(sx, sz, 0), corner(sx, sz, 1), profile.main);
    }
  }

  for (const y of profile.levels) {
    addRing(b, y, halfX(y), halfZ(y), profile.brace);
  }

  for (let i = 0; i < profile.levels.length - 1; i++) {
    const y0 = profile.levels[i] ?? 0;
    const y1 = profile.levels[i + 1] ?? 1;
    addFrontBackPanel(b, y0, y1, -1, halfX, halfZ, profile.brace, profile.fine);
    addFrontBackPanel(b, y0, y1, 1, halfX, halfZ, profile.brace, profile.fine);
    addSidePanel(b, y0, y1, -1, halfX, halfZ, profile.fine);
    addSidePanel(b, y0, y1, 1, halfX, halfZ, profile.fine);
  }

  addFaceWebbing(b, profile, halfX, halfZ);
  addCenterSpine(b, profile);

  for (const arm of profile.arms) {
    addTrussCrossArm(b, arm, profile.brace, profile.fine);
  }

  addCrown(b, profile, halfX, halfZ);

  return b.build();
}

function addFaceWebbing(
  b: MeshBuilder,
  profile: PylonProfile,
  halfX: (y: number) => number,
  halfZ: (y: number) => number
): void {
  for (let y = 0.08; y < 0.92; y += 0.115) {
    const y1 = Math.min(0.98, y + 0.082);
    const z = -halfZ((y + y1) * 0.5) - 0.002;
    b.addBoxBetween([-halfX(y) * 0.82, y, z], [halfX(y1) * 0.82, y1, z], profile.fine * 0.74);
    b.addBoxBetween([halfX(y) * 0.82, y, z], [-halfX(y1) * 0.82, y1, z], profile.fine * 0.74);
  }
}

function profileFor(variant: PylonVariant): PylonProfile {
  if (variant === "narrow") {
    return {
      baseX: 0.062,
      waistX: 0.030,
      topX: 0.014,
      baseZ: 0.038,
      topZ: 0.014,
      main: 0.0049,
      brace: 0.00275,
      fine: 0.00162,
      levels: [0, 0.10, 0.20, 0.30, 0.405, 0.51, 0.615, 0.72, 0.825, 0.925, 0.985],
      arms: [
        { y: 0.79, span: 0.145, depth: 0.028, rise: 0.026 },
        { y: 0.64, span: 0.118, depth: 0.024, rise: 0.021 }
      ],
      crown: 1.090
    };
  }

  return {
    baseX: 0.088,
    waistX: 0.040,
    topX: 0.016,
    baseZ: 0.054,
    topZ: 0.017,
    main: 0.0062,
    brace: 0.00335,
    fine: 0.00185,
    levels: [0, 0.078, 0.156, 0.238, 0.320, 0.405, 0.49, 0.575, 0.66, 0.745, 0.83, 0.915, 0.985],
    arms: [
      { y: 0.805, span: 0.218, depth: 0.038, rise: 0.035 },
      { y: 0.640, span: 0.178, depth: 0.032, rise: 0.028 },
      { y: 0.480, span: 0.142, depth: 0.027, rise: 0.023 }
    ],
    crown: 1.105
  };
}

function tapered(base: number, waist: number, top: number, y: number, waistY: number): number {
  if (y <= waistY) {
    const t = smooth01(y / waistY);
    return base + (waist - base) * t;
  }
  const t = smooth01((y - waistY) / (1 - waistY));
  return waist + (top - waist) * t;
}

function smooth01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function addSplayedFeet(
  b: MeshBuilder,
  halfX: (y: number) => number,
  halfZ: (y: number) => number,
  t: number
): void {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.addBoxBetween([sx * (halfX(0) + 0.014), -0.012, sz * (halfZ(0) + 0.008)], [sx * halfX(0.06), 0.06, sz * halfZ(0.06)], t * 0.9);
      b.addBoxBetween([sx * (halfX(0) + 0.02), 0.0, sz * halfZ(0)], [sx * (halfX(0) - 0.008), 0.0, sz * halfZ(0)], t * 0.58);
    }
  }
}

function addRing(b: MeshBuilder, y: number, x: number, z: number, t: number): void {
  b.addBoxBetween([-x, y, -z], [x, y, -z], t);
  b.addBoxBetween([-x, y, z], [x, y, z], t);
  b.addBoxBetween([-x, y, -z], [-x, y, z], t * 0.72);
  b.addBoxBetween([x, y, -z], [x, y, z], t * 0.72);
  b.addBoxBetween([-x * 0.34, y, -z], [x * 0.34, y, -z], t * 0.55);
  b.addBoxBetween([-x * 0.34, y, z], [x * 0.34, y, z], t * 0.55);
}

function addFrontBackPanel(
  b: MeshBuilder,
  y0: number,
  y1: number,
  zSign: number,
  halfX: (y: number) => number,
  halfZ: (y: number) => number,
  brace: number,
  fine: number
): void {
  const ym = (y0 + y1) * 0.5;
  const z0 = zSign * halfZ(y0);
  const z1 = zSign * halfZ(y1);
  const zm = zSign * halfZ(ym);
  const x0 = halfX(y0);
  const x1 = halfX(y1);
  const xm = halfX(ym);

  b.addBoxBetween([-x0, y0, z0], [0, ym, zm], brace);
  b.addBoxBetween([x0, y0, z0], [0, ym, zm], brace);
  b.addBoxBetween([0, ym, zm], [-x1, y1, z1], brace);
  b.addBoxBetween([0, ym, zm], [x1, y1, z1], brace);

  b.addBoxBetween([-x0 * 0.48, y0, z0], [-xm * 0.18, ym, zm], fine);
  b.addBoxBetween([x0 * 0.48, y0, z0], [xm * 0.18, ym, zm], fine);
  b.addBoxBetween([-xm * 0.18, ym, zm], [-x1 * 0.48, y1, z1], fine);
  b.addBoxBetween([xm * 0.18, ym, zm], [x1 * 0.48, y1, z1], fine);

  b.addBoxBetween([0, y0, z0], [0, y1, z1], fine * 0.78);
  b.addBoxBetween([-xm * 0.5, ym, zm], [xm * 0.5, ym, zm], fine * 0.72);
}

function addSidePanel(
  b: MeshBuilder,
  y0: number,
  y1: number,
  xSign: number,
  halfX: (y: number) => number,
  halfZ: (y: number) => number,
  t: number
): void {
  const ym = (y0 + y1) * 0.5;
  const x0 = xSign * halfX(y0);
  const x1 = xSign * halfX(y1);
  const xm = xSign * halfX(ym);
  const z0 = halfZ(y0);
  const z1 = halfZ(y1);
  const zm = halfZ(ym);

  b.addBoxBetween([x0, y0, -z0], [xm, ym, zm], t);
  b.addBoxBetween([x0, y0, z0], [xm, ym, -zm], t);
  b.addBoxBetween([xm, ym, zm], [x1, y1, -z1], t);
  b.addBoxBetween([xm, ym, -zm], [x1, y1, z1], t);
  b.addBoxBetween([xm, y0, 0], [xm, y1, 0], t * 0.68);
}

function addCenterSpine(b: MeshBuilder, profile: PylonProfile): void {
  b.addBoxBetween([0, 0.06, -0.006], [0, 0.98, -0.006], profile.fine * 1.18);
  b.addBoxBetween([-0.032, 0.10, -0.006], [-0.020, 0.98, -0.006], profile.fine * 0.95);
  b.addBoxBetween([0.032, 0.10, -0.006], [0.020, 0.98, -0.006], profile.fine * 0.95);
  for (let y = 0.13; y < 0.94; y += 0.055) {
    b.addBoxBetween([-0.040, y, -0.006], [0.040, y + 0.016, -0.006], profile.fine * 0.74);
  }
}

function addTrussCrossArm(b: MeshBuilder, arm: CrossArmSpec, t: number, fine: number): void {
  const y = arm.y;
  const zFront = -arm.depth;
  const zBack = arm.depth;
  const left: P3 = [-arm.span, y, 0];
  const right: P3 = [arm.span, y, 0];
  const crown: P3 = [0, y + arm.rise, 0];
  const lower: P3 = [0, y - arm.rise * 0.55, 0];

  b.addBoxBetween(left, right, t);
  b.addBoxBetween([-arm.span * 0.86, y - arm.rise * 0.26, 0], [arm.span * 0.86, y - arm.rise * 0.26, 0], fine * 0.82);
  b.addBoxBetween(left, crown, fine);
  b.addBoxBetween(right, crown, fine);
  b.addBoxBetween(left, lower, fine);
  b.addBoxBetween(right, lower, fine);

  for (const z of [zFront, zBack]) {
    b.addBoxBetween([-arm.span * 0.86, y, z], [arm.span * 0.86, y, z], fine * 0.62);
    b.addBoxBetween([-arm.span * 0.72, y - arm.rise * 0.22, z], [0, y + arm.rise * 0.62, z], fine * 0.54);
    b.addBoxBetween([arm.span * 0.72, y - arm.rise * 0.22, z], [0, y + arm.rise * 0.62, z], fine * 0.54);
    b.addBoxBetween([-arm.span * 0.42, y - arm.rise * 0.32, z], [arm.span * 0.42, y + arm.rise * 0.34, z], fine * 0.42);
    b.addBoxBetween([arm.span * 0.42, y - arm.rise * 0.32, z], [-arm.span * 0.42, y + arm.rise * 0.34, z], fine * 0.42);
  }

  addInsulatorString(b, left, -1, fine);
  addInsulatorString(b, right, 1, fine);
  addJumperLoop(b, left, -1, fine);
  addJumperLoop(b, right, 1, fine);
}

function addInsulatorString(b: MeshBuilder, anchor: P3, sign: number, t: number): void {
  const top: P3 = [anchor[0] + sign * 0.014, anchor[1] - 0.006, 0];
  const bottom: P3 = [anchor[0] + sign * 0.026, anchor[1] - 0.074, 0];
  b.addBoxBetween(top, bottom, t * 0.76);
  for (let i = 0; i < 7; i++) {
    const y = top[1] - i * 0.0095;
    const x = top[0] + sign * i * 0.0016;
    b.addBoxBetween([x - 0.0085, y, -0.0024], [x + 0.0085, y, 0.0024], t * 0.86);
  }
}

function addJumperLoop(b: MeshBuilder, anchor: P3, sign: number, t: number): void {
  const points: P3[] = [
    [anchor[0] + sign * 0.01, anchor[1] - 0.02, 0],
    [anchor[0] + sign * 0.025, anchor[1] - 0.045, 0],
    [anchor[0] + sign * 0.046, anchor[1] - 0.042, 0],
    [anchor[0] + sign * 0.058, anchor[1] - 0.018, 0]
  ];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const c = points[i + 1];
    if (a && c) b.addBoxBetween(a, c, t * 0.50);
  }
}

function addCrown(
  b: MeshBuilder,
  profile: PylonProfile,
  halfX: (y: number) => number,
  halfZ: (y: number) => number
): void {
  const neck = 0.88;
  b.addBoxBetween([-halfX(neck), neck, 0], [0, profile.crown, 0], profile.brace);
  b.addBoxBetween([halfX(neck), neck, 0], [0, profile.crown, 0], profile.brace);
  b.addBoxBetween([0, neck, -halfZ(neck)], [0, profile.crown, 0], profile.fine);
  b.addBoxBetween([0, neck, halfZ(neck)], [0, profile.crown, 0], profile.fine);
  b.addBoxBetween([-0.04, profile.crown - 0.032, 0], [0.04, profile.crown - 0.032, 0], profile.fine);
  b.addBoxBetween([0, 0.965, 0], [0, profile.crown + 0.025, 0], profile.fine);
}
