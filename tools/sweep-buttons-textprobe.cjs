/* Button sweep helper: open a tab in de/es and dump its visible text lines, so English left behind on screen shows up.
   node tools/sweep-buttons-textprobe.cjs [url|root] --lang es --tab move --engine webkit --device "iPhone 13" [--viewport 390x844] */
'use strict';
const H = require('./sim/harness.cjs');
const args = process.argv.slice(2); const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const where = args[0] && !args[0].startsWith('--') ? args[0] : 'https://therealetm.github.io/lowispike/index.html';
const lang = opt('lang', 'es'), tab = opt('tab', 'move'), engine = opt('engine', 'webkit'), device = opt('device', 'iPhone 13'), vp = opt('viewport', '');
(async () => {
  const o = { engine, device, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  if (engine === 'chromium' && vp) { const [w, h] = vp.split('x').map(Number); o.viewport = { width: w, height: h }; o.dpr = 2; }
  const R = await H.open(o); const P = R.page;
  await P.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  await P.evaluate(t => { try { goTab(t); } catch (e) { } }, tab); await H.sleep(2500);
  const out = await P.evaluate(() => {
    const sec = document.querySelector('.tab.active, section.active, #main') || document.body; const lines = new Set();
    const w = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const t = n.nodeValue.trim().replace(/\s+/g, ' '); if (t.length < 3) continue; const e = n.parentElement; if (!e) continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; let hid = false; for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05 || x.hidden) { hid = true; break; } } if (!hid) lines.add(t); }
    const aria = [...sec.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label'));
    return { lang: window.LowiLang && LowiLang.get(), tab: document.querySelector('.tab.active') && document.querySelector('.tab.active').id, text: [...lines], aria };
  });
  out.build = await P.evaluate(() => window.LOWI_BUILD || (document.querySelector('meta[name=build]') || {}).content || '').catch(() => '');
  out.errs = R.errs.map(e => e.m);
  console.log(JSON.stringify(out, null, 1)); await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
