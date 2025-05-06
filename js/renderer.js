/**
 * Renderer WebGL para modelos 3D
 */
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.program = null;
    this.buffers = {};
    this.showAxes = true;
    this.axisBuffers = {};

    // Estado do modelo
    this.modelData = null;
    this.indexCount = 0;

    // Matriz de transformação acumulada
    this.transformMatrix = Matrix.identity();

    // Matriz de projeção (inicialmente identidade)
    this.projectionMatrix = Matrix.identity();

    // Estado da interação
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.currentKey = null; // Tecla atual pressionada

    // Sensibilidade das transformações
    this.rotationSensitivity = 0.01;
    this.translationSensitivity = 0.01;
    this.scaleSensitivity = 0.005; // Reduzida para mais controle

    // Inicializar WebGL
    this.init();
  }

  /**
   * Inicializa o contexto WebGL e shaders
   */
  init() {
    // Obter contexto WebGL
    this.gl = this.canvas.getContext("webgl", { antialias: true });

    if (!this.gl) {
      console.error("WebGL não suportado neste navegador.");
      return;
    }

    // Ajustar tamanho do canvas
    this.resizeCanvas();

    // Configurar shaders e programa
    this._initShaders();

    // Configurações iniciais do WebGL
    this.gl.clearColor(0.95, 0.95, 0.95, 1.0);
    this.gl.enable(this.gl.DEPTH_TEST);

    // Adicionar listeners para eventos de mouse e teclado
    this._initEventListeners();
    this._createAxisBuffers();
  }

  /**
   * Cria buffers com 3 linhas coloridas para os eixos.
   * (+X vermelho, +Y verde, +Z azul, todos de -1 a 1)
   */
  _createAxisBuffers() {
    const gl = this.gl;

    // posição xyz e cor rgb intercalados
    const axisVertices = new Float32Array([
      // X  (vermelho)
      -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
      // Y  (verde)
      0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
      // Z  (azul)
      0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    ]);

    this.axisBuffers.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.axisBuffers.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, axisVertices, gl.STATIC_DRAW);

    this.axisBuffers.vertexCount = 6; // 3 linhas → 6 vértices
  }

  /**
   * Inicializa os listeners de eventos para transformações
   * @private
   */
  _initEventListeners() {
    // Mouse down
    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    // Mouse up/leave
    this.canvas.addEventListener("mouseup", () => (this.isDragging = false));
    this.canvas.addEventListener("mouseleave", () => (this.isDragging = false));

    // Mouse move para rotação e translação
    this.canvas.addEventListener("mousemove", (e) => {
      if (!this.isDragging || !this.modelData) return;

      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      // Translação com botão direito
      if (e.buttons === 2) {
        this._handleTranslation(deltaX, deltaY);
      }
      // Rotação com Ctrl+botão esquerdo ou botão esquerdo
      else if (e.buttons === 1) {
        this._handleRotation(deltaX, deltaY, e.ctrlKey);
      }
    });

    // Prevenir menu de contexto
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Scroll para escala
    this.canvas.addEventListener("wheel", (e) => {
      if (!this.modelData) return;
      e.preventDefault();

      this._handleScaling(e.deltaY, this.currentKey);
    });

    // Eventos de teclado
    document.addEventListener("keydown", (e) => {
      this.currentKey = e.key.toLowerCase();
    });

    document.addEventListener("keyup", () => {
      this.currentKey = null;
    });
  }

  /**
   * Manipula a translação do modelo
   * @private
   */
  _handleTranslation(deltaX, deltaY) {
    let tx = deltaX * this.translationSensitivity;
    let ty = -deltaY * this.translationSensitivity; // Invertido para mover na direção esperada
    let tz = 0;

    // Se a tecla 'z' estiver pressionada, aplicar translação em Z
    if (this.currentKey === "z") {
      tz = deltaY * this.translationSensitivity;
      ty = 0;
    }

    // Criar matriz de translação
    const translationMatrix = Matrix.translation(tx, ty, tz);

    // Aplicar à matriz acumulada
    this.transformMatrix = Matrix.multiply(
      translationMatrix,
      this.transformMatrix
    );

    // Renderizar
    this.render();
  }

  /**
   * Manipula a rotação do modelo
   * @private
   */
  _handleRotation(deltaX, deltaY, ctrlKey) {
    let rotationMatrix;

    if (ctrlKey) {
      // Rotação genérica (X e Y) com Ctrl+clique
      const rotationMatrixX = Matrix.rotationX(
        deltaY * this.rotationSensitivity
      );
      const rotationMatrixY = Matrix.rotationY(
        deltaX * this.rotationSensitivity
      );
      rotationMatrix = Matrix.multiply(rotationMatrixY, rotationMatrixX);
    } else if (this.currentKey === "x") {
      // Rotação em X
      rotationMatrix = Matrix.rotationX(deltaY * this.rotationSensitivity);
    } else if (this.currentKey === "y") {
      // Rotação em Y
      rotationMatrix = Matrix.rotationY(deltaX * this.rotationSensitivity);
    } else {
      // Rotação em Z (padrão)
      rotationMatrix = Matrix.rotationZ(deltaX * this.rotationSensitivity);
    }

    // Aplicar à matriz acumulada
    this.transformMatrix = Matrix.multiply(
      rotationMatrix,
      this.transformMatrix
    );

    // Renderizar
    this.render();
  }

  /**
   * Manipula a escala do modelo
   * @private
   */
  _handleScaling(deltaY, keyPressed) {
    const scaleFactor = 1 - Math.sign(deltaY) * this.scaleSensitivity;
    let scaleMatrix;

    if (keyPressed === "z") {
      scaleMatrix = Matrix.scaling(1, 1, scaleFactor);
    } else if (keyPressed === "x") {
      scaleMatrix = Matrix.scaling(scaleFactor, 1, 1);
    } else if (keyPressed === "y") {
      scaleMatrix = Matrix.scaling(1, scaleFactor, 1);
    } else {
      scaleMatrix = Matrix.scaling(scaleFactor, scaleFactor, scaleFactor);
    }

    this.transformMatrix = Matrix.multiply(this.transformMatrix, scaleMatrix);

    this.render();
  }

  /**
   * Inicializa os shaders e programa WebGL
   * @private
   */
  _initShaders() {
    // Vertex shader com suporte a transformação e projeção
    const vsSource = `
  attribute vec3 aPosition;
  attribute vec3 aColor;              
  varying vec3 vColor;                
  uniform mat4 uTransformMatrix;
  uniform mat4 uProjectionMatrix;

  void main() {
      vColor = aColor;                
      gl_Position = uProjectionMatrix * uTransformMatrix * vec4(aPosition, 1.0);
      gl_PointSize = 3.0;
  }
`;

    // FS – use a cor recebida
    const fsSource = `
  precision mediump float;
  varying vec3 vColor;                 
  void main() {
      gl_FragColor = vec4(vColor, 1.0);
  }
`;

    // Criar e compilar shaders
    const vertexShader = this._createShader(this.gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this._createShader(
      this.gl.FRAGMENT_SHADER,
      fsSource
    );

    // Criar e linkar o programa de shader
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);
    this.program.aColor = this.gl.getAttribLocation(this.program, "aColor");

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error(
        "Erro ao linkar programa de shader:",
        this.gl.getProgramInfoLog(this.program)
      );
      return;
    }

    // Obter localizações de atributos e uniformes
    this.program.aPosition = this.gl.getAttribLocation(
      this.program,
      "aPosition"
    );
    this.program.uTransformMatrix = this.gl.getUniformLocation(
      this.program,
      "uTransformMatrix"
    );
    this.program.uProjectionMatrix = this.gl.getUniformLocation(
      this.program,
      "uProjectionMatrix"
    );

    this.gl.useProgram(this.program);
  }

  /**
   * Cria e compila um shader
   * @private
   */
  _createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error(
        "Erro ao compilar shader:",
        this.gl.getShaderInfoLog(shader)
      );
      return null;
    }

    return shader;
  }

  /**
   * Redimensiona o canvas para ocupar todo o container
   */
  resizeCanvas() {
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;

    if (
      this.canvas.width !== displayWidth ||
      this.canvas.height !== displayHeight
    ) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Carrega um modelo para renderização
   * @param {Object} modelData - Dados do modelo (vértices, índices, etc.)
   */
  loadModel(modelData) {
    const gl = this.gl;

    // Armazenar referência aos dados do modelo
    this.modelData = modelData;

    // Resetar matrizes
    this.transformMatrix = Matrix.identity();
    this.projectionMatrix = Matrix.identity();

    // Criar buffer de vértices
    this.buffers.vertex = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertex);
    gl.bufferData(gl.ARRAY_BUFFER, modelData.verticesActual, gl.STATIC_DRAW);

    // Criar índices para desenhar arestas
    const edgeIndices = [];
    for (let face of modelData.faces) {
      for (let i = 0; i < face.length; i++) {
        const current = face[i];
        const next = face[(i + 1) % face.length];
        edgeIndices.push(current, next);
      }
    }

    // Criar buffer de índices
    this.buffers.index = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(edgeIndices),
      gl.STATIC_DRAW
    );
    this.indexCount = edgeIndices.length;

    // Renderizar o modelo inicialmente
    this.render();
  }

  /**
   * Renderiza a cena
   */
  render() {
    if (!this.gl || !this.modelData) return;

    const gl = this.gl;

    // Limpar o canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Usar o programa de shader
    gl.useProgram(this.program);

    // Configurar atributos
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertex);
    gl.vertexAttribPointer(this.program.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.program.aPosition);
    gl.disableVertexAttribArray(this.program.aColor); // força cor fixa preta
    gl.vertexAttrib3f(this.program.aColor, 0, 0, 0);

    gl.uniformMatrix4fv(
      this.program.uTransformMatrix,
      false,
      this.transformMatrix
    );
    gl.uniformMatrix4fv(
      this.program.uProjectionMatrix,
      false,
      this.projectionMatrix
    );
    gl.drawElements(gl.LINES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    if (this.showAxes) {
      // 1) Bind do VBO de eixos
      gl.bindBuffer(gl.ARRAY_BUFFER, this.axisBuffers.vbo);

      // 2) Posição intercalada: posição (3 floats) + cor (3 floats)
      const stride = 6 * Float32Array.BYTES_PER_ELEMENT;
      gl.vertexAttribPointer(
        this.program.aPosition,
        3,
        gl.FLOAT,
        false,
        stride,
        0
      );
      gl.enableVertexAttribArray(this.program.aPosition);

      gl.vertexAttribPointer(
        this.program.aColor,
        3,
        gl.FLOAT,
        false,
        stride,
        3 * Float32Array.BYTES_PER_ELEMENT
      );
      gl.enableVertexAttribArray(this.program.aColor);

      // 3) Use IDENTIDADE para o modelo ao desenhar os eixos
      gl.uniformMatrix4fv(
        this.program.uTransformMatrix,
        false,
        Matrix.identity()
      );

      // 4) Continua usando a mesma projeção
      gl.uniformMatrix4fv(
        this.program.uProjectionMatrix,
        false,
        this.projectionMatrix
      );

      // 5) Desenha as linhas dos eixos
      gl.drawArrays(gl.LINES, 0, this.axisBuffers.vertexCount);
    }
  }
}
