/* Probe: someone else's Community card bottom (block line + button vs the floating close). node probe2.cjs [engine] [device] [lang] */
'use strict';
const fs = require('fs');
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
    await p.locator('.pd-row:not([data-me])').first().tap();
    for (let i = 0; i < 8; i++) { await sleep(700); console.log('t', i, await p.evaluate(() => { const ov = [...document.querySelectorAll('.cs-overlay')].pop(); const sh = ov.querySelector('.r2-sh'); return Math.round(sh.getBoundingClientRect().top) + ' ' + getComputedStyle(sh).transform + ' ' + ov.className; })); }
    const m = async () => p.evaluate(() => { const ov = [...document.querySelectorAll('.cs-overlay')].pop(); const sh = ov.querySelector('.r2-sh'); const R = e => { if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
      const note = [...ov.querySelectorAll('p')].find(x => /Hide this|Blende|Oculta/i.test(x.textContent)); const blk = ov.querySelector('[data-chat="block"]'); const bx = document.getElementById('lwBX');
      return { vh: innerHeight, sh: R(sh), scroll: [Math.round(sh.scrollTop), sh.scrollHeight, sh.clientHeight], shPadB: getComputedStyle(sh).paddingBottom, shbPadB: getComputedStyle(ov.querySelector('.r2-shb')).paddingBottom, note: R(note), noteTxt: note && note.textContent.slice(0, 60), block: R(blk), blockTxt: blk && blk.textContent, bx: bx && bx.classList.contains('on') ? R(bx) : null, bxCls: bx && bx.className, hit: blk ? (() => { const r = blk.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, Math.min(innerHeight - 1, r.top + r.height / 2)); return t ? (t.className || t.tagName) + '' : null; })() : null, ovf: getComputedStyle(sh).overflowY }; });
    console.log('top', JSON.stringify(await m()));
    await R.shot(OUT + '/o-1.png');
    await p.evaluate(() => { const sh = [...document.querySelectorAll('.cs-overlay')].pop().querySelector('.r2-sh'); sh.scrollTop = sh.scrollHeight; }); await sleep(900);
    console.log('end', JSON.stringify(await m()));
    await R.shot(OUT + '/o-2.png');
  } catch (e) { console.log('ERR', e.stack); }
  console.log('errs', JSON.stringify(R.errs.slice(0, 5)));
  await R.close(); process.exit(0);
})();
