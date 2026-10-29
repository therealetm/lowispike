'use strict';
/* Bug hunt 29 Oct 09:02: fresh-load probes of crawl/flow finds on the Cook tab.
   A swap: Swap ingredients tile -> (Find swaps) -> back x3, state after each back.
   B ebook: tap eBook / Recipes switch, list visible tile texts (English in de/es?).
   C book: My Recipe Book -> back -> sheets left?
   node tools/hunt-cook-probe-0902.cjs <device> <lang> <scenario> [url|root] [engine] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', lang = process.argv[3] || 'en', sc = process.argv[4] || 'swap';
  const where = process.argv[5] || 'https://therealetm.github.io/lowispike/index.html', engine = process.argv[6] || 'webkit';
  const o = { device, engine, members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.ctx.addInitScript(([l]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [lang]);
  await R.goto(); await H.sleep(5000);
  const st = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && +s.opacity > .05; };
    return { url: location.href.slice(0, 60), inApp: !!document.getElementById('whPad'), hist: history.length,
      tab: (document.querySelector('.tab.on') || {}).id || null,
      sheets: [...document.querySelectorAll('.r2-ov.on, [role=dialog], .cs-ov.on, .lc-ov.on, #sheetwrap.open, .b-sh.on, .b-ov.on')].filter(vis).map(e => (e.id || String(e.className).split(' ').slice(0, 3).join('.'))) };
  }).catch(e => ({ err: String(e.message).slice(0, 80) }));
  const log = (...a) => console.log(R.el(), ...a);
  log('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content), device, lang, sc);
  await P.evaluate(() => { try { goTab('shelf'); } catch (e) { } }); await H.sleep(1200);
  const tapRe = async (re, scope) => { const l = P.locator(scope || 'button,[role=button]').filter({ hasText: re }).filter({ visible: true }).first(); if (!(await l.count())) { log('NOT FOUND', String(re)); return false; } await l.scrollIntoViewIfNeeded().catch(() => { }); await H.sleep(300); await R.tapEl(l); await H.sleep(1500); return true; };
  const back = async (n) => { await P.evaluate(() => history.back()).catch(() => { }); await H.sleep(1500); log('after back', n, JSON.stringify(await st())); };
  log('start', JSON.stringify(await st()));
  if (sc === 'swap') {
    await tapRe(/Swap ingredients|Zutatentausch|Cambiar ingredientes/); log('swap open', JSON.stringify(await st()));
    await R.shot('/tmp/h0902/swap-open-' + lang + '.png');
    if (process.argv[7] !== 'nofind') { await tapRe(/Find swaps|Swaps finden|Buscar cambios|›/); log('find tapped', JSON.stringify(await st())); await R.shot('/tmp/h0902/swap-find-' + lang + '.png'); }
    for (let i = 1; i <= 3; i++) { await back(i); const s = await st(); if (s.err || !s.inApp) { log('LEFT APP at back', i); break; } }
  } else if (sc === 'ebook') {
    for (const re of [/^(eBook|E-Book)$/, /^(Recipes|Rezepte|Recetas)$/, /^(Products|Produkte|Productos)$/, /^(eBook|E-Book)$/]) {
      await tapRe(re, '.ck-b');
      const t = await P.evaluate(() => { const tab = document.getElementById('tab-shelf'); return [...tab.querySelectorAll('button,[role=button],h2,h3,p')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 20 && r.bottom > 0 && r.top < innerHeight && r.left >= -1 && r.right <= innerWidth + 1; }).map(b => b.textContent.replace(/\s+/g, ' ').trim().slice(0, 50)).filter(Boolean).slice(0, 30); });
      log('after', String(re), JSON.stringify(t));
    }
    await R.shot('/tmp/h0902/ebook-' + device.replace(/\W/g, '') + '-' + lang + '.png');
  } else if (sc === 'book') {
    await tapRe(/My Recipe Book|Mein Rezeptbuch|Mi recetario/); log('book open', JSON.stringify(await st()));
    await H.sleep(4000); log('book settled', JSON.stringify(await st())); await R.shot('/tmp/h0902/book-open-' + device.replace(/\W/g, '') + '.png');
    await back(1); await R.shot('/tmp/h0902/book-back1-' + device.replace(/\W/g, '') + '.png'); await H.sleep(1500); log('settled', JSON.stringify(await st())); await back(2);
  }
  log('errs', JSON.stringify(R.errs).slice(0, 800)); await R.close(); process.exit(0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
