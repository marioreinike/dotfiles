# Guía del template PPTX Vambe 2026

Template: `assets/Plantilla-PPT-Vambe-2026.pptx`
Formato: 10 × 5.62 in (16:9). Fuente: Plus Jakarta Sans. ~47 slides.
Incluye, entre otros, un slide **"Otro formato de comparación"** (números por columna) y uno de
**"título con una palabra destacada"** que muestra el énfasis correcto (Plus Jakarta celeste/itálica).

⚠️ **Los números de slide de esta guía son ILUSTRATIVOS.** El template se actualiza y los índices
cambian. **Siempre** corre `vb.describe(prs)` primero y trabaja con los índices reales que veas, no
con los de los ejemplos.
Las formas son shapes directos (no placeholders) → se editan por **índice posicional** con `python-pptx`.

> ⚠️ Los índices de shapes son posicionales y cambian si clonas o borras slides.
> **Siempre** corre `vb.describe(prs, idx)` para confirmar índices antes de reemplazar texto.

---

## Calidad de diseño — apunta al nivel del template, no menos

El template oficial YA es de nivel premium (claro y aireado, con sólo divisores oscuros, números
hero gigantes, un acento ámbar para Ads). Tu trabajo es **preservar ese nivel**, no rellenar. Si el
deck final se ve más denso u oscuro que el template, lo estás degradando. Principios:

- **Una idea por slide.** Un titular fuerte + un dato/visual que lo respalde. No metas 3 tablas en un slide.
- **Aire generoso.** Respeta el espacio en blanco de los layouts; no agregues cajas para "llenar".
- **Ritmo claro/oscuro.** El cuerpo luce mejor mayormente claro, con lo oscuro para portada, divisores, algún slide de impacto y el cierre. Si notas que el deck se está yendo a puro navy, alterna hacia claro. El template ya viene balanceado así, así que clonando sus layouts el ritmo sale solo.
- **Números protagonistas.** Para impacto usa el layout de cifra hero ("El impacto, en una cifra": `3.2x` gigante), no una lista de bullets.
- **Elige el layout correcto** del catálogo para cada contenido en vez de forzar uno; el template tiene divisores, cifra hero, dos-columnas, equipo, etapas, etc.
- **Slides con personas/fotos** (equipo, "personas detrás", quiénes somos, testimonial): suman calidez y equilibran un deck si no queda demasiado data/texto. Úsalos cuando el contenido lo pida; si no tienes fotos del cliente, hay genéricas en `assets/fotos-personas/` (ver Imágenes).
- **Contenido verbatim**, pero la cantidad de slides la define el contenido (clona layouts para repetir secciones/contenidos).

## Tipografía — destacar sin Authentic

El template usa la fuente **Authentic** (script) en algunos títulos (portada "impulsa", etc.).
**NO la uses.** Reemplaza esas palabras por **Plus Jakarta Sans en celeste (`#5A8CF6`/`#437AEF`) y/o
itálica** — mismo énfasis humano, coherente con el resto del texto. Todo el resto en Plus Jakarta normal.

## Cómo armar una presentación (flujo)

1. Pregunta al usuario: objetivo, audiencia, nº de secciones, el contenido real (cifras, casos, copy)
   y **si tiene fotos del equipo/cliente** (para no descartar los slides de personas por falta de fotos).
2. Elige del catálogo los slides que necesitas. Patrón corto típico:
   **portada → agenda → sección → contenido → métricas/impacto → cierre → slides de elementos (íconos/logos/UI)**.
   El cierre y los slides de elementos van **siempre** al final (ver "Cierre + slides de elementos").
3. Usa los helpers de `scripts/pptx_helpers.py`:
   - `keep_only(prs, [..])` para quedarte con un subconjunto. **Incluye en la lista el cierre y los índices de los slides de elementos del final** para que no se eliminen.
   - `clone_slide(prs, i)` + `move_slide(...)` para **repetir** un layout (varias secciones, varios contenidos).
   - `set_text(slide, idx, "...")` y `set_paragraphs(slide, idx, [...])` para el texto.
4. Reemplaza imágenes placeholder por las del usuario (ver "Imágenes" abajo).
5. Guarda y entrega el `.pptx`. Para previsualizar como imágenes, renderiza con LibreOffice (ver final).

