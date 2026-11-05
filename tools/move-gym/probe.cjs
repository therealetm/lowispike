'use strict';
/* Move / gym background probe (Nov 5 2026). Chromium (SwiftShader), phone size 390x844, existing account.
   node tools/move-gym/probe.cjs [--still] [--black] [--reduce] [--shots]
   Opens Move the way the owner does (hold the Move bubble on Home), measures what animates behind the Move page (3D world frames,
   CSS animations running in the realm wallpaper), then goes back Home (the Home tab / X) and samples the transition every 60 ms:
   which layers are visible, the camera pull, html classes. Prints JSON lines; tools/move-gym/check.cjs turns it into PASS/FAIL. */
const fs = require('fs');
const { launch, openApp, sleep, existingSeed } = require('../interface-audit/lib.cjs');
const A = process.argv;
const STILL = A.includes('--still'), BLACK = A.includes('--black'), REDUCE = A.includes('--reduce'), SHOTS = A.includes('--shots');
const DIR = '/home/sprite/move-shots'; if (SHOTS) fs.mkdirSync(DIR, { recursive: true });

async function run() {
    const kv = { 'lowispike.lang': 'en' };
    if (STILL) { kv['lowi.galaxyStill'] = JSON.stringify({ v: 1, on: true, at: Date.now(), w: 390, h: 844, pic: 'none' }); }
    if (BLACK) { kv['lowi.theme.dark'] = 'black'; } else { kv['lowi.theme.dark'] = 'night'; kv['lowi.theme.dark.picked'] = '1'; kv['lowi.theme.dark.fix1'] = '1'; }
    const seed = existingSeed({ lang: 'en', kv });
    const h = await launch({ engine: 'chromium', seed, lang: 'en', viewport: { width: 390, height: 844 }, reducedMotion: REDUCE });
    await h.ctx.addInitScript(() => {
        window.__draws = 0;
        for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) { if (!C) continue; for (const m of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const o = C.prototype[m]; if (o) C.prototype[m] = function () { window.__draws++; return o.apply(this, arguments); }; } }
        window.__scene = 0; const r = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = f => { if (/body-world-3d-scene|world-home/.test(new Error().stack || '')) window.__scene++; return r(f); };
    });
    const P = h.page;
    await openApp(h, { settle: 6000 });
    if (BLACK) { await P.evaluate(() => { try { window.LowiTrueBlack && LowiTrueBlack.set('black'); window.LowiTrueBlack && LowiTrueBlack.refresh(); } catch (e) { } }); await sleep(800); }
    const snap = (tag) => P.evaluate((tag) => {
        const H = document.documentElement, rw = document.getElementById('rwBack'), bw = document.getElementById('bw3Back');
        const vis = e => { if (!e || !e.isConnected) return false; const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.02; };
        const running = rw ? [...rw.querySelectorAll('*')].filter(e => { const s = getComputedStyle(e); return s.animationName !== 'none' && s.animationPlayState === 'running' && vis(rw); }).length : -1;
        const t = document.querySelector('#main > .tab.active');
        const WH = window.LowiWorldHome, W3 = window.LowiWorld3D;
        const bodyBg = getComputedStyle(document.body).backgroundColor, mvBg = (() => { const m = document.querySelector('#tab-move'); return m ? getComputedStyle(m).backgroundColor : ''; })();
        const veil = rw && rw.querySelector('.rw-veil') ? getComputedStyle(rw.querySelector('.rw-veil')).backgroundImage.slice(0, 60) : '';
        return { tag, t: Math.round(performance.now()), tab: t && t.id, slide: [...document.querySelectorAll('#main > .tab')].filter(x => /lg-(in|out|peek)/.test(x.className)).map(x => x.id + ':' + (x.className.match(/lg-\w+/g) || []).join('+')),
            rwShow: !!(rw && rw.classList.contains('rw-show')), rwVis: vis(rw), rwOp: rw ? +getComputedStyle(rw).opacity : -1, rwAnims: running,
            bw3: !!bw, bw3Vis: vis(bw), w3: W3 && W3.state, pull: WH && WH.state ? (WH.state.pull ? 1 : 0) : null, dist: W3 && W3.rig ? +(+W3.rig.dist).toFixed(2) : null, mvStill: H.classList.contains('wb-mvstill'), scene: window.__scene, draws: window.__draws,
            cls: [...H.classList].filter(c => /^(rw|wb|gx|gs|wh-world|wh-home|bw3)/.test(c)).join(' '), black: H.hasAttribute('data-black'), dataTheme: H.getAttribute('data-theme'), bodyBg, mvBg, veil,
            guess: (document.querySelector('#tab-move .wm-guess-row') || {}).textContent || '' };
    }, tag);
    const out = [];
    out.push(await snap('home'));
    /* hold the Move bubble (the owner's way in), else the page API */
    const mv = await P.$('#whHud .wh-move, .wm-move, [data-orbit="move"]');
    let how = 'api';
    if (mv) { const b = await mv.boundingBox(); if (b) { await P.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await P.mouse.down(); await sleep(800); await P.mouse.up(); how = 'hold'; } }
    await sleep(300);
    let tab = await P.evaluate(() => (document.querySelector('#main > .tab.active') || {}).id);
    if (tab !== 'tab-move') { await P.evaluate(() => window.LowiMoveBubble && LowiMoveBubble.page()); how += '+api'; }
    for (let i = 0; i < 12; i++) { out.push(await snap('in' + i)); await sleep(60); }
    await sleep(1500);
    const s0 = await snap('move-steady-a'); await sleep(2000); const s1 = await snap('move-steady-b');
    out.push(s0, s1);
    if (SHOTS) { await P.screenshot({ path: DIR + '/move-' + (STILL ? 'still-' : '') + (BLACK ? 'black-' : '') + 'steady.png' }); }
    /* back Home: the Home way the owner uses (bottom-close X / Home tab), else goTab */
    const back = await P.evaluate(() => { const x = document.querySelector('.lw-bx:not([hidden]), .bx-close, [data-bx]'); if (x && x.getBoundingClientRect().width) { x.click(); return 'x'; } if (window.LowiHost && LowiHost.go) { LowiHost.go('home'); return 'host'; } goTab('home'); return 'goTab'; });
    for (let i = 0; i < 25; i++) { out.push(await snap('out' + i)); if (SHOTS && i % 3 === 0) await P.screenshot({ path: DIR + '/out-' + (STILL ? 'still-' : '') + i + '.png' }); await sleep(60); }
    await sleep(1500); out.push(await snap('home-after'));
    const res = { how, back, still: STILL, black: BLACK, reduce: REDUCE, errors: h.errors.slice(0, 8), out };
    await h.browser.close();
    return res;
}
run().then(r => { console.log(JSON.stringify(r)); }).catch(e => { console.error(e); process.exit(2); });
