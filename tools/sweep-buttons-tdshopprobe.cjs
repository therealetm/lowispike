/* Button sweep helper (Oct 24 2026, 18:20): Today's in-store list (#tdShop, "Go shopping" on Today) in a language.
   Opens it the way the Go shopping button does (tdShopOpen), dumps visible text + controls, ticks an item, dumps again,
   taps Done. Also opens Shop it in English and reads its prices, to catch "€1,89" in English.
   node tools/sweep-buttons-tdshopprobe.cjs [url|root] --lang de --engine chromium --viewport 390x844 */
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
    const ctl = [...el.querySelectorAll('button,[role=button],a[href],input,select')].filter(vis).map(b => (b.getAttribute('aria-label') ? 'aria=' + b.getAttribute('aria-label') + ' | ' : '') + (b.innerText || b.value || '').trim().replace(/\s+/g, ' ').slice(0, 70));
    return { text: [...new Set(text)].slice(0, 40), ctl: [...new Set(ctl)].slice(0, 30) };
  }, root);
  const tap = async sel => { const p = await P.evaluate(sel => { const b = [...document.querySelectorAll(sel)].find(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; }); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel); if (!p) return false; await H.sleep(600); const q = await P.evaluate(sel => { const b = [...document.querySelectorAll(sel)].find(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; }); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel); if (engine === 'webkit') await P.mouse.click(q.x, q.y); else await P.touchscreen.tap(q.x, q.y); await H.sleep(900); return true; };
  const out = { lang, stages: {} };
  out.open = await P.evaluate(() => { try { tdEnsure(); tdShopOpen(); return !!document.querySelector('#tdShop.open'); } catch (e) { return String(e); } }); await H.sleep(1200);
  out.stages.list = await dump('#tdShop');
  out.tick = await tap('#tdShop [data-td="got"]');
  out.stages.list2 = await dump('#tdShop');
  out.done = await tap('#tdShop [data-td="shopdone"]');
  out.afterDone = await P.evaluate(() => !!document.querySelector('#tdShop.open'));
  out.cartErr = await P.evaluate(() => { try { LowiCart.open({}); } catch (e) { return String(e); } }); await H.sleep(1500);
  await tap('#lsCart [data-lc="meal"]');
  out.prices = await P.evaluate(() => [...document.querySelectorAll('#lsCart .lc-rp, #lsCart .cs-hsub, #lsCart [data-lc="store"]')].map(e => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 8));
  out.errs = errs; out.harnessErrs = (R.errs || []).map(e => e.m || String(e)).slice(0, 10);
  console.log(JSON.stringify(out, null, 1));
  await R.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
