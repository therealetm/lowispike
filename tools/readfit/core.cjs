'use strict';
/* Oct 25, 2026 (readability + fit): pure helpers for the readability audit, with no browser needed, so the test suite can check
   them on GitHub too. contrast() is WCAG 2.x relative luminance; decodePNG() reads the 8-bit RGB/RGBA PNGs Playwright saves;
   judge() turns one page's text boxes plus a text-hidden screenshot into a list of problems. */
const zlib = require('zlib');

function lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function lum(rgb) { return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]); }
function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
/* fg = [r,g,b,a] with a in 0..1, drawn over an opaque bg [r,g,b] */
function over(fg, bg) { const a = fg[3] == null ? 1 : fg[3]; return [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a)); }
function parseColor(s) {
  const m = String(s || '').match(/rgba?\(([^)]+)\)/); if (!m) return null;
  const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
}
/* WCAG large text: 24px+ or 18.66px+ bold */
function needed(fontPx, weight) { return (fontPx >= 24 || (fontPx >= 18.66 && weight >= 700)) ? 3 : 4.5; }

function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8, w = 0, h = 0, depth = 0, type = 0, inter = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), kind = buf.toString('ascii', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; type = data[9]; inter = data[12]; }
    else if (kind === 'IDAT') idat.push(data); else if (kind === 'IEND') break;
    pos += 12 + len;
  }
  if (depth !== 8 || inter || (type !== 2 && type !== 6)) throw new Error('unsupported PNG ' + depth + '/' + type + '/' + inter);
  const bpp = type === 6 ? 4 : 3, stride = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)), out = Buffer.alloc(w * h * 3);
  let prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0; let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) { out[(y * w + x) * 3] = cur[x * bpp]; out[(y * w + x) * 3 + 1] = cur[x * bpp + 1]; out[(y * w + x) * 3 + 2] = cur[x * bpp + 2]; }
    const t = prev; prev = cur; cur = t;
  }
  return { w, h, px: out };
}

/* the contrast of one text box against the pixels behind it (img = decoded text-hidden screenshot, scale = device pixels per
   CSS pixel). Returns the 25th-percentile ratio over the sampled pixels: most of the box has to pass, not just its best part. */
function boxContrast(img, scale, rect, fg) {
  const x0 = Math.max(0, Math.floor(rect.x * scale)), y0 = Math.max(0, Math.floor(rect.y * scale));
  const x1 = Math.min(img.w, Math.ceil((rect.x + rect.w) * scale)), y1 = Math.min(img.h, Math.ceil((rect.y + rect.h) * scale));
  if (x1 <= x0 || y1 <= y0) return null;
  const stepX = Math.max(1, Math.floor((x1 - x0) / 24)), stepY = Math.max(1, Math.floor((y1 - y0) / 8)); const r = [];
  for (let y = y0; y < y1; y += stepY) for (let x = x0; x < x1; x += stepX) { const i = (y * img.w + x) * 3; const bg = [img.px[i], img.px[i + 1], img.px[i + 2]]; r.push(contrast(over(fg, bg), bg)); }
  r.sort((a, b) => a - b);
  return r.length ? r[Math.floor(r.length * 0.25)] : null;
}

function inter(a, b) { const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y); return w > 0 && h > 0 ? w * h : 0; }

/* items: [{id, text, rect:{x,y,w,h}, lines:[rect], fontPx, weight, color:'rgb(..)', opacity, clipped, covered, related:[ids]}]
   frame: {w, h, inset:{top,bottom,left,right}}; img/scale optional (no contrast check without them). Returns problems. */
function judge(items, frame, img, scale) {
  const out = [], ins = Object.assign({ top: 0, bottom: 0, left: 0, right: 0 }, frame.inset || {}), tol = 1;
  for (const it of items) {
    const r = it.rect, label = JSON.stringify(String(it.text).slice(0, 48));
    if (r.x < -tol || r.y < -tol || r.x + r.w > frame.w + tol || r.y + r.h > frame.h + tol) out.push({ kind: 'offscreen', id: it.id, text: label, rect: r });
    else if (r.y < ins.top - tol || r.y + r.h > frame.h - ins.bottom + tol || r.x < ins.left - tol || r.x + r.w > frame.w - ins.right + tol) out.push({ kind: 'safe-area', id: it.id, text: label, rect: r });
    if (it.clipped) out.push({ kind: 'clipped', id: it.id, text: label, rect: r, by: it.clipped });
    if (it.covered) out.push({ kind: 'covered', id: it.id, text: label, rect: r, by: it.covered });
    if (img && it.color) {
      const c = parseColor(it.color); if (c) {
        c[3] = (c[3] == null ? 1 : c[3]) * (it.opacity == null ? 1 : it.opacity);
        const need = needed(it.fontPx || 16, it.weight || 400); let worst = null;
        for (const L of (it.lines && it.lines.length ? it.lines : [r])) { const v = boxContrast(img, scale || 1, L, c); if (v != null && (worst == null || v < worst)) worst = v; }
        if (worst != null && worst < need) out.push({ kind: 'contrast', id: it.id, text: label, ratio: +worst.toFixed(2), need, color: it.color, opacity: it.opacity, fontPx: it.fontPx });
      }
    }
  }
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j]; if ((a.related || []).includes(b.id) || (b.related || []).includes(a.id)) continue;
    for (const la of (a.lines && a.lines.length ? a.lines : [a.rect])) {
      let hit = false;
      for (const lb of (b.lines && b.lines.length ? b.lines : [b.rect])) {
        const o = inter(la, lb), small = Math.min(la.w * la.h, lb.w * lb.h);
        if (small > 0 && o / small > 0.2) { out.push({ kind: 'overlap', id: a.id, text: JSON.stringify(String(a.text).slice(0, 32)) + ' x ' + JSON.stringify(String(b.text).slice(0, 32)), other: b.id }); hit = true; break; }
      }
      if (hit) break;
    }
  }
  return out;
}

module.exports = { lum, contrast, over, parseColor, needed, decodePNG, boxContrast, judge, inter };
