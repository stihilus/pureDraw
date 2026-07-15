// evaluation of the draw chain (continuous, like PD's signal chain)
// control inlets use the last RECEIVED value (state.inletVals), falling back to typed args
import { TYPES, VARS, inletsOf, argVal, coerceNum, coerceStr, coerceCol, clamp } from './nodes.js';

// bind the w/h variables from the first canvas node's size, so numeric fields
// elsewhere can use "w/2", "h/8" etc. Uses the last value received on the size
// inlets (cables) or the typed argument — resolved plainly, without recursion.
function bindCanvasVars(graph) {
  for (const node of graph.nodes.values()) {
    if (node.type !== 'canvas') continue;
    const rw = node.state?.inletVals?.[1];
    const rh = node.state?.inletVals?.[2];
    VARS.w = clamp(Math.round(coerceNum(rw !== undefined ? rw : argVal(node, 0), 800)), 1, 8192);
    VARS.h = clamp(Math.round(coerceNum(rh !== undefined ? rh : argVal(node, 1), 800)), 1, 8192);
    return;
  }
  VARS.w = 800; VARS.h = 800; // no canvas → sensible default
}

// build draw command list from resolved inlet values
function makeDraw(node, v) {
  switch (node.type) {
    case 'bg':     return [{ cmd: 'bg', color: coerceCol(v[0]) }];
    case 'gradient': return [{ cmd: 'gradient', x1: coerceNum(v[0], 0), y1: coerceNum(v[1], 0), x2: coerceNum(v[2], 800), y2: coerceNum(v[3], 800), c1: coerceCol(v[4]), c2: coerceCol(v[5], '#ffffff') }];
    case 'rect':   return [{ cmd: 'rect', x: coerceNum(v[0]), y: coerceNum(v[1]), w: coerceNum(v[2]), h: coerceNum(v[3]), fill: coerceCol(v[4]), stroke: coerceCol(v[5], 'none'), sw: coerceNum(v[6]) }];
    case 'circle': return [{ cmd: 'circle', x: coerceNum(v[0]), y: coerceNum(v[1]), r: coerceNum(v[2]), fill: coerceCol(v[3]), stroke: coerceCol(v[4], 'none'), sw: coerceNum(v[5]) }];
    case 'ellipse': return [{ cmd: 'ellipse', x: coerceNum(v[0]), y: coerceNum(v[1]), w: coerceNum(v[2]), h: coerceNum(v[3]), fill: coerceCol(v[4]), stroke: coerceCol(v[5], 'none'), sw: coerceNum(v[6]) }];
    case 'line':   return [{ cmd: 'line', x1: coerceNum(v[0]), y1: coerceNum(v[1]), x2: coerceNum(v[2]), y2: coerceNum(v[3]), color: coerceCol(v[4]), w: coerceNum(v[5], 1) }];
    case 'text':   return [{ cmd: 'text', word: coerceStr(v[0]), x: coerceNum(v[1]), y: coerceNum(v[2]), size: coerceNum(v[3], 24), color: coerceCol(v[4]), font: coerceStr(v[5], 'mono'), weight: coerceNum(v[6], 400), align: coerceStr(v[7], 'center'), track: coerceNum(v[8], 0) }];
    case 'webcam':   return [{ cmd: 'webcam', x: coerceNum(v[0], 400), y: coerceNum(v[1], 400), w: coerceNum(v[2], 800), h: coerceNum(v[3], 600) }];
    case 'feedback': return [{ cmd: 'feedback', x: coerceNum(v[0], 400), y: coerceNum(v[1], 400), w: coerceNum(v[2], 800), h: coerceNum(v[3], 800) }];
    case 'polygon': return [{ cmd: 'poly', x: coerceNum(v[0]), y: coerceNum(v[1]), r: coerceNum(v[2]), n: coerceNum(v[3], 6), rot: coerceNum(v[4]), fill: coerceCol(v[5]), stroke: coerceCol(v[6], 'none'), sw: coerceNum(v[7]) }];
    case 'stamp':  return (node.state?.stamps || []).flat();
    case 'rotate':    return [{ cmd: 'group', tf: ['rotate', coerceNum(v[1]), coerceNum(v[2], 400), coerceNum(v[3], 400)], children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'scale':     return [{ cmd: 'group', tf: ['scale', coerceNum(v[1], 1), coerceNum(v[2], 400), coerceNum(v[3], 400)], children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'translate': return [{ cmd: 'group', tf: ['translate', coerceNum(v[1]), coerceNum(v[2])], children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'alpha':     return [{ cmd: 'group', tf: ['alpha', clamp(coerceNum(v[1], 1), 0, 1)], children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'blend':     return [{ cmd: 'group', tf: ['blend', coerceStr(v[1], 'multiply')], children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'shadow':    return [{ cmd: 'group', tf: ['shadow', coerceNum(v[1], 20), coerceNum(v[2], 0), coerceNum(v[3], 10), coerceCol(v[4])], children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'dash':      return [{ cmd: 'group', tf: ['dash', coerceNum(v[1], 8), coerceNum(v[2], 8)], children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'rectMode':  return [{ cmd: 'setMode', target: 'rect', mode: coerceStr(v[1], 'corner').toLowerCase() }, ...(Array.isArray(v[0]) ? v[0] : [])];
    case 'ellipseMode': return [{ cmd: 'setMode', target: 'ellipse', mode: coerceStr(v[1], 'corner').toLowerCase() }, ...(Array.isArray(v[0]) ? v[0] : [])];
    case 'threshold': return [{ cmd: 'pixel', op: 'threshold', params: [coerceNum(v[1], 128)], children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'posterize': return [{ cmd: 'pixel', op: 'posterize', params: [coerceNum(v[1], 4)], children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'dither':    return [{ cmd: 'pixel', op: 'dither', params: [coerceNum(v[1], 2), coerceNum(v[2], 2)], children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'pixelate':  return [{ cmd: 'pixel', op: 'pixelate', params: [coerceNum(v[1], 8)], children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'duotone':   return [{ cmd: 'pixel', op: 'duotone', params: [coerceCol(v[1], '#1a1a40'), coerceCol(v[2], '#ff5050')], children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'blur':       return [{ cmd: 'filter', css: `blur(${Math.max(0, coerceNum(v[1], 4))}px)`, children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'invert':     return [{ cmd: 'filter', css: 'invert(1)', children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'grayscale':  return [{ cmd: 'filter', css: 'grayscale(1)', children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'contrast':   return [{ cmd: 'filter', css: `contrast(${Math.max(0, coerceNum(v[1], 1.5))})`, children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'brightness': return [{ cmd: 'filter', css: `brightness(${Math.max(0, coerceNum(v[1], 1.3))})`, children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'hue':        return [{ cmd: 'filter', css: `hue-rotate(${coerceNum(v[1], 90)}deg)`, children: Array.isArray(v[0]) ? v[0] : [] }];
    case 'clip':      return [{ cmd: 'clipgrp', children: Array.isArray(v[0]) ? v[0] : [], mask: Array.isArray(v[1]) ? v[1] : [] }];
    case 'mirror': {
      const kids = Array.isArray(v[0]) ? v[0] : [];
      return [...kids, { cmd: 'group', tf: ['mirror', coerceStr(v[1], 'x'), coerceNum(v[2], 400)], children: kids }];
    }
    case 'tile': {
      const kids = Array.isArray(v[0]) ? v[0] : [];
      if (!kids.length) return [];
      const nx = clamp(Math.round(coerceNum(v[1], 3)), 1, 64);
      const ny = clamp(Math.round(coerceNum(v[2], 3)), 1, 64);
      const dx = coerceNum(v[3], 100), dy = coerceNum(v[4], 100);
      const out = [];
      for (let j = 0; j < ny && out.length < 4096; j++) {
        for (let i = 0; i < nx && out.length < 4096; i++) {
          out.push({ cmd: 'group', tf: ['translate', i * dx, j * dy], children: kids });
        }
      }
      return out;
    }
    case 'image': {
      const url = coerceStr(v[0], '').trim();
      if (!url) return [];
      return [{ cmd: 'image', url, x: coerceNum(v[1], 400), y: coerceNum(v[2], 400), w: coerceNum(v[3], 300), h: coerceNum(v[4], 300) }];
    }
    case 'layer':  {
      const out = [];
      for (const d of v) if (Array.isArray(d)) out.push(...d);
      return out;
    }
    default: return [];
  }
}

// shared pull machinery for the draw chain
function makeEvaluator(graph) {
  // draw inlets take a single cable, so a simple inlet->conn map is enough here
  const byDrawInlet = new Map();
  for (const c of graph.conns) {
    if (c.type === 'draw') byDrawInlet.set(c.to.node + ':' + c.to.port, c);
  }

  const cache = new Map();
  const stack = new Set();

  function inletValues(node) {
    return inletsOf(node).map((inl, idx) => {
      if (inl.type === 'draw') {
        const conn = byDrawInlet.get(node.id + ':' + idx);
        if (conn && graph.nodes.has(conn.from.node)) return outValue(conn.from.node);
        return null;
      }
      // control inlet: last received message wins, then the typed arg / default
      const stored = node.state?.inletVals?.[idx];
      if (stored !== undefined) return stored;
      return inl.arg !== undefined ? argVal(node, inl.arg) : null;
    });
  }

  function outValue(id) {
    if (cache.has(id)) return cache.get(id);
    if (stack.has(id)) return null; // cycle guard
    stack.add(id);
    const node = graph.nodes.get(id);
    const def = node && TYPES[node.type];
    let val = null;
    if (def && def.out === 'draw') val = makeDraw(node, inletValues(node));
    stack.delete(id);
    cache.set(id, val);
    return val;
  }

  return { inletValues, outValue };
}

// current draw output of a single node (used by stamp at trig time)
export function drawOutOf(graph, id) {
  return makeEvaluator(graph).outValue(id);
}

// evaluate whole patch -> array of {w, h, cmds} (one per canvas node)
export function evalPatch(graph) {
  bindCanvasVars(graph); // set w/h before anything reads them
  const { inletValues, outValue } = makeEvaluator(graph);

  const outputs = [];
  for (const node of graph.nodes.values()) {
    if (node.type !== 'canvas') continue;
    // the canvas draw inlet takes many cables: stack them by the sender's layer number
    // (layer nodes bring their z argument, anything else counts as layer 0)
    const stack = [];
    for (const c of graph.conns) {
      if (c.type !== 'draw' || c.to.node !== node.id || c.to.port !== 0) continue;
      const src = graph.nodes.get(c.from.node);
      if (!src) continue;
      const cmds = outValue(src.id);
      if (!Array.isArray(cmds)) continue;
      stack.push({ z: src.type === 'layer' ? coerceNum(argVal(src, 0), 1) : 0, cmds });
    }
    stack.sort((a, b) => a.z - b.z); // stable: equal z keeps cable order
    const v = inletValues(node);
    outputs.push({
      w: clamp(Math.round(coerceNum(v[1], 800)), 1, 8192),
      h: clamp(Math.round(coerceNum(v[2], 800)), 1, 8192),
      cmds: stack.flatMap(s => s.cmds),
    });
  }
  return outputs;
}
