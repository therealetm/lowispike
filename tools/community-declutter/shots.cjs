/* Community declutter probe (5 Nov 2026): opens the real app in a phone-sized Chromium (fake cloud, nothing leaves the machine),
   opens Community, screenshots each tab (Circle, Chat, For You, Ranking), the Ranking Members button + its sheet, and reports
   the bar geometry. node tools/community-declutter/shots.cjs <outDir> [chromium|webkit] [light]  -> PNGs + report.json */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const sleep = H.sleep;
const OUT = path.resolve(process.argv[2] || '/tmp/cdecl'); fs.mkdirSync(OUT, { recursive: true });
const ENGINE = process.argv[3] || 'chromium', LIGHT = process.argv[4] === 'light';
(async () => {
  const R = await H.open({ engine: ENGINE, device: 'iPhone 13', probe: false });
  const p = R.page, rep = { steps: [] };
  const log = (k, v) => { rep.steps.push([k, v]); console.log(k, JSON.stringify(v)); };
  try {
    await R.goto(); if (LIGHT) await p.evaluate(() => document.documentElement.classList.add('light'));
    await N.openCommunity(R, m => log('nav', m)); await sleep(1500);
    const geo = () => p.evaluate(() => {
      const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
      const q = s => document.querySelector(s);
      return { head: r(q('.rm-head')), tabs: r(q('.rm-tabs')), tabIds: [...document.querySelectorAll('.rm-tab')].map(t => t.dataset.rm + (t.getAttribute('aria-selected') === 'true' ? '*' : '')),
        pf: r(q('#pfBtn')), theme: r(q('#tbTheme')), live: !!q('.rm-live'), sel: (q('.rm-tab[aria-selected="true"]') || {}).dataset?.rm, sw: document.documentElement.scrollWidth, w: document.documentElement.clientWidth };
    });
    log('open', await geo()); await R.shot(path.join(OUT, '0-open.png'));
    for (const t of ['room', 'chat', 'fy', 'rank']) {
      const ok = await p.evaluate(s => { const b = document.querySelector('.rm-tab[data-rm="' + s + '"]'); if (!b) return false; b.click(); return true; }, t);
      await sleep(1400); log('tab ' + t, Object.assign({ ok }, await geo())); await R.shot(path.join(OUT, '1-' + t + '.png'));
    }
    const rk = await p.evaluate(() => { const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
      const q = s => document.querySelector(s);
      return { info: r(q('[data-rk="info"]')), members: r(q('[data-rk="members"]')), chips: r(q('.rk-chips')), chipTexts: [...document.querySelectorAll('.rk-chips > *')].map(c => c.className + ':' + c.textContent.trim()), seg: r(q('.rk-seg')) }; });
    log('ranking', rk);
    const m = await p.evaluate(() => { const b = document.querySelector('[data-rk="members"]'); if (!b) return 'none'; b.click(); return 'clicked'; });
    await sleep(1200); log('members tap', m);
    log('members sheet', await p.evaluate(() => { const d = document.querySelector('.pd-sheet,.pd,[class*="pd-"][role=dialog],[role=dialog]'); return d ? { cls: d.className, text: d.textContent.replace(/\s+/g, ' ').trim().slice(0, 300) } : null; }));
    await R.shot(path.join(OUT, '2-members.png'));
  } catch (e) { log('error', String(e && e.stack || e).slice(0, 500)); }
  rep.errs = R.errs; fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rep, null, 1));
  await R.close(); process.exit(0);
})();
