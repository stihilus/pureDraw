// demo 2 — the PD loop: click the bng!
// bng -> until 100 -> counter 0..99 gives an index; the index drives
// text.x (i * 7.2 + 40) and text.y (sin(i * 15°) * 200 + 400);
// the same until also bangs stamp.trig, freezing a copy per iteration:
// 100 words along a sine wave. The bng clears old stamps first (cable order!).
export const DEMO2 = {
  nodes: [
    { id: 1,  text: 'bng',                          x: 90,  y: 70,  state: {} },
    { id: 16, text: 'loadbang',                     x: 190, y: 70,  state: {} },
    { id: 2,  text: 'until 100',                    x: 80,  y: 160, state: {} },
    { id: 3,  text: 'counter 0 99 1',               x: 80,  y: 250, state: {} },
    { id: 4,  text: '* 7.2',                        x: 40,  y: 350, state: {} },
    { id: 5,  text: '+ 40',                         x: 40,  y: 430, state: {} },
    { id: 6,  text: '* 15',                         x: 230, y: 350, state: {} },
    { id: 7,  text: 'sin',                          x: 250, y: 430, state: {} },
    { id: 8,  text: '* 200',                        x: 230, y: 510, state: {} },
    { id: 9,  text: '+ 400',                        x: 230, y: 590, state: {} },
    { id: 10, text: 'text PURE 400 400 12 #000000', x: 420, y: 300, state: {} },
    { id: 11, text: 'stamp',                        x: 470, y: 670, state: {} },
    { id: 12, text: 'bg #ffffff',                   x: 650, y: 500, state: {} },
    { id: 13, text: 'layer 1',                      x: 660, y: 600, state: {} },
    { id: 14, text: 'layer 2',                      x: 660, y: 690, state: {} },
    { id: 15, text: 'canvas 800 800',               x: 620, y: 780, state: {} },
  ],
  conns: [
    // loadbang runs the same sequence once, when the patch opens
    { id: 18, from: { node: 16, port: 0 }, to: { node: 11, port: 2 }, type: 'ctl' },
    { id: 19, from: { node: 16, port: 0 }, to: { node: 2,  port: 0 }, type: 'ctl' },
    // bng: FIRST clear the old stamps, THEN run the loop (cables fire in creation order)
    { id: 20, from: { node: 1,  port: 0 }, to: { node: 11, port: 2 }, type: 'ctl' },
    { id: 21, from: { node: 1,  port: 0 }, to: { node: 2,  port: 0 }, type: 'ctl' },
    // until: FIRST move the text (whole counter chain), THEN stamp it
    { id: 22, from: { node: 2,  port: 0 }, to: { node: 3,  port: 0 }, type: 'ctl' },
    { id: 23, from: { node: 2,  port: 0 }, to: { node: 11, port: 1 }, type: 'ctl' },
    // x = i * 7.2 + 40
    { id: 24, from: { node: 3,  port: 0 }, to: { node: 4,  port: 0 }, type: 'ctl' },
    { id: 25, from: { node: 4,  port: 0 }, to: { node: 5,  port: 0 }, type: 'ctl' },
    { id: 26, from: { node: 5,  port: 0 }, to: { node: 10, port: 1 }, type: 'ctl' },
    // y = sin(i * 15°) * 200 + 400
    { id: 27, from: { node: 3,  port: 0 }, to: { node: 6,  port: 0 }, type: 'ctl' },
    { id: 28, from: { node: 6,  port: 0 }, to: { node: 7,  port: 0 }, type: 'ctl' },
    { id: 29, from: { node: 7,  port: 0 }, to: { node: 8,  port: 0 }, type: 'ctl' },
    { id: 30, from: { node: 8,  port: 0 }, to: { node: 9,  port: 0 }, type: 'ctl' },
    { id: 31, from: { node: 9,  port: 0 }, to: { node: 10, port: 2 }, type: 'ctl' },
    // draw chain
    { id: 32, from: { node: 10, port: 0 }, to: { node: 11, port: 0 }, type: 'draw' },
    { id: 33, from: { node: 12, port: 0 }, to: { node: 13, port: 0 }, type: 'draw' },
    { id: 34, from: { node: 11, port: 0 }, to: { node: 14, port: 0 }, type: 'draw' },
    { id: 35, from: { node: 13, port: 0 }, to: { node: 15, port: 0 }, type: 'draw' },
    { id: 36, from: { node: 14, port: 0 }, to: { node: 15, port: 0 }, type: 'draw' },
  ],
};
