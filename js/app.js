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

    // Projeções ortográficas
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

    // Projeção perspectiva
    const perspectiveView = document.getElementById("perspectiveView");
    if (perspectiveView) {
      perspectiveView.addEventListener("click", () =>
        this._setProjection("perspective")
      );
    }

    // Slider FOV
    if (this.fovSlider) {
      this.fovSlider.addEventListener("input", () => {
        const fov = this.fovSlider.value;
        this.fovValue.textContent = `${fov}°`;
        if (this.currentProjection === "perspective") {
          this._setProjection("perspective");
        }
      });
    }

    // Projeções oblíquas
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

    // Modal de ajuda
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

    // Toggle dos eixos
    const toggleAxesBtn = document.getElementById("toggleAxesBtn");
    if (toggleAxesBtn) {
      toggleAxesBtn.addEventListener("click", () => {
        this.renderer.showAxes = !this.renderer.showAxes;
        toggleAxesBtn.classList.toggle("btn-accent", this.renderer.showAxes);
        this.renderer.render();
      });
    }

    // Checkbox de wireframe
    const wireframeCheckbox = document.getElementById("showWireframe");
    if (wireframeCheckbox) {
      wireframeCheckbox.addEventListener("change", (e) => {
        this.renderer.showWireframe = e.target.checked;
        this.renderer.render();
      });
    }

    // Checkbox de preenchimento de faces
    const fillFacesCheckbox = document.getElementById("fillFaces");
    if (fillFacesCheckbox) {
      fillFacesCheckbox.addEventListener("change", (e) => {
        this.renderer.fillFaces = e.target.checked;
        // Automaticamente desativar wireframe quando preencher faces (opcional)
        if (e.target.checked && this.renderer.lightingEnabled) {
          const wireframeCheckbox = document.getElementById("showWireframe");
          if (wireframeCheckbox) {
            wireframeCheckbox.checked = false;
            this.renderer.showWireframe = false;
          }
        }
        this.renderer.render();
      });
    }

    // Checkbox de iluminação
    const lightingCheckbox = document.getElementById("enableLighting");
    if (lightingCheckbox) {
      lightingCheckbox.addEventListener("change", (e) => {
        this.renderer.lightingEnabled = e.target.checked;
        // Automaticamente ativar preenchimento de faces quando ativar iluminação
        if (e.target.checked) {
          const fillFacesCheckbox = document.getElementById("fillFaces");
          if (fillFacesCheckbox && !fillFacesCheckbox.checked) {
            fillFacesCheckbox.checked = true;
            this.renderer.fillFaces = true;
          }
        }
        this.renderer.render();
      });
    }

    // Checkbox para mostrar/ocultar o indicador de luz (solzinho)
    const showLightIndicatorCheckbox = document.getElementById("showLightIndicator");
    if (showLightIndicatorCheckbox) {
      showLightIndicatorCheckbox.addEventListener("change", (e) => {
        this.renderer.setShowLightIndicator(e.target.checked);
      });
    }

    // Checkbox para controlar se a luz segue o objeto
    const lightFollowsObjectCheckbox = document.getElementById("lightFollowsObject");
    if (lightFollowsObjectCheckbox) {
      lightFollowsObjectCheckbox.addEventListener("change", (e) => {
        this.renderer.setLightFollowsObject(e.target.checked);
      });
    }

    // Checkbox de backface culling
    const backfaceCullingCheckbox = document.getElementById(
      "enableBackfaceCulling"
    );
    if (backfaceCullingCheckbox) {
      backfaceCullingCheckbox.addEventListener("change", (e) => {
        this.renderer.backfaceCullingEnabled = e.target.checked;
        this.renderer.render();
      });
    }

    // Checkbox de Z-Buffer
    const zBufferCheckbox = document.getElementById("enableZBuffer");
    if (zBufferCheckbox) {
      zBufferCheckbox.addEventListener("change", (e) => {
        this.renderer.zBufferEnabled = e.target.checked;
        this.renderer.render();
      });
    }

    // Tipo de iluminação
    const lightingType = document.getElementById("lightingType");
    if (lightingType) {
      lightingType.addEventListener("change", (e) => {
        this.renderer.setLightingType(e.target.value);
      });
    }

    // Cor do modelo
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

    switch (projectionType) {
      case "frontView":
        this.renderer.transformMatrix = Matrix.identity();
        this.renderer.projectionMatrix = Matrix.orthographicFront();
        break;
      case "topView":
        this.renderer.transformMatrix = Matrix.identity();
        this.renderer.projectionMatrix = Matrix.orthographicTop();
        break;
      case "sideView":
        this.renderer.transformMatrix = Matrix.identity();
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

        const translateBackCorrectly = Matrix.identity();
        translateBackCorrectly[11] = -3;
        this.renderer.transformMatrix = translateBackCorrectly;
        break;
      case "cavalier":
        this.renderer.transformMatrix = Matrix.identity();
        this.renderer.projectionMatrix = Matrix.obliqueCavalier();
        break;
      case "cabinet":
        this.renderer.transformMatrix = Matrix.identity();
        this.renderer.projectionMatrix = Matrix.obliqueCabinet();
        break;
      default:
        this.renderer.transformMatrix = Matrix.identity();
        this.renderer.projectionMatrix = Matrix.identity(); // Nenhuma projeção específica
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
    this.renderer.modelData = null;
    this.renderer.transformMatrix = Matrix.identity();
    this.renderer.projectionMatrix = Matrix.identity();
    this.currentProjection = "none";

    // Limpa o canvas principal
    this.renderer.ctx.clearRect(
      0,
      0,
      this.renderer.width,
      this.renderer.height
    );

    // Limpa o canvas do solzinho (indicador de luz)
    if (this.renderer.solzinhoCanvas) {
      const solCtx = this.renderer.solzinhoCanvas.getContext("2d");
      solCtx.clearRect(
        0,
        0,
        this.renderer.solzinhoCanvas.width,
        this.renderer.solzinhoCanvas.height
      );
    }

    // Opcional: Limpar buffers
    if (this.renderer.pixelBuffer) this.renderer.pixelBuffer.fill(0);
    if (this.renderer.zBuffer)
      this.renderer.zBuffer.fill(Number.POSITIVE_INFINITY);

    // Atualize a tela para mostrar "vazio"
    this.renderer.render();
  }

  _handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    this._showLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const modelData = this.parser.parse(content);

        this.currentModel = {
          name: file.name,
          data: modelData,
          fileSize: file.size,
        };

        this.renderer.loadModel(modelData);
        this.renderer.render();

        this._setProjection("frontView");
      } catch (error) {
        console.error("Erro ao carregar o arquivo OBJ:", error);
        alert(
          "Erro ao carregar o arquivo OBJ. Verifique se o arquivo está no formato correto."
        );
      } finally {
        this._showLoading(false);
      }
    };

    reader.onerror = () => {
      alert("Erro ao ler o arquivo.");
      this._showLoading(false);
    };

    reader.readAsText(file);
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

// Inicializar a aplicação quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  window.app = new App();
});