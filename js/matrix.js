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
   * Cria uma matriz de projeção ortográfica para vista frontal (XY)
   * @returns {Float32Array} Matriz de projeção ortográfica
   */
  orthographicFront: function () {
    // Vista frontal (XY): Preserva X e Y, comprime Z
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
  },

  /**
   * Cria uma matriz de projeção ortográfica para vista superior (XZ)
   * @returns {Float32Array} Matriz de projeção ortográfica
   */
  orthographicTop: function () {
    // Vista superior (XZ): Rotação em torno do eixo X por -90 graus
    const angle = -Math.PI / 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return new Float32Array([1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]);
  },

  /**
   * Cria uma matriz de projeção ortográfica para vista lateral (YZ)
   * @returns {Float32Array} Matriz de projeção ortográfica
   */
  orthographicSide: function () {
    // Vista lateral (YZ): Rotação em torno do eixo Y por 90 graus
    const angle = Math.PI / 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return new Float32Array([0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1]);
  },

  /**
   * Cria uma matriz de projeção em perspectiva (1 ponto de fuga)
   * @param {number} fovRadians - Campo de visão em radianos
   * @param {number} aspect - Razão largura/altura do canvas
   * @param {number} near - Plano de corte próximo
   * @param {number} far - Plano de corte distante
   * @returns {Float32Array} Matriz de projeção em perspectiva
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
   * Cria uma matriz de projeção oblíqua do tipo Cavaleira
   * Ângulo de 45° com fator de redução 1
   * @returns {Float32Array} Matriz de projeção cavaleira
   */
  obliqueCavalier: function () {
    const alpha = Math.PI / 4; // 45 graus
    const factor = 1.0; // Fator de redução de 1 (sem redução)

    return new Float32Array([
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      factor * Math.cos(alpha),
      factor * Math.sin(alpha),
      1,
      0,
      0,
      0,
      0,
      1,
    ]);
  },

  /**
   * Cria uma matriz de projeção oblíqua do tipo Cabinet
   * Ângulo de 45° com fator de redução 0.5
   * @returns {Float32Array} Matriz de projeção cabinet
   */
  obliqueCabinet: function () {
    const alpha = Math.PI / 4; // 45 graus
    const factor = 0.5; // Fator de redução de 0.5 (metade da profundidade)

    return new Float32Array([
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      factor * Math.cos(alpha),
      factor * Math.sin(alpha),
      1,
      0,
      0,
      0,
      0,
      1,
    ]);
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
