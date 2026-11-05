'use strict';
/* Theme inside Time of day & weather (Nov 5 2026): screenshots of the Settings page and the Time of day & weather sheet.
   IA_ROOT=<worktree> node tools/theme-weather/shots.cjs <prefix> [lang] [theme]  -> /home/sprite/tw-shots/<prefix>-*.png */
const fs = require('fs');
const { launch, openApp, sleep, existingSeed } = require('../interface-audit/lib.cjs');
const pre = process.argv[2] || 'x', lang = process.argv[3] || 'en', theme = process.argv[4] || '';
const OUT = '/home/sprite/tw-shots'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
    const kv = { 'lowispike.lang': lang, 'lowi.lang': lang };
    if (theme === 'day') { kv['lowi.theme'] = 'light'; }
    const seed = existingSeed({ lang, kv });
    const h = await launch({ engine: 'chromium', seed, lang, locale: lang, viewport: { width: 390, height: 844 } });
    await openApp(h, { settle: 4000 });
    const P = h.page;
    await P.evaluate(() => window.LowiCommunityMe.open()); await sleep(1200);
    await P.screenshot({ path: OUT + '/' + pre + '-settings.png' });
    const rows = await P.evaluate(() => [...document.querySelectorAll('.cme-ov [data-cme], .cme-ov .cme-row')].map(b => (b.getAttribute('data-cme') || b.className) + ' | ' + b.textContent.replace(/\s+/g, ' ').trim().slice(0, 80)));
    console.log(rows.join('\n'));
    const sky = await P.$('.cme-ov [data-cme="sky"]');
    if (sky) { await sky.click(); await sleep(1400); await P.screenshot({ path: OUT + '/' + pre + '-sky.png' }); const sh = await P.$('.atm-ov .r2-sh'); if (sh) { await sh.evaluate(e => { const b = e.querySelector('.r2-shb') || e; b.scrollTop = 9999; }); await sleep(300); await P.screenshot({ path: OUT + '/' + pre + '-sky2.png' }); } }
    console.log('errors', JSON.stringify(h.errors));
    await h.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
