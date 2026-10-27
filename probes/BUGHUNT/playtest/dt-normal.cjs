/* BH-060 regression: the screens that now spend their closing tap must still close normally:
   one tap, Escape, tap outside (where the screen allows it), keyboard Enter, and a SLOW 2nd tap (700 ms) still reaches what is under. */
const D = require('./dt-lib.cjs');
const ONLY = process.argv[3];
const CASES0 = [
    ['installGuide', 'LowiIG.open()', '.ig-b.pri', () => !document.querySelector('.ig-ov:not(.off)') && !document.querySelector('[class*="ig-ov"]:not(.off):not(.ig-ovx)')],
    ['settingsRing Look & sound', 'LowiHomeSettingsSleepV2.open("settings")', '.ss2-chip|Look', null],
    ['moveFinish', 'LowiMoveFinish.celebrate({min:12,xp:20,lang:"en"})', '.mf-go', null],
    ['quickTour', 'LowiQuickTour.open()', '.qt-skip', null],
];
const CASES = CASES0.filter(c => !ONLY || c[0].startsWith(ONLY));
(async () => {
    const h = await D.boot(process.argv[2] || 'chromium390');
    for (let i = 0; i < 30 && !(await h.page.evaluate(() => !!window.LowiHomeSettingsSleepV2 && !!window.LowiIG)); i++) await D.sleep(500);
    const p = h.page;
    const dialogs = () => p.evaluate(() => [...document.querySelectorAll('[role=dialog],[aria-modal=true]')].filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 40 && r.height > 40 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 && e.getAttribute('aria-hidden') !== 'true'; }).length);
    const settle = () => D.sleep(1300);
    const home = async () => { for (let i = 0; i < 4; i++) { await p.keyboard.press('Escape'); await D.sleep(250); } await settle(); };
    await home();
    const base = await dialogs();
    for (const [name, open, btnSel] of CASES) {
        const row = [];
        /* 1. one plain tap on the button */
        await p.evaluate(open); await settle();
        const opened = await dialogs();
        const [bs, bt] = btnSel.split('|'); let b = await D.at(h, bs, bt);
        if (!b) { console.log(name, 'button not found'); await home(); continue; }
        await D.tapAt(h, b.x, b.y, Date.now() / 1000); await settle();
        row.push('tap: dialogs ' + opened + '->' + (await dialogs()) + ' top=' + JSON.stringify(await p.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog]')].pop(); return (d ? (d.getAttribute('aria-label') || d.className || '').toString().slice(0, 24) : '-') + ' kinds=' + [...document.querySelectorAll('[data-kind]')].map(e => e.getAttribute('data-kind')).join(','); })));
        await home();
        /* 2. Escape */
        await p.evaluate(open); await settle();
        await p.keyboard.press('Escape'); await settle();
        row.push('Escape:' + (await dialogs() <= base ? 'closed' : 'STILL OPEN'));
        await home();
        /* 3. tap outside (top-left corner) */
        await p.evaluate(open); await settle();
        await D.tapAt(h, 12, 60, Date.now() / 1000); await settle();
        row.push('outside:' + (await dialogs() <= base ? 'closed' : 'stays (modal)'));
        await home();
        /* 4. keyboard Enter on the button */
        await p.evaluate(open); await settle();
        await p.evaluate(([s, t]) => { const e = [...document.querySelectorAll(s)].find(x => !t || (x.textContent || '').includes(t)); e && e.focus(); }, [bs, bt]);
        await p.keyboard.press('Enter'); await settle();
        row.push('Enter: dialogs ' + opened + '->' + (await dialogs()));
        await home();
        /* 5. slow 2nd tap (700 ms) on the same spot reaches what is under */
        await p.evaluate(open); await settle();
        b = await D.at(h, bs, bt);
        await p.evaluate(() => { window.__got = []; });
        const t0 = Date.now() / 1000;
        await D.tapAt(h, b.x, b.y, t0); await D.sleep(750);
        await D.tapAt(h, b.x + 1, b.y + 1, t0 + 0.7); await D.sleep(500);
        const got = await p.evaluate(() => (window.__got || []).splice(0));
        row.push('slow2nd:' + got.length + ' clicks ' + JSON.stringify(got.map(g => g.el).slice(0, 2)));
        await home();
        console.log(name.padEnd(26), row.join(' | '));
    }
    console.log('errors', JSON.stringify(h.log.pageerror.slice(0, 5)));
    await h.browser.close(); h.srv.close();
})().catch(e => { console.error(e); process.exit(1); });
