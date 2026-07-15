// top menus (FILE / ADD), node context menu, help modal
import { TYPES, CATEGORIES, HELP } from './nodes.js';
import { addNodeFromTemplate, clearPatch, exportPNG, loadPatch, savePatchFile, hasNativeSave } from './editor.js';
import { DEMO } from './demo.js';
import { DEMO2 } from './demo2.js';
import { DEMO3 } from './demo3.js';
import { DEMO4 } from './demo4.js';
import { DEMO5 } from './demo5.js';
import { DEMO6 } from './demo6.js';
import { DEMO7 } from './demo7.js';
import { DEMO8 } from './demo8.js';
import { DEMO9 } from './demo9.js';
import { DEMO10 } from './demo10.js';
import { DEMO11 } from './demo11.js';
import { DEMO12 } from './demo12.js';

const RECENT_KEY = 'puredraw.recent.v1';
const RECENT_MAX = 8;

let recent = [];
try { recent = JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { /* ignore */ }
recent = recent.filter(t => TYPES[t]);

let openBtn = null;   // currently open menu button
let activeTab = 'RECENT';

const $ = id => document.getElementById(id);

// track recently used node types (from ADD menu and from typing)
document.addEventListener('gd-node-used', e => {
  const t = e.detail;
  if (!TYPES[t]) return;
  recent = [t, ...recent.filter(x => x !== t)].slice(0, RECENT_MAX);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  if (activeTab === 'RECENT') renderAddList();
});

export function initUI() {
  bindMenuButton($('mb-file'), $('dd-file'));
  bindMenuButton($('mb-add'), $('dd-add'));
  bindMenuButton($('mb-demos'), $('dd-demos'));

  $('mi-new').addEventListener('click', () => {
    closeMenus();
    if (confirm('Clear patch?')) clearPatch();
  });
  $('mi-demo1').addEventListener('click', () => {
    closeMenus();
    if (confirm('Open demo 1? Current patch will be replaced.')) loadPatch(DEMO);
  });
  $('mi-demo2').addEventListener('click', () => {
    closeMenus();
    if (confirm('Open demo 2? Current patch will be replaced.')) loadPatch(DEMO2);
  });
  $('mi-demo3').addEventListener('click', () => {
    closeMenus();
    if (confirm('Open demo 3? Current patch will be replaced.')) loadPatch(DEMO3);
  });
  $('mi-demo4').addEventListener('click', () => {
    closeMenus();
    if (confirm('Open demo 4? Current patch will be replaced.')) loadPatch(DEMO4);
  });
  $('mi-demo5').addEventListener('click', () => {
    closeMenus();
    if (confirm('Open demo 5? Current patch will be replaced.')) loadPatch(DEMO5);
  });
  $('mi-demo6').addEventListener('click', () => {
    closeMenus();
    if (confirm('Open demo 6? Current patch will be replaced.')) loadPatch(DEMO6);
  });
  $('mi-demo7').addEventListener('click', () => {
    closeMenus();
    if (confirm('Open demo 7? Current patch will be replaced.')) loadPatch(DEMO7);
  });
  $('mi-demo8').addEventListener('click', () => {
    closeMenus();
    if (confirm('Open demo 8? Current patch will be replaced.')) loadPatch(DEMO8);
  });
  $('mi-demo9').addEventListener('click', () => {
    closeMenus();
    if (confirm('Open demo 9? Current patch will be replaced.')) loadPatch(DEMO9);
  });
  $('mi-demo10').addEventListener('click', () => {
    closeMenus();
    if (confirm('Open demo 10? Current patch will be replaced.')) loadPatch(DEMO10);
  });
  $('mi-demo11').addEventListener('click', () => {
    closeMenus();
    if (confirm('Open demo 11? Current patch will be replaced.')) loadPatch(DEMO11);
  });
  $('mi-demo12').addEventListener('click', () => {
    closeMenus();
    if (confirm('Open demo 12? Current patch will be replaced.')) loadPatch(DEMO12);
  });
  $('mi-save').addEventListener('click', () => {
    closeMenus();
    // native OS save dialog when available; otherwise the in-app name modal
    if (hasNativeSave()) savePatchFile();
    else openSaveDialog();
  });
  $('mi-load').addEventListener('click', () => { closeMenus(); $('file-input').click(); });
  $('file-input').addEventListener('change', onFilePicked);
  $('mi-export').addEventListener('click', () => { closeMenus(); exportPNG(); });

  $('save-confirm').addEventListener('click', confirmSave);
  $('save-cancel').addEventListener('click', hideSaveDialog);
  $('save-modal').addEventListener('mousedown', e => { if (e.target.id === 'save-modal') hideSaveDialog(); });
  $('save-name').addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') confirmSave();
    if (e.key === 'Escape') hideSaveDialog();
  });

  buildTabs();
  renderAddList();
  bindContextMenu();
  buildManual();

  document.addEventListener('mousedown', e => {
    if (openBtn && !e.target.closest('.dropdown') && !e.target.closest('.menu-btn')) closeMenus();
    if (!e.target.closest('#ctx')) hideCtx();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeMenus(); hideCtx(); hideModal(); hideSaveDialog(); hideManual(); }
  });

  $('modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') hideModal(); });
  $('modal-close').addEventListener('click', hideModal);
  $('mb-manual').addEventListener('click', () => { closeMenus(); showManual(); });
  $('manual-close').addEventListener('click', hideManual);
  $('manual').addEventListener('mousedown', e => { if (e.target.id === 'manual') hideManual(); });
}

