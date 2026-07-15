// demo 5 — IMAGE: a photo from a URL, with a white circle in blend difference
// punching a negative hole through it. The canvas re-renders when the image loads.
export const DEMO5 = {
  nodes: [
    { id: 1,  text: 'comment DEMO.5 // image from URL + blend difference',          x: 60,  y: 40,  state: {} },
    { id: 2,  text: 'image https://picsum.photos/id/1069/600/600 400 360 600 600',  x: 60,  y: 110, state: {} },
    { id: 3,  text: 'circle 400 360 180 #ffffff',                                   x: 60,  y: 200, state: {} },
    { id: 4,  text: 'blend difference',                                             x: 60,  y: 290, state: {} },
    { id: 5,  text: 'text PURE.DRAW 400 720 40 #ffffff',                            x: 60,  y: 380, state: {} },
    { id: 6,  text: 'bg #000000',                                                   x: 60,  y: 470, state: {} },
    { id: 7,  text: 'layer 1',                                                      x: 100, y: 580, state: {} },
    { id: 8,  text: 'layer 2',                                                      x: 280, y: 580, state: {} },
    { id: 9,  text: 'layer 3',                                                      x: 460, y: 580, state: {} },
    { id: 10, text: 'layer 4',                                                      x: 640, y: 580, state: {} },
    { id: 11, text: 'canvas 800 800',                                               x: 300, y: 670, state: {} },
  ],
  conns: [
    { id: 20, from: { node: 6,  port: 0 }, to: { node: 7,  port: 0 }, type: 'draw' },
    { id: 21, from: { node: 2,  port: 0 }, to: { node: 8,  port: 0 }, type: 'draw' },
    { id: 22, from: { node: 3,  port: 0 }, to: { node: 4,  port: 0 }, type: 'draw' },
    { id: 23, from: { node: 4,  port: 0 }, to: { node: 9,  port: 0 }, type: 'draw' },
    { id: 24, from: { node: 5,  port: 0 }, to: { node: 10, port: 0 }, type: 'draw' },
    { id: 25, from: { node: 7,  port: 0 }, to: { node: 11, port: 0 }, type: 'draw' },
    { id: 26, from: { node: 8,  port: 0 }, to: { node: 11, port: 0 }, type: 'draw' },
    { id: 27, from: { node: 9,  port: 0 }, to: { node: 11, port: 0 }, type: 'draw' },
    { id: 28, from: { node: 10, port: 0 }, to: { node: 11, port: 0 }, type: 'draw' },
  ],
};
