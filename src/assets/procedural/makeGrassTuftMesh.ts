import type { MeshData } from "../MeshData";

export function makeGrassTuftMesh(bladeSegments: number, bladeCount: number): MeshData {
  const blades = Math.max(3, Math.floor(bladeCount));
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let b = 0; b < blades; b++) {
    const bladeT = blades === 1 ? 0 : b / (blades - 1);
    const angle = bladeT * Math.PI + Math.sin(b * 4.21) * 0.12;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const bend = (bladeT - 0.5) * 0.080 + Math.sin(b * 2.73) * 0.012;
    const heightSkew = 0.86 + Math.sin(b * 5.17) * 0.07 + bladeT * 0.12;
    const widthSkew = 0.78 + Math.cos(b * 3.91) * 0.12;
    const baseIndex = positions.length / 3;

    for (let s = 0; s <= bladeSegments; s++) {
      const t = s / bladeSegments;
      const half = (1.0 - t * 0.88) * 0.5 * widthSkew;
      const curve = t * t * bend;
      const centerX = curve * sin;
      const centerZ = curve * cos;
      const rightX = cos * half;
      const rightZ = -sin * half;
      const y = t * heightSkew;

      positions.push(centerX - rightX, y, centerZ - rightZ);
      positions.push(centerX + rightX, y, centerZ + rightZ);
      uvs.push(0, t, 1, t);
    }

    for (let s = 0; s < bladeSegments; s++) {
      const a = baseIndex + s * 2;
      const c = a + 2;
      indices.push(a, a + 1, c, a + 1, c + 1, c);
    }
  }

  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices)
  };
}
