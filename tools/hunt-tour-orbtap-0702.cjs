'use strict';
/* Bug hunt 29 Oct 07:02: during a tutorial bloom demo (fuel / water / move / sleep / gap), the user taps one of the orbs for real.
   What happens to the tour, the page that opens, and Home after Next / Skip all?  node tools/hunt-tour-orbtap-0702.cjs <engine> <device> <lang> <step> [orbIndex] */
const H = require('./tutorial-short/harness.cjs');
const [eng = 'chromium', dev = 'Pixel 7', lang = 'es', STEP = 'fuel', OI = '1'] = process.argv.slice(2);
const URL0 = process.env.URL || 'https://therealetm.github.io/lowispike/index.html';
(async () => {
  const br = await H.pw[eng].launch(); const { page } = await H.newPage(br, dev, lang);
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await H.boot(page, URL0);
  const state = () => page.evaluate(() => {
    const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 4 && r.height > 4 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
    const T = window.LowiTutorial, card = document.querySelector('#ltTour .lt-card');
    const tops = [...document.querySelectorAll('.r2-ov.on, .stp-card, #hb2Bloom, [role=dialog], [aria-modal=true]')].filter(vis).map(e => (e.id || e.className.toString()).slice(0, 40));
    let cover = 0; const c = card && vis(card) ? card.getBoundingClientRect() : null;
    return { on: T.isOn(), step: T.step(), held: T.held(), demo: T.demo(), card: vis(card), cardT: card ? card.innerText.replace(/\s+/g, ' ').slice(0, 70) : '', tops, hist: history.length, url: location.hash };
  });
  await page.evaluate(() => { document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); window.LowiTutorial.start({ from: 'check' }); });
  let t0 = Date.now(), st;
  while (Date.now() - t0 < 90000) { st = await state(); if (st.step === STEP && await page.$('#hb2Bloom button')) { const ok = await page.evaluate(() => [...document.querySelectorAll('#hb2Bloom button')].some(b => b.getBoundingClientRect().width > 10)); if (ok) break; } await H.sleep(200); }
  console.log('at demo', JSON.stringify(st));
  if (process.env.JS) { const r = await page.evaluate(oi => { const bs = [...document.querySelectorAll('#hb2Bloom button')].filter(b => b.getBoundingClientRect().width > 10 && !/Cerrar|Close|Schlie/.test(b.innerText + (b.getAttribute('aria-label') || ''))); const b = bs[oi] || bs[0]; if (!b) return 'none: ' + [...document.querySelectorAll('#hb2Bloom button')].map(x => x.innerText.trim() + '/' + Math.round(x.getBoundingClientRect().width)).join(','); b.click(); return b.innerText.trim(); }, +OI); console.log('js tapped', r); }
  await H.sleep(+process.env.WAIT || 1800);
  const orbs = await page.$$('#hb2Bloom button');
  const vorbs = []; for (const o of orbs) { const b = await o.boundingBox(); if (b && b.width > 10 && !/Cerrar|Close|Schlie/.test((await o.innerText()) + (await o.getAttribute('aria-label')))) vorbs.push([o, b, (await o.innerText()).trim() || await o.getAttribute('aria-label')]); }
  console.log('orbs', vorbs.map(v => v[2]).join(' | '));
  const pick = vorbs[+OI] || vorbs[0];
  if (pick) { const b = pick[1]; await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); console.log('tapped', pick[2]); }
  for (const t of [300, 1500, 4000, 8000]) { await H.sleep(t); console.log('after', t, JSON.stringify(await state())); }
  await page.screenshot({ path: '/tmp/hunt0702/orbtap-' + dev.replace(/\s/g, '') + '-' + STEP + '.png' });
  console.log('hit', JSON.stringify(await page.evaluate(() => { const d = n => n ? (n.tagName + (n.id ? '#' + n.id : '') + '.' + (n.className && n.className.toString ? n.className.toString().split(' ').join('.') : '')).slice(0, 70) : 'null';
    const out = [...document.querySelectorAll('[data-stp=close], .stp-foot button, .bottom-close, [class*=bclose]')].map(b => { const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); return (b.getAttribute('data-stp') || b.innerText.trim().slice(0, 12)) + ' ' + [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(',') + ' -> ' + (t === b || b.contains(t) ? 'self' : d(t)); });
    const lt = document.querySelector('#ltTour'); return { out, vh: innerHeight, lt: lt ? getComputedStyle(lt).pointerEvents + ' ' + lt.className : null }; })));
  if (process.env.CLOSE) { const how = process.env.CLOSE; if (how === 'pill') { await H.sleep(800); const pb = await page.$('#ltResume'); console.log('pill', pb ? JSON.stringify(await pb.boundingBox()) + ' hidden=' + await pb.evaluate(b => b.hidden) : 'none'); if (pb) await pb.click({ timeout: 4000 }).catch(e => console.log('PILL DEAD', e.message.split('\n')[0])); } else if (how === 'back') await page.evaluate(() => history.back()); else if (how === 'esc') await page.keyboard.press('Escape'); else { const x = await page.$(how); console.log('close el', !!x); if (x) await x.click({ timeout: 4000 }).catch(e => console.log('X DEAD', e.message.split('\n')[0])); }
    for (const t of [500, 2000, 5000]) { await H.sleep(t); console.log('after close', t, JSON.stringify(await state())); } }
  /* user now presses Next on the tour card (if visible) */
  const nx = await page.$('#ltTour [data-lt=next]'); if (nx) { try { await nx.click({ timeout: 4000 }); console.log('next tapped'); } catch (e) { console.log('NEXT DEAD', e.message.split('\n')[0]); } }
  await H.sleep(2500); console.log('after next', JSON.stringify(await state()));
  await page.evaluate(() => { const b = document.querySelector('#ltTour [data-lt=skipall]'); if (b) b.click(); }); await H.sleep(3000);
  console.log('after skipall', JSON.stringify(await state()));
  await page.screenshot({ path: '/tmp/hunt0702/orbtap-' + dev.replace(/\s/g, '') + '-' + STEP + '-end.png' });
  console.log('errs', JSON.stringify(errs.slice(0, 5)));
  await br.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
