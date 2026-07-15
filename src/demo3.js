// demo 3 — mandala: click the bng!
// t b b makes the order explicit (right outlet FIRST): clear the stamp, then run the loop.
// until 24 -> counter 0..23 -> * 15 drives rotate.deg: the hexagon outline is rotated
// around the canvas center in 15° steps and stamped each time -> a 24-fold mandala.
export const DEMO3 = {
  nodes: [
    { id: 1,  text: 'bng',                                    x: 90,  y: 70,  state: {} },
    { id: 13, text: 'loadbang',                               x: 190, y: 70,  state: {} },
    { id: 2,  text: 't b b',                                  x: 90,  y: 155, state: {} },
    { id: 3,  text: 'until 24',                               x: 60,  y: 240, state: {} },
    { id: 4,  text: 'counter 0 23 1',                         x: 60,  y: 325, state: {} },
    { id: 5,  text: '* 15',                                   x: 60,  y: 415, state: {} },
    { id: 6,  text: 'polygon 400 170 70 6 0 none #000000 3',  x: 280, y: 240, state: {} },
    { id: 7,  text: 'rotate 0 400 400',                       x: 280, y: 330, state: {} },
    { id: 8,  text: 'stamp',                                  x: 280, y: 430, state: {} },
    { id: 9,  text: 'bg #ffffff',                             x: 60,  y: 520, state: {} },
    { id: 10, text: 'layer 1',                                x: 80,  y: 610, state: {} },
    { id: 11, text: 'layer 2',                                x: 300, y: 610, state: {} },
    { id: 12, text: 'canvas 800 800',                         x: 180, y: 700, state: {} },
  ],
  conns: [
    { id: 20, from: { node: 1, port: 0 }, to: { node: 2,  port: 0 }, type: 'ctl' },
    // loadbang draws the mandala as soon as the patch opens (t b b handles the order)
    { id: 33, from: { node: 13, port: 0 }, to: { node: 2,  port: 0 }, type: 'ctl' },
    // t b b: RIGHT outlet fires first (clear), LEFT second (loop) — order is explicit,
    // no matter when these cables were made
    { id: 21, from: { node: 2, port: 1 }, to: { node: 8,  port: 2 }, type: 'ctl' },
    { id: 22, from: { node: 2, port: 0 }, to: { node: 3,  port: 0 }, type: 'ctl' },
    // until: move first (counter chain), stamp second
    { id: 23, from: { node: 3, port: 0 }, to: { node: 4,  port: 0 }, type: 'ctl' },
    { id: 24, from: { node: 3, port: 0 }, to: { node: 8,  port: 1 }, type: 'ctl' },
    { id: 25, from: { node: 4, port: 0 }, to: { node: 5,  port: 0 }, type: 'ctl' },
    { id: 26, from: { node: 5, port: 0 }, to: { node: 7,  port: 1 }, type: 'ctl' },
    // draw chain: polygon -> rotate -> stamp -> layer 2
    { id: 27, from: { node: 6, port: 0 }, to: { node: 7,  port: 0 }, type: 'draw' },
    { id: 28, from: { node: 7, port: 0 }, to: { node: 8,  port: 0 }, type: 'draw' },
    { id: 29, from: { node: 9, port: 0 }, to: { node: 10, port: 0 }, type: 'draw' },
    { id: 30, from: { node: 8, port: 0 }, to: { node: 11, port: 0 }, type: 'draw' },
    { id: 31, from: { node: 10, port: 0 }, to: { node: 12, port: 0 }, type: 'draw' },
    { id: 32, from: { node: 11, port: 0 }, to: { node: 12, port: 0 }, type: 'draw' },
  ],
};
