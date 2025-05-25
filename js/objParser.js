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
    const tempFaces = [];

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
          // Normalizar
          const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
          if (len > 0) {
            tempNormals.push(nx / len, ny / len, nz / len);
          } else {
            tempNormals.push(0, 1, 0);
          }
          break;

        case "f": // Face
          const faceData = this._processFace(parts);
          if (faceData) {
            tempFaces.push(faceData);
          }
          break;
      }
    }

    // Atualizar estatísticas
    this.stats.vertexCount = tempVertices.length / 3;
    this.stats.normalCount = tempNormals.length / 3;
    this.stats.faceCount = tempFaces.length;

    // Armazenar vértices originais
    this.verticesOriginal = new Float32Array(tempVertices);

    // Copiar para vértices atuais (inicialmente iguais)
    this.verticesActual = new Float32Array(tempVertices);

    // Processar faces e normais
    this._processFacesAndNormals(tempFaces, tempNormals);

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
  _processFace(parts) {
    const faceData = {
      vertexIndices: [],
      normalIndices: [],
      texCoordIndices: [],
    };

    // Extrair os índices da face (pular o primeiro elemento que é 'f')
    for (let i = 1; i < parts.length; i++) {
      const vertexData = parts[i].split("/");

      // Índices em OBJ começam em 1, então subtraímos 1
      const vertexIndex = parseInt(vertexData[0]) - 1;

      if (isNaN(vertexIndex) || vertexIndex < 0) continue;

      faceData.vertexIndices.push(vertexIndex);

      // Índice de coordenada de textura (opcional)
      if (vertexData.length > 1 && vertexData[1]) {
        const texCoordIndex = parseInt(vertexData[1]) - 1;
        if (!isNaN(texCoordIndex)) {
          faceData.texCoordIndices.push(texCoordIndex);
        }
      }

      // Índice de normal (opcional)
      if (vertexData.length > 2 && vertexData[2]) {
        const normalIndex = parseInt(vertexData[2]) - 1;
        if (!isNaN(normalIndex)) {
          faceData.normalIndices.push(normalIndex);
        }
      }
    }

    // Verificar se a face tem pelo menos 3 vértices
    if (faceData.vertexIndices.length >= 3) {
      return faceData;
    }

    return null;
  }

  /**
   * Processa faces e suas normais
   * @private
   */
  _processFacesAndNormals(tempFaces, tempNormals) {
    const hasNormals = tempNormals.length > 0;

    // Preparar array de normais de vértices
    if (hasNormals) {
      this.vertexNormals = new Float32Array(tempNormals);
    } else {
      // Se não há normais no arquivo, vamos calculá-las
      this.vertexNormals = new Float32Array(this.verticesActual.length);
    }

    // Processar cada face
    for (let faceData of tempFaces) {
      const face = faceData.vertexIndices;
      this.faces.push(face);

      // Calcular normal da face
      if (face.length >= 3) {
        const v0 = face[0];
        const v1 = face[1];
        const v2 = face[2];

        // Obter posições dos vértices
        const p0 = [
          this.verticesActual[v0 * 3],
          this.verticesActual[v0 * 3 + 1],
          this.verticesActual[v0 * 3 + 2],
        ];
        const p1 = [
          this.verticesActual[v1 * 3],
          this.verticesActual[v1 * 3 + 1],
          this.verticesActual[v1 * 3 + 2],
        ];
        const p2 = [
          this.verticesActual[v2 * 3],
          this.verticesActual[v2 * 3 + 1],
          this.verticesActual[v2 * 3 + 2],
        ];

        // Calcular vetores das arestas
        const edge1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
        const edge2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];

        // Produto vetorial para encontrar a normal
        const normal = [
          edge1[1] * edge2[2] - edge1[2] * edge2[1],
          edge1[2] * edge2[0] - edge1[0] * edge2[2],
          edge1[0] * edge2[1] - edge1[1] * edge2[0],
        ];

        // Normalizar
        const length = Math.sqrt(
          normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]
        );

        if (length > 0.0001) {
          this.faceNormals.push(
            normal[0] / length,
            normal[1] / length,
            normal[2] / length
          );
        } else {
          this.faceNormals.push(0, 1, 0); // Normal padrão
        }

        // Se não há normais de vértices no arquivo, acumular as normais das faces
        if (!hasNormals) {
          for (let vertexIndex of face) {
            const idx = vertexIndex * 3;
            this.vertexNormals[idx] += normal[0];
            this.vertexNormals[idx + 1] += normal[1];
            this.vertexNormals[idx + 2] += normal[2];
          }
        }
      } else {
        // Face inválida, adicionar normal padrão
        this.faceNormals.push(0, 1, 0);
      }
    }

    // Se calculamos as normais de vértices, precisamos normalizá-las
    if (!hasNormals) {
      for (let i = 0; i < this.vertexNormals.length; i += 3) {
        const nx = this.vertexNormals[i];
        const ny = this.vertexNormals[i + 1];
        const nz = this.vertexNormals[i + 2];

        const length = Math.sqrt(nx * nx + ny * ny + nz * nz);

        if (length > 0.0001) {
          this.vertexNormals[i] /= length;
          this.vertexNormals[i + 1] /= length;
          this.vertexNormals[i + 2] /= length;
        } else {
          // Normal padrão se não foi possível calcular
          this.vertexNormals[i] = 0;
          this.vertexNormals[i + 1] = 1;
          this.vertexNormals[i + 2] = 0;
        }
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

    // Também precisamos atualizar os vértices originais para manter consistência
    for (let i = 0; i < this.verticesOriginal.length; i += 3) {
      this.verticesOriginal[i] = (this.verticesOriginal[i] - centerX) * scale;
      this.verticesOriginal[i + 1] =
        (this.verticesOriginal[i + 1] - centerY) * scale;
      this.verticesOriginal[i + 2] =
        (this.verticesOriginal[i + 2] - centerZ) * scale;
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
