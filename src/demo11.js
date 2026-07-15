// demo 11 — FEEDBACK TUNNEL: the previous frame, rotated + shrunk + faded, is
// painted under a moving shape every frame — so history spirals inward forever.
// metro drives a counter; sin/cos move a coloured dot on an orbit; hsl cycles its
// hue; feedback → rotate → scale 0.95 → alpha 0.96 is the decaying echo of the past.
export const DEMO11 = {
  nodes: [
    { id: 1,  text: 'comment DEMO.11 // FEEDBACK TUNNEL — runs by itself', x: 60, y: 40, state: {} },
    // motor
    { id: 2,  text: 'toggle',                       x: 210, y: 95,  state: { on: true } },
    { id: 3,  text: 'loadbang',                     x: 60,  y: 100, state: {} },
    { id: 4,  text: 'metro 33',                     x: 60,  y: 175, state: { on: true } },
    { id: 5,  text: 'counter 0 100000 1',           x: 60,  y: 250, state: {} },
    { id: 6,  text: 'send phase',                   x: 60,  y: 330, state: {} },
    // moving dot on an orbit: x = cos(phase*4)*220 + 400, y = sin(phase*4)*220 + 400
    { id: 7,  text: 'receive phase',                x: 60,  y: 420, state: {} },
    { id: 8,  text: '* 4',                          x: 60,  y: 500, state: {} },
    { id: 9,  text: 'cos',                          x: 20,  y: 580, state: {} },
    { id: 10, text: 'sin',                          x: 120, y: 580, state: {} },
    { id: 11, text: '* 220',                        x: 20,  y: 660, state: {} },
    { id: 12, text: '+ 400',                        x: 20,  y: 740, state: {} },
    { id: 13, text: '* 220',                        x: 120, y: 660, state: {} },
    { id: 14, text: '+ 400',                        x: 120, y: 740, state: {} },
    { id: 15, text: 'circle 400 400 34 #ffffff',    x: 60,  y: 820, state: {} },
    // hue cycles the dot colour
    { id: 16, text: 'receive phase',                x: 320, y: 420, state: {} },
    { id: 17, text: '* 4',                          x: 320, y: 500, state: {} },
    { id: 18, text: 'hsl 0 90 60',                  x: 320, y: 580, state: {} },
    // slow spin of the whole feedback field
    { id: 19, text: 'receive phase',                x: 560, y: 420, state: {} },
    { id: 20, text: '* 0.6',                        x: 560, y: 500, state: {} },
    // the echo: previous frame → rotate (from 20) → scale 0.95 → alpha 0.96
    { id: 21, text: 'feedback 400 400 800 800',     x: 560, y: 590, state: {} },
    { id: 22, text: 'rotate 0 400 400',             x: 560, y: 670, state: {} },
    { id: 23, text: 'scale 0.95 400 400',           x: 560, y: 750, state: {} },
    { id: 24, text: 'alpha 0.96',                   x: 560, y: 830, state: {} },
    // stage
    { id: 25, text: 'bg #0a0a12',                   x: 800, y: 420, state: {} },
    { id: 26, text: 'layer 1',                      x: 800, y: 520, state: {} },
    { id: 27, text: 'layer 2',                      x: 800, y: 600, state: {} },
    { id: 28, text: 'layer 3',                      x: 800, y: 680, state: {} },
    { id: 29, text: 'canvas 800 800',               x: 800, y: 780, state: {} },
  ],
  conns: [
    { id: 40, from: { node: 2,  port: 0 }, to: { node: 4,  port: 0 }, type: 'ctl' },
    { id: 41, from: { node: 3,  port: 0 }, to: { node: 4,  port: 0 }, type: 'ctl' },
    { id: 42, from: { node: 4,  port: 0 }, to: { node: 5,  port: 0 }, type: 'ctl' },
    { id: 43, from: { node: 5,  port: 0 }, to: { node: 6,  port: 0 }, type: 'ctl' },
    // dot position
    { id: 44, from: { node: 7,  port: 0 }, to: { node: 8,  port: 0 }, type: 'ctl' },
    { id: 45, from: { node: 8,  port: 0 }, to: { node: 9,  port: 0 }, type: 'ctl' },
    { id: 46, from: { node: 8,  port: 0 }, to: { node: 10, port: 0 }, type: 'ctl' },
    { id: 47, from: { node: 9,  port: 0 }, to: { node: 11, port: 0 }, type: 'ctl' },
    { id: 48, from: { node: 11, port: 0 }, to: { node: 12, port: 0 }, type: 'ctl' },
    { id: 49, from: { node: 12, port: 0 }, to: { node: 15, port: 0 }, type: 'ctl' },
    { id: 50, from: { node: 10, port: 0 }, to: { node: 13, port: 0 }, type: 'ctl' },
    { id: 51, from: { node: 13, port: 0 }, to: { node: 14, port: 0 }, type: 'ctl' },
    { id: 52, from: { node: 14, port: 0 }, to: { node: 15, port: 1 }, type: 'ctl' },
    // dot colour
    { id: 53, from: { node: 16, port: 0 }, to: { node: 17, port: 0 }, type: 'ctl' },
    { id: 54, from: { node: 17, port: 0 }, to: { node: 18, port: 0 }, type: 'ctl' },
    { id: 55, from: { node: 18, port: 0 }, to: { node: 15, port: 3 }, type: 'ctl' },
    // feedback echo
    { id: 56, from: { node: 19, port: 0 }, to: { node: 20, port: 0 }, type: 'ctl' },
    { id: 57, from: { node: 20, port: 0 }, to: { node: 22, port: 1 }, type: 'ctl' },
    { id: 58, from: { node: 21, port: 0 }, to: { node: 22, port: 0 }, type: 'draw' },
    { id: 59, from: { node: 22, port: 0 }, to: { node: 23, port: 0 }, type: 'draw' },
    { id: 60, from: { node: 23, port: 0 }, to: { node: 24, port: 0 }, type: 'draw' },
    // stage: bg (layer1) → echo (layer2) → dot (layer3)
    { id: 61, from: { node: 25, port: 0 }, to: { node: 26, port: 0 }, type: 'draw' },
    { id: 62, from: { node: 24, port: 0 }, to: { node: 27, port: 0 }, type: 'draw' },
    { id: 63, from: { node: 15, port: 0 }, to: { node: 28, port: 0 }, type: 'draw' },
    { id: 64, from: { node: 26, port: 0 }, to: { node: 29, port: 0 }, type: 'draw' },
    { id: 65, from: { node: 27, port: 0 }, to: { node: 29, port: 0 }, type: 'draw' },
    { id: 66, from: { node: 28, port: 0 }, to: { node: 29, port: 0 }, type: 'draw' },
  ],
};
