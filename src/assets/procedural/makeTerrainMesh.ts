import { fbm2 } from "../../math/Noise";
import type { Vec3 } from "../../math/Vec3";
import { vec3 } from "../../math/Vec3";
import type { MeshData } from "../MeshData";

export function terrainHeight(x: number, z: number, seed: number, amplitude = 2.2): number {
  const broad = (fbm2(x * 0.0052, z * 0.0058, seed, 5) - 0.5) * amplitude * 1.18;
  const rolling = (fbm2(x * 0.014, z * 0.011, seed + 7, 4) - 0.5) * amplitude * 0.34;
  const small = (fbm2(x * 0.035, z * 0.035, seed + 11, 4) - 0.5) * 0.62;
  const windRows = Math.sin(z * 0.035 + x * 0.008 + fbm2(x * 0.010, z * 0.010, seed + 19, 3) * 3.2) * 0.18;
  return broad + rolling + small + windRows;
}

export function makeTerrainMesh(size: number, resolution: number, seed: number, amplitude: number): MeshData {
  const vertsPerSide = resolution + 1;
  const positions = new Float32Array(vertsPerSide * vertsPerSide * 3);
  const normals = new Float32Array(vertsPerSide * vertsPerSide * 3);
  const uvs = new Float32Array(vertsPerSide * vertsPerSide * 2);
  const indices = new Uint32Array(resolution * resolution * 6);
  const half = size * 0.5;
  const step = size / resolution;
  let p = 0;
  let uv = 0;

  for (let z = 0; z <= resolution; z++) {
    for (let x = 0; x <= resolution; x++) {
      const wx = -half + x * step;
      const wz = -half + z * step;
      const y = terrainHeight(wx, wz, seed, amplitude);
      positions[p++] = wx;
      positions[p++] = y;
      positions[p++] = wz;
      uvs[uv++] = x / resolution;
      uvs[uv++] = z / resolution;
    }
  }

  let n = 0;
  const eps = step;
  for (let z = 0; z <= resolution; z++) {
    for (let x = 0; x <= resolution; x++) {
      const wx = -half + x * step;
      const wz = -half + z * step;
      const hL = terrainHeight(wx - eps, wz, seed, amplitude);
      const hR = terrainHeight(wx + eps, wz, seed, amplitude);
      const hD = terrainHeight(wx, wz - eps, seed, amplitude);
      const hU = terrainHeight(wx, wz + eps, seed, amplitude);
      const normal: Vec3 = vec3.normalize([hL - hR, 2 * eps, hD - hU]);
      normals[n++] = normal[0];
      normals[n++] = normal[1];
      normals[n++] = normal[2];
    }
  }

  let i = 0;
  for (let z = 0; z < resolution; z++) {
    for (let x = 0; x < resolution; x++) {
      const a = z * vertsPerSide + x;
      const b = a + 1;
      const c = a + vertsPerSide;
      const d = c + 1;
      indices[i++] = a;
      indices[i++] = c;
      indices[i++] = b;
      indices[i++] = b;
      indices[i++] = c;
      indices[i++] = d;
    }
  }

  return { positions, normals, uvs, indices };
}
