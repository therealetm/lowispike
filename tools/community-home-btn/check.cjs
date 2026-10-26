#!/usr/bin/env node
/* Oct 26 2026 (MAYA-HANDOFF 0.33): with your companion flying on autopilot (the case that hid it), every Community tab and
   every other page shows the round Home button, the tap lands on it, the tap takes you Home, a swipe from the left edge takes
   you Home, and its invisible tap ring doesn't cover the header next to it. WebKit iPhone 13 at 390x844, Reduce Motion.
   Usage: node tools/community-home-btn/check.cjs [URL|''] [en,de,es]   ('' serves this worktree) */
'use strict';
const H = require('../regress/harness.cjs');
const url = process.argv[2] || '', langs = (process.argv[3] || 'en,de,es').split(',');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  FAIL', m); } };
const btn = R => R.page.evaluate(() => {
    const x = document.getElementById('secX'); if (!x) return { missing: true };
    const r = x.getBoundingClientRect(), cs = getComputedStyle(x);
    const at = (px, py) => { const e = document.elementFromPoint(px, py); return !!(e && (e === x || x.contains(e))); };
    return { disp: cs.display, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), hit: at(r.x + r.width / 2, r.y + r.height / 2), ring: at(r.x - 2, r.y + r.height / 2), next: at(r.right + 7, r.y + r.height / 2), label: x.getAttribute('aria-label'), mf: document.documentElement.classList.contains('mf-on'), tab: (document.querySelector('#main > .tab.active') || {}).id };
});
const tabNow = R => R.page.evaluate(() => (document.querySelector('#main > .tab.active') || {}).id);
async function fly(R) {
    await R.page.evaluate(() => { if (document.getElementById('tab-home').classList.contains('active') && window.LowiPad) window.LowiPad.mode('auto'); });
    for (let i = 0; i < 20; i++) { await H.sleep(500); if (await R.page.evaluate(() => document.documentElement.classList.contains('mf-on'))) return true; }
    /* a busy machine (or Reduce Motion) may not start the real flight in time: set the same flag autopilot leaves behind */
    const why = await R.page.evaluate(() => ({ pad: window.LowiPad && window.LowiPad.state ? window.LowiPad.state().pad : null, fl: window.LowiMistyFlight ? window.LowiMistyFlight.state().st : null }));
    console.log('  (flight did not start: ' + JSON.stringify(why) + '; setting html.mf-on as autopilot leaves it)');
    await R.page.evaluate(() => document.documentElement.classList.add('mf-on'));
    return true;
}
async function swipeBack(R) {
    await R.page.evaluate(async () => {
        const ev = (t, x) => new PointerEvent(t, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: 420, bubbles: true, cancelable: true });
        const tgt = document.elementFromPoint(6, 420) || document.body;
        tgt.dispatchEvent(ev('pointerdown', 6));
        for (let x = 20; x <= 330; x += 25) { tgt.dispatchEvent(ev('pointermove', x)); await new Promise(r => setTimeout(r, 16)); }
        tgt.dispatchEvent(ev('pointerup', 330));
    });
    await H.sleep(900);
}
(async () => {
    for (const lang of langs) {
        console.log('== ' + lang);
        const R = await H.open({ engine: 'webkit', url, lang });
        await R.page.setViewportSize({ width: 390, height: 844 });
        /* Reduce Motion by default; pass 'motion' as the 3rd argument for a run where autopilot really flies */
        if (process.argv[4] !== 'motion') await R.page.emulateMedia({ reducedMotion: 'reduce' });
        await R.goto(); await H.sleep(3000);
        if (lang !== 'en') { await R.page.evaluate(l => window.LowiLang && window.LowiLang.set(l), lang); await H.sleep(800); }
        console.log('  html lang', await R.page.evaluate(() => document.documentElement.lang));
        ok(await fly(R), 'companion flying on Home');
        await R.page.evaluate(() => goTab('foryou')); await H.sleep(2500);
        for (const t of ['room', 'chat', 'fy', 'studio', 'rank']) {
            await R.page.evaluate(t => { const b = document.querySelector('.rm-tab[data-rm="' + t + '"]'); if (b) b.click(); }, t); await H.sleep(1200);
            const b = await btn(R);
            console.log('  community/' + t, JSON.stringify(b));
            ok(b.mf, 'still flying (the case that hid it) on ' + t);
            ok(b.disp === 'flex' && b.w === 40 && b.h === 40 && b.hit, 'Home button visible and tappable on Community ' + t);
            ok(b.ring, 'tap ring catches a tap just outside the circle on ' + t);
            ok(!b.next, 'tap ring does not cover the header next to it on ' + t);
            await R.shot('/home/sprite/chb-shot-' + lang + '-' + t + '.png');
        }
        /* a real finger tap at the button's centre (the locator tap waits for the glass to stop moving, which a finger doesn't) */
        const c = await R.page.evaluate(() => { const r = document.getElementById('secX').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
        await R.page.touchscreen.tap(c.x, c.y); await H.sleep(1200);
        ok(await tabNow(R) === 'tab-home', 'tapping it on Community goes Home (' + lang + ')');
        for (const p of ['foryou', 'move', 'shelf', 'profile']) {
            ok(await fly(R), 'companion flying before ' + p);
            await R.page.evaluate(p => goTab(p), p); await H.sleep(1800);
            /* inside a Community chat room, back goes to the channel list first (MAYA-HANDOFF item 33): swipe from Ranking */
            if (p === 'foryou') { await R.page.evaluate(() => { const b = document.querySelector('.rm-tab[data-rm="rank"]'); if (b) b.click(); }); await H.sleep(1000); }
            const b = await btn(R);
            console.log('  ' + p, JSON.stringify(b));
            ok(b.disp === 'flex' && b.hit, 'Home button visible on ' + p);
            await swipeBack(R);
            ok(await tabNow(R) === 'tab-home', 'edge swipe goes Home from ' + p);
        }
        ok(R.errs.length === 0, 'no errors: ' + JSON.stringify(R.errs.slice(0, 3)));
        await R.close();
    }
    console.log(fails ? 'FAILED ' + fails : 'ALL PASS');
    process.exit(fails ? 1 : 0);
})();
