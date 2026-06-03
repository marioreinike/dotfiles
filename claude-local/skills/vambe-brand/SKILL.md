---
name: vambe-brand
description: >
  Genera piezas on-brand de Vambe: onepagers, fichas de producto, posts de Instagram,
  infografías, casos de éxito, carruseles, banners de LinkedIn, documentos descargables
  y presentaciones (PPTX) — cualquier material visual de marca. Usa este skill siempre que
  el usuario pida crear o mejorar una pieza de diseño de Vambe, aunque no mencione explícitamente
  el skill — frases como "hazme un post", "necesito un onepager para cliente X",
  "arma una infografía con estas cifras", "genera el caso de éxito de [empresa]",
  "quiero un carrusel sobre [tema]", "arma una presentación", "hazme un deck" o
  "crea material de marca" deben activarlo. Las piezas gráficas se producen como HTML autónomo
  con fuentes embebidas, listo para exportar a PDF o PNG; las presentaciones se arman desde el
  template oficial de PowerPoint.
---

# Vambe Brand — Skill de diseño

Genera piezas gráficas con la identidad visual de Vambe: colores, tipografía, gradientes,
componentes y reglas de marca correctas, en HTML autónomo listo para exportar.

---

## Antes de empezar: lee el design system

**Siempre** lee `references/design-system.md` antes de escribir una sola línea de HTML.
Contiene los tokens exactos, las recetas de fondo, los pares de colores por modo y
el inventario completo de assets. Sin leerlo primero es fácil usar el azul equivocado
o romper alguna regla de marca.

```
Ruta: vambe-brand/references/design-system.md
```

---

## Paso 1 — Entender la pieza

Antes de abrir cualquier template, confirma estas cuatro cosas:

**1. Tipo de entregable**
- `documento` → onepager, ficha, caso de éxito largo, pitch → HTML → exporta **PDF**
- `social` → post IG, LinkedIn, carrusel, story, infografía, banner → HTML → exporta **PNG**
- `presentacion` → deck, pitch en slides, propuesta para cliente → **PPTX** desde el template oficial.
  Este caso NO usa HTML ni `render.py`: ver la sección "Presentaciones (PPTX)" más abajo y
  `references/pptx-guide.md`.

**2. Modo de superficie dominante**
- `light` → fondo claro (gradiente azul suave, blanco, o gradiente + blob sutil) — el más frecuente en social
- `dark` → fondo oscuro con blob — para hero, posts dramáticos, bandas de métricas
- `mixto` → documentos: siempre dark en hero/footer, light en el cuerpo

> **Orientación para social (no regla rígida):**
> El punto de partida natural en posts de LinkedIn o IG es fondo claro — resulta más limpio y legible.
> Dark completo, header dark, o división de secciones por color son recursos válidos cuando la pieza
> lo pide (tono dramático, métricas de impacto, contraste intencional), pero no deben ser el patrón
> por defecto solo por variedad visual. Un patrón que funciona bien: cuerpo light + footer dark como
> cierre o llamada a la acción — da contraste sin fragmentar el contenido.

**3. Formato exacto** (solo para social)
- `4x5` = 1080 × 1350px (IG feed, posts LinkedIn, default)
- `cuadrado` = 1080 × 1080px
- `story` = 1080 × 1920px
- `banner` = 1584 × 396px (Banners LinkedIn)

**4. Contenido** — qué va en la pieza: copy, cifras, nombre de cliente, logos a incluir.
Si el usuario no lo especificó todo, pregunta antes de empezar.

---

## Paso 2 — Preparar los assets

### Fuentes
Las fuentes están pre-codificadas en `assets/`. Los templates ya tienen los `@font-face`
con sus placeholders. `render.py` los reemplaza automáticamente al exportar.
**No hace falta hacer nada** con las fuentes — ya está resuelto.

### Antes de diseñar — revisa los ejemplos reales
Antes de escribir HTML, echa un vistazo a `ejemplos/` (33+ capturas de piezas Vambe reales).
Te dan el calibre visual correcto: jerarquía, densidad de información, uso del blob, etc.
```
Ruta: vambe-brand/ejemplos/  (capturas .jpg de piezas reales + onepagers terminados en .html)
```
Revisa al menos 12 antes de empezar — cubre la variedad de formatos y da el calibre visual correcto.

