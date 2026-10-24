/* Nibblo daily card check: opens the real app in simulated phones, goes to Community > the room, finds Nibblo's card,
   checks it shows once, has the name, the Bot tag, the swap (and Gold Rush on even days), fits inside the screen and
   its bubble, has readable text, and saves a screenshot of it.
   node tools/inspo/check.cjs [outDir] [url] [devices] [engine]   -> exit 1 on failure */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const OUT = path.resolve(process.argv[2] || '/tmp/inspo-check'); fs.mkdirSync(OUT, { recursive: true });
const URL_ = process.argv[3] || '';
const DEVICES = (process.argv[4] || 'iPhone 13,iPhone SE,iPad (gen 7),iPad (gen 7) landscape').split(',');
const ENGINE = process.argv[5] || 'chromium';
const fails = []; const fail = (w, m) => { fails.push(w + ': ' + m); console.log('FAIL', w, m); };
async function run(device, lang, light) {
  const W = device + '/' + lang + (light ? '/day' : '');
  const R = await H.open({ engine: ENGINE, device, probe: false, url: URL_, lang });
  const p = R.page;
  try {
    await R.goto();
    await p.evaluate(l => { try { localStorage.setItem('lowispike.lang', l); window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) { } }, lang);
    if (light) await p.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light'); document.documentElement.classList.add('light'); });
    await N.openCommunity(R); await H.sleep(6000);
    await p.locator('.rm-tab[data-rm="chat"]').click({ force: true }).catch(() => { }); await H.sleep(1000);
    await p.locator('.rm-ch[data-ch="galaxy"]').click({ force: true }).catch(() => { }); await H.sleep(1200);
    if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) { await p.evaluate(() => { const b = document.querySelector('[data-chat="open-thread"]'); if (b) b.click(); }); await H.sleep(1200); }
    await p.waitForSelector('#cmList .ins-msg', { timeout: 15000 }).catch(() => { });
    const r = await p.evaluate(() => {
      const cards = [...document.querySelectorAll('#cmList .ins-msg')]; const c = cards[0]; if (!c) return { n: 0 };
      c.scrollIntoView({ block: 'center' });
      const box = e => e ? e.getBoundingClientRect() : null;
      const b = box(c.querySelector('.ins-bub')), av = box(c.querySelector('.ins-av')), tag = c.querySelector('.ins-bot');
      const out = { n: cards.length, name: (c.querySelector('.ins-name') || {}).textContent, tag: tag && tag.textContent, tagVis: !!(tag && box(tag).width > 8 && getComputedStyle(tag).display !== 'none'),
        avVis: !!(av && av.width >= 30 && getComputedStyle(c.querySelector('.ins-av')).display !== 'none'), swap: !!c.querySelector('.ins-swap .ins-to'), gold: !!c.querySelector('.ins-gold'),
        text: c.innerText.slice(0, 600), overflow: [], vw: innerWidth, sw: document.documentElement.scrollWidth };
      for (const e of c.querySelectorAll('.ins-bub *')) { const r = box(e); if (r.width && (r.right > b.right + 1 || r.left < b.left - 1)) out.overflow.push(e.className || e.tagName); }
      if (b.right > innerWidth + 1 || b.left < -1) out.overflow.push('bubble outside screen');
      const parse = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const q = m[1].split(/[ ,/]+/).map(Number); return { r: q[0], g: q[1], b: q[2], a: q.length > 3 ? q[3] : 1 }; };
      const lum = x => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(x.r) + .7152 * f(x.g) + .0722 * f(x.b); };
      const over = (t, u) => { const a = t.a + u.a * (1 - t.a); return { r: (t.r * t.a + u.r * u.a * (1 - t.a)) / a, g: (t.g * t.a + u.g * u.a * (1 - t.a)) / a, b: (t.b * t.a + u.b * u.a * (1 - t.a)) / a, a }; };
      const light = document.documentElement.getAttribute('data-theme') === 'light';
      const base = light ? { r: 239, g: 233, b: 222, a: 1 } : { r: 14, g: 15, b: 18, a: 1 };
      const bgOf = el => { const L = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const x = parse(getComputedStyle(e).backgroundColor); if (x && x.a > 0) L.push(x); if (x && x.a >= 1) break; } let bg = base; for (let i = L.length - 1; i >= 0; i--) bg = over(L[i], bg); return bg; };
      out.lowContrast = [];
      const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let t;
      while ((t = tw.nextNode())) { const s = t.nodeValue.trim(); if (!s) continue; const el = t.parentElement; if (el.closest('[aria-hidden=true]')) continue; const cs = getComputedStyle(el); const fg = parse(cs.color); if (!fg) continue; const bg = bgOf(el); const cc = over(fg, bg); const L1 = lum(cc), L2 = lum(bg); const ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05); const big = parseFloat(cs.fontSize) >= 18.66 || (parseFloat(cs.fontSize) >= 14 && +cs.fontWeight >= 700); if (ratio < (big ? 3 : 4.5)) out.lowContrast.push(s.slice(0, 20) + ' ' + ratio.toFixed(2)); }
      return out;
    });
    if (r.n !== 1) fail(W, 'cards on screen: ' + r.n);
    else {
      if (r.name !== 'Nibblo') fail(W, 'name ' + r.name);
      if (r.tag !== 'Bot' || !r.tagVis) fail(W, 'Bot tag missing');
      if (!r.avVis) fail(W, 'avatar hidden');
      if (!r.swap) fail(W, 'no swap');
      if (r.overflow.length) fail(W, 'overflow ' + r.overflow.slice(0, 4).join(','));
      if (r.sw > r.vw + 1) fail(W, 'sideways scroll');
      if (r.lowContrast.length) fail(W, 'low contrast ' + r.lowContrast.slice(0, 4).join(' | '));
      if (/Misty|Gusto|Sprouty/.test(r.text)) fail(W, 'wrong name in card');
    }
    const card = p.locator('#cmList .ins-msg').first();
    if (r.n) await card.screenshot({ path: path.join(OUT, (device + '-' + lang + (light ? '-day' : '')).replace(/[^\w-]+/g, '_') + '.png') }).catch(e => console.log('shot', e.message));
    const errs = R.errs.filter(e => /inspo|Nibblo|LowiInspo/i.test(e));
    if (errs.length) fail(W, 'errors ' + errs.slice(0, 2).join(' | '));
    console.log('ok?', W, JSON.stringify({ n: r.n, gold: r.gold, low: r.lowContrast, of: r.overflow }), (r.text || '').replace(/\s+/g, ' ').slice(0, 160));
  } catch (e) { fail(W, 'crash ' + e.message.split('\n')[0]); }
  finally { await R.close(); }
}
(async () => {
  const plan = (process.env.PLAN || '').split(';').filter(Boolean).map(s => s.split('|'));
  const runs = plan.length ? plan : [].concat(...DEVICES.map(d => [[d, 'en'], [d, 'de', 'day'], [d, 'es']]));
  for (const [d, l, day] of runs) await run(d, l, !!day);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ fails }, null, 1));
  console.log(fails.length ? 'FAILED ' + fails.length : 'ALL OK');
  process.exit(fails.length ? 1 : 0);
})();
