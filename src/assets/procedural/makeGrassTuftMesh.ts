import type { MeshData } from "../MeshData";

export function makeGrassTuftMesh(bladeSegments: number, bladeCount: number): MeshData {
  const blades = Math.max(3, Math.floor(bladeCount));
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let b = 0; b < blades; b++) {
    const bladeT = blades === 1 ? 0 : b / (blades - 1);
    const fan = bladeT - 0.5;
    const undergrowth = b % 4 === 0;
    const angle = fan * Math.PI * 1.28 + Math.sin(b * 4.21) * 0.28;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const bend = fan * 0.135 + Math.sin(b * 2.73) * 0.046 + (undergrowth ? -0.026 : 0.0);
    const heightSkew = (0.78 + Math.sin(b * 5.17) * 0.16 + bladeT * 0.24) * (undergrowth ? 0.70 : 1.0);
    const widthSkew = 0.60 + Math.cos(b * 3.91) * 0.12 + (undergrowth ? 0.12 : 0.0);
    const clumpSpread = (Math.sin(b * 1.37) * 0.028 + fan * 0.026) * (undergrowth ? 1.28 : 1.0);
    const tipHook = Math.sin(b * 6.11) * 0.034;
    const baseIndex = positions.length / 3;

    for (let s = 0; s <= bladeSegments; s++) {
      const t = s / bladeSegments;
      const half = (1.0 - t * 0.92) * 0.5 * widthSkew;
      const curve = t * t * bend;
      const baseFan = clumpSpread * (1.0 - t * 0.44);
      const hook = tipHook * t * t * t;
      const centerX = curve * sin + baseFan * cos + hook * cos;
      const centerZ = curve * cos - baseFan * sin - hook * sin;
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
