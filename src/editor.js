// node editor: DOM nodes + SVG cables + preview wiring
import { TYPES, HELP, BANG, parseText, inletsOf, outletsOf, selArgs, selMatch, typesMatch, argVal, argHint, coerceNum, coerceStr, clamp } from './nodes.js';
import { evalPatch, drawOutOf } from './graph.js';
import { render, stopWebcam } from './render.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const STORE_KEY = 'puredraw.patch.v1';

const graph = { nodes: new Map(), conns: [] };
let nextId = 1;
const selectedNodes = new Set();
const selectedConns = new Set();

const GRID = 24;
const MAX_HISTORY = 50;
let undoStack = [];
let redoStack = [];
let historyPaused = false;

// dom refs
let $editor, $world, $svg, $nodes, $tip, $canvas, $dims, $noCanvas, $wrap, $status, $main, $splitter;

// editor viewport: world is transformed by translate(x,y) scale(zoom)
const view = { x: 0, y: 0, zoom: 1 };
const MIN_ZOOM = 0.2, MAX_ZOOM = 3;
let spaceDown = false;

// ---------------------------------------------------------------- boot

export function initEditor(demoPatch) {
  $editor = document.getElementById('editor');
  $world = document.getElementById('world');
  $svg = document.getElementById('cables');
  $nodes = document.getElementById('nodes');
  $tip = document.getElementById('tip');
  $canvas = document.getElementById('preview-canvas');
  $dims = document.getElementById('dims');
  $noCanvas = document.getElementById('no-canvas');
  $wrap = document.querySelector('.canvas-wrap');
  $status = document.getElementById('status');
  $main = document.querySelector('main');
  $splitter = document.getElementById('splitter');

  applyView();

  const saved = load();
  applyPatch(saved || demoPatch);

  bindGlobal();
  bindCanvasMouse();
  bindViewport();
  bindSplitter();
  bindViewModes();
  document.fonts.ready.then(() => { relayoutAll(); change(false); });
  window.addEventListener('resize', fitPreview);
  // image nodes: re-render once a picture finishes loading
  document.addEventListener('gd-image-loaded', () => change(false));
}

// ---------------------------------------------------------------- pan / zoom

function applyView() {
  $world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
}

// world coords of the centre of the visible editor area
function viewCenterWorld() {
  return {
    x: ($editor.clientWidth / 2 - view.x) / view.zoom,
    y: ($editor.clientHeight / 2 - view.y) / view.zoom,
  };
}

function zoomAt(clientX, clientY, factor) {
  const r = $editor.getBoundingClientRect();
  const mx = clientX - r.left, my = clientY - r.top;
  const z = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  if (z === view.zoom) return;
  // keep the world point under the cursor fixed
  view.x = mx - (mx - view.x) * (z / view.zoom);
  view.y = my - (my - view.y) * (z / view.zoom);
  view.zoom = z;
  applyView();
}

export function resetView() {
  view.x = 0; view.y = 0; view.zoom = 1;
  applyView();
}

// tell a two-finger trackpad swipe (should pan) apart from a mouse wheel (should
// zoom). Pinch gestures always arrive with ctrlKey set and are handled separately.
function isTrackpadPan(e) {
  if (e.deltaMode !== 0) return false;          // line/page deltas → mouse wheel
  if (e.deltaX !== 0) return true;              // any horizontal → trackpad swipe
  if (!Number.isInteger(e.deltaY)) return true; // fractional pixels → trackpad
  return Math.abs(e.deltaY) < 40;               // small steps → trackpad; coarse → wheel
}

function bindViewport() {
  // Figma-style: pinch (ctrl+wheel) zooms, two-finger swipe pans, mouse wheel zooms
  $editor.addEventListener('wheel', e => {
    e.preventDefault();
    if (e.ctrlKey) {                             // pinch gesture, or ctrl/cmd + wheel
      zoomAt(e.clientX, e.clientY, Math.exp(-clamp(e.deltaY, -50, 50) * 0.01));
    } else if (isTrackpadPan(e)) {               // two-finger swipe → pan
      view.x -= e.deltaX;
      view.y -= e.deltaY;
      applyView();
    } else {                                     // mouse wheel → zoom toward cursor
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
    }
  }, { passive: false });

  // middle-button, or Space+left, pans
  $editor.addEventListener('mousedown', e => {
    if (e.button !== 1 && !(e.button === 0 && spaceDown)) return;
    e.preventDefault();
    $editor.classList.add('grabbing');
    const sx = e.clientX, sy = e.clientY, ox = view.x, oy = view.y;
    drag(ev => {
      view.x = ox + (ev.clientX - sx);
      view.y = oy + (ev.clientY - sy);
      applyView();
    }, () => $editor.classList.remove('grabbing'));
  }, true); // capture so pan starts before node/marquee handlers see the event

  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !isEditingField()) {
      const wasDown = spaceDown;
      spaceDown = true;
      $editor.classList.add('panning');
      if (!wasDown) e.preventDefault();
    }
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'Space') { spaceDown = false; $editor.classList.remove('panning'); }
  });
}

function isEditingField() {
  const t = document.activeElement;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
}

// ---------------------------------------------------------------- split / view modes

function bindSplitter() {
  $splitter.addEventListener('mousedown', e => {
    e.preventDefault();
    const mr = $main.getBoundingClientRect();
    drag(ev => {
      const w = clamp(ev.clientX - mr.left, 240, mr.width - 240);
      $editor.style.flex = `0 0 ${w}px`;
      fitPreview();
    });
  });
}

function setLayout(mode) {
  $main.classList.toggle('full-nodes', mode === 'nodes');
  $main.classList.toggle('full-preview', mode === 'preview');
  for (const id of ['view-nodes', 'view-split', 'view-preview']) {
    document.getElementById(id).classList.toggle('active', id === 'view-' + mode);
  }
  requestAnimationFrame(fitPreview);
}

function bindViewModes() {
  document.getElementById('view-nodes').addEventListener('click', () => setLayout('nodes'));
  document.getElementById('view-split').addEventListener('click', () => setLayout('split'));
  document.getElementById('view-preview').addEventListener('click', () => setLayout('preview'));
  document.getElementById('btn-zoomreset').addEventListener('click', resetView);
}

// mouse nodes stream the cursor position over the preview canvas, in canvas coordinates
function bindCanvasMouse() {
  const canvasXY = e => {
    const r = $canvas.getBoundingClientRect();
    return {
      x: Math.round((e.clientX - r.left) * ($canvas.width / r.width)),
      y: Math.round((e.clientY - r.top) * ($canvas.height / r.height)),
    };
  };
  const fire = fn => {
    let any = false;
    for (const n of graph.nodes.values()) {
      if (n.type !== 'mouse') continue;
      any = true;
      fn(n);
    }
    if (any) change(false);
  };
  $canvas.addEventListener('mousemove', e => {
    const p = canvasXY(e);
    fire(n => { fireOutlet(n, p.y, 1); fireOutlet(n, p.x, 0); }); // right to left: y, then x
  });
  let pressed = false;
  $canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    pressed = true;
    fire(n => fireOutlet(n, 1, 2));
  });
  document.addEventListener('mouseup', () => {
    if (!pressed) return;
    pressed = false;
    fire(n => fireOutlet(n, 0, 2));
  });
}

function applyPatch(patch, opts = {}) {
  const { skipHistoryClear = false } = opts;
  for (const id of [...metros.keys()]) stopMetro(id);
  for (const id of [...ramps.keys()]) stopRamp(id);
  graph.nodes.clear();
  graph.conns = [];
  $nodes.innerHTML = '';
  selectedNodes.clear();
  selectedConns.clear();
  if (!skipHistoryClear) { undoStack = []; redoStack = []; }
  if (patch) {
    for (const n of patch.nodes) {
      const node = { ...n, ...parseText(n.text), state: n.state || {} };
      graph.nodes.set(node.id, node);
      nextId = Math.max(nextId, node.id + 1);
      buildNodeEl(node);
    }
    graph.conns = (patch.conns || []).filter(c =>
      graph.nodes.has(c.from.node) && graph.nodes.has(c.to.node));
    for (const c of graph.conns) nextId = Math.max(nextId, c.id + 1);
  }
  relayoutAll();
  syncMetros();
  fireLoadbangs();
  change(false);
}

