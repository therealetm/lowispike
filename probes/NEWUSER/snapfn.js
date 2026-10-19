global.S = async (name) => {
  const page = h.page;
  await page.screenshot({ path: '/home/sprite/NEWUSER/shots/' + name + '.png' });
  const info = await page.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0 || cs.display === 'none') return false; let p = e; while (p && p !== document.body) { const c = getComputedStyle(p); if (+c.opacity === 0 || c.visibility==='hidden') return false; p = p.parentElement; } return true; };
    const out = [];
    document.querySelectorAll('button,a,[role=button],input,select,textarea,[data-orbit],[onclick]').forEach(e => { if (!vis(e)) return; const r = e.getBoundingClientRect(); const t = (e.innerText || e.value || e.getAttribute('aria-label') || e.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 60); out.push((e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className==='string' ? '.' + e.className.split(' ')[0] : '')) + ' [' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + '] ' + t); });
    return { cls: document.documentElement.className.slice(0, 300), text: document.body.innerText.replace(/\n{2,}/g, '\n').slice(0, 1500), ctl: out.slice(0, 60) };
  });
  const errs = await page.evaluate(() => { const B = window.__bh || {}; return { err: (B.err || []).splice(0), rej: (B.rej || []).splice(0) }; });
  return Object.assign(info, errs, { pe: h.log.pageerror.splice(0), ce: h.log.console.splice(0).slice(0, 5) });
};
global.T = async (x, y) => { if (h.touch) await h.page.touchscreen.tap(x, y); else await h.page.mouse.click(x, y); };
global.C = async (sel) => { const p = await h.page.evaluate(s => { const e = typeof s === 'string' && s.startsWith('text=') ? [...document.querySelectorAll('button,a,[role=button],label,div,span')].reverse().find(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (el.innerText || '').trim() === s.slice(5); }) : document.querySelector(s); if (!e) return null; e.scrollIntoView({block:"center"}); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel); if (!p) return 'nf ' + sel; await T(p.x, p.y); return p; };
return 'ok';
