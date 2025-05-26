# 3D OBJ Viewer - Computação Gráfica

Um visualizador 3D interativo implementado do zero usando Canvas 2D para renderização de modelos OBJ com recursos avançados de computação gráfica.

## 🚀 Funcionalidades

### Carregamento e Renderização
- **Carregamento de Modelos OBJ**: Parser completo para arquivos .obj
- **Renderização por Software**: Pipeline gráfico implementado do zero usando Canvas 2D
- **Z-Buffer**: Teste de profundidade para renderização correta
- **Backface Culling**: Remoção automática de faces ocultas

### Transformações Interativas
- **Rotação**: Livre, por eixo (X, Y, Z) ou restrita
- **Translação**: XY livre ou por eixo Z
- **Escala**: Uniforme ou por eixo específico
- **Controles de Mouse**: Intuitivos e responsivos

### Tipos de Projeção
- **Ortográficas**: Frontal (XY), Superior (XZ), Lateral (YZ)
- **Perspectiva**: 1 ponto de fuga com FOV ajustável (30°-120°)
- **Oblíquas**: Cavaleira e Cabinet

### Sistema de Iluminação Avançado
- **Tipos de Shading**:
  - **Flat Shading**: Cor uniforme por face
  - **Gouraud Shading**: Interpolação de cores nos vértices
  - **Phong Shading**: Interpolação de normais (alta qualidade)
- **Controle de Luz**:
  - Posicionamento interativo (tecla L + mouse)
  - Luz fixa ou que segue o objeto
  - Brilho especular configurável (N = 1-256)
  - Indicador visual da posição da luz

### Visualização Flexível
- **Wireframe**: Visualização das arestas do modelo
- **Faces Preenchidas**: Com ou sem iluminação
- **Cores Personalizáveis**: Seletor de cor para o modelo
- **Eixos de Coordenadas**: Referência visual opcional

## 📋 Controles

### Mouse
- **Botão Esquerdo**: Rotação (Z por padrão)
- **Botão Esquerdo + Ctrl**: Rotação livre (X e Y)
- **Botão Esquerdo + X/Y**: Rotação no eixo específico
- **Botão Direito**: Translação XY
- **Botão Direito + Z**: Translação no eixo Z
- **Scroll**: Escala uniforme
- **Scroll + X/Y/Z**: Escala no eixo específico

### Teclado
- **L + Mouse**: Posicionar luz
- **L + Scroll**: Mover luz no eixo Z
- **X/Y/Z**: Restringir transformações ao eixo

## 🛠️ Tecnologias

- **HTML5 Canvas 2D**: Para renderização pixel-por-pixel
- **JavaScript ES6+**: Orientado a objetos
- **Algoritmos de Computação Gráfica**: Implementados do zero
- **CSS3**: Interface moderna e responsiva
- **Material Design Icons**: Ícones da interface

## 📦 Estrutura do Projeto

```
3d-obj-viewer/
├── index.html           # Interface principal
├── styles.css           # Estilos da aplicação
├── js/
│   ├── app.js           # Gerenciador da aplicação
│   ├── objParser.js     # Parser de arquivos OBJ
│   ├── renderer.js      # Motor de renderização
│   └── matrix.js        # Operações matriciais 4x4
└── README.md           # Documentação
```

## 🔧 Como Usar

1. **Instalação**: Não requer instalação - funciona direto no navegador
2. **Carregamento**: Clique em "Carregar Modelo OBJ" e selecione um arquivo .obj
3. **Navegação**: Use o mouse para rotacionar, transladar e escalar
4. **Projeções**: Experimente diferentes tipos de projeção
5. **Iluminação**: Ative a iluminação e experimente os diferentes tipos de shading

## 🧠 Conceitos de Computação Gráfica Implementados

### Pipeline Gráfico Completo
- **Espaço do Objeto → Mundo → Câmera → Clipping → Tela**
- **Transformações Matriciais 4x4**: Todas as operações
- **Coordenadas Homogêneas**: Para projeções perspectivas

### Algoritmos de Renderização
- **Scanline**: Preenchimento de triângulos
- **Algoritmo de Bresenham**: Rasterização de linhas
- **Z-Buffer**: Teste de profundidade por pixel
- **Coordenadas Baricêntricas**: Interpolação em triângulos

### Tipos de Projeção Matemática
- **Ortográfica**: Paralela, sem distorção de profundidade
- **Perspectiva**: Com divisão perspectiva (w-divide)
- **Oblíqua**: Cavaleira (fator 1.0) e Cabinet (fator 0.5)

### Modelos de Iluminação
- **Modelo de Phong**: Ambient + Diffuse + Specular
- **Cálculo de Normais**: Por face e por vértice
- **Reflexão Especular**: Com expoente N configurável

### Otimizações
- **Backface Culling**: Baseado em orientação da normal
- **Frustum Clipping**: Básico para coordenadas de tela
- **Painter's Algorithm**: Ordenação por profundidade

## 🎯 Características Técnicas

- **Renderização**: 100% por software (sem WebGL)
- **Precisão**: Matemática de ponto flutuante
- **Performance**: Otimizada para modelos de média complexidade
- **Compatibilidade**: Funciona em qualquer navegador moderno
