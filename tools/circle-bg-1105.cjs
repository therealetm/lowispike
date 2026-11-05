'use strict';
/* 5 Nov 2026 (owner: Billiard has a different background from Shuffle and Swipe "even though they're supposed to mimic being on
   the same page"). Opens Circle in each look, screenshots Billard / Mischen / Swipen, and writes what is painted behind each panel.
   node tools/circle-bg-1105.cjs [root] [outdir] [looks: black,night,light] */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const root = process.argv[2] || path.join(__dirname, '..'), out = process.argv[3] || '/tmp/circle-bg', looks = (process.argv[4] || 'black,night,light').split(',');
  fs.mkdirSync(out, { recursive: true });
  const res = {};
  for (const look of looks) {
    const R = await H.open({ engine: 'chromium', root, members: 12, messages: 20, probe: false, lang: 'en', dpr: 1 }), P = R.page;
    await R.ctx.addInitScript(l => { try { localStorage.setItem('lowi.theme', l === 'light' ? 'light' : 'dark'); localStorage.setItem('lowi.theme.dark', l === 'night' ? 'night' : 'black'); localStorage.setItem('lowispike.community.tabs', JSON.stringify(['room', 'chat', 'fy', 'rank'])); } catch (e) { } }, look);
    await R.goto(); await H.sleep(5000);
    await P.evaluate(() => goTab('foryou')); await H.sleep(1500);
    if (await P.locator('#cmPaneChat .rm-tab[data-rm="room"]').count()) await R.tap('#cmPaneChat .rm-tab[data-rm="room"]').catch(() => { });
    await H.sleep(1500);
    res[look] = {};
    for (const id of ['billard', 'mischen', 'swipen', 'billard']) {
      await R.tap('#cspBar [data-csp="' + id + '"]').catch(() => { }); await H.sleep(1800);
      const f = path.join(out, look + '-' + id + '.png'); await R.shot(f).catch(() => { });
      res[look][id] = await P.evaluate(() => {
        const bar = document.getElementById('cspBar'), b = bar && bar.getBoundingClientRect();
        const y = b ? Math.round(b.bottom + 120) : 400, pts = [[12, y], [195, y], [378, y], [12, y + 200], [378, y + 200]];
        const cls = ['csp-circle', 'csp-game', 'cook-holo'].filter(c => document.documentElement.classList.contains(c)).concat(['theme=' + document.documentElement.getAttribute('data-theme'), 'black=' + document.documentElement.getAttribute('data-black')]);
        const bgOf = el => { const s = []; for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none') s.push((e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0]) + ' ' + cs.backgroundColor + (cs.backgroundImage !== 'none' ? ' img' : '')); } return s.slice(0, 4); };
        return { cls, barBottom: b ? b.bottom : null, stack: pts.map(([x, yy]) => { const el = document.elementFromPoint(x, yy); return [x, yy, el ? (el.id || el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]) : null, el ? bgOf(el) : []]; }) };
      });
      res[look][id].png = f;
    }
    await R.close();
  }
  fs.writeFileSync(path.join(out, 'bg.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
})().catch(e => { console.log('BROKEN', e && e.stack || e); process.exit(1); });
