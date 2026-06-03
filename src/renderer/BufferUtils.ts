import type { MeshData } from "../assets/MeshData";

type UploadData = ArrayBuffer | ArrayBufferView<ArrayBufferLike>;

export interface MeshGpu {
  vao: WebGLVertexArrayObject;
  vertexBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer | null;
  indexCount: number;
  vertexCount: number;
  indexType: number;
}

function requiredBuffer<T>(buffer: T | null, label: string): T {
  if (!buffer) {
    throw new Error(`Failed to create ${label}.`);
  }
  return buffer;
}

export function createArrayBuffer(
  gl: WebGL2RenderingContext,
  data: UploadData,
  usage: number = gl.STATIC_DRAW
): WebGLBuffer {
  const buffer = requiredBuffer(gl.createBuffer(), "array buffer");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data as BufferSource, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buffer;
}

export function updateArrayBuffer(
  gl: WebGL2RenderingContext,
  buffer: WebGLBuffer,
  data: UploadData,
  usage: number = gl.DYNAMIC_DRAW
): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data as BufferSource, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

export function createMeshGpu(gl: WebGL2RenderingContext, mesh: MeshData): MeshGpu {
  const vertexCount = mesh.positions.length / 3;
  const hasNormals = Boolean(mesh.normals);
  const hasUvs = Boolean(mesh.uvs);
  const hasColors = Boolean(mesh.colors);
  const stride = (3 + (hasNormals ? 3 : 0) + (hasUvs ? 2 : 0) + (hasColors ? 4 : 0)) * 4;
  const packed = new Float32Array(vertexCount * (stride / 4));
  let cursor = 0;

  for (let i = 0; i < vertexCount; i++) {
    packed[cursor++] = mesh.positions[i * 3 + 0] ?? 0;
    packed[cursor++] = mesh.positions[i * 3 + 1] ?? 0;
    packed[cursor++] = mesh.positions[i * 3 + 2] ?? 0;

    if (hasNormals && mesh.normals) {
      packed[cursor++] = mesh.normals[i * 3 + 0] ?? 0;
      packed[cursor++] = mesh.normals[i * 3 + 1] ?? 1;
      packed[cursor++] = mesh.normals[i * 3 + 2] ?? 0;
    }

    if (hasUvs && mesh.uvs) {
      packed[cursor++] = mesh.uvs[i * 2 + 0] ?? 0;
      packed[cursor++] = mesh.uvs[i * 2 + 1] ?? 0;
    }

    if (hasColors && mesh.colors) {
      packed[cursor++] = mesh.colors[i * 4 + 0] ?? 0;
      packed[cursor++] = mesh.colors[i * 4 + 1] ?? 0;
      packed[cursor++] = mesh.colors[i * 4 + 2] ?? 0;
      packed[cursor++] = mesh.colors[i * 4 + 3] ?? 0;
    }
  }

  const vao = requiredBuffer(gl.createVertexArray(), "vertex array");
  const vertexBuffer = createArrayBuffer(gl, packed);
  let indexBuffer: WebGLBuffer | null = null;
  let indexType: number = gl.UNSIGNED_SHORT;
  let indexCount = 0;

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);

  let offset = 3 * 4;
  if (hasNormals) {
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, offset);
    offset += 3 * 4;
  }

  if (hasUvs) {
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, offset);
    offset += 2 * 4;
  }

  if (hasColors) {
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, offset);
  }

  if (mesh.indices) {
    indexBuffer = requiredBuffer(gl.createBuffer(), "index buffer");
    indexType = mesh.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    indexCount = mesh.indices.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
  }

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return { vao, vertexBuffer, indexBuffer, indexCount, vertexCount, indexType };
}

export function disposeMeshGpu(gl: WebGL2RenderingContext, mesh: MeshGpu): void {
  gl.deleteVertexArray(mesh.vao);
  gl.deleteBuffer(mesh.vertexBuffer);
  if (mesh.indexBuffer) {
    gl.deleteBuffer(mesh.indexBuffer);
  }
}