// loadbang nodes fire once, right after a patch is loaded
function fireLoadbangs() {
  for (const n of graph.nodes.values()) {
    if (n.type !== 'loadbang') continue;
    flashNode(n);
    fireOutlet(n, BANG);
  }
}

export function clearPatch() {
  localStorage.removeItem(STORE_KEY);
  applyPatch(null);
}

// load a patch object (used by FILE > OPEN.DEMO)
export function loadPatch(patch) {
  applyPatch(patch);
  save();
}

// serializable snapshot of the current patch (same shape as the demo files)
export function getPatchData() {
  const nodes = [...graph.nodes.values()].map(n =>
    ({ id: n.id, text: n.text, x: n.x, y: n.y, state: n.state }));
  return { nodes, conns: graph.conns };
}

// whether the native OS save dialog is available (Chromium, secure context)
export function hasNativeSave() {
  return typeof window.showSaveFilePicker === 'function';
}

// save the current patch. When the File System Access API is available this opens
// the native OS save dialog (choose name + location); otherwise it downloads a file.
export async function savePatchFile(name = 'patch') {
  const safe = String(name).trim().replace(/[^\w.\-]+/g, '-').replace(/^-+|-+$/g, '') || 'patch';
  const filename = safe + '.puredraw.json';
  const data = JSON.stringify({ format: 'puredraw.patch', version: 1, name: safe, ...getPatchData() }, null, 2);

  if (hasNativeSave()) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'Pure Draw patch', accept: { 'application/json': ['.puredraw.json', '.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(data);
      await writable.close();
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return; // user cancelled the dialog
      // any other failure (e.g. sandboxed iframe) → fall back to a download
    }
  }
  downloadPatch(data, filename);
}

function downloadPatch(data, filename) {
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// create a node from the ADD menu — bare, just the type name (defaults apply)
export function addNodeFromTemplate(type) {
  const text = type;
  const c = viewCenterWorld();
  const x = snapPos(c.x - 70 + (Math.random() * 60 - 30));
  const y = snapPos(c.y - 16 + (Math.random() * 60 - 30));
  const node = { id: nextId++, text, ...parseText(text), x: Math.max(0, x), y: Math.max(0, y), state: {} };
  pushHistory();
  graph.nodes.set(node.id, node);
  buildNodeEl(node);
  positionPorts(node);
  selectOnlyNode(node.id);
  change();
  document.dispatchEvent(new CustomEvent('gd-node-used', { detail: type }));
}

export function exportPNG() {
  $canvas.toBlob(blob => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'puredraw.png';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

// ---------------------------------------------------------------- persistence

function save() {
  const nodes = [...graph.nodes.values()].map(n =>
    ({ id: n.id, text: n.text, x: n.x, y: n.y, state: n.state }));
  localStorage.setItem(STORE_KEY, JSON.stringify({ nodes, conns: graph.conns }));
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p && Array.isArray(p.nodes) && p.nodes.length ? p : null;
  } catch { return null; }
}

// ---------------------------------------------------------------- change -> eval -> preview

// renders are coalesced through requestAnimationFrame: any number of message
// ticks (metro, ramp, mouse…) costs at most one render per display frame
let renderQueued = false;

function change(persist = true) {
  if (persist) save();
  if (renderQueued) return;
  renderQueued = true;
  const run = () => {
    if (!renderQueued) return;
    renderQueued = false;
    renderPreview();
  };
  requestAnimationFrame(run);
  setTimeout(run, 50); // rAF never fires in hidden tabs — this keeps the canvas live there too
}

function renderPreview() {
  const outs = evalPatch(graph);
  if (outs.length) {
    $noCanvas.classList.add('hidden');
    $canvas.classList.remove('hidden');
    render($canvas, outs[0]);
    fitPreview();
  } else {
    $canvas.classList.add('hidden');
    $noCanvas.classList.remove('hidden');
    $dims.textContent = '—';
  }
  $status.textContent = `N:${graph.nodes.size} C:${graph.conns.length}`;
}

function fitPreview() {
  if ($canvas.classList.contains('hidden')) return;
  const w = $canvas.width, h = $canvas.height;
  const availW = $wrap.clientWidth - 48, availH = $wrap.clientHeight - 48;
  const scale = Math.min(availW / w, availH / h, 1);
  $canvas.style.width = Math.max(1, Math.floor(w * scale)) + 'px';
  $canvas.style.height = Math.max(1, Math.floor(h * scale)) + 'px';
  $dims.textContent = `${w}×${h} @ ${Math.round(scale * 100)}%`;
}

// ---------------------------------------------------------------- node DOM

function buildNodeEl(node) {
  const el = document.createElement('div');
  el.className = 'node';
  el.dataset.id = node.id;
  el.style.left = node.x + 'px';
  el.style.top = node.y + 'px';
  $nodes.appendChild(el);
  node.el = el;
  renderNodeContent(node);
  return el;
}

function renderNodeContent(node) {
  const el = node.el;
  const def = TYPES[node.type];
  el.dataset.type = node.type;
  el.className = 'node' + (def ? (def.gui ? ` gui n-${node.type}` : (def.comment ? ' n-comment' : '')) : ' broken');
  if (selectedNodes.has(node.id)) el.classList.add('sel');
  el.innerHTML = '';

  if (def?.gui) {
    const handle = document.createElement('div');
    handle.className = 'handle';
    handle.textContent = node.type.toUpperCase();
    el.appendChild(handle);
    el.appendChild(buildGuiBody(node));
  } else {
    const body = document.createElement('div');
    body.className = 'body';
    // comments show only their text, not the "comment" keyword
    body.textContent = def?.comment ? ((node.text || '').replace(/^\S+\s*/, '') || 'comment') : node.text;
    el.appendChild(body);
  }

  buildPorts(node);
  positionPorts(node);
}

function buildGuiBody(node) {
  if (node.type === 'bng') {
    const d = document.createElement('div');
    d.className = 'bbox';
    const c = document.createElement('div');
    c.className = 'circ';
    d.appendChild(c);
    return d;
  }
  if (node.type === 'number') {
    const d = document.createElement('div');
    d.className = 'numbox';
    d.textContent = fmt(coerceNum(node.state.value, 0));
    return d;
  }
  if (node.type === 'toggle') {
    const d = document.createElement('div');
    d.className = 'tbox';
    d.textContent = node.state.on ? '✕' : ' ';
    return d;
  }
  if (node.type === 'string') {
    const d = document.createElement('div');
    d.className = 'body';
    const val = (node.text || '').replace(/^\S+\s*/, '');
    d.textContent = val || ' ';
    return d;
  }
  // sliders
  const horiz = node.type === 'hslider';
  const track = document.createElement('div');
  track.className = 'track ' + (horiz ? 'h-track' : 'v-track');
  const fill = document.createElement('div');
  fill.className = 'fill';
  const val = document.createElement('div');
  val.className = 'val';
  track.appendChild(fill);
  track.appendChild(val);
  updateSlider(node, track);
  return track;
}

function updateSlider(node, track) {
  track = track || node.el.querySelector('.track');
  if (!track) return;
  const min = argVal(node, 0) ?? 0, max = argVal(node, 1) ?? 100;
  const lo = Math.min(min, max), hi = Math.max(min, max);
  const v = clamp(coerceNum(node.state.value, min), lo, hi);
  const ratio = hi === lo ? 0 : (v - lo) / (hi - lo);
  const fill = track.querySelector('.fill');
  if (node.type === 'hslider') fill.style.width = (ratio * 100) + '%';
  else fill.style.height = (ratio * 100) + '%';
  track.querySelector('.val').textContent = fmt(v);
}

function fmt(v) {
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

// ---------------------------------------------------------------- message engine (PD-style)

let msgDepth = 0;

// current value helpers for gui nodes
function sliderVal(node) {
  const min = argVal(node, 0) ?? 0, max = argVal(node, 1) ?? 100;
  return clamp(coerceNum(node.state.value, min), Math.min(min, max), Math.max(min, max));
}
function stringVal(node) {
  return (node.text || '').replace(/^\S+\s*/, '');
}

// PD-style "set N" message: sets a GUI value without sending it on
function parseSetMsg(value) {
  if (typeof value === 'string') {
    const m = value.trim().match(/^set(?:\s+(-?[\d.]+))?$/);
    if (m) return { set: true, num: m[1] !== undefined ? parseFloat(m[1]) : undefined };
  }
  return { set: false };
}

// send a value from one of a node's outlets to everything connected (fan-out in cable creation order)
function fireOutlet(node, value, port = 0) {
  if (msgDepth > 512) { flashStatus('LOOP.BREAK'); return; }
  msgDepth++;
  try {
    for (const c of graph.conns) {
      if (c.from.node !== node.id || (c.from.port || 0) !== port) continue;
      const target = graph.nodes.get(c.to.node);
      if (target) deliver(target, c.to.port, value);
    }
  } finally { msgDepth--; }
}

// ---------------------------------------------------------------- metro timers

const metros = new Map(); // nodeId -> intervalId

function metroInterval(node) {
  const iv = node.state.inletVals?.[1];
  return Math.max(20, coerceNum(iv !== undefined ? iv : argVal(node, 0), 500));
}

function startMetro(node) {
  const t = setInterval(() => {
    if (!graph.nodes.has(node.id) || node.type !== 'metro') { stopMetro(node.id); return; }
    fireOutlet(node, BANG);
    change(false); // ticks re-render but don't hammer localStorage
  }, metroInterval(node));
  metros.set(node.id, t);
}

function stopMetro(id) {
  const t = metros.get(id);
  if (t !== undefined) { clearInterval(t); metros.delete(id); }
}

// make running timers match the graph (call after any structural change)
function syncMetros() {
  for (const id of [...metros.keys()]) {
    const n = graph.nodes.get(id);
    if (!n || n.type !== 'metro' || !n.state.on) stopMetro(id);
  }
  for (const n of graph.nodes.values()) {
    if (n.type === 'metro' && n.state.on && !metros.has(n.id)) startMetro(n);
  }
  syncLiveTicker(); // webcam/feedback need a continuous redraw too
}

function restartMetro(node) {
  stopMetro(node.id);
  if (node.state.on) startMetro(node);
}

// ---------------------------------------------------------------- live ticker
// webcam and feedback nodes need a continuous ~30fps redraw even without a metro

let liveTimer = null;
function hasLiveNode() {
  for (const n of graph.nodes.values()) {
    if (n.type === 'webcam' || n.type === 'feedback') return true;
  }
  return false;
}
function syncLiveTicker() {
  const needs = hasLiveNode();
  if (needs && liveTimer === null) {
    liveTimer = setInterval(() => change(false), 33);
  } else if (!needs && liveTimer !== null) {
    clearInterval(liveTimer);
    liveTimer = null;
  }
  // release the camera when no webcam node remains
  let hasCam = false;
  for (const n of graph.nodes.values()) if (n.type === 'webcam') hasCam = true;
  if (!hasCam) stopWebcam();
}

// ---------------------------------------------------------------- ramp timers (PD [line])

const ramps = new Map(); // nodeId -> intervalId

function stopRamp(id) {
  const t = ramps.get(id);
  if (t !== undefined) { clearInterval(t); ramps.delete(id); }
}

function startRamp(node, target) {
  stopRamp(node.id);
  const ms = Math.max(0, coerceNum(node.state.inletVals?.[1] ?? argVal(node, 0), 500));
  const from = coerceNum(node.state.value, 0);
  if (ms <= 0) {
    node.state.value = target;
    fireOutlet(node, target);
    return;
  }
  const t0 = performance.now();
  const t = setInterval(() => {
    if (!graph.nodes.has(node.id) || node.type !== 'ramp') { stopRamp(node.id); return; }
    const k = Math.min(1, (performance.now() - t0) / ms);
    node.state.value = from + (target - from) * k;
    fireOutlet(node, node.state.value);
    if (k >= 1) stopRamp(node.id);
    change(false);
  }, 16);
  ramps.set(node.id, t);
}

// hsl (0-360, 0-100, 0-100) -> "#rrggbb"
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}

// smooth deterministic 1D value noise, -1..1
function noiseHash(i) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return 2 * (s - Math.floor(s)) - 1;
}
function noise1(x) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return noiseHash(i) * (1 - u) + noiseHash(i + 1) * u;
}

