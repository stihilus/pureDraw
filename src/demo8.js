// demo 8 — GENERATIVE SWISS POSTER
// one bang (or opening the patch) deals a new composition: every element snaps
// to the 100px grid via random -> * 100 -> +offset, the accent color comes from
// random -> hsl, the headline lands top or bottom. No photos — grid, geometry, type.
export const DEMO8 = {
  nodes: [
    { id: 1,  text: 'comment DEMO.8 // generative swiss poster — bng deals a new one', x: 60, y: 40, state: {} },
    { id: 2,  text: 'loadbang',                          x: 60,  y: 100, state: {} },
    { id: 3,  text: 'bng',                               x: 190, y: 95,  state: {} },
    { id: 4,  text: 'send regen',                        x: 60,  y: 180, state: {} },
    { id: 5,  text: 'receive regen',                     x: 60,  y: 260, state: {} },
    // accent color
    { id: 6,  text: 'random 360',                        x: 300, y: 110, state: {} },
    { id: 7,  text: 'hsl 0 85 55',                       x: 300, y: 190, state: {} },
    // rect x / y (grid-snapped)
    { id: 8,  text: 'random 6',                          x: 60,  y: 350, state: {} },
    { id: 9,  text: '* 100',                             x: 60,  y: 430, state: {} },
    { id: 10, text: '+ 150',                             x: 60,  y: 510, state: {} },
    { id: 11, text: 'random 5',                          x: 170, y: 350, state: {} },
    { id: 12, text: '* 100',                             x: 170, y: 430, state: {} },
    { id: 13, text: '+ 200',                             x: 170, y: 510, state: {} },
    // circle x / y
    { id: 14, text: 'random 6',                          x: 280, y: 350, state: {} },
    { id: 15, text: '* 100',                             x: 280, y: 430, state: {} },
    { id: 16, text: '+ 150',                             x: 280, y: 510, state: {} },
    { id: 17, text: 'random 5',                          x: 390, y: 350, state: {} },
    { id: 18, text: '* 100',                             x: 390, y: 430, state: {} },
    { id: 19, text: '+ 200',                             x: 390, y: 510, state: {} },
    // horizontal rule y
    { id: 20, text: 'random 7',                          x: 500, y: 350, state: {} },
    { id: 21, text: '* 100',                             x: 500, y: 430, state: {} },
    { id: 22, text: '+ 100',                             x: 500, y: 510, state: {} },
    // headline: top (140) or bottom (660)
    { id: 23, text: 'random 2',                          x: 610, y: 350, state: {} },
    { id: 24, text: '* 520',                             x: 610, y: 430, state: {} },
    { id: 25, text: '+ 140',                             x: 610, y: 510, state: {} },
    // the poster
    { id: 26, text: 'bg #ffffff',                        x: 760, y: 110, state: {} },
    { id: 27, text: 'circle 50 50 4 #b0b0b0',            x: 760, y: 190, state: {} },
    { id: 28, text: 'tile 8 8 100 100',                  x: 760, y: 270, state: {} },
    { id: 29, text: 'rect 400 400 300 300 #ff3300',      x: 760, y: 350, state: {} },
    { id: 30, text: 'circle 400 300 130 #000000',        x: 760, y: 430, state: {} },
    { id: 31, text: 'line 60 400 740 400 #000000 8',     x: 760, y: 510, state: {} },
    { id: 32, text: 'text PURE.DRAW 400 140 72 #000000', x: 300, y: 600, state: {} },
    { id: 33, text: 'text DEMO.8//GENERATIVE.SWISS 400 745 16 #000000', x: 300, y: 670, state: {} },
    { id: 34, text: 'layer 1',                           x: 60,  y: 620, state: {} },
    { id: 35, text: 'layer 2',                           x: 60,  y: 700, state: {} },
    { id: 36, text: 'layer 3 3',                         x: 60,  y: 780, state: {} },
    { id: 37, text: 'layer 4',                           x: 300, y: 750, state: {} },
    { id: 38, text: 'canvas 800 800',                    x: 500, y: 780, state: {} },
  ],
  conns: [
    { id: 40, from: { node: 2,  port: 0 }, to: { node: 4,  port: 0 }, type: 'ctl' },
    { id: 41, from: { node: 3,  port: 0 }, to: { node: 4,  port: 0 }, type: 'ctl' },
    // regen fans out to every random
    { id: 42, from: { node: 5,  port: 0 }, to: { node: 6,  port: 0 }, type: 'ctl' },
    { id: 43, from: { node: 5,  port: 0 }, to: { node: 8,  port: 0 }, type: 'ctl' },
    { id: 44, from: { node: 5,  port: 0 }, to: { node: 11, port: 0 }, type: 'ctl' },
    { id: 45, from: { node: 5,  port: 0 }, to: { node: 14, port: 0 }, type: 'ctl' },
    { id: 46, from: { node: 5,  port: 0 }, to: { node: 17, port: 0 }, type: 'ctl' },
    { id: 47, from: { node: 5,  port: 0 }, to: { node: 20, port: 0 }, type: 'ctl' },
    { id: 48, from: { node: 5,  port: 0 }, to: { node: 23, port: 0 }, type: 'ctl' },
    // accent: random hue -> hsl -> rect fill
    { id: 49, from: { node: 6,  port: 0 }, to: { node: 7,  port: 0 }, type: 'ctl' },
    { id: 50, from: { node: 7,  port: 0 }, to: { node: 29, port: 4 }, type: 'ctl' },
    // rect x / y
    { id: 51, from: { node: 8,  port: 0 }, to: { node: 9,  port: 0 }, type: 'ctl' },
    { id: 52, from: { node: 9,  port: 0 }, to: { node: 10, port: 0 }, type: 'ctl' },
    { id: 53, from: { node: 10, port: 0 }, to: { node: 29, port: 0 }, type: 'ctl' },
    { id: 54, from: { node: 11, port: 0 }, to: { node: 12, port: 0 }, type: 'ctl' },
    { id: 55, from: { node: 12, port: 0 }, to: { node: 13, port: 0 }, type: 'ctl' },
    { id: 56, from: { node: 13, port: 0 }, to: { node: 29, port: 1 }, type: 'ctl' },
    // circle x / y
    { id: 57, from: { node: 14, port: 0 }, to: { node: 15, port: 0 }, type: 'ctl' },
    { id: 58, from: { node: 15, port: 0 }, to: { node: 16, port: 0 }, type: 'ctl' },
    { id: 59, from: { node: 16, port: 0 }, to: { node: 30, port: 0 }, type: 'ctl' },
    { id: 60, from: { node: 17, port: 0 }, to: { node: 18, port: 0 }, type: 'ctl' },
    { id: 61, from: { node: 18, port: 0 }, to: { node: 19, port: 0 }, type: 'ctl' },
    { id: 62, from: { node: 19, port: 0 }, to: { node: 30, port: 1 }, type: 'ctl' },
    // horizontal rule: same y into both ends
    { id: 63, from: { node: 20, port: 0 }, to: { node: 21, port: 0 }, type: 'ctl' },
    { id: 64, from: { node: 21, port: 0 }, to: { node: 22, port: 0 }, type: 'ctl' },
    { id: 65, from: { node: 22, port: 0 }, to: { node: 31, port: 1 }, type: 'ctl' },
    { id: 66, from: { node: 22, port: 0 }, to: { node: 31, port: 3 }, type: 'ctl' },
    // headline y: top or bottom
    { id: 67, from: { node: 23, port: 0 }, to: { node: 24, port: 0 }, type: 'ctl' },
    { id: 68, from: { node: 24, port: 0 }, to: { node: 25, port: 0 }, type: 'ctl' },
    { id: 69, from: { node: 25, port: 0 }, to: { node: 32, port: 2 }, type: 'ctl' },
    // draw chains
    { id: 70, from: { node: 26, port: 0 }, to: { node: 34, port: 0 }, type: 'draw' },
    { id: 71, from: { node: 27, port: 0 }, to: { node: 28, port: 0 }, type: 'draw' },
    { id: 72, from: { node: 28, port: 0 }, to: { node: 35, port: 0 }, type: 'draw' },
    { id: 73, from: { node: 29, port: 0 }, to: { node: 36, port: 0 }, type: 'draw' },
    { id: 74, from: { node: 30, port: 0 }, to: { node: 36, port: 1 }, type: 'draw' },
    { id: 75, from: { node: 31, port: 0 }, to: { node: 36, port: 2 }, type: 'draw' },
    { id: 76, from: { node: 32, port: 0 }, to: { node: 37, port: 0 }, type: 'draw' },
    { id: 77, from: { node: 33, port: 0 }, to: { node: 37, port: 1 }, type: 'draw' },
    { id: 78, from: { node: 34, port: 0 }, to: { node: 38, port: 0 }, type: 'draw' },
    { id: 79, from: { node: 35, port: 0 }, to: { node: 38, port: 0 }, type: 'draw' },
    { id: 80, from: { node: 36, port: 0 }, to: { node: 38, port: 0 }, type: 'draw' },
    { id: 81, from: { node: 37, port: 0 }, to: { node: 38, port: 0 }, type: 'draw' },
  ],
};
