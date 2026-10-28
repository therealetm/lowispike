'use strict';
/* Bottom-center back / close check (owner request 14, 28 Oct 2026). Opens the main screens, sheets and panels and checks that the
   one back / close button sits at the bottom center above the home indicator, stands in for that screen's own back / X (which is
   hidden), does not cover a text field, the composer or the bin, that tapping it closes the layer, and that no top-left back arrow
   or top-corner X is left visible. Browser sim, not a real phone.
   node tools/check-bottom-close.cjs <dark|light> <WxH> [live] [webkit|chromium]   screenshots to $KH_SHOTS (default /home/sprite/kochen-holo) */
const { launch, openApp, sleep, BASE, existingSeed } = require('./interface-audit/lib.cjs');
const fs = require('fs');
const theme = process.argv[2] || 'dark', vp = (process.argv[3] || '390x844').split('x').map(Number), live = process.argv[4] === 'live';
const engine = process.argv[5] || 'chromium', SHOT = process.env.KH_SHOTS || '/home/sprite/kochen-holo';
try { fs.mkdirSync(SHOT, { recursive: true }); } catch (e) { }
(async () => {
    const seed = existingSeed({ lang: 'de', kv: { 'lowispike.lang': 'de', 'lowi.lang': 'de', 'lowispike.theme': theme, 'lowi.theme': theme } });
    const h = await launch({ engine, seed, lang: 'de', locale: 'de-DE', viewport: { width: vp[0], height: vp[1] } });
    if (live) await h.ctx.route(u => String(u).startsWith(BASE), r => r.request().method() === 'GET' ? r.continue() : r.abort());
    await openApp(h, { query: '?dc=' + Date.now() });
    const P = h.page, tag = theme + '-' + vp.join('x') + (live ? '-live' : '') + (engine === 'webkit' ? '-wk' : '');
    const esc = async (n = 3) => { for (let i = 0; i < n; i++) { await P.keyboard.press('Escape'); await sleep(250); } };
    await sleep(1500); await esc();
    const out = { theme, vp: vp.join('x'), live, engine, build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || window.LOWI_BUILD || '') , screens: [] };
    const state = (name) => P.evaluate((name) => {
        const b = document.getElementById('lwBX'), BC = window.LowiBottomClose;
        if (BC) BC.update();
        const r = b && b.classList.contains('on') ? b.getBoundingClientRect() : null;
        const res = { name, on: !!r, kind: b && b.dataset.kind, label: b && b.getAttribute('aria-label') };
        if (r) {
            res.cx = Math.round(r.left + r.width / 2); res.bottomGap = Math.round(innerHeight - r.bottom); res.centered = Math.abs(res.cx - innerWidth / 2) <= 1;
            /* what is under the button (besides itself): a field / composer / bin must never be */
            b.style.pointerEvents = 'none'; const under = [];
            for (const dx of [-20, 0, 20]) for (const dy of [8, 28, 48]) { const e = document.elementFromPoint(r.left + 28 + dx, r.top + dy); const o = e && e.closest('textarea,input:not([type=hidden]),[contenteditable="true"],.kg-bin,button:not(.lw-bx-src)'); if (o && o !== b) under.push((o.id || String(o.className).slice(0, 30) || o.tagName)); }
            b.style.pointerEvents = ''; res.covers = [...new Set(under)]; res.fieldsNearBottom = [...document.querySelectorAll('textarea,input[type=text],input:not([type])')].filter(e => { const q = e.getBoundingClientRect(); return q.width > 40 && q.bottom > innerHeight - 200 && q.top < innerHeight && getComputedStyle(e).visibility !== 'hidden'; }).map(e => { const q = e.getBoundingClientRect(); return (e.id || e.className || e.tagName).toString().slice(0, 20) + '@' + Math.round(q.top) + '-' + Math.round(q.bottom); }); res.btnTop = Math.round(r.top);
            const t = BC && BC.target; res.lifted = BC.lifted; res.target = t ? (t.id || String(t.className).slice(0, 40)) : null;
        }
        /* leftover: a visible close / back control in the top 110px that is not hidden */
        const left = [];
        document.querySelectorAll('button,[role="button"]').forEach(el => {
            if (el === b || el.classList.contains('lw-bx-src')) return; const q = el.getBoundingClientRect(); if (q.width < 4 || q.top > 110 || q.bottom < 0) return;
            const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity < .1) return;
            const l = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim();
            if (/^(close|schlie(ß|ss)en|cerrar|back|zur(ü|u)ck|atr(á|a)s|×|✕|‹|←)/i.test(l) && document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2) === el) left.push((el.id || String(el.className).slice(0, 30)) + ' "' + l.slice(0, 20) + '"');
        });
        res.leftover = left;
        return res;
    }, name);
    const screens = [
        ['home', async () => { }],
        ['kochen', async () => P.evaluate(() => LowiHost.go('shelf'))],
        ['profil', async () => P.evaluate(() => LowiHost.go('profile'))],
        ['bewegen', async () => P.evaluate(() => LowiHost.go('move'))],
        ['scanner', async () => P.evaluate(() => LowiHost.go('scan'))],
        ['community', async () => P.evaluate(() => LowiHost.go('foryou'))],
        ['kuehlschrank-zoom', async () => P.evaluate(async () => { LowiHost.go('shelf'); await new Promise(r => setTimeout(r, 3500)); const f = document.querySelector('#tab-shelf [data-kg-door],#tab-shelf [data-kg-shelf]'); if (f) f.click(); })],
        ['community-chat', async () => P.evaluate(async () => { LowiHost.go('foryou'); await new Promise(r => setTimeout(r, 3000)); const t = [...document.querySelectorAll('#tab-foryou button,#tab-foryou [role="tab"]')].find(b => /^\s*chat\s*$/i.test(b.textContent)); if (t) t.click(); })],
        ['essenspause', async () => P.evaluate(() => { goTab('home'); window.LowiGapView && LowiGapView.open(); })],
        ['einkaufen', async () => P.evaluate(() => { goTab('home'); window.LowiStorePicks && LowiStorePicks.open(); })],
    ];
    const only = (process.env.BX_ONLY || '').split(',').filter(Boolean);
    for (const [name, open] of screens) {
        if (only.length && !only.includes(name)) continue;
        try {
            await open(); await sleep(name === 'home' ? 500 : 3800);
            const s = await state(name);
            await P.screenshot({ path: SHOT + '/bx-' + name + '-' + tag + '.jpg', type: 'jpeg', quality: 55 }).catch(() => {});
            if (s.on) {
                const before = await P.evaluate(() => (document.querySelector('#tab-shelf .kg-open') ? 'zoom|' : '') + (typeof TAB !== 'undefined' ? TAB : '') + '|' + document.documentElement.classList.contains('b3-camon') + '|' + !!document.querySelector('.gv-ov.on,#gvSheet') + '|' + !!document.querySelector('.stp-ov'));
                await P.click('#lwBX', { timeout: 3000 }).catch(e => { s.clickErr = String(e).slice(0,700); });
                await sleep(1200);
                s.afterTap = await P.evaluate(() => (document.querySelector('#tab-shelf .kg-open') ? 'zoom|' : '') + (typeof TAB !== 'undefined' ? TAB : '') + '|' + document.documentElement.classList.contains('b3-camon') + '|' + !!document.querySelector('.gv-ov.on,#gvSheet') + '|' + !!document.querySelector('.stp-ov'));
                s.closed = s.afterTap !== before; s.before = before;
            }
            out.screens.push(s);
        } catch (e) { out.screens.push({ name, err: String(e).slice(0, 160) }); }
        await esc(2); await P.evaluate(() => { try { goTab('home'); } catch (e) { } }); await sleep(600);
    }
    out.errors = h.errors.slice(0, 5);
    console.log(JSON.stringify(out, null, 1));
    await h.browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
