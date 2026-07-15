// demo 12 — LIVE RISO MIRROR: the webcam, cover-cropped to the canvas, run through
// dither → duotone for a live two-colour newsprint mirror. A metro drives a counter
// through hsl, slowly cycling the light colour's hue, so the palette drifts through
// the spectrum while you move. The browser asks for camera permission on open.
export const DEMO12 = {
  nodes: [
    { id: 1,  text: 'comment DEMO.12 // LIVE RISO MIRROR — needs camera', x: 60, y: 40, state: {} },
    // camera → riso finish
    { id: 2,  text: 'webcam 400 400 800 800',        x: 60,  y: 110, state: {} },
    { id: 3,  text: 'dither 2 3',                     x: 60,  y: 200, state: {} },
    { id: 4,  text: 'duotone #141432 #ff6a5a',        x: 60,  y: 280, state: {} },
    // animated light colour: metro → counter → hsl hue
    { id: 5,  text: 'loadbang',                       x: 420, y: 60,  state: {} },
    { id: 6,  text: 'toggle',                         x: 560, y: 60,  state: { on: true } },
    { id: 7,  text: 'metro 120',                      x: 420, y: 135, state: { on: true } },
    { id: 8,  text: 'counter 0 359 2',                x: 420, y: 210, state: {} },
    { id: 9,  text: '+ 350',                          x: 420, y: 285, state: {} },
    { id: 10, text: 'hsl 0 85 62',                    x: 420, y: 360, state: {} },
    // stage
    { id: 11, text: 'layer 1',                        x: 60,  y: 380, state: {} },
    { id: 12, text: 'canvas 800 800',                 x: 60,  y: 470, state: {} },
  ],
  conns: [
    { id: 20, from: { node: 2,  port: 0 }, to: { node: 3,  port: 0 }, type: 'draw' },
    { id: 21, from: { node: 3,  port: 0 }, to: { node: 4,  port: 0 }, type: 'draw' },
    { id: 22, from: { node: 4,  port: 0 }, to: { node: 11, port: 0 }, type: 'draw' },
    { id: 23, from: { node: 11, port: 0 }, to: { node: 12, port: 0 }, type: 'draw' },
    // animated light colour
    { id: 24, from: { node: 5,  port: 0 }, to: { node: 7,  port: 0 }, type: 'ctl' },
    { id: 25, from: { node: 6,  port: 0 }, to: { node: 7,  port: 0 }, type: 'ctl' },
    { id: 26, from: { node: 7,  port: 0 }, to: { node: 8,  port: 0 }, type: 'ctl' },
    // hue oscillates warm: counter 0..359 → +350 wraps into a warm band feeding hsl.h
    { id: 27, from: { node: 8,  port: 0 }, to: { node: 9,  port: 0 }, type: 'ctl' },
    { id: 28, from: { node: 9,  port: 0 }, to: { node: 10, port: 0 }, type: 'ctl' },
    { id: 29, from: { node: 10, port: 0 }, to: { node: 4,  port: 2 }, type: 'ctl' },
  ],
};
