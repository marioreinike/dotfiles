---
name: brand-format
description: Aplica la identidad visual de Vambe a documentos PPTX, DOCX, XLSX y HTML. Usa esta skill cuando el usuario quiera crear presentaciones, documentos Word, planillas Excel o páginas HTML con el branding de Vambe. También aplica cuando pide "hacerlo bonito", "ponerle el estilo de Vambe", "armar una presentación", "formatear con la marca", o cualquier tarea que involucre generar archivos con identidad visual corporativa — incluso si no dice "brand" explícitamente.
---

# Brand Format

Aplica la guía de marca de Vambe a cualquier documento. Soporta presentaciones (PPTX), documentos Word (DOCX), planillas Excel (XLSX) y páginas HTML.

## Paso 1 — Leer la guía de marca

Lee `references/brand.md` para obtener los colores, tipografía, logos y tono de voz actualizados.

## Paso 2 — Identificar qué hacer

- Si el usuario pasó un archivo como argumento (`$ARGUMENTS`), úsalo como objetivo.
- Si pidió crear un documento nuevo, confirma el formato si no lo especificó.
- Si no hay contexto claro, pregunta qué archivo formatear o crear.

## Paso 3 — Aplicar la marca según el formato

### Para PPTX (presentaciones)

Lee `references/pptx-guide.md` para ver los 29 tipos de slide disponibles en el template y cómo manipularlos con `python-pptx`.

- Template base: `assets/Vambe Presentation Template.pptx`
- Usa `python-pptx` para crear o modificar archivos.
- Siempre incluir portada (slide 1) y cierre (slide 25) del template.
- El template usa decoraciones geométricas azul claro — mantener ese estilo.
- Para crear una presentación nueva: copiar slides del template, eliminar los que no se usen, y reemplazar el texto placeholder preservando el formato.

### Para DOCX (Word)

Usa `python-docx`. Aplica:
- Font: Plus Jakarta Sans en todo el documento.
- Headings: Bold, color #2C66E2.
- Body: Regular, color #020617, 11pt.
- Espaciado entre párrafos: 6pt after.
- Márgenes: 2.5cm en todos los lados.
- Header: `assets/logo-light.png` alineado a la izquierda.
- Footer: "Confidencial — Vambe" centrado, 8pt, color #64748B.
- Tablas: header row con fondo #4977F5 y texto blanco, bordes #E1EAFE.

### Para XLSX (Excel)

Usa `openpyxl`. Aplica:
- Font: Plus Jakarta Sans.
- Header row: fondo #4977F5, texto blanco Bold.
- Body rows: color #020617, 11pt Regular.
- Bordes: thin #E1EAFE.
- Filas alternas: fondo #F0F5FF.
- Freeze panes en header row.
- Auto-fit column width.

### Para HTML

- Import Google Fonts: Plus Jakarta Sans (400, 500, 600, 700).
- Aplicar colores del brand en CSS.
- Border radius: 12px en cards, botones y contenedores.
- Estilo minimal con espaciado generoso.

## Paso 4 — Dependencias

Si el formato requiere Python (PPTX/DOCX/XLSX), verifica que la librería esté instalada. Si no:

```bash
pip install python-pptx python-docx openpyxl
```

## Paso 5 — Guardar y reportar

Guarda el archivo donde el usuario indique (o en el mismo path si era un archivo existente). Muestra un resumen breve: qué cambios se aplicaron y dónde quedó el archivo.

## Tono de voz

NO cambies el contenido de texto a menos que el usuario lo pida explícitamente. Si pide revisar el tono, aplica: directo, simple, accionable, cercano pero profesional, orientado al negocio del cliente. Tuteamos. Sin jerga técnica innecesaria.

## Limitaciones

- No puede incrustar fuentes en PPTX/DOCX (Plus Jakarta Sans debe estar instalada en la máquina del usuario para verse correctamente).
- No puede editar imágenes rasterizadas dentro de los documentos.
- Para PPTX, trabaja con shapes por índice — si el template cambia, los índices pueden cambiar.
