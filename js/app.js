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

    // Estado da aplicação
    this.currentModel = null;
    this.isLoading = false;

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

    // Eventos futuros serão adicionados aqui
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
