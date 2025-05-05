/**
 * Aplicação principal - Visualizador 3D
 */
class App {
  constructor() {
    // Elementos da interface
    this.canvas = document.getElementById("glCanvas");
    this.fileInput = document.getElementById("fileInput");
    this.modelInfo = document.getElementById("modelInfo");
    this.loadingIndicator = document.getElementById("loadingIndicator");
    this.transformInfo = document.getElementById("transformInfo");
    this.fovSlider = document.getElementById("fovSlider");
    this.fovValue = document.getElementById("fovValue");

    // Estado da aplicação
    this.currentModel = null;
    this.isLoading = false;
    this.currentProjection = "none"; // Para rastrear a projeção atual

    // Inicializar componentes
    this.renderer = new Renderer(this.canvas);
    this.parser = new OBJParser();

    // Inicializar eventos
    this._initEvents();

    // Ajustar tamanho inicial do canvas
    this._resizeCanvas();
    window.addEventListener("resize", () => this._resizeCanvas());

    // Mensagem inicial
    this._showWelcomeMessage();
  }

  /**
   * Inicializa os eventos da aplicação
   * @private
   */
  _initEvents() {
    // Carregar arquivo OBJ
    this.fileInput.addEventListener("change", (e) => this._handleFileSelect(e));

    // Botão de reset
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this._resetTransformations());
    }

    // Botão de limpar (renomeado de resetViewBtn para clearBtn)
    const clearBtn = document.getElementById("clearBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => this._clearModel());
    }

    // Eventos de projeção ortográfica
    const frontView = document.getElementById("frontView");
    const topView = document.getElementById("topView");
    const sideView = document.getElementById("sideView");
    
    if (frontView) {
      frontView.addEventListener("click", () => this._setProjection("frontView"));
    }
    
    if (topView) {
      topView.addEventListener("click", () => this._setProjection("topView"));
    }
    
    if (sideView) {
      sideView.addEventListener("click", () => this._setProjection("sideView"));
    }
    
    // Eventos de projeção perspectiva
    const perspectiveView = document.getElementById("perspectiveView");
    if (perspectiveView) {
      perspectiveView.addEventListener("click", () => this._setProjection("perspective"));
    }
    
    // Slider de FOV (Field of View)
    if (this.fovSlider) {
      this.fovSlider.addEventListener("input", () => {
        const fov = this.fovSlider.value;
        this.fovValue.textContent = `${fov}°`;
        
        if (this.currentProjection === "perspective") {
          this._setProjection("perspective");
        }
      });
    }
    
    // Eventos de projeção oblíqua
    const cavalierView = document.getElementById("cavalierView");
    const cabinetView = document.getElementById("cabinetView");
    
    if (cavalierView) {
      cavalierView.addEventListener("click", () => this._setProjection("cavalier"));
    }
    
    if (cabinetView) {
      cabinetView.addEventListener("click", () => this._setProjection("cabinet"));
    }

    // Gerenciamento do modal de instruções
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

      // Fechar modal ao clicar fora dele
      window.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.classList.add("hidden");
        }
      });

      // Fechar modal com a tecla ESC
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !modal.classList.contains("hidden")) {
          modal.classList.add("hidden");
        }
      });
    }
  }

  /**
   * Define a projeção atual
   * @param {string} projectionType - Tipo de projeção a ser aplicada
   * @private
   */
  _setProjection(projectionType) {
    if (!this.currentModel) return;
    
    this.currentProjection = projectionType;
    
    // Resetar a matriz de transformação no renderer
    this.renderer.transformMatrix = Matrix.identity();
    
    // Aplicar projeção específica
    switch (projectionType) {
      case "frontView":
        // Vista frontal (XY) - Sem alteração no eixo Z
        this.renderer.projectionMatrix = Matrix.orthographicFront();
        break;
        
      case "topView":
        // Vista superior (XZ) - Rotacionar em X para olhar de cima
        this.renderer.projectionMatrix = Matrix.orthographicTop();
        break;
        
      case "sideView":
        // Vista lateral (YZ) - Rotacionar em Y para olhar da lateral
        this.renderer.projectionMatrix = Matrix.orthographicSide();
        break;
        
      case "perspective":
        // Projeção de perspectiva com 1 ponto de fuga
        const fov = this.fovSlider ? parseFloat(this.fovSlider.value) : 60;
        this.renderer.projectionMatrix = Matrix.perspective(fov * Math.PI / 180, 
                                                           this.canvas.width / this.canvas.height, 
                                                           0.1, 100);
        
        // Ajustar a posição para a perspectiva
        const translateBack = Matrix.translation(0, 0, -3);
        this.renderer.transformMatrix = translateBack;
        break;
        
      case "cavalier":
        // Projeção cavaleira (ângulo de 45° com fator de redução 1)
        this.renderer.projectionMatrix = Matrix.obliqueCavalier();
        break;
        
      case "cabinet":
        // Projeção cabinet (ângulo de 45° com fator de redução 0.5)
        this.renderer.projectionMatrix = Matrix.obliqueCabinet();
        break;
        
      default:
        // Retornar à projeção padrão (não modificada)
        this.renderer.projectionMatrix = Matrix.identity();
        break;
    }
    
    // Renderizar novamente com a nova projeção
    this.renderer.render();
    
    // Atualizar interface para refletir a projeção atual
    this._updateProjectionInfo(projectionType);
  }
  
  /**
   * Atualiza a informação de projeção na interface
   * @param {string} projectionType - Tipo de projeção atual
   * @private
   */
  _updateProjectionInfo(projectionType) {
    // Remover classe 'active' de todos os botões de projeção
    const buttons = document.querySelectorAll('.btn-projection');
    buttons.forEach(button => {
      button.classList.remove('active');
    });
    
    // Adicionar classe 'active' ao botão da projeção atual
    let activeButtonId = '';
    
    switch (projectionType) {
      case "frontView": activeButtonId = "frontView"; break;
      case "topView": activeButtonId = "topView"; break;
      case "sideView": activeButtonId = "sideView"; break;
      case "perspective": activeButtonId = "perspectiveView"; break;
      case "cavalier": activeButtonId = "cavalierView"; break;
      case "cabinet": activeButtonId = "cabinetView"; break;
    }
    
    if (activeButtonId) {
      const activeButton = document.getElementById(activeButtonId);
      if (activeButton) {
        activeButton.classList.add('active');
      }
    }
  }

  /**
   * Reseta as transformações para o estado inicial
   * @private
   */
  _resetTransformations() {
    if (!this.currentModel) return;

    // Resetar a matriz de transformação no renderer
    this.renderer.transformMatrix = Matrix.identity();
    this.renderer.projectionMatrix = Matrix.identity();
    this.currentProjection = "none";
    
    // Atualizar interface
    this._updateProjectionInfo("");

    // Renderizar novamente
    this.renderer.render();
  }

  /**
   * Limpa o modelo atual da tela
   * @private
   */
  _clearModel() {
    if (!this.currentModel) return;

    // Limpar referências do modelo
    this.currentModel = null;

    // Limpar buffers no renderer
    if (this.renderer.buffers.vertex) {
      this.renderer.gl.deleteBuffer(this.renderer.buffers.vertex);
    }
    if (this.renderer.buffers.index) {
      this.renderer.gl.deleteBuffer(this.renderer.buffers.index);
    }

    this.renderer.buffers = {};
    this.renderer.modelData = null;
    this.renderer.indexCount = 0;
    
    // Resetar matrizes
    this.renderer.transformMatrix = Matrix.identity();
    this.renderer.projectionMatrix = Matrix.identity();
    this.currentProjection = "none";

    // Limpar o canvas
    this.renderer.gl.clear(
      this.renderer.gl.COLOR_BUFFER_BIT | this.renderer.gl.DEPTH_BUFFER_BIT
    );

    // Atualizar a interface para mostrar que não há modelo
    this._showWelcomeMessage();
  }

  /**
   * Manipula a seleção de um arquivo OBJ
   * @private
   */
  _handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Mostrar indicador de carregamento
    this._showLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Analisar o arquivo OBJ
        const content = e.target.result;
        console.log(
          `Iniciando análise do arquivo: ${file.name} (${(
            file.size / 1024
          ).toFixed(2)} KB)`
        );

        const startTime = performance.now();
        const modelData = this.parser.parse(content);
        const endTime = performance.now();

        console.log(
          `Arquivo analisado em ${(endTime - startTime).toFixed(2)}ms`
        );

        // Armazenar modelo atual
        this.currentModel = {
          name: file.name,
          data: modelData,
          fileSize: file.size,
        };

        // Carregar o modelo no renderer
        this.renderer.loadModel(modelData);

        // Atualizar informações do modelo
        this._updateModelInfo();

        // Renderizar o modelo
        this.renderer.render();
      } catch (error) {
        console.error("Erro ao carregar o modelo:", error);
        alert(
          "Erro ao carregar o arquivo OBJ. Verifique se o formato é válido."
        );
        this._updateStatusMessage("Erro ao carregar o modelo");
      } finally {
        // Ocultar indicador de carregamento
        this._showLoading(false);
      }
    };

    reader.onerror = () => {
      alert("Erro ao ler o arquivo.");
      this._showLoading(false);
      this._updateStatusMessage("Erro ao ler o arquivo");
    };

    // Atualizar status
    this._updateStatusMessage(`Carregando ${file.name}...`);
    reader.readAsText(file);
  }

  /**
   * Atualiza as informações do modelo na interface
   * @private
   */
  _updateModelInfo() {
    if (!this.modelInfo || !this.currentModel) return;

    const metadata = this.parser.getMetadata();
    const model = this.currentModel;

    let html = "<h3>Informações do Modelo</h3>";

    // Status do modelo
    html += `<div class="info-row">
                  <span class="info-label">Status:</span>
                  <span class="info-value">Carregado</span>
              </div>`;

    // Nome do arquivo
    html += `<div class="info-row">
                  <span class="info-label">Arquivo:</span>
                  <span class="info-value">${model.name}</span>
              </div>`;

    // Tamanho do arquivo
    html += `<div class="info-row">
                  <span class="info-label">Tamanho:</span>
                  <span class="info-value">${(model.fileSize / 1024).toFixed(
                    2
                  )} KB</span>
              </div>`;

    // Estatísticas de vértices e faces
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

    // Dimensões
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

  /**
   * Atualiza a mensagem de status
   * @private
   */
  _updateStatusMessage(message) {
    const statusEl = this.modelInfo.querySelector(".info-value");
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  /**
   * Mostra a mensagem de boas-vindas inicial
   * @private
   */
  _showWelcomeMessage() {
    if (!this.modelInfo) return;

    let html = "<h3>Informações do Modelo</h3>";

    html += `<div class="info-row">
                  <span class="info-label">Status:</span>
                  <span class="info-value">Nenhum modelo carregado</span>
              </div>`;

    this.modelInfo.innerHTML = html;
  }

  /**
   * Mostra ou oculta o indicador de carregamento
   * @private
   */
  _showLoading(show) {
    this.isLoading = show;

    if (this.loadingIndicator) {
      this.loadingIndicator.classList.toggle("hidden", !show);
    }
  }

  /**
   * Ajusta o tamanho do canvas para ocupar seu container
   * @private
   */
  _resizeCanvas() {
    if (!this.canvas) return;

    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;

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