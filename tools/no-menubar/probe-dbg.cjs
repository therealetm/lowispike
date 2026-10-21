'use strict';
const L = require('../interface-audit/lib.cjs');
(async () => {
  const h = await L.launch({ device: 'iPhone 13' });
  const p = h.page;
  await L.openApp(h);
  await L.sleep(3000);
  await p.evaluate(() => {
    window.__refresh = 0; const rc = window.refreshCachedTab; if (rc) window.refreshCachedTab = function () { window.__refresh++; return rc.apply(this, arguments); };
    window.__muts = []; new MutationObserver(ms => ms.forEach(m => { const t = m.target; window.__muts.push((t.id || '') + '.' + String(t.className && t.className.baseVal !== undefined ? t.className.baseVal : t.className).slice(0, 30) + ':' + m.type + '+' + m.addedNodes.length + '-' + m.removedNodes.length); })).observe(document.getElementById('tab-home'), { childList: true, subtree: true });
    { const th = document.getElementById('tab-home'); window.__stk = [];
      const desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
      Object.defineProperty(th, 'innerHTML', { set(v) { window.__stk.push('innerHTML ' + new Error().stack.split('\n').slice(2, 6).join(' | ')); desc.set.call(this, v); }, get() { return desc.get.call(this); } });
      ['appendChild', 'insertBefore', 'replaceChildren', 'prepend', 'append', 'removeChild'].forEach(k => { const f = th[k]; th[k] = function () { window.__stk.push(k + ' ' + new Error().stack.split('\n').slice(2, 6).join(' | ')); return f.apply(this, arguments); }; }); }
    window.__pos = () => [...document.querySelectorAll('[data-hb]')].map(b => { const r = b.getBoundingClientRect(); return b.dataset.hb + ':' + Math.round(r.top); }).join(' ');
  });
  const pos0 = await p.evaluate(() => window.__pos());
  const r = await p.evaluate(async () => {
    const t0 = performance.now(); window.lowiOpen('shelf'); const t1 = performance.now();
    await new Promise(r => setTimeout(r, 1500));
    window.__muts = []; window.__stk = [];
    const sigA = JSON.stringify(window.S || {}).length;
    const t2 = performance.now(); window.LowiSections.close(); const t3 = performance.now();
    const at0 = window.__pos();
    await new Promise(r => setTimeout(r, 1500));
    return { open: Math.round(t1 - t0), close: Math.round(t3 - t2), refresh: window.__refresh, at0, at1500: window.__pos(), muts: window.__muts.slice(0, 8), stk: window.__stk.slice(0, 8).map(x => x.replace(/https?:\/\/[^ ]*\//g, '').slice(0, 400)), n: window.__muts.length, sigA, html: document.documentElement.className.match(/\bwh-\S+|\bwb-\S+|\blg\S*/g) };
  });
  console.log('pos0', pos0); console.log(JSON.stringify(r, null, 1));
  await h.browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
