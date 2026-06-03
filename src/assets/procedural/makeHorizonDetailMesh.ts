import { RNG } from "../../math/RNG";
import type { Vec3 } from "../../math/Vec3";
import { MeshBuilder } from "../MeshBuilder";
import type { MeshData } from "../MeshData";
import { terrainHeight } from "./makeTerrainMesh";

interface HorizonDetailOptions {
  seed: number;
  terrainAmplitude: number;
  detailScale: number;
}

export function makeHorizonDetailMesh(options: HorizonDetailOptions): MeshData {
  const rng = new RNG(options.seed + 1500);
  const b = new MeshBuilder();
  const detail = Math.max(0.25, options.detailScale);
  addDistantMountainRidge(b, options, -1220, -5200, 5200, scaledCount(88, detail), -8.0, 18, 118, 2.25);
  addDistantMountainRidge(b, options, -1460, -5600, 5600, scaledCount(94, detail), -5.0, 14, 88, 0.25);
  addDistantMountainRidge(b, options, -1710, -6100, 6100, scaledCount(104, detail), -8.0, 10, 62, 1.35);
  addBrushBand(b, rng, options, -910, -5000, 5000, scaledCount(230, detail), 0.9, 6.8);
  addBrushBand(b, rng, options, -1070, -4800, 4800, scaledCount(200, detail), 0.6, 5.1);
  addTreeLine(b, rng, options, -1240, -4400, 4400, scaledCount(150, detail), 2.0, 11.5);
  addTreeLine(b, rng, options, -1080, -4100, 4100, scaledCount(120, detail), 1.0, 6.4);
  addRooftops(b, rng, options, -1160, scaledCount(30, detail));
  addTinyPoles(b, rng, options, -1120, scaledCount(88, detail));
  return b.build();
}

function scaledCount(base: number, detailScale: number): number {
  return Math.max(1, Math.round(base * detailScale));
}

function addDistantMountainRidge(
  b: MeshBuilder,
  options: HorizonDetailOptions,
  z: number,
  minX: number,
  maxX: number,
  segments: number,
  baseOffset: number,
  minHeight: number,
  maxHeight: number,
  phase: number
): void {
  const normal: Vec3 = [0, 0, 1];
  const bases: number[] = [];
  const tops: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = minX + (maxX - minX) * t;
    const broad =
      Math.pow(0.5 + 0.5 * Math.sin(t * Math.PI * 2.1 + phase), 1.18) * 0.52 +
      Math.pow(0.5 + 0.5 * Math.sin(t * Math.PI * 4.7 + phase * 1.7), 1.45) * 0.30 +
      Math.pow(0.5 + 0.5 * Math.sin(t * Math.PI * 8.4 + phase * 2.8), 2.10) * 0.18;
    const shifted = (t + phase * 0.071) % 1;
    const peakMass =
      Math.exp(-Math.pow((shifted - 0.18) / 0.115, 2.0)) * 0.46 +
      Math.exp(-Math.pow((shifted - 0.45) / 0.155, 2.0)) * 0.66 +
      Math.exp(-Math.pow((shifted - 0.73) / 0.130, 2.0)) * 0.52 +
      Math.exp(-Math.pow((shifted - 0.91) / 0.100, 2.0)) * 0.30;
    const base = terrainHeight(x, z, options.seed, options.terrainAmplitude) + baseOffset;
    const profile = Math.min(1, 0.08 + broad * 0.30 + peakMass);
    const h = minHeight + (maxHeight - minHeight) * profile;
    bases.push(base - 2.2);
    tops.push(base + h);
  }

  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const x0 = minX + (maxX - minX) * t0;
    const x1 = minX + (maxX - minX) * t1;
    const base0 = bases[i] ?? 0;
    const base1 = bases[i + 1] ?? base0;
    const top0 = tops[i] ?? base0;
    const top1 = tops[i + 1] ?? base1;
    b.addQuad([x0, base0, z], [x1, base1, z], [x1, top1, z], [x0, top0, z], normal);
  }
}