function mathOp(type, a, b) {
  switch (type) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b === 0 ? 0 : a / b;
    default: return 0;
  }
}

function compareOp(type, a, b) {
  switch (type) {
    case '>': return a > b;
    case '<': return a < b;
    case '==': return a === b;
    case '>=': return a >= b;
    default: return false;
  }
}

// a message arrives at a node's inlet
function deliver(node, port, value) {
  const def = TYPES[node.type];
  if (!def) return;

  if (def.gui) {
    switch (node.type) {
      case 'bng':
        flashNode(node);
        fireOutlet(node, BANG);
        break;
      case 'number': {
        const sm = parseSetMsg(value);
        const show = () => {
          const box = node.el.querySelector('.numbox');
          if (box) box.textContent = fmt(coerceNum(node.state.value, 0));
        };
        if (sm.set) { // "set N": store + display, no output
          if (sm.num !== undefined && isFinite(sm.num)) { node.state.value = sm.num; show(); }
          break;
        }
        if (value !== BANG) node.state.value = coerceNum(value, 0);
        show();
        fireOutlet(node, coerceNum(node.state.value, 0));
        break;
      }
      case 'toggle': {
        const sm = parseSetMsg(value);
        const show = () => {
          const box = node.el.querySelector('.tbox');
          if (box) box.textContent = node.state.on ? '✕' : ' ';
        };
        if (sm.set) {
          if (sm.num !== undefined && isFinite(sm.num)) { node.state.on = sm.num !== 0; show(); }
          break;
        }
        if (value === BANG) node.state.on = !node.state.on;
        else node.state.on = coerceNum(value, 0) !== 0;
        show();
        fireOutlet(node, node.state.on ? 1 : 0);
        break;
      }
      case 'hslider':
      case 'vslider': {
        const sm = parseSetMsg(value);
        if (sm.set) {
          if (sm.num !== undefined && isFinite(sm.num)) { node.state.value = sm.num; updateSlider(node); }
          break;
        }
        if (value !== BANG) node.state.value = coerceNum(value, 0);
        updateSlider(node);
        fireOutlet(node, sliderVal(node));
        break;
      }
      case 'string': {
        if (value !== BANG) {
          node.text = ('string ' + coerceStr(value)).trim();
          Object.assign(node, parseText(node.text));
          renderNodeContent(node);
          positionPorts(node);
        }
        flashNode(node);
        fireOutlet(node, stringVal(node));
        break;
      }
    }
    return;
  }

  if (!node.state.inletVals) node.state.inletVals = {};

  if (def.metro) {
    if (port === 0) {
      node.state.on = value === BANG ? true : coerceNum(value, 0) !== 0;
      restartMetro(node);
    } else if (port === 1 && value !== BANG) {
      node.state.inletVals[1] = coerceNum(value, 500);
      if (node.state.on) restartMetro(node);
    }
    return;
  }

  if (def.until) { // the PD loop: one trig -> N bangs, back to back
    if (port === 0) {
      let n = value === BANG
        ? coerceNum(node.state.inletVals[1] ?? argVal(node, 0), 10)
        : coerceNum(value, 0);
      n = clamp(Math.round(n), 0, 10000);
      for (let i = 0; i < n; i++) fireOutlet(node, BANG);
    } else if (value !== BANG) {
      node.state.inletVals[1] = coerceNum(value, 10);
    }
    return;
  }

  if (def.stamp) {
    if (port === 1) { // trig: freeze the current state of the draw input
      const conn = graph.conns.find(c =>
        c.type === 'draw' && c.to.node === node.id && c.to.port === 0);
      const cmds = conn ? drawOutOf(graph, conn.from.node) : null;
      if (Array.isArray(cmds) && cmds.length) {
        if (!node.state.stamps) node.state.stamps = [];
        node.state.stamps.push(cmds);
        const max = Math.max(1, Math.round(coerceNum(argVal(node, 0), 500)));
        while (node.state.stamps.length > max) node.state.stamps.shift();
      }
    } else if (port === 2) { // clear
      node.state.stamps = [];
    }
    return;
  }

  if (def.trigger) { // fire outlets RIGHT to LEFT: v passes the value, b bangs
    const outs = outletsOf(node);
    for (let i = outs.length - 1; i >= 0; i--) {
      fireOutlet(node, outs[i].mode === 'b' ? BANG : value, i);
    }
    return;
  }

  if (def.sel) {
    if (port === 0) {
      // single-arg sel: the set inlet can override the match value
      const matches = selArgs(node);
      if (matches.length === 1 && node.state.inletVals[1] !== undefined) matches[0] = node.state.inletVals[1];
      for (let i = 0; i < matches.length; i++) {
        if (selMatch(matches[i], value)) { fireOutlet(node, BANG, i); return; }
      }
      fireOutlet(node, value, matches.length); // rightmost: pass non-matching input through
    } else if (value !== BANG) {
      node.state.inletVals[1] = value;
    }
    return;
  }

  if (def.ramp) {
    if (port === 0) {
      if (value === BANG) { fireOutlet(node, coerceNum(node.state.value, 0)); return; }
      startRamp(node, coerceNum(value, 0));
    } else if (value !== BANG) {
      node.state.inletVals[1] = coerceNum(value, 500);
    }
    return;
  }

  if (def.noise) {
    if (port === 0) {
      if (value !== BANG) node.state.inletVals[0] = coerceNum(value, 0);
      const f = coerceNum(node.state.inletVals[1] ?? argVal(node, 0), 0.05);
      fireOutlet(node, noise1(coerceNum(node.state.inletVals[0], 0) * f));
    } else if (value !== BANG) {
      node.state.inletVals[1] = coerceNum(value, 0.05);
    }
    return;
  }

  if (def.send) { // wireless: deliver to every receive with the same name
    const name = (node.tokens || [])[1];
    if (!name) return;
    for (const n of graph.nodes.values()) {
      if (n.type === 'receive' && (n.tokens || [])[1] === name) fireOutlet(n, value);
    }
    return;
  }

  if (def.clamp) {
    if (port === 0) { // hot: clamp and send
      if (value !== BANG) node.state.inletVals[0] = coerceNum(value, 0);
      const a = coerceNum(node.state.inletVals[1] ?? argVal(node, 0), 0);
      const b = coerceNum(node.state.inletVals[2] ?? argVal(node, 1), 100);
      fireOutlet(node, clamp(coerceNum(node.state.inletVals[0], 0), Math.min(a, b), Math.max(a, b)));
    } else if (value !== BANG) { // cold: store bounds
      node.state.inletVals[port] = coerceNum(value, 0);
    }
    return;
  }

  if (def.change) { // pass only when the value differs from the previous one
    if (value === BANG) {
      if (node.state.last !== undefined) fireOutlet(node, node.state.last);
      return;
    }
    if (value !== node.state.last) {
      node.state.last = value;
      fireOutlet(node, value);
    }
    return;
  }

  if (def.hsl) {
    if (port === 0) { // hot: hue → compute color and send
      if (value !== BANG) node.state.inletVals[0] = coerceNum(value, 0);
      const g = i => coerceNum(node.state.inletVals[i] ?? argVal(node, i), 0);
      fireOutlet(node, hslToHex(g(0), g(1), g(2)));
    } else if (value !== BANG) { // cold: s / l
      node.state.inletVals[port] = coerceNum(value, 0);
    }
    return;
  }

  if (def.time) { // current time of day, right outlet first: s, m, h
    const d = new Date();
    fireOutlet(node, d.getSeconds(), 2);
    fireOutlet(node, d.getMinutes(), 1);
    fireOutlet(node, d.getHours(), 0);
    return;
  }

  if (def.map) {
    if (port === 0) { // hot: remap and send
      if (value !== BANG) node.state.inletVals[0] = coerceNum(value, 0);
      const g = i => coerceNum(node.state.inletVals[i] ?? argVal(node, i - 1), 0);
      const v = coerceNum(node.state.inletVals[0], 0);
      const a = g(1), b = g(2), c = g(3), d = g(4);
      fireOutlet(node, b === a ? c : c + (v - a) / (b - a) * (d - c));
    } else if (value !== BANG) { // cold: store range bounds
      node.state.inletVals[port] = coerceNum(value, 0);
    }
    return;
  }

  if (def.spigot) {
    if (port === 0) {
      const open = coerceNum(node.state.inletVals[1] ?? argVal(node, 0), 0) !== 0;
      if (open) fireOutlet(node, value);
    } else if (value !== BANG) {
      node.state.inletVals[1] = coerceNum(value, 0);
    }
    return;
  }

  if (def.pipe) {
    if (port === 0) {
      const ms = Math.max(0, coerceNum(node.state.inletVals[1] ?? argVal(node, 0), 500));
      setTimeout(() => {
        if (!graph.nodes.has(node.id)) return;
        fireOutlet(node, value);
        change(false);
      }, ms);
    } else if (value !== BANG) {
      node.state.inletVals[1] = coerceNum(value, 0);
    }
    return;
  }

  if (def.counter) {
    const min = coerceNum(argVal(node, 0), 0);
    const max = coerceNum(argVal(node, 1), 100);
    const step = coerceNum(argVal(node, 2), 1) || 1;
    if (port === 0) { // hot: send count, then advance (wrapping)
      if (value !== BANG) node.state.count = coerceNum(value, min);
      if (node.state.count === undefined) node.state.count = min;
      const out = node.state.count;
      let next = out + step;
      if (step > 0 && next > max) next = min;
      if (step < 0 && next < min) next = max;
      node.state.count = next;
      fireOutlet(node, out);
    } else { // cold: reset / jump, no output
      node.state.count = value === BANG ? min : coerceNum(value, min);
    }
    return;
  }

  if (def.fn) { // sin / cos — angle in degrees
    if (value !== BANG) node.state.inletVals[0] = coerceNum(value, 0);
    const rad = coerceNum(node.state.inletVals[0], 0) * Math.PI / 180;
    fireOutlet(node, node.type === 'sin' ? Math.sin(rad) : Math.cos(rad));
    return;
  }

  if (def.rand) {
    if (port === 0) {
      const max = Math.max(1, coerceNum(node.state.inletVals[1] ?? argVal(node, 0), 100));
      fireOutlet(node, Math.floor(Math.random() * max));
    } else if (value !== BANG) {
      node.state.inletVals[1] = coerceNum(value, 100);
    }
    return;
  }

  if (def.math) {
    if (port === 0) { // hot inlet
      if (value !== BANG) node.state.inletVals[0] = coerceNum(value, 0);
      const a = coerceNum(node.state.inletVals[0], 0);
      const b = coerceNum(node.state.inletVals[1] ?? argVal(node, 0), 0);
      fireOutlet(node, mathOp(node.type, a, b));
    } else if (value !== BANG) { // cold inlet
      node.state.inletVals[1] = coerceNum(value, 0);
    }
    return;
  }

  if (def.compare) {
    if (port === 0) { // hot: compare and send 1/0
      if (value !== BANG) node.state.inletVals[0] = coerceNum(value, 0);
      const a = coerceNum(node.state.inletVals[0], 0);
      const b = coerceNum(node.state.inletVals[1] ?? argVal(node, 0), 0);
      fireOutlet(node, compareOp(node.type, a, b) ? 1 : 0);
    } else if (value !== BANG) { // cold operand
      node.state.inletVals[1] = coerceNum(value, 0);
    }
    return;
  }

  if (def.moses) {
    if (port === 0) { // route by threshold: below → left, at-or-above → right
      if (value === BANG) return;
      const v = coerceNum(value, 0);
      const thr = coerceNum(node.state.inletVals[1] ?? argVal(node, 0), 0);
      fireOutlet(node, v, v < thr ? 0 : 1);
    } else if (value !== BANG) {
      node.state.inletVals[1] = coerceNum(value, 0);
    }
    return;
  }

  // draw node: control inlets remember the last received value; bangs are ignored here
  const inl = inletsOf(node)[port];
  if (!inl || inl.type === 'draw' || value === BANG) return;
  node.state.inletVals[port] = value;
}

