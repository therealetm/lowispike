#!/usr/bin/env node
/* Oct 26 2026 clue: on iPad the Home button shows on Community, on iPhone it doesn't. At each width, with and without the
   companion flying, is #secX shown and on top on every Community tab? Usage: node width-probe.cjs [URL] */
'use strict';
const H = require('../regress/harness.cjs');
const st = R => R.page.evaluate(() => {
    const x = document.getElementById('secX'); if (!x) return 'missing';
    const r = x.getBoundingClientRect(), cs = getComputedStyle(x), e = r.width ? document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) : null;
    const pill = document.querySelector('#cmPaneChat .rm-head'), pr = pill && pill.getBoundingClientRect();
    return cs.display + (r.width ? (e === x || x.contains(e) ? ' on-top' : ' covered-by ' + (e ? e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 40) : 'none')) : '') + ' pillLeft=' + (pr ? Math.round(pr.left) : '?') + (document.documentElement.classList.contains('mf-on') ? ' FLYING' : '');
});
(async () => {
    for (const [w, h, label] of [[390, 844, 'iPhone 13'], [430, 932, 'iPhone Pro Max'], [820, 1180, 'iPad']]) {
        for (const fly of [false, true]) {
            const R = await H.open({ engine: 'webkit', url: process.argv[2] || '' });
            await R.page.setViewportSize({ width: w, height: h });
            await R.goto(); await H.sleep(3000);
            if (fly) { await R.page.evaluate(() => window.LowiPad && window.LowiPad.mode('auto')); for (let i = 0; i < 16; i++) { await H.sleep(500); if (await R.page.evaluate(() => document.documentElement.classList.contains('mf-on'))) break; } }
            await R.page.evaluate(() => goTab('foryou')); await H.sleep(2000);
            const out = [];
            for (const t of ['room', 'chat', 'rank']) { await R.page.evaluate(t => { const b = document.querySelector('.rm-tab[data-rm="' + t + '"]'); if (b) b.click(); }, t); await H.sleep(1000); out.push(t + ': ' + await st(R)); }
            console.log(label + ' ' + w + 'x' + h + (fly ? ' autopilot' : ' still') + ' | ' + out.join(' | '));
            await R.close();
        }
    }
})();
