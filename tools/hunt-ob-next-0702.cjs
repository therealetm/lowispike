'use strict';
/* Bug hunt 29 Oct 07:02: is setup's Next button reachable by a real tap (not covered, stable)? node tools/hunt-ob-next-0702.cjs <device> <lang> */
const H = require('./sim/harness.cjs');
const device = process.argv[2] || 'Pixel 7', lang = process.argv[3] || 'es';
const engine = /Pixel/.test(device) ? 'chromium' : 'webkit';
const URL0 = process.env.URL || 'https://therealetm.github.io/lowispike/index.html';
const probe = (P, sel) => P.evaluate(sel => { const b = document.querySelector(sel); if (!b) return 'missing'; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); const d = n => n ? (n.tagName + (n.id ? '#' + n.id : '') + (n.className && n.className.toString ? '.' + n.className.toString().split(' ').join('.') : '')).slice(0, 90) : 'null'; return { r: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], vh: innerHeight, hit: d(t), own: b === t || b.contains(t), anim: b.getAnimations ? b.getAnimations().map(a => a.animationName || a.constructor.name) : [], par: getComputedStyle(b.parentNode).position }; }, sel);
(async () => { let R; try {
  R = await H.open({ engine, device, lang, fresh: true, url: URL0 }); const P = R.page;
  P.on('pageerror', e => console.log('PAGEERR', e.message));
  await P.addInitScript(lg => { try { localStorage.setItem('lowispike.lang', lg); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(7000);
  if (process.env.STEP2) {
    await P.fill('#r2obName', 'Zoe'); await P.fill('#r2obB', '1992-02-29'); await P.evaluate(() => document.querySelector('[data-r2o=next]').click());
    for (let i = 0; i < 30; i++) { await H.sleep(1000); const go = await P.evaluate(() => { const bs = [...document.querySelectorAll('#r2obRev button')]; const b = bs.find(x => /^(Weiter|Continue|Continuar|Next)$/i.test(x.innerText.trim())); if (b && b.getBoundingClientRect().height > 0 && getComputedStyle(b).opacity > 0.5) { b.click(); return 1; } return 0; }); if (go) break; }
    for (let i = 0; i < 15 && !(await P.$('[data-r2o=initial]')); i++) await H.sleep(1000); await H.sleep(800); await P.evaluate(() => { const b = document.querySelector('[data-r2o=initial]'); if (b) b.click(); }); await H.sleep(2500);
    console.log('pane', await P.evaluate(() => document.querySelector('#r2ob').innerText.slice(0, 60).replace(/\s+/g, ' ')));
    await P.evaluate(() => { const g = document.querySelector('[data-r2g=f]'); if (g) g.click(); }); await H.sleep(1200);
  }
  console.log('step0', JSON.stringify(await probe(P, '[data-r2o=next]')));
  const t0 = Date.now(); try { await P.click('[data-r2o=next]', { timeout: 6000 }); console.log('click ok', Date.now() - t0); } catch (e) { console.log('click FAIL', e.message.split('\n').slice(0, 6).join(' | ')); }
  await H.sleep(800); console.log('after', JSON.stringify(await probe(P, '[data-r2o=next]')));
  if (process.env.STEP2) { await H.sleep(2500); console.log('shop pane', await P.evaluate(() => document.querySelector('#r2ob').innerText.slice(0, 50).replace(/\s+/g, ' ')));
    for (const sel of ['[data-r2o=shopdone]', '[data-r2o=shoplater]', '[data-spl-freq]', '[data-spl-day="6"]']) { console.log(sel, JSON.stringify(await probe(P, sel))); }
    try { await P.click('[data-spl-freq]', { timeout: 5000 }); await P.click('[data-r2o=shoplater]', { timeout: 5000 }); console.log('later ok'); } catch (e) { console.log('later FAIL', e.message.split('\n').slice(0, 6).join(' | ')); }
    await H.sleep(3000); console.log('then', await P.evaluate(() => { const c = document.querySelector('#ltTour .lt-card'); return (c ? c.innerText.slice(0, 60) : 'no tour') + ' | ob ' + (document.querySelector('#r2ob') && document.querySelector('#r2ob').offsetParent ? 'open' : 'closed'); }));
  }
  try { if (process.env.STEP2) throw new Error('skip'); await P.click('[data-r2o=next]', { timeout: 6000 }); console.log('click2 ok'); } catch (e) { console.log('click2 FAIL', e.message.split('\n').slice(0, 8).join(' | ')); }
  await P.screenshot({ path: '/tmp/hunt0702/next-' + device.replace(/\s/g, '') + '.png' });
} catch (e) { console.log('FAIL', e.message); } finally { if (R) await R.close().catch(() => { }); } })();
