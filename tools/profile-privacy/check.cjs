/* LOWiSPIKE profile-privacy check (Nov 5 2026). node tools/profile-privacy/check.cjs [engine] [device] [lang] [theme]
   1 Settings: the profile row avatar is a plain round photo: no water level, no glass, no star-sign badge, no ring.
   2 Own Community card (opened from People): "Privacy & quiet hours" opens that page ON TOP (it opened behind the list before).
   3 Someone else's card: Block person + its line fully inside the visible sheet (scrolled if needed), above the floating close. */
'use strict';
const fs = require('fs');
{ const reg = require.resolve('../regress/mock-cloud.cjs'), simc = require('../sim/mock-cloud.cjs'); require.cache[reg] = { id: reg, filename: reg, loaded: true, exports: simc }; }
const H = require('../regress/harness.cjs'); const sleep = H.sleep;
const ENGINE = process.argv[2] || 'webkit', DEVICE = process.argv[3] || 'iPhone 13', LANG = process.argv[4] || 'en', THEME = process.argv[5] || 'dark';
const OUT = '/tmp/pp-check/' + [ENGINE, DEVICE, LANG, THEME].join('_').replace(/\s+/g, ''); fs.mkdirSync(OUT, { recursive: true });
const NAME = { en: 'Privacy & quiet hours', de: 'Privatsphäre & Ruhezeiten', es: 'Privacidad y horas de silencio' }[LANG];
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x) : '')); };
async function topSheet(p, n) { return p.evaluate(n => { const all = [...document.querySelectorAll('.r2-ov.on:not(.off)')]; const o = all.find(x => (x.querySelector('h2,h3,.h2') || {}).textContent === n) || all.pop(); if (!o) return null; const sh = o.querySelector('.r2-sh'); const r = sh.getBoundingClientRect(); const hit = document.elementFromPoint(innerWidth / 2, r.top + Math.min(80, r.height / 2)); return { cls: o.className, h: (o.querySelector('h2,h3,.h2') || {}).textContent, onTop: !!(hit && o.contains(hit)), z: getComputedStyle(o).zIndex }; }, n); }
(async () => {
  const R = await H.open({ engine: ENGINE, device: DEVICE, probe: false, lang: LANG });
  const p = R.page;
  try {
    await p.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, LANG);
    await R.goto();
    const th = await p.evaluate(() => document.documentElement.getAttribute('data-black') + '/' + document.documentElement.getAttribute('data-theme')); console.log('INFO theme', th);
    /* 1: Settings profile row */
    await p.evaluate(() => window.goTab && goTab('foryou')); await sleep(2400);
    await p.waitForFunction(() => window.LowiRooms && LowiRooms.status() === 'in', null, { timeout: 30000 }).catch(() => {});
    const opened = await p.evaluate(() => { try { if (window.LowiCommunityMe && LowiCommunityMe.open) { LowiCommunityMe.open(); return 'me'; } } catch (e) { } const b = document.querySelector('[data-cme-open],#pfBtn'); if (b) { b.click(); return 'btn'; } return null; });
    await sleep(1600);
    const av = await p.evaluate(() => { const a = document.querySelector('.cme-av'); if (!a) return null; const r = a.getBoundingClientRect(), cs = getComputedStyle(a); return { w: Math.round(r.width), h: Math.round(r.height), html: a.innerHTML.slice(0, 300), sg: !!a.querySelector('.lb3-sg,.lb3-lvl,.lb3-g,.lb3-c,.lb3-wave,.lb3-glow,.lb3-bb'), shadow: cs.boxShadow, border: cs.borderTopWidth, txt: (a.closest('button,.cme-me') || a.parentNode).textContent.replace(/\s+/g, ' ').slice(0, 80) }; });
    ok(!!av, 'settings profile row has an avatar', opened);
    if (av) { ok(!av.sg, 'avatar has no water level / glass / star-sign badge parts', av.html.slice(0, 120)); ok(/none/.test(av.shadow) && parseFloat(av.border) === 0, 'avatar has no ring (shadow/border)', [av.shadow, av.border]); ok(Math.abs(av.w - av.h) <= 1 && av.w >= 40, 'avatar is round, ' + av.w + 'px'); ok(!/[\u2648-\u2653]/.test(av.txt), 'no zodiac glyph in the row', av.txt); }
    await R.shot(OUT + '/1-settings.png');
    await p.evaluate(() => { try { LowiR2.close(); } catch (e) { } document.querySelectorAll('.r2-ov').forEach(o => o.remove()); }); await sleep(600);
    /* 2: own card from People -> Privacy & quiet hours */
    await p.evaluate(() => LowiPeopleDir.open()); await sleep(1500);
    const meRow = (await p.locator('.pd-row[data-me]').count()) ? '.pd-row[data-me]' : '.pd-row';
    await p.locator(meRow).first().tap(); await sleep(3500);
    const btn = p.locator('.cs-overlay [data-chat="settings"]').last();
    const label = (await btn.count()) ? (await btn.textContent()).replace(/\s+/g, ' ').trim() : null;
    ok(label && label.includes(NAME), 'own card button is named "' + NAME + '"', label);
    await btn.scrollIntoViewIfNeeded().catch(() => {}); await sleep(400);
    await btn.tap({ timeout: 8000 });
    await p.waitForFunction(n => [...document.querySelectorAll('.r2-ov.on:not(.off)')].some(o => (o.querySelector('h2,h3,.h2') || {}).textContent === n), NAME, { timeout: 8000 }).catch(() => {}); await sleep(1400);
    const t = await topSheet(p, NAME);
    ok(t && t.onTop, 'tap opens a sheet that is on top and visible', t);
    ok(t && t.h && t.h.includes(NAME), 'the page on top is ' + NAME, t && t.h);
    await R.shot(OUT + '/2-privacy.png');
    await p.evaluate(() => { try { LowiR2.close(); } catch (e) { } }); await sleep(900);
    await p.evaluate(() => { document.querySelectorAll('.r2-ov').forEach(o => o.remove()); try { LowiPeopleDir.close(); } catch (e) { } }); await sleep(700);
    /* 3: someone else's card -> Block person */
    await p.evaluate(() => LowiPeopleDir.open()); await sleep(1500);
    await p.locator('.pd-row:not([data-me])').first().tap(); await sleep(4000);
    await R.shot(OUT + '/3-card-top.png');
    const vis0 = await p.evaluate(() => { const ov = [...document.querySelectorAll('.cs-overlay')].pop(), sh = ov.querySelector('.r2-sh'), b = ov.querySelector('[data-chat="block"]'); const s = sh.getBoundingClientRect(), r = b.getBoundingClientRect(); return { inView: r.top >= s.top && r.bottom <= s.bottom, b: [Math.round(r.top), Math.round(r.bottom)], sh: [Math.round(s.top), Math.round(s.bottom)] }; });
    console.log('INFO block visible without scrolling:', JSON.stringify(vis0));
    await p.locator('.cs-overlay .cp-blk').last().scrollIntoViewIfNeeded(); await sleep(700);
    const m = await p.evaluate(() => { const ov = [...document.querySelectorAll('.cs-overlay')].pop(), sh = ov.querySelector('.r2-sh'), b = ov.querySelector('[data-chat="block"]'), n = ov.querySelector('.cp-blk-note'); const s = sh.getBoundingClientRect(), r = b.getBoundingClientRect(), q = n.getBoundingClientRect(); const bx = document.getElementById('lwBX'); const x = bx && bx.classList.contains('on') ? bx.getBoundingClientRect() : null; const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); const over = (a, c) => c && a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top; return { btn: [Math.round(r.top), Math.round(r.bottom), Math.round(r.height)], note: [Math.round(q.top), Math.round(q.bottom)], sh: [Math.round(s.top), Math.round(s.bottom)], x: x && [Math.round(x.top), Math.round(x.bottom)], hitOk: !!(hit && b.contains(hit)), btnUnderX: over(r, x), noteUnderX: over(q, x), order: !!(b.compareDocumentPosition(ov.querySelector('.cp-note:last-of-type')) & 4), color: getComputedStyle(b).color, txt: b.textContent }; });
    ok(m.btn[0] >= m.sh[0] && m.btn[1] <= m.sh[1], 'Block button fully inside the sheet', m);
    ok(m.note[0] >= m.sh[0] && m.note[1] <= m.sh[1], 'its line fully inside the sheet', m.note);
    ok(m.btn[2] >= 44, 'Block button at least 44 pt tall', m.btn[2]);
    ok(m.hitOk && !m.btnUnderX && !m.noteUnderX, 'nothing covers it (floating close clear)', [m.hitOk, m.x]);
    await R.shot(OUT + '/4-card-block.png');
  } catch (e) { fail++; console.log('FAIL exception', e.stack); }
  ok(R.errs.length === 0, 'no page errors', R.errs.slice(0, 3));
  console.log('RESULT ' + [ENGINE, DEVICE, LANG, THEME].join(' ') + ': ' + pass + ' passed, ' + fail + ' failed');
  await R.close(); process.exit(fail ? 1 : 0);
})();
