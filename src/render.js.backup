// draw command renderer — canvas 2d
const FONT = '"Martian Mono","IBM Plex Mono",monospace';

// mode tracking for rect and ellipse drawing
let _rectMode = 'corner';
let _ellipseMode = 'corner';

// curated font families for the text node
const FONT_MAP = {
  mono: '"Martian Mono","IBM Plex Mono",monospace',
  plex: '"IBM Plex Mono",monospace',
  inter: '"Inter",sans-serif',
  grotesk: '"Space Grotesk",sans-serif',
  serif: '"Playfair Display",serif',
};

// lazy webcam stream shared by all webcam nodes
let _video = null, _videoReady = false, _videoRequested = false;
function getWebcam() {
  if (!_videoRequested) {
    _videoRequested = true;
    _video = document.createElement('video');
    _video.muted = true;
    _video.playsInline = true;
    navigator.mediaDevices?.getUserMedia({ video: { width: 1280, height: 720 } })
      .then(s => { _video.srcObject = s; return _video.play(); })
      .then(() => { _videoReady = true; document.dispatchEvent(new CustomEvent('gd-image-loaded')); })
      .catch(() => { /* no camera / permission denied — node draws nothing */ });
  }
  return _videoReady ? _video : null;
}
export function stopWebcam() {
  if (!_video?.srcObject) return;
  _video.srcObject.getTracks().forEach(t => t.stop());
  _video.srcObject = null;
  _videoReady = false;
  _videoRequested = false;
}

// previous-frame buffer for the feedback node
let _prevFrame = null;
let _feedbackUsed = false;

const rclamp = (v, a, b) => Math.min(b, Math.max(a, v));

function hexToRgb(hex) {
  let s = String(hex || '').replace('#', '');
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const n = parseInt(s.slice(0, 6), 16);
  return isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// 4x4 ordered (Bayer) dither matrix, values 0..15
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// pool of offscreen canvases for pixel/filter effects — a stack, so nested effects
// (e.g. blur wrapping dither) each get their own buffer instead of clobbering one
const _pool = [];
let _poolUsed = 0;
function acquireOffscreen(w, h) {
  let c = _pool[_poolUsed++];
  if (!c) { c = document.createElement('canvas'); _pool.push(c); }
  if (c.width !== w) c.width = w;
  if (c.height !== h) c.height = h;
  return c;
}
function releaseOffscreen() { _poolUsed = Math.max(0, _poolUsed - 1); }

// apply a pixel effect in place, skipping fully-transparent pixels
function applyPixelEffect(img, op, params) {
  const d = img.data, w = img.width, h = img.height;
  if (op === 'threshold') {
    const lvl = rclamp(params[0], 0, 255);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = lum >= lvl ? 255 : 0;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  } else if (op === 'posterize') {
    const L = rclamp(Math.round(params[0]), 2, 64);
    const step = 255 / (L - 1);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      d[i] = Math.round(Math.round(d[i] / step) * step);
      d[i + 1] = Math.round(Math.round(d[i + 1] / step) * step);
      d[i + 2] = Math.round(Math.round(d[i + 2] / step) * step);
    }
  } else if (op === 'dither') {
    const scale = Math.max(1, Math.round(params[0]));
    const L = rclamp(Math.round(params[1]), 2, 8);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] === 0) continue;
        const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
        const bx = (x / scale | 0) & 3, by = (y / scale | 0) & 3;
        const t = (BAYER[by][bx] + 0.5) / 16 - 0.5;
        const v = Math.round((lum + t / (L - 1)) * (L - 1));
        const q = rclamp(v, 0, L - 1) * (255 / (L - 1));
        d[i] = d[i + 1] = d[i + 2] = q;
      }
    }
  } else if (op === 'pixelate') {
    const s = Math.max(1, Math.round(params[0]));
    for (let y = 0; y < h; y += s) {
      for (let x = 0; x < w; x += s) {
        const xe = Math.min(x + s, w), ye = Math.min(y + s, h);
        let r = 0, g = 0, b = 0, a = 0, n = 0;
        for (let yy = y; yy < ye; yy++) for (let xx = x; xx < xe; xx++) {
          const j = (yy * w + xx) * 4; r += d[j]; g += d[j + 1]; b += d[j + 2]; a += d[j + 3]; n++;
        }
        r = r / n | 0; g = g / n | 0; b = b / n | 0; a = a / n | 0;
        for (let yy = y; yy < ye; yy++) for (let xx = x; xx < xe; xx++) {
          const j = (yy * w + xx) * 4; d[j] = r; d[j + 1] = g; d[j + 2] = b; d[j + 3] = a;
        }
      }
    }
  } else if (op === 'duotone') {
    const c1 = hexToRgb(params[0]), c2 = hexToRgb(params[1]);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const t = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      d[i] = c1[0] + (c2[0] - c1[0]) * t;
      d[i + 1] = c1[1] + (c2[1] - c1[1]) * t;
      d[i + 2] = c1[2] + (c2[2] - c1[2]) * t;
    }
  }
}