function flashNode(node) {
  node.el.classList.add('flash');
  setTimeout(() => node.el?.classList.remove('flash'), 130);
}

function buildPorts(node) {
  const ins = inletsOf(node);
  const outs = outletsOf(node);

  if (ins.length) {
    const row = document.createElement('div');
    row.className = 'ports-in';
    ins.forEach((inl, i) => {
      const p = document.createElement('div');
      p.className = 'port';
      p.dataset.dir = 'in';
      p.dataset.idx = i;
      p.dataset.ptype = inl.type;
      p.dataset.pname = inl.name;
      row.appendChild(p);
    });
    node.el.appendChild(row);
  }
  if (outs.length) {
    const row = document.createElement('div');
    row.className = 'ports-out';
    outs.forEach((o, i) => {
      const p = document.createElement('div');
      p.className = 'port';
      p.dataset.dir = 'out';
      p.dataset.idx = i;
      p.dataset.ptype = o.type;
      p.dataset.pname = o.name;
      row.appendChild(p);
    });
    node.el.appendChild(row);
  }
}

// spread ports along the edge: first flush left, last flush right (PD style)
function positionPorts(node) {
  const w = node.el.offsetWidth;
  for (const row of node.el.querySelectorAll('.ports-in, .ports-out')) {
    const ports = row.children;
    const n = ports.length;
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 4 : 4 + i * (w - 8 - 9) / (n - 1);
      ports[i].style.left = Math.round(x) + 'px';
    }
  }
  refreshPortStates(node);
}

