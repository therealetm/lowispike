/* Oct 25, 2026 (readability + fit): runs inside the page. Lists every piece of visible text on the top layer with its line boxes,
   font, colour, opacity, and whether it is cut off by a box around it or hidden behind a small fixed control. Returned as plain
   data for core.judge(). window.__rfCollect(rootSelector?) */
(function () {
  'use strict';
  const LETTER = /[\p{L}\p{N}]/u;
  function desc(e) { if (!e || !e.tagName) return ''; let s = e.tagName.toLowerCase(); if (e.id) s += '#' + e.id; const c = typeof e.className === 'string' ? e.className : (e.className && e.className.baseVal) || ''; if (c.trim()) s += '.' + c.trim().split(/\s+/).slice(0, 2).join('.'); return s; }
  function visible(e) {
    for (let n = e; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse' || s.contentVisibility === 'hidden') return false;
      if (n.hasAttribute('inert') || n.hidden) return false;
    }
    return true;
  }
  function opacity(e) { let o = 1; for (let n = e; n && n.nodeType === 1; n = n.parentElement) o *= +getComputedStyle(n).opacity; return o; }
  function rectOf(r) { return { x: r.left, y: r.top, w: r.width, h: r.height }; }
  function clipTo(r, c) { const x = Math.max(r.x, c.x), y = Math.max(r.y, c.y), x2 = Math.min(r.x + r.w, c.x + c.w), y2 = Math.min(r.y + r.h, c.y + c.h); return x2 > x && y2 > y ? { x, y, w: x2 - x, h: y2 - y } : null; }
  function lineRects(el) {
    const out = [];
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !/\S/.test(n.nodeValue)) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) { if (r.width < 1 || r.height < 1) continue; const last = out[out.length - 1];
        if (last && Math.abs(last.y - r.top) < 2 && Math.abs(last.h - r.height) < 3 && r.left <= last.x + last.w + 6) { const x2 = Math.max(last.x + last.w, r.right); last.w = x2 - last.x; }
        else out.push(rectOf(r)); }
    }
    return out;
  }
  function union(rs) { let x = 1e9, y = 1e9, x2 = -1e9, y2 = -1e9; for (const r of rs) { x = Math.min(x, r.x); y = Math.min(y, r.y); x2 = Math.max(x2, r.x + r.w); y2 = Math.max(y2, r.y + r.h); } return { x, y, w: x2 - x, h: y2 - y }; }
  /* a way to see the full text of a truncated label: a title, an accessible name, or a tap target around it */
  function canExpand(el) { for (let n = el; n && n.nodeType === 1; n = n.parentElement) { if (n.title || n.getAttribute('aria-label') || n.tagName === 'BUTTON' || n.tagName === 'A' || n.getAttribute('role') === 'button' || n.onclick || n.hasAttribute('data-uid') || n.hasAttribute('tabindex')) return true; if (n === document.body) break; } return false; }
  window.__rfCollect = function (rootSel) {
    const root = (rootSel && document.querySelector(rootSel)) || document.body;
    const vw = innerWidth, vh = innerHeight, docScrolls = document.scrollingElement.scrollHeight > vh + 4;
    const seen = new Set(), items = [];
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) {
      const el = n.parentElement; if (!el || seen.has(el) || !LETTER.test(n.nodeValue)) continue; seen.add(el);
      if (el.closest('script,style,noscript,template,option,select,textarea,svg title,[disabled],[aria-disabled="true"],.sr-only,.visually-hidden,.vh')) continue;
      if (!visible(el)) continue;
      const op = opacity(el); if (op < 0.05) continue;
      const cs = getComputedStyle(el);
      if (+cs.fontSize.replace('px', '') < 4) continue;
      if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') continue;
      let lines = lineRects(el); if (!lines.length) continue;
      /* walk up: overflow boxes cut the text; a scrolling box means the rest is reachable */
      let clippedBy = '', scroller = docScrolls, ellipsis = cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none' && cs.webkitLineClamp != null && cs.webkitLineClamp !== '';
      let vis = lines.map(r => Object.assign({}, r));
      for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
        const s = getComputedStyle(a); if (a !== el && (s.textOverflow === 'ellipsis' || (s.webkitLineClamp && s.webkitLineClamp !== 'none'))) ellipsis = true;
        const ox = s.overflowX, oy = s.overflowY;
        if (ox === 'visible' && oy === 'visible' && s.contain.indexOf('paint') < 0) continue;
        const scrollsY = (oy === 'auto' || oy === 'scroll') && a.scrollHeight > a.clientHeight + 2, scrollsX = (ox === 'auto' || ox === 'scroll') && a.scrollWidth > a.clientWidth + 2;
        const box = rectOf(a.getBoundingClientRect()); const next = [];
        for (const r of vis) { const c = clipTo(r, box); if (!c) { if (!(scrollsX || scrollsY)) clippedBy = clippedBy || desc(a); continue; }
          if ((c.w < r.w - 1.5 && !scrollsX) || (c.h < r.h - 1.5 && !scrollsY)) clippedBy = clippedBy || desc(a); next.push(c); }
        if (scrollsX || scrollsY) scroller = true;
        vis = next; if (!vis.length) break;
        if (s.position === 'fixed') break;
      }
      if (!vis.length) continue; /* scrolled away or fully inside a closed box: not on screen, not audited */
      if (ellipsis && clippedBy && canExpand(el)) clippedBy = '';
      else if (clippedBy && ellipsis) clippedBy += ' (truncated, no way to see the full text)';
      if (!clippedBy && ellipsis && el.scrollWidth > el.clientWidth + 1 && !canExpand(el)) clippedBy = desc(el) + ' (truncated, no way to see the full text)';
      /* what is on top at the middle of each visible line */
      let covered = '', under = false;
      for (const r of vis) {
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2; if (cx < 0 || cy < 0 || cx > vw || cy > vh) continue;
        const hit = document.elementFromPoint(cx, cy); if (!hit || hit === el || el.contains(hit) || hit.contains(el)) continue;
        const hb = hit.getBoundingClientRect(), hs = getComputedStyle(hit);
        const opaque = hit.tagName === 'IMG' || hit.tagName === 'VIDEO' || hit.tagName === 'CANVAS' || hit.tagName === 'BUTTON' || hit.closest('button') || (/rgba?\(/.test(hs.backgroundColor) && (hs.backgroundColor.match(/[\d.]+/g) || [0, 0, 0, 1])[3] !== '0') || hs.backgroundImage !== 'none' || hs.backdropFilter !== 'none' && hs.backdropFilter;
        if (hb.width * hb.height > vw * vh * 0.25) { if (opaque) under = true; continue; }
        if (!opaque) continue;
        covered = desc(hit.closest('button') || hit); break;
      }
      if (under) continue; /* behind a sheet or a full-screen layer: that layer is audited instead */
      const color = cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color && !/rgba\(0, 0, 0, 0\)/.test(cs.webkitTextFillColor) ? cs.webkitTextFillColor : cs.color;
      const transparentText = /rgba\([^)]*,\s*0\)$/.test(color) || cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text';
      items.push({ id: items.length, el: desc(el), text: (el.innerText || n.nodeValue || '').trim().replace(/\s+/g, ' ').slice(0, 80), rect: union(vis), lines: vis,
        fontPx: +cs.fontSize.replace('px', ''), weight: +cs.fontWeight || 400, color: transparentText ? '' : color, opacity: op,
        clipped: scroller && !clippedBy ? '' : clippedBy, covered, _el: el });
    }
    for (const a of items) a.related = items.filter(b => b !== a && (a._el.contains(b._el) || b._el.contains(a._el))).map(b => b.id);
    for (const a of items) delete a._el;
    return { items, frame: { w: vw, h: vh }, docScrolls };
  };
  window.__rfHide = function (on) {
    let s = document.getElementById('__rfhide');
    if (on && !s) { s = document.createElement('style'); s.id = '__rfhide'; s.textContent = '*,*::before,*::after,*::placeholder{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important;text-decoration-color:transparent!important}'; document.head.appendChild(s); }
    if (!on && s) s.remove();
  };
})();
