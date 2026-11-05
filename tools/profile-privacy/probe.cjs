/* Probe (5 Nov 2026): own Community card -> "Privacy & quiet" tap; Settings profile row avatar. node tools/profile-privacy/probe.cjs [webkit|chromium] [device] [lang] */
'use strict';
const path = require('path'), fs = require('fs');
{ const reg = require.resolve('../regress/mock-cloud.cjs'), simc = require('../sim/mock-cloud.cjs'); require.cache[reg] = { id: reg, filename: reg, loaded: true, exports: simc }; }
const H = require('../regress/harness.cjs'); const sleep = H.sleep;
const ENGINE = process.argv[2] || 'webkit', DEVICE = process.argv[3] || 'iPhone 13', LANG = process.argv[4] || 'en';
const OUT = '/tmp/pp-probe'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const R = await H.open({ engine: ENGINE, device: DEVICE, probe: false, lang: LANG });
  const p = R.page;
  try {
    await R.goto(); await p.evaluate(() => window.goTab && goTab('foryou')); await sleep(2600);
    await p.waitForFunction(() => window.LowiRooms && LowiRooms.status() === 'in', null, { timeout: 30000 }).catch(() => {});
    await p.evaluate(() => LowiPeopleDir.open()); await sleep(1500);
    await R.shot(OUT + '/1-people.png');
    const rows = await p.evaluate(() => [...document.querySelectorAll('.pd [data-uid], .pd button')].slice(0, 6).map(b => b.outerHTML.slice(0, 200)));
    console.log('rows', rows);
    await p.evaluate(() => { const s = LowiCommunity; const me = (window.LowiRooms && LowiRooms.me && LowiRooms.me()) || null; console.log('me', JSON.stringify(me)); });
    const ov = await p.evaluate(() => [...document.querySelectorAll('.pd-row')].map(r => (r.dataset.me ? 'ME ' : '') + r.getAttribute('aria-label')).slice(0, 5));
    console.log('pdrows', ov);
    const meRow = (await p.locator('.pd-row[data-me]').count()) ? '.pd-row[data-me]' : '.pd-row';
    await p.locator(meRow).first().tap(); await sleep(1400);
    await R.shot(OUT + '/2-mycard.png');
    const btn = await p.evaluate(() => { const b = [...document.querySelectorAll('.cs-overlay [data-chat="settings"]')].pop(); if (!b) return null; const r = b.getBoundingClientRect(); return { t: b.textContent, r: [r.left, r.top, r.width, r.height], top: (document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) || {}).outerHTML?.slice(0, 160) }; });
    console.log('btn', JSON.stringify(btn));
    const lay = await p.evaluate(() => { const ov = [...document.querySelectorAll('.cs-overlay')].pop(); const sh = ov.querySelector('.r2-sh'), b = ov.querySelector('.r2-shb'); const R = e => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; }; return { ov: ov.className, vh: innerHeight, sh: R(sh), shb: R(b), shScroll: [sh.scrollTop, sh.scrollHeight, sh.clientHeight], bScroll: [b.scrollTop, b.scrollHeight, b.clientHeight], x: (() => { const x = ov.querySelector('.r2-x'); return x ? R(x) : null; })(), acts: R(ov.querySelector('.cp-acts')), tf: getComputedStyle(sh).transform }; });
    console.log('layout', JSON.stringify(lay));
    await p.evaluate(() => { const b = [...document.querySelectorAll('.cs-overlay [data-chat="settings"]')].pop(); b.scrollIntoView({ block: 'center' }); }); await sleep(800);
    const btn2 = await p.evaluate(() => { const b = [...document.querySelectorAll('.cs-overlay [data-chat="settings"]')].pop(); const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { r: [r.left, r.top], hit: t ? t.outerHTML.slice(0, 140) : null }; });
    console.log('btn2', JSON.stringify(btn2));
    const before = await p.evaluate(() => document.querySelectorAll('.r2-ov').length);
    await p.locator('.cs-overlay [data-chat="settings"]').last().tap({ timeout: 8000, force: true });
    await sleep(1500);
    const after = await p.evaluate(() => [...document.querySelectorAll('.r2-ov')].map(o => o.className + ' | ' + (o.querySelector('h2') || {}).textContent));
    console.log('overlays before', before, 'after', JSON.stringify(after));
    await sleep(1500);
    const vis = await p.evaluate(() => ({ ovs: [...document.querySelectorAll('.r2-ov,.pd-ov')].map(o => { const cs = getComputedStyle(o); return o.className.slice(0, 60) + ' z=' + cs.zIndex + ' disp=' + cs.display + ' tf=' + getComputedStyle(o.querySelector('.r2-sh') || o).transform; }), hit: (document.elementFromPoint(195, 400) || {}).outerHTML?.slice(0, 160) }));
    console.log('vis', JSON.stringify(vis, null, 1));
    await R.shot(OUT + '/3-after-tap.png');
  } catch (e) { console.log('ERR', e.stack); }
  console.log('errs', JSON.stringify(R.errs.slice(0, 5)));
  await R.close(); process.exit(0);
})();