function addBrushBand(
  b: MeshBuilder,
  rng: RNG,
  options: HorizonDetailOptions,
  z: number,
  minX: number,
  maxX: number,
  count: number,
  minHeight: number,
  maxHeight: number
): void {
  const normal: Vec3 = [0, 0, 1];
  let x = minX;
  for (let i = 0; i < count && x < maxX; i++) {
    const w = rng.float(10, 30);
    const x0 = x + rng.float(-3.0, 2.0);
    const x1 = Math.min(maxX, x0 + w);
    const mid = (x0 + x1) * 0.5;
    const zOff = z + rng.float(-18, 18);
    const base = terrainHeight(mid, zOff, options.seed, options.terrainAmplitude) - rng.float(0.4, 1.8);
    const h = rng.float(minHeight, maxHeight) * (0.72 + rng.next() * 0.56);
    const crown = base + h + rng.float(0.0, maxHeight * 0.45);
    const shoulder = base + h * rng.float(0.55, 0.95);
    const peakX = mid + rng.float(-w * 0.28, w * 0.28);
    b.addQuad([x0, base, zOff], [x1, base + rng.float(-0.15, 0.25), zOff], [peakX, crown, zOff], [x0, shoulder, zOff], normal);
    x += w * rng.float(0.64, 1.02);
  }
}

function addTreeLine(
  b: MeshBuilder,
  rng: RNG,
  options: HorizonDetailOptions,
  z: number,
  minX: number,
  maxX: number,
  count: number,
  minHeight: number,
  maxHeight: number
): void {
  let x = minX;
  const normal: Vec3 = [0, 0, 1];
  for (let i = 0; i < count && x < maxX; i++) {
    const w = rng.float(16, 38);
    const x0 = x + rng.float(-2.0, 1.5);
    const x1 = Math.min(maxX, x0 + w);
    const mid = (x0 + x1) * 0.5;
    const base = terrainHeight(mid, z, options.seed, options.terrainAmplitude) - rng.float(0.7, 2.6);
    const h0 = rng.float(minHeight, maxHeight);
    const h1 = rng.float(minHeight, maxHeight);
    const crown = Math.max(h0, h1) + rng.float(0.0, maxHeight * 0.55);
    const xm = mid + rng.float(-w * 0.22, w * 0.22);
    b.addQuad([x0, base, z], [x1, base + rng.float(-0.3, 0.3), z], [xm, base + crown, z], [x0, base + h0, z], normal);

    if (rng.next() > 0.52) {
      const subX0 = x0 + w * rng.float(0.12, 0.34);
      const subX1 = x0 + w * rng.float(0.58, 0.94);
      const subTop = base + rng.float(minHeight * 0.8, maxHeight * 1.25);
      b.addQuad([subX0, base - 0.2, z + 0.8], [subX1, base, z + 0.8], [subX1, subTop, z + 0.8], [subX0, subTop * 0.96 + base * 0.04, z + 0.8], normal);
    }

    x += w * rng.float(0.72, 1.06);
  }
}

function addRooftops(b: MeshBuilder, rng: RNG, options: HorizonDetailOptions, z: number, count: number): void {
  const normal: Vec3 = [0, 0, 1];
  for (let i = 0; i < count; i++) {
    const x = rng.float(-1360, 1460);
    const w = rng.float(24, 70);
    const y = terrainHeight(x, z + rng.float(-45, 35), options.seed, options.terrainAmplitude) + rng.float(0.2, 1.4);
    const h = rng.float(1.2, 4.4);
    const roof = rng.float(0.8, 2.8);
    const zOff = z + rng.float(-38, 28);
    const left = x - w * 0.5;
    const right = x + w * 0.5;
    const mid = x + rng.float(-w * 0.14, w * 0.14);
    b.addQuad([left, y, zOff], [right, y, zOff], [right, y + h, zOff], [left, y + h, zOff], normal);
    b.addQuad([left - 2, y + h, zOff], [right + 2, y + h, zOff], [mid, y + h + roof, zOff], [left - 2, y + h + roof * 0.15, zOff], normal);
  }
}

function addTinyPoles(b: MeshBuilder, rng: RNG, options: HorizonDetailOptions, z: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const x = rng.float(-1480, 1540);
    const zOff = z + rng.float(-150, 130);
    const base = terrainHeight(x, zOff, options.seed, options.terrainAmplitude) - rng.float(0.2, 1.3);
    const h = rng.float(3.0, 15.5);
    const t = rng.float(0.045, 0.12);
    b.addBoxBetween([x, base, zOff], [x + rng.float(-0.08, 0.08), base + h, zOff], t);
    if (rng.next() > 0.38) {
      const arm = rng.float(1.5, 4.6);
      const y = base + h * rng.float(0.72, 0.92);
      b.addBoxBetween([x - arm, y, zOff], [x + arm, y + rng.float(-0.12, 0.12), zOff], t * 0.72);
    }
  }
}
