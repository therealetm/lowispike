'use strict';
/* Theme inside "Look, time of day & weather" + Dark for everyone (Nov 5 2026). Phone-sized Chromium, local files, no network.
   IA_ROOT=<worktree> node tools/theme-weather/flow.cjs  -> prints PASS/FAIL lines and a total. Not a real iPhone. */
const fs = require('fs');
const { launch, openApp, sleep, existingSeed } = require('../interface-audit/lib.cjs');
const OUT = '/home/sprite/tw-shots'; fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

async function openSettings(P) { await P.evaluate(() => window.LowiCommunityMe.open()); await sleep(900); }
async function openSheet(P) { await P.click('.cme-ov [data-cme="sky"]'); await sleep(1200); }
async function closeSheet(P) { await P.evaluate(() => { const ov = document.querySelector('.atm-ov:not(.off)'); if (ov) window.LowiR2.close(ov); }); await sleep(1200); }
/* text colour with its alpha and the element's opacity, laid over the first solid background behind it */
const blend = (fg, op, bg) => { const f = fg.match(/[\d.]+/g).map(Number), b = bg.match(/[\d.]+/g).map(Number), a = (f.length > 3 ? f[3] : 1) * op; return 'rgb(' + [0, 1, 2].map(i => Math.round(f[i] * a + b[i] * (1 - a))).join(', ') + ')'; };
const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };

async function existingRun(o) {
    const tag = o.tag, lang = o.lang || 'en';
    const seed = existingSeed({ lang, kv: Object.assign({ 'lowispike.lang': lang, 'lowi.lang': lang }, o.kv || {}) });
    const h = await launch({ engine: 'chromium', seed, lang, locale: lang, viewport: o.viewport || { width: 390, height: 844 } });
    await openApp(h, { settle: 4000 });
    const P = h.page;
    return { h, P };
}

