import { fbm2 } from "../../math/Noise";
import type { MeshData } from "../MeshData";

export interface MountainLayerSpec {
  distance: number;
  width: number;
  baseHeight: number;
  amplitude: number;
  seed: number;
}

export function makeMountainStrip(spec: MountainLayerSpec): MeshData {
  const xSteps = 320;
  const zSteps = 8;
  const depth = Math.max(180, spec.distance * 0.034);
  const floorY = -18.0;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const topRows: number[][] = [];
  const frontBaseRow: number[] = [];
  const backBaseRow: number[] = [];

  for (let zIndex = 0; zIndex <= zSteps; zIndex++) {
    const zt = zIndex / zSteps;
    const z = -spec.distance - (zt - 0.5) * depth;
    const row: number[] = [];

    for (let xIndex = 0; xIndex <= xSteps; xIndex++) {
      const t = xIndex / xSteps;
      const x = (t - 0.5) * spec.width;
      const y = ridgeHeight(t, zt, spec);
      row.push(pushVertex(positions, normals, uvs, x, y, z, t, zt));
    }
    topRows.push(row);
  }

  for (let xIndex = 0; xIndex <= xSteps; xIndex++) {
    const t = xIndex / xSteps;
    const x = (t - 0.5) * spec.width;
    const frontZ = -spec.distance + depth * 0.5;
    const backZ = -spec.distance - depth * 0.5;
    frontBaseRow.push(pushVertex(positions, normals, uvs, x, floorY, frontZ, t, -0.1));
    backBaseRow.push(pushVertex(positions, normals, uvs, x, floorY, backZ, t, 1.1));
  }

  // Top cap: the actual distant mountain surface receding into the red haze.
  for (let zIndex = 0; zIndex < zSteps; zIndex++) {
    for (let xIndex = 0; xIndex < xSteps; xIndex++) {
      const a = topRows[zIndex]?.[xIndex] ?? 0;
      const b = topRows[zIndex]?.[xIndex + 1] ?? 0;
      const c = topRows[zIndex + 1]?.[xIndex] ?? 0;
      const d = topRows[zIndex + 1]?.[xIndex + 1] ?? 0;
      indices.push(a, c, b, b, c, d);
    }
  }

  // Front and back faces give the range a real black silhouette instead of a
  // thin horizontal terrain slice.
  for (let xIndex = 0; xIndex < xSteps; xIndex++) {
    const ft0 = topRows[0]?.[xIndex] ?? 0;
    const ft1 = topRows[0]?.[xIndex + 1] ?? 0;
    const fb0 = frontBaseRow[xIndex] ?? 0;
    const fb1 = frontBaseRow[xIndex + 1] ?? 0;
    indices.push(fb0, ft0, fb1, fb1, ft0, ft1);

    const bt0 = topRows[zSteps]?.[xIndex] ?? 0;
    const bt1 = topRows[zSteps]?.[xIndex + 1] ?? 0;
    const bb0 = backBaseRow[xIndex] ?? 0;
    const bb1 = backBaseRow[xIndex + 1] ?? 0;
    indices.push(bb1, bt1, bb0, bb0, bt1, bt0);
  }

  accumulateNormals(positions, indices, normals);

  const indexArray = positions.length / 3 > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: indexArray
  };
}

function pushVertex(
  positions: number[],
  normals: number[],
  uvs: number[],
  x: number,
  y: number,
  z: number,
  u: number,
  v: number
): number {
  const index = positions.length / 3;
  positions.push(x, y, z);
  normals.push(0, 1, 0);
  uvs.push(u, v);
  return index;
}

function ridgeHeight(t: number, zt: number, spec: MountainLayerSpec): number {
  const visualBase = spec.baseHeight;
  const visualAmplitude = spec.amplitude;
  const broad = fbm2(t * 1.1, spec.distance * 0.0019, spec.seed, 5);
  const mid = fbm2(t * 2.7 + zt * 0.18, 3.2 + spec.distance * 0.0012, spec.seed + 23, 4);
  const fine = fbm2(t * 8.2 - zt * 0.42, 1.9, spec.seed + 61, 3);
  const leftMass = Math.exp(-Math.pow((t - 0.12) / 0.26, 2.0)) * 0.32;
  const middleMass = Math.exp(-Math.pow((t - 0.46) / 0.34, 2.0)) * 0.45;
  const rightMass = Math.exp(-Math.pow((t - 0.84) / 0.28, 2.0)) * 0.34;
  const longSwell = Math.pow(0.5 + 0.5 * Math.sin(t * Math.PI * 2.05 + broad * 3.8), 1.20);
  const shoulder = Math.pow(0.5 + 0.5 * Math.sin(t * Math.PI * 5.75 + mid * 3.2 + 0.7), 1.45);
  const nearHills =
    Math.exp(-Math.pow((t - 0.22) / 0.105, 2.0)) * 0.18 +
    Math.exp(-Math.pow((t - 0.36) / 0.115, 2.0)) * 0.24 +
    Math.exp(-Math.pow((t - 0.54) / 0.125, 2.0)) * 0.20 +
    Math.exp(-Math.pow((t - 0.70) / 0.110, 2.0)) * 0.22 +
    Math.exp(-Math.pow((t - 0.88) / 0.120, 2.0)) * 0.16;
  const centerLift = 0.58 + Math.pow(Math.sin(Math.PI * t), 0.82) * 0.34;
  const depthCrown = 0.90 + Math.sin(Math.PI * zt) * 0.12;
  const horizonDip = 0.94 + 0.06 * Math.sin(t * Math.PI * 1.6 + spec.seed * 0.017);
  const profile =
    0.18 +
    leftMass +
    middleMass +
    rightMass +
    nearHills +
    longSwell * 0.12 +
    shoulder * 0.18 +
    broad * 0.08 +
    mid * 0.04;
  const foothill = visualAmplitude * (0.055 + mid * 0.045) * (1 - Math.abs(zt - 0.50));
  const softenedTreeLine = Math.pow(fine, 2.2) * visualAmplitude * 0.016;
  return -18.0 + (visualBase + visualAmplitude * centerLift * profile) * depthCrown * horizonDip + foothill + softenedTreeLine;
}

function accumulateNormals(positions: number[], indices: number[], normals: number[]): void {
  normals.fill(0);
  for (let i = 0; i < indices.length; i += 3) {
    const ia = (indices[i] ?? 0) * 3;
    const ib = (indices[i + 1] ?? 0) * 3;
    const ic = (indices[i + 2] ?? 0) * 3;

    const ax = positions[ia] ?? 0;
    const ay = positions[ia + 1] ?? 0;
    const az = positions[ia + 2] ?? 0;
    const bx = positions[ib] ?? 0;
    const by = positions[ib + 1] ?? 0;
    const bz = positions[ib + 2] ?? 0;
    const cx = positions[ic] ?? 0;
    const cy = positions[ic + 1] ?? 0;
    const cz = positions[ic + 2] ?? 0;

    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;

    for (const idx of [ia, ib, ic]) {
      normals[idx] = (normals[idx] ?? 0) + nx;
      normals[idx + 1] = (normals[idx + 1] ?? 0) + ny;
      normals[idx + 2] = (normals[idx + 2] ?? 0) + nz;
    }
  }

  for (let i = 0; i < normals.length; i += 3) {
    const x = normals[i] ?? 0;
    const y = normals[i + 1] ?? 1;
    const z = normals[i + 2] ?? 0;
    const len = Math.hypot(x, y, z) || 1;
    normals[i] = x / len;
    normals[i + 1] = y / len;
    normals[i + 2] = z / len;
  }
}