function refreshPortStates(node) {
  for (const p of node.el.querySelectorAll('.port')) {
    const idx = +p.dataset.idx;
    const connected = p.dataset.dir === 'in'
      ? graph.conns.some(c => c.to.node === node.id && c.to.port === idx)
      : graph.conns.some(c => c.from.node === node.id && (c.from.port || 0) === idx);
    p.classList.toggle('conn', connected);
  }
}

function relayoutAll() {
  for (const n of graph.nodes.values()) positionPorts(n);
  drawCables();
}

// ---------------------------------------------------------------- cables

function worldRect() { return $world.getBoundingClientRect(); }

function portCenter(nodeId, dir, idx) {
  const node = graph.nodes.get(nodeId);
  if (!node) return null;
  const p = node.el.querySelector(`.port[data-dir="${dir}"][data-idx="${idx}"]`);
  if (!p) return null;
  const r = p.getBoundingClientRect(), w = worldRect();
  return {
    x: (r.left + r.width / 2 - w.left) / view.zoom,
    y: (r.top + r.height / 2 - w.top) / view.zoom,
  };
}

function drawCables() {
  $svg.innerHTML = '';
  for (const c of graph.conns) {
    const a = portCenter(c.from.node, 'out', c.from.port || 0);
    const b = portCenter(c.to.node, 'in', c.to.port);
    if (!a || !b) continue;
    const isDraw = c.type === 'draw';
    const sel = selectedConns.has(c.id);
    const vis = mkLine(a, b, (isDraw ? 'c-draw' : 'c-ctl') + (sel ? ' c-sel' : ''));
    const hit = mkLine(a, b, 'c-hit');
    hit.dataset.conn = c.id;
    $svg.appendChild(vis);
    $svg.appendChild(hit);
  }
}

function mkLine(a, b, cls) {
  const l = document.createElementNS(SVGNS, 'line');
  l.setAttribute('x1', a.x); l.setAttribute('y1', a.y);
  l.setAttribute('x2', b.x); l.setAttribute('y2', b.y);
  l.setAttribute('class', cls);
  return l;
}

// ---------------------------------------------------------------- selection / deletion / history

function snapPos(v, enabled = true) {
  return enabled ? Math.round(v / GRID) * GRID : Math.round(v);
}

function updateSelectionVisuals() {
  for (const n of graph.nodes.values())
    n.el.classList.toggle('sel', selectedNodes.has(n.id));
  drawCables();
}

function clearSelection() {
  selectedNodes.clear();
  selectedConns.clear();
  updateSelectionVisuals();
}

function selectOnlyNode(id) {
  selectedNodes.clear();
  selectedConns.clear();
  selectedNodes.add(id);
  updateSelectionVisuals();
}

function toggleNodeSelection(id) {
  selectedConns.clear();
  if (selectedNodes.has(id)) selectedNodes.delete(id);
  else selectedNodes.add(id);
  updateSelectionVisuals();
}

function selectConn(id) {
  selectedNodes.clear();
  selectedConns.clear();
  selectedConns.add(id);
  updateSelectionVisuals();
}

function selectNodesInRect(x1, y1, x2, y2, additive = false) {
  const l = Math.min(x1, x2), r = Math.max(x1, x2);
  const t = Math.min(y1, y2), b = Math.max(y1, y2);
  if (!additive) { selectedNodes.clear(); selectedConns.clear(); }
  for (const n of graph.nodes.values()) {
    const el = n.el;
    const nx = n.x, ny = n.y;
    const nw = el.offsetWidth, nh = el.offsetHeight;
    if (nx + nw >= l && nx <= r && ny + nh >= t && ny <= b) selectedNodes.add(n.id);
  }
  updateSelectionVisuals();
}

function pushHistory() {
  if (historyPaused) return;
  undoStack.push(JSON.stringify(getPatchData()));
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
}

function undo() {
  if (!undoStack.length) return;
  historyPaused = true;
  redoStack.push(JSON.stringify(getPatchData()));
  applyPatch(JSON.parse(undoStack.pop()), { skipHistoryClear: true });
  historyPaused = false;
  save();
  change(false);
}

function redo() {
  if (!redoStack.length) return;
  historyPaused = true;
  undoStack.push(JSON.stringify(getPatchData()));
  applyPatch(JSON.parse(redoStack.pop()), { skipHistoryClear: true });
  historyPaused = false;
  save();
  change(false);
}

function cloneNodeState(state) {
  try { return JSON.parse(JSON.stringify(state || {})); }
  catch { return {}; }
}

function duplicateNodes(ids, offsetX = GRID, offsetY = GRID) {
  const srcIds = [...ids].filter(id => graph.nodes.has(id));
  if (!srcIds.length) return [];
  const newIds = [];
  for (const id of srcIds) {
    const src = graph.nodes.get(id);
    const node = {
      id: nextId++,
      text: src.text,
      ...parseText(src.text),
      x: Math.max(0, snapPos(src.x + offsetX)),
      y: Math.max(0, snapPos(src.y + offsetY)),
      state: cloneNodeState(src.state),
    };
    graph.nodes.set(node.id, node);
    buildNodeEl(node);
    newIds.push(node.id);
  }
  selectedNodes.clear();
  selectedConns.clear();
  for (const id of newIds) selectedNodes.add(id);
  relayoutAll();
  syncMetros();
  return newIds;
}

function duplicateSelection() {
  if (!selectedNodes.size) return;
  pushHistory();
  duplicateNodes(selectedNodes);
  change();
}

// ---------------------------------------------------------------- copy / paste

const CLIP_FORMAT = 'puredraw.clip';
let clipFallback = null; // in-memory buffer when the system clipboard is unavailable
let pasteSeq = 0;        // consecutive pastes fan out by one grid step each

function serializeSelection() {
  const ids = [...selectedNodes].filter(id => graph.nodes.has(id));
  if (!ids.length) return null;
  const idSet = new Set(ids);
  const nodes = ids.map(id => {
    const n = graph.nodes.get(id);
    return { id: n.id, text: n.text, x: n.x, y: n.y, state: n.state };
  });
  const conns = graph.conns
    .filter(c => idSet.has(c.from.node) && idSet.has(c.to.node))
    .map(c => ({ from: c.from, to: c.to, type: c.type }));
  return { format: CLIP_FORMAT, version: 1, nodes, conns };
}

