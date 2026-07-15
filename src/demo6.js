// demo 6 — ORGANIC: noise + ramp + shadow + key + send/receive
// metro -> counter -> send tick broadcasts time wirelessly; two receive tick
// chains run it through independent noise streams driving the ellipse x/y —
// the blob drifts organically under a soft shadow. Press R: a random new
// height GLIDES in through ramp (watch the number box).
export const DEMO6 = {
  nodes: [
    { id: 1,  text: 'comment DEMO.6 // noise + ramp + shadow + send/receive', x: 60,  y: 40,  state: {} },
    { id: 2,  text: 'toggle',                          x: 60,  y: 100, state: { on: true } },
    { id: 3,  text: 'metro 50',                        x: 60,  y: 180, state: { on: true } },
    { id: 4,  text: 'counter 0 100000 1',              x: 60,  y: 260, state: {} },
    { id: 5,  text: 'send tick',                       x: 60,  y: 350, state: {} },
    { id: 7,  text: 'receive tick',                    x: 300, y: 110, state: {} },
    { id: 8,  text: 'noise 0.02',                      x: 300, y: 190, state: {} },
    { id: 9,  text: '* 300',                           x: 300, y: 270, state: {} },
    { id: 10, text: '+ 400',                           x: 300, y: 350, state: {} },
    { id: 11, text: 'receive tick',                    x: 520, y: 110, state: {} },
    { id: 12, text: '+ 5000',                          x: 520, y: 190, state: {} },
    { id: 13, text: 'noise 0.02',                      x: 520, y: 270, state: {} },
    { id: 14, text: '* 250',                           x: 520, y: 350, state: {} },
    { id: 15, text: '+ 400',                           x: 520, y: 430, state: {} },
    { id: 16, text: 'ellipse 400 400 260 180 #000000', x: 300, y: 530, state: {} },
    { id: 17, text: 'shadow 40 0 24 #000000',          x: 300, y: 610, state: {} },
    { id: 18, text: 'bg #ffffff',                      x: 60,  y: 530, state: {} },
    { id: 19, text: 'layer 1',                         x: 80,  y: 620, state: {} },
    { id: 20, text: 'layer 2',                         x: 540, y: 620, state: {} },
    { id: 21, text: 'canvas 800 800',                  x: 300, y: 700, state: {} },
    { id: 28, text: 'comment press R → new height glides in', x: 720, y: 60, state: {} },
    { id: 22, text: 'key',                             x: 740, y: 120, state: {} },
    { id: 23, text: 'sel r',                           x: 740, y: 200, state: {} },
    { id: 24, text: 'random 300',                      x: 740, y: 280, state: {} },
    { id: 25, text: '+ 100',                           x: 740, y: 360, state: {} },
    { id: 26, text: 'ramp 600',                        x: 740, y: 440, state: { value: 180 } },
    { id: 27, text: 'number',                          x: 740, y: 520, state: { value: 180 } },
  ],
  conns: [
    { id: 40, from: { node: 2,  port: 0 }, to: { node: 3,  port: 0 }, type: 'ctl' },
    { id: 41, from: { node: 3,  port: 0 }, to: { node: 4,  port: 0 }, type: 'ctl' },
    { id: 42, from: { node: 4,  port: 0 }, to: { node: 5,  port: 0 }, type: 'ctl' },
    // x = noise(tick * 0.02) * 300 + 400
    { id: 43, from: { node: 7,  port: 0 }, to: { node: 8,  port: 0 }, type: 'ctl' },
    { id: 44, from: { node: 8,  port: 0 }, to: { node: 9,  port: 0 }, type: 'ctl' },
    { id: 45, from: { node: 9,  port: 0 }, to: { node: 10, port: 0 }, type: 'ctl' },
    { id: 46, from: { node: 10, port: 0 }, to: { node: 16, port: 0 }, type: 'ctl' },
    // y = noise((tick + 5000) * 0.02) * 250 + 400 — independent stream
    { id: 47, from: { node: 11, port: 0 }, to: { node: 12, port: 0 }, type: 'ctl' },
    { id: 48, from: { node: 12, port: 0 }, to: { node: 13, port: 0 }, type: 'ctl' },
    { id: 49, from: { node: 13, port: 0 }, to: { node: 14, port: 0 }, type: 'ctl' },
    { id: 50, from: { node: 14, port: 0 }, to: { node: 15, port: 0 }, type: 'ctl' },
    { id: 51, from: { node: 15, port: 0 }, to: { node: 16, port: 1 }, type: 'ctl' },
    // press R: random height glides in through ramp, displayed on the way
    { id: 52, from: { node: 22, port: 0 }, to: { node: 23, port: 0 }, type: 'ctl' },
    { id: 53, from: { node: 23, port: 0 }, to: { node: 24, port: 0 }, type: 'ctl' },
    { id: 54, from: { node: 24, port: 0 }, to: { node: 25, port: 0 }, type: 'ctl' },
    { id: 55, from: { node: 25, port: 0 }, to: { node: 26, port: 0 }, type: 'ctl' },
    { id: 56, from: { node: 26, port: 0 }, to: { node: 27, port: 0 }, type: 'ctl' },
    { id: 57, from: { node: 27, port: 0 }, to: { node: 16, port: 3 }, type: 'ctl' },
    // draw chain
    { id: 58, from: { node: 16, port: 0 }, to: { node: 17, port: 0 }, type: 'draw' },
    { id: 59, from: { node: 17, port: 0 }, to: { node: 20, port: 0 }, type: 'draw' },
    { id: 60, from: { node: 18, port: 0 }, to: { node: 19, port: 0 }, type: 'draw' },
    { id: 61, from: { node: 19, port: 0 }, to: { node: 21, port: 0 }, type: 'draw' },
    { id: 62, from: { node: 20, port: 0 }, to: { node: 21, port: 0 }, type: 'draw' },
  ],
};
