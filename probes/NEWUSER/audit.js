global.A = async () => h.page.evaluate(() => {
  const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return false; let p = e; while (p && p !== document.documentElement) { const c = getComputedStyle(p); if (+c.opacity < 0.05 || c.visibility === 'hidden') return false; p = p.parentElement; } return true; };
  const iss = [];
  const ctl = [...document.querySelectorAll('button,a[href],[role=button],input,select,textarea,[data-orbit]')].filter(vis);
  for (const e of ctl) { const r = e.getBoundingClientRect(); const nm = (e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + (typeof e.className === 'string' ? e.className.split(' ')[0] : '')) + ' "' + (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 30) + '"';
    if (r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1 || r.top < -1) { if (r.bottom > 0 && r.top < innerHeight) iss.push('OFFSCREEN ' + nm + ' ' + [r.left, r.top, r.right, r.bottom].map(Math.round)); }
    if ((r.width < 30 || r.height < 30) && r.top < innerHeight && r.bottom > 0) iss.push('SMALL ' + nm + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2; if (cx > 0 && cy > 0 && cx < innerWidth && cy < innerHeight) { const top = document.elementFromPoint(cx, cy); if (top && top !== e && !e.contains(top) && !top.contains(e)) { const tn = top.id ? '#' + top.id : top.tagName.toLowerCase() + '.' + (typeof top.className === 'string' ? top.className.split(' ')[0] : ''); iss.push('COVERED ' + nm + ' by ' + tn); } } }
  document.querySelectorAll('body *').forEach(e => { if (!e.childElementCount && (e.innerText || '').trim() && vis(e)) { const cs = getComputedStyle(e); if ((cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis') && (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2)) iss.push('CLIPPED "' + e.innerText.trim().slice(0, 40) + '"'); const r = e.getBoundingClientRect(); if ((r.right > innerWidth + 2 || r.left < -2) && r.top < innerHeight && r.bottom > 0) iss.push('TEXT-OFF "' + e.innerText.trim().slice(0, 40) + '" ' + Math.round(r.left) + '..' + Math.round(r.right)); } });
  return iss.slice(0, 40);
});
return 'ok';
