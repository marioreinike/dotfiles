# Guía del Template PPTX de Vambe

Template base: `assets/Vambe Presentation Template.pptx`

Formato: 10.00 x 5.62 pulgadas (widescreen). Layout único: "DEFAULT". Todas las formas son shapes directos (no placeholders).

## Tipos de slide disponibles

| Slide | Tipo | Shapes clave | Descripción |
|-------|------|-------------|-------------|
| 1 | **Portada** | [3] título, [4] subtítulo, [7] "Confidencial" | Logo + decoración geométrica azul |
| 2 | **Agenda** | [0] "Agenda", [4-5] item 1, [8-9] item 2, [12-13] item 3, [16-17] item 4, [20-21] item 5, [25-26] item 6 | Hasta 6 ítems con círculos numerados primary |
| 3, 11, 19 | **Separador de sección** | [2] número grande, [4] nombre sección, [5] descripción | Fondo primary/gradiente |
| 4 | **Contenido + puntos clave** | [0] título, [3] subtítulo, [4] texto (2 párrafos), [7] label puntos, [8] lista (4 párrafos) | Texto izquierda + card oscura derecha |
| 5 | **Dos columnas** | [0] título, [4] header col A, [5] texto A (3 párrafos), [8] header col B, [9] texto B (3 párrafos) | Pills primary como headers |
| 6 | **Contenido con bloque** | [0] título, [2] subtítulo bloque, [3] texto | Bloque de texto con subtítulo |
| 7 | **Sub-sección** | Texto centrado sobre fondo claro | Transición dentro de una sección |
| 8 | **Tres pilares** | [0] título, [4] pilar 1, [7] desc 1, [10] pilar 2, [13] desc 2, [16] pilar 3, [19] desc 3 | 3 columnas con ícono decorativo |
| 9 | **Tabla** | Header row primary + filas alternas | Tabla con estilo corporativo |
| 10 | **Métricas/KPIs** | [0] título, [4] cifra 1, [5] label 1, [6] complemento 1, [9] cifra 2, [10] label 2, [11] comp 2, [14] cifra 3, [15] label 3, [16] comp 3, [17] fuente | 3 métricas grandes |
| 12 | **Comparativa** | Dos secciones lado a lado | Antes/después |
| 13 | **Timeline** | Pasos horizontales conectados | Proceso lineal |
| 14 | **Imagen full** | Imagen grande + caption | Showcase visual |
| 15 | **Dos imágenes** | Layout galería | Comparación visual |
| 16 | **Foto con overlay** | Imagen fondo + texto encima | Impacto visual |
| 17 | **Tabla de datos** | Tabla compleja multicolumna | Data detallada |
| 18 | **Grid detallado** | Muchas cards en grid | Información densa |
| 20 | **Calendario** | Vista mensual | Planning |
| 21 | **Dashboard** | Widgets/gráficos | Vista de métricas |
| 22 | **Timeline mensual** | Gantt simplificado | Roadmap |
| 23 | **Diagrama de flujo** | Proceso con flechas | Arquitectura/flujo |
| 24 | **Quote/Cita** | [1] comilla apertura, [2] texto cita, [3] comilla cierre | Texto grande centrado |
| 25 | **Cierre** | [3] "vambe.ai", [5] "Confidencial", [6] "¡Gracias!" | Logo + despedida |
| 26–29 | Kit de assets | Iconografía Lucide | NO usar en presentaciones |

## Cómo crear una presentación desde el template

```python
from pptx import Presentation

# Cargar template
tmpl = Presentation('assets/Vambe Presentation Template.pptx')

# Los slides se acceden por índice (0-based)
slides = list(tmpl.slides)

# Para reemplazar texto preservando formato:
def replace_text(slide, shape_idx, new_text):
    shape = slide.shapes[shape_idx]
    for para in shape.text_frame.paragraphs:
        for run in para.runs:
            run.text = ""
    if shape.text_frame.paragraphs[0].runs:
        shape.text_frame.paragraphs[0].runs[0].text = new_text

# Para shapes con múltiples párrafos (listas, bullets):
def replace_paragraphs(slide, shape_idx, texts):
    shape = slide.shapes[shape_idx]
    for i, para in enumerate(shape.text_frame.paragraphs):
        for run in para.runs:
            run.text = ""
        if i < len(texts) and para.runs:
            para.runs[0].text = texts[i]
```

## Cómo eliminar slides no deseados

```python
# Eliminar slides por índice (en orden inverso para no desplazar índices)
delete_indices = sorted([i for i in range(len(tmpl.slides)) if i not in keep], reverse=True)
for idx in delete_indices:
    rId = tmpl.slides._sldIdLst[idx].get(
        '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
    )
    tmpl.part.drop_rel(rId)
    tmpl.slides._sldIdLst.remove(tmpl.slides._sldIdLst[idx])
```

## Recomendaciones

- Siempre incluir slide 1 (portada) y 25 (cierre).
- Para presentaciones cortas (< 10 slides), usar: portada → agenda → 1-2 separadores → contenido → cierre.
- Las decoraciones geométricas ya están en el template — no necesitas recrearlas.
- El template usa formas, no placeholders estándar de PowerPoint, así que accede por `slide.shapes[idx]`.
