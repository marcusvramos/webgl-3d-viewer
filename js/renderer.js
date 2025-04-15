/**
 * Renderer WebGL para modelos 3D
 */
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.program = null;
    this.buffers = {};

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

    // Adicionar listener para redimensionamento da janela
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  /**
   * Inicializa os shaders e programa WebGL
   * @private
   */
  _initShaders() {
    // Vertex shader simplificado
    const vsSource = `
          attribute vec3 aPosition;
          
          void main() {
              gl_Position = vec4(aPosition, 1.0);
          }
      `;

    // Fragment shader simplificado
    const fsSource = `
          precision mediump float;
          
          void main() {
              gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
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

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error(
        "Erro ao linkar programa de shader:",
        this.gl.getProgramInfoLog(this.program)
      );
      return;
    }

    // Obter localizações de atributos
    this.program.aPosition = this.gl.getAttribLocation(
      this.program,
      "aPosition"
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
  }

  /**
   * Renderiza a cena
   */
  render() {
    if (!this.gl || !this.buffers.vertex) return;

    const gl = this.gl;

    // Limpar o canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Configurar atributos
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertex);
    gl.vertexAttribPointer(this.program.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.program.aPosition);

    // Desenhar arestas
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
    gl.drawElements(gl.LINES, this.indexCount, gl.UNSIGNED_SHORT, 0);
  }
}
