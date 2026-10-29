'use strict';
/* Bug hunt 13:02 (Fuel and Gap + weight): the Home bubbles now open a bloom (#hb2Bloom) instead of a sheet, so
   hunt-fuel-gap.cjs can no longer find its entry. This walker opens one bubble with a real tap, then for every bloom item
   (fresh open each time) taps it and records what opened: sheets/blooms, their visible controls, sideways overflow, controls
   cut off at the screen edge, English left in de/es, page errors. Then, one level down, taps every control in the opened
   sheet from a fresh open and records errors / dead taps.
   node tools/hunt-bloom-walk-1302.cjs <device> <orbit> [lang] [theme] [deep 0|1] [url] */
const H = require('./sim/harness.cjs'), fs = require('fs');
(async () => {
  const A = process.argv.slice(2), device = A[0] || 'iPhone 13', orbit = A[1] || 'gap', lang = A[2] || 'en', theme = A[3] || 'dark', deep = A[4] === '1';
  const url = A[5] || 'https://therealetm.github.io/lowispike/index.html';
  const out = '/tmp/hfg13/walk'; fs.mkdirSync(out, { recursive: true });
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url, probe: false, lang, members: 5, messages: 5 });
  await R.ctx.addInitScript(([l, t]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); localStorage.setItem('lowi.theme', t); } catch (e) { } window.LOWI_FOOD_AI_URL = 'http://food-fixture.invalid/food-photo'; }, [lang, theme]);
  const P = R.page; const errs = []; P.on('pageerror', e => errs.push('page: ' + String(e.message).slice(0, 200)));
  P.on('console', m => { if (m.type() === 'error' && !/food-fixture|ERR_NAME|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  let crashed = false; P.on('crash', () => { crashed = true; });
  const tag = orbit + '-' + device.replace(/\W/g, '') + '-' + lang + '-' + theme; let shotN = 0; const finds = [];
  const find = async (kind, info) => { const shot = out + '/' + tag + '-' + (shotN++) + '.png'; await P.screenshot({ path: shot }).catch(() => { }); finds.push(Object.assign({ kind, shot }, info)); console.log('FIND', kind, JSON.stringify(info)); };
  await R.goto(); await H.sleep(6000);
  const VIS = `(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; })`;
  const layers = () => P.evaluate((VIS) => { const v = eval(VIS); return [...document.querySelectorAll('.r2-ov, [role=dialog], [id$="Ov"], #hb2Bloom')].filter(v).map(e => (e.id || String(e.className).slice(0, 40)) + '|' + (e.innerText || '').replace(/\s+/g, ' ').slice(0, 50)); }, VIS);
  const tapXY = async (xy) => { if (!xy) return false; await P.touchscreen.tap(xy[0], xy[1]); return true; };
  const reset = async () => {
    for (let i = 0; i < 4; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(150); }
    await P.evaluate(() => { try { LowiHomeBloomsV2.close(); } catch (e) { } try { LowiR2.closeAll(); } catch (e) { } try { goTab('home'); } catch (e) { } });
    await H.sleep(1400);
  };
  const openOrbit = async () => {
    await reset();
    const xy = await P.evaluate(k => { const e = document.querySelector('[data-orbit="' + k + '"]'); if (!e) return null; const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!t || !(t === e || e.contains(t))) return null; return [r.left + r.width / 2, r.top + r.height / 2]; }, orbit);
    if (!xy) return false; await tapXY(xy); await H.sleep(1300);
    return P.evaluate(() => { const b = document.getElementById('hb2Bloom'); return !!(b && b.classList.contains('on')); });
  };
  const bloomItems = () => P.evaluate(() => [...document.querySelectorAll('#hb2Bloom [data-id]')].filter(e => e.getBoundingClientRect().width > 0).map(e => e.getAttribute('data-id')));
  const ENG = /\b(the|your|and|with|Tap|Save|Cancel|Close|today|meal|weight|Add|Back|Done|Log|Start|Stop|Edit|Delete|minutes|hours)\b/;
  const inspect = (root) => P.evaluate(([VIS, rootSel, lang, ENGsrc]) => {
    const v = eval(VIS); const vw = innerWidth, vh = innerHeight; const scope = rootSel ? document.querySelector(rootSel) : document;
    const ctl = [...(scope || document).querySelectorAll('button,[role=button],a[href],input,select,textarea,[data-id]')].filter(v);
    const cut = ctl.filter(e => { const r = e.getBoundingClientRect(); return (r.right > vw + 1 || r.left < -1) && r.width < vw; }).map(e => (e.getAttribute('aria-label') || e.innerText || e.placeholder || '').replace(/\s+/g, ' ').slice(0, 30));
    let eng = [];
    if (lang !== 'en') { const rx = new RegExp(ENGsrc); const w = document.createTreeWalker(scope || document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const t = n.nodeValue.trim(); if (t.length > 3 && rx.test(t) && n.parentElement && v(n.parentElement) && !n.parentElement.closest('[data-noi18n],script,style')) eng.push(t.slice(0, 60)); } eng = [...new Set(eng)].slice(0, 8); }
    const ovf = document.documentElement.scrollWidth - vw;
    return { ovf, cut, eng, n: ctl.length };
  }, [VIS, root, lang, ENG.source]);
  if (!await openOrbit()) { await find('cannot open bloom', { orbit }); }
  const items = await bloomItems(); console.log('bloom items', JSON.stringify(items));
  const b0 = await inspect('#hb2Bloom'); if (b0.cut.length || b0.eng.length || b0.ovf > 0) await find('bloom layout/text', b0);
  for (const it of items) {
    if (!await openOrbit()) { await find('cannot reopen bloom', { it }); continue; }
    const before = await layers();
    const xy = await P.evaluate(id => { const e = document.querySelector('#hb2Bloom [data-id="' + id + '"]'); if (!e) return null; const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { xy: [r.left + r.width / 2, r.top + r.height / 2], hit: t && (t === e || e.contains(t)) ? 'self' : (t ? (t.id || String(t.className)).slice(0, 50) : null), r: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] }; }, it);
    if (!xy) { await find('item gone', { it }); continue; }
    if (xy.hit !== 'self') await find('item covered', { it, hit: xy.hit, r: xy.r });
    if (xy.r[0] < 0 || xy.r[1] < 0 || xy.r[0] + xy.r[2] > (await P.evaluate(() => innerWidth)) + 1) await find('item off screen', { it, r: xy.r });
    const e0 = errs.length; await tapXY(xy.xy); await H.sleep(1900);
    const after = await layers(); const changed = JSON.stringify(after) !== JSON.stringify(before);
    const ins = await inspect(null);
    console.log('ITEM', it, changed ? 'opened' : 'NO CHANGE', JSON.stringify(after).slice(0, 300), JSON.stringify(ins).slice(0, 300));
    if (!changed) await find('dead bloom item', { it });
    if (errs.length > e0) await find('error after item', { it, errs: errs.slice(e0) });
    if (ins.ovf > 0 || ins.cut.length) await find('layout', { it, ovf: ins.ovf, cut: ins.cut });
    if (ins.eng.length) await find('english text', { it, eng: ins.eng });
    await P.screenshot({ path: out + '/' + tag + '-item-' + it + '.png' }).catch(() => { });
    if (deep && changed) {
      const ctls = await P.evaluate(([VIS]) => { const v = eval(VIS); const tops = [...document.querySelectorAll('.r2-ov, [role=dialog], [id$="Ov"]')].filter(v); const top = tops.sort((a, b) => (+getComputedStyle(b).zIndex || 0) - (+getComputedStyle(a).zIndex || 0))[0]; if (!top) return []; return [...top.querySelectorAll('button,[role=button],input:not([type=file]),select,[data-act]')].filter(v).map((e, i) => { e.setAttribute('data-hw', 'w' + i); return { h: 'w' + i, l: (e.getAttribute('aria-label') || e.innerText || e.placeholder || e.type || '').replace(/\s+/g, ' ').slice(0, 30) }; }); }, [VIS]);
      console.log('  controls', ctls.length, JSON.stringify(ctls.map(c => c.l)).slice(0, 400));
      for (const c of ctls.slice(0, 18)) {
        if (/^(close|cerrar|schlie|×|✕|delete|löschen|borrar|eliminar)/i.test(c.l)) continue;
        if (!await openOrbit()) break;
        const x2 = await P.evaluate(id => { const e = document.querySelector('#hb2Bloom [data-id="' + id + '"]'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, it);
        await tapXY(x2); await H.sleep(1800);
        await P.evaluate(([VIS]) => { const v = eval(VIS); const tops = [...document.querySelectorAll('.r2-ov, [role=dialog], [id$="Ov"]')].filter(v); const top = tops.sort((a, b) => (+getComputedStyle(b).zIndex || 0) - (+getComputedStyle(a).zIndex || 0))[0]; if (!top) return; [...top.querySelectorAll('button,[role=button],input:not([type=file]),select,[data-act]')].filter(v).forEach((e, i) => e.setAttribute('data-hw', 'w' + i)); }, [VIS]);
        const t = await P.evaluate(h => { const e = document.querySelector('[data-hw="' + h + '"]'); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { xy: [r.left + r.width / 2, r.top + r.height / 2], hit: t && (t === e || e.contains(t) || t.contains(e)) ? 'self' : (t ? (t.id || String(t.className)).slice(0, 50) : null), tag: e.tagName, type: e.type }; }, c.h);
        if (!t) { console.log('  ctl gone', c.l); continue; }
        await H.sleep(300);
        if (t.hit !== 'self') { await find('control covered', { it, c: c.l, hit: t.hit }); continue; }
        const bef = await P.evaluate(() => document.body.innerText.length + '|' + document.querySelectorAll('.on').length + '|' + location.hash);
        const e1 = errs.length; await tapXY(t.xy); await H.sleep(1200);
        if (t.tag === 'INPUT' && /text|number|search|tel/.test(t.type || 'text')) { await P.keyboard.type('12', { delay: 30 }).catch(() => { }); await H.sleep(300); }
        const aft = await P.evaluate(() => document.body.innerText.length + '|' + document.querySelectorAll('.on').length + '|' + location.hash);
        const lay = await layers();
        console.log('  CTL', c.l, bef === aft ? 'same' : 'changed', JSON.stringify(lay).slice(0, 200));
        if (errs.length > e1) await find('error after control', { it, c: c.l, errs: errs.slice(e1) });
        if (crashed) { await find('crash', { it, c: c.l }); break; }
      }
    }
  }
  console.log(JSON.stringify({ device, orbit, lang, theme, build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content).catch(() => null), crashed, errs, finds: finds.map(f => f.kind + ' ' + JSON.stringify(f).slice(0, 240)) }, null, 1));
  await R.close(); process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
