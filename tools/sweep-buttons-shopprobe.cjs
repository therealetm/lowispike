/* Button sweep helper (Oct 24 2026): Cook > Shop it and the in-store list by tap, in a language. Opens Shop it the way the Cook hub
   does, picks a meal, taps a store, ticks an item, opens "Shop at", ticks there, goes back, opens the store sheet of a recipe.
   Dumps each stage's visible text and every control's aria-label / text, and page errors, so English left in de/es shows up.
   node tools/sweep-buttons-shopprobe.cjs [url|root] --lang de --engine chromium --viewport 390x844 */
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
    const ctl = [...el.querySelectorAll('button,[role=button],a[href],input,select')].filter(vis).map(b => (b.getAttribute('aria-label') ? 'aria=' + b.getAttribute('aria-label') + ' | ' : '') + (b.innerText || b.value || b.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 60));
    return { text: [...new Set(text)], ctl: [...new Set(ctl)] };
  }, root);
  const tap = async sel => { const p = await P.evaluate(sel => { const b = [...document.querySelectorAll(sel)].find(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; }); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel); if (!p) return false; if (engine === 'webkit') await P.mouse.click(p.x, p.y); else await P.touchscreen.tap(p.x, p.y); await H.sleep(900); return true; };
  const out = { lang, stages: {} };
  await P.evaluate(() => { try { goTab('shelf'); } catch (e) { } }); await H.sleep(2500);
  out.hub = await tap('[data-lc="hubshop"]'); await H.sleep(1200);
  if (!(await P.evaluate(() => !!document.querySelector('#lsCart.open')))) { out.hub = 'direct'; out.hubErr = await P.evaluate(() => { try { LowiCart.open({}); } catch (e) { return String(e); } }); await H.sleep(1500); }
  out.stages.cart0 = await dump('#lsCart');
  out.meal = await tap('#lsCart [data-lc="meal"]') || (await tap('#lsCart [data-lc="addmeal"]') && await tap('[data-lc="pickmeal"]'));
  out.stages.cart1 = await dump('#lsCart');
  out.store = await tap('#lsCart [data-lc="store"]:not(.on)');
  out.tick = await tap('#lsCart [data-lc="tick"]');
  out.stages.cart2 = await dump('#lsCart');
  out.shopInfo = await P.evaluate(() => { const b = document.querySelector('#lsCart [data-lc="shop"]'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(), t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { dis: b.disabled, txt: b.innerText, r: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], top: t ? (t === b || b.contains(t) ? 'self' : t.tagName + '#' + t.id + '.' + t.className) : null, vh: innerHeight }; });
  out.shop = await tap('#lsCart [data-lc="shop"]'); await H.sleep(800);
  out.stages.instore = await dump('#lcShop');
  out.stick = await tap('#lcShop [data-lc="stick"]');
  out.stages.instore2 = await dump('#lcShop');
  out.back = await tap('#lcShop [data-lc="shopback"]');
  out.afterBack = await P.evaluate(() => ({ shopOpen: !!(document.querySelector('#lcShop.open')), cart: !!document.querySelector('#lsCart') }));
  out.order = await tap('#lsCart [data-lc="order"]'); await H.sleep(800);
  out.stages.order = await dump('#sheetwrap');
  await P.evaluate(() => { try { closeSheet(); } catch (e) { } });
  out.errs = errs; out.harnessErrs = (R.errs || []).map(e => e.m || String(e)).slice(0, 10);
  console.log(JSON.stringify(out, null, 1));
  await R.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
