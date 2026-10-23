'use strict';
/* Bug hunt (Scan + grocery bucket): a shopper on the LIVE site scans real barcodes in the Scan sheet, adds to the bucket, skips one,
   picks a shop, types prices (good and bad), swipes back, reloads mid-flow, opens Today's groceries, logs what was cooked (Enter and button).
   Records page errors, crashes, overflow, cut-off text, English in DE/ES and anything that did not happen, with screenshots.
   node tools/hunt-grocery-flow.cjs <device> [url|root] [outdir] [theme dark|light] [lang en|de|es] */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
  const out = process.argv[4] || '/tmp/hunt-gf', theme = process.argv[5] || 'dark', lang = process.argv[6] || 'en';
  fs.mkdirSync(out, { recursive: true });
  const o = { device, engine: /Pixel/.test(device) && process.env.CHROMIUM ? 'chromium' : 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = device.replace(/\W/g, '') + '-' + theme + '-' + lang;
  await R.ctx.route(u => /(^|\.)openfoodfacts\.org$/.test(new URL(u).host), r => r.request().method() === 'GET' ? r.continue() : r.abort());
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  R.step = 'load'; await R.goto(); await H.sleep(5000);
  const findings = [];
  const note = async (kind, info) => { const f = path.join(out, tag + '-' + findings.length + '.png'); await R.shot(f); findings.push(Object.assign({ kind, shot: f }, info || {})); console.log('FIND', kind, JSON.stringify(info || {})); };
  const st = () => P.evaluate(() => { const v = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .05; };
    const ovs = [...document.querySelectorAll('.r2-ov.on')].filter(v); const top0 = ovs[ovs.length - 1]; const top = top0 && (top0.querySelector('.gb-row') || top0);
    let b = null; try { b = JSON.parse(localStorage.getItem('lowi.bucket.v1') || 'null'); } catch (e) { }
    const wide = top ? [...top.querySelectorAll('*')].filter(e => v(e) && e.getBoundingClientRect().right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed').slice(0, 3).map(e => String(e.className).slice(0, 30) + ':' + (e.innerText || '').trim().slice(0, 30)) : [];
    return { ovs: ovs.length, cls: top0 ? String(top0.className).slice(0, 60) : '', b3: !!(document.getElementById('b3Cam') && v(document.getElementById('b3Cam'))), text: top ? top.innerText.replace(/\s+/g, ' ').slice(0, 500) : '', url: location.href.slice(-20), bucket: b, wide, ox: document.documentElement.scrollWidth - innerWidth }; });
  const reset = async () => { for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(100); } await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await H.sleep(900); };
  const openScan = async () => { await reset(); for (let i = 0; i < 3; i++) { const sc = await P.evaluate(() => { const e = document.querySelector('[data-orbit="scan"]'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); if (sc) { await P.touchscreen.tap(sc[0], sc[1]); if (await P.waitForFunction(() => { const e = document.getElementById('b3Cam'); return e && e.getBoundingClientRect().height > 0; }, null, { timeout: 8000 }).then(() => true, () => false)) { await H.sleep(800); return true; } } await H.sleep(1200); } return false; };
  const scan = async (code) => {
    if (!await openScan()) { await note('cannot open scan', { code }); return false; }
    const inp = P.locator('#b3Cam input').first();
    if (!await inp.isVisible().catch(() => false)) { const t = P.locator('#b3Cam').getByText(/Type the number|Nummer|Escribe|número/i).first(); if (await t.count()) { await R.tapEl(t).catch(() => { }); await H.sleep(500); } }
    await inp.tap().catch(() => { }); await inp.fill('').catch(() => { }); await P.keyboard.type(code, { delay: 25 });
    const btn = P.locator('#b3Cam button').filter({ hasText: /^(Check|Prüfen|Comprobar|Search|Suchen|Buscar)/i }).first();
    if (await btn.count()) await R.tapEl(btn).catch(() => P.keyboard.press('Enter')); else await P.keyboard.press('Enter');
    const ok = await P.waitForFunction(() => document.querySelector('.r2-ov.on .gb-row'), null, { timeout: 15000 }).then(() => true, () => false);
    await H.sleep(700);
    if (!ok) { await note('no bucket row after scan', { code, s: (await st()).text.slice(0, 200) }); return false; }
    return true;
  };
  const tap = async (sel, what) => { const l = P.locator('.r2-ov.on ' + sel).last(); if (!await l.count()) { await note('missing control', { what, sel }); return false; } await l.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => { }); await H.sleep(250);
    const cover = await l.evaluate(e => { const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (t === e || e.contains(t)) ? '' : 'covered by ' + (t ? (t.id || String(t.className).slice(0, 40)) : 'nothing'); }).catch(() => 'gone');
    if (cover) await note('covered control', { what, cover });
    await R.tapEl(l).catch(async e => { await note('tap failed', { what, e: String(e.message).slice(0, 80) }); }); await H.sleep(600); return true; };
  const chk = async (step) => { const s = await st(); console.log('STEP', step, '| ovs', s.ovs, s.cls, '| items', s.bucket && s.bucket.days ? JSON.stringify(Object.values(s.bucket.days).map(d => (d.items || d).length)) : '-', '|', s.text.slice(0, 220));
    if (s.ox > 2 || s.wide.length) await note('overflow', { step, ox: s.ox, wide: s.wide });
    if (/undefined|NaN|\[object|null €|€ null/.test(s.text)) await note('broken text', { step, text: s.text.slice(0, 300) });
    if (lang !== 'en' && /\b(Add to bucket|Skip|Undo|Today's|Type price|Log it|Snap|Other shop|Total|points)\b/.test(s.text)) await note('english in ' + lang, { step, text: s.text.slice(0, 300) });
    if (R.crashed) { await note('crash', { step }); } return s; };
  const e0 = R.errs.length;
  try {
    await P.evaluate(() => { try { localStorage.removeItem('lowi.bucket.v1'); } catch (e) { } });
    R.step = 'scan nutella'; if (await scan('3017620422003')) {
      await chk('card nutella'); await tap('.gb-add', 'Add to bucket'); let s = await chk('added nutella');
      if (!/gb-done|✓/.test(await P.locator('.r2-ov.on .gb-row').last().innerHTML().catch(() => ''))) await note('add did nothing', {});
      await tap('.gb-undo', 'Undo'); s = await chk('undo'); if (!await P.locator('.r2-ov.on .gb-add').count()) await note('undo did not bring Add back', {});
      await tap('.gb-add', 'Add again'); await tap('.gb-list > summary', 'open list'); s = await chk('list open');
      const sel = P.locator('.r2-ov.on [data-gb-shop]').last(); if (await sel.count()) { const opts = await sel.evaluate(e => [...e.options].map(o => o.value + '=' + o.textContent)); console.log('  shops', JSON.stringify(opts)); await sel.selectOption({ index: opts.length - 1 }).catch(e => note('select failed', { e: e.message })); await H.sleep(600); await chk('shop other'); } else await note('no shop picker', {});
      const pin = P.locator('.r2-ov.on [data-gb-price]').last(); if (await pin.count()) { await pin.tap().catch(() => { }); await pin.fill('abc'); await P.keyboard.press('Enter'); await H.sleep(500); const inv = await P.locator('.r2-ov.on [data-gb-price]').last().evaluate(e => [e.getAttribute('aria-invalid'), e.value, (e.closest('li') || e).innerText]).catch(() => null); console.log('  bad price ->', JSON.stringify(inv)); await chk('bad price');
        const p2 = P.locator('.r2-ov.on [data-gb-price]').last(); await p2.tap().catch(() => { }); await p2.fill(lang === 'en' ? '3.49' : '3,49'); await P.keyboard.press('Enter'); await H.sleep(700); s = await chk('price typed'); if (!/3[.,]49/.test(s.text)) await note('typed price not shown in total', { text: s.text.slice(0, 300) });
        const p3 = P.locator('.r2-ov.on [data-gb-price]').last(); if (await p3.count()) { const v = await p3.inputValue(); console.log('  price field now', v); } } else await note('no price field', {});
      R.step = 'back from card'; await P.evaluate(() => history.back()); await H.sleep(1500); s = await chk('after back'); if (!/lowispike/.test(P.url())) await note('back left the app', { step: 'card' }); else if (s.ovs) await note('back did not close card', { cls: s.cls });
    }
    R.step = 'scan coke'; if (await scan('5449000000996')) { await tap('.gb-add', 'Add coke'); const s = await chk('added coke'); if (!/\b2\b/.test(s.text)) await note('count not 2 after second add', { text: s.text.slice(0, 200) }); }
    R.step = 'scan skip'; if (await scan('40084107')) { await tap('.gb-skip', 'Skip'); const s = await chk('after skip'); if (s.ovs && /gb-/.test(s.text)) await note('skip did not close card', {}); const n = s.bucket && s.bucket.days ? Object.values(s.bucket.days).map(d => (d.items || d).length)[0] : null; console.log('  items after skip', n); }
    R.step = 'reload'; await R.goto(); await H.sleep(5000);
    if (await scan('3017620422003')) { let s = await chk('nutella after reload'); if (!await P.locator('.r2-ov.on .gb-done').count()) await note('bucket state lost after reload', {});
      await tap('.gb-list > summary', 'open list 2'); s = await chk('list after reload'); if (!/3[.,]49/.test(s.text)) await note('typed price lost after reload', { text: s.text.slice(0, 300) });
      R.step = 'today'; await tap('.gb-today', "Today's groceries"); s = await chk('today sheet'); if (!/gt-ov/.test(s.cls)) await note('today sheet not on top', { cls: s.cls });
      const recs = await P.locator('.r2-ov.on .gt-rec').count(); console.log('  recipes', recs);
      const inp = P.locator('.r2-ov.on [name="gtc"]').last();
      if (await inp.count()) { await inp.evaluate(e => e.scrollIntoView({ block: 'center' })); await inp.tap().catch(() => { }); await inp.fill(lang === 'de' ? 'Nudeln mit Tomaten' : lang === 'es' ? 'Pasta con tomate' : 'Pasta with tomato'); await P.keyboard.press('Enter'); await H.sleep(900);
        s = await chk('cooked enter'); const msg = await P.locator('.r2-ov.on .gt-msg').last().innerText().catch(() => ''); const nDone = await P.locator('.r2-ov.on .gt-done li').count(); console.log('  after Enter: done items', nDone, 'msg', msg);
        if (!nDone) { await tap('.gt-logt', 'Log it'); s = await chk('cooked button'); const n2 = await P.locator('.r2-ov.on .gt-done li').count(); console.log('  after button: done items', n2, 'msg', await P.locator('.r2-ov.on .gt-msg').last().innerText().catch(() => '')); if (!n2) await note('log cooked did nothing', {}); else await note('enter in cooked field does not log (button does)', {}); }
        await tap('.gt-logt', 'Log it empty'); const m3 = await P.locator('.r2-ov.on .gt-msg').last().innerText().catch(() => ''); console.log('  empty log msg', m3);
      } else await note('no cooked field', {});
      R.step = 'back from today'; await P.evaluate(() => history.back()); await H.sleep(1500); s = await chk('back 1 from today'); if (!/lowispike/.test(P.url())) await note('back left the app', { step: 'today' }); else if (/gt-ov/.test(s.cls)) await note('back did not close today sheet', {});
      await P.evaluate(() => history.back()); await H.sleep(1500); s = await chk('back 2'); if (!/lowispike/.test(P.url())) await note('back 2 left the app', {});
      R.step = 'remove'; if (await scan('5449000000996')) { await tap('.gb-list > summary', 'open list 3'); const before = await P.locator('.r2-ov.on .gb-list li').count(); await tap('.gb-rm', 'remove x'); const after = await P.locator('.r2-ov.on .gb-list li').count(); console.log('  remove', before, '->', after); if (after !== before - 1) await note('remove did not drop one item', { before, after }); await chk('after remove'); }
    }
  } catch (e) { await note('tool error', { e: String(e.stack).slice(0, 300) }); }
  const errs = R.errs.slice(e0); if (errs.length) await note('page errors', { errs: errs.slice(0, 8) });
  console.log('DONE', tag, 'findings', findings.length, JSON.stringify(findings.map(f => f.kind)));
  await R.close(); process.exit(0);
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