const BLEND_OPS = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
  difference: 'difference',
  exclusion: 'exclusion',
};

// accumulate mask shapes into the current path (for clip) — solid shapes only;
// groups apply their transforms around their children, path segments survive restore
function buildClipPath(ctx, cmds) {
  for (const c of cmds) {
    switch (c.cmd) {
      case 'rect': {
        let x, y;
        if (_rectMode === 'center') {
          x = c.x - c.w / 2;
          y = c.y - c.h / 2;
        } else {
          x = c.x;
          y = c.y;
        }
        ctx.rect(x, y, c.w, c.h);
        break;
      }
      case 'circle':
        ctx.moveTo(c.x + c.r, c.y);
        ctx.arc(c.x, c.y, Math.max(0, c.r), 0, Math.PI * 2);
        break;
      case 'ellipse': {
        let cx, cy;
        if (_ellipseMode === 'center') {
          cx = c.x;
          cy = c.y;
        } else {
          cx = c.x + Math.abs(c.w) / 2;
          cy = c.y + Math.abs(c.h) / 2;
        }
        ctx.moveTo(cx + Math.abs(c.w) / 2, cy);
        ctx.ellipse(cx, cy, Math.abs(c.w) / 2, Math.abs(c.h) / 2, 0, 0, Math.PI * 2);
        break;
      }
      case 'poly': {
        const n = Math.max(3, Math.round(c.n));
        for (let i = 0; i < n; i++) {
          const ang = (c.rot - 90 + i * 360 / n) * Math.PI / 180;
          const px = c.x + c.r * Math.cos(ang), py = c.y + c.r * Math.sin(ang);
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath();
        break;
      }
      case 'group': {
        ctx.save();
        const [t, a, b, p] = c.tf;
        if (t === 'rotate') { ctx.translate(b, p); ctx.rotate(a * Math.PI / 180); ctx.translate(-b, -p); }
        else if (t === 'scale') { ctx.translate(b, p); ctx.scale(a, a); ctx.translate(-b, -p); }
        else if (t === 'translate') ctx.translate(a, b);
        else if (t === 'mirror') {
          if (a === 'y') { ctx.translate(0, b); ctx.scale(1, -1); ctx.translate(0, -b); }
          else { ctx.translate(b, 0); ctx.scale(-1, 1); ctx.translate(-b, 0); }
        }
        buildClipPath(ctx, c.children);
        ctx.restore();
        break;
      }
      // lines, text, images, bg, gradients: not usable as masks — skipped
    }
  }
}

// image cache: load once per URL, re-render the patch when a picture arrives
const imgCache = new Map();
function getImage(url) {
  let img = imgCache.get(url);
  if (!img) {
    img = new Image();
    img.crossOrigin = 'anonymous'; // keep the canvas exportable
    img.onload = () => document.dispatchEvent(new CustomEvent('gd-image-loaded'));
    img.src = url;
    imgCache.set(url, img);
  }
  return img;
}

export function render(canvasEl, out) {
  const { w, h, cmds } = out;
  if (canvasEl.width !== w) canvasEl.width = w;
  if (canvasEl.height !== h) canvasEl.height = h;
  const ctx = canvasEl.getContext('2d');

  // default paper: white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // reset modes for each render
  _rectMode = 'corner';
  _ellipseMode = 'corner';
  _feedbackUsed = false;
  drawCmds(ctx, cmds, w, h);

  // a feedback node was drawn this frame: snapshot the finished frame for the next one
  if (_feedbackUsed) {
    if (!_prevFrame) _prevFrame = document.createElement('canvas');
    if (_prevFrame.width !== w) _prevFrame.width = w;
    if (_prevFrame.height !== h) _prevFrame.height = h;
    const pctx = _prevFrame.getContext('2d');
    pctx.clearRect(0, 0, w, h);
    pctx.drawImage(canvasEl, 0, 0);
  }
}

function drawCmds(ctx, cmds, w, h) {
  for (const c of cmds) {
    switch (c.cmd) {
      case 'setMode':
        if (c.target === 'rect') _rectMode = c.mode;
        else if (c.target === 'ellipse') _ellipseMode = c.mode;
        break;
      case 'bg':
        if (c.color !== 'none') { ctx.fillStyle = c.color; ctx.fillRect(0, 0, w, h); }
        break;
      case 'gradient': {
        const g = ctx.createLinearGradient(c.x1, c.y1, c.x2, c.y2);
        g.addColorStop(0, c.c1 === 'none' ? 'transparent' : c.c1);
        g.addColorStop(1, c.c2 === 'none' ? 'transparent' : c.c2);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'clipgrp': {
        ctx.save();
        ctx.beginPath();
        buildClipPath(ctx, c.mask);
        ctx.clip();
        drawCmds(ctx, c.children, w, h);
        ctx.restore();
        break;
      }
      case 'pixel': {
        // rasterise the children into an offscreen canvas (inheriting the current
        // transform), process the pixels, then blit the result back
        const off = acquireOffscreen(w, h);
        const octx = off.getContext('2d');
        octx.setTransform(1, 0, 0, 1, 0, 0);
        octx.clearRect(0, 0, w, h);
        octx.setTransform(ctx.getTransform());
        drawCmds(octx, c.children, w, h);
        octx.setTransform(1, 0, 0, 1, 0, 0);
        try {
          const img = octx.getImageData(0, 0, w, h);
          applyPixelEffect(img, c.op, c.params);
          octx.putImageData(img, 0, 0);
        } catch { /* tainted canvas (cross-origin image) — draw unprocessed */ }
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(off, 0, 0);
        ctx.restore();
        releaseOffscreen();
        break;
      }
      case 'filter': {
        // composite the children into an offscreen canvas, then blit them back
        // through a canvas filter so the effect applies to the whole layer
        const off = acquireOffscreen(w, h);
        const octx = off.getContext('2d');
        octx.setTransform(1, 0, 0, 1, 0, 0);
        octx.clearRect(0, 0, w, h);
        octx.setTransform(ctx.getTransform());
        drawCmds(octx, c.children, w, h);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.filter = c.css;
        ctx.drawImage(off, 0, 0);
        ctx.filter = 'none';
        ctx.restore();
        releaseOffscreen();
        break;
      }
      case 'group': {
        ctx.save();
        const [t, a, b, p] = c.tf;
        if (t === 'rotate') { ctx.translate(b, p); ctx.rotate(a * Math.PI / 180); ctx.translate(-b, -p); }
        else if (t === 'scale') { ctx.translate(b, p); ctx.scale(a, a); ctx.translate(-b, -p); }
        else if (t === 'translate') ctx.translate(a, b);
        else if (t === 'alpha') ctx.globalAlpha = ctx.globalAlpha * a;
        else if (t === 'blend') ctx.globalCompositeOperation = BLEND_OPS[a] || 'source-over';
        else if (t === 'mirror') {
          if (a === 'y') { ctx.translate(0, b); ctx.scale(1, -1); ctx.translate(0, -b); }
          else { ctx.translate(b, 0); ctx.scale(-1, 1); ctx.translate(-b, 0); }
        }
        else if (t === 'shadow') {
          ctx.shadowBlur = a;
          ctx.shadowOffsetX = b;
          ctx.shadowOffsetY = p;
          ctx.shadowColor = c.tf[4] === 'none' ? 'transparent' : c.tf[4];
        }
        else if (t === 'dash') ctx.setLineDash([Math.max(0, a), Math.max(0, b)]);
        drawCmds(ctx, c.children, w, h);
        ctx.restore();
        break;
      }
      case 'image': {
        const img = getImage(c.url);
        if (img && img.complete && img.naturalWidth) {
          const iw = c.w > 0 ? c.w : img.naturalWidth;
          const ih = c.h > 0 ? c.h : img.naturalHeight;
          ctx.drawImage(img, c.x - iw / 2, c.y - ih / 2, iw, ih);
        }
        break;
      }
      case 'poly': {
        const n = Math.max(3, Math.round(c.n));
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const ang = (c.rot - 90 + i * 360 / n) * Math.PI / 180;
          const px = c.x + c.r * Math.cos(ang), py = c.y + c.r * Math.sin(ang);
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath();
        if (c.fill !== 'none') { ctx.fillStyle = c.fill; ctx.fill(); }
        if (c.stroke !== 'none' && c.sw > 0) {
          ctx.strokeStyle = c.stroke; ctx.lineWidth = c.sw; ctx.stroke();
        }
        break;
      }
      case 'rect': {
        let x, y;
        if (_rectMode === 'center') {
          // x,y = center
          x = c.x - c.w / 2;
          y = c.y - c.h / 2;
        } else {
          // x,y = corner (default)
          x = c.x;
          y = c.y;
        }
        if (c.fill !== 'none') { ctx.fillStyle = c.fill; ctx.fillRect(x, y, c.w, c.h); }
        if (c.stroke !== 'none' && c.sw > 0) {
          ctx.strokeStyle = c.stroke; ctx.lineWidth = c.sw;
          ctx.strokeRect(x, y, c.w, c.h);
        }
        break;
      }
      case 'circle': {
        ctx.beginPath();
        ctx.arc(c.x, c.y, Math.max(0, c.r), 0, Math.PI * 2);
        if (c.fill !== 'none') { ctx.fillStyle = c.fill; ctx.fill(); }
        if (c.stroke !== 'none' && c.sw > 0) {
          ctx.strokeStyle = c.stroke; ctx.lineWidth = c.sw; ctx.stroke();
        }
        break;
      }
      case 'ellipse': {
        let cx, cy;
        if (_ellipseMode === 'center') {
          // c.x, c.y = center
          cx = c.x;
          cy = c.y;
        } else {
          // c.x, c.y = corner (default) — convert to center
          cx = c.x + Math.abs(c.w) / 2;
          cy = c.y + Math.abs(c.h) / 2;
        }
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(c.w) / 2, Math.abs(c.h) / 2, 0, 0, Math.PI * 2);
        if (c.fill !== 'none') { ctx.fillStyle = c.fill; ctx.fill(); }
        if (c.stroke !== 'none' && c.sw > 0) {
          ctx.strokeStyle = c.stroke; ctx.lineWidth = c.sw; ctx.stroke();
        }
        break;
      }
      case 'line': {
        if (c.color === 'none' || c.w <= 0) break;
        ctx.beginPath();
        ctx.moveTo(c.x1, c.y1); ctx.lineTo(c.x2, c.y2);
        ctx.strokeStyle = c.color; ctx.lineWidth = c.w;
        ctx.stroke();
        break;
      }
      case 'text': {
        if (c.color === 'none') break;
        ctx.save();
        ctx.fillStyle = c.color;
        const fam = FONT_MAP[c.font] || FONT_MAP.mono;
        const wgt = Math.round(rclamp(c.weight || 400, 100, 900) / 100) * 100;
        ctx.font = `${wgt} ${Math.max(1, c.size)}px ${fam}`;
        ctx.textAlign = c.align === 'left' || c.align === 'right' ? c.align : 'center';
        ctx.textBaseline = 'middle';
        if (c.track) ctx.letterSpacing = c.track + 'px';
        const lines = String(c.word).split('|');
        const lh = c.size * 1.15;
        const y0 = c.y - (lines.length - 1) / 2 * lh;
        lines.forEach((ln, i) => ctx.fillText(ln, c.x, y0 + i * lh));
        ctx.restore();
        break;
      }
      case 'webcam': {
        const v = getWebcam();
        if (v && v.videoWidth) {
          const w2 = c.w > 0 ? c.w : 800, h2 = c.h > 0 ? c.h : 600;
          // cover-crop the source to the target aspect
          const ta = w2 / h2, sa = v.videoWidth / v.videoHeight;
          let sw = v.videoWidth, sh = v.videoHeight, sx = 0, sy = 0;
          if (sa > ta) { sw = sh * ta; sx = (v.videoWidth - sw) / 2; }
          else { sh = sw / ta; sy = (v.videoHeight - sh) / 2; }
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.scale(-1, 1); // selfie mirror
          ctx.drawImage(v, sx, sy, sw, sh, -w2 / 2, -h2 / 2, w2, h2);
          ctx.restore();
        }
        break;
      }
      case 'feedback': {
        _feedbackUsed = true;
        if (_prevFrame) ctx.drawImage(_prevFrame, c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
        break;
      }
    }
  }
}
