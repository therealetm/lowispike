'use strict';
/* Oct 28 2026: Companion > Aussehen close gestures + day recap wording, in a phone-size browser (not a real iPhone).
   node tools/look-recap-probe.cjs <WxH> [webkit|chromium] [live]   env LR_LANG=de|en|es, LR_SHOTS=dir
   Checks: pull the top bar down (mouse) and by touch from the scrolled-to-top list = back to the companion card; a short
   pull springs back; a touch swipe up still scrolls the list and a pull while scrolled down does not close; left-edge
   swipe = back; the day recap has no sideways overflow, broken words or placeholders. */
const { launch, openApp, sleep, BASE, existingSeed } = require('./interface-audit/lib.cjs');
const vp = (process.argv[2] || '390x844').split('x').map(Number), engine = process.argv[3] || 'webkit', live = process.argv[4] === 'live';
const SHOT = process.env.LR_SHOTS || '/home/sprite/lr-shots', lang = process.env.LR_LANG || 'de';
(async () => {
    const DAYK = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
    const t0 = Date.now() - 3 * 3600e3;
    const seed = existingSeed({ lang, kv: { 'lowispike.lang': lang, 'lowi.lang': lang } });
    const h = await launch({ engine, seed, lang, locale: lang + '-' + lang.toUpperCase(), viewport: { width: vp[0], height: vp[1] } });
    if (live) await h.ctx.route(u => String(u).startsWith(BASE), r => r.request().method() === 'GET' ? r.continue() : r.abort());
    await openApp(h, { query: '?dc=' + Date.now() });
    const P = h.page, name = vp.join('x') + '-' + engine + '-' + lang + (live ? '-live' : '');
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await sleep(250); }
    const out = { name, build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || ''), errors: [] };
    const openLook = async () => P.evaluate(async () => {
        const sl = ms => new Promise(r => setTimeout(r, ms));
        try { LowiR2.closeAll(); } catch (e) { } await sl(300);
        LowiMistyHub.open(); await sl(700); document.querySelector('[data-door="look"]').click(); await sl(900);
        return !!document.querySelector('.cf-ov');
    });
    const state = () => P.evaluate(() => ({ look: !!document.querySelector('.cf-ov'), card: !!document.querySelector('#mistyHub') && !document.querySelector('.r2-parked #mistyHub'), ovs: [...document.querySelectorAll('.r2-ov')].map(o => o.className.replace(/\s+/g, ' ')).join(' | ') }));
    const panelBox = () => P.evaluate(() => { const p = document.querySelector('.cf-ov .cf-panel'), s = p.querySelector('.cf-scroll'), r = p.getBoundingClientRect(), q = s.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height, sx: q.left + q.width / 2, sy: q.top + 120, st: s.scrollTop, sh: s.scrollHeight, ch: s.clientHeight }; });
    /* synthetic touches, same events iOS sends */
    const touch = (pts) => P.evaluate(async pts => {
        const sl = ms => new Promise(r => setTimeout(r, ms));
        const el0 = document.elementFromPoint(pts[0][0], pts[0][1]);
        /* WebKit on Linux has no Touch constructor: a cancelable Event with the same touches lists runs the same handlers */
        const mk = (x, y) => ({ identifier: 7, target: el0, clientX: x, clientY: y, pageX: x, pageY: y });
        const fire = (type, x, y) => { const t = mk(x, y), e = new Event(type, { bubbles: true, cancelable: true, composed: true }); const L = type === 'touchend' ? [] : [t]; Object.defineProperty(e, 'touches', { value: L }); Object.defineProperty(e, 'targetTouches', { value: L }); Object.defineProperty(e, 'changedTouches', { value: [t] }); el0.dispatchEvent(e); return e.defaultPrevented; };
        let prevented = fire('touchstart', pts[0][0], pts[0][1]), pm = 0;
        for (let i = 1; i < pts.length; i++) { if (fire('touchmove', pts[i][0], pts[i][1])) pm++; await sl(16); }
        const last = pts[pts.length - 1]; fire('touchend', last[0], last[1]);
        return { movesPrevented: pm, target: el0 && el0.className };
    }, pts);
    const line = (x, y, dx, dy, n) => Array.from({ length: n + 1 }, (_, i) => [x + dx * i / n, y + dy * i / n]);

    /* A: mouse drag on the top bar, long -> back to the companion card */
    out.A_open = await openLook();
    await P.screenshot({ path: SHOT + '/look-' + name + '.png' });
    let b = await panelBox();
    await P.mouse.move(b.l + b.w / 2, b.t + 20); await P.mouse.down();
    for (let i = 1; i <= 14; i++) { await P.mouse.move(b.l + b.w / 2, b.t + 20 + i * 20); await sleep(16); }
    await P.screenshot({ path: SHOT + '/look-drag-' + name + '.png' });
    out.A_midDragTransform = await P.evaluate(() => document.querySelector('.cf-ov .cf-panel').style.transform);
    await P.mouse.up(); await sleep(700); out.A_after = await state();
    /* B: short mouse pull springs back */
    await openLook(); b = await panelBox();
    await P.mouse.move(b.l + b.w / 2, b.t + 20); await P.mouse.down();
    for (let i = 1; i <= 4; i++) { await P.mouse.move(b.l + b.w / 2, b.t + 20 + i * 10); await sleep(60); }
    await P.mouse.up(); await sleep(500); out.B_short = Object.assign(await state(), { transform: await P.evaluate(() => { const p = document.querySelector('.cf-ov .cf-panel'); return p ? p.style.transform : 'gone'; }) });
    /* C: touch pull down in the list at scrollTop 0 -> back */
    b = await panelBox(); out.C_scrollable = b.sh > b.ch;
    out.C_touch = await touch(line(b.sx, b.sy, 0, 260, 14)); out.C_tf = await P.evaluate(() => { const p = document.querySelector('.cf-ov .cf-panel'); return p ? p.style.transform + ' / ' + p.style.transition : 'gone'; }); await sleep(900); out.C_after = await state();
    /* D: list scrolled down: a touch pull down does not close (the list scrolls instead) */
    await openLook(); await P.evaluate(() => { document.querySelector('.cf-ov .cf-scroll').scrollTop = 200; }); await sleep(100); b = await panelBox();
    out.D_scrollTop = b.st; out.D_touch = await touch(line(b.sx, b.sy, 0, 160, 10)); await sleep(500); out.D_after = await state();
    /* D2: touch swipe up never claimed (list keeps scrolling) */
    await P.evaluate(() => { document.querySelector('.cf-ov .cf-scroll').scrollTop = 0; }); b = await panelBox();
    out.D2_touchUp = await touch(line(b.sx, b.sy + 100, 0, -160, 10)); await sleep(300); out.D2_after = await state();
    /* E: left edge swipe right (touch) -> back */
    b = await panelBox();
    out.E_touch = await touch(line(b.l + 8, b.t + b.h / 2, 220, 6, 12)); await sleep(700); out.E_after = await state();
    /* F: mouse edge swipe from opened-direct (no card under) -> closed */
    await P.evaluate(async () => { try { LowiR2.closeAll(); } catch (e) { } await new Promise(r => setTimeout(r, 300)); LowiCompanion.open(); await new Promise(r => setTimeout(r, 800)); });
    b = await panelBox(); await P.mouse.move(b.l + 6, b.t + b.h / 2); await P.mouse.down();
    for (let i = 1; i <= 10; i++) { await P.mouse.move(b.l + 6 + i * 22, b.t + b.h / 2); await sleep(16); }
    await P.mouse.up(); await sleep(700); out.F_after = await state();
    /* G: the X still closes */
    await openLook(); out.G_x = await P.evaluate(async () => { const x = document.getElementById('lwBX') && getComputedStyle(document.getElementById('lwBX')).display !== 'none' ? document.getElementById('lwBX') : document.querySelector('.cf-ov .cf-x'); x.click(); await new Promise(r => setTimeout(r, 700)); return !document.querySelector('.cf-ov'); });

    /* Day recap: seeded with a real-looking day */
    await P.evaluate(({ DAYK, t0 }) => {
        try { LowiR2.closeAll(); } catch (e) { }
        S.logs = (S.logs || []).filter(l => l.day !== DAYK).concat([
            { ts: t0 - 6 * 3600e3, day: DAYK, t: 'Quark mit Beeren und Mandeln', lvl: 'low' }, { ts: t0 - 2 * 3600e3, day: DAYK, t: 'Salat mit H\u00e4hnchen', lvl: 'low' }, { ts: t0, day: DAYK, t: 'Etwas Unbekanntes', r: 'unknown' }]);
        const F = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); F.water = Object.assign({}, F.water, { [DAYK]: 4 }); localStorage.setItem('lowi_fast_v1', JSON.stringify(F));
    }, { DAYK, t0 });
    await sleep(400);
    out.recap = await P.evaluate(async () => {
        LowiDayRecap.open(); await new Promise(r => setTimeout(r, 2800));
        const ov = document.querySelector('.drc-ov.on') || document.querySelector('.drc-ov');
        if (!ov) return 'none';
        const bad = [...ov.querySelectorAll('*')].filter(e => e.children.length === 0 && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').map(e => e.className + ':' + e.textContent.slice(0, 30));
        const sheet = ov.querySelector('.r2-sh') || ov; const sideways = sheet.scrollWidth > sheet.clientWidth + 1;
        /* broken words: a word split across lines inside one text node */
        const split = []; const tw = document.createTreeWalker(ov, NodeFilter.SHOW_TEXT); let n;
        while ((n = tw.nextNode())) { const s = n.textContent; const re = /\S+/g; let m; while ((m = re.exec(s))) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); if (r.getClientRects().length > 1 && !/[-\u2013\u2014\/·]/.test(m[0])) split.push(m[0]); } }
        return { text: ov.innerText.slice(0, 2200), clipped: bad.slice(0, 5), sideways, split: split.slice(0, 8), placeholders: /undefined|NaN|\{\w+\}/.test(ov.innerText) };
    });
    await P.screenshot({ path: SHOT + '/recap-' + name + '.png', fullPage: false });
    out.errors = h.errors.slice(0, 5);
    console.log(JSON.stringify(out, null, 1));
    await h.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
