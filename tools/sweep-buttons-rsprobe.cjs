/* Button sweep helper (Oct 24 2026, 18:20): a recipe's "What you need" store list (#rsList) and the compare sheet (#rsSheet) by tap,
   in a language. Opens a Today recipe the way Today's meal card does (data-sh=open-shelf data-sub=recipe), dumps the list,
   taps a store chip, taps an item (compare sheet), picks another store there, closes, and dumps each stage.
   node tools/sweep-buttons-rsprobe.cjs [url|root] --lang de --engine chromium --viewport 390x844 */
'use strict';
const H = require('./sim/harness.cjs');
const args = process.argv.slice(2); const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const where = args[0] && !args[0].startsWith('--') ? args[0] : 'https://therealetm.github.io/lowispike/index.html';
const lang = opt('lang', 'de'), engine = opt('engine', 'chromium'), device = opt('device', 'iPhone 13'), vp = opt('viewport', '390x844');
(async () => {
  const o = { engine, device, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  if (engine === 'chromium' && vp) { const [w, h] = vp.split('x').map(Number); o.viewport = { width: w, height: h }; o.dpr = 2; }
  const R = await H.open(o); const P = R.page; const errs = []; P.on('pageerror', e => errs.push(String(e && e.message || e)));
  await P.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(7000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  const dump = (root) => P.evaluate(root => {
    const el = document.querySelector(root); if (!el) return { missing: root };
    const vis = e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
    const text = (el.innerText || '').split('\n').map(s => s.trim()).filter(Boolean);
    const ctl = [...el.querySelectorAll('button,[role=button],a[href]')].filter(vis).map(b => (b.getAttribute('aria-label') ? 'aria=' + b.getAttribute('aria-label') + ' | ' : '') + (b.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 70));
    return { text: [...new Set(text)].slice(0, 45), ctl: [...new Set(ctl)].slice(0, 20) };
  }, root);
  const tap = async sel => { const p = await P.evaluate(sel => { const b = [...document.querySelectorAll(sel)].find(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; }); if (!b) return null; b.scrollIntoView({ block: 'center' }); return 1; }, sel); if (!p) return false; await H.sleep(700); const q = await P.evaluate(sel => { const b = [...document.querySelectorAll(sel)].find(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; }); const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: t === b || b.contains(t) ? 'self' : (t ? t.tagName + '.' + t.className : null) }; }, sel); if (engine === 'webkit') await P.mouse.click(q.x, q.y); else await P.touchscreen.tap(q.x, q.y); await H.sleep(1000); return q.top; };
  const out = { lang, stages: {} };
  out.open = await P.evaluate(() => { try { tdEnsure(); const id = S.td.plan[0]; const b = document.createElement('button'); b.id = 'probeRec'; b.dataset.sh = 'open-shelf'; b.dataset.t = 'kochen'; b.dataset.sub = 'recipe'; b.dataset.r = id; b.textContent = 'x'; b.style.cssText = 'position:fixed;left:0;top:0;width:40px;height:40px;z-index:99999'; document.body.appendChild(b); return id; } catch (e) { return String(e); } });
  out.tapRec = await tap('#probeRec'); await P.evaluate(() => { const b = document.getElementById('probeRec'); if (b) b.remove(); }); await H.sleep(1500);
  out.stages.list = await dump('#rsList');
  out.store = await tap('#rsList [data-lc="rs-store"]:not(.on)');
  out.stages.list2 = await dump('#rsList');
  out.item = await tap('#rsList [data-lc="rs-item"]'); await H.sleep(600);
  out.stages.sheet = await dump('#rsSheet');
  out.pick = await tap('#rsSheet [data-lc="rs-pick"]:not(.on)'); await H.sleep(600);
  out.stages.sheet2 = await dump('#rsSheet');
  out.close = await tap('#rsSheet .rs-sh [data-lc="rs-close"]');
  out.sheetOpen = await P.evaluate(() => { const w = document.getElementById('rsSheet'); return !!(w && w.classList.contains('open')); });
  out.stages.list3 = await dump('#rsList');
  out.errs = errs; out.harnessErrs = (R.errs || []).map(e => e.m || String(e)).slice(0, 10);
  console.log(JSON.stringify(out, null, 1));
  await R.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