// ---------------------------------------------------------------- manual page

function buildManual() {
  const nav = $('manual-nav'), content = $('manual-content');
  const intro = `
    <section class="man-section" id="man-intro">
      <h2>PURE.DRAW</h2>
      <p class="man-lead">A node-based graphics tool — Pure Data for graphic design. Patch nodes together; the draw signal flows into the canvas on the right.</p>
      <div class="man-rules">
        <div><b>Double-click</b> empty space to type a node · <b>ADD</b> menu to browse them</div>
        <div><b>Drag</b> a port to another to connect · thin cable = control, thick = draw</div>
        <div><b>Two fingers</b> pan · <b>pinch / wheel</b> zoom · <b>Space+drag</b> pan</div>
        <div><b>Right-click</b> a node for its help · <b>⌘Z</b> undo · <b>⌘D</b> duplicate</div>
        <div>Thin cables carry <b>messages</b> — a bang triggers, numbers/strings flow. Draw cables carry a continuous <b>picture</b>. A control inlet remembers the last value it got.</div>
        <div>The canvas size is available as the variables <b>w</b> and <b>h</b> in any numeric field, as an expression: <b>rect w/2 h/2 w/4 h/4</b>. Math: + − × ÷ % and ( ).</div>
      </div>
    </section>`;
  let navHtml = '<a href="#man-intro" data-target="man-intro">INTRO</a>';
  let bodyHtml = intro;

  for (const [cat, types] of CATEGORIES) {
    const id = 'man-' + cat.toLowerCase();
    navHtml += `<a href="#${id}" data-target="${id}">${cat}</a>`;
    let rows = '';
    for (const type of types) {
      const h = HELP[type];
      if (!h) continue;
      const ins = (h.inlets || []).map(([n, t, d]) =>
        `<div class="man-io"><span class="man-io-n">${n}:${t}</span><span class="man-io-d">${d}</span></div>`).join('');
      const outs = h.outs
        ? h.outs.map(([n, t, d]) => `<div class="man-io"><span class="man-io-n">${n}:${t}</span><span class="man-io-d">${d}</span></div>`).join('')
        : (h.out && !h.out.startsWith('—') ? `<div class="man-io"><span class="man-io-n">out</span><span class="man-io-d">${h.out}</span></div>` : '');
      rows += `
        <div class="man-node">
          <div class="man-node-head"><span class="man-name">${type}</span><span class="man-short">${h.short || ''}</span></div>
          <p class="man-desc">${h.desc || ''}</p>
          ${h.args ? `<div class="man-args">ARGS &nbsp;${h.args}</div>` : ''}
          ${ins ? `<div class="man-io-group"><span class="man-io-label">IN</span><div>${ins}</div></div>` : ''}
          ${outs ? `<div class="man-io-group"><span class="man-io-label">OUT</span><div>${outs}</div></div>` : ''}
        </div>`;
    }
    bodyHtml += `<section class="man-section" id="${id}"><h2>${cat}</h2>${rows}</section>`;
  }
  nav.innerHTML = navHtml;
  content.innerHTML = bodyHtml;

  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      $(a.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function showManual() { $('manual').classList.remove('hidden'); }
function hideManual() { $('manual').classList.add('hidden'); }

// ---------------------------------------------------------------- save dialog

function openSaveDialog() {
  const input = $('save-name');
  input.value = 'patch';
  $('save-modal').classList.remove('hidden');
  input.focus();
  input.select();
}

function hideSaveDialog() { $('save-modal').classList.add('hidden'); }

function confirmSave() {
  const name = $('save-name').value;
  hideSaveDialog();
  savePatchFile(name);
}

// ---------------------------------------------------------------- load patch from file

function onFilePicked(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = ''; // allow re-picking the same file later
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let patch;
    try { patch = JSON.parse(reader.result); }
    catch { alert('LOAD.FAILED // not valid JSON'); return; }
    if (!patch || !Array.isArray(patch.nodes) || !Array.isArray(patch.conns)) {
      alert('LOAD.FAILED // not a Pure Draw patch'); return;
    }
    loadPatch({ nodes: patch.nodes, conns: patch.conns });
  };
  reader.onerror = () => alert('LOAD.FAILED // could not read file');
  reader.readAsText(file);
}

// ---------------------------------------------------------------- menus

function bindMenuButton(btn, dd) {
  btn.addEventListener('click', () => {
    if (openBtn === btn) { closeMenus(); return; }
    closeMenus();
    openBtn = btn;
    btn.classList.add('open');
    const r = btn.getBoundingClientRect();
    dd.style.left = r.left + 'px';
    dd.style.top = (r.bottom + 1) + 'px';
    dd.classList.remove('hidden');
  });
}

function closeMenus() {
  for (const dd of document.querySelectorAll('.dropdown:not(#ctx)')) dd.classList.add('hidden');
  for (const b of document.querySelectorAll('.menu-btn')) b.classList.remove('open');
  openBtn = null;
}

// ---------------------------------------------------------------- ADD menu

function buildTabs() {
  const tabs = ['RECENT', ...CATEGORIES.map(c => c[0])];
  const row = $('add-tabs');
  row.innerHTML = '';
  for (const name of tabs) {
    const t = document.createElement('div');
    t.className = 'add-tab' + (name === activeTab ? ' active' : '');
    t.textContent = name;
    t.addEventListener('click', () => {
      activeTab = name;
      for (const el of row.children) el.classList.toggle('active', el.textContent === name);
      renderAddList();
    });
    row.appendChild(t);
  }
}

function renderAddList() {
  const list = $('add-list');
  list.innerHTML = '';
  const types = activeTab === 'RECENT'
    ? recent
    : (CATEGORIES.find(c => c[0] === activeTab)?.[1] || []);

  if (!types.length) {
    const empty = document.createElement('div');
    empty.className = 'dd-empty';
    empty.textContent = 'EMPTY//ADD.NODES.TO.POPULATE';
    list.appendChild(empty);
    return;
  }
  for (const type of types) {
    const item = document.createElement('div');
    item.className = 'dd-item';
    const nm = document.createElement('span');
    nm.textContent = type.toUpperCase();
    const hint = document.createElement('span');
    hint.className = 'hint';
    hint.textContent = HELP[type]?.short || '';
    item.appendChild(nm);
    item.appendChild(hint);
    item.addEventListener('click', () => { closeMenus(); addNodeFromTemplate(type); });
    list.appendChild(item);
  }
}

// ---------------------------------------------------------------- context menu + help

function bindContextMenu() {
  document.addEventListener('contextmenu', e => {
    const nodeEl = e.target.closest?.('.node');
    if (!nodeEl) { hideCtx(); return; }
    e.preventDefault();
    const type = nodeEl.dataset.type;
    if (!TYPES[type]) { hideCtx(); return; }
    const ctx = $('ctx');
    ctx.dataset.type = type;
    ctx.style.left = e.clientX + 'px';
    ctx.style.top = e.clientY + 'px';
    ctx.classList.remove('hidden');
  });
  $('ctx-help').addEventListener('click', () => {
    const type = $('ctx').dataset.type;
    hideCtx();
    openHelp(type);
  });
}

function hideCtx() { $('ctx').classList.add('hidden'); }

// mini visual body for the help preview
function miniBody(type) {
  switch (type) {
    case 'bng':     return '<span class="mb-circ"></span>';
    case 'toggle':  return '<span class="mb-box">✕</span>';
    case 'number':  return '<span class="mb-num">0</span>';
    case 'hslider': return '<span class="mb-htrack"><span></span></span>';
    case 'vslider': return '<span class="mb-vtrack"><span></span></span>';
    case 'string':  return 'TEXT';
    default:        return type;
  }
}

function openHelp(type) {
  const h = HELP[type];
  if (!h) return;
  $('modal-title').textContent = type.toUpperCase() + '//HELP';

  const ins = h.inlets || [];
  const outs = h.outs || null; // multi-outlet nodes (t, mouse)
  const hasOut = !!outs || (!!h.out && !h.out.startsWith('—'));

  const inPorts = ins.map((_, i) => `<span class="hp"><i>${i + 1}</i></span>`).join('');
  const outPorts = outs
    ? outs.map((o, i) => `<span class="hp"><i>${outs.length > 1 ? o[0].toUpperCase() : 'OUT'}</i></span>`).join('')
    : `<span class="hp"><i>OUT</i></span>`;
  const preview = `
    <div class="help-node">
      ${ins.length ? `<div class="hn-row hn-in">${inPorts}</div>` : ''}
      <div class="hn-box" style="min-width:${Math.max(130, Math.max(ins.length, outs?.length || 1) * 38)}px">${miniBody(type)}</div>
      ${hasOut ? `<div class="hn-row hn-out">${outPorts}</div>` : ''}
    </div>`;

  const inRows = ins.map(([n, t, d], i) => `
    <div class="io-row">
      <span class="io-tag">IN.${i + 1}</span>
      <span class="io-name">${n}:${t}</span>
      <span class="io-desc">${d}</span>
    </div>`).join('');
  const outRow = outs
    ? outs.map(([n, t, d], i) => `
      <div class="io-row">
        <span class="io-tag">OUT.${i + 1}</span>
        <span class="io-name">${n}:${t}</span>
        <span class="io-desc">${d}</span>
      </div>`).join('')
    : `
    <div class="io-row">
      <span class="io-tag">OUT</span>
      <span class="io-name"></span>
      <span class="io-desc">${h.out}</span>
    </div>`;

  $('modal-body').innerHTML = `
    <p class="desc">${h.desc}</p>
    ${h.use ? `<p class="use">${h.use}</p>` : ''}
    <div class="sect">NODE</div>
    <div class="hn-wrap">${preview}</div>
    ${inRows ? `<div class="sect">INLETS</div>${inRows}` : ''}
    ${h.args ? `<div class="sect">ARGUMENTS</div><p class="use">${h.args}</p>` : ''}
    <div class="sect">OUTLET</div>${outRow}
    ${!TYPES[type]?.gui ? `<p class="use memo">Control inlets remember the last value received — the typed argument (or default) is used until a message arrives.</p>` : ''}`;
  $('modal').classList.remove('hidden');
}

function hideModal() { $('modal').classList.add('hidden'); }