function copySelection() {
  const data = serializeSelection();
  if (!data) return;
  const text = JSON.stringify(data);
  clipFallback = text;
  pasteSeq = 0;
  navigator.clipboard?.writeText(text).catch(() => { /* fallback buffer already set */ });
  flashStatus(`COPIED.${data.nodes.length}`);
}

function cutSelection() {
  if (!selectedNodes.size) return;
  copySelection();
  deleteSelection();
}

async function pasteClipboard() {
  let text = null;
  try { text = await navigator.clipboard.readText(); } catch { /* e.g. Firefox denies read */ }
  if (!text || !text.includes(CLIP_FORMAT)) text = clipFallback;
  if (!text) return;
  let data;
  try { data = JSON.parse(text); } catch { return; }
  if (data?.format !== CLIP_FORMAT || !Array.isArray(data.nodes) || !data.nodes.length) return;

  pushHistory();
  pasteSeq++;
  const off = GRID * pasteSeq;
  const idMap = new Map();
  for (const src of data.nodes) {
    const node = {
      id: nextId++,
      text: String(src.text ?? ''),
      ...parseText(String(src.text ?? '')),
      x: Math.max(0, snapPos((+src.x || 0) + off)),
      y: Math.max(0, snapPos((+src.y || 0) + off)),
      state: cloneNodeState(src.state),
    };
    graph.nodes.set(node.id, node);
    buildNodeEl(node);
    idMap.set(src.id, node.id);
  }
  if (Array.isArray(data.conns)) {
    for (const c of data.conns) {
      const from = idMap.get(c?.from?.node), to = idMap.get(c?.to?.node);
      if (from == null || to == null) continue;
      graph.conns.push({
        id: nextId++,
        from: { node: from, port: c.from.port || 0 },
        to: { node: to, port: c.to.port || 0 },
        type: c.type === 'draw' ? 'draw' : 'ctl',
      });
    }
  }
  selectedNodes.clear();
  selectedConns.clear();
  for (const id of idMap.values()) selectedNodes.add(id);
  updateSelectionVisuals();
  relayoutAll();
  syncMetros();
  change();
  flashStatus(`PASTED.${idMap.size}`);
}

function deleteSelection() {
  if (!selectedNodes.size && !selectedConns.size) return;
  pushHistory();
  for (const id of selectedNodes) {
    const node = graph.nodes.get(id);
    if (!node) continue;
    node.el.remove();
    graph.nodes.delete(id);
    stopMetro(id);
    stopRamp(id);
  }
  if (selectedNodes.size)
    graph.conns = graph.conns.filter(c =>
      !selectedNodes.has(c.from.node) && !selectedNodes.has(c.to.node));
  if (selectedConns.size)
    graph.conns = graph.conns.filter(c => !selectedConns.has(c.id));
  selectedNodes.clear();
  selectedConns.clear();
  relayoutAll();
  syncMetros();
  change();
}

// ---------------------------------------------------------------- editing node text

function filterTypeSuggestions(text) {
  const trimmed = text.trimStart();
  const space = trimmed.search(/\s/);
  const prefix = (space < 0 ? trimmed : trimmed.slice(0, space)).toLowerCase();
  if (!prefix || TYPES[prefix]) return [];
  return Object.keys(TYPES)
    .filter(t => t.startsWith(prefix))
    .sort((a, b) => a.localeCompare(b));
}

function applyTypeSuggestion(text, type) {
  const trimmed = text.trimStart();
  const space = trimmed.search(/\s/);
  const rest = space < 0 ? '' : trimmed.slice(space);
  return type + rest;
}

function editNode(node, isNew = false) {
  const el = node.el;
  el.className = 'node';
  el.innerHTML = '';
  const input = document.createElement('input');
  input.className = 'edit';
  input.value = node.text || '';
  input.spellcheck = false;
  el.appendChild(input);
  input.focus();
  input.select();

  const ac = document.createElement('div');
  ac.className = 'dropdown ac-list hidden';
  document.body.appendChild(ac);

  // io help panel — inlets/outlets of the node being typed, shown beside the box
  const ioTip = document.createElement('div');
  ioTip.className = 'io-tip hidden';
  document.body.appendChild(ioTip);

  let acIdx = 0;
  let suggestions = [];

  const positionAc = () => {
    const r = input.getBoundingClientRect();
    ac.style.left = r.left + 'px';
    ac.style.top = (r.bottom + 2) + 'px';
    ac.style.minWidth = Math.max(180, r.width) + 'px';
  };

  // the type whose IO to preview: an exact match once the name is typed,
  // otherwise the currently highlighted autocomplete suggestion
  const currentType = () => {
    const first = input.value.trim().split(/\s+/)[0].toLowerCase();
    if (TYPES[first]) return first;
    if (suggestions.length) return suggestions[acIdx] || suggestions[0];
    return null;
  };

  const renderIoTip = () => {
    const type = currentType();
    const h = type && HELP[type];
    if (!h) { ioTip.classList.add('hidden'); return; }
    const ins = h.inlets || [];
    const outs = h.outs || (h.out && !h.out.startsWith('—') ? [['out', '', h.out]] : []);
    const inRows = ins.map(([n, t, d], i) =>
      `<div class="io-row"><span class="io-tag">IN.${i + 1}</span><span class="io-name">${n}${t ? ':' + t : ''}</span><span class="io-desc">${d}</span></div>`).join('');
    const outRows = outs.map(([n, t, d], i) =>
      `<div class="io-row"><span class="io-tag">${outs.length > 1 ? 'OUT.' + (i + 1) : 'OUT'}</span><span class="io-name">${n && n !== 'out' ? n + (t ? ':' + t : '') : ''}</span><span class="io-desc">${d}</span></div>`).join('');
    ioTip.innerHTML =
      `<div class="io-tip-name">${type}</div>` +
      (ins.length ? `<div class="io-tip-sect">INLETS</div>${inRows}` : `<div class="io-tip-sect">NO INLETS</div>`) +
      (outs.length ? `<div class="io-tip-sect">OUTLETS</div>${outRows}` : '');
    // place to the right of the node, flipping left if it would overflow
    const r = input.getBoundingClientRect();
    ioTip.classList.remove('hidden');
    const w = ioTip.offsetWidth;
    let left = r.right + 10;
    if (left + w > window.innerWidth - 8) left = Math.max(8, r.left - w - 10);
    ioTip.style.left = left + 'px';
    ioTip.style.top = r.top + 'px';
  };

  const renderAc = () => {
    suggestions = filterTypeSuggestions(input.value);
    acIdx = 0;
    if (!suggestions.length) { ac.classList.add('hidden'); }
    else {
      ac.innerHTML = suggestions.slice(0, 12).map((t, i) => {
        const hint = argHint(t);
        const h = HELP[t];
        return `<div class="dd-item${i === 0 ? ' active' : ''}" data-type="${t}">
          <div class="dd-item-row"><span>${t}</span>${hint ? `<span class="hint">${hint}</span>` : ''}</div>
          ${h?.short ? `<div class="dd-item-short">${h.short}</div>` : ''}
        </div>`;
      }).join('');
      positionAc();
      ac.classList.remove('hidden');
    }
    renderIoTip();
  };

  const acceptSuggestion = (type) => {
    input.value = applyTypeSuggestion(input.value, type);
    ac.classList.add('hidden');
    suggestions = [];
    renderIoTip();
  };

  ac.addEventListener('mousedown', e => {
    e.preventDefault();
    const item = e.target.closest('.dd-item');
    if (item) acceptSuggestion(item.dataset.type);
  });

  input.addEventListener('input', renderAc);
  renderAc();

  let done = false;
  const cleanup = () => { ac.remove(); ioTip.remove(); };
  const commit = (cancel) => {
    if (done) return;
    done = true;
    cleanup();
    const val = input.value.trim();
    if (cancel || !val) {
      if (isNew || !node.text) {
        if (node.text) pushHistory();
        el.remove();
        graph.nodes.delete(node.id);
      } else {
        renderNodeContent(node);
      }
      relayoutAll();
      change(false);
      return;
    }
    pushHistory();
    setNodeText(node, val, false);
  };
  input.addEventListener('keydown', e => {
    e.stopPropagation();
    if (suggestions.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      acIdx = (acIdx + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length;
      ac.querySelectorAll('.dd-item').forEach((item, i) => item.classList.toggle('active', i === acIdx));
      renderIoTip();
      return;
    }
    if (e.key === 'Tab' && suggestions.length) {
      e.preventDefault();
      acceptSuggestion(suggestions[acIdx] || suggestions[0]);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length) acceptSuggestion(suggestions[acIdx] || suggestions[0]);
      commit(false);
    }
    if (e.key === 'Escape') commit(true);
  });
  input.addEventListener('blur', () => commit(false));
  input.addEventListener('mousedown', e => e.stopPropagation());
}

