'use strict';
/* Browser check for the claim step (Oct 19). An existing, set-up account with only the standard Misty (the BUGHUNT
   fixture: setupDone, bday 1990-01-01, xp 900, no companion record) opens the app:
   1. the claim step appears once by itself, birthday prefilled, type optional
   2. pick a type, Bring it to life, reveal, Continue -> own companion saved with its type, progress unchanged
   3. Home and Forms show it (no smile on Home, no glow ring), evolution genome comes from it
   4. reload: no second prompt, still the same companion; no page errors
   usage: node playtest/own-companion-claim.cjs <view> [url] [lang]   views: iphone13 ipadP ipadL chromium390 */
const path = require('path');
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
const view = process.argv[2] || 'iphone13', url0 = process.argv[3] || '', lang = process.argv[4] || 'en';
const SHOTS = process.env.SHOTS || '/tmp/owncomp-shots';
(async () => {
    require('fs').mkdirSync(SHOTS, { recursive: true });
    let srv = null, url = url0;
    if (!url) { srv = await L.serve(path.join(__dirname, '..')); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, lang, claimPrompt: true, settle: 1500 });
    const { page } = h, out = { view, url, lang, steps: [] }, ok = (k, v, extra) => { out.steps.push([k, !!v, extra === undefined ? '' : extra]); };
    try {
        await page.waitForSelector('#lcOv.on', { timeout: 30000 }).catch(() => { });
        const f = await page.evaluate(() => { const o = document.getElementById('lcOv'); if (!o) return null; const r = o.querySelector('.lc-card').getBoundingClientRect();
            return { from: o.dataset.from, modal: o.getAttribute('aria-modal'), b: o.querySelector('#lcB').value, t: o.querySelector('#lcT').value, m: o.querySelector('#lcM').value, opts: o.querySelectorAll('#lcM option').length,
                h: (o.querySelector('#lcH') || {}).textContent, intro: (o.querySelector('.lc-intro') || {}).textContent, later: !!o.querySelector('.lc-later'), card: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], vw: innerWidth, vh: innerHeight,
                need: window.LowiBirthCompanion.needsClaim(), prompted: window.LowiBirthCompanion.prompted() }; });
        ok('prompt appeared by itself', f && f.from === 'update', f);
        await page.screenshot({ path: `${SHOTS}/${view}-${lang}-1-claim.png` });
        ok('birthday prefilled from setup', f && f.b === '1990-01-01');
        ok('type optional with 16 choices', f && f.m === '' && f.opts === 17);
        await page.selectOption('#lcM', 'INFP');
        const go = await L.center(h, '#lcOv [data-lcgo]'); await L.tap(h, go.x, go.y);
        await page.waitForSelector('#lcOv .lc-rev.lc-alive', { timeout: 15000 }).catch(() => { });
        await L.sleep(500);
        const rv = await page.evaluate(() => ({ name: (document.querySelector('#lcOv .lc-name') || {}).textContent, sign: (document.querySelector('#lcOv .lc-sign') || {}).textContent }));
        ok('reveal shows a name', rv.name && rv.name !== 'Misty', rv);
        await page.screenshot({ path: `${SHOTS}/${view}-${lang}-2-reveal.png` });
        const c2 = await L.center(h, '#lcOv [data-lc="go"]'); await L.tap(h, c2.x, c2.y);
        await L.sleep(1200);
        const after = await page.evaluate(() => { const rec = JSON.parse(localStorage.getItem('lowispike.companion.v1') || 'null'); const st = JSON.parse(localStorage.getItem('lowispike.v2') || '{}');
            const B = window.LowiBirthCompanion, c = B.get(), g = window.LowiCompanion && window.LowiCompanion.myGenome && window.LowiCompanion.myGenome();
            return { rec, xp: st.xp, ov: !!document.getElementById('lcOv'), misty: !!c.misty, name: c.name, seed: c.seed, el: c.element, need: B.needsClaim(),
                g: g && { el: g.el, a: g.a, sd: g.sd, sh: g.sh, sy: g.sy, pt: g.pt, au: g.au, hasType: g.hasType }, pal: c.palette && c.palette.a }; });
        ok('saved own companion with type', after.rec && after.rec.mbti === 'INFP' && after.rec.bday === '1990-01-01' && !after.misty && after.name === rv.name, after.rec);
        ok('progress kept (xp 900)', after.xp === 900, after.xp);
        ok('overlay closed', !after.ov);
        ok('evolution reads own companion', after.g && after.g.el === after.el && after.g.a === after.pal && after.g.sd === after.seed % 65536 && after.g.hasType && after.g.pt === 'star' && after.g.au === 'close', after.g);
        await page.evaluate(() => window.goTab && window.goTab('home')); await L.sleep(1500);
        const home = await page.evaluate(() => { const root = document.querySelector('#home, #t-home, [data-tab="home"]') || document.body; const t = root.innerText || '';
            return { hasName: t.indexOf(JSON.parse(localStorage.getItem('lowispike.companion.v1')).name) >= 0, misty: /\bMisty\b/.test(t), ownSvg: document.querySelectorAll('.cw-own, [data-own-companion], .lc-svg').length, ring: document.querySelectorAll('#home .lc-ring, .wh-bubble .lc-ring').length }; });
        ok('Home shows the new name, not Misty', home.hasName && !home.misty, home);
        await page.screenshot({ path: `${SHOTS}/${view}-${lang}-3-home.png` });
        await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 }); await L.sleep(8000);
        const re = await page.evaluate(() => ({ ov: !!document.getElementById('lcOv'), name: window.LowiBirthCompanion.get().name, prompted: window.LowiBirthCompanion.prompted() }));
        ok('after reload: no second prompt, same companion', !re.ov && re.name === rv.name && re.prompted, re);
        const errs = await L.snap(h);
        ok('no page errors', !h.log.pageerror.length && !errs.err.length && !errs.rej.length, { pageerror: h.log.pageerror, err: errs.err, rej: errs.rej });
    } catch (e) { ok('script', false, String(e && e.stack || e).slice(0, 500)); }
    await h.browser.close(); if (srv) srv.close();
    out.pass = out.steps.every(s => s[1]);
    console.log(JSON.stringify(out, null, 1));
    process.exit(out.pass ? 0 : 1);
})();
