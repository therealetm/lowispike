'use strict';
/* Profile overview probe (Oct 22 2026, Emmanuel: "one click on account and then you see this overview").
   usage: node tools/probe-profile-overview.cjs <device> [dirOrUrl] [out-prefix] [engine]
   Opens Profile from every entry (Settings > Account, Settings > Me, the profile button, LowiG2E memory), checks the overview shows
   with no sub-panel, opens each tile, checks there is exactly one back control in the header (>= 44px, below the notch, not covered
   by anything), Back returns to the overview, and screenshots the Account header in night and day mode. */
const H = require('./sim/harness.cjs'), path = require('path');
(async () => {
    const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || path.join(__dirname, '..'), out = process.argv[4] || '/tmp/po', engine = process.argv[5] || 'webkit';
    const o = { device, engine, members: 6, messages: 6, probe: false }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page, res = { device, fails: [] };
    const fail = m => res.fails.push(m);
    res.navs = 0; P.on('framenavigated', f => { if (f === P.mainFrame()) res.navs++; });
    const ready = async () => { await P.waitForFunction(() => window.goTab && window.LowiG2E && window.LowiG2E.overview && window.LowiHomeSettingsSleepV2 && document.readyState === 'complete', null, { timeout: 120000 }); await H.sleep(1500); };
    /* the simulated sign-in can reload the page now and then on a busy machine: retry a step once the app is back */
    const ev = async (fn, a) => { for (let i = 0; i < 3; i++) { try { return await P.evaluate(fn, a); } catch (e) { if (i === 2 || !/context|undefined|navigation/i.test(e.message)) throw e; res.retries = (res.retries || 0) + 1; await H.sleep(4000); await ready(); } } };
    await R.goto(); await H.sleep(20000); await ready();
    /* leaving Profile steps the history back; in the simulator the entry before the app is about:blank (on a phone there is none),
       so give the app a few entries of its own first, like the guard entry a first touch makes */
    await P.evaluate(() => { for (let i = 0; i < 4; i++) history.pushState(history.state, '', location.href); });
    /* the app may reload itself once after the first sign-in sync; wait it out so every step below runs on one page */
    { let n = res.navs; await H.sleep(8000); if (res.navs !== n) { await H.sleep(6000); await ready(); } }
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await H.sleep(200); }
    res.build = await ev(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
    const st = () => ev(() => ({ tab: (window.LowiHost && LowiHost.tab) ? LowiHost.tab() : null, g: window.LowiG2E ? LowiG2E.state() : null }));
    const home = async () => { await ev(() => { try { LowiG2E.close(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await H.sleep(700); };
    /* the header: every visible control in the top 140px left half that looks like back, and what sits on top of the Back pill */
    const header = () => ev(() => {
        const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 && r.bottom > 0 && r.top < innerHeight; };
        const back = document.querySelector('#g2eHead .g2e-back');
        const r = back && back.getBoundingClientRect();
        const sat = parseFloat(document.documentElement.style.getPropertyValue('--sat')) || 0;
        const others = [...document.querySelectorAll('button, [role=button], a')].filter(e => e !== back && !(back && back.contains(e)) && vis(e)).map(e => [e, e.getBoundingClientRect()])
            .filter(([e, b]) => r && b.left < r.right - 1 && r.left < b.right - 1 && b.top < r.bottom - 1 && r.top < b.bottom - 1)
            .filter(([e, b]) => { const x = (Math.max(b.left, r.left) + Math.min(b.right, r.right)) / 2, y = (Math.max(b.top, r.top) + Math.min(b.bottom, r.bottom)) / 2, h = document.elementFromPoint(x, y); return !!(h && !back.contains(h) && (e === h || e.contains(h))); })
            .map(([e, b]) => (e.id ? '#' + e.id : '') + '.' + String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).split(' ').join('.') + '@' + [b.left, b.top, b.width, b.height].map(Math.round));
        let hit = null; if (r) { const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); hit = el ? (back.contains(el) ? 'back' : (el.id || el.className || el.tagName)) : null; }
        const backs = [...document.querySelectorAll('button, [role=button]')].filter(e => vis(e) && /back|zur(ü|u)ck|atr(á|a)s|close profile/i.test((e.getAttribute('aria-label') || '') + ' ' + e.textContent) && e.getBoundingClientRect().top < 160 && e.getBoundingClientRect().left < innerWidth / 2).map(e => (e.id || e.className) + '');
        const title = document.querySelector('#g2eHead .g2e-ht'), tr = title && title.getBoundingClientRect();
        /* the title text (its real width) must not run under the top-right buttons (theme, close, picture) */
        let titleCovered = [];
        if (title && tr) { const rg = document.createRange(); rg.selectNodeContents(title); const tr0 = rg.getBoundingClientRect(); /* the text as drawn: an ellipsis clips it to the title box */
            const tx = { left: Math.max(tr0.left, tr.left), right: Math.min(tr0.right, tr.right), top: tr0.top, bottom: tr0.bottom };
            titleCovered = tx.right <= tx.left ? [] : [...document.querySelectorAll('button, [role=button], a')].filter(e => !title.contains(e) && e !== back && !(back && back.contains(e)) && vis(e)).map(e => [e, e.getBoundingClientRect()])
                .filter(([e, b]) => b.left < tx.right - 1 && tx.left < b.right - 1 && b.top < tx.bottom - 1 && tx.top < b.bottom - 1)
                .filter(([e, b]) => { const x = (Math.max(b.left, tx.left) + Math.min(b.right, tx.right)) / 2, y = (Math.max(b.top, tx.top) + Math.min(b.bottom, tx.bottom)) / 2, h = document.elementFromPoint(x, y); return !!(h && (e === h || e.contains(h))); })
                .map(([e]) => e.id || String(e.className)); }
        return { back: r ? [r.left, r.top, r.width, r.height].map(Math.round) : null, sat, overlap: others, titleCovered, titleBox: tr ? [tr.left, tr.right].map(Math.round) : null, hit, backs, title: title ? title.textContent : null,
            titleOverlap: !!(r && tr && tr.left < r.right - 1 && tr.width > 0) };
    });
    const checkOverview = (label, s) => { if (!s.g || !s.g.on || s.g.open || s.tab !== 'profile') fail(label + ': not the overview ' + JSON.stringify(s)); };
    /* 1. Settings > Account (the bug) after a sub-panel was last open */
    res.entries = {};
    await ev(() => { goTab('profile'); }); await H.sleep(900);
    await ev(() => LowiG2E.open('acct')); await H.sleep(500);
    await home();
        for (const id of ['account', 'me']) {
        await ev(id => { window.LowiHomeSettingsSleepV2.run(id); }, id); await H.sleep(1600);
        const s = await st(); res.entries[id] = s; checkOverview('settings ' + id, s); await home();
    }
    /* 2. the profile button (#pfBtn) if it is on screen */
    const pf = await ev(() => { const b = document.getElementById('pfBtn'); return !!(b && b.offsetWidth); });
    if (pf) { await R.tap('#pfBtn'); await H.sleep(1200); const s = await st(); res.entries.pfBtn = s; checkOverview('pfBtn', s); await home(); }
    /* 3. goTab('profile') while a panel was open before */
    await ev(() => { goTab('profile'); }); await H.sleep(700); await ev(() => LowiG2E.open('look')); await H.sleep(300);
    await ev(() => { goTab('home'); }); await H.sleep(500); await ev(() => { goTab('profile'); }); await H.sleep(900);
    { const s = await st(); res.entries.reopen = s; checkOverview('reopen', s); }
    res.tiles = (await st()).g.tiles;
    /* NOTCH=1: pretend a 47px notch (the simulator has none) so the header is checked clear of it */
    if (process.env.NOTCH) await ev(() => document.documentElement.style.setProperty('--sat', '47px'));
    res.notch = !!process.env.NOTCH;
    /* 4. every tile: one clean back control; Back returns to the overview */
    res.panels = {};
    for (const k of res.tiles) {
        await R.tap('#g2eTiles [data-g2e-open="' + k + '"]'); await H.sleep(600);
        const h = await header(); res.panels[k] = h;
        if (!h.back) fail(k + ': no back'); else {
            if (h.back[3] < 44 || h.back[2] < 44) fail(k + ': back too small ' + h.back);
            if (h.back[1] < h.sat - 0.5) fail(k + ': back under the notch ' + h.back + ' sat ' + h.sat);
            if (h.overlap.length) fail(k + ': covered by ' + h.overlap.join(','));
            if (h.hit !== 'back') fail(k + ': tap hits ' + h.hit);
            if (h.titleOverlap) fail(k + ': title overlaps back');
            if (h.titleCovered.length) fail(k + ': title under ' + h.titleCovered.join(','));
            if (h.backs.length !== 1) fail(k + ': back controls ' + h.backs.join(','));
        }
        if (k === 'acct') { await R.shot(out + '-' + device.replace(/\s+/g, '') + '-acct-night.png'); }
        await R.tap('#g2eHead .g2e-back'); await H.sleep(500);
        const s = await st(); checkOverview('back from ' + k, s);
    }
    /* day mode + DE/ES header */
    await ev(() => { try { LowiR2.applyTheme && LowiR2.applyTheme('light'); } catch (e) { } document.documentElement.setAttribute('data-ui', 'light'); document.documentElement.setAttribute('data-theme', 'light'); }); await H.sleep(400);
    await R.shot(out + '-' + device.replace(/\s+/g, '') + '-overview-day.png');
    await R.tap('#g2eTiles [data-g2e-open="acct"]'); await H.sleep(600);
    res.dayAcct = await header(); if (res.dayAcct.overlap.length || res.dayAcct.backs.length !== 1) fail('day acct: ' + JSON.stringify(res.dayAcct));
    await R.shot(out + '-' + device.replace(/\s+/g, '') + '-acct-day.png');
    for (const lang of ['de', 'es']) {
        await ev(l => { try { LowiLang.set(l); } catch (e) { } }, lang); await H.sleep(600);
        const h = await header(); res['acct_' + lang] = { back: h.back, label: await ev(() => (document.querySelector('#g2eHead .g2e-back') || {}).textContent), title: h.title, overlap: h.overlap };
        if (h.overlap.length || h.titleOverlap || h.titleCovered.length) fail(lang + ' header overlap ' + JSON.stringify(h));
    }
    await ev(() => { try { LowiLang.set('en'); } catch (e) { } });
    /* Escape from a panel goes to the overview; Back/X from the overview closes Profile */
    await P.keyboard.press('Escape'); await H.sleep(400); { const s = await st(); checkOverview('escape', s); }
    const x = await ev(() => { const b = document.getElementById('r3Back'); return !!(b && b.offsetWidth); });
    if (x) { await R.tap('#r3Back'); await H.sleep(600); const s = await st(); res.closeX = s.tab; if (s.tab === 'profile') fail('X did not close profile'); }
    res.errors = R.errs;
    console.log(JSON.stringify(res, null, 1));
    await R.close();
})().catch(e => { console.error(e); process.exit(1); });