function setNodeText(node, text, recordHistory = true) {
  if (recordHistory) pushHistory();
  node.text = text;
  Object.assign(node, parseText(text));
  node.state.inletVals = {}; // retyping the node resets its received values (PD: object is recreated)
  // prune connections that no longer fit the new port layout / types
  const ins = inletsOf(node);
  const outs = outletsOf(node);
  graph.conns = graph.conns.filter(c => {
    if (c.to.node === node.id) {
      const inl = ins[c.to.port];
      return inl && (c.type === 'draw') === (inl.type === 'draw');
    }
    if (c.from.node === node.id) {
      const o = outs[c.from.port || 0];
      return !!o && (c.type === 'draw') === (o.type === 'draw');
    }
    return true;
  });
  renderNodeContent(node);
  relayoutAll();
  stopMetro(node.id); // retyped: restart with the new interval (or stop if no longer a metro)
  stopRamp(node.id);
  syncMetros();
  change();
  if (TYPES[node.type]) document.dispatchEvent(new CustomEvent('gd-node-used', { detail: node.type }));
}

// number box activation (PD Number2 style): click to activate, type, Enter sends
// (Enter again re-sends), Escape or clicking outside cancels and deactivates
function activateNumber(node) {
  const box = node.el.querySelector('.numbox');
  if (!box) return;
  const input = document.createElement('input');
  input.className = 'edit num-edit';
  input.value = fmt(coerceNum(node.state.value, 0));
  box.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const deactivate = () => {
    if (done) return;
    done = true;
    renderNodeContent(node);
    relayoutAll();
  };
  input.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      const v = input.value.trim();
      if (v !== '') node.state.value = coerceNum(v, coerceNum(node.state.value, 0));
      input.value = fmt(coerceNum(node.state.value, 0));
      input.select();
      fireOutlet(node, coerceNum(node.state.value, 0));
      change();
    }
    if (e.key === 'Escape') deactivate();
  });
  input.addEventListener('blur', deactivate);
  input.addEventListener('mousedown', e => e.stopPropagation());
}

// ---------------------------------------------------------------- interaction

function bindGlobal() {
  $editor.addEventListener('mousedown', onMouseDown);
  $editor.addEventListener('dblclick', onDblClick);
  $editor.addEventListener('mouseover', onHover);
  $editor.addEventListener('mouseout', () => $tip.classList.add('hidden'));
  $editor.addEventListener('scroll', () => $tip.classList.add('hidden'));

  document.addEventListener('keydown', e => {
    const t = document.activeElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if (mod && (e.key === 'Z' || (e.key === 'z' && e.shiftKey) || e.key === 'y')) {
      e.preventDefault(); redo(); return;
    }
    if (mod && e.key === 'd') { e.preventDefault(); duplicateSelection(); return; }
    if (mod && e.key === 'c') { e.preventDefault(); copySelection(); return; }
    if (mod && e.key === 'x') { e.preventDefault(); cutSelection(); return; }
    if (mod && e.key === 'v') { e.preventDefault(); pasteClipboard(); return; }
    if (mod && (e.key === '0' || e.key === '=')) { e.preventDefault(); resetView(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelection(); }
    if (e.key === 'Escape') clearSelection();
    // key nodes broadcast every keypress
    let any = false;
    for (const n of graph.nodes.values()) {
      if (n.type !== 'key') continue;
      any = true;
      fireOutlet(n, e.key);
    }
    if (any) change(false);
  });
}

function worldPos(e) {
  const r = worldRect();
  return { x: (e.clientX - r.left) / view.zoom, y: (e.clientY - r.top) / view.zoom };
}

function onHover(e) {
  const port = e.target.closest?.('.port');
  if (!port) { $tip.classList.add('hidden'); return; }
  const nodeEl = port.closest('.node');
  const node = nodeEl ? graph.nodes.get(+nodeEl.dataset.id) : null;
  const h = node ? HELP[node.type] : null;
  const idx = +port.dataset.idx;
  const dir = port.dataset.dir;
  let desc = '';
  if (h) {
    const list = dir === 'in' ? h.inlets : (h.outs || (h.out && !h.out.startsWith('—') ? [['out', '', h.out]] : []));
    if (list && list[idx]) desc = list[idx][2] || '';
  }
  $tip.innerHTML = `<strong>${port.dataset.pname}:${port.dataset.ptype}</strong>${desc ? `<div style="font-size:9px;color:var(--gray);margin-top:2px">${desc}</div>` : ''}`;
  const r = port.getBoundingClientRect();
  $tip.style.left = (r.left + r.width / 2) + 'px';
  $tip.style.top = (r.top - 22) + 'px';
  $tip.classList.remove('hidden');
}

function onDblClick(e) {
  const nodeEl = e.target.closest?.('.node');
  if (nodeEl) return; // handled per-node below
  if (e.target.closest?.('.port')) return;
  // empty space -> new node
  const pos = worldPos(e);
  const node = {
    id: nextId++, text: '', type: '', tokens: [],
    x: Math.max(0, snapPos(pos.x)), y: Math.max(0, snapPos(pos.y)), state: {},
  };
  graph.nodes.set(node.id, node);
  buildNodeEl(node);
  editNode(node, true);
}

function onMouseDown(e) {
  if (e.button !== 0 || spaceDown) return; // Space+drag is panning

  const port = e.target.closest?.('.port');
  if (port) { startConnect(e, port); return; }

  const hitLine = e.target.dataset?.conn;
  if (hitLine) { selectConn(+hitLine); return; }

  const nodeEl = e.target.closest?.('.node');
  if (!nodeEl) { startMarquee(e); return; }
  const node = graph.nodes.get(+nodeEl.dataset.id);
  if (!node) return;
  if (e.target.tagName === 'INPUT') return;

  if (e.shiftKey) toggleNodeSelection(node.id);
  else if (!selectedNodes.has(node.id)) selectOnlyNode(node.id);

  const def = TYPES[node.type];

  // gui control areas
  if (def?.gui) {
    if (e.target.closest('.handle')) { startDragNode(e, node); return; }
    if (node.type === 'bng' && e.target.closest('.bbox')) {
      flashNode(node);
      fireOutlet(node, BANG);
      change();
      return;
    }
    if (node.type === 'string' && e.target.closest('.body')) {
      flashNode(node);
      fireOutlet(node, stringVal(node));
      change();
      if (!e.shiftKey) selectOnlyNode(node.id);
      return;
    }
    if (node.type === 'toggle' && e.target.closest('.tbox')) {
      node.state.on = !node.state.on;
      const box = node.el.querySelector('.tbox');
      if (box) box.textContent = node.state.on ? '✕' : ' ';
      fireOutlet(node, node.state.on ? 1 : 0);
      change();
      return;
    }
    if ((node.type === 'hslider' || node.type === 'vslider') && e.target.closest('.track')) {
      startDragSlider(e, node);
      return;
    }
    if (node.type === 'number' && e.target.closest('.numbox')) {
      startDragNumber(e, node);
      return;
    }
    startDragNode(e, node);
    return;
  }

  startDragNode(e, node);
}

// drag helpers -----------------------------------------------------

function drag(onMove, onUp) {
  const move = e => onMove(e);
  const up = e => {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    onUp?.(e);
  };
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
}

function startDragNode(e, node) {
  e.preventDefault();
  let dragIds;
  let recorded = false;

  if (e.altKey) {
    pushHistory();
    recorded = true;
    const src = selectedNodes.has(node.id) ? [...selectedNodes] : [node.id];
    dragIds = duplicateNodes(src, GRID, GRID);
  } else {
    dragIds = selectedNodes.has(node.id) ? [...selectedNodes] : [node.id];
  }

  const origins = new Map();
  for (const id of dragIds) {
    const n = graph.nodes.get(id);
    if (n) origins.set(id, { x: n.x, y: n.y });
  }

  const start = worldPos(e);
  let moved = false;
  drag(ev => {
    const p = worldPos(ev);
    const dx = p.x - start.x, dy = p.y - start.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      if (!recorded) { pushHistory(); recorded = true; }
      moved = true;
    }
    if (!moved) return;
    const snap = !ev.shiftKey;
    for (const [id, o] of origins) {
      const n = graph.nodes.get(id);
      if (!n) continue;
      n.x = Math.max(0, snapPos(o.x + dx, snap));
      n.y = Math.max(0, snapPos(o.y + dy, snap));
      n.el.style.left = n.x + 'px';
      n.el.style.top = n.y + 'px';
    }
    drawCables();
  }, () => {
    if (moved || e.altKey) change();
  });
}

