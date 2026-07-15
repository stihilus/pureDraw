# PURE.DRAW

A node-based playground for generative graphics, right in your browser. Patch together boxes and cables — Pure Data / Max style — and watch the canvas draw itself.

No build step, no dependencies, no framework. Just open it and patch.

## Quick start

```bash
git clone https://github.com/stihilus/pureDraw.git
cd pureDraw
python3 -m http.server 8000   # any static server works
```

Open `http://localhost:8000`, then pick something from the **DEMOS** menu to see how patches work.

## How it works

- **Nodes** are boxes with a type and arguments — `rect 400 430 220 220 #000000` draws a rectangle.
- **Cables** connect outlets (bottom) to inlets (top). Thin cables carry control messages (numbers, strings, bangs); thick cables carry draw commands.
- Draw chains flow into **layer** nodes, layers flow into a **canvas** node, and the canvas renders in the preview panel.
- Double-click empty space to create a node and just start typing — autocomplete and inline help guide you.

## Node categories

| Category | Nodes |
|----------|-------|
| **UI** | bang, number, string, toggle, sliders, mouse, key, comment |
| **CTRL** | metro, counter, random, noise, sin/cos, ramp, math and logic operators, moses, send/receive… |
| **DRAW** | bg, gradient, rect, circle, ellipse, line, text, polygon, image, webcam, feedback, stamp, tile, mirror, rotate, scale, blend, dither, duotone, posterize, and more |
| **SYSTEM** | layer, canvas, send, receive |

The full reference lives in the app under **MANUAL**, with per-node help on right-click.

## Shortcuts

| Keys | Action |
|------|--------|
| ⌘Z / ⌘⇧Z | undo / redo |
| ⌘D | duplicate selection |
| Del / Backspace | delete selection |
| double-click | new node / edit node |
| drag on empty space | marquee select |
| two-finger drag | pan |
| pinch / wheel | zoom |
| ⌘0 | reset zoom |

## Patches

- **FILE → SAVE.PATCH / LOAD.PATCH** — patches are plain JSON (`.puredraw.json`), easy to share and diff.
- Your work is auto-saved to the browser between sessions.
- **FILE → EXPORT.IMAGE** — render the canvas to a PNG.

## Demos

Twelve built-in patches, from a hello-world rectangle to a webcam riso mirror: HELLO, SINE.LOOP, MANDALA, PATTERN, IMAGE, ORGANIC, CLOCK, POSTER, KALEIDOSCOPE, FLUX, FEEDBACK.TUNNEL, RISO.MIRROR.

## Tech

Vanilla JavaScript (ES modules), a single CSS file, and the Canvas 2D API. That's it.
