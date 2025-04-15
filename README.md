# WebGL 3D Viewer

Um visualizador 3D interativo baseado em WebGL para modelos OBJ com recursos de transformação, texturização e manipulação interativa.

## 🚀 Funcionalidades

- **Carregamento de Modelos**: Suporte a arquivos no formato OBJ
- **Visualização 3D**: Renderização em tempo real usando WebGL
- **Informações do Modelo**: Visualização de estatísticas como número de vértices, faces e normais
- **Transformações**: Rotação, translação e escala dos modelos
- **Interação**: Manipulação do modelo com o mouse
- **Texturização**: Suporte para aplicação de texturas nos modelos
- **Perspectivas**: Alternância entre diferentes tipos de projeção

## 📋 Requisitos

- Navegador com suporte a WebGL (Chrome, Firefox, Safari, Edge)
- Não é necessária nenhuma instalação adicional

## 🛠️ Tecnologias

- HTML5, CSS3, JavaScript
- WebGL para renderização 3D
- Algoritmos de computação gráfica implementados do zero

## 📦 Estrutura do Projeto

```
webgl-3d-viewer/
├── index.html           # Página principal
├── styles.css           # Estilos da aplicação
├── js/
│   ├── app.js           # Classe principal da aplicação
│   ├── objParser.js     # Parser para arquivos OBJ
│   ├── renderer.js      # Motor de renderização WebGL
│   └── matrix.js        # Operações matriciais
└── models/              # Modelos de exemplo
```

## 🔧 Como Usar

1. Clone este repositório ou faça o download dos arquivos
2. Abra o arquivo `index.html` em seu navegador
3. Clique em "Carregar Modelo OBJ" e selecione um arquivo no formato .obj

## 🧠 Conceitos de Computação Gráfica Implementados

- Transformações afins (rotação, translação, escala)
- Pipeline gráfico completo (vértices → geometria → rasterização)
- Projeção de perspectiva e ortográfica
- Iluminação e sombreamento
- Mapeamento de textura
- Normais de faces e vértices
