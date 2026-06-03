#!/usr/bin/env python3
"""
Vambe Brand — Helper de íconos Lucide
=====================================
Devuelve el SVG de un ícono Lucide listo para pegar INLINE en el HTML.
Los 1962 íconos viven en un único archivo: `assets/lucide-icons.json`
(un solo archivo para no superar el límite de archivos del skill).

Como el stroke es currentColor, el color del ícono se controla con el
`color` del elemento contenedor en CSS — o pásalo explícito.

USO EN PYTHON (al generar la pieza):
    import sys; sys.path.insert(0, 'vambe-brand/scripts')
    from lucide import icon
    svg = icon('rocket', size=28)                          # hereda color del padre
    svg = icon('shield-check', size=24, color='#437AEF')   # color fijo

USO POR CLI:
    python vambe-brand/scripts/lucide.py rocket
    python vambe-brand/scripts/lucide.py shield-check --size 32 --color '#F96F07'

NOMBRES: los de lucide.dev en kebab-case ('message-circle', 'trending-up',
'shopping-cart'). Si no existe, lanza error con sugerencias.
"""

import re
import sys
import json
import difflib
from pathlib import Path

_JSON = Path(__file__).parent.parent / "assets" / "lucide-icons.json"
ICONS = json.loads(_JSON.read_text(encoding="utf-8"))


def icon(name: str, size: int = 24, color: str | None = None,
         stroke: float = 2, cls: str = "") -> str:
    """Devuelve el SVG inline de un ícono Lucide.

    name  : nombre kebab-case (ej. 'rocket', 'message-circle')
    size  : ancho/alto en px
    color : hex opcional. Si None, hereda `currentColor` del contenedor.
    stroke: grosor del trazo (Lucide usa 2)
    cls   : clases CSS extra para el <svg>
    """
    if name not in ICONS:
        sugg = difflib.get_close_matches(name, ICONS.keys(), n=5)
        hint = f" ¿Quisiste decir: {', '.join(sugg)}?" if sugg else ""
        raise ValueError(f"Ícono Lucide '{name}' no existe.{hint}")

    svg = ICONS[name]
    svg = re.sub(r'width="\d+"', f'width="{size}"', svg, count=1)
    svg = re.sub(r'height="\d+"', f'height="{size}"', svg, count=1)
    svg = re.sub(r'stroke-width="[^"]*"', f'stroke-width="{stroke}"', svg)
    if color:
        svg = svg.replace('stroke="currentColor"', f'stroke="{color}"')
    if cls:
        svg = svg.replace('class="lucide', f'class="{cls} lucide', 1)
    return svg


def _available():
    return sorted(ICONS.keys())


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description="Imprime un ícono Lucide inline.")
    ap.add_argument("name")
    ap.add_argument("--size", type=int, default=24)
    ap.add_argument("--color", default=None)
    ap.add_argument("--stroke", type=float, default=2)
    a = ap.parse_args()
    try:
        print(icon(a.name, size=a.size, color=a.color, stroke=a.stroke))
    except ValueError as e:
        sys.exit(str(e))
