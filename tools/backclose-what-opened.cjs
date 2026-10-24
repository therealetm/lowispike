'use strict';
/* What does a Home gesture leave on screen? Prints the open layers / html classes / toasts right after it, then after back.
   node tools/backclose-what-opened.cjs [url]   (Chromium 390x844, fake cloud) */
const H = require('./sim/harness.cjs');
const url = process.argv[2] || 'https://therealetm.github.io/lowispike/index.html';
const S = () => ({
    html: document.documentElement.className.split(/\s+/).filter(Boolean).sort(),
    modals: [...document.querySelectorAll('[aria-modal="true"],[role="dialog"],dialog[open]')].filter(e => e.getBoundingClientRect().height > 2).map(e => e.id || String(e.className).split(' ')[0]),
    live: [...document.querySelectorAll('[role=status],[aria-live],.toast,[class*=toast]')].filter(e => e.getBoundingClientRect().height > 2 && (e.textContent || '').trim()).map(e => (e.id || String(e.className).split(' ')[0]) + ': ' + e.textContent.trim().slice(0, 60)),
    today: [...document.querySelectorAll('.wh-today, #whToday, [data-orbit="today"]')].map(e => (e.id || e.className) + ' ' + JSON.stringify(e.getBoundingClientRect())),
    hist: history.length, state: JSON.stringify(history.state),
});
(async () => {
    const R = await H.open({ engine: 'chromium', viewport: { width: 390, height: 844 }, members: 12, messages: 30, probe: false, lang: 'en', url });
    const P = R.page; await R.goto(); await H.sleep(10000);
    await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
    await P.touchscreen.tap(8, 420); await H.sleep(800);
    const b = await P.evaluate(S); console.log('BASE', JSON.stringify(b));
    const hold = sel => P.evaluate(async sel => { const e = document.querySelector(sel); if (!e) return 'none'; const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y) || e; const pe = ty => t.dispatchEvent(new PointerEvent(ty, { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, buttons: ty === 'pointerup' ? 0 : 1 })); pe('pointerdown'); await new Promise(r => setTimeout(r, 900)); pe('pointerup'); return t.id || t.className; }, sel);
    console.log('hold water ->', await hold('[data-orbit="water"]')); await H.sleep(1400);
    const a = await P.evaluate(S); console.log('AFTER', JSON.stringify({ added: a.html.filter(c => !b.html.includes(c)), gone: b.html.filter(c => !a.html.includes(c)), modals: a.modals, live: a.live, hist: a.hist, state: a.state, today: a.today }));
    await R.close();
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
