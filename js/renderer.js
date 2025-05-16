class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.programs = {};
    this.activeProgram = null;
    this.buffers = {};
    this.showAxes = true;
    this.axisBuffers = {};
    this.modelData = null;
    this.triangleCount = 0;
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
    this.faceColor = [0.69, 0.71, 0.87];
    this.lightPosition = [2, 2, -2];
    this.lightingType = "flat";
    this.movingLight = false;
    this.solzinhoCanvas = document.getElementById("solzinho");
    this.init();
  }
  init() {
    this.gl = this.canvas.getContext("webgl", { antialias: true });
    if (!this.gl) {
      alert("WebGL não suportado.");
      return;
    }
    this.resizeCanvas();
    this._initShaders();
    this.gl.clearColor(0.95, 0.95, 0.95, 1.0);
    this.gl.enable(this.gl.DEPTH_TEST);
    this._initEventListeners();
    this._createAxisBuffers();
  }
  _createAxisBuffers() {
    const gl = this.gl;
    const axisVertices = new Float32Array([
      -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
      0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    ]);
    this.axisBuffers.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.axisBuffers.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, axisVertices, gl.STATIC_DRAW);
    this.axisBuffers.vertexCount = 6;
  }
  _initEventListeners() {
    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });
    this.canvas.addEventListener("mouseup", () => (this.isDragging = false));
    this.canvas.addEventListener("mouseleave", () => (this.isDragging = false));
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
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
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
  _initShaders() {
    const vsFlat = `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      uniform mat4 uTransformMatrix;
      uniform mat4 uProjectionMatrix;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vPosition = (uTransformMatrix * vec4(aPosition, 1.0)).xyz;
        vNormal = mat3(uTransformMatrix) * aNormal;
        gl_Position = uProjectionMatrix * uTransformMatrix * vec4(aPosition, 1.0);
      }
    `;
    const fsFlat = `
      precision mediump float;
      varying vec3 vNormal;
      varying vec3 vPosition;
      uniform vec3 uLightPosition;
      uniform int uLightingEnabled;
      uniform vec3 uFaceColor;
      uniform vec3 uViewPosition;
      void main() {
        if (uLightingEnabled == 0) {
          gl_FragColor = vec4(uFaceColor, 1.0);
        } else {
          vec3 N = normalize(vNormal);
          vec3 L = normalize(uLightPosition - vPosition);
          float diff = max(dot(N, L), 0.0);
          vec3 color = uFaceColor * 0.35;
          color += uFaceColor * diff * 0.7;
          vec3 V = normalize(uViewPosition - vPosition);
          vec3 R = reflect(-L, N);
          float spec = pow(max(dot(V, R), 0.0), 24.0);
          color += vec3(1.0, 1.0, 1.0) * spec * 0.2;
          gl_FragColor = vec4(color, 1.0);
        }
      }
    `;
    const vsGouraud = `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      uniform mat4 uTransformMatrix;
      uniform mat4 uProjectionMatrix;
      uniform vec3 uLightPosition;
      uniform vec3 uFaceColor;
      uniform vec3 uViewPosition;
      uniform int uLightingEnabled;
      varying vec3 vColor;
      void main() {
        vec3 pos = (uTransformMatrix * vec4(aPosition,1.0)).xyz;
        vec3 norm = normalize(mat3(uTransformMatrix) * aNormal);
        if(uLightingEnabled==0){
          vColor = uFaceColor;
        } else {
          vec3 N = norm;
          vec3 L = normalize(uLightPosition - pos);
          float diff = max(dot(N,L),0.0);
          vColor = uFaceColor * 0.35 + uFaceColor * diff * 0.7;
          vec3 V = normalize(uViewPosition - pos);
          vec3 R = reflect(-L, N);
          float spec = pow(max(dot(V,R),0.0),24.0);
          vColor += vec3(1.0,1.0,1.0) * spec * 0.2;
        }
        gl_Position = uProjectionMatrix * uTransformMatrix * vec4(aPosition, 1.0);
      }
    `;
    const fsGouraud = `
      precision mediump float;
      varying vec3 vColor;
      void main() {
        gl_FragColor = vec4(vColor,1.0);
      }
    `;
    const vsPhong = `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      uniform mat4 uTransformMatrix;
      uniform mat4 uProjectionMatrix;
      varying vec3 vPosition;
      varying vec3 vNormal;
      void main() {
        vPosition = (uTransformMatrix * vec4(aPosition,1.0)).xyz;
        vNormal = normalize(mat3(uTransformMatrix) * aNormal);
        gl_Position = uProjectionMatrix * uTransformMatrix * vec4(aPosition, 1.0);
      }
    `;
    const fsPhong = `
      precision mediump float;
      varying vec3 vPosition;
      varying vec3 vNormal;
      uniform vec3 uLightPosition;
      uniform int uLightingEnabled;
      uniform vec3 uFaceColor;
      uniform vec3 uViewPosition;
      void main() {
        if (uLightingEnabled == 0) {
          gl_FragColor = vec4(uFaceColor, 1.0);
        } else {
          vec3 N = normalize(vNormal);
          vec3 L = normalize(uLightPosition - vPosition);
          float diff = max(dot(N, L), 0.0);
          vec3 color = uFaceColor * 0.35;
          color += uFaceColor * diff * 0.7;
          vec3 V = normalize(uViewPosition - vPosition);
          vec3 R = reflect(-L, N);
          float spec = pow(max(dot(V, R), 0.0), 24.0);
          color += vec3(1.0, 1.0, 1.0) * spec * 0.2;
          gl_FragColor = vec4(color, 1.0);
        }
      }
    `;
    this.programs.flat = this._createProgram(vsFlat, fsFlat);
    this.programs.gouraud = this._createProgram(vsGouraud, fsGouraud);
    this.programs.phong = this._createProgram(vsPhong, fsPhong);
    this.activeProgram = this.programs.flat;
  }
  _createProgram(vsSource, fsSource) {
    const gl = this.gl;
    const vertexShader = this._createShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this._createShader(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      alert("Erro ao linkar shaders");
      return null;
    }
    program.aPosition = gl.getAttribLocation(program, "aPosition");
    program.aNormal = gl.getAttribLocation(program, "aNormal");
    program.uTransformMatrix = gl.getUniformLocation(
      program,
      "uTransformMatrix"
    );
    program.uProjectionMatrix = gl.getUniformLocation(
      program,
      "uProjectionMatrix"
    );
    program.uLightPosition = gl.getUniformLocation(program, "uLightPosition");
    program.uLightingEnabled = gl.getUniformLocation(
      program,
      "uLightingEnabled"
    );
    program.uFaceColor = gl.getUniformLocation(program, "uFaceColor");
    program.uViewPosition = gl.getUniformLocation(program, "uViewPosition");
    return program;
  }
  _createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      alert("Erro shader: " + this.gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }
  setLightingType(type) {
    this.lightingType = type;
    this.activeProgram = this.programs[type] || this.programs.flat;
    this.render();
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
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.solzinhoCanvas) {
      this.solzinhoCanvas.width = displayWidth;
      this.solzinhoCanvas.height = displayHeight;
    }
  }
  loadModel(modelData) {
    const gl = this.gl;
    this.modelData = modelData;
    this.transformMatrix = Matrix.identity();
    this.projectionMatrix = Matrix.identity();
    this.buffers.vertex = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertex);
    gl.bufferData(gl.ARRAY_BUFFER, modelData.verticesActual, gl.STATIC_DRAW);
    if (!modelData.vertexNormals || modelData.vertexNormals.length === 0) {
      const count = modelData.verticesActual.length;
      this.modelData.vertexNormals = new Float32Array(count);
      for (let i = 0; i < count; i += 3) {
        this.modelData.vertexNormals[i] = 0;
        this.modelData.vertexNormals[i + 1] = 1;
        this.modelData.vertexNormals[i + 2] = 0;
      }
    }
    this.buffers.normal = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this.modelData.vertexNormals,
      gl.STATIC_DRAW
    );
    const triangleIndices = [];
    for (let face of modelData.faces) {
      if (face.length === 3) {
        triangleIndices.push(face[0], face[1], face[2]);
      } else if (face.length === 4) {
        triangleIndices.push(face[0], face[1], face[2]);
        triangleIndices.push(face[0], face[2], face[3]);
      } else if (face.length > 4) {
        for (let i = 1; i < face.length - 1; i++) {
          triangleIndices.push(face[0], face[i], face[i + 1]);
        }
      }
    }
    this.buffers.triangle = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.triangle);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(triangleIndices),
      gl.STATIC_DRAW
    );
    this.triangleCount = triangleIndices.length;
    const edgeIndices = [];
    for (let face of modelData.faces) {
      for (let i = 0; i < face.length; i++) {
        const current = face[i];
        const next = face[(i + 1) % face.length];
        edgeIndices.push(current, next);
      }
    }
    this.buffers.edge = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.edge);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(edgeIndices),
      gl.STATIC_DRAW
    );
    this.edgeCount = edgeIndices.length;
    this.render();
  }
  render() {
    if (!this.gl || !this.modelData) return;
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.activeProgram);

    gl.uniformMatrix4fv(
      this.activeProgram.uTransformMatrix,
      false,
      this.transformMatrix
    );
    gl.uniformMatrix4fv(
      this.activeProgram.uProjectionMatrix,
      false,
      this.projectionMatrix
    );
    gl.uniform3fv(this.activeProgram.uLightPosition, this.lightPosition);
    gl.uniform3fv(this.activeProgram.uViewPosition, [0, 0, -1]);
    gl.uniform3fv(this.activeProgram.uFaceColor, this.faceColor);
    gl.uniform1i(
      this.activeProgram.uLightingEnabled,
      this.lightingEnabled ? 1 : 0
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertex);
    gl.vertexAttribPointer(
      this.activeProgram.aPosition,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(this.activeProgram.aPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal);
    gl.vertexAttribPointer(
      this.activeProgram.aNormal,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(this.activeProgram.aNormal);

    if (this.fillFaces) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.triangle);
      gl.drawElements(gl.TRIANGLES, this.triangleCount, gl.UNSIGNED_SHORT, 0);
    }

    gl.uniform3fv(this.activeProgram.uFaceColor, [0, 0, 0]);
    gl.uniform1i(this.activeProgram.uLightingEnabled, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.edge);
    gl.drawElements(gl.LINES, this.edgeCount, gl.UNSIGNED_SHORT, 0);

    if (this.showAxes) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.axisBuffers.vbo);
      const stride = 6 * Float32Array.BYTES_PER_ELEMENT;
      gl.vertexAttribPointer(
        this.activeProgram.aPosition,
        3,
        gl.FLOAT,
        false,
        stride,
        0
      );
      gl.enableVertexAttribArray(this.activeProgram.aPosition);
      gl.vertexAttribPointer(
        this.activeProgram.aNormal,
        3,
        gl.FLOAT,
        false,
        stride,
        3 * Float32Array.BYTES_PER_ELEMENT
      );
      gl.enableVertexAttribArray(this.activeProgram.aNormal);
      gl.uniformMatrix4fv(
        this.activeProgram.uTransformMatrix,
        false,
        Matrix.identity()
      );
      gl.uniform3fv(this.activeProgram.uFaceColor, [1, 0, 0]);
      gl.drawArrays(gl.LINES, 0, 2);
      gl.uniform3fv(this.activeProgram.uFaceColor, [0, 1, 0]);
      gl.drawArrays(gl.LINES, 2, 2);
      gl.uniform3fv(this.activeProgram.uFaceColor, [0, 0, 1]);
      gl.drawArrays(gl.LINES, 4, 2);
    }
    this._drawLightIndicator2D();
  }
  _drawLightIndicator2D() {
    if (!this.solzinhoCanvas) return;
    const ctx = this.solzinhoCanvas.getContext("2d");
    ctx.clearRect(0, 0, this.solzinhoCanvas.width, this.solzinhoCanvas.height);

    // Transforma luz para NDC
    const model = this.transformMatrix;
    const proj = this.projectionMatrix;
    let [x, y, z] = this.lightPosition;
    const v = [x, y, z, 1];
    let mv = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++)
      mv[i] =
        model[i] * v[0] +
        model[i + 4] * v[1] +
        model[i + 8] * v[2] +
        model[i + 12] * v[3];
    let mp = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++)
      mp[i] =
        proj[i] * mv[0] +
        proj[i + 4] * mv[1] +
        proj[i + 8] * mv[2] +
        proj[i + 12] * mv[3];
    let sx = mp[0] / mp[3];
    let sy = mp[1] / mp[3];

    const cx = ((sx + 1) / 2) * this.solzinhoCanvas.width;
    const cy = ((1 - sy) / 2) * this.solzinhoCanvas.height;

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
}
