// matrix.js - Corrigido para preservar profundidade em todas as projeções

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
   * Matriz de projeção ortográfica para vista frontal (XY)
   * Preserva Z para o Z-buffering
   */
  orthographicFront: function () {
    // Vista frontal (XY): Preserva X, Y e Z para profundidade
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
      0, // Z preservado
      0,
      0,
      0,
      1,
    ]);
  },

  /**
   * Matriz de projeção ortográfica para vista superior (XZ)
   * Rotação para olhar de cima
   */
  orthographicTop: function () {
    // Vista superior (XZ): Y aponta para cima, Z aponta para frente
    // Trocar Y com Z e inverter para correta orientação
    return new Float32Array([
      1,
      0,
      0,
      0, // X permanece X
      0,
      0,
      -1,
      0, // Z negativo vira Y
      0,
      1,
      0,
      0, // Y vira Z
      0,
      0,
      0,
      1,
    ]);
  },

  /**
   * Matriz de projeção ortográfica para vista lateral (YZ)
   * Rotação para olhar de lado
   */
  orthographicSide: function () {
    // Vista lateral (YZ): X aponta para dentro, Y permanece Y
    // Trocar X com Z e inverter para correta orientação
    return new Float32Array([
      0,
      0,
      1,
      0, // Z vira X
      0,
      1,
      0,
      0, // Y permanece Y
      -1,
      0,
      0,
      0, // X negativo vira Z
      0,
      0,
      0,
      1,
    ]);
  },

  /**
   * Matriz de projeção em perspectiva (1 ponto de fuga)
   * Implementação correta com preservação de profundidade
   */
  perspective: function (fovRadians, aspect, near, far) {
    const f = Math.tan(Math.PI * 0.5 - 0.5 * fovRadians);
    const rangeInv = 1.0 / (near - far);

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
      -1,
      0,
      0,
      near * far * rangeInv * 2,
      0,
    ]);
  },

  /**
   * Matriz de projeção oblíqua do tipo Cavaleira
   * Aplica cisalhamento em X e Y baseado em Z
   */
  obliqueCavalier: function () {
    const alpha = Math.PI / 4; // 45 graus
    const factor = 1.0; // Fator de redução de 1 (sem redução)
    const LcosA = factor * Math.cos(alpha);
    const LsinA = factor * Math.sin(alpha);

    // x' = x + z * L * cos(alpha)
    // y' = y + z * L * sin(alpha)
    // z' = z (preservado para Z-buffer)
    return new Float32Array([
      1,
      0,
      LcosA,
      0, // linha 0: x' = x + z*LcosA
      0,
      1,
      LsinA,
      0, // linha 1: y' = y + z*LsinA
      0,
      0,
      1,
      0, // linha 2: z' = z
      0,
      0,
      0,
      1, // linha 3: w' = w
    ]);
  },

  /**
   * Matriz de projeção oblíqua do tipo Cabinet
   * Aplica cisalhamento reduzido em X e Y baseado em Z
   */
  obliqueCabinet: function () {
    const alpha = Math.PI / 4; // 45 graus
    const factor = 0.5; // Fator de redução de 0.5
    const LcosA = factor * Math.cos(alpha);
    const LsinA = factor * Math.sin(alpha);

    return new Float32Array([
      1,
      0,
      LcosA,
      0, // linha 0: x' = x + z*LcosA*0.5
      0,
      1,
      LsinA,
      0, // linha 1: y' = y + z*LsinA*0.5
      0,
      0,
      1,
      0, // linha 2: z' = z
      0,
      0,
      0,
      1, // linha 3: w' = w
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
