/* Aura shop step 1 check: Misty's sheet -> Aura tab on one phone + theme. Sparks balance, 6 animated auras locked with a price,
   preview of one you can't afford (sparks still needed), preview + Unlock of one you can, XP / level unchanged after buying,
   the aura on Home Misty, nothing cut off or overflowing, no errors.
   node tools/sim/aura-shop-sim.cjs "iPhone 13" dark [outdir] [url] */
'use strict';
const H = require('./harness.cjs'), fs = require('fs');
const [dev = 'iPhone 13', theme = 'dark', out = '/tmp/aura-sim', url = '', lang = 'en'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const tag = dev.replace(/\s+/g, '') + '-' + theme + '-' + lang;
(async () => {
    const R = await H.open({ device: dev, url, lang, probe: false });
    const P = R.page, res = { dev, theme, lang, ok: [], bad: [] };
    const ok = (c, m) => (c ? res.ok : res.bad).push(m);
    try {
        await R.goto(); await H.sleep(2500);
        await P.evaluate(t => { try { LowiR2.applyTheme && LowiR2.applyTheme(t); } catch (e) { } document.documentElement.setAttribute('data-theme', t); }, theme);
        await P.evaluate(() => LowiWorldHome.openDetails('aura')); await P.waitForSelector('#whMs .wh-spk', { timeout: 20000 }); await H.sleep(900);
        const s0 = await P.evaluate(() => ({ xp: LowiR2.S().xp, lvl: (document.querySelector('#whMs .wh-ms-id small') || {}).textContent, spk: document.querySelector('.wh-spk b').textContent, cards: [...document.querySelectorAll('.wh-shop .wh-aura')].map(b => ({ id: b.dataset.id, st: b.className, price: b.querySelector('small').textContent, lock: !!b.querySelector('.wh-aura-orb > svg'), fx: !!b.querySelector('.wh-fx') })) }));
        ok(/2400/.test(s0.spk), 'balance shows 2400 sparks (back-fill = XP): ' + s0.spk);
        ok(s0.cards.length === 6 && s0.cards.every(c => /locked/.test(c.st) && c.lock && c.fx && /\d/.test(c.price)), '6 locked cards with lock, price and live effect');
        const fit = () => P.evaluate(() => { const bad = []; const ms = document.querySelector('#whMs'); const W = innerWidth; ms.querySelectorAll('b,small,button,p,h3').forEach(e => { const r = e.getBoundingClientRect(); if (!r.width) return; if (r.right > W + 1 || r.left < -1) bad.push('off-screen: ' + e.textContent.slice(0, 30)); if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible') bad.push('cut: ' + e.textContent.slice(0, 30)); }); return bad; });
        let f = await fit(); ok(!f.length, 'nothing cut off / off-screen on the Aura tab ' + f.join('; '));
        await P.evaluate(() => document.querySelector('.wh-spk').scrollIntoView({ block: 'start' })); await H.sleep(500);
        await R.shot(out + '/' + tag + '-1-shop.png');
        // can't afford: Galaxy 3000
        await R.tap('.wh-shop [data-id="galaxy"]'); await H.sleep(900);
        const g = await P.evaluate(() => { const pv = document.getElementById('whPv'); return pv && { need: (pv.querySelector('.wh-pv-need') || {}).textContent || '', dis: (pv.querySelector('.wh-pv-buy') || {}).getAttribute && pv.querySelector('.wh-pv-buy').getAttribute('aria-disabled'), fx: !!pv.querySelector('.wh-fx-galaxy'), inView: (() => { const r = pv.getBoundingClientRect(); return r.top >= -2 && r.top < innerHeight - 60; })() }; });
        ok(g && /600/.test(g.need) && g.dis === 'true' && g.fx, 'Galaxy preview: Misty wearing it, "600 more sparks", Unlock dimmed: ' + JSON.stringify(g));
        ok(g && g.inView, 'preview scrolled into view');
        await R.tap('.wh-pv-buy'); await H.sleep(500);
        const still = await P.evaluate(() => ({ own: JSON.parse(localStorage.getItem('lowispike.sparks.v1') || '{"own":[]}').own.length, xp: LowiR2.S().xp }));
        ok(still.own === 0 && still.xp === 2400, 'tapping Unlock without enough sparks buys nothing');
        await R.shot(out + '/' + tag + '-2-short.png');
        // can afford: Electric 1400
        await R.tap('.wh-shop [data-id="electric"]'); await H.sleep(900);
        const e1 = await P.evaluate(() => { const pv = document.getElementById('whPv'); return pv && { btn: pv.querySelector('.wh-pv-buy').textContent, dis: pv.querySelector('.wh-pv-buy').getAttribute('aria-disabled') }; });
        ok(e1 && /1400/.test(e1.btn) && !e1.dis, 'Electric preview: ' + (e1 && e1.btn));
        f = await fit(); ok(!f.length, 'preview fits ' + f.join('; '));
        await R.shot(out + '/' + tag + '-3-preview.png');
        await R.tap('.wh-pv-buy'); await H.sleep(1200);
        const s1 = await P.evaluate(() => ({ xp: LowiR2.S().xp, lvl: (document.querySelector('#whMs .wh-ms-id small') || {}).textContent, sparks: LowiWorldHome.sparks(), aura: LowiWorldHome.auraId(), fx: document.documentElement.dataset.whFx, bubble: !!document.querySelector('#spBubble > .wh-fx-electric'), card: (document.querySelector('.wh-shop [data-id="electric"]') || {}).getAttribute && document.querySelector('.wh-shop [data-id="electric"]').getAttribute('aria-checked'), spk: document.querySelector('.wh-spk b').textContent }));
        ok(s1.xp === 2400 && s1.lvl === s0.lvl, 'XP and level unchanged after buying: ' + s1.xp + ' / ' + s1.lvl);
        ok(s1.sparks === 1000 && /1000/.test(s1.spk), 'sparks 2400 -> 1000');
        ok(s1.aura === 'electric' && s1.fx === 'electric' && s1.card === 'true', 'Electric is on right away');
        ok(s1.bubble, 'Home Misty wears it (#spBubble .wh-fx-electric)');
        await R.shot(out + '/' + tag + '-4-bought.png');
        await P.evaluate(() => LowiWorldHome.closeTop && LowiWorldHome.closeTop()); await H.sleep(1500);
        const home = await P.evaluate(() => { const b = document.querySelector('#spBubble'), x = b && b.querySelector('.wh-fx'); if (!x) return null; const r = x.getBoundingClientRect(), s = getComputedStyle(x); return { w: Math.round(r.width), vis: s.display !== 'none' && s.visibility !== 'hidden' }; });
        ok(home && home.vis && home.w > 40, 'effect visible on Home Misty ' + JSON.stringify(home));
        await R.shot(out + '/' + tag + '-5-home.png');
        // reload: still owned and worn
        await R.goto(); await H.sleep(2500);
        const s2 = await P.evaluate(() => ({ aura: LowiWorldHome.auraId(), sparks: LowiWorldHome.sparks(), xp: LowiR2.S().xp }));
        ok(s2.aura === 'electric' && s2.sparks === 1000 && s2.xp === 2400, 'after reload: still Electric, 1000 sparks, 2400 XP');
    } catch (e) { res.bad.push('run error: ' + e.message.slice(0, 200)); }
    res.errs = R.errs.filter(x => !/supabase|Failed to fetch|NetworkError|Load failed/i.test(x.m)).map(x => x.m);
    if (res.errs.length) res.bad.push('page errors: ' + res.errs.slice(0, 3).join(' | '));
    console.log(JSON.stringify(res));
    await R.close(); process.exit(0);
})();
