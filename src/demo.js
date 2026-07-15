// demo patch — always available via FILE > OPEN.DEMO
// two bangs fire two numbers into rect.x; a slider drives the text size;
// toggle -> metro -> counter -> sin -> *250 -> +400 glides the circle along the line
// compositing: layer 1 = bg, layer 2 = shapes, layer 3 = text (white DEMO on top of the rect)
export const DEMO = {
  nodes: [
    { id: 1,  text: 'bng',                            x: 190, y: 100, state: {} },
    { id: 2,  text: 'bng',                            x: 340, y: 100, state: {} },
    { id: 3,  text: 'number',                         x: 170, y: 200, state: { value: 200 } },
    { id: 4,  text: 'number',                         x: 340, y: 200, state: { value: 600 } },
    { id: 5,  text: 'hslider 12 120',                 x: 500, y: 110, state: { value: 48 } },
    { id: 21, text: 'number',                         x: 545, y: 185, state: { value: 48 } },
    { id: 6,  text: 'bg #ffffff',                     x: 60,  y: 340, state: {} },
    { id: 7,  text: 'rect 400 430 220 220 #000000',   x: 180, y: 320, state: {} },
    { id: 8,  text: 'text DEMO 400 430 48 #ffffff',   x: 480, y: 250, state: {} },
    { id: 9,  text: 'line 100 650 700 650 #000000 4', x: 480, y: 330, state: {} },
    { id: 10, text: 'layer 1',                        x: 100, y: 545, state: {} },
    { id: 19, text: 'layer 2',                        x: 300, y: 545, state: {} },
    { id: 20, text: 'layer 3',                        x: 500, y: 545, state: {} },
    { id: 11, text: 'canvas 800 800',                 x: 300, y: 640, state: {} },
    { id: 12, text: 'toggle',                         x: 815, y: 60,  state: { on: true } },
    { id: 13, text: 'metro 50',                       x: 800, y: 130, state: { on: true } },
    { id: 14, text: 'counter 0 360 4',                x: 770, y: 200, state: {} },
    { id: 15, text: 'sin',                            x: 815, y: 270, state: {} },
    { id: 17, text: '* 250',                          x: 800, y: 340, state: {} },
    { id: 18, text: '+ 400',                          x: 800, y: 410, state: {} },
    { id: 16, text: 'circle 400 650 40 #000000',      x: 740, y: 480, state: {} },
  ],
  conns: [
    { id: 30, from: { node: 1,  port: 0 }, to: { node: 3,  port: 0 }, type: 'ctl' },
    { id: 31, from: { node: 2,  port: 0 }, to: { node: 4,  port: 0 }, type: 'ctl' },
    { id: 32, from: { node: 3,  port: 0 }, to: { node: 7,  port: 0 }, type: 'ctl' },
    { id: 33, from: { node: 4,  port: 0 }, to: { node: 7,  port: 0 }, type: 'ctl' },
    // slider -> number (live display, passes through) -> text size
    { id: 34, from: { node: 5,  port: 0 }, to: { node: 21, port: 0 }, type: 'ctl' },
    { id: 50, from: { node: 21, port: 0 }, to: { node: 8,  port: 3 }, type: 'ctl' },
    { id: 35, from: { node: 6,  port: 0 }, to: { node: 10, port: 0 }, type: 'draw' },
    { id: 36, from: { node: 7,  port: 0 }, to: { node: 19, port: 0 }, type: 'draw' },
    { id: 37, from: { node: 9,  port: 0 }, to: { node: 19, port: 1 }, type: 'draw' },
    { id: 44, from: { node: 16, port: 0 }, to: { node: 19, port: 2 }, type: 'draw' },
    { id: 38, from: { node: 8,  port: 0 }, to: { node: 20, port: 0 }, type: 'draw' },
    // canvas cables on purpose in reverse order — the canvas sorts by layer number anyway
    { id: 47, from: { node: 20, port: 0 }, to: { node: 11, port: 0 }, type: 'draw' },
    { id: 48, from: { node: 19, port: 0 }, to: { node: 11, port: 0 }, type: 'draw' },
    { id: 49, from: { node: 10, port: 0 }, to: { node: 11, port: 0 }, type: 'draw' },
    { id: 40, from: { node: 12, port: 0 }, to: { node: 13, port: 0 }, type: 'ctl' },
    { id: 41, from: { node: 13, port: 0 }, to: { node: 14, port: 0 }, type: 'ctl' },
    { id: 42, from: { node: 14, port: 0 }, to: { node: 15, port: 0 }, type: 'ctl' },
    { id: 43, from: { node: 15, port: 0 }, to: { node: 17, port: 0 }, type: 'ctl' },
    { id: 45, from: { node: 17, port: 0 }, to: { node: 18, port: 0 }, type: 'ctl' },
    { id: 46, from: { node: 18, port: 0 }, to: { node: 16, port: 0 }, type: 'ctl' },
  ],
};