**Ejemplos construidos en HTML:** en `ejemplos/` hay onepagers terminados en `.html` (con su `.jpg` de
vista previa). Ábrelos para ver **cómo se arma una pieza real de principio a fin** — estructura,
tokens, shields, fades, fotos y componentes. Son la mejor referencia de implementación.

### Antes de diseñar — inventario de assets UI disponibles

**Siempre revisa `elementos/` antes de dibujar cualquier componente a mano.** Improvisar con
unicode, SVGs inline o hex sueltos cuando ya existe el asset es un error frecuente y evitable.

| Categoría | Assets disponibles |
|-----------|-------------------|
| **Bullets** | `bullet.check.svg` · `bullet.x.svg` · `bullet.arrow.svg` · `bullet.dot.svg` |
| **Mockups teléfono** | `mockup.phone.claro` · `fill.dark` · `fill.light` · `glass` · `outline` |
| **Computadores** | `computer.fill.light` · `computer.glass` · `computer.rect.outline.dark` · `computer.outline.light` |
| **Dialog balloons** | `dialog-balloon.blue.left/right` · `dialog-balloon.light.left/right` |
| **Scribble arrows** | `scribble.arrow.1/2/3` — para énfasis manual/humano en piezas de tono más cercano |
| **Slide indicators** | `slide-indicator.long/short · dark/light/medium` — para carruseles |
| **Cards pre-diseñadas** | `card.avatar/texto/precio · claro/medio/oscuro` |
| **Botones CTA** | `button.cta.dark` · `button.cta.light` · `button.cta.icon` · `boton.svg` |
| **Shields** | `shield.gradient.dark/light` · `shield.line.gradient.dark/light` · `shield.pattern` |
| **Flechas decorativas** | `arrow.bubble.blue` · `arrow.bubble.white` |
| **Quote mark** | `quote-mark.svg` — para testimonios |
| **Squircles** | `squircle.filled.svg` · `squircle.outlined.svg` |
| **Slogans** | `slogan.horizontal.derecha.svg` y carpeta `slogans/` |

Todos los SVGs se embeben **inline** en el HTML. Los PNGs se convierten a base64.

#### Recolorear SVGs al sistema de color de la pieza

Los SVGs de `elementos/` tienen colores hardcodeados, pero son fácilmente adaptables mediante
string replace. Cuando un asset necesita adecuarse al sistema de color de la pieza:

```python
# Bullet check en contexto Vambe Ads (azul → naranja)
bul_check = svg_inline('vambe-brand/elementos/bullet.check.svg', 18)
bul_check = bul_check.replace('#437AEF', '#F96F07')

# El mismo patrón aplica a cualquier SVG con color hardcodeado
```

Regla general: si la pieza es **Vambe Core** → acento `#437AEF`. Si es **Vambe Ads** → acento `#F96F07`.

### Logos de Vambe
Están en `elementos/` como SVGs. Embébralos **inline** en el HTML (no como `<img src="file://...">`).

```
Fondo oscuro → logo.horizontal.white.svg
Fondo claro  → logo.horizontal.dark-blue.svg  (o logo.horizontal.white-blue.svg)
Solo ícono   → isotipo.svg
```

Para leer e incrustar un SVG inline:
```python
with open('vambe-brand/elementos/logo.horizontal.white.svg', 'r') as f:
    logo_svg = f.read()
# Luego pegar logo_svg directamente en el HTML
```

### Logos de clientes / integraciones
Están en `elementos/` como PNGs. Convertir a base64 para embeber:
```python
import base64
with open('vambe-brand/elementos/whatsapp.png', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()
# En el HTML: <img src="data:image/png;base64,{b64}" />
```

### Fotos de personas / productos (aportadas por el usuario)
1. Recortar borde blanco sobrante con PIL
2. Downscale a máx 520px en el lado mayor
3. Guardar JPEG calidad 85
4. Convertir a base64 y embeber

```python
from PIL import Image, ImageChops
import base64, io

img = Image.open('foto.jpg').convert('RGB')
# Recortar borde blanco
bg  = Image.new('RGB', img.size, (255, 255, 255))
diff = ImageChops.difference(img, bg)
bbox = diff.getbbox()
if bbox: img = img.crop(bbox)
# Resize
img.thumbnail((520, 520), Image.LANCZOS)
# Exportar
buf = io.BytesIO()
img.save(buf, format='JPEG', quality=85)
b64 = base64.b64encode(buf.getvalue()).decode()
# En el HTML: <img src="data:image/jpeg;base64,{b64}" />
```

