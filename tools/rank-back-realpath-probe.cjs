#!/usr/bin/env node
/* Oct 24 2026 (follow-up of the one-chat check): from Community > Ranking the first back left Community open and the second back
   left the app, but that check opened Community with goTab() from code. This probe takes the real way: a tap on the Community
   bubble on Home, a tap on the Ranking tab, then back (history.back, like the Safari edge swipe / Android back) up to three times,
   and records after each back: still in the app?, which tab, Community open?, and the history state.
   Usage: node tools/rank-back-realpath-probe.cjs [url|root] [--engine chromium|webkit] [--device 'iPhone 13'] [--size 820x1180]
   Simulated browsers only; Supabase is faked by the harness. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const where = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'https://therealetm.github.io/lowispike/index.html';
const ENGINE = arg('engine', 'chromium'), DEVICE = arg('device', 'iPhone 13'), SIZE = String(arg('size', '')).match(/^(\d+)x(\d+)$/);
(async () => {
    const o = { engine: ENGINE, device: DEVICE, probe: false, members: 12, messages: 30 };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    if (SIZE) { o.viewport = { width: +SIZE[1], height: +SIZE[2] }; o.dpr = 2; }
    const R = await H.open(o), P = R.page, errs = [], fails = [];
    if (ENGINE === 'webkit') try { await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'sim', 'no-media-init.js'), 'utf8') }); } catch (e) { }
    P.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
    const look = () => P.evaluate(() => {
        const t = document.querySelector('.rm-tabs'), on = (document.querySelector('.rm-tab[aria-selected=true], .rm-tab.on') || {}).dataset || {};
        return { url: location.href, tab: (document.querySelector('.tab.active') || {}).id || '', comm: !!(t && t.getBoundingClientRect().width > 0 && document.documentElement.dataset.tab !== 'home' && (document.querySelector('.tab.active') || {}).id === 'tab-foryou'),
            rm: on.rm || ((window.LowiRoomsUI && LowiRoomsUI.tab && LowiRoomsUI.tab()) || ''), state: JSON.stringify(history.state), hist: history.length };
    }).catch(e => ({ gone: String(e.message).slice(0, 100) }));
    const tapSel = async sel => { const b = await P.evaluate(s => { const e = [...document.querySelectorAll(s)].find(x => { const r = x.getBoundingClientRect(); return r.width > 4 && r.height > 4; }); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel); if (!b) return false; await P.mouse.click(b.x, b.y); return true; };
    try {
        await R.goto();
        await P.waitForFunction(() => typeof window.goTab === 'function' && document.querySelector('[data-orbit="settings"]'), null, { timeout: 120000 });
        await P.evaluate(() => { const un = () => { document.querySelectorAll('[inert]').forEach(e => e.removeAttribute('inert')); document.documentElement.classList.remove('gate-up', 'gate-boot'); const g = document.getElementById('r2gate'); if (g) g.hidden = true; }; un(); setInterval(un, 400); });
        await H.sleep(5000);
        const build = await P.evaluate(() => (document.querySelector('meta[name=lowi-build]') || {}).content || window.LOWI_BUILD || '');
        /* a person touches Home first (that is when the back guard goes in), then taps the Community bubble */
        await P.mouse.click(10, 300); await H.sleep(600);
        if (!(await tapSel('[data-orbit="settings"]'))) fails.push('no Community bubble');
        await H.sleep(3000);
        await P.evaluate(() => { const x = document.querySelector('.rm-ob .rm-x, .rm-ob [data-ob=close]'); if (x && x.getBoundingClientRect().width) x.click(); }); await H.sleep(700);
        if (!(await tapSel('.rm-tab[data-rm="rank"]'))) fails.push('no Ranking tab');
        await H.sleep(2000);
        const s0 = await look(); console.log('build ' + build + ' ' + (SIZE ? SIZE[0] : DEVICE) + ' ' + ENGINE + '\nopened', JSON.stringify(s0));
        if (!s0.comm || s0.rm !== 'rank') fails.push('Ranking did not open by taps: ' + JSON.stringify(s0));
        for (let i = 1; i <= 3; i++) {
            await P.goBack({ timeout: 4000 }).catch(() => { }); await H.sleep(1800);
            const s = await look(); console.log('back ' + i, JSON.stringify(s));
            if (s.gone || !/therealetm|127\.0\.0\.1|localhost/.test(s.url || '')) { fails.push('back ' + i + ' left the app'); break; }
            if (!s.comm) { console.log('Community closed after back ' + i + ', app still open'); break; }
            if (i === 2) fails.push('Community still open after two backs');
        }
    } catch (e) { fails.push(e.message.slice(0, 160)); }
    if (errs.length) fails.push('page errors: ' + errs.join(' | '));
    console.log((fails.length ? 'FAIL ' : 'PASS ') + fails.join('; '));
    await R.close().catch(() => { }); process.exit(fails.length ? 1 : 0);
})();
