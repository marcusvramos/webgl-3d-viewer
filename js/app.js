class App {
  constructor() {
    this.canvas = document.getElementById("glCanvas");
    this.fileInput = document.getElementById("fileInput");
    this.modelInfo = document.getElementById("modelInfo");
    this.loadingIndicator = document.getElementById("loadingIndicator");
    this.transformInfo = document.getElementById("transformInfo");
    this.fovSlider = document.getElementById("fovSlider");
    this.fovValue = document.getElementById("fovValue");
    this.currentModel = null;
    this.isLoading = false;
    this.currentProjection = "none";
    this.renderer = new Renderer(this.canvas);
    this.parser = new OBJParser();
    this._initEvents();
    this._resizeCanvas();
    window.addEventListener("resize", () => this._resizeCanvas());
    this._showWelcomeMessage();
  }
  _initEvents() {
    this.fileInput.addEventListener("change", (e) => this._handleFileSelect(e));
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this._resetTransformations());
    }
    const clearBtn = document.getElementById("clearBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => this._clearModel());
    }
    const frontView = document.getElementById("frontView");
    const topView = document.getElementById("topView");
    const sideView = document.getElementById("sideView");
    if (frontView) {
      frontView.addEventListener("click", () =>
        this._setProjection("frontView")
      );
    }
    if (topView) {
      topView.addEventListener("click", () => this._setProjection("topView"));
    }
    if (sideView) {
      sideView.addEventListener("click", () => this._setProjection("sideView"));
    }
    const perspectiveView = document.getElementById("perspectiveView");
    if (perspectiveView) {
      perspectiveView.addEventListener("click", () =>
        this._setProjection("perspective")
      );
    }
    if (this.fovSlider) {
      this.fovSlider.addEventListener("input", () => {
        const fov = this.fovSlider.value;
        this.fovValue.textContent = `${fov}°`;
        if (this.currentProjection === "perspective") {
          this._setProjection("perspective");
        }
      });
    }
    const cavalierView = document.getElementById("cavalierView");
    const cabinetView = document.getElementById("cabinetView");
    if (cavalierView) {
      cavalierView.addEventListener("click", () =>
        this._setProjection("cavalier")
      );
    }
    if (cabinetView) {
      cabinetView.addEventListener("click", () =>
        this._setProjection("cabinet")
      );
    }
    const helpBtn = document.getElementById("helpBtn");
    const modal = document.getElementById("instructionsModal");
    const closeModal = document.querySelector(".close-modal");
    if (helpBtn && modal) {
      helpBtn.addEventListener("click", () => {
        modal.classList.remove("hidden");
      });
    }
    if (closeModal && modal) {
      closeModal.addEventListener("click", () => {
        modal.classList.add("hidden");
      });
      window.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.classList.add("hidden");
        }
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !modal.classList.contains("hidden")) {
          modal.classList.add("hidden");
        }
      });
    }
    const toggleAxesBtn = document.getElementById("toggleAxesBtn");
    if (toggleAxesBtn) {
      toggleAxesBtn.addEventListener("click", () => {
        this.renderer.showAxes = !this.renderer.showAxes;
        toggleAxesBtn.classList.toggle("btn-accent", this.renderer.showAxes);
        this.renderer.render();
      });
    }
    const fillFacesCheckbox = document.getElementById("fillFaces");
    if (fillFacesCheckbox) {
      fillFacesCheckbox.addEventListener("change", (e) => {
        this.renderer.fillFaces = e.target.checked;
        this.renderer.render();
      });
    }
    const lightingCheckbox = document.getElementById("enableLighting");
    if (lightingCheckbox) {
      lightingCheckbox.addEventListener("change", (e) => {
        this.renderer.lightingEnabled = e.target.checked;
        this.renderer.render();
      });
    }
    const lightingType = document.getElementById("lightingType");
    if (lightingType) {
      lightingType.addEventListener("change", (e) => {
        this.renderer.setLightingType(e.target.value);
      });
    }
    const colorInput = document.getElementById("faceColor");
    if (colorInput) {
      colorInput.addEventListener("input", (e) => {
        const hex = e.target.value;
        const rgb = [
          parseInt(hex.substr(1, 2), 16) / 255,
          parseInt(hex.substr(3, 2), 16) / 255,
          parseInt(hex.substr(5, 2), 16) / 255,
        ];
        this.renderer.faceColor = rgb;
        this.renderer.render();
      });
    }
  }
  _setProjection(projectionType) {
    if (!this.currentModel) return;
    this.currentProjection = projectionType;
    this.renderer.transformMatrix = Matrix.identity();
    switch (projectionType) {
      case "frontView":
        this.renderer.projectionMatrix = Matrix.orthographicFront();
        break;
      case "topView":
        this.renderer.projectionMatrix = Matrix.orthographicTop();
        break;
      case "sideView":
        this.renderer.projectionMatrix = Matrix.orthographicSide();
        break;
      case "perspective":
        const fov = this.fovSlider ? parseFloat(this.fovSlider.value) : 60;
        this.renderer.projectionMatrix = Matrix.perspective(
          (fov * Math.PI) / 180,
          this.canvas.width / this.canvas.height,
          0.1,
          100
        );
        const translateBack = Matrix.translation(0, 0, -3);
        this.renderer.transformMatrix = translateBack;
        break;
      case "cavalier":
        this.renderer.projectionMatrix = Matrix.obliqueCavalier();
        break;
      case "cabinet":
        this.renderer.projectionMatrix = Matrix.obliqueCabinet();
        break;
      default:
        this.renderer.projectionMatrix = Matrix.identity();
        break;
    }
    this.renderer.render();
    this._updateProjectionInfo(projectionType);
  }
  _updateProjectionInfo(projectionType) {
    const buttons = document.querySelectorAll(".btn-projection");
    buttons.forEach((button) => {
      button.classList.remove("active");
    });
    let activeButtonId = "";
    switch (projectionType) {
      case "frontView":
        activeButtonId = "frontView";
        break;
      case "topView":
        activeButtonId = "topView";
        break;
      case "sideView":
        activeButtonId = "sideView";
        break;
      case "perspective":
        activeButtonId = "perspectiveView";
        break;
      case "cavalier":
        activeButtonId = "cavalierView";
        break;
      case "cabinet":
        activeButtonId = "cabinetView";
        break;
    }
    if (activeButtonId) {
      const activeButton = document.getElementById(activeButtonId);
      if (activeButton) {
        activeButton.classList.add("active");
      }
    }
  }
  _resetTransformations() {
    if (!this.currentModel) return;
    this.renderer.transformMatrix = Matrix.identity();
    this.renderer.projectionMatrix = Matrix.identity();
    this.currentProjection = "none";
    this._updateProjectionInfo("");
    this.renderer.render();
  }
  _clearModel() {
    if (!this.currentModel) return;
    this.currentModel = null;
    if (this.renderer.buffers.vertex) {
      this.renderer.gl.deleteBuffer(this.renderer.buffers.vertex);
    }
    if (this.renderer.buffers.index) {
      this.renderer.gl.deleteBuffer(this.renderer.buffers.index);
    }
    this.renderer.buffers = {};
    this.renderer.modelData = null;
    this.renderer.indexCount = 0;
    this.renderer.transformMatrix = Matrix.identity();
    this.renderer.projectionMatrix = Matrix.identity();
    this.currentProjection = "none";
    this.renderer.gl.clear(
      this.renderer.gl.COLOR_BUFFER_BIT | this.renderer.gl.DEPTH_BUFFER_BIT
    );
    this._showWelcomeMessage();
  }
  _handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    this._showLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const startTime = performance.now();
        const modelData = this.parser.parse(content);
        const endTime = performance.now();
        this.currentModel = {
          name: file.name,
          data: modelData,
          fileSize: file.size,
        };
        this.renderer.loadModel(modelData);
        this._updateModelInfo();
        this.renderer.render();
        this._setProjection("frontView");
      } catch (error) {
        alert("Erro ao carregar o arquivo OBJ.");
        this._updateStatusMessage("Erro ao carregar o modelo");
      } finally {
        this._showLoading(false);
      }
    };
    reader.onerror = () => {
      alert("Erro ao ler o arquivo.");
      this._showLoading(false);
      this._updateStatusMessage("Erro ao ler o arquivo");
    };
    this._updateStatusMessage(`Carregando ${file.name}...`);
    reader.readAsText(file);
  }
  _updateModelInfo() {
    if (!this.modelInfo || !this.currentModel) return;
    const metadata = this.parser.getMetadata();
    const model = this.currentModel;
    let html = "<h3>Informações do Modelo</h3>";
    html += `<div class="info-row">
                  <span class="info-label">Status:</span>
                  <span class="info-value">Carregado</span>
              </div>`;
    html += `<div class="info-row">
                  <span class="info-label">Arquivo:</span>
                  <span class="info-value">${model.name}</span>
              </div>`;
    html += `<div class="info-row">
                  <span class="info-label">Tamanho:</span>
                  <span class="info-value">${(model.fileSize / 1024).toFixed(
                    2
                  )} KB</span>
              </div>`;
    html += `<div class="info-row">
                  <span class="info-label">Vértices:</span>
                  <span class="info-value">${metadata.vertices.toLocaleString()}</span>
              </div>`;
    html += `<div class="info-row">
                  <span class="info-label">Faces:</span>
                  <span class="info-value">${metadata.faces.toLocaleString()}</span>
              </div>`;
    html += `<div class="info-row">
                  <span class="info-label">Normais:</span>
                  <span class="info-value">${metadata.normals.toLocaleString()}</span>
              </div>`;
    if (metadata.dimensions) {
      const [width, height, depth] = metadata.dimensions;
      html += `<div class="info-row">
                      <span class="info-label">Dimensões:</span>
                      <span class="info-value">
                          L: ${width.toFixed(2)}<br>
                          A: ${height.toFixed(2)}<br>
                          P: ${depth.toFixed(2)}
                      </span>
                  </div>`;
    }
    this.modelInfo.innerHTML = html;
  }
  _updateStatusMessage(message) {
    const statusEl = this.modelInfo.querySelector(".info-value");
    if (statusEl) {
      statusEl.textContent = message;
    }
  }
  _showWelcomeMessage() {
    if (!this.modelInfo) return;
    let html = "<h3>Informações do Modelo</h3>";
    html += `<div class="info-row">
                  <span class="info-label">Status:</span>
                  <span class="info-value">Nenhum modelo carregado</span>
              </div>`;
    this.modelInfo.innerHTML = html;
  }
  _showLoading(show) {
    this.isLoading = show;
    if (this.loadingIndicator) {
      this.loadingIndicator.classList.toggle("hidden", !show);
    }
  }
  _resizeCanvas() {
    if (!this.canvas) return;
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    const solzinho = document.getElementById("solzinho");
    if (solzinho) {
      solzinho.width = container.clientWidth;
      solzinho.height = container.clientHeight;
    }
    if (this.renderer) {
      this.renderer.resizeCanvas();
      this.renderer.render();
    }
  }
}
document.addEventListener("DOMContentLoaded", () => {
  window.app = new App();
});