function startMarquee(e) {
  e.preventDefault();
  const additive = e.shiftKey;
  if (!additive) clearSelection();
  const start = worldPos(e);
  const box = document.createElement('div');
  box.className = 'marquee';
  $world.appendChild(box);

  drag(ev => {
    const p = worldPos(ev);
    const l = Math.min(start.x, p.x), t = Math.min(start.y, p.y);
    box.style.left = l + 'px';
    box.style.top = t + 'px';
    box.style.width = Math.abs(p.x - start.x) + 'px';
    box.style.height = Math.abs(p.y - start.y) + 'px';
  }, ev => {
    box.remove();
    const p = worldPos(ev);
    if (Math.abs(p.x - start.x) > 3 || Math.abs(p.y - start.y) > 3)
      selectNodesInRect(start.x, start.y, p.x, p.y, additive);
    else if (!additive) clearSelection();
  });
}

function startDragNumber(e, node) {
  e.preventDefault();
  const startY = e.clientY;
  const startV = coerceNum(node.state.value, 0);
  let moved = false;
  drag(ev => {
    const dy = startY - ev.clientY;
    if (Math.abs(dy) > 2) moved = true;
    if (!moved) return;
    const step = ev.shiftKey ? 10 : 1;
    node.state.value = startV + Math.round(dy / 2) * step;
    const box = node.el.querySelector('.numbox');
    if (box) box.textContent = fmt(node.state.value);
    fireOutlet(node, node.state.value);
    change();
  }, () => {
    if (!moved) activateNumber(node); // plain click activates typing (PD style)
  });
}

function startDragSlider(e, node) {
  e.preventDefault();
  const track = node.el.querySelector('.track');
  const apply = ev => {
    const r = track.getBoundingClientRect();
    const min = argVal(node, 0) ?? 0, max = argVal(node, 1) ?? 100;
    const ratio = node.type === 'hslider'
      ? (ev.clientX - r.left) / r.width
      : (r.bottom - ev.clientY) / r.height;
    const v = min + clamp(ratio, 0, 1) * (max - min);
    node.state.value = Math.round(v * 100) / 100;
    updateSlider(node, track);
    fireOutlet(node, sliderVal(node));
    change();
  };
  apply(e);
  drag(apply);
}

// connecting cables ------------------------------------------------

// mark every port that a cable from (startNode, startDir:startType) could legally
// reach: opposite direction, compatible type, different node. Label compatible inlets.
function highlightCompatiblePorts(startNode, startDir, startType) {
  const wantDir = startDir === 'out' ? 'in' : 'out';
  $nodes.classList.add('wiring');
  for (const p of $nodes.querySelectorAll('.port')) {
    const sameNode = +p.closest('.node').dataset.id === startNode;
    const ok = !sameNode && p.dataset.dir === wantDir && typesMatch(startType, p.dataset.ptype);
    if (!ok) continue;
    p.classList.add('compat');
    if (wantDir === 'in') { // name the reachable inlets
      const label = document.createElement('span');
      label.className = 'port-label';
      label.textContent = p.dataset.pname;
      p.appendChild(label);
    }
  }
}

function clearWiringHighlight() {
  $nodes.classList.remove('wiring');
  for (const p of $nodes.querySelectorAll('.port.compat, .port.hot')) {
    p.classList.remove('compat', 'hot');
  }
  for (const l of $nodes.querySelectorAll('.port-label')) l.remove();
}

function startConnect(e, portEl) {
  e.preventDefault();
  const nodeEl = portEl.closest('.node');
  const startNode = +nodeEl.dataset.id;
  const startDir = portEl.dataset.dir;
  const startIdx = +portEl.dataset.idx;
  const startType = portEl.dataset.ptype;

  const a = portCenter(startNode, startDir, startIdx);
  const temp = mkLine(a, a, 'c-temp');
  $svg.appendChild(temp);

  // smart wiring: highlight the ports this cable could legally reach, dim the rest,
  // and label the compatible inlets by name so you don't have to hover to guess
  highlightCompatiblePorts(startNode, startDir, startType);
  let lastHot = null;

  drag(ev => {
    const p = worldPos(ev);
    temp.setAttribute('x2', p.x);
    temp.setAttribute('y2', p.y);
    const hov = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.port');
    if (hov !== lastHot) {
      lastHot?.classList.remove('hot');
      if (hov?.classList.contains('compat')) hov.classList.add('hot');
      lastHot = hov;
    }
  }, ev => {
    clearWiringHighlight();
    temp.remove();
    const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.port');
    if (!target) { drawCables(); return; }
    const tNodeEl = target.closest('.node');
    const tNode = +tNodeEl.dataset.id;
    const tDir = target.dataset.dir;
    const tIdx = +target.dataset.idx;
    const tType = target.dataset.ptype;

    let from, to, fromType, toType;
    if (startDir === 'out' && tDir === 'in') {
      from = { node: startNode, port: startIdx }; to = { node: tNode, port: tIdx };
      fromType = startType; toType = tType;
    } else if (startDir === 'in' && tDir === 'out') {
      from = { node: tNode, port: tIdx }; to = { node: startNode, port: startIdx };
      fromType = tType; toType = startType;
    } else { drawCables(); return; }

    if (from.node === to.node) { drawCables(); return; }
    if (!typesMatch(fromType, toType)) { flashStatus('TYPE.MISMATCH'); drawCables(); return; }

    const canvasDrawInlet = fromType === 'draw'
      && graph.nodes.get(to.node)?.type === 'canvas' && to.port === 0;
    if (fromType === 'draw' && !canvasDrawInlet) {
      // draw inlets take a single cable: replace existing
      pushHistory();
      graph.conns = graph.conns.filter(c => !(c.to.node === to.node && c.to.port === to.port));
    } else {
      // control inlets + the canvas draw inlet take many cables, but no exact duplicates
      const dup = graph.conns.some(c =>
        c.from.node === from.node && (c.from.port || 0) === from.port
        && c.to.node === to.node && c.to.port === to.port);
      if (dup) { drawCables(); return; }
      pushHistory();
    }
    graph.conns.push({ id: nextId++, from, to, type: fromType === 'draw' ? 'draw' : 'ctl' });
    relayoutAll();
    change();
  });
}

let statusTimer = null;
function flashStatus(msg) {
  $status.textContent = msg;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => change(false), 1200);
}

// per-node dblclick (edit) — delegated
document.addEventListener('dblclick', e => {
  const nodeEl = e.target.closest?.('.node');
  if (!nodeEl) return;
  if (e.target.tagName === 'INPUT') return;
  const node = graph.nodes.get(+nodeEl.dataset.id);
  if (!node) return;
  const def = TYPES[node.type];
  if (def?.gui) {
    if (node.type === 'number' && e.target.closest('.numbox')) { activateNumber(node); return; }
    if (e.target.closest('.handle') || node.type === 'string') { editNode(node); return; }
    return;
  }
  editNode(node);
});
