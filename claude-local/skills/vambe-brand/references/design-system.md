# Vambe Design System — Referencia consolidada para el skill

> Este documento es la fuente de verdad para generar piezas on-brand de Vambe.
> Léelo completo antes de escribir cualquier HTML. Contiene tokens, reglas, inventario de assets y guía de componentes.

---

## 0. Personalidad de marca

**Limpio, sistemático, humano-tech.** Mucho aire, azul de marca dominante, una pizca de script (fuente Authentic) como acento humano. La estética es oscura y ordenada en las bandas principales, clara y respirable en el cuerpo. Nada recargado ni genérico. Tipografía fuerte, cifras protagonistas, copy conciso y directo.

---

## 1. Reglas NO-negociables (leer antes de diseñar)

1. **Azul, nunca morado.** El hue de los azules debe quedar ~213°. Los índigo de Tailwind (#1d4ed8, #2563eb) leen violáceos en gradientes grandes — NO usarlos como azul de UI. Usar `--blue-500` (#437AEF) como primario y `--blue-450` (#5A8CF6) como acento.
2. **`#006AFF` (blob-blue) SOLO para el blob radial** en fondos oscuros. Nunca como color de UI, botón, texto o fondo sólido.
3. **Authentic = máximo 1 palabra o frase corta por pieza.** Es un acento de personalidad, no un cuerpo de texto. Siempre acompañando a un titular en Plus Jakarta Sans.
4. **Verde (`--green: #16a34a`) y naranja (`--orange: #ea6a2e`) son acentos puntuales.** Por defecto el sistema es azul monocromo + blob. No usar en fondos, solo en íconos o badges de estado muy específicos.
5. **Sistema de color Vambe Ads (Amber + Neutral) → exclusivo de piezas Vambe Ads.** El sistema Ads tiene su propia paleta cromática: Amber para acentos/headers y Neutral (grises cálidos) para texto/superficies — reemplaza a Slate en esas piezas. No mezclar Slate y Neutral en la misma pieza. Fuera de piezas Vambe Ads, ambas paletas quedan fuera de scope.
6. **Logo siempre presente.** En social: alto 45px, dentro del margen de 65px. En documentos: en header y footer. Nunca deformado, nunca recoloreado a mano.
7. **Consistencia de nombres de marca:** "Pet Family" (con espacio), "Vambe AI", "Vambe Ads". Siempre como aparece en los assets.
8. **Cifras y claims deben ser verificables.** Si hay dato, citar fuente en copy secundario.
9. **Layout apilado > wrap en cards con foto.** Texto a ancho completo arriba, imagen abajo. El wrap deja huecos cuando el texto es corto.
10. **`min-height` para alinear filas de cards.** Si dos columnas tienen títulos de distinta longitud, normalizar la altura del bloque superior con `min-height` para que el contenido de abajo arranque a la misma altura.

---

## 2. Tokens de color

### Familia Vambe Blue (UI, acentos, CTAs)
```css
--blue-950: #0A1C43   /* surface oscura, logo "dark" */
--blue-900: #1D3D81
--blue-800: #1B4298
--blue-700: #1C4EBA
--blue-600: #2861DC
--blue-550: #2C66E2
--blue-500: #437AEF   /* PRIMARIO de marca — logo, CTAs, íconos */
--blue-450: #5A8CF6   /* acento sobre oscuro */
--blue-400: #729CF8
--blue-300: #88ACFC
--blue-250: #A6C1FC
--blue-200: #B4CBFE
--blue-150: #C8D9FE
--blue-100: #D3E0FD
--blue-75:  #E1EAFE
--blue-50:  #F2F6FE
--blue-25:  #F5F8FF   /* fondo claro más suave */
```

### Familia Slate (texto, bordes, superficies neutras)
```css
--slate-950: #020617   /* texto principal sobre claro */
--slate-900: #0F172A
--slate-800: #1E293B
--slate-700: #334155
--slate-600: #475569   /* texto secundario */
--slate-500: #64748B
--slate-400: #94A3B8
--slate-300: #B9C6D7
--slate-200: #D8E0EA   /* bordes de cards */
--slate-100: #E2E8F0
--slate-75:  #EAEFF4
--slate-50:  #F1F5F9
--slate-25:  #F8FAFC
--slate-10:  #FCFDFE
```

### Familia Neutral — Vambe Ads (grises cálidos)

Paleta de grises con temperatura neutra-cálida. Se usa **exclusivamente en piezas de Vambe Ads**
junto con la paleta Amber. Reemplaza a Slate en el retiro/dorso para que el sistema cromático
de Ads (orange + neutral) sea coherente y distinto del sistema principal (blue + slate).

```css
--neutral-950: #141414
--neutral-900: #1F1F1F
--neutral-800: #383838
--neutral-700: #525252   /* referencia — Neutral-700 */
--neutral-600: #6B6B6B
--neutral-500: #858585
--neutral-400: #9E9E9E
--neutral-300: #B8B8B8
--neutral-200: #D4D4D4   /* bordes de cards en Vambe Ads */
--neutral-100: #E8E8E8
--neutral-50:  #F5F5F5
--neutral-25:  #FAFAFA   /* fondo de página en Vambe Ads */
```

> **Regla de uso:** Neutral solo en piezas Vambe Ads explícitas (junto con Amber).
> En onepagers, social general y documentos Vambe core → usar Slate.

### Gradientes y blob

**Valores base:**
```css
--blob-blue:       #006AFF   /* SOLO para el blob radial — nunca como color de UI */
--grad-dark-from:  #080E1C
--grad-dark-to:    #0F1A33
--grad-light-from: #F5F8FF
--grad-light-to:   #E2EAFF
```

**Opacidades del blob según modo:**
```css
/* Sobre oscuro */ --blob-opacity-dark-primary:   .40   /* blob principal */
                  --blob-opacity-dark-secondary:  .22   /* blob secundario (si hay dos) */
/* Sobre claro  */ --blob-opacity-light-primary:  .30   /* blob principal */
                  --blob-opacity-light-secondary: .18   /* blob secundario */
```

**Posiciones del blob** (el blob es grande: ~65% del canvas, blur ~28%):
- `at 90% 4%` — esquina superior derecha ← la más usada
- `at 10% 4%` — esquina superior izquierda
- `at 90% 96%` — esquina inferior derecha
- `at 50% 0%` — centro arriba
- `at 50% 100%` — centro abajo

---

#### Recetas completas de fondo

**🌑 DARK — con blob (hero, footer, bandas de métricas, posts dramáticos)**
```css
/* Blob esquina sup-der (más frecuente) */
background: radial-gradient(62% 60% at 90% 4%,
              rgba(0,106,255,.40) 0%, rgba(0,106,255,.16) 34%, rgba(0,106,255,0) 65%),
            linear-gradient(135deg, #080E1C 0%, #0F1A33 100%);

/* Blob esquina sup-izq */
background: radial-gradient(62% 60% at 10% 4%,
              rgba(0,106,255,.40) 0%, rgba(0,106,255,.16) 34%, rgba(0,106,255,0) 65%),
            linear-gradient(135deg, #080E1C 0%, #0F1A33 100%);

/* Blob centro-sup (para banners horizontales) */
background: radial-gradient(80% 70% at 50% 0%,
              rgba(0,106,255,.35) 0%, rgba(0,106,255,.12) 40%, rgba(0,106,255,0) 70%),
            linear-gradient(135deg, #080E1C 0%, #0F1A33 100%);
```

**🌑 DARK — sin blob (fondo liso, más austero)**
```css
background: linear-gradient(135deg, #080E1C 0%, #0F1A33 100%);
/* O sólido: */ background: #0A1C43;
```

**☀️ LIGHT — gradiente azul suave (social posts, infografías — el más frecuente)**
```css
background: linear-gradient(135deg, #F5F8FF 0%, #E2EAFF 100%);
```

**☀️ LIGHT — gradiente con blob sutil (profundidad sin oscurecer)**
```css
/* Blob sup-der sobre claro */
background: radial-gradient(62% 60% at 90% 4%,
              rgba(0,106,255,.30) 0%, rgba(0,106,255,.10) 34%, rgba(0,106,255,0) 65%),
            linear-gradient(135deg, #F5F8FF 0%, #E2EAFF 100%);

/* Blob sup-izq sobre claro */
background: radial-gradient(62% 60% at 10% 4%,
              rgba(0,106,255,.30) 0%, rgba(0,106,255,.10) 34%, rgba(0,106,255,0) 65%),
            linear-gradient(135deg, #F5F8FF 0%, #E2EAFF 100%);
```

**☀️ LIGHT — blanco puro (documentos, secciones de cuerpo, cards)**
```css
background: #FFFFFF;
```

**☀️ LIGHT — blanco con microdetalle (fondo de página de documento)**
```css
background: #F8FAFC;  /* slate-25 — apenas perceptible sobre white */
```

### Alias semánticos
```css
--brand-blue:     #437AEF   /* primario */
--text-primary:   #0A1C43   /* blue-950 */
--text-secondary: #475569   /* slate-600 */
--surface-light:  #FFFFFF
--surface-dark:   #0A1C43
--line:           #D8E0EA   /* bordes */
--white:          #FFFFFF

/* Acentos (uso puntual) */
--green:  #16a34a
--orange: #ea6a2e
--red:    #dc2626
```

---

## 3. Tipografía

### Familias
```css
--font-primary: "Plus Jakarta Sans", sans-serif;   /* peso 300–800, variable font */
--font-script:  "Authentic", cursive;               /* acento opcional — ver reglas de uso */
/* Caveat: solo via Google Fonts si se necesita detalle manuscrito en logo */
```

### Pesos disponibles (Plus Jakarta Sans Variable)
```css
--fw-light:     300
--fw-regular:   400
--fw-medium:    500
--fw-semibold:  600
--fw-bold:      700
--fw-extrabold: 800
```

### Escala por rol (referencia para canvas 1080px)
El tamaño absoluto es **libre**; lo que es fijo es el **rol**, **peso** y **familia**.
Para documentos (794px) escalar proporcionalmente (~73% de los valores de 1080).

| Rol | Mínimo @1080px | Peso | Tratamiento |
|-----|---------------|------|-------------|
| `eyebrow` | 27px | SemiBold | MAYÚSCULAS + letter-spacing amplio |
| `caption` | 25px | Medium | texto de card/UI/fuente |
| `body` | 35px | Regular (Bold para énfasis) | párrafos |
| `subhead` | 55px | Bold | subtítulos de sección |
| `headline` | 80px | ExtraBold | titular principal |
| `hero` | 130px | ExtraBold | cifra/dato protagonista |
| `script-accent` | contextual | — | Authentic, tamaño del titular que acompaña |

**Para documentos PDF (794px ancho):** los tamaños son más libres pero mantener jerarquía. Rangos típicos:
- eyebrow: 11–12px, body: 15–16px, subhead: 22–26px, headline: 36–48px, hero-metric: 52–72px.

### Cuándo usar Authentic

**No uses Authentic salvo que la persona lo pida explícitamente.** Por defecto **todo** va en Plus
Jakarta Sans. No la decidas por tu cuenta aunque el tono sea humano o emocional.

**Para destacar una palabra dentro de un titular, la forma correcta es Plus Jakarta Sans en celeste
y/o itálica** — NO la fuente script. Usa `#5A8CF6` (blue-450) sobre oscuro y `#437AEF` (blue-500)
sobre claro, en `font-style:italic` o solo el color. Ej: "La IA que <em style="color:#5A8CF6;
font-style:italic">impulsa</em> tu crecimiento". **Aplica también al template PPTX:** si un layout trae
una palabra en Authentic (portada, etc.), reemplázala por Plus Jakarta itálica/celeste.

Cuando te la pidan: máximo 1 palabra o frase corta por pieza, siempre acompañando Plus Jakarta, nunca
sola. (La fuente ya soporta tildes; las palabras acentuadas se escriben normal.)

### ⚠️ Reglas técnicas para Authentic (leer antes de usarla)

Authentic es una fuente **display de peso único (Regular 400)**. El navegador no tiene versión bold — si hereda un `font-weight` mayor a 400, aplica **faux bold** (negrita sintética) que engrosa artificialmente los trazos y arruina el look manuscrito.

**Regla 1 — Siempre forzar peso y desactivar síntesis:**
```css
/* SIEMPRE en el span de Authentic */
font-family: 'Authentic', cursive;
font-weight: 400;          /* nunca heredar del padre */
font-style: normal;
font-synthesis: none;      /* deshabilita faux bold y faux italic */
-webkit-font-smoothing: antialiased;
```

**Regla 2 — Tamaño 2× el de Plus Jakarta Sans en la misma línea:**
Authentic tiene métricas de display más chicas. Si el titular de Plus Jakarta está a `48px`, Authentic debe ir a `~96px` para que ambas palabras queden visualmente a la misma altura percibida. El multiplicador exacto depende del contexto — empezar con 2× y ajustar a ojo (1.8×–2.2× son rangos normales).
```css
/* Ejemplo: titular Plus Jakarta a 48px */
.titular { font-size: 48px; font-weight: 800; line-height: 1.15; }
.authentic-accent { font-size: 96px; font-weight: 400; font-synthesis: none; }
```

**Regla 3 — Line-height: no elevar el del contenedor padre:**
Cuando Authentic convive en una línea con Plus Jakarta, su tamaño mayor puede romper el `line-height` del bloque. Solución: mantener el `line-height` del padre en el valor de Plus Jakarta (1.1–1.2) y ajustar el tamaño de Authentic hasta que visualmente encaje, sin tocar el interlineado del contenedor.

**Regla 4 — Color propio, nunca `currentColor` si el padre está en blanco:**
Sobre fondo oscuro: `color: #5A8CF6` (blue-450).
Sobre fondo claro: `color: #437AEF` (blue-500).
No dejar que herede el blanco del titular — pierde el contraste de color que es su razón de ser.

**Patrón correcto completo:**
```html
<h1 style="font-size:48px; font-weight:800; color:white; line-height:1.15; font-family:'Plus Jakarta Sans',sans-serif;">
  <span style="font-family:'Authentic',cursive; font-weight:400; font-synthesis:none;
               font-size:96px; color:#5A8CF6; -webkit-font-smoothing:antialiased;">
    Conversaciones
  </span>
  que se convierten en ventas
</h1>
```

---

## 4. Espaciado y forma

```css
/* Escala 4px */
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-6:  24px
--space-8:  32px
--space-12: 48px
--space-16: 64px

/* Radios */
--radius-sm:     8px    /* tags, pills pequeños */
--radius-md:     12px   /* cards, contenedores */
--radius-lg:     20px   /* frames de imagen, mockups */
--radius-pill:   9999px /* botones, chips */
--radius-circle: 50%    /* foto de personas */

/* Sombra de card */
--shadow-card: 0 2px 12px rgba(10,28,67,.08)
```

### Squircle (máscara de íconos)
Data-URI exacto del path superelipse — usar como CSS mask:
```css
--sq: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%20131%20131%27%3E%3Cpath%20d%3D%27M65.2772%20130.554C53.4138%20130.554%2041.7721%20129.631%2032.5031%20127.948C21.8097%20126.01%2014.5603%20123.202%2010.9562%20119.598C7.35199%20115.994%204.54421%20108.745%202.60667%2098.0512C0.927737%2088.7781%200%2077.1405%200%2065.2771C0%2053.4138%200.923632%2041.7721%202.60667%2032.5031C4.54421%2021.8097%207.35199%2014.5603%2010.9562%2010.9562C14.5603%207.35199%2021.8097%204.5442%2032.5031%202.60665C41.7762%200.927722%2053.4138%200%2065.2772%200C77.1405%200%2088.7822%200.923617%2098.0512%202.60665C108.745%204.5442%20115.994%207.35199%20119.598%2010.9562C123.202%2014.5603%20126.01%2021.8097%20127.948%2032.5031C129.627%2041.7762%20130.554%2053.4138%20130.554%2065.2771C130.554%2077.1405%20129.631%2088.7822%20127.948%2098.0512C126.01%20108.745%20123.202%20115.994%20119.598%20119.598C115.994%20123.202%20108.745%20126.01%2098.0512%20127.948C88.7781%20129.627%2077.1405%20130.554%2065.2772%20130.554Z%27%20fill%3D%27%23ffffff%27/%3E%3C/svg%3E");

/* Uso: contenedor de ícono */
.icon-wrap {
  width: 44px; height: 44px;
  -webkit-mask: var(--sq) center/cover no-repeat;
  mask: var(--sq) center/cover no-repeat;
  /* fondo claro: */ background: #E1EAFE;
  /* fondo oscuro: */ background: rgba(77,151,255,.16);
  display: flex; align-items: center; justify-content: center;
}
.icon-wrap svg { width: 22px; height: 22px; /* ~50% del contenedor */
  /* fondo claro: */ stroke: #437AEF;
  /* fondo oscuro: */ stroke: #5A8CF6;
}
```

---

## 5. Modos light y dark

El sistema tiene **dos modos de superficie** que funcionan de forma independiente al tipo de pieza. Los posts de social son generalmente light; los documentos mezclan ambos (banda oscura hero/footer + cuerpo claro). Ambos modos son válidos para cualquier formato.

### ☀️ Modo LIGHT (predominante en social, cuerpo de documentos)

| Elemento | Valor |
|----------|-------|
| Fondo | `linear-gradient(135deg, #F5F8FF, #E2EAFF)` o `#FFFFFF` |
| Fondo con blob | ver sección 2 — opacidad blob .30/.18 |
| Texto principal | `#0A1C43` (blue-950) |
| Texto secundario | `#475569` (slate-600) |
| Texto terciario / caption | `#64748B` (slate-500) |
| Acento / cifra | `#437AEF` (blue-500) |
| Acento Authentic | `#437AEF` (blue-500) |
| Borde de card | `#D8E0EA` (slate-200) |
| Fondo de card | `#FFFFFF` con `box-shadow: 0 2px 12px rgba(10,28,67,.08)` |
| Fondo de squircle | `#E1EAFE` (blue-75) |
| Color de ícono en squircle | `#437AEF` (blue-500) |
| Logo | `logo.horizontal.dark-blue.svg` o `logo.horizontal.white-blue.svg` |
| Botón CTA | dark: fondo `#0A1C43`, texto blanco |

### 🌑 Modo DARK (hero, footer, métricas, posts dramáticos)

| Elemento | Valor |
|----------|-------|
| Fondo | dark con blob (ver sección 2) |
| Texto principal | `#FFFFFF` |
| Texto secundario | `#88ACFC` (blue-300) |
| Texto terciario / caption | `#5A8CF6` (blue-450) |
| Acento / cifra | `#FFFFFF` (peso ExtraBold) |
| Acento Authentic | `#5A8CF6` (blue-450) — nunca blanco puro, pierde contraste |
| Borde de card interna | `rgba(255,255,255,.10)` |
| Fondo de card interna | `rgba(255,255,255,.06)` |
| Fondo de squircle | `rgba(77,151,255,.16)` |
| Color de ícono en squircle | `#5A8CF6` (blue-450) |
| Logo | `logo.horizontal.white.svg` |
| Botón CTA | light: fondo `#FFFFFF`, texto `#0A1C43` |

### Reglas de alternancia

- **En carruseles:** alternar slides light/dark para que la grilla de feed no se vea plana. No poner 3+ slides del mismo modo seguidas.
- **En documentos:** la estructura canónica es dark (hero) → light (cuerpo) → dark (footer). Las bandas intermedias de métricas o CTA pueden ser dark aunque el cuerpo sea light.
- **En posts unitarios:** elegir según la foto o el mood. Foto de persona con fondo claro → post dark. Foto de pantalla/producto → post light funciona bien.
- **Infografías de números:** generalmente light con el dato hero en `#437AEF` o `#0A1C43`.

---

## 6. Modos visuales por formato

### Modo DOCUMENTO (onepager, ficha, caso de éxito largo)
- **Canvas:** 794px ancho, altura variable (continuo vertical)
- **Estructura:** banda oscura hero → secciones claras de cuerpo → banda oscura footer
- **Render:** Playwright, `device_scale_factor=2`, `@media print` sin márgenes
- **Export PDF:** altura = `footer.getBoundingClientRect().bottom − 15px`
- **Grilla de contenido:** padding horizontal 48–60px; columnas: 2 (60/40) o 4 iguales
- **Logo en header:** `logo.horizontal.white.svg` sobre oscuro, ~120px ancho
- **Logo en footer:** ídem, centrado o izquierda
- **Modo de superficie del cuerpo:** light (blanco puro o `#F8FAFC`)

### Modo SOCIAL (post IG, LinkedIn, carrusel)
- **Canvas base:** 1080 × 1350px (feed 4:5); 1080 × 1080px (cuadrado); 1080 × 1920px (story)
- **Margen:** 65px en los 4 lados (uniforme). Contenido y logo DENTRO del área segura.
- **Logo:** alto 45px (~4.2% del ancho), siempre presente. En carruseles puede ir solo en 1ra y última slide.
- **Tipografía:** escalada a 1080px — usar mínimos de la tabla de roles.
- **Un solo elemento dominante** por slide. Máx 3–4 niveles de tamaño por pieza.
- **Alternancia:** fondo dark/light entre slides de carrusel para que la grilla no se vea plana.

---

## 7. Componentes — recetas HTML

### 7.1 Banda oscura (hero / footer / métricas)
```html
<div style="
  background: radial-gradient(62% 60% at 90% 4%, rgba(0,106,255,.40) 0%, rgba(0,106,255,.16) 34%, rgba(0,106,255,0) 65%),
              linear-gradient(135deg,#080E1C 0%,#0F1A33 100%);
  color: white; padding: 48px 60px;
">
  <!-- contenido -->
</div>
```

### 7.2 Tarjeta — variante light (sobre fondo claro)
```html
<div style="
  background: white; border: 1px solid #D8E0EA;
  border-radius: 14px; padding: 24px;
  box-shadow: 0 2px 12px rgba(10,28,67,.08);
">
  <!-- ícono squircle light + título en #0A1C43 + descripción en #475569 -->
</div>
```

### 7.2b Tarjeta — variante dark (sobre fondo oscuro)
```html
<div style="
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 14px; padding: 24px;
">
  <!-- ícono squircle dark + título en #FFFFFF + descripción en #88ACFC -->
</div>
```

### 7.3 Ícono en squircle (sobre fondo claro)
```html
<div style="
  width:44px; height:44px;
  -webkit-mask: var(--sq) center/cover no-repeat;
  mask: var(--sq) center/cover no-repeat;
  background: #E1EAFE;
  display:flex; align-items:center; justify-content:center;
">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
       stroke="#437AEF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <!-- path del ícono Lucide -->
  </svg>
</div>
```

### 7.4 Ícono en squircle (sobre fondo oscuro)
```html
<div style="
  width:44px; height:44px;
  -webkit-mask: var(--sq) center/cover no-repeat;
  mask: var(--sq) center/cover no-repeat;
  background: rgba(77,151,255,.16);
  display:flex; align-items:center; justify-content:center;
">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
       stroke="#5A8CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <!-- path del ícono Lucide -->
  </svg>
</div>
```

### 7.5 Tarjeta de métrica (banda oscura)
```html
<div style="text-align:center; padding: 0 16px;">
  <!-- ícono squircle oscuro (opcional) -->
  <div style="font-size:52px; font-weight:800; color:white; line-height:1.1;">30M+</div>
  <div style="font-size:14px; font-weight:500; color:#88ACFC; margin-top:6px;">
    personas conversadas por agentes de IA
  </div>
</div>
```

### 7.6 Callout con borde azul
```html
<div style="
  border-left: 3px solid #437AEF;
  background: #F2F6FE; border-radius: 0 10px 10px 0;
  padding: 14px 18px; margin: 16px 0;
">
  <p style="margin:0; font-size:15px; color:#0A1C43;">Texto del callout</p>
</div>
```

### 7.7 Chip de integración
```html
<span style="
  display:inline-flex; align-items:center; gap:6px;
  background:#F2F6FE; border:1px solid #D8E0EA;
  border-radius:9999px; padding:6px 14px;
  font-size:13px; font-weight:500; color:#334155;
">
  <img src="[logo-base64]" style="height:16px; width:auto;"/> WhatsApp
</span>
```

### 7.8 Botón CTA — variante dark (sobre fondo claro)
```html
<a style="
  display:inline-flex; align-items:center; gap:8px;
  background:#0A1C43; color:white;
  border-radius:9999px; padding:12px 28px;
  font-size:15px; font-weight:600;
  text-decoration:none;
">
  Agendar demo
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
</a>
```

### 7.9 Botón CTA — variante light (sobre fondo oscuro)
```html
<a style="
  display:inline-flex; align-items:center; gap:8px;
  background:white; color:#0A1C43;
  border:1px solid rgba(255,255,255,.3);
  border-radius:9999px; padding:12px 28px;
  font-size:15px; font-weight:600;
  text-decoration:none;
">
  Conocer más →
</a>
```

### 7.10 Card de caso de éxito / testimonial
```html
<div style="
  background:white; border:1px solid #D8E0EA;
  border-radius:14px; padding:28px;
  box-shadow: 0 2px 12px rgba(10,28,67,.08);
">
  <!-- Quote mark SVG inline (ver assets) -->
  <p style="font-size:16px; font-style:italic; color:#334155; margin:12px 0 20px;">
    "Texto de testimonio aquí."
  </p>
  <div style="display:flex; align-items:center; gap:12px;">
    <!-- Logo de cliente -->
    <img src="[logo-cliente-base64]" style="height:28px; width:auto;"/>
    <div>
      <div style="font-weight:700; font-size:14px; color:#0A1C43;">Nombre Empresa</div>
      <div style="font-size:12px; color:#64748B;">Cargo · Nombre persona</div>
    </div>
  </div>
</div>
```

### 7.11 Label de sección (eyebrow con ícono)
```html
<div style="
  display:inline-flex; align-items:center; gap:8px;
  color:#64748B; font-size:12px; font-weight:600;
  letter-spacing:.08em; text-transform:uppercase;
  margin-bottom:16px;
">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <!-- ícono Lucide temático -->
  </svg>
  Nombre de la sección
</div>
```

### 7.12 Acento Authentic (en titular)

> ⚠️ Ver "Reglas críticas para Authentic" en §3 antes de usar.
> El riesgo principal es faux bold: si el span hereda `font-weight > 400` del padre, el navegador engrosa los trazos artificialmente. Siempre poner `font-weight:400` y `font-synthesis:none` en el span.

```html
<!-- Sobre fondo oscuro -->
<h1 style="font-size:48px; font-weight:800; color:white; line-height:1.15;
           font-family:'Plus Jakarta Sans',sans-serif;">
  <span style="font-family:'Authentic',cursive; font-weight:400; font-synthesis:none;
               font-size:96px; color:#5A8CF6; -webkit-font-smoothing:antialiased;">
    Conversaciones
  </span>
  que se convierten en ventas
</h1>

<!-- Sobre fondo claro -->
<h1 style="font-size:48px; font-weight:800; color:#0A1C43; line-height:1.15;
           font-family:'Plus Jakarta Sans',sans-serif;">
  <span style="font-family:'Authentic',cursive; font-weight:400; font-synthesis:none;
               font-size:96px; color:#437AEF; -webkit-font-smoothing:antialiased;">
    Conversaciones
  </span>
  que se convierten en ventas
</h1>
```

---

## 7.13 Profundidad y tratamiento de imágenes (de piezas reales)

Cuatro técnicas que evitan que una pieza se vea plana, sin recargarla:

1. **Shields decorativos de fondo.** Para dar profundidad usa los `shield.gradient.*` (fill
   degradado, **no** los de línea), sangrando desde un borde, a baja opacidad, **detrás** del
   contenido (`position:absolute; z-index:0`, contenedor `overflow:hidden`). Colócalos en zonas
   **vacías/tranquilas** (un costado libre, un espacio bajo una columna corta), **nunca** sobre una
   sección ya densa de cards o texto. Máximo uno por sección.

2. **Imágenes: el tratamiento varía según la pieza** — no hay una sola forma correcta. Algunas
   opciones que funcionan bien: foto en **marco** redondeado con velo azul sutil (`object-fit:cover`,
   como en "Lo que hacemos"), **fundida al fondo con `mask-image`**
   (`linear-gradient(to bottom,#000 ~52%,transparent)` o PNG transparente, como el celular del hero),
   a sangre, flotando sobre el fondo, etc. Elige según el mood y la composición.
   Dos cosas a cuidar siempre: legibilidad (texto fuera de la imagen) y **resolución** — pide la
   imagen en alta resolución porque una captura baja-res escalada se ve borrosa.

3. **Blob secundario para contraste entre secciones.** Un segundo blob azul en una esquina puede
   marcar la transición a la sección siguiente, pero mantenlo **sutil** (opacidad baja) para que no
   compita con el blob principal.

4. **Sub-marca Vambe Ads.** Fondo **gris neutro** (`#141414`→`#1F1F1F`), **nunca** un blob naranjo
   (tiñe el fondo de café y desentona). El ámbar va **solo** en acentos. Para identificarla está
   disponible el logo `logo-vambe-ads-white.svg`; usar logo o tag de texto según convenga a la pieza.

---

## 7.14 Reglas de implementación (al construir el HTML)

- **El template es referencia, no molde.** El contenido manda: si hay 4 categorías y el template trae 3 columnas, agregas una columna; nunca recortas contenido. Ajusta tamaños/grilla hasta que quede balanceado.
- **Layout apilado > wrap** en cards con texto + imagen: texto a ancho completo arriba, imagen abajo (el wrap deja huecos).
- **Alinea filas de columnas** con `min-height` cuando los bloques superiores tienen distinta altura, para que el contenido de abajo arranque parejo.
- **Modo mixto libre en documentos:** mezclar bandas dark/light está bien; lo que importa es que el contraste sea intencional, no aleatorio.
- **Nav dentro del hero** cuando el hero tiene fondo de color: el logo va DENTRO del div del hero, no antes, o aparece una franja blanca arriba.
- **Patrón de cifras:** número en neutro/oscuro + símbolo/unidad (`%`, `x`, `+`, `$`) en color acento. Core: símbolo `var(--blue-500)`. Ads: símbolo `var(--amber-400)`. Nunca todo el número en acento; la cifra ancla en el neutro.
- **Logos de marcas externas:** PNGs de `elementos/` como base64 (`whatsapp`, `google.analytics`, `hubspot.tif`, `salesforce`, `zoho`, `slack`, `teams`, `rest.api`). Si falta uno, placeholder gris con el nombre y avisar al usuario.
- **Fotos de personas:** (1) si el usuario las da, procesar con PIL (recortar bordes, ~520px lado mayor, JPEG q85, base64); (2) si no, usar las genéricas on-brand de `assets/fotos-personas/` (escenas profesionales con el isotipo) y avisar que se reemplacen; (3) último recurso, placeholder de Picsum con seed fijo (`https://picsum.photos/seed/vambe-hero/520/680`). No usar `source.unsplash.com` (su redirect falla en el sandbox); para Unsplash directo usar `images.unsplash.com/photo-ID?w=520&q=80`.
- **Footer (one-pagers, infografías, docs descargables) — usa el footer oficial, NO lo construyas a mano.** Hay dos SVG listos en `elementos/`, ambos con el slogan "Conversaciones que *fluyen*, negocios que *avanzan*" + logo, a 1080px de ancho:
  - **`footer-dark.svg`** — banda navy, slogan y logo en blanco. Cierre fuerte; el más usado, va bien tras un cuerpo claro.
  - **`footer-light.svg`** — línea sutil arriba, slogan y logo en azul/oscuro sobre fondo claro. Cuando la pieza es clara y no quieres una banda oscura al final.

  Embébelos **inline** y escálalos a ancho completo: contenedor con `line-height:0` y `.foot svg{width:100%;height:auto;display:block;}`. El SVG **ya trae el slogan y el logo** — no le agregues texto ni otro logo encima. (Por eso la frase de cierre va en Authentic dentro del SVG; no la repliques en HTML.)

  Solo construye un footer a mano si la pieza necesita algo extra (CTA, datos de contacto). En ese caso: fondo del color dominante (Core dark / Ads neutro, nunca naranjo), logo white, borde sutil de separación, alto ~50–90px.
- **HTML autónomo:** sin rutas locales (`file://`, relativas a imágenes); todo embebido en base64/inline.

---

## 8. Inventario de assets

### Fuentes (en `assets/`)
| Archivo | Uso |
|---------|-----|
| `authentic.b64` | Fuente Authentic en base64 → embeber en `@font-face` |
| `plusjakarta.b64` | Plus Jakarta Sans Variable (pesos 300–800) |
| `plusjakarta-italic.b64` | Plus Jakarta Sans Italic Variable |

**Cómo embeber en `<style>`:**
```python
# En Python, antes de escribir el HTML:
with open('vambe-brand/assets/authentic.b64') as f:
    auth_b64 = f.read().strip()
# Luego en el CSS del HTML:
# @font-face { font-family: 'Authentic'; src: url(data:font/ttf;base64,{auth_b64}) format('truetype'); }
```

### Logos (en `elementos/`)
| Archivo | Cuándo usar |
|---------|-------------|
| `logo.horizontal.white.svg` | Sobre fondo oscuro (hero, footer) — **más frecuente** |
| `logo.horizontal.dark-blue.svg` | Sobre fondo claro/blanco |
| `logo.horizontal.white-blue.svg` | Sobre fondo claro con isotipo en azul |
| `logo.horizontal.mono-dark.svg` | Monocromático oscuro — usos especiales |
| `logo.bajada.*` | Variantes con tagline "AI for Growth" debajo |
| `logo.wordmark.white/dark.svg` | Solo wordmark sin isotipo |
| `isotipo.svg` | Diamond shield solo — iconografía, favicons |
| `logo.powered-by.svg` | Para piezas de partners "Powered by Vambe" |
| `logo.vambe-live.svg` | Posts de webinar (tiene punto rojo LIVE) |
| `logo-vambe-ads-white.svg` / `logo-vambe-ads-dark.svg` | Sub-marca Vambe Ads (blanco para fondo oscuro / oscuro para claro) |

### Footers oficiales (en `elementos/`)
SVG completos con slogan + logo, 1080px de ancho. **Úsalos en vez de construir el footer a mano**
(ver §7.14). Embeber inline, escalar a ancho completo.

| `footer-dark.svg` | Banda navy, slogan/logo en blanco — cierre fuerte, el más usado |
| `footer-light.svg` | Línea sutil + slogan/logo oscuro sobre fondo claro |

### Tags de categoría (en `elementos/`)
`tag.alianza.svg` · `tag.blog.svg` · `tag.evento.svg` · `tag.product.update.svg`
`tag.vambe.jobs.svg` · `tag.vambe.life.svg` · `tag.vambe.lovers.svg` · `tag.webinar.svg`

Usar como SVG inline. El color de stroke es `#3676FF` — compatible con fondo claro.

### Cards de notificación (en `elementos/`) — solo referencia visual
`card.{precio,avatar,texto}.{claro,medio,oscuro}.svg` — NO embeber como imagen.
Construir con CSS usando los tokens. Regla de tono: foto oscura → card clara; foto clara → card oscura/media. Máx 2–3 por escena.

### Mockups (en `elementos/`)
| Archivo | Cuándo usar |
|---------|-------------|
| `mockup.phone.fill.light.svg` | Hero sobre fondo claro |
| `mockup.phone.fill.dark.svg` | Hero sobre fondo oscuro |
| `mockup.phone.glass.svg` | Efecto glassmorphism — premium |
| `mockup.phone.outline.svg` | Mínimalista, sin relleno |
| `mockup.phone.claro.svg` | Variante claro simple |
| `computer.fill.light.svg` | Desktop sobre fondo claro |
| `computer.glass.svg` | Desktop glassmorphism |
| `computer.rect.outline.dark.svg` | Desktop outline sobre oscuro |

Embeber como SVG inline (no `<img src="...">`). El contenido de la pantalla va construido en HTML dentro del área del mockup.

### Elementos decorativos (en `elementos/`)
| Archivo | Uso |
|---------|-----|
| `shield.gradient.dark.svg` | Decorativo fondo oscuro — esquina o watermark |
| `shield.gradient.light.svg` | Decorativo fondo claro |
| `shield.pattern.svg` | Fondo sutil con patrón de isotipo |
| `quote-mark.svg` | Abre un testimonial/cita |
| `squircle.filled.svg` | Referencia visual del contenedor de íconos |
| `frame.photo-circle.svg` | Marco circular con gradiente para foto de persona |
| `scribble.arrow.{1,2,3}.svg` | Flechas punteadas curvas entre slides de carrusel |
| `arrow.bubble.{blue,white}.svg` | Pill con flecha — "Desliza" / CTA suave |
| `dialog-balloon.{blue,light}.{left,right}.svg` | Globos de conversación para demos de chat |
| `slide-indicator.{short,long}.{light,medium,dark}.svg` | Indicadores de progreso en carruseles |
| `slide.pill.{light,dark}.svg` | Variante compacta del indicador |
| `bullet.{check,x,arrow,dot}.svg` | Bullets para listas — embeber inline |
| `carpeta-blue.svg` / `carpeta-white.svg` | Ícono de carpeta/documento |
| `boton.svg` | Referencia visual de botón — construir con CSS |

### Slogans "Desliza para ver" (en `elementos/slogans/`)
`slogan-hor.{centro,completo,der,frase,izq}.svg`
`slogan-ver.{centro,der,izq}.svg`
Usar en última slide de carrusel. Embeber inline.

### Logos de integración (en `elementos/`)
PNGs: `whatsapp.png` · `hubspot.tif.png` · `salesforce.png` · `slack.png`
`zoho.png` · `teams.png` · `google.analytics.png` · `rest.api.png`

SVGs: `logo petfamily.svg` · `celular.svg`

Para embeber en HTML: convertir a base64 con Python (`base64.b64encode(open(path,'rb').read()).decode()`).
Agregar nuevos logos a esta carpeta cuando se necesiten por pieza.

---

## 9. SOP de render y export

### Dependencias
```bash
pip install playwright pillow --break-system-packages
playwright install chromium
```

### Script de render (ver `scripts/render.py`)
El script recibe un HTML autónomo y produce PDF + PNG.

**Parámetros clave:**
- Ancho: `794px` (documentos) o `1080px` (social)
- `device_scale_factor=2` (retina — siempre)
- Esperar `document.fonts.ready` antes de screenshot
- `emulate_media(media="print")` antes de medir altura para PDF
- Altura del PDF = `footer.getBoundingClientRect().bottom − 15px`
- PDF sin márgenes: `margin={"top":"0","bottom":"0","left":"0","right":"0"}`
- CSS `@media print { body { padding: 0 !important; margin: 0 !important; } }`

### Pipeline de imágenes (fotos de personas/productos)
Cuando el usuario provee una imagen externa:
1. Recortar borde blanco sobrante con `PIL.ImageChops.difference`
2. Dejar fondo blanco puro
3. Downscale a máx 520px en el lado mayor
4. Guardar JPEG calidad 85
5. Convertir a base64 y embeber en `<img src="data:image/jpeg;base64,..."/>`

---

## 10. Instrucciones para producción de HTML autónomo

El HTML final debe ser **100% autónomo** — sin dependencias externas (salvo Google Fonts como fallback si se especifica).

**Checklist antes de entregar:**
- [ ] `@font-face` con Authentic y Plus Jakarta Sans embebidas en base64
- [ ] Variable `--sq` definida en `:root`
- [ ] Todas las imágenes embebidas en base64 (no rutas locales)
- [ ] SVGs de logos y elementos embebidos inline (no `<img src="file://...">`)
- [ ] `@media print` con padding/margin cero en body
- [ ] Azules verificados: ningún hue morado en bandas grandes
- [ ] Authentic usada en máximo 1 palabra/frase por pieza
- [ ] Logo presente en header y footer
- [ ] Altura del PDF calculada con el método `getBoundingClientRect().bottom − 15px`
