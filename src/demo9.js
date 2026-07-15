// demo 9 — KALEIDOSCOPE: a living light-painting, a tour of the whole toolkit.
// metro -> counter is the clock. t b v v v fans one frame into an ordered burst:
// radius, then position, then colour, then the stamp — so every frozen copy is
// correct. A dot rides a rose curve (r = 160 + 110·sin), its hue cycles through
// hsl, stamp leaves a 260-point rainbow ribbon, and mirror x + mirror y fold it
// into four-fold symmetry. A white ring pulses in the centre. It runs by itself.
export const DEMO9 = {
  nodes: [
    { id: 1,  text: 'comment DEMO.9 // KALEIDOSCOPE — runs by itself', x: 60, y: 40, state: {} },
    // motor
    { id: 2,  text: 'toggle',              x: 210, y: 95,  state: { on: true } },
    { id: 3,  text: 'loadbang',            x: 60,  y: 100, state: {} },
    { id: 4,  text: 'metro 33',            x: 60,  y: 175, state: { on: true } },
    { id: 5,  text: 'counter 0 1000000 1', x: 60,  y: 250, state: {} },
    { id: 6,  text: 'send phase',          x: 60,  y: 330, state: {} },
    // main frame sequencer
    { id: 7,  text: 'receive phase',       x: 60,  y: 420, state: {} },
    { id: 8,  text: 't b v v v',           x: 60,  y: 500, state: {} },
    // colour (t outlet 3, fires first)
    { id: 9,  text: '* 3',                 x: 300, y: 110, state: {} },
    { id: 10, text: 'hsl 0 85 55',         x: 300, y: 190, state: {} },
    // radius (t outlet 2)
    { id: 11, text: '* 9',                 x: 60,  y: 600, state: {} },
    { id: 12, text: 'sin',                 x: 60,  y: 680, state: {} },
    { id: 13, text: '* 110',               x: 60,  y: 760, state: {} },
    { id: 14, text: '+ 160',               x: 60,  y: 840, state: {} },
    // angle (t outlet 1)
    { id: 15, text: '* 4',                 x: 300, y: 600, state: {} },
    { id: 16, text: 'cos',                 x: 260, y: 680, state: {} },
    { id: 17, text: 'sin',                 x: 380, y: 680, state: {} },
    // x = cos(A)*R + 400
    { id: 18, text: '*',                   x: 260, y: 760, state: {} },
    { id: 19, text: '+ 400',               x: 260, y: 840, state: {} },
    // y = sin(A)*R + 400
    { id: 20, text: '*',                   x: 440, y: 760, state: {} },
    { id: 21, text: '+ 400',               x: 440, y: 840, state: {} },
    // the moving dot + comet trail + kaleidoscope
    { id: 22, text: 'circle 400 400 15 #ffffff', x: 560, y: 110, state: {} },
    { id: 23, text: 'stamp 260',           x: 560, y: 200, state: {} },
    { id: 24, text: 'mirror x 400',        x: 560, y: 290, state: {} },
    { id: 25, text: 'mirror y 400',        x: 560, y: 370, state: {} },
    // pulsing centre ring (independent chain)
    { id: 26, text: 'receive phase',       x: 780, y: 110, state: {} },
    { id: 27, text: '* 2',                 x: 780, y: 190, state: {} },
    { id: 28, text: 'sin',                 x: 780, y: 270, state: {} },
    { id: 29, text: '* 40',                x: 780, y: 350, state: {} },
    { id: 30, text: '+ 90',                x: 780, y: 430, state: {} },
    { id: 31, text: 'circle 400 400 90 none #ffffff 2', x: 780, y: 510, state: {} },
    // stage
    { id: 32, text: 'bg #0a0a0a',          x: 560, y: 470, state: {} },
    { id: 33, text: 'text DEMO.9//KALEIDOSCOPE 400 772 13 #555555', x: 560, y: 560, state: {} },
    { id: 34, text: 'layer 1',             x: 560, y: 640, state: {} },
    { id: 35, text: 'layer 2',             x: 660, y: 640, state: {} },
    { id: 36, text: 'layer 3',             x: 760, y: 640, state: {} },
    { id: 37, text: 'layer 4',             x: 860, y: 640, state: {} },
    { id: 38, text: 'canvas 800 800',      x: 660, y: 730, state: {} },
  ],
  conns: [
    // motor
    { id: 40, from: { node: 2,  port: 0 }, to: { node: 4,  port: 0 }, type: 'ctl' },
    { id: 41, from: { node: 3,  port: 0 }, to: { node: 4,  port: 0 }, type: 'ctl' },
    { id: 42, from: { node: 4,  port: 0 }, to: { node: 5,  port: 0 }, type: 'ctl' },
    { id: 43, from: { node: 5,  port: 0 }, to: { node: 6,  port: 0 }, type: 'ctl' },
    { id: 44, from: { node: 7,  port: 0 }, to: { node: 8,  port: 0 }, type: 'ctl' },
    // colour: t outlet 3 (fires first) -> *3 -> hsl -> circle fill
    { id: 45, from: { node: 8,  port: 3 }, to: { node: 9,  port: 0 }, type: 'ctl' },
    { id: 46, from: { node: 9,  port: 0 }, to: { node: 10, port: 0 }, type: 'ctl' },
    { id: 47, from: { node: 10, port: 0 }, to: { node: 22, port: 3 }, type: 'ctl' },
    // radius: t outlet 2 -> *9 -> sin -> *110 -> +160 -> the COLD inlets of both mults
    { id: 48, from: { node: 8,  port: 2 }, to: { node: 11, port: 0 }, type: 'ctl' },
    { id: 49, from: { node: 11, port: 0 }, to: { node: 12, port: 0 }, type: 'ctl' },
    { id: 50, from: { node: 12, port: 0 }, to: { node: 13, port: 0 }, type: 'ctl' },
    { id: 51, from: { node: 13, port: 0 }, to: { node: 14, port: 0 }, type: 'ctl' },
    { id: 52, from: { node: 14, port: 0 }, to: { node: 18, port: 1 }, type: 'ctl' },
    { id: 53, from: { node: 14, port: 0 }, to: { node: 20, port: 1 }, type: 'ctl' },
    // angle: t outlet 1 -> *4 -> cos & sin
    { id: 54, from: { node: 8,  port: 1 }, to: { node: 15, port: 0 }, type: 'ctl' },
    { id: 55, from: { node: 15, port: 0 }, to: { node: 16, port: 0 }, type: 'ctl' },
    { id: 56, from: { node: 15, port: 0 }, to: { node: 17, port: 0 }, type: 'ctl' },
    // x = cos*R + 400
    { id: 57, from: { node: 16, port: 0 }, to: { node: 18, port: 0 }, type: 'ctl' },
    { id: 58, from: { node: 18, port: 0 }, to: { node: 19, port: 0 }, type: 'ctl' },
    { id: 59, from: { node: 19, port: 0 }, to: { node: 22, port: 0 }, type: 'ctl' },
    // y = sin*R + 400
    { id: 60, from: { node: 17, port: 0 }, to: { node: 20, port: 0 }, type: 'ctl' },
    { id: 61, from: { node: 20, port: 0 }, to: { node: 21, port: 0 }, type: 'ctl' },
    { id: 62, from: { node: 21, port: 0 }, to: { node: 22, port: 1 }, type: 'ctl' },
    // stamp: t outlet 0 (fires last) triggers the freeze, then kaleidoscope
    { id: 63, from: { node: 8,  port: 0 }, to: { node: 23, port: 1 }, type: 'ctl' },
    { id: 64, from: { node: 22, port: 0 }, to: { node: 23, port: 0 }, type: 'draw' },
    { id: 65, from: { node: 23, port: 0 }, to: { node: 24, port: 0 }, type: 'draw' },
    { id: 66, from: { node: 24, port: 0 }, to: { node: 25, port: 0 }, type: 'draw' },
    { id: 67, from: { node: 25, port: 0 }, to: { node: 35, port: 0 }, type: 'draw' },
    // pulsing ring
    { id: 68, from: { node: 26, port: 0 }, to: { node: 27, port: 0 }, type: 'ctl' },
    { id: 69, from: { node: 27, port: 0 }, to: { node: 28, port: 0 }, type: 'ctl' },
    { id: 70, from: { node: 28, port: 0 }, to: { node: 29, port: 0 }, type: 'ctl' },
    { id: 71, from: { node: 29, port: 0 }, to: { node: 30, port: 0 }, type: 'ctl' },
    { id: 72, from: { node: 30, port: 0 }, to: { node: 31, port: 2 }, type: 'ctl' },
    { id: 73, from: { node: 31, port: 0 }, to: { node: 36, port: 0 }, type: 'draw' },
    // stage
    { id: 74, from: { node: 32, port: 0 }, to: { node: 34, port: 0 }, type: 'draw' },
    { id: 75, from: { node: 33, port: 0 }, to: { node: 37, port: 0 }, type: 'draw' },
    { id: 76, from: { node: 34, port: 0 }, to: { node: 38, port: 0 }, type: 'draw' },
    { id: 77, from: { node: 35, port: 0 }, to: { node: 38, port: 0 }, type: 'draw' },
    { id: 78, from: { node: 36, port: 0 }, to: { node: 38, port: 0 }, type: 'draw' },
    { id: 79, from: { node: 37, port: 0 }, to: { node: 38, port: 0 }, type: 'draw' },
  ],
};
