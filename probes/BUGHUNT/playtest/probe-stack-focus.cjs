'use strict';
/* Run 17: keyboard focus after a stacked sheet closes (hub card -> Glow sheet -> close Glow -> Escape should close the hub),
   and after the hub repaints itself (mood tap) -> Escape should still close it.
   usage: node probe-stack-focus.cjs --root <dir> | --url <live>  [--view chromium390|iphone13|ipadL] */
const L = require('./lib.cjs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
    let srv = null, url = arg('url', '');
    if (!url) { srv = await L.serve(path.resolve(arg('root', '.'))); url = `http://127.0.0.1:${srv.address().port}/index.html`; }
    const h = await L.open({ url, view: arg('view', 'chromium390'), settle: 6000 });
    const P = h.page, out = {};
    const st = () => P.evaluate(() => ({ hub: !!document.querySelector('#mistyHub'), glow: !![...document.querySelectorAll('#whMs')].find(e => !e.closest('.r2-ov.off')), top: (window.LowiR2 && LowiR2.top() && LowiR2.top().className) || '', ovs: [...document.querySelectorAll('.r2-ov')].map(o => o.className.replace('r2-ov ', '') + '{' + [...o.querySelectorAll('[id]')].slice(0, 3).map(e => e.id).join(',') + '}'), ae: (document.activeElement && (document.activeElement.id || document.activeElement.className || document.activeElement.tagName)) + '' }));
    const esc = async () => { await P.keyboard.press('Escape'); await L.sleep(900); };
    // A: hub -> Glow -> Escape (closes Glow) -> Escape (should close hub)
    await P.evaluate(() => LowiMistyHub.open()); await L.sleep(1500);
    await P.evaluate(() => { const b = [...document.querySelectorAll('#mistyHub')].find(e => !e.closest('.r2-ov.off')).querySelector('[data-mh=glow]'); b && b.focus(); b && b.click(); }); await L.sleep(1500);
    out.A_glowOpen = await st();
    await esc(); out.A_afterEsc1 = await st();
    await esc(); out.A_afterEsc2 = await st();
    await esc(); out.A_afterEsc3 = await st();
    // B: hub -> Glow -> pick an aura (repaints hub under it) -> X close Glow -> Escape
    if (out.A_afterEsc3.hub) { await P.evaluate(() => LowiR2.closeAll()); await L.sleep(900); }
    await P.evaluate(() => LowiMistyHub.open()); await L.sleep(1500);
    await P.evaluate(() => { const b = [...document.querySelectorAll('#mistyHub')].find(e => !e.closest('.r2-ov.off')).querySelector('[data-mh=glow]'); b && b.focus(); b && b.click(); }); await L.sleep(1500);
    await P.evaluate(() => { const a = document.querySelector('#whMs [data-wh="aura"], #whMs [data-id]'); a && a.click(); }); await L.sleep(800);
    out.B_afterAura = await st();
    await P.evaluate(() => { const x = LowiR2.top() && LowiR2.top().querySelector('.r2-x'); window.__xov = LowiR2.top() && LowiR2.top().className; x && x.focus(); x && x.click(); }); await L.sleep(1200);
    out.B_xWasOn = await P.evaluate(() => window.__xov);
    out.B_afterX = await st();
    await esc(); out.B_afterEsc = await st();
    // C: hub -> tap a mood (hub repaints) -> Escape
    if (out.B_afterEsc.hub) { await P.evaluate(() => LowiR2.closeAll()); await L.sleep(900); }
    await P.evaluate(() => LowiMistyHub.open()); await L.sleep(1500);
    await P.evaluate(() => { const b = [...document.querySelectorAll('#mistyHub')].find(e => !e.closest('.r2-ov.off')).querySelector('[data-mh=mood]'); b && b.focus(); b && b.click(); }); await L.sleep(800);
    out.C_afterMood = await st();
    await esc(); out.C_afterEsc = await st();
    // D: close the card, hold Misty again at once (card still sliding away) -> a card must be open
    await P.evaluate(() => LowiR2.closeAll()); await L.sleep(1500);
    await P.evaluate(() => LowiMistyHub.open()); await L.sleep(1500);
    await P.evaluate(() => { LowiR2.close(); setTimeout(() => LowiMistyHub.open(), 60); }); await L.sleep(3500);
    out.D_reopen = await st();
    // E: Glow closed then tapped again at once
    await P.evaluate(() => { const b = [...document.querySelectorAll('#mistyHub')].find(e => !e.closest('.r2-ov.off')).querySelector('[data-mh=glow]'); b && b.click(); }); await L.sleep(1500);
    await P.evaluate(() => { LowiR2.close(); setTimeout(() => { const b = [...document.querySelectorAll('#mistyHub [data-mh=glow]')].pop(); b && b.click(); }, 60); }); await L.sleep(3500);
    out.E_reglow = await st();
    const B = await L.snap(h); out.errors = B.err.concat(B.rej).slice(0, 5);
    out.pass = !out.A_afterEsc2.top && !out.B_afterEsc.top && !out.C_afterEsc.top && out.C_afterMood.ae !== 'BODY' && /mh-ov/.test(out.D_reopen.top) && out.E_reglow.glow && !/off/.test(out.E_reglow.ovs.join());
    console.log(JSON.stringify(out, null, 1));
    await h.browser.close(); srv && srv.close();
})().catch(e => { console.error('PROBE FAIL', e); process.exit(1); });
