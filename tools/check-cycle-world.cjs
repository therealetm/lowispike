/* Cycle tracking stage 1 check (Oct 23 2026): setup asks a woman "Track your cycle?", a man never sees it; after a yes the
   profile hub has My cycle, the cell world opens, logging a first day shows the phase. Runs on WebKit with an iPhone 13 and an
   iPad, local or live: URL=https://therealetm.github.io/lowispike/ node tools/check-cycle-world.cjs. Screenshots go to OUT. */
const H = require('./sim/harness.cjs');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/cycle-check';
fs.mkdirSync(OUT, { recursive: true });
const DEVICES = (process.env.DEVICES || 'iPhone 13,iPad Pro 11').split(',');
const ok = [], bad = [];
const check = (c, m) => { (c ? ok : bad).push(m); console.log((c ? 'PASS ' : 'FAIL ') + m); };

async function run(device, gender) {
    const tag = device.replace(/\W+/g, '') + '-' + gender;
    const R = await H.open({ engine: 'webkit', device, url: process.env.URL || '', probe: false });
    const p = R.page;
    const tap = async sel => { await p.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await H.sleep(250); await R.tapEl(p.locator(sel).first()); };
    try {
        await R.goto(); await H.sleep(7000);
        const vp = await p.evaluate(() => innerWidth + 'x' + innerHeight);
        if (gender === 'f') check(true, tag + ': viewport ' + vp + ', build ' + await p.evaluate(() => (document.querySelector('meta[name=lowi-build]') || {}).content));
        /* setup from the photo step (a resumed setup), then Use initial goes to About you */
        await p.evaluate(() => { const s = LowiR2.S(); s.user.gender = ''; delete (s.health || {}).cyc; s.setupDone = false; s.setupMid = 1; LowiBirthCompanion.has = () => true; LowiR2.onboard(); });
        await H.sleep(900);
        await tap('#r2ob [data-r2o="initial"]'); await H.sleep(900);
        await tap('#r2ob [data-r2g="' + gender + '"]'); await H.sleep(600);
        const q = await p.evaluate(() => ({ n: document.querySelectorAll('#r2ob [data-r2cy]').length, txt: (document.querySelector('#r2ob .r2-cyq') || {}).textContent || '' }));
        if (gender === 'f') check(q.n === 2 && /Track your cycle/.test(q.txt), tag + ': setup shows "' + q.txt.trim() + '" with Yes / No thanks');
        else check(q.n === 0, tag + ': setup has no cycle question');
        if (gender === 'f') {
            await tap('#r2ob [data-r2cy="1"]'); await H.sleep(300);
        }
        await R.shot(OUT + '/' + tag + '-1-setup.png');
        /* Next / Let's go, and Later on the shopping step if it comes */
        await tap('#r2ob [data-r2o="next"], #r2ob [data-r2o="finish"]'); await H.sleep(1200);
        if (await p.$('#r2ob [data-r2o="shoplater"]')) { await tap('#r2ob [data-r2o="shoplater"]'); await H.sleep(1200); }
        const st = await p.evaluate(() => { const s = LowiR2.S(); return { g: s.user.gender, show: s.health && s.health.cyc ? s.health.cyc.show : undefined, on: LowiCycle.enabled(), done: !!s.setupDone }; });
        check(gender === 'f' ? st.show === true && st.on : !st.on, tag + ': after setup ' + JSON.stringify(st));
        await p.evaluate(() => { document.querySelectorAll('.r2-ov').forEach(o => { try { LowiR2.close(o); } catch (e) { } }); }); await H.sleep(800);
        /* profile hub */
        for (let i = 0; i < 3; i++) {   /* setup hands over to the plant interview (Not now) and maybe the tutorial; close them */
            const dbg = m => { if (process.env.DEBUG) console.log('  .. ' + tag + ' ' + m); };
            dbg('hub try ' + i);
            try { await p.waitForSelector('#hsIv [data-hsi="later"]', { timeout: 6000 }); dbg('later'); await tap('#hsIv [data-hsi="later"]'); await H.sleep(900); } catch (e) { dbg('no later ' + String(e.message).slice(0, 60)); }
            await p.evaluate(() => { document.querySelectorAll('.r2-ov').forEach(o => { try { LowiR2.close(o); } catch (e) { } }); try { window.LowiTutorial && LowiTutorial.stop && LowiTutorial.stop(); } catch (e) { } });
            await H.sleep(900);
            dbg('overview'); await p.evaluate(() => LowiG2E.overview()); await H.sleep(1500); dbg('overview done');
            if (await p.$('#g2eTiles .g2h-tile')) break;
        }
        const tile = await p.evaluate(() => { const t = document.querySelector('#g2eTiles .g2e-cycle'); if (!t) return null; const r = t.getBoundingClientRect(); return { w: r.width, h: r.height, txt: t.textContent, idx: [...t.parentNode.children].indexOf(t) }; });
        if (process.env.DEBUG) console.log('  .. shot');
        await R.shot(OUT + '/' + tag + '-2-hub.png');
        if (process.env.DEBUG) console.log('  .. shot done');
        if (process.env.DEBUG) console.log(JSON.stringify(await p.evaluate(() => ({ st: LowiG2E.state(), ov: [...document.querySelectorAll('.r2-ov')].map(o => o.className), tiles: [...document.querySelectorAll('#g2eTiles > *')].map(t => t.className), el: LowiCycleWorld.eligible() }))));
        if (gender !== 'f') {
            check(!tile, tag + ': no My cycle tile in the profile hub');
            const o = await p.evaluate(() => ({ open: LowiCycleWorld.open(), prof: (document.getElementById('cyProf') || {}).hidden, info: window.cycleInfo ? cycleInfo().on : false }));
            check(o.open === false && o.prof !== false && !o.info, tag + ': cell world refuses to open, Profile row hidden, no cycle tips ' + JSON.stringify(o));
            return;
        }
        check(!!tile && tile.w > 40 && tile.idx === 1, tag + ': My cycle tile right after Your details: ' + JSON.stringify(tile));
        if (process.env.DEBUG) console.log('hit', JSON.stringify(await p.evaluate(() => { const t = document.querySelector('#g2eTiles .g2e-cycle'); const r = t.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { r: [r.left, r.top, r.width, r.height].map(Math.round), hit: h && (h.id || h.className || h.tagName), inT: t.contains(h), ov: [...document.querySelectorAll('.r2-ov')].map(o => o.className + ' :: ' + o.innerText.slice(0, 80)), sc: h && h.parentNode && h.parentNode.className }; })));
        await tap('#g2eTiles .g2e-cycle'); await H.sleep(1200);
        let sh = await p.evaluate(() => ({ open: LowiCycleWorld.isOpen(), txt: (document.getElementById('cwSheet') || {}).innerText || '' }));
        check(sh.open && /When did your last period start/.test(sh.txt), tag + ': cell world opens and asks for the first day');
        await R.shot(OUT + '/' + tag + '-3-ask.png');
        await tap('#cwSheet [data-cw="today"]'); await H.sleep(900);
        sh = await p.evaluate(() => ({ txt: document.getElementById('cwSheet').innerText, cls: document.querySelector('#cwSheet .cw-svg').getAttribute('class'), lit: (document.querySelector('#cwSheet .cw-mini.on') || {}).textContent }));
        check(/Day 1\b/i.test(sh.txt) && /Rest/.test(sh.txt) && /cw-rest/.test(sh.cls) && sh.lit === 'Rest', tag + ': started today shows Day 1, Rest (' + sh.cls + ')');
        await R.shot(OUT + '/' + tag + '-4-rest.png');
        /* it started 9 days ago: move the wrong date */
        await tap('#cwSheet [data-cw="other"]'); await H.sleep(500);
        const k = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 9); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
        await p.fill('#cwDate', k); await tap('#cwSheet [data-cw="save"]'); await H.sleep(900);
        sh = await p.evaluate(() => ({ txt: document.getElementById('cwSheet').innerText, cls: document.querySelector('#cwSheet .cw-svg').getAttribute('class'), m: LowiCycle.model() }));
        check(/Day 10/i.test(sh.txt) && /cw-grow/.test(sh.cls) && sh.m.last === k, tag + ': started ' + k + ' shows Day 10, ' + (sh.txt.match(/Grow[^\n]*/) || [''])[0] + ', ' + ((sh.txt.match(/Next period[^\n]*/) || [''])[0]));
        await R.shot(OUT + '/' + tag + '-5-grow.png');
        const fit = await p.evaluate(() => { const r = document.querySelector('#cwSheet').getBoundingClientRect(); const over = [...document.querySelectorAll('#cwSheet *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 1 || b.left < -1); }).length; return { w: Math.round(r.width), over }; });
        check(fit.over === 0, tag + ': nothing spills sideways (sheet ' + fit.w + 'px)');
        /* the hub tile follows */
        await p.evaluate(() => { document.querySelectorAll('.cw-ov').forEach(o => LowiR2.close(o)); }); await H.sleep(900);
        const t2 = await p.evaluate(() => (document.querySelector('#g2eTiles .g2e-cycle small') || {}).textContent);
        check(/Day 10 · Grow/.test(t2 || ''), tag + ': tile now says ' + t2);
    } finally {
        check(R.errs.length === 0, tag + ': page errors ' + JSON.stringify(R.errs.slice(0, 3)));
        await R.close();
    }
}
(async () => {
    for (const d of DEVICES) for (const g of (process.env.GENDERS || 'f,m,x').split(',')) { try { await run(d, g); } catch (e) { check(false, d + ' ' + g + ': ' + String(e.message || e).slice(0, 300)); } }
    console.log('\n' + ok.length + ' pass, ' + bad.length + ' fail');
    process.exit(bad.length ? 1 : 0);
})();
