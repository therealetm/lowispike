/* Probe: start a Move session, then leave it the ways a user can (Escape, phone back, side swipe): does the player stay
   on top of the next tab?  node tools/sweep-buttons-playerprobe.cjs [url|root] [startText] */
'use strict';
const H = require('./sim/harness.cjs');
const [where = 'https://therealetm.github.io/lowispike/index.html', start = 'Desk Spike'] = process.argv.slice(2);
(async () => {
    const o = { engine: 'chromium', viewport: { width: 390, height: 844 } }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o); const P = R.page; const out = {};
    const st = () => P.evaluate(() => { const p = document.getElementById('mv-player'); const tab = (document.querySelector('.tab.active') || {}).id; if (!p) return { tab, player: null }; const r = p.getBoundingClientRect(), s = getComputedStyle(p); let op = 1, shown = true; for (let e = p; e && e.nodeType === 1; e = e.parentElement) { const t = getComputedStyle(e); op *= +t.opacity; if (t.display === 'none' || t.visibility === 'hidden') shown = false; } const top = document.elementFromPoint(195, 400); return { tab, shown: shown && op > .05 && r.height > 0, inTab: !!p.closest('.tab') && p.closest('.tab').id, pos: s.position, h: Math.round(r.height), done: !!p.querySelector('.mv-done'), txt: p.textContent.trim().replace(/\s+/g, ' ').slice(0, 90), topAt400: top ? String(top.className).split(' ')[0] : null, buttons: [...p.querySelectorAll('button')].map(b => (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 25)).slice(0, 8) }; });
    const startIt = async () => { await P.evaluate(() => window.goTab('move')); await H.sleep(3000); const pt = await P.evaluate(t => { const b = [...document.querySelectorAll('#tab-move button')].find(x => (x.getAttribute('aria-label') || x.textContent).includes(t)); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, start); if (!pt) return false; await H.sleep(400); const p2 = await P.evaluate(t => { const b = [...document.querySelectorAll('#tab-move button')].find(x => (x.getAttribute('aria-label') || x.textContent).includes(t)); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, start); await P.touchscreen.tap(p2.x, p2.y); await H.sleep(2500); return true; };
    try {
        await R.goto(); await H.sleep(5000);
        out.started = await startIt(); out.running = await st();
        await P.keyboard.press('Escape'); await H.sleep(1500); out.afterEscape = await st();
        await P.evaluate(() => history.back()); await H.sleep(2000); out.afterBack = await st();
        await P.evaluate(() => window.LowiSections && window.LowiSections.back && window.LowiSections.back()); await H.sleep(2000); out.afterSectionsBack = await st();
        // side swipe (page drag) from the middle to the left
        await P.evaluate(() => { const fire = (type, x) => { const t = new Touch({ identifier: 1, target: document.elementFromPoint(300, 500) || document.body, clientX: x, clientY: 500 }); (document.elementFromPoint(300, 500) || document.body).dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true })); }; });
        const m = await P.evaluate(() => { const e = document.elementFromPoint(300, 500); return e ? String(e.className).slice(0, 30) : null; }); out.swipeTarget = m;
        await P.mouse.move(340, 500); await P.mouse.down(); for (let x = 340; x > 40; x -= 30) { await P.mouse.move(x, 500); await H.sleep(16); } await P.mouse.up(); await H.sleep(2500); out.afterSwipe = await st();
        await P.evaluate(() => window.goTab('shelf')); await H.sleep(3500); out.afterGoTabShelf = await st();
    } catch (e) { out.broken = e.message; }
    out.errs = R.errs.map(e => e.m.slice(0, 150));
    console.log(JSON.stringify(out, null, 1)); await R.close(); process.exit(0);
})();
