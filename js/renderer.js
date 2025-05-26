class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.imageData = null;
    this.pixelBuffer = null;
    this.zBuffer = null;
    this.width = 0;
    this.height = 0;

    this.showAxes = true;
    this.showWireframe = true;
    this.showLightIndicator = true;
    this.modelData = null;
    this.transformMatrix = Matrix.identity();
    this.projectionMatrix = Matrix.identity();

    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.currentKey = null;
    this.rotationSensitivity = 0.01;
    this.translationSensitivity = 0.01;
    this.scaleSensitivity = 0.005;

    this.fillFaces = false;
    this.lightingEnabled = false;
    this.backfaceCullingEnabled = true;
    this.zBufferEnabled = true;
    this.faceColor = [0.69, 0.71, 0.87];
    this.lightPosition = [2, 2, -2];
    this.lightingType = "flat";
    this.movingLight = false;
    this.solzinhoCanvas = document.getElementById("solzinho");
    this.viewPosition = [0, 0, -1];

    this.init();
  }

  setShowLightIndicator(show) {
    this.showLightIndicator = show;
    if (!show) {
      this._clearLightIndicator();
    } else if (this.modelData) {
      this.render();
    }
  }

  init() {
    this.resizeCanvas();
    this._initEventListeners();
  }

  resizeCanvas() {
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;

    if (
      this.canvas.width !== displayWidth ||
      this.canvas.height !== displayHeight
    ) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      this.width = displayWidth;
      this.height = displayHeight;

      // Criar buffers
      this.imageData = this.ctx.createImageData(this.width, this.height);
      this.pixelBuffer = new Uint8ClampedArray(this.width * this.height * 4);
      this.zBuffer = new Float32Array(this.width * this.height);
    }

    if (this.solzinhoCanvas) {
      this.solzinhoCanvas.width = displayWidth;
      this.solzinhoCanvas.height = displayHeight;
    }
  }

  _initEventListeners() {
    // Mouse down
    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    // Mouse up
    this.canvas.addEventListener("mouseup", () => (this.isDragging = false));
    this.canvas.addEventListener("mouseleave", () => (this.isDragging = false));

    // Mouse move
    this.canvas.addEventListener("mousemove", (e) => {
      if (this.isDragging && !this.movingLight && this.modelData) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        if (e.buttons === 2) this._handleTranslation(deltaX, deltaY);
        else if (e.buttons === 1)
          this._handleRotation(deltaX, deltaY, e.ctrlKey);
      }

      if (this.movingLight && this.modelData) {
        const rect = this.canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / this.canvas.width) * 2 - 1;
        const y = -(((e.clientY - rect.top) / this.canvas.height) * 2 - 1);
        this.lightPosition[0] = x * 4;
        this.lightPosition[1] = y * 4;
        this.render();
      }
    });

    // Prevent context menu
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Mouse wheel
    this.canvas.addEventListener("wheel", (e) => {
      if (this.movingLight) {
        this.lightPosition[2] += e.deltaY * 0.02;
        this.render();
        e.preventDefault();
      } else if (this.modelData) {
        const scaleFactor = 1 - Math.sign(e.deltaY) * this.scaleSensitivity;
        let scaleMatrix;

        if (this.currentKey === "z") {
          scaleMatrix = Matrix.scaling(1, 1, scaleFactor);
        } else if (this.currentKey === "x") {
          scaleMatrix = Matrix.scaling(scaleFactor, 1, 1);
        } else if (this.currentKey === "y") {
          scaleMatrix = Matrix.scaling(1, scaleFactor, 1);
        } else {
          scaleMatrix = Matrix.scaling(scaleFactor, scaleFactor, scaleFactor);
        }

        this.transformMatrix = Matrix.multiply(
          this.transformMatrix,
          scaleMatrix
        );
        this.render();
        e.preventDefault();
      }
    });

    // Keyboard
    document.addEventListener("keydown", (e) => {
      this.currentKey = e.key.toLowerCase();
      if (e.key.toLowerCase() === "l") this.movingLight = true;
    });

    document.addEventListener("keyup", (e) => {
      this.currentKey = null;
      if (e.key.toLowerCase() === "l") this.movingLight = false;
    });
  }

  _handleTranslation(deltaX, deltaY) {
    let tx = deltaX * this.translationSensitivity;
    let ty = -deltaY * this.translationSensitivity;
    let tz = 0;

    if (this.currentKey === "z") {
      tz = deltaY * this.translationSensitivity;
      ty = 0;
    }

    const translationMatrix = Matrix.translation(tx, ty, tz);
    this.transformMatrix = Matrix.multiply(
      translationMatrix,
      this.transformMatrix
    );
    this.render();
  }

  _handleRotation(deltaX, deltaY, ctrlKey) {
    let rotationMatrix;

    if (ctrlKey) {
      const rx = Matrix.rotationX(deltaY * this.rotationSensitivity);
      const ry = Matrix.rotationY(deltaX * this.rotationSensitivity);
      rotationMatrix = Matrix.multiply(ry, rx);
    } else if (this.currentKey === "x") {
      rotationMatrix = Matrix.rotationX(deltaY * this.rotationSensitivity);
    } else if (this.currentKey === "y") {
      rotationMatrix = Matrix.rotationY(deltaX * this.rotationSensitivity);
    } else {
      rotationMatrix = Matrix.rotationZ(deltaX * this.rotationSensitivity);
    }

    this.transformMatrix = Matrix.multiply(
      rotationMatrix,
      this.transformMatrix
    );
    this.render();
  }

  setLightingType(type) {
    this.lightingType = type;
    this.render();
  }

  loadModel(modelData) {
    this.modelData = modelData;

    // Calcular normais de vértices se não existirem
    if (!modelData.vertexNormals || modelData.vertexNormals.length === 0) {
      this._calculateVertexNormals();
    }

    this.transformMatrix = Matrix.identity();
    this.projectionMatrix = Matrix.identity();
    this.render();
  }

  _calculateVertexNormals() {
    const vertexCount = this.modelData.verticesActual.length / 3;
    const normals = new Float32Array(vertexCount * 3);
    const counts = new Float32Array(vertexCount);

    // Acumular normais das faces em cada vértice
    for (let i = 0; i < this.modelData.faces.length; i++) {
      const face = this.modelData.faces[i];
      const faceNormalIndex = i * 3;

      for (let vertex of face) {
        normals[vertex * 3] += this.modelData.faceNormals[faceNormalIndex];
        normals[vertex * 3 + 1] +=
          this.modelData.faceNormals[faceNormalIndex + 1];
        normals[vertex * 3 + 2] +=
          this.modelData.faceNormals[faceNormalIndex + 2];
        counts[vertex]++;
      }
    }

    // Normalizar
    for (let i = 0; i < vertexCount; i++) {
      if (counts[i] > 0) {
        const idx = i * 3;
        const len = Math.sqrt(
          normals[idx] * normals[idx] +
            normals[idx + 1] * normals[idx + 1] +
            normals[idx + 2] * normals[idx + 2]
        );
        if (len > 0) {
          normals[idx] /= len;
          normals[idx + 1] /= len;
          normals[idx + 2] /= len;
        }
      }
    }

    this.modelData.vertexNormals = normals;
  }

  render() {
    if (!this.modelData) return;

    // Limpar buffers
    this.pixelBuffer.fill(0);
    for (let i = 3; i < this.pixelBuffer.length; i += 4) {
      this.pixelBuffer[i] = 255; // Alpha
    }
    this.zBuffer.fill(Number.POSITIVE_INFINITY);

    // Cor de fundo
    for (let i = 0; i < this.pixelBuffer.length; i += 4) {
      this.pixelBuffer[i] = 242; // R
      this.pixelBuffer[i + 1] = 242; // G
      this.pixelBuffer[i + 2] = 242; // B
      this.pixelBuffer[i + 3] = 255; // A
    }

    // Transformar vértices
    const transformedVertices = this._transformVertices();

    // Renderizar faces
    if (this.fillFaces) {
      this._renderFaces(transformedVertices);
    }

    // Renderizar wireframe
    if (this.showWireframe) {
      this._renderWireframe(transformedVertices);
    }

    // Renderizar eixos
    if (this.showAxes) {
      this._renderAxes();
    }

    // Copiar para canvas
    this.imageData.data.set(this.pixelBuffer);
    this.ctx.putImageData(this.imageData, 0, 0);

    if (this.showLightIndicator) {
      this._drawLightIndicator2D();
    } else {
      this._clearLightIndicator();
    }
  }

  _transformVertices() {
    const vertices = this.modelData.verticesActual;
    const transformed = [];

    const mvpMatrix = Matrix.multiply(
      this.projectionMatrix,
      this.transformMatrix
    );

    for (let i = 0; i < vertices.length; i += 3) {
      const v = [vertices[i], vertices[i + 1], vertices[i + 2], 1];

      // Aplicar apenas a transformação de modelo para obter coordenadas do mundo
      const worldTransformed = this._multiplyMatrixVector(
        this.transformMatrix,
        v
      );

      // Aplicar MVP completa para obter coordenadas de clipping
      const transformed4 = this._multiplyMatrixVector(mvpMatrix, v);

      // Para Z-buffer: usar Z após transformação mas antes da divisão perspectiva
      let zForBuffer = transformed4[2];

      // Perspectiva divide
      let screenX = transformed4[0];
      let screenY = transformed4[1];
      let screenZ = transformed4[2];

      if (Math.abs(transformed4[3]) > 0.0001) {
        screenX /= transformed4[3];
        screenY /= transformed4[3];
        screenZ /= transformed4[3];
      }

      // Transformar para coordenadas de tela
      const x = (screenX + 1) * 0.5 * this.width;
      const y = (1 - screenY) * 0.5 * this.height;

      transformed.push({
        x: x,
        y: y,
        z: zForBuffer, // Z para Z-buffer (antes da divisão perspectiva)
        screenZ: screenZ, // Z normalizado
        worldX: worldTransformed[0],
        worldY: worldTransformed[1],
        worldZ: worldTransformed[2],
      });
    }

    return transformed;
  }

  _multiplyMatrixVector(matrix, vector) {
    const result = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      result[i] =
        matrix[i * 4] * vector[0] +
        matrix[i * 4 + 1] * vector[1] +
        matrix[i * 4 + 2] * vector[2] +
        matrix[i * 4 + 3] * vector[3];
    }
    return result;
  }

  _renderFaces(transformedVertices) {
    // Criar lista de faces com profundidade média para ordenação
    const facesWithDepth = [];

    for (let i = 0; i < this.modelData.faces.length; i++) {
      const face = this.modelData.faces[i];

      // Calcular profundidade média da face
      let avgZ = 0;
      for (let j = 0; j < face.length; j++) {
        avgZ += transformedVertices[face[j]].z;
      }
      avgZ /= face.length;

      facesWithDepth.push({ index: i, depth: avgZ, face: face });
    }

    // Ordenar faces por profundidade (mais distantes primeiro)
    facesWithDepth.sort((a, b) => b.depth - a.depth);

    // Renderizar faces ordenadas
    for (let faceData of facesWithDepth) {
      const face = faceData.face;
      const faceIndex = faceData.index;

      // Backface culling
      if (this.backfaceCullingEnabled) {
        const v0 = transformedVertices[face[0]];
        const v1 = transformedVertices[face[1]];
        const v2 = transformedVertices[face[2]];

        // Calcular normal da face no espaço da tela usando produto vetorial
        const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y };
        const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y };
        const screenNormal = edge1.x * edge2.y - edge1.y * edge2.x;

        // Face está de costas se normal aponta para dentro da tela (valor negativo)
        // No sistema de coordenadas da tela, Y cresce para baixo
        if (screenNormal < 0) continue;
      }

      // Triangular a face
      for (let j = 1; j < face.length - 1; j++) {
        const triangle = [face[0], face[j], face[j + 1]];
        this._renderTriangle(transformedVertices, triangle, faceIndex);
      }
    }
  }

  _renderTriangle(transformedVertices, triangle, faceIndex) {
    const v0 = transformedVertices[triangle[0]];
    const v1 = transformedVertices[triangle[1]];
    const v2 = transformedVertices[triangle[2]];

    // Ordenar vértices por Y
    let verts = [
      { ...v0, index: triangle[0] },
      { ...v1, index: triangle[1] },
      { ...v2, index: triangle[2] },
    ];
    verts.sort((a, b) => a.y - b.y);

    // Implementar algoritmo Scanline
    this._scanlineTriangle(verts, faceIndex);
  }

  _scanlineTriangle(verts, faceIndex) {
    const [v0, v1, v2] = verts;

    // Parte superior do triângulo
    for (let y = Math.ceil(v0.y); y <= Math.floor(v1.y); y++) {
      if (y >= 0 && y < this.height) {
        const t = v2.y - v0.y > 0.0001 ? (y - v0.y) / (v2.y - v0.y) : 0;
        const t1 = v1.y - v0.y > 0.0001 ? (y - v0.y) / (v1.y - v0.y) : 0;

        const x1 = v0.x + t * (v2.x - v0.x);
        const z1 = v0.z + t * (v2.z - v0.z);

        const x2 = v0.x + t1 * (v1.x - v0.x);
        const z2 = v0.z + t1 * (v1.z - v0.z);

        this._scanlineRow(y, x1, z1, x2, z2, verts, faceIndex);
      }
    }

    // Parte inferior do triângulo
    for (let y = Math.ceil(v1.y); y <= Math.floor(v2.y); y++) {
      if (y >= 0 && y < this.height) {
        const t = v2.y - v0.y > 0.0001 ? (y - v0.y) / (v2.y - v0.y) : 0;
        const t1 = v2.y - v1.y > 0.0001 ? (y - v1.y) / (v2.y - v1.y) : 0;

        const x1 = v0.x + t * (v2.x - v0.x);
        const z1 = v0.z + t * (v2.z - v0.z);

        const x2 = v1.x + t1 * (v2.x - v1.x);
        const z2 = v1.z + t1 * (v2.z - v1.z);

        this._scanlineRow(y, x1, z1, x2, z2, verts, faceIndex);
      }
    }
  }

  _scanlineRow(y, x1, z1, x2, z2, verts, faceIndex) {
    if (x1 > x2) {
      [x1, x2] = [x2, x1];
      [z1, z2] = [z2, z1];
    }

    const startX = Math.max(0, Math.ceil(x1));
    const endX = Math.min(this.width - 1, Math.floor(x2));

    for (let x = startX; x <= endX; x++) {
      const t = x2 - x1 > 0.0001 ? (x - x1) / (x2 - x1) : 0;
      const z = z1 + t * (z2 - z1);

      const pixelIndex = y * this.width + x;

      // Z-buffer test
      if (!this.zBufferEnabled || z < this.zBuffer[pixelIndex]) {
        if (this.zBufferEnabled) {
          this.zBuffer[pixelIndex] = z;
        }

        // Calcular cor
        const color = this._calculatePixelColor(x, y, z, verts, faceIndex);

        // Escrever pixel
        const bufferIndex = pixelIndex * 4;
        this.pixelBuffer[bufferIndex] = Math.floor(color[0] * 255);
        this.pixelBuffer[bufferIndex + 1] = Math.floor(color[1] * 255);
        this.pixelBuffer[bufferIndex + 2] = Math.floor(color[2] * 255);
        this.pixelBuffer[bufferIndex + 3] = 255;
      }
    }
  }

  _calculatePixelColor(x, y, z, verts, faceIndex) {
    if (!this.lightingEnabled) {
      return this.faceColor;
    }

    const [v0, v1, v2] = verts;

    // Calcular coordenadas baricêntricas
    const area = (v1.x - v0.x) * (v2.y - v0.y) - (v2.x - v0.x) * (v1.y - v0.y);

    if (Math.abs(area) < 0.0001) {
      return this.faceColor;
    }

    const w0 = ((v1.x - x) * (v2.y - y) - (v2.x - x) * (v1.y - y)) / area;
    const w1 = ((v2.x - x) * (v0.y - y) - (v0.x - x) * (v2.y - y)) / area;
    const w2 = 1 - w0 - w1;

    // Interpolar posição no espaço do mundo
    const worldPos = [
      w0 * v0.worldX + w1 * v1.worldX + w2 * v2.worldX,
      w0 * v0.worldY + w1 * v1.worldY + w2 * v2.worldY,
      w0 * v0.worldZ + w1 * v1.worldZ + w2 * v2.worldZ,
    ];

    if (this.lightingType === "flat") {
      // Flat shading - usar normal da face
      const normal = [
        this.modelData.faceNormals[faceIndex * 3],
        this.modelData.faceNormals[faceIndex * 3 + 1],
        this.modelData.faceNormals[faceIndex * 3 + 2],
      ];
      return this._calculateLighting(worldPos, normal);
    } else if (this.lightingType === "gouraud") {
      // Gouraud shading - interpolar cores dos vértices
      const c0 = this._calculateVertexLighting(v0.index);
      const c1 = this._calculateVertexLighting(v1.index);
      const c2 = this._calculateVertexLighting(v2.index);

      return [
        w0 * c0[0] + w1 * c1[0] + w2 * c2[0],
        w0 * c0[1] + w1 * c1[1] + w2 * c2[1],
        w0 * c0[2] + w1 * c1[2] + w2 * c2[2],
      ];
    } else {
      // Phong shading - interpolar normais
      const n0 = this._getVertexNormal(v0.index);
      const n1 = this._getVertexNormal(v1.index);
      const n2 = this._getVertexNormal(v2.index);

      const normal = [
        w0 * n0[0] + w1 * n1[0] + w2 * n2[0],
        w0 * n0[1] + w1 * n1[1] + w2 * n2[1],
        w0 * n0[2] + w1 * n1[2] + w2 * n2[2],
      ];

      // Normalizar
      const len = Math.sqrt(
        normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]
      );
      if (len > 0) {
        normal[0] /= len;
        normal[1] /= len;
        normal[2] /= len;
      }

      return this._calculateLighting(worldPos, normal);
    }
  }

  _getVertexNormal(index) {
    const idx = index * 3;
    return [
      this.modelData.vertexNormals[idx],
      this.modelData.vertexNormals[idx + 1],
      this.modelData.vertexNormals[idx + 2],
    ];
  }

  _calculateVertexLighting(index) {
    const idx = index * 3;
    const worldPos = [
      this.modelData.verticesActual[idx],
      this.modelData.verticesActual[idx + 1],
      this.modelData.verticesActual[idx + 2],
    ];
    const normal = this._getVertexNormal(index);
    return this._calculateLighting(worldPos, normal);
  }

  _calculateLighting(position, normal) {
    // Vetor da luz
    const lightDir = [
      this.lightPosition[0] - position[0],
      this.lightPosition[1] - position[1],
      this.lightPosition[2] - position[2],
    ];

    // Normalizar
    const lightLen = Math.sqrt(
      lightDir[0] * lightDir[0] +
        lightDir[1] * lightDir[1] +
        lightDir[2] * lightDir[2]
    );
    if (lightLen > 0) {
      lightDir[0] /= lightLen;
      lightDir[1] /= lightLen;
      lightDir[2] /= lightLen;
    }

    // Componente difusa
    const diff = Math.max(
      0,
      normal[0] * lightDir[0] +
        normal[1] * lightDir[1] +
        normal[2] * lightDir[2]
    );

    // Vetor de visão
    const viewDir = [
      this.viewPosition[0] - position[0],
      this.viewPosition[1] - position[1],
      this.viewPosition[2] - position[2],
    ];

    // Normalizar
    const viewLen = Math.sqrt(
      viewDir[0] * viewDir[0] +
        viewDir[1] * viewDir[1] +
        viewDir[2] * viewDir[2]
    );
    if (viewLen > 0) {
      viewDir[0] /= viewLen;
      viewDir[1] /= viewLen;
      viewDir[2] /= viewLen;
    }

    // Vetor de reflexão
    const dotNL =
      normal[0] * lightDir[0] +
      normal[1] * lightDir[1] +
      normal[2] * lightDir[2];
    const reflect = [
      2 * dotNL * normal[0] - lightDir[0],
      2 * dotNL * normal[1] - lightDir[1],
      2 * dotNL * normal[2] - lightDir[2],
    ];

    // Componente especular
    const spec = Math.pow(
      Math.max(
        0,
        reflect[0] * viewDir[0] +
          reflect[1] * viewDir[1] +
          reflect[2] * viewDir[2]
      ),
      32
    );

    // Combinar componentes
    const ambient = 0.3;
    const diffuse = 0.6;
    const specular = 0.3;

    return [
      Math.min(
        1,
        this.faceColor[0] * (ambient + diffuse * diff) + specular * spec
      ),
      Math.min(
        1,
        this.faceColor[1] * (ambient + diffuse * diff) + specular * spec
      ),
      Math.min(
        1,
        this.faceColor[2] * (ambient + diffuse * diff) + specular * spec
      ),
    ];
  }

  _renderWireframe(transformedVertices) {
    const edgeSet = new Set();

    for (let i = 0; i < this.modelData.faces.length; i++) {
      const face = this.modelData.faces[i];

      // Verificar se a face é visível (para ocultar linhas)
      let faceVisible = true;
      if (this.fillFaces && this.backfaceCullingEnabled) {
        const v0 = transformedVertices[face[0]];
        const v1 = transformedVertices[face[1]];
        const v2 = transformedVertices[face[2]];

        const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y };
        const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y };
        const screenNormal = edge1.x * edge2.y - edge1.y * edge2.x;

        // Consistente com a renderização de faces
        faceVisible = screenNormal >= 0;
      }

      if (!faceVisible) continue;

      // Desenhar arestas da face
      for (let j = 0; j < face.length; j++) {
        const v1 = face[j];
        const v2 = face[(j + 1) % face.length];

        // Evitar desenhar a mesma aresta duas vezes
        const edgeKey = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          this._drawLine(
            transformedVertices[v1],
            transformedVertices[v2],
            [0, 0, 0]
          );
        }
      }
    }
  }

  _drawLine(v1, v2, color) {
    let x0 = Math.round(v1.x);
    let y0 = Math.round(v1.y);
    let x1 = Math.round(v2.x);
    let y1 = Math.round(v2.y);

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    // Interpolação de Z
    const totalDist = Math.sqrt(dx * dx + dy * dy);

    while (true) {
      if (x0 >= 0 && x0 < this.width && y0 >= 0 && y0 < this.height) {
        // Calcular Z interpolado
        const t =
          totalDist > 0
            ? Math.sqrt((x0 - v1.x) * (x0 - v1.x) + (y0 - v1.y) * (y0 - v1.y)) /
              totalDist
            : 0;
        const z = v1.z + t * (v2.z - v1.z);

        const pixelIndex = y0 * this.width + x0;

        // Verificar Z-buffer para linhas ocultas
        if (!this.zBufferEnabled || z < this.zBuffer[pixelIndex] + 0.001) {
          const bufferIndex = pixelIndex * 4;
          this.pixelBuffer[bufferIndex] = color[0] * 255;
          this.pixelBuffer[bufferIndex + 1] = color[1] * 255;
          this.pixelBuffer[bufferIndex + 2] = color[2] * 255;
          this.pixelBuffer[bufferIndex + 3] = 255;
        }
      }

      if (x0 === x1 && y0 === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  _renderAxes() {
    const origin = this._transformPoint([0, 0, 0]);
    const xAxis = this._transformPoint([1, 0, 0]);
    const yAxis = this._transformPoint([0, 1, 0]);
    const zAxis = this._transformPoint([0, 0, 1]);

    // Desenhar eixos
    this._drawLine(origin, xAxis, [1, 0, 0]); // X - vermelho
    this._drawLine(origin, yAxis, [0, 1, 0]); // Y - verde
    this._drawLine(origin, zAxis, [0, 0, 1]); // Z - azul
  }

  _transformPoint(point) {
    const v = [point[0], point[1], point[2], 1];
    const mvpMatrix = Matrix.multiply(this.projectionMatrix, Matrix.identity());
    const transformed = this._multiplyMatrixVector(mvpMatrix, v);

    // Guardar Z no espaço da câmera
    const cameraZ = v[2];

    if (Math.abs(transformed[3]) > 0.0001) {
      transformed[0] /= transformed[3];
      transformed[1] /= transformed[3];
      transformed[2] /= transformed[3];
    }

    return {
      x: (transformed[0] + 1) * 0.5 * this.width,
      y: (1 - transformed[1]) * 0.5 * this.height,
      z: cameraZ,
    };
  }

  _drawLightIndicator2D() {
    if (!this.solzinhoCanvas) return;
    const ctx = this.solzinhoCanvas.getContext("2d");
    ctx.clearRect(0, 0, this.solzinhoCanvas.width, this.solzinhoCanvas.height);

    // Transformar luz para coordenadas de tela
    const lightPoint = this._transformPoint(this.lightPosition);
    const cx = lightPoint.x;
    const cy = lightPoint.y;

    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFD700";
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 17);
    ctx.lineTo(cx, cy + 17);
    ctx.moveTo(cx - 17, cy);
    ctx.lineTo(cx + 17, cy);
    ctx.moveTo(cx - 12, cy - 12);
    ctx.lineTo(cx + 12, cy + 12);
    ctx.moveTo(cx - 12, cy + 12);
    ctx.lineTo(cx + 12, cy - 12);
    ctx.strokeStyle = "#FFC400";
    ctx.stroke();
    ctx.restore();
  }

  _clearLightIndicator() {
    if (!this.solzinhoCanvas) return;
    const ctx = this.solzinhoCanvas.getContext("2d");
    ctx.clearRect(0, 0, this.solzinhoCanvas.width, this.solzinhoCanvas.height);
  }
}
