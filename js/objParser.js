/**
 * Parser para arquivos OBJ
 */
class OBJParser {
  constructor() {
    this.reset();
  }

  /**
   * Reseta o parser para um estado inicial
   */
  reset() {
    this.verticesOriginal = [];
    this.verticesActual = [];
    this.vertexNormals = [];
    this.faces = [];
    this.faceNormals = [];
    this.accumulatedMatrix = Matrix.identity();

    // Estatísticas
    this.stats = {
      vertexCount: 0,
      normalCount: 0,
      faceCount: 0,
    };
  }

  /**
   * Analisa o conteúdo de um arquivo OBJ
   * @param {string} content - Conteúdo do arquivo OBJ
   * @returns {Object} Dados analisados com vértices, normais, etc.
   */
  parse(content) {
    this.reset();

    const lines = content.split("\n");
    const tempVertices = [];
    const tempNormals = [];

    // Primeiro passo: extrair vértices, normais e faces
    for (let line of lines) {
      line = line.trim();

      // Ignorar linhas vazias ou comentários
      if (line === "" || line.startsWith("#")) continue;

      const parts = line.split(/\s+/);
      const prefix = parts[0];

      switch (prefix) {
        case "v": // Vértice
          const x = parseFloat(parts[1] || 0);
          const y = parseFloat(parts[2] || 0);
          const z = parseFloat(parts[3] || 0);
          tempVertices.push(x, y, z);
          break;

        case "vn": // Normal de vértice
          const nx = parseFloat(parts[1] || 0);
          const ny = parseFloat(parts[2] || 0);
          const nz = parseFloat(parts[3] || 0);
          tempNormals.push(nx, ny, nz);
          break;

        case "f": // Face
          this._processFace(parts, tempVertices);
          break;
      }
    }

    // Atualizar estatísticas
    this.stats.vertexCount = tempVertices.length / 3;
    this.stats.normalCount = tempNormals.length / 3;

    // Armazenar vértices originais
    this.verticesOriginal = new Float32Array(tempVertices);

    // Copiar para vértices atuais (inicialmente iguais)
    this.verticesActual = new Float32Array(tempVertices);

    // Armazenar normais de vértices
    this.vertexNormals = new Float32Array(tempNormals);

    // Calcular normais de faces se não estiverem no arquivo
    if (this.faceNormals.length === 0) {
      this._calculateFaceNormals();
    }

    // Normalizar o modelo para caber na visualização
    this._normalizeModel();

    return {
      verticesOriginal: this.verticesOriginal,
      verticesActual: this.verticesActual,
      vertexNormals: this.vertexNormals,
      faces: this.faces,
      faceNormals: this.faceNormals,
      accumulatedMatrix: this.accumulatedMatrix,
      stats: this.stats,
    };
  }

  /**
   * Processa uma linha de face do arquivo OBJ
   * @private
   */
  _processFace(parts, vertices) {
    const faceIndices = [];

    // Extrair os índices da face (pular o primeiro elemento que é 'f')
    for (let i = 1; i < parts.length; i++) {
      const vertexData = parts[i].split("/");

      // Índices em OBJ começam em 1, então subtraímos 1
      const vertexIndex = parseInt(vertexData[0]) - 1;

      faceIndices.push(vertexIndex);
    }

    // Armazenar os índices da face
    this.faces.push(faceIndices);

    this.stats.faceCount++;
  }

  /**
   * Calcula as normais das faces
   * @private
   */
  _calculateFaceNormals() {
    // Para cada face, calcular a normal
    for (let face of this.faces) {
      if (face.length < 3) continue; // Precisa de pelo menos 3 vértices

      // Obter três pontos da face
      const v0 = face[0];
      const v1 = face[1];
      const v2 = face[2];

      // Calcular dois vetores do triângulo
      const ax = this.verticesActual[v1 * 3] - this.verticesActual[v0 * 3];
      const ay =
        this.verticesActual[v1 * 3 + 1] - this.verticesActual[v0 * 3 + 1];
      const az =
        this.verticesActual[v1 * 3 + 2] - this.verticesActual[v0 * 3 + 2];

      const bx = this.verticesActual[v2 * 3] - this.verticesActual[v0 * 3];
      const by =
        this.verticesActual[v2 * 3 + 1] - this.verticesActual[v0 * 3 + 1];
      const bz =
        this.verticesActual[v2 * 3 + 2] - this.verticesActual[v0 * 3 + 2];

      // Produto vetorial para encontrar a normal
      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;

      // Normalizar o vetor
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);

      if (length > 0) {
        this.faceNormals.push(nx / length, ny / length, nz / length);
      } else {
        this.faceNormals.push(0, 1, 0); // Normal padrão se não puder calcular
      }
    }
  }

  /**
   * Normaliza o modelo para caber no espaço de visualização
   * @private
   */
  _normalizeModel() {
    const vertices = this.verticesActual;
    if (vertices.length === 0) return;

    // Encontrar limites min/max
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      const z = vertices[i + 2];

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }

    // Calcular centro do modelo
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Calcular a maior dimensão
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const rangeZ = maxZ - minZ;
    const maxRange = Math.max(rangeX, rangeY, rangeZ);

    // Fator de escala para caber em [-1, 1]
    const scale = maxRange > 0 ? 2.0 / maxRange : 1.0;

    // Aplicar transformação a todos os vértices
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i] = (vertices[i] - centerX) * scale;
      vertices[i + 1] = (vertices[i + 1] - centerY) * scale;
      vertices[i + 2] = (vertices[i + 2] - centerZ) * scale;
    }

    // Armazenar metadados
    this.metadata = {
      center: [centerX, centerY, centerZ],
      dimensions: [rangeX, rangeY, rangeZ],
      scale: scale,
    };
  }

  /**
   * Retorna metadados do modelo
   */
  getMetadata() {
    return {
      vertices: this.stats.vertexCount,
      faces: this.stats.faceCount,
      normals: this.stats.normalCount,
      dimensions: this.metadata ? this.metadata.dimensions : null,
    };
  }
}