```python
from pptx import Presentation
import sys; sys.path.insert(0, "scripts")
import pptx_helpers as vb

prs = Presentation("assets/Plantilla-PPT-Vambe-2026.pptx")
# índices ILUSTRATIVOS — confirma con describe() primero.
# Incluye el cierre y los slides de elementos del final para conservarlos:
vb.keep_only(prs, [0, 1, 2, 5, 21, 34, 40, 41, 42, 43, 44, 45, 46])
vb.describe(prs)              # confirmar índices ya reordenados
vb.set_text(prs.slides[0], 2, "Propuesta para Cliente X")
prs.save("presentacion-cliente-x.pptx")
```

---

## Catálogo de slides (índices 0–34 = usables)

Se listan los shapes de texto editables más importantes. Para el resto, usa `describe()`.

| idx | Tipo | Shapes de texto clave |
|----:|------|------------------------|
| **0** | **Portada** | 1 eyebrow · 2 título · 3 subtítulo · 5 nombre · 7 cargo · 9 fecha |
| **1** | **Agenda** (hasta 6 ítems) | 0 "AGENDA" · 1 título · ítems: (3,4,5)(7,8,9)(11,12,13)(15,16,17)(18,19,20)(21,22,23) = (nº, título, desc) |
| **2** | **Separador de sección** (light) | 0 número grande · 2 "SECCIÓN 01" · 3 título · 4 bajada |
| **3** | **Contenido + 4 puntos** | 0 eyebrow · 1 título · 2 intro · 4 label · pares (5,6)(7,8)(9,10)(11,12)=(punto, desc) |
| **4** | **Texto + visual (chat)** | 3 eyebrow · 4 título · 5 texto · 7 pill CTA · burbujas 13,15,17 |
| **5** | **En números** (1 cifra + 3 KPIs) | 3 eyebrow · 4 título · 5 cifra grande · 6 desc · KPIs (8,9)(11,12)(13,14) |
| **6** | **Antes y después** | 1 título · "SIN VAMBE" 5,7,9,11 · "CON VAMBE" 14,15,16,17 |
| **7** | **Quote / testimonio** (light) | 2 cita · 3 nombre · 4 cargo·empresa |
| **8** | **Casos de éxito** (grid 8 logos) | 1 título · logos = shapes "Logo" (3,5,7,9,11,13,15,17) |
| **9** | **Equipo** (3 personas + foto) | 5 título · personas (7,8,9)(11,12,13)(15,16,17)=(nombre, cargo, línea) |
| **10** | **Cómo funciona** (4 pasos, dark) | 5 título · pasos (8,9,10)(12,13,14)(16,17,18)(20,21,22)=(PASO, título, desc) |
| **11** | **Implementación** (4 etapas) | 1 título · etapas (3,4,5,7)(9,10,11,13)(15,16,17,19)(21,22,23,25)=(nº,título,desc,tiempo) |
| **12** | **Roadmap** (Q1–Q4) | 1 título · trimestres 4,6,8,10 · hitos 12,16,20,25 · etiquetas 14,18,22,27 |
| **13** | **Comparación / Planes** (tabla) | 1 título · planes 5,8,10 · filas: usa `describe()` (tabla densa) |
| **14** | **Metodología** (3 bloques) | 1 título · bloques (5,6)(10,11)(15,16)=(nombre, desc) |
| **15** | **Producto** (mockup celular) | 2 título · 3 texto · features 5,7 · chat 12,14,16,18 |
| **16** | **Plataforma** (dashboard) | 3 título · KPIs 23,26,29 · actividad 34,37,40 |
| **17** | **Hero dark + métricas** | 2 eyebrow · 3 título (palabra clave) · 4 subtítulo · cifras 6,8,10 |
| **18** | **Nuestra historia** (timeline 5 hitos) | 1 título · hitos (4,5,6)(8,9,10)(12,13,14)(16,17,18)(20,21,22) |
| **19** | **El contexto** (3 datos + insight, dark) | 1 título · datos (3,4,5)(7,8,9)(11,12,13) · insight 15,16 |
| **20** | **El problema** (3 dolores, dark) | 1 título · dolores (3,4,5,7)(9,10,11,13)(15,16,17,19) |
| **21** | **Impacto en métricas** (6 KPIs, dark) | 2 título · KPIs (4,5)(7,8)(10,11)(13,14)(16,17)(19,20) |
| **22** | **Quiénes confían** (4 industrias) | 1 título · industrias (4,5)(11,12)(18,19)(25,26)=(nombre, caso) |
| **23** | **Caso de uso industria** (proceso + resultados) | 1 título · pasos 6,9,12,15 · resultados 18,21,24 |
| **24** | **Por qué Vambe** (4 razones) | 1 título · razones (4,5)(8,9)(12,13)(16,17) |
| **25** | **Foto full + texto** | 2 eyebrow · 3 título · 4 frase |
| **26** | **Productividad** (foto + 3 puntos) | 2 título · 3 texto · puntos 5,7,9 |
| **27** | **Quote sobre foto** | 3 cita · 6 nombre · 7 cargo |
| **28** | **Experiencia** (foto + chat) | 3 título · 4 texto · burbuja 10 |
| **29** | **Conexión** (foto, dark) | 4 título · 5 texto · atributos 8,11,14 |
| **30** | **Atributo + foto persona** | 4 nombre · 5 cargo · atributos (7,8)(10,11)(13,14) |
| **31** | **Nuestro equipo** (foto grande + áreas) | 2 título · 3 texto · áreas 6,8,10 |
| **32** | **Quiénes somos** (foto + dato) | 1 título · 2 texto · 5 dato/cita |
| **33** | **Caso de uso** (3 problemas) | 3 título · problemas (5,6,8)(9,10,12)(13,14,16) |
| **34** | **Cierre** | 5 "CONVERSEMOS" · 6 vambe.ai · 8 hola@vambe.ai |