### Tags de categoría
En `elementos/` como SVGs. Embeber inline.
Disponibles: `tag.alianza` · `tag.blog` · `tag.evento` · `tag.product.update`
`tag.vambe.jobs` · `tag.vambe.life` · `tag.vambe.lovers` · `tag.webinar`

---

## Paso 3 — Construir el HTML

> 🛑 **¿Es una presentación / deck / propuesta en slides?** Entonces **NO sigas este Paso 3 (HTML)**.
> Salta directo a la sección **"Presentaciones (PPTX)"** más abajo. Las presentaciones NO se hacen en
> HTML ni se "aproximan" a mano: se arman clonando el template oficial `.pptx`. Este Paso 3 es solo
> para piezas gráficas (documentos, social, infografías).

### Elige el template correcto
```
Documento → vambe-brand/templates/documento.html
Social    → vambe-brand/templates/social.html
```

Lee el template seleccionado para entender las secciones y clases disponibles.
Luego genera el HTML de la pieza usando ese template como base.

**El template es una referencia, no un molde rígido.** El contenido manda sobre la
estructura, nunca al revés. Si el contenido no calza con el layout del template,
**adaptas el diseño, jamás recortas el contenido**:
- Si el template trae 3 columnas pero el contenido habla de 4 categorías → agregas una
  cuarta columna (más angostas), no eliminas una categoría.
- Si trae 2 bloques y el contenido tiene 5 puntos → reorganizas la grilla para los 5.
- Ajustas tamaños, columnas y espaciado para que la pieza quede **balanceada y
  equilibrada** con el contenido real. Ese criterio de equilibrio es tu trabajo.

### Reglas de construcción

**Color:** Usa exclusivamente los tokens de `references/design-system.md`.
Nunca escribas un hex de azul a mano sin verificarlo contra la tabla — es muy fácil
derivar a un tono morado. El primario es `#437AEF` (blue-500), el de texto oscuro
es `#0A1C43` (blue-950).

**Fondo oscuro:** siempre la receta completa (blob + gradiente), nunca solo el gradiente
o solo un sólido navy:
```css
background:
  radial-gradient(62% 60% at 90% 4%, rgba(0,106,255,.40) 0%, rgba(0,106,255,.16) 34%, rgba(0,106,255,0) 65%),
  linear-gradient(135deg, #080E1C 0%, #0F1A33 100%);
```

**Authentic:** **NO la uses salvo que la persona la pida explícitamente.** Por defecto todo va en
Plus Jakarta Sans (para destacar una palabra, usa Plus Jakarta en color de acento, no Authentic).
Si te la piden: máximo 1 palabra o frase corta, acompañando Plus Jakarta, color `#437AEF` sobre
claro / `#5A8CF6` sobre oscuro. (La fuente ya soporta tildes, así que las palabras acentuadas se
escriben normal.)

**Squircle:** usar la variable `--sq` ya definida en el `:root` del template.
No reconstruir el path a mano. El squircle de fondo del ícono es **opcional**: si la
escena ya está cargada, usa el ícono solo. Ver `references/lucide.md`.

**Íconos:** son **Lucide** y NO se dibujan a mano. Tráelos por nombre con el helper
`scripts/lucide.py` (los 1962 íconos están en `assets/lucide-icons.json`). Detalle completo —
recolor, squircle opcional, reglas — en `references/lucide.md`. **Léelo antes de
poner cualquier ícono.**

**Implementación (layout, cifras, footer, fotos, nav, logos externos):** la guía completa está en
`references/design-system.md` §7.14 — **léela al construir**. En resumen: el contenido manda sobre el
template; layout apilado > wrap; cifras = número neutro + símbolo en acento; **footer: usa el SVG
oficial `footer-dark.svg` o `footer-light.svg` (no lo construyas a mano)**; fotos del usuario
procesadas con PIL, o placeholder de Picsum con seed.

**HTML autónomo:** el archivo final no puede tener rutas de archivo locales
(`file://`, rutas relativas a imágenes, etc.). Todo embebido.

---

## Presentaciones (PPTX) — flujo obligatorio

