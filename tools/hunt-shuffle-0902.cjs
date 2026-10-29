'use strict';
/* Bug hunt 29 Oct 09:02: Shuffle as a user. Cook tab > Shuffle chip, list what shows, tap the main shuffle button,
   reveal, every reveal button (Cook it / Shop it / Save / again), back after each, reload with a pick on screen.
   node tools/hunt-shuffle-0902.cjs <device> <lang> [url|root] [engine] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', lang = process.argv[3] || 'en';
  const where = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html', engine = process.argv[5] || 'webkit';
  const o = { device, engine, members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = '/tmp/h0902/shuf-' + device.replace(/\W/g, '') + '-' + lang;
  await R.ctx.addInitScript(([l]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [lang]);
  await R.goto(); await H.sleep(5000);
  const log = (...a) => console.log(R.el(), ...a);
  const st = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && +s.opacity > .05; };
    const top = [...document.querySelectorAll('.r2-ov.on, .cs-ov.on, .lc-ov.on, #sheetwrap.open, .b-sh.on')].filter(vis).pop();
    const root = top || document.getElementById('tab-shelf') || document.body;
    const btns = [...root.querySelectorAll('button,[role=button]')].filter(b => { const r = b.getBoundingClientRect(); return vis(b) && r.width > 10; }).map(b => (b.getAttribute('aria-label') || b.textContent).replace(/\s+/g, ' ').trim().slice(0, 30));
    const all = [...document.querySelectorAll('.r2-ov.on')].map(e => String(e.className).replace('r2-ov', '').replace(/\s+/g, '.').slice(0, 40));
    return { all, inApp: !!document.getElementById('whPad'), top: top ? (top.id || String(top.className).split(' ').slice(0, 3).join('.')) : null, btns: btns.slice(0, 20), ox: document.documentElement.scrollWidth - innerWidth };
  }).catch(e => ({ err: String(e.message).slice(0, 80) }));
  const tapRe = async (re, scope) => { const l = P.locator(scope || 'button,[role=button]').filter({ hasText: re }).filter({ visible: true }).last(); if (!(await l.count())) { log('NOT FOUND', String(re)); return false; } await l.scrollIntoViewIfNeeded().catch(() => { }); await H.sleep(300); await R.tapEl(l); await H.sleep(2000); return true; };
  const back = async (w) => { await P.evaluate(() => history.back()).catch(() => { }); await H.sleep(2500); const s = await st(); log('back', w, JSON.stringify(s)); return s; };
  log('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content), device, lang);
  await P.evaluate(() => { try { goTab('shelf'); } catch (e) { } }); await H.sleep(1500);
  await tapRe(/^(Shuffle|Mischen|Mezclar)$/, '.ck-b'); log('shuffle chip', JSON.stringify(await st()));
  await tapRe(/^(Shuffle a meal|Ein Essen mischen|Mezclar una comida|Shuffle meal|Essen mischen|Mezclar comida)$/); await H.sleep(3000);
  const s1 = await st(); log('after shuffle', JSON.stringify(s1)); await R.shot(tag + '-reveal.png');
  const only = process.argv[6] || '';
  for (const re of [/^(Cook it|Jetzt kochen|Cocinarlo)$/, /^(Shop it|Einkaufen|Comprarlo)$/]) {
    if (only === 'shop' && /Cook/.test(String(re))) continue;
    if (!(await tapRe(re, '.r2-ov.on:not(.r2-parked) button'))) continue; const a = await st(); log('opened', String(re), JSON.stringify(a)); await R.shot(tag + '-' + String(re).slice(3, 10).replace(/\W/g, '') + '.png');
    if (only === 'shop') { const ins = await P.evaluate(() => { const top = [...document.querySelectorAll('.r2-ov.on:not(.r2-parked), #lcShop, #lsCart')].filter(e => e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility !== 'hidden').pop(); if (!top) return []; return [...top.querySelectorAll('button,[role=button],input[type=checkbox],label')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 10 && r.height > 10; }).map((b, i) => { b.setAttribute('data-hs', 's' + i); const r = b.getBoundingClientRect(); return { k: 's' + i, t: (b.getAttribute('aria-label') || b.textContent).replace(/\s+/g, ' ').trim().slice(0, 30), y: Math.round(r.top) }; }); });
      log('shop inner', JSON.stringify(ins).slice(0, 1500));
      for (const b of ins.slice(0, 14)) { if (/close|schlie|cerrar|zurück|back|atrás|share|teilen|compart|maps|route/i.test(b.t)) continue; const l = P.locator(`[data-hs="${b.k}"]`).first(); if (!(await l.count())) continue; await l.scrollIntoViewIfNeeded().catch(() => { }); const ok = await R.tapEl(l).then(() => true).catch(e => String(e.message).slice(0, 60)); await H.sleep(1200); const s2 = await st(); log('  tap', b.t, ok === true ? '' : ok, JSON.stringify(s2.all), s2.inApp ? '' : 'LEFT APP', 'errs', R.errs.length); if (s2.all.length > a.all.length) { await back('inner ' + b.t); } }
    }
    const b = await back(String(re)); if (b.err || !b.inApp) { log('LEFT APP'); break; } if (b.top) { await H.sleep(3000); log('after wait', JSON.stringify(await st())); }
  }
  await P.reload({ waitUntil: 'load' }).catch(() => { }); await H.sleep(7000); log('reload', JSON.stringify(await st()));
  for (let i = 0; i < 5; i++) { await tapRe(/^(Shuffle a meal|Ein Essen mischen|Mezclar una comida|Shuffle meal|Essen mischen|Mezclar comida|Again|Nochmal|Otra vez)$/).catch(() => { }); }
  log('fast', JSON.stringify(await st()));
  log('errs', JSON.stringify(R.errs).slice(0, 1200), 'crashed', R.crashed); await R.close(); process.exit(0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
