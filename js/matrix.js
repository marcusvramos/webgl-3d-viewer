// matrix.js

const Matrix = {
  identity: function () {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  },

  multiply: function (a, b) {
    const result = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] =
          a[i * 4 + 0] * b[0 * 4 + j] +
          a[i * 4 + 1] * b[1 * 4 + j] +
          a[i * 4 + 2] * b[2 * 4 + j] +
          a[i * 4 + 3] * b[3 * 4 + j];
      }
    }
    return result;
  },

  translation: function (tx, ty, tz) {
    return new Float32Array([
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      tx,
      ty,
      tz,
      1,
    ]);
  },

  scaling: function (sx, sy, sz) {
    return new Float32Array([
      sx,
      0,
      0,
      0,
      0,
      sy,
      0,
      0,
      0,
      0,
      sz,
      0,
      0,
      0,
      0,
      1,
    ]);
  },

  rotationX: function (angleInRadians) {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
  },

  rotationY: function (angleInRadians) {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
  },

  rotationZ: function (angleInRadians) {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  },

  /**
   * CORRIGIDO: Matriz de projeção ortográfica para vista frontal (XY)
   * Preserva Z para o Z-buffering.
   */
  orthographicFront: function () {
    // Vista frontal (XY): Preserva X, Y e Z (para profundidade)
    return new Float32Array([
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0, // Modificado: Z não é mais zerado, permitindo Z-buffer
      0,
      0,
      0,
      1,
    ]);
  },

  orthographicTop: function () {
    // Vista superior (XZ): Rotação em torno do eixo X por -90 graus
    // Original Y -> -Z', Original Z -> Y'
    return new Float32Array([
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      0, // Y do mundo mapeado para Z da tela (com inversão implícita na transformação para tela)
      0,
      -1,
      0,
      0, // Z do mundo mapeado para -Y da tela
      0,
      0,
      0,
      1,
    ]);
  },

  orthographicSide: function () {
    // Vista lateral (YZ): Rotação em torno do eixo Y por 90 graus
    // Original X -> Z', Original Z -> -X'
    return new Float32Array([
      0,
      0,
      -1,
      0, // X do mundo mapeado para -Z da tela
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      0, // Z do mundo mapeado para X da tela
      0,
      0,
      0,
      1,
    ]);
  },

  /**
   * CORRIGIDO: Matriz de projeção em perspectiva (1 ponto de fuga)
   * Garante que w_clip = -z_eye e mapeamento de profundidade correto.
   */
  perspective: function (fovRadians, aspect, near, far) {
    const f = Math.tan(Math.PI * 0.5 - 0.5 * fovRadians); // cot(fov/2)
    const rangeInv = 1.0 / (near - far); //  1 / (N-F)

    // Matriz de perspectiva padrão (OpenGL like)
    // P22 = (N+F)/(N-F), P23 = (2NF)/(N-F), P32 = -1
    // Os índices para Float32Array são linha por linha:
    // m[10] é P_22, m[11] é P_23
    // m[14] é P_32
    return new Float32Array([
      f / aspect,
      0,
      0,
      0,
      0,
      f,
      0,
      0,
      0,
      0,
      (near + far) * rangeInv,
      near * far * rangeInv * 2, // P22, P23
      0,
      0,
      -1,
      0, // P32, P33
    ]);
  },

  /**
   * CORRIGIDO: Matriz de projeção oblíqua do tipo Cavaleira
   * Aplica cisalhamento em X e Y com base em Z.
   */
  obliqueCavalier: function () {
    const alpha = Math.PI / 4; // 45 graus
    const factor = 1.0; // Fator de redução de 1 (sem redução)
    const LcosA = factor * Math.cos(alpha);
    const LsinA = factor * Math.sin(alpha);

    // x_proj = x_orig + z_orig * L * cos(alpha)
    // y_proj = y_orig + z_orig * L * sin(alpha)
    // z_proj = z_orig (para Z-buffer)
    // Elementos M[0,2] e M[1,2] (ou m[2] e m[6] em array 1D)
    return new Float32Array([
      1,
      0,
      LcosA,
      0, // m[2] = LcosA
      0,
      1,
      LsinA,
      0, // m[6] = LsinA
      0,
      0,
      1,
      0, // Preserva Z
      0,
      0,
      0,
      1,
    ]);
  },

  /**
   * CORRIGIDO: Matriz de projeção oblíqua do tipo Cabinet
   * Aplica cisalhamento em X e Y com base em Z, com fator de redução 0.5.
   */
  obliqueCabinet: function () {
    const alpha = Math.PI / 4;
    const factor = 0.5;
    const LcosA = factor * Math.cos(alpha);
    const LsinA = factor * Math.sin(alpha);

    return new Float32Array([
      1,
      0,
      LcosA,
      0,
      0,
      1,
      LsinA,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
    ]);
  },

  transformVertices: function (vertices, matrix) {
    const result = new Float32Array(vertices.length);
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      const z = vertices[i + 2];
      const w = 1;

      result[i] = matrix[0] * x + matrix[1] * y + matrix[2] * z + matrix[3] * w;
      result[i + 1] =
        matrix[4] * x + matrix[5] * y + matrix[6] * z + matrix[7] * w;
      result[i + 2] =
        matrix[8] * x + matrix[9] * y + matrix[10] * z + matrix[11] * w;
    }
    return result;
  },
};