Una presentación se construye **partiendo del archivo `assets/Plantilla-PPT-Vambe-2026.pptx`** y
clonando sus layouts. **Nunca** la armes desde cero ni "aproximes" el estilo Vambe a mano: el template
ya trae los 43 layouts con la marca exacta (grilla, tipografías, colores, elementos). Aproximarlo
pierde fidelidad y entrega algo que NO es lo que la marca diseñó — que es justo el error a evitar.

**Primer paso, siempre — antes de escribir una sola línea de contenido:**

1. **Copia el template** a tu archivo de salida (no edites el original):
   `cp <skill>/assets/Plantilla-PPT-Vambe-2026.pptx mi-deck.pptx`
2. **Lee `references/pptx-guide.md`** — catálogo de los 43 slides, índices de shapes editables y flujo.
3. **Corre `describe()`** de `scripts/pptx_helpers.py` sobre `mi-deck.pptx` para ver los índices reales
   antes de reemplazar cualquier texto.

Recién entonces edita: clona los layouts que necesites (`clone_slide`, `keep_only`, `move_slide`),
reemplaza texto con `set_text` / `set_paragraphs`. Reglas:

- Si recreas un slide a mano en vez de clonarlo del template, lo estás haciendo mal — vuelve al paso 1.
- Incluye **siempre** el slide de cierre al final de la narrativa, y **después de él deja los slides de elementos** (íconos, logos, botones) — no los borres: quedan al final por si el usuario quiere agregar o modificar algún logo o ícono. Orden: contenido → cierre → elementos.
- Contenido verbatim: adaptas el diseño del layout, no recortas ni inventas texto.
- Previsualiza con LibreOffice antes de entregar y revisa que no haya texto desbordado.
- Dependencias: `pip install python-pptx --break-system-packages`.

> Nota: `<skill>` es la carpeta del skill instalado. Si no encuentras el `.pptx`, búscalo:
> `find . -name 'Plantilla-PPT-Vambe-2026.pptx'` — no sigas sin él.

---

## Paso 4 — Guardar y exportar

### Flujo de aprobación — siempre HTML primero

**Nunca exportar a PNG o PDF en la primera entrega.** El flujo correcto es:

1. **Generar y entregar el HTML** → el usuario lo abre en el browser, revisa y da feedback
2. **Iterar sobre el HTML** hasta que el diseño esté aprobado
3. **Solo entonces exportar** a PNG (social) o PDF (documento) con `render.py`

Esto permite ajustes rápidos sin regenerar renders pesados en cada vuelta.
Cuando el usuario diga "aprobado", "listo para exportar", "genera el PNG" o similar → recién ejecutar `render.py`.

### Guardar el HTML
```python
output_path = '/ruta/a/pieza-nombre.html'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(html_content)
```

### Exportar con render.py (solo cuando el diseño esté aprobado)
```bash
# PDF (documento)
python vambe-brand/scripts/render.py pieza-nombre.html

# PNG social — feed 4:5 (default)
python vambe-brand/scripts/render.py pieza-nombre.html --tipo social

# PNG social — cuadrado
python vambe-brand/scripts/render.py pieza-nombre.html --tipo social --formato cuadrado

# PNG social — story
python vambe-brand/scripts/render.py pieza-nombre.html --tipo social --formato story

# PNG social — banner LinkedIn
python vambe-brand/scripts/render.py pieza-nombre.html --tipo social --formato banner
```

El script genera:
- `pieza-nombre.pdf` o `pieza-nombre_4x5.png` (el entregable final)
- `pieza-nombre_autonomous.html` (HTML con fuentes embebidas, guardable y compartible)

### Si Playwright no está instalado
```bash
pip install playwright --break-system-packages
playwright install chromium
```

---

## Paso 5 — Checklist antes de entregar

Antes de mostrarle el resultado al usuario, verifica:

