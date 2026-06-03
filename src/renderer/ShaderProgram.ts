function withLineNumbers(src: string): string {
  return src
    .split("\n")
    .map((line, i) => `${String(i + 1).padStart(4, " ")}: ${line}`)
    .join("\n");
}

export class ShaderProgram {
  readonly program: WebGLProgram;
  private uniforms = new Map<string, WebGLUniformLocation | null>();

  constructor(
    private readonly gl: WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string
  ) {
    const vertex = this.compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = this.compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();

    if (!program) {
      throw new Error("Failed to create shader program.");
    }

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) || "Unknown link error.";
      gl.deleteProgram(program);
      throw new Error(`Shader link failed:\n${log}`);
    }

    this.program = program;
  }

  use(): void {
    this.gl.useProgram(this.program);
  }

  dispose(): void {
    this.gl.deleteProgram(this.program);
  }

  uniform(name: string): WebGLUniformLocation | null {
    if (!this.uniforms.has(name)) {
      this.uniforms.set(name, this.gl.getUniformLocation(this.program, name));
    }
    return this.uniforms.get(name) ?? null;
  }

  set1i(name: string, v: number): void {
    this.gl.uniform1i(this.uniform(name), v);
  }

  set1f(name: string, v: number): void {
    this.gl.uniform1f(this.uniform(name), v);
  }

  set2f(name: string, x: number, y: number): void {
    this.gl.uniform2f(this.uniform(name), x, y);
  }

  set3f(name: string, x: number, y: number, z: number): void {
    this.gl.uniform3f(this.uniform(name), x, y, z);
  }

  set3fv(name: string, v: readonly [number, number, number]): void {
    this.gl.uniform3fv(this.uniform(name), v);
  }

  setMatrix4(name: string, v: Float32Array): void {
    this.gl.uniformMatrix4fv(this.uniform(name), false, v);
  }

  private compile(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) {
      throw new Error("Failed to create shader.");
    }

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const log = this.gl.getShaderInfoLog(shader) || "Unknown compile error.";
      this.gl.deleteShader(shader);
      const label = type === this.gl.VERTEX_SHADER ? "vertex" : "fragment";
      throw new Error(`Shader ${label} compile failed:\n${log}\n${withLineNumbers(source)}`);
    }

    return shader;
  }
}