(async () => {
    /* 1. existing account that had Day (and an old Day sky) -> starts on true black Dark after the update */
    {
        const { h, P } = await existingRun({ tag: 'mig', kv: { 'lowi.theme': 'light', 'lowi.theme.dark': 'night', 'lowi.theme.dark.picked': 'night', 'lowi.theme.dark.fix1': '1', 'lowi.atmos': JSON.stringify({ mode: 'manual', p: 25 }) } });
        const st = await P.evaluate(() => ({ t: document.documentElement.getAttribute('data-theme'), b: document.documentElement.getAttribute('data-black'), k: localStorage.getItem('lowi.theme.dark'), f: localStorage.getItem('lowi.theme.dark.all1'), a: localStorage.getItem('lowi.atmos'), bg: getComputedStyle(document.body).backgroundColor }));
        ok(st.t === 'dark' && st.b === '1' && st.k === 'black' && st.f === '1', 'existing Day + Night-picked account now opens in true black Dark (' + JSON.stringify(st) + ')');
        /* picks Day in the new place, reloads: Day stays (the switch to Dark happens once) */
        await openSettings(P); await openSheet(P);
        await P.click('.atm-ov [data-atm-quick="day"]'); await sleep(900);
        const foot = await P.textContent('.atm-ov [data-atm-lookfoot]');
        ok(/Day/.test(foot), 'Look footer follows the choice: "' + foot + '"');
        await closeSheet(P);
        const sub = await P.evaluate(() => { const s = document.querySelector('.cme-ov [data-cme="sky"] [data-cme-look]'); return s && s.textContent; });
        ok(sub === 'Day', 'Settings row now says Day (' + sub + ')');
        await P.reload({ waitUntil: 'load' }); await sleep(6000);
        const t2 = await P.evaluate(() => document.documentElement.getAttribute('data-theme'));
        ok(t2 === 'light', 'after a reload the Day pick stays (data-theme ' + t2 + ')');
        ok(h.errors.length === 0, 'no page errors (' + JSON.stringify(h.errors) + ')');
        await h.browser.close();
    }
    /* 2. brand-new device (empty storage) -> Dark, and the Home Screen first-start check still sees empty storage */
    {
        const h = await launch({ engine: 'chromium', seed: { kv: {}, session: {} }, viewport: { width: 390, height: 844 } });
        await h.page.goto('https://therealetm.github.io/lowispike/', { waitUntil: 'load', timeout: 120000 }); await sleep(5000);
        const st = await h.page.evaluate(() => ({ t: document.documentElement.getAttribute('data-theme'), b: document.documentElement.getAttribute('data-black'), fresh: window.__lowiFresh }));
        ok(st.t === 'dark' && st.b === '1', 'new device starts in true black Dark (' + JSON.stringify(st) + ')');
        ok(st.fresh === true, 'first-start check still sees an empty storage (' + st.fresh + ')');
        ok(h.errors.length === 0, 'no page errors on a new device (' + JSON.stringify(h.errors) + ')');
        await h.browser.close();
    }
    /* 3. layout: 3 phone sizes x 3 languages x Dark and Day */
    const VPS = process.env.TW_QUICK ? [{ width: 390, height: 844 }] : [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 430, height: 932 }];
    for (const vp of VPS) for (const lang of (process.env.TW_QUICK ? ['en'] : ['en', 'de', 'es'])) for (const look of ['black', 'day']) {
        const tag = vp.width + '-' + lang + '-' + look;
        const kv = look === 'day' ? { 'lowi.theme': 'light', 'lowi.theme.dark.all1': '1', 'lowi.atmos': JSON.stringify({ mode: 'manual', p: 25 }) } : {};
        const { h, P } = await existingRun({ tag, lang, viewport: vp, kv });
        await openSettings(P);
        const rows = await P.evaluate(() => [...document.querySelectorAll('.cme-ov [data-cme], .cme-ov .cme-langrow')].map(b => b.getAttribute('data-cme') || 'lang'));
        const iSky = rows.indexOf('sky');
        ok(iSky >= 0 && rows[iSky + 1] === 'galaxyStill' && !rows.includes('theme') && !(await P.$('.cme-ov .cme-themerow')), tag + ': one look row, Still galaxy right under it, no separate App theme row');
        const r = await P.evaluate(() => { const b = document.querySelector('.cme-ov [data-cme="sky"]').getBoundingClientRect(); return { h: b.height, w: b.width, sw: document.documentElement.scrollWidth, vw: innerWidth }; });
        ok(r.h >= 44 && r.sw <= r.vw, tag + ': row ' + Math.round(r.h) + ' px tall, no sideways overflow');
        if (vp.width === 390) await P.screenshot({ path: OUT + '/flow-' + tag + '-settings.png' });
        await openSheet(P);
        const m = await P.evaluate(() => {
            const ov = document.querySelector('.atm-ov:not(.off)'); if (!ov) return null;
            const sh = ov.querySelector('.r2-sh'), x = ov.querySelector('.r2-x'), t = ov.querySelector('.atm-title');
            const heads = [...ov.querySelectorAll('.atm-sech')].map(e => e.textContent);
            const btns = [...ov.querySelectorAll('[data-atm-quick]')].map(b => { const r = b.getBoundingClientRect(), s = b.querySelector('span'); return { h: r.height, w: r.width, clip: s ? s.scrollWidth > s.clientWidth + 1 : false }; });
            const tr = t.getBoundingClientRect(), xr = x ? x.getBoundingClientRect() : { left: 1e4, bottom: -1 };
            const overlap = !(tr.right <= xr.left || tr.bottom <= xr.top || tr.top >= xr.bottom);
            const on = ov.querySelector('[data-atm-quick].on');
            const foot = ov.querySelector('[data-atm-lookfoot]');
            const cs = e => getComputedStyle(e);
            /* text colour vs the panel colour behind the footer / header (alpha panels over the sheet: take the sheet) */
            const bgOf = e => { let n = e; while (n) { const c = cs(n).backgroundColor; if (c && !/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(c) && !/rgba\([^)]*, 0?\.\d+\)/.test(c)) return c; n = n.parentElement; } return 'rgb(0, 0, 0)'; };
            return { heads, btns, overlap, on: on && on.getAttribute('data-atm-quick'), foot: foot && foot.textContent, sw: sh.scrollWidth, cw: sh.clientWidth, title: t.textContent,
                footC: cs(foot).color, footBg: bgOf(foot), headC: cs(ov.querySelector('.atm-sech')).color, headBg: bgOf(ov.querySelector('.atm-sech')), footOp: +cs(foot).opacity, headOp: +cs(ov.querySelector('.atm-sech')).opacity,
                grpBg: cs(ov.querySelector('.atm-grp')).backgroundColor };
        });
        if (!m) { ok(false, tag + ': sheet opened'); await h.browser.close(); continue; }
        ok(m.heads.length === 3, tag + ': sheet "' + m.title + '" has 3 groups: ' + m.heads.join(' / '));
        ok(m.btns.length === 4 && m.btns.every(b => b.h >= 44), tag + ': Day/Dark/Night/Auto, each ' + m.btns.map(b => Math.round(b.h)).join('/') + ' px tall');
        ok(m.btns.every(b => !b.clip), tag + ': no look name cut off (' + m.btns.map(b => Math.round(b.w)).join('/') + ' px wide)');
        ok(!m.overlap && m.sw <= m.cw + 1, tag + ': title clear of the close button, no sideways overflow');
        ok(m.on === look, tag + ': the current look is the selected one (' + m.on + '), footer "' + m.foot + '"');
        if (look === 'black') ok(/rgb\((\d+), \1, \1\)/.test(m.grpBg) || /rgba\((\d+), \1, \1/.test(m.grpBg), tag + ': group panel is neutral black, not blue (' + m.grpBg + ')');
        const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
        const c1 = cr(blend(m.footC, m.footOp, m.footBg), m.footBg), c2 = cr(blend(m.headC, m.headOp, m.headBg), m.headBg);
        ok(Math.min(c1, c2) >= 4.5, tag + ': header/footer contrast ' + c2.toFixed(1) + ' / ' + c1.toFixed(1) + ' (text ' + m.footC + ' on ' + m.footBg + ')');
        if (vp.width === 390 || vp.width === 320) await P.screenshot({ path: OUT + '/flow-' + tag + '-sheet.png' });
        ok(h.errors.length === 0, tag + ': no page errors (' + JSON.stringify(h.errors) + ')');
        await h.browser.close();
    }
    console.log('TOTAL pass ' + pass + ' fail ' + fail);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
