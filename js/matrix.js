const Matrix = {
  /**
   * Cria uma matriz de identidade 4x4
   */
  identity: function () {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  },

  /**
   * Multiplicação de matrizes 4x4
   */
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

  /**
   * Cria uma matriz de translação
   * @param {number} tx - Translação no eixo X
   * @param {number} ty - Translação no eixo Y
   * @param {number} tz - Translação no eixo Z
   * @returns {Float32Array} Matriz de translação
   */
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

  /**
   * Cria uma matriz de escala
   * @param {number} sx - Fator de escala no eixo X
   * @param {number} sy - Fator de escala no eixo Y
   * @param {number} sz - Fator de escala no eixo Z
   * @returns {Float32Array} Matriz de escala
   */
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

  /**
   * Cria uma matriz de rotação em torno do eixo X
   * @param {number} angleInRadians - Ângulo de rotação em radianos
   * @returns {Float32Array} Matriz de rotação
   */
  rotationX: function (angleInRadians) {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);

    return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
  },

  /**
   * Cria uma matriz de rotação em torno do eixo Y
   * @param {number} angleInRadians - Ângulo de rotação em radianos
   * @returns {Float32Array} Matriz de rotação
   */
  rotationY: function (angleInRadians) {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);

    return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
  },

  /**
   * Cria uma matriz de rotação em torno do eixo Z
   * @param {number} angleInRadians - Ângulo de rotação em radianos
   * @returns {Float32Array} Matriz de rotação
   */
  rotationZ: function (angleInRadians) {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);

    return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  },

  /**
   * Aplicar transformação a vértices
   * @param {Float32Array} vertices - Array de vértices
   * @param {Float32Array} matrix - Matriz de transformação
   * @returns {Float32Array} Vértices transformados
   */
  transformVertices: function (vertices, matrix) {
    const result = new Float32Array(vertices.length);

    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      const z = vertices[i + 2];

      // Aplicar transformação
      result[i] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
      result[i + 1] =
        matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
      result[i + 2] =
        matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    }

    return result;
  },
};
