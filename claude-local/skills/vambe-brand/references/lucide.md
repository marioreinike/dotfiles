# Íconos Lucide

Los íconos de Vambe son **Lucide** (lucide.dev). NO se dibujan a mano ni se inventan paths:
los 1962 íconos están en `assets/lucide-icons.json` (un solo archivo) y se traen por nombre con el helper.

## Cómo usarlos

Usa el helper `scripts/lucide.py` — devuelve el SVG listo para pegar inline:

```python
import sys; sys.path.insert(0, 'vambe-brand/scripts')
from lucide import icon

svg = icon('rocket', size=28)                          # hereda color del contenedor
svg = icon('shield-check', size=24, color='#437AEF')   # color fijo
```

Nombres en kebab-case igual que en lucide.dev: `message-circle`, `trending-up`,
`shopping-cart`, `calendar-check`, `bot`, `maximize`, `users`, `lightbulb`, etc.
Si el nombre no existe, el helper sugiere los más parecidos.

## Color — es solo CSS

Los SVG vienen con `stroke="currentColor"`, así que el color lo manda el `color` del
contenedor. No hace falta editar el SVG.

- Vambe Core → `#437AEF` (sobre claro) / `#5A8CF6` (sobre oscuro)
- Vambe Ads → `#F96F07`

## Contenedor: squircle (opcional)

El patrón por defecto es el ícono dentro de un **squircle** (`squircle.filled` / `squircle.outlined`):

```html
<div class="icon-wrap"><!-- squircle de fondo + icon() centrado --></div>
```

**Pero el squircle es opcional.** Si la escena ya está visualmente cargada —muchas cards,
fotos, fondos con blob— el squircle suma peso y satura. En ese caso usa el **ícono solo,
sin fondo**, directo sobre la superficie. Criterio: el squircle ayuda cuando el ícono
necesita destacar sobre un fondo; estorba cuando la composición ya está densa.

## Reglas

- Stroke 2 (default de Lucide). No engrosar salvo intención clara.
- Un ícono = un concepto. No mezclar estilos de otras librerías.
- Tamaño coherente entre íconos de una misma fila/sección.
