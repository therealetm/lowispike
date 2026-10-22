/* Aura shop: one close-up per animated aura (Misty's sheet stage) + Home Misty wearing each, for the report.
   node tools/sim/aura-shop-shots.cjs [outdir] [theme] */
'use strict';
const H = require('./harness.cjs'), fs = require('fs');
const [out = '/tmp/aura-shots', theme = 'dark'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
(async () => {
    const R = await H.open({ device: 'iPhone 13', probe: false });
    const P = R.page, log = [];
    await R.ctx.addInitScript(() => { try { localStorage.setItem('lowispike.sparks.v1', JSON.stringify({ own: ['ember', 'orbs', 'trail', 'electric', 'prism', 'galaxy'] })); } catch (e) { } });
    await R.goto(); await H.sleep(2500);
    await P.evaluate(t => { try { LowiR2.applyTheme && LowiR2.applyTheme(t); } catch (e) { } document.documentElement.setAttribute('data-theme', t); }, theme);
    for (const id of ['ember', 'orbs', 'trail', 'electric', 'prism', 'galaxy']) {
        await P.evaluate(id => { localStorage.setItem('lowispike.aura.v1', id); LowiWorldHome.openDetails('aura'); }, id);
        await P.waitForSelector('#whMs .wh-ms-stage', { timeout: 20000 }).catch(() => { }); await H.sleep(1600);
        const st = P.locator('#whMs .wh-ms-stage').first();
        await st.screenshot({ path: out + '/stage-' + id + '.png' }).catch(e => log.push(id + ' stage: ' + e.message.slice(0, 80)));
        await P.evaluate(() => LowiWorldHome.closeTop && LowiWorldHome.closeTop()); await H.sleep(1500);
        const b = await P.evaluate(() => { const e = document.getElementById('spBubble'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, fx: !!e.querySelector('.wh-fx') }; });
        if (b) { const m = b.w * 0.35; await P.screenshot({ path: out + '/home-' + id + '.png', clip: { x: Math.max(0, b.x - m), y: Math.max(0, b.y - m), width: b.w + 2 * m, height: b.h + 2 * m } }).catch(e => log.push(id + ' home: ' + e.message.slice(0, 80))); }
        log.push(id + ' home fx ' + (b && b.fx));
    }
    console.log(JSON.stringify({ log, errs: R.errs.map(e => e.m).filter(m => !/supabase|fetch/i.test(m)).slice(0, 5) }));
    await R.close(); process.exit(0);
})();