- [ ] **Azul correcto:** ningún tono morado visible en bandas grandes. El primario es `#437AEF`, no índigo.
- [ ] **Authentic — faux bold:** el `<span>` de Authentic tiene `font-weight:400` y `font-synthesis:none` explícitos. Si hereda un peso mayor del padre el navegador engrosa los trazos artificialmente.
- [ ] **Authentic — tamaño:** el span va a ~2× el tamaño de Plus Jakarta en la misma línea (Authentic tiene métricas display más chicas). Ajustar a ojo entre 1.8×–2.2×.
- [ ] **Authentic — line-height:** no elevar el `line-height` del contenedor padre. Mantenerlo en el valor de Plus Jakarta (1.1–1.2) y ajustar el tamaño de Authentic hasta que encaje visualmente.
- [ ] **Authentic — color propio:** `#5A8CF6` sobre oscuro, `#437AEF` sobre claro. No dejar que herede `currentColor` del titular blanco.
- [ ] **Authentic — solo si la persona la pidió** (por defecto NO se usa).
- [ ] **Logo presente:** en header y footer (documentos), o dentro del área segura (social).
- [ ] **Fuentes embebidas:** los placeholders `AUTHENTIC_B64` etc. no deben quedar en el HTML final — render.py los reemplaza, pero si lo revisas a mano, no deben estar en el `_autonomous.html`.
- [ ] **Nada hardcodeado fuera del sistema:** si escribiste un color hex que no está en `design-system.md`, justifica por qué o reemplázalo.
- [ ] **Sin rutas locales:** no hay `file://`, `../elementos/...` ni rutas relativas en el HTML final.
- [ ] **Cifras verificadas:** si hay datos o claims, están confirmados por el usuario.
- [ ] **Nombres de marca correctos:** "Pet Family" (con espacio), "Vambe AI", "Vambe Ads".

---

## Referencia rápida de archivos

| Archivo | Para qué |
|---------|----------|
| `references/design-system.md` | Fuente de verdad: tokens, recetas, reglas, inventario |
| `references/lucide.md` | Cómo usar los íconos Lucide (recolor, squircle opcional) |
| `assets/lucide-icons.json` | 1962 íconos Lucide (un archivo; se sirven con lucide.py) |
| `scripts/lucide.py` | Helper: trae un ícono Lucide inline por nombre |
| `assets/authentic.b64` | Fuente Authentic en base64 |
| `assets/plusjakarta.b64` | Plus Jakarta Sans Variable |
| `assets/plusjakarta-italic.b64` | Plus Jakarta Sans Italic Variable |
| `assets/tokens.css` | Variables CSS canónicas |
| `templates/documento.html` | Base para onepagers y PDFs |
| `templates/social.html` | Base para posts e infografías |
| `scripts/render.py` | Exportador HTML → PDF / PNG |
| `references/pptx-guide.md` | Catálogo del template PPTX + flujo de armado de decks |
| `assets/Plantilla-PPT-Vambe-2026.pptx` | Template oficial de presentaciones |
| `scripts/pptx_helpers.py` | Helpers para clonar slides y editar texto en PPTX |
| `elementos/` | 90+ assets SVG/PNG: logos, mockups, tags, bullets, etc. |
| `ejemplos/` | 33+ capturas de piezas Vambe reales — referencia visual antes de diseñar |

---

## Ejemplos de invocación

### Ejemplo 1 — Onepager de cliente
```
"Hazme un onepager de Vambe para el sector salud. El cliente es una clínica privada.
Quiero que destaque: agendamiento de citas por WhatsApp, seguimiento post-consulta,
y reactivación de pacientes inactivos. Hay una cita del director: 'Con Vambe pasamos
de 40% a 92% de confirmación de citas.' Métricas: 15K citas agendadas, 87% tasa de
confirmación, $2.1M USD en citas no perdidas."
```
→ Tipo: `documento`, modo: mixto, template: `documento.html`

### Ejemplo 2 — Post de métricas para LinkedIn
```
"Arma un post de LinkedIn con los números de Vambe: 30M personas atendidas,
160K órdenes en e-commerce, $28M USD en ventas apoyadas. Fondo claro, estilo limpio."
```
→ Tipo: `social`, formato: `4x5` o `cuadrado`, modo: `light`, template: `social.html`

### Ejemplo 3 — Carrusel de Instagram (6 slides)
```
"Quiero un carrusel de 6 slides sobre los beneficios de los agentes de IA para retail.
Slide 1: cover dark. Slides 2-5: un beneficio por slide, fondo claro. Slide 6: CTA dark."
```
→ Tipo: `social`, formato: `4x5`, modo: alternado dark/light
→ Generar 6 HTMLs separados, exportar 6 PNGs

### Ejemplo 4 — Story de evento
```
"Hazme una story de Instagram para el webinar 'IA para e-commerce' del 15 de junio.
Dark, con el logo de Vambe Live, fecha y hora, y botón de registro."
```
→ Tipo: `social`, formato: `story` (1080×1920), modo: `dark`, template: `social.html`
→ Usar `logo.vambe-live.svg` y `tag.webinar.svg`