### Cierre + slides de elementos (siempre incluirlos al final)
- **Cierre:** incluye **siempre** el slide de cierre ("CONVERSEMOS / vambe.ai / contacto") al terminar la narrativa del deck.
- **Después del cierre, deja los slides de elementos** (kit de iconografía Lucide por categoría, lockups de logo, y elementos de UI: flechas, check, x). **No los borres** — quedan al final del deck a propósito, por si el usuario quiere agregar o modificar algún logo o ícono.

Orden final del deck: `… contenido → cierre → slides de elementos (íconos / logos / UI)`.
No uses estos slides de elementos como slides de contenido dentro de la narrativa; son un banco de referencia al final.

---

## Imágenes (fotos, logos de clientes)

Muchos slides traen fotos/placeholders. Para reemplazar la imagen de un shape PICTURE
conservando su posición y recorte, reemplaza el blob de la relación:

```python
slide = prs.slides[i]
pic = slide.shapes[idx]          # shape tipo PICTURE (mira describe() para el índice)
left, top, w, h = pic.left, pic.top, pic.width, pic.height
sp = pic._element; sp.getparent().remove(sp)                    # borra la imagen vieja
slide.shapes.add_picture("foto_cliente.jpg", left, top, w, h)   # misma caja y tamaño
```

Los slides con personas (equipo, "personas detrás", quiénes somos, testimonial) suman calidez y
funcionan bien cuando el contenido lo pide. Si usas uno y no tienes la foto del cliente, opciones a
mano (de la más a la menos ideal): fotos que aporte el usuario → las genéricas de
`assets/fotos-personas/` (escenas on-brand) → los placeholders del template. Todas válidas; si la foto
es genérica o placeholder, avisa que se puede reemplazar. La idea es simple: tener de dónde sacar una
foto para que un buen slide de personas no se descarte solo por eso.

Logos de clientes (slide de logos): van en los recuadros blancos "Logo".

---

## Colores ya presentes en el template
El template usa los tokens correctos: azul `#437AEF`, dark `#0A1C43`, slate `#E2E8F0`/`#334155`,
y aparecen acentos puntuales (amber `#FF6900`, violeta `#C58CFA`) en el roadmap. No hace falta
recolorear nada para que quede on-brand — respeta los fills existentes al editar.

---

## Previsualizar el resultado (render a imágenes)
```bash
libreoffice --headless --convert-to pdf --outdir . presentacion.pptx
python3 -c "import fitz; d=fitz.open('presentacion.pdf'); [d[i].get_pixmap(matrix=fitz.Matrix(1,1)).save(f'p{i}.png') for i in range(len(d))]"
```
Revisa los PNG para confirmar que no hay texto desbordado ni cajas vacías antes de entregar.

## Dependencias
```bash
pip install python-pptx --break-system-packages
# para previsualizar: libreoffice + pymupdf (fitz)
```
