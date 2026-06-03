#!/usr/bin/env python3
"""
Vambe Brand — Render script
============================
Toma un HTML generado por el skill (con placeholders de fuentes) y exporta:
  - PDF de página continua sin márgenes  → para documentos / onepagers
  - PNG a resolución 2x (retina)         → para posts / infografías de social

USO:
  python render.py pieza.html                          # auto-detecta tipo
  python render.py pieza.html --tipo documento         # fuerza PDF
  python render.py pieza.html --tipo social            # fuerza PNG (4:5 por defecto)
  python render.py pieza.html --tipo social --formato cuadrado
  python render.py pieza.html --tipo social --formato story
  python render.py pieza.html --out /ruta/salida       # ruta custom (sin extensión)

DEPENDENCIAS:
  pip install playwright pillow --break-system-packages
  playwright install chromium

PLACEHOLDERS en el HTML (render.py los reemplaza automáticamente):
  AUTHENTIC_B64            → fuente Authentic
  PLUSJAKARTA_B64          → Plus Jakarta Sans Variable
  PLUSJAKARTA_ITALIC_B64   → Plus Jakarta Sans Italic Variable

DETECCIÓN AUTOMÁTICA DE TIPO:
  El HTML debe incluir uno de estos comentarios cerca del <body>:
    <!-- VAMBE:DOCUMENTO -->   → exporta PDF
    <!-- VAMBE:SOCIAL -->      → exporta PNG
  Si no hay comentario, se intenta detectar por ancho de canvas.
"""

import argparse
import os
import sys
from pathlib import Path

# ── Rutas ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR  = Path(__file__).parent
SKILL_DIR   = SCRIPT_DIR.parent
ASSETS_DIR  = SKILL_DIR / "assets"


# ── Utilidades ─────────────────────────────────────────────────────────────────

def embed_fonts(html: str) -> str:
    """Reemplaza los 3 placeholders de fuente con el contenido base64 real."""
    placeholders = {
        "AUTHENTIC_B64":          ASSETS_DIR / "authentic.b64",
        "PLUSJAKARTA_B64":        ASSETS_DIR / "plusjakarta.b64",
        "PLUSJAKARTA_ITALIC_B64": ASSETS_DIR / "plusjakarta-italic.b64",
    }
    for key, path in placeholders.items():
        if key in html:
            with open(path, "r") as f:
                html = html.replace(key, f.read().strip())
    return html


def detect_tipo(html: str) -> str:
    """Detecta tipo de pieza por comentario o por ancho de canvas."""
    if "<!-- VAMBE:SOCIAL -->"    in html: return "social"
    if "<!-- VAMBE:DOCUMENTO -->" in html: return "documento"
    # Fallback por ancho
    if "width:1080px" in html or "width: 1080px" in html: return "social"
    return "documento"


# ── Render ─────────────────────────────────────────────────────────────────────

FORMATOS_SOCIAL = {
    "4x5":      (1080, 1350),   # IG feed estándar
    "cuadrado": (1080, 1080),   # IG / LinkedIn cuadrado
    "story":    (1080, 1920),   # IG / WhatsApp story
    "banner":   (1584,  396),   # LinkedIn banner
    "wide":     (1080,  566),   # LinkedIn post wide aprox.
}


def render_documento(page, out_path: str):
    """
    Exporta PDF de página continua sin márgenes.
    Altura = bottom del footer - 15px (Chromium imprime ~15px más corto que el DOM).
    """
    page.emulate_media(media="print")

    height = page.evaluate("""() => {
        // Busca el footer canónico; si no existe usa el body
        const el = document.querySelector('.footer, [data-section="footer"], footer')
                || document.body;
        return Math.ceil(el.getBoundingClientRect().bottom) - 15;
    }""")

    if height < 100:
        # Fallback: altura total del documento
        height = page.evaluate("() => document.body.scrollHeight - 15")

    page.pdf(
        path=out_path,
        width="794px",
        height=f"{max(height, 400)}px",
        print_background=True,
        margin={"top": "0", "bottom": "0", "left": "0", "right": "0"},
    )
    print(f"  → Altura calculada: {height}px")


def render_social(page, out_path: str, formato: str = "4x5"):
    """Exporta PNG del canvas a resolución 2x (device_scale_factor ya está en 2)."""
    w, h = FORMATOS_SOCIAL.get(formato, (1080, 1350))
    page.set_viewport_size({"width": w, "height": h})
    # Re-navegar para recalcular layout con el nuevo viewport
    page.reload()
    page.wait_for_function("document.fonts.ready")
    page.wait_for_timeout(200)
    page.screenshot(path=out_path, full_page=False, clip={"x":0,"y":0,"width":w,"height":h})


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Vambe Brand Render — HTML → PDF o PNG"
    )
    parser.add_argument("html",
        help="Ruta al archivo HTML a renderizar")
    parser.add_argument("--tipo", choices=["documento", "social"],
        help="Fuerza tipo de output (si no, se auto-detecta)")
    parser.add_argument("--formato", default="4x5",
        choices=list(FORMATOS_SOCIAL.keys()),
        help="Formato para social (default: 4x5 = 1080×1350)")
    parser.add_argument("--out",
        help="Ruta del archivo de salida sin extensión (default: mismo nombre que el HTML)")
    args = parser.parse_args()

    # ── Cargar HTML ──
    html_path = Path(args.html).resolve()
    if not html_path.exists():
        print(f"✗ Error: no se encontró '{html_path}'")
        sys.exit(1)

    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    print(f"▸ Procesando: {html_path.name}")

    # ── Embeber fuentes ──
    html_final = embed_fonts(html)

    # ── Detectar tipo ──
    tipo = args.tipo or detect_tipo(html_final)
    print(f"▸ Tipo detectado: {tipo}", "(forzado)" if args.tipo else "(auto)")

    # ── Guardar HTML autónomo temporal ──
    stem      = args.out or str(html_path.with_suffix(""))
    tmp_html  = html_path.parent / (html_path.stem + "._render_tmp.html")
    with open(tmp_html, "w", encoding="utf-8") as f:
        f.write(html_final)

    # ── Guardar copia del HTML autónomo final (sin fuentes externas) ──
    autonomous_html = stem + "_autonomous.html"
    with open(autonomous_html, "w", encoding="utf-8") as f:
        f.write(html_final)
    print(f"▸ HTML autónomo guardado: {Path(autonomous_html).name}")

    # ── Playwright ──
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("✗ Playwright no instalado. Ejecuta:")
        print("  pip install playwright --break-system-packages && playwright install chromium")
        tmp_html.unlink(missing_ok=True)
        sys.exit(1)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(device_scale_factor=2)
        page    = context.new_page()

        print("▸ Abriendo en Chromium...")
        page.goto(f"file://{tmp_html}")
        page.wait_for_function("document.fonts.ready")
        page.wait_for_timeout(400)  # pausa para cualquier CSS transition / paint

        if tipo == "documento":
            out_file = stem + ".pdf"
            print("▸ Exportando PDF...")
            render_documento(page, out_file)
            print(f"✓ PDF listo: {out_file}")

        else:  # social
            out_file = stem + f"_{args.formato}.png"
            print(f"▸ Exportando PNG ({args.formato} = {FORMATOS_SOCIAL[args.formato][0]}×{FORMATOS_SOCIAL[args.formato][1]})...")
            render_social(page, out_file, args.formato)
            print(f"✓ PNG listo: {out_file}")

        browser.close()

    # ── Limpiar temporal ──
    tmp_html.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
