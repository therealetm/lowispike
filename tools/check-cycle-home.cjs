/* Check (Oct 24 2026, cycle on Home) for simulated WebKit, no long-press gestures (headless WebKit crashes on held mouse
   presses): tracking off -> no ring, no section in Misty's card; tracking on with a first day 7 days ago -> day 8, a mint (Grow)
   ring on #spBubble with its screen reader description, a "Your cycle" section under Misty's doors whose tap opens My cycle,
   and a plain tap on Gap still opens the Gap page. URL=... DEVICE=... ENGINE=webkit|chromium. */
const H = require('./sim/harness.cjs');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/cycle-home';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
    const R = await H.open({ engine: process.env.ENGINE || 'webkit', url: process.env.URL || '', probe: false, device: process.env.DEVICE || 'iPhone 13' });
    const p = R.page, out = { device: process.env.DEVICE || 'iPhone 13' };
    const st = () => p.evaluate(() => {
        const b = document.getElementById('spBubble'), r = b && b.querySelector('.cyh-ring'), d = document.getElementById('cyhDesc');
        const hub = Array.from(document.querySelectorAll('#mistyHub')).pop(), sec = hub && hub.querySelector('.cyh-hub-b'), doors = hub && hub.querySelector('.mh-doors');
        return { ring: r ? { ph: r.getAttribute('data-ph'), color: getComputedStyle(r).borderTopColor, w: Math.round(r.getBoundingClientRect().width), bw: Math.round(b.getBoundingClientRect().width), op: getComputedStyle(r).opacity, aria: r.getAttribute('aria-hidden') } : null,
            desc: d ? { txt: d.textContent, linked: (b.getAttribute('aria-describedby') || '').split(' ').includes('cyhDesc') } : null,
            hub: document.querySelectorAll('#mistyHub').length, sec: sec ? { txt: sec.textContent.replace(/\s+/g, ' ').trim(), underDoors: !!(doors && doors.nextElementSibling && doors.nextElementSibling.contains(sec)) } : null,
            cycle: !!(window.LowiCycleWorld && LowiCycleWorld.isOpen()), gap: !!(window.LowiGapView && LowiGapView.isOpen()) };
    });
    try {
        await R.goto(); await H.sleep(+(process.env.WAIT || 9000));
        out.build = await p.evaluate(() => (document.querySelector('meta[name=lowi-build]') || {}).content);
        for (const on of (process.env.ONLY === 'on' ? [true] : [false, true])) {
            const tag = on ? 'on' : 'off';
            out[tag + '.setup'] = await p.evaluate(on => { const s = LowiR2.S(); s.user.gender = on ? 'f' : 'm'; delete s.health.cyc; if (on) { LowiCycle.setShow(true); const d = new Date(); d.setDate(d.getDate() - 7); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); LowiCycle.markStart(k); } else LowiCycle.setShow(false); const m = LowiCycle.model(); return { on: LowiCycle.enabled(), day: m && m.day, ph: m && m.ph }; }, on);
            await H.sleep(3200);
            out[tag + '.home'] = await st(); await R.shot(OUT + '/' + tag + '-home.png');
            await p.evaluate(() => document.getElementById('spFast').click()); await H.sleep(1500);
            out[tag + '.gapTap'] = (await st()).gap; await p.evaluate(() => { try { LowiGapView.close(); } catch (e) { } }); await H.sleep(1000);
            await p.evaluate(() => LowiMistyHub.open()); await H.sleep(1600);
            out[tag + '.card'] = await st(); await R.shot(OUT + '/' + tag + '-card.png');
            if (on) { if ((process.env.ENGINE || 'webkit') === 'chromium') { const b = await p.evaluate(() => { const e = Array.from(document.querySelectorAll('#mistyHub .cyh-hub-b')).pop(); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }); await H.sleep(500); await p.mouse.click(b.x, b.y); out.tapped = 'real pointer tap'; }
                else { await p.evaluate(() => LowiCycleWorld.hubOpen()); out.tapped = 'hubOpen() called (headless WebKit crashes on any click in Misty\'s card)'; } await H.sleep(1800); out[tag + '.sectionTap'] = await st(); await R.shot(OUT + '/' + tag + '-cycle.png'); }
            await p.evaluate(() => { try { LowiCycleWorld.close(); } catch (e) { } try { LowiMistyHub.close(); } catch (e) { } }); await H.sleep(1200);
        }
        out.errs = R.errs.slice(0, 5);
    } catch (e) { out.err = String(e && e.stack || e).slice(0, 400); }
    console.log(JSON.stringify(out));
    await R.close();
})();
