'use strict';
/* Where Mirror mode really is (Nov 5 2026): tap the Move bubble on Home, list what blooms; hold it, see which page opens;
   list the Move page's own entries (Mirror card, workouts) and any text cut off at the edges. Chromium, phone size, touch. */
const { launch, openApp, sleep, existingSeed } = require('../interface-audit/lib.cjs');
(async () => {
    const h = await launch({ engine: 'chromium', seed: existingSeed({ lang: 'en', kv: { 'lowispike.lang': 'en' } }), lang: 'en', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const P = h.page; await openApp(h, { settle: 6000 });
    const out = {};
    out.bubble = await P.evaluate(() => { const b = document.querySelector('#whHud .wh-move'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: b.getAttribute('aria-label') || b.textContent.trim().slice(0, 60) }; });
    if (out.bubble) {
        await P.touchscreen.tap(out.bubble.x, out.bubble.y); await sleep(1200);
        out.bloom = await P.evaluate(() => [...document.querySelectorAll('.wm-orb, .hb-orb, [data-wm]')].filter(e => e.getBoundingClientRect().width).map(e => (e.dataset.wm || '') + ':' + e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)));
        await P.keyboard.press('Escape'); await sleep(400); await P.mouse.click(5, 420); await sleep(800);
        /* hold: a touch held for 700 ms via CDP */
        const c = await P.context().newCDPSession(P);
        const pt = [{ x: out.bubble.x, y: out.bubble.y }];
        await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt }); await sleep(750);
        await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(1500);
        out.afterHold = await P.evaluate(() => (document.querySelector('#main > .tab.active') || {}).id);
    }
    if (out.afterHold !== 'tab-move') { await P.evaluate(() => window.LowiMoveBubble && LowiMoveBubble.page()); await sleep(1500); }
    out.page = await P.evaluate(() => {
        const m = document.getElementById('tab-move'); if (!m) return null;
        const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const heads = [...m.querySelectorAll('h1,h2,h3,b,strong,.mv-title,[class*=title]')].filter(vis).map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 30);
        const cut = [...m.querySelectorAll('*')].filter(e => vis(e) && e.children.length === 0 && e.textContent.trim().length > 2).filter(e => { const r = e.getBoundingClientRect(); return e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible' || r.left < -1 || r.right > innerWidth + 1; }).map(e => { const r = e.getBoundingClientRect(); return e.textContent.trim().slice(0, 40) + ' [' + Math.round(r.left) + '..' + Math.round(r.right) + ' sw' + e.scrollWidth + '/cw' + e.clientWidth + ']'; }).slice(0, 15);
        const bed = [...m.querySelectorAll('*')].filter(e => e.children.length === 0 && /In-Bed/.test(e.textContent)).map(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return { t: e.textContent.trim(), l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), sw: e.scrollWidth, cw: e.clientWidth, ov: s.overflow, to: s.textOverflow, ws: s.whiteSpace, dir: s.direction, ta: s.textAlign, pl: (e.parentElement && Math.round(e.parentElement.getBoundingClientRect().left)) + '..' + (e.parentElement && Math.round(e.parentElement.getBoundingClientRect().right)) }; });
        const mirror = [...m.querySelectorAll('button,[role=button],a')].filter(vis).map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(t => /mirror/i.test(t)).slice(0, 5);
        const guess = m.querySelector('.wm-guess-row'); return { heads, cut, bed, mirror, guess: guess ? { hidden: guess.hidden, text: guess.textContent } : null, bg: getComputedStyle(m).backgroundImage.slice(0, 80), bgc: getComputedStyle(m).backgroundColor, still: document.documentElement.classList.contains('wb-mvstill') };
    });
    console.log(JSON.stringify(out, null, 1)); console.log('errors', JSON.stringify(h.errors.slice(0, 6)));
    await h.browser.close();
})().catch(e => { console.error(e); process.exit(2); });
