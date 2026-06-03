import type { Vec3 } from "../../math/Vec3";
import { vec3 } from "../../math/Vec3";
import type { MeshData } from "../MeshData";

export interface WireSpan {
  start: Vec3;
  end: Vec3;
  sag: number;
  samples: number;
  width: number;
}

function pointOnSpan(span: WireSpan, t: number): Vec3 {
  const p = vec3.lerp(span.start, span.end, t);
  p[1] -= Math.sin(Math.PI * t) * span.sag;
  return p;
}

export function makeWireRibbon(spans: WireSpan[]): MeshData {
  const centers: number[] = [];
  const tangents: number[] = [];
  const sideWidth: number[] = [];
  const indices: number[] = [];
  let vertexBase = 0;

  for (const span of spans) {
    const samples = Math.max(3, span.samples);
    const points: Vec3[] = [];

    for (let i = 0; i <= samples; i++) {
      points.push(pointOnSpan(span, i / samples));
    }

    for (let i = 0; i <= samples; i++) {
      const p = points[i] ?? span.start;
      const prev = points[Math.max(0, i - 1)] ?? p;
      const next = points[Math.min(samples, i + 1)] ?? p;
      const tangent = vec3.normalize(vec3.sub(next, prev));

      centers.push(p[0], p[1], p[2], p[0], p[1], p[2]);
      for (let j = 0; j < 2; j++) {
        tangents.push(tangent[0], tangent[1], tangent[2]);
      }
      sideWidth.push(-1, span.width, 1, span.width);
    }

    for (let i = 0; i < samples; i++) {
      const a = vertexBase + i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }

    vertexBase += (samples + 1) * 2;
  }

  const indexArray = vertexBase > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
  return {
    positions: new Float32Array(centers),
    normals: new Float32Array(tangents),
    uvs: new Float32Array(sideWidth),
    indices: indexArray
  };
}
