'use strict';
/* Still galaxy (Nov 5 2026), browser check in Chromium (SwiftShader WebGL), phone size 390x844, German, existing account.
   node tools/galaxy-still/flow.cjs [--reduce]
   Walks the owner's flow: hold Community -> Settings hub -> Still galaxy -> Home with the live galaxy and the bar -> zoom -> Save;
   then checks the world is gone (no canvas, no frame loop, everything released), the picture is painted, the interface still works,
   reloads (world never built, picture back), the browser dropping the picture (small copy, then plain + "missing"), choosing a new view,
   exploring again, and three more off/on rounds. Prints PASS/FAIL lines and exits 1 on any FAIL. */
const fs = require('fs');
const { launch, openApp, sleep, existingSeed } = require('../interface-audit/lib.cjs');
const REDUCE = process.argv.includes('--reduce');
const SHOTS = '/home/sprite/gs-shots'; fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
    const seed = existingSeed({ lang: 'de', kv: { 'lowispike.lang': 'de', 'lowi.lang': 'de' } });
    const h = await launch({ engine: 'chromium', seed, lang: 'de', locale: 'de-DE', viewport: { width: 390, height: 844 }, reducedMotion: REDUCE });
    /* count animation frames the page asks for, and WebGL contexts it opens */
    await h.ctx.addInitScript(() => {
        window.__raf = 0; const r = window.requestAnimationFrame.bind(window); window.__scene = 0; window.requestAnimationFrame = f => { window.__raf++; if (/body-world-3d-scene/.test(new Error().stack || '')) window.__scene++; return r(f); };
        window.__gl = 0; const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (k, o) { if (/webgl/.test(k)) window.__gl++; return g.call(this, k, o); };
    });
    const P = h.page;
    const st = () => P.evaluate(() => {
        const W3 = window.LowiWorld3D, G = window.LowiGalaxyStill, H = document.documentElement, b = document.getElementById('gsBack');
        const vis = s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
        return {
            w3: W3 && W3.state, why: W3 && W3.why, canvases: document.querySelectorAll('.bw3-canvas').length, back3d: !!document.getElementById('bw3Back'),
            gsOn: H.classList.contains('gs-on'), gsPic: H.classList.contains('gs-pic'), shown: G && G.shown(), on: G && G.on(), status: G && G.status('de'),
            bg: b ? b.style.backgroundImage.slice(0, 30) : null, bar: !!document.querySelector('.gs-bar'), home: H.classList.contains('wh-home'),
            live: H.classList.contains('wh-world-live'), companion: vis('#spBubble') || vis('#spHome .sp-bubble'), hud: vis('#whHud [data-orbit="settings"]'),
            key: !!localStorage.getItem('lowi.galaxyStill'), thumb: (localStorage.getItem('lowi.galaxyStill.thumb') || '').length, raf: window.__raf, gl: window.__gl,
            rel: G && G.lastRelease(), errs: 0
        };
    });
    const done = () => P.waitForFunction(() => !document.querySelector('.gs-bar') && !window.LowiGalaxyStill.busy(), null, { timeout: 30000 }).catch(() => { });
    /* main-thread work per second (Chrome's own TaskDuration) and the 3D world's frame requests per second, over 4 s.
       SwiftShader draws WebGL on the CPU here, so the live number is higher than on a phone's graphics chip: it shows the direction only. */
    let cdp = null;
    const load = async () => {
        if (!cdp) { cdp = await h.ctx.newCDPSession(P); await cdp.send('Performance.enable'); }
        const m = async () => { const r = await cdp.send('Performance.getMetrics'); const g = k => (r.metrics.find(x => x.name === k) || {}).value || 0; return { task: g('TaskDuration'), sc: await P.evaluate(() => window.__scene) }; };
        const a = await m(); await sleep(4000); const b = await m();
        return { cpuMsPerS: Math.round((b.task - a.task) * 1000 / 4), sceneFps: (b.sc - a.sc) / 4 };
    };
    const ready = () => P.waitForFunction(() => window.LowiWorld3D && (window.LowiWorld3D.state === 'ready' || window.LowiWorld3D.state === 'fallback'), null, { timeout: 60000 }).catch(() => { });
    const q = s => P.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 2 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; }, s);
    async function hold(x, y, ms) {
        await P.evaluate(([x, y, ms]) => new Promise(res => {
            const el = document.elementFromPoint(x, y), o = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0 };
            el.dispatchEvent(new PointerEvent('pointerdown', o));
            setTimeout(() => { el.dispatchEvent(new PointerEvent('pointerup', o)); (document.elementFromPoint(x, y) || el).dispatchEvent(new MouseEvent('click', o)); res(); }, ms);
        }), [x, y, ms]);
    }
    const dismiss = async () => { for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await sleep(200); } };
    /* how much of the screen's middle band shows the saved picture (not one flat colour) */
    const busy = async name => {
        const f = SHOTS + '/' + name + '.png'; await P.screenshot({ path: f });
        return P.evaluate(async src => {
            const i = new Image(); i.src = src; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0);
            const d = x.getImageData(0, Math.round(i.height * .3), i.width, Math.round(i.height * .3)).data; const seen = new Set(); let blue = 0, dark = 0;
            for (let k = 0; k < d.length; k += 16) { seen.add((d[k] >> 4) + ',' + (d[k + 1] >> 4) + ',' + (d[k + 2] >> 4)); const m = Math.max(d[k], d[k + 1], d[k + 2]); if (m < 90) { dark++; if (d[k + 2] - d[k] > 8) blue++; } }
            return { colours: seen.size, blueDarkPct: dark ? Math.round(100 * blue / dark) : 0 };
        }, 'data:image/png;base64,' + fs.readFileSync(f).toString('base64'));
    };

    await openApp(h, { query: '?dc=' + Date.now() });
    await dismiss(); await ready(); await sleep(2500);
    let s = await st();
    console.log('start', JSON.stringify(s));
    if (s.w3 !== 'ready') {
        ok(REDUCE, 'live galaxy started at launch (state ' + s.w3 + ' / ' + s.why + ')');
        const avail = await P.evaluate(() => window.LowiGalaxyStill.available());
        ok(!avail, 'with the moving galaxy off on this device, the Still galaxy row is not offered (available=' + avail + ')');
        await h.browser.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
    }
    const liveLoad = await load();
    ok(liveLoad.sceneFps > 1, 'live galaxy runs its frame loop: ' + JSON.stringify(liveLoad));

    /* 1. tap on Community still opens Community; a hold opens Settings (the hub) with the Still galaxy row */
    let b = await q('#whHud [data-orbit="settings"]');
    ok(!!b, 'Community bubble on Home');
    await P.mouse.click(b.x, b.y); await sleep(1800);
    const inComm = await P.evaluate(() => !document.documentElement.classList.contains('wh-home') || !!document.querySelector('#tab-community.active, #tab-foryou.active'));
    ok(inComm, 'a normal tap on Community opens Community');
    await P.evaluate(() => window.goTab('home')); await sleep(2500); await dismiss();
    b = await q('#whHud [data-orbit="settings"]');
    await hold(b.x, b.y, 800); await sleep(900);
    const rows = await P.evaluate(() => [...document.querySelectorAll('#cmeSheet [data-cme]')].map(e => e.getAttribute('data-cme')));
    ok(rows.includes('galaxyStill') && rows.includes('theme'), 'a hold on Community opens Settings with the Still galaxy row (' + rows.slice(0, 8).join(',') + ')');
    const row = await P.evaluate(() => { const e = document.querySelector('#cmeSheet [data-cme="galaxyStill"]'); return e ? { t: e.innerText.replace(/\s+/g, ' ').trim(), aria: e.getAttribute('aria-checked'), h: Math.round(e.getBoundingClientRect().height) } : null; });
    console.log('row', JSON.stringify(row));
    ok(row && /Ruhige Galaxie/.test(row.t) && /Aus/.test(row.t) && row.aria === 'false' && row.h >= 44, 'row reads "Ruhige Galaxie, Spart Akku, Aus", is a 44pt+ switch');

    /* 2. tap it: Settings closes, Home with the live galaxy and the bar */
    const rb = await q('#cmeSheet [data-cme="galaxyStill"]'); await P.mouse.click(rb.x, rb.y); await sleep(2500);
    s = await st(); console.log('framing', JSON.stringify(s));
    ok(s.bar && s.home && s.w3 === 'ready' && s.canvases === 1, 'framing: Home, live galaxy, the bar with Save');
    ok(s.hud, 'framing: the interface stays on screen (Community bubble visible)');
    const save = await P.evaluate(() => { const e = document.querySelector('.gs-save'); const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, t: e.textContent }; });
    ok(save.x + save.w > 300 && save.y < 120 && save.h >= 44 && save.t === 'Speichern', 'Save sits in the top right corner, 44pt tall, "Speichern" (' + JSON.stringify(save) + ')');
    /* zoom and move the galaxy while framing (wheel = pinch in Chromium) */
    const zoom0 = await P.evaluate(() => { const r = window.LowiWorld3D.rig; return r ? r.dist : null; });
    await P.mouse.move(195, 470); for (let i = 0; i < 6; i++) { await P.mouse.wheel(0, 240); await sleep(120); }
    await sleep(1500);
    const zoom1 = await P.evaluate(() => { const r = window.LowiWorld3D.rig; return r ? r.dist : null; });
    console.log('zoom', zoom0, '->', zoom1);
    ok(zoom0 !== null && zoom1 !== zoom0, 'the galaxy can be zoomed while the bar is up (' + zoom0 + ' -> ' + zoom1 + ')');
    const before = await busy('1-framing');

    /* 3. Save: picture first, then the world is let go */
    const sv = await q('.gs-save'); await P.mouse.click(sv.x, sv.y); await done(); await sleep(800);
    console.log('save took ms', await P.evaluate(() => window.LowiGalaxyStill.saveMs()));
    s = await st(); console.log('saved', JSON.stringify(s));
    ok(s.w3 === 'fallback' && s.why === 'still' && s.canvases === 0 && !s.back3d, 'after Save the 3D world is gone: no canvas, no backdrop (' + s.w3 + '/' + s.why + ')');
    ok(s.gsOn && s.gsPic && s.shown === 'full' && /blob:/.test(s.bg), 'the saved view is painted behind the app (full picture)');
    ok(s.rel && s.rel.geometries > 0 && s.rel.materials > 0, 'released: ' + JSON.stringify(s.rel));
    ok(s.key && s.thumb > 1000 && !s.bar && !s.live, 'choice + small copy stored, bar gone, Home left its live-world layout');
    ok(s.companion, 'the companion is still on Home after Save');
    const after = await busy('2-saved');
    console.log('screen middle band: framing', JSON.stringify(before), 'saved', JSON.stringify(after));
    ok(after.colours >= 12, 'the background is a picture, not one flat colour (' + after.colours + ' colours)');
    const toastT = await P.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
    ok(/Hintergrund gespeichert/.test(toastT), 'tells the user: "' + toastT + '"');
    const stillLoad = await load();
    ok(stillLoad.sceneFps === 0 && stillLoad.cpuMsPerS < liveLoad.cpuMsPerS, 'after Save the 3D frame loop asks for no frames; main-thread work live ' + JSON.stringify(liveLoad) + ' -> still ' + JSON.stringify(stillLoad));
    const pic = await P.evaluate(async () => { const r = await new Promise(res => { const o = indexedDB.open('lowi-galaxy-still', 1); o.onsuccess = () => { const d = o.result; const g = d.transaction('pics').objectStore('pics').get('bg'); g.onsuccess = () => { d.close(); res(g.result); }; }; }); return r ? { size: r.blob.size, w: r.w, h: r.h } : null; });
    ok(pic && pic.size > 5000, 'full picture stored in IndexedDB ' + JSON.stringify(pic));
    /* the interface still works on top of the picture: Community tap, back Home */
    b = await q('#whHud [data-orbit="settings"]') || await q('[data-orbit="settings"]');
    ok(!!b, 'Community bubble still on Home over the still background');

    /* 4. reload: the world is never built, the picture comes back */
    await P.evaluate(() => { sessionStorage.setItem('__ia', '1'); });
    await P.reload({ waitUntil: 'load' }); await sleep(6000); await dismiss();
    s = await st(); console.log('reload', JSON.stringify(s));
    ok(s.w3 === 'fallback' && s.why === 'still' && s.canvases === 0 && s.gl === 0, 'after a reload the world is never built: no canvas, ' + s.gl + ' WebGL contexts opened');
    ok(s.shown === 'full' && s.gsPic && s.status === 'An', 'the full picture is back and Settings says An');
    ok(s.companion, 'the companion is on Home after the reload');
    await P.evaluate(() => { window.__scene = 0; }); const relLoad = await load(); console.log('after reload', JSON.stringify(relLoad));
    ok(relLoad.sceneFps === 0, 'after the reload no 3D frames at all');
    await busy('3-reload');

    /* 5. the browser dropped the full picture -> small copy; dropped both -> plain + "missing" */
    await P.evaluate(() => new Promise(res => { const r = indexedDB.deleteDatabase('lowi-galaxy-still'); r.onsuccess = r.onerror = r.onblocked = () => res(); }));
    await P.reload({ waitUntil: 'load' }); await sleep(5000); await dismiss();
    s = await st(); ok(s.shown === 'thumb' && s.gsPic && s.w3 === 'fallback', 'full picture gone: the small copy is shown, world still off (' + s.shown + ')');
    await P.evaluate(() => localStorage.removeItem('lowi.galaxyStill.thumb'));
    await P.reload({ waitUntil: 'load' }); await sleep(5000); await dismiss();
    s = await st(); ok(s.shown === 'plain' && s.gsOn && !s.gsPic && s.w3 === 'fallback' && /fehlt/.test(s.status), 'both gone: calm plain background, world off, Settings says "' + s.status + '"');
    await busy('4-plain');

    /* 6. choose a new view (sheet -> reload with the live world -> bar -> Save) */
    await P.evaluate(() => window.LowiGalaxyStill.tap({}));
    await sleep(800);
    const opts = await P.evaluate(() => [...document.querySelectorAll('.gs-sheet [data-gso]')].map(e => e.textContent));
    ok(opts.length === 3, 'while on, the row opens: ' + opts.join(' | '));
    await Promise.all([P.waitForNavigation({ waitUntil: 'load' }), P.click('.gs-sheet [data-gso="reframe"]')]);
    await ready(); await sleep(4000); await dismiss();
    s = await st(); console.log('reframe', JSON.stringify(s));
    ok(s.w3 === 'ready' && s.bar && s.canvases === 1, 'choose a new view: one launch with the live galaxy and the bar');
    await P.click('.gs-save'); await done(); await sleep(500);
    s = await st(); ok(s.w3 === 'fallback' && s.shown === 'full' && s.canvases === 0, 'saved again: new full picture, world released');
    await P.reload({ waitUntil: 'load' }); await sleep(5000);
    s = await st(); ok(s.w3 === 'fallback' && s.shown === 'full', 'one framing launch only: the next reload is still again');

    /* 7. explore again: everything stored goes, one reload, the live world is back */
    await P.evaluate(() => window.LowiGalaxyStill.tap({})); await sleep(800);
    await Promise.all([P.waitForNavigation({ waitUntil: 'load' }), P.click('.gs-sheet [data-gso="explore"]')]);
    await ready(); await sleep(3500); await dismiss();
    s = await st(); console.log('explore', JSON.stringify(s));
    ok(s.w3 === 'ready' && s.canvases === 1 && !s.gsOn && !s.key && !s.thumb && s.status === 'Aus', 'explore again: live galaxy back, nothing stored, Settings says Aus');
    ok(s.live, 'Home is back in its live-world layout');

    /* 8. three more rounds of on (framing + Save, release in place) and off (explore) */
    for (let i = 1; i <= 3; i++) {
        await P.evaluate(() => window.LowiGalaxyStill.startFraming()); await sleep(1500);
        await P.click('.gs-save'); await done(); await sleep(500);
        s = await st(); const r1 = s.w3 === 'fallback' && s.canvases === 0 && s.shown === 'full';
        await P.evaluate(() => window.LowiGalaxyStill.tap({})); await sleep(700);
        await Promise.all([P.waitForNavigation({ waitUntil: 'load' }), P.click('.gs-sheet [data-gso="explore"]')]);
        await ready(); await sleep(3000);
        s = await st(); ok(r1 && s.w3 === 'ready' && s.canvases === 1 && !s.key, 'round ' + i + ': still then live again');
    }
    /* 9. framing cancelled while off: nothing saved, world keeps running */
    await P.evaluate(() => window.LowiGalaxyStill.startFraming()); await sleep(1500);
    await P.click('.gs-cancel'); await sleep(800);
    s = await st(); ok(!s.bar && s.w3 === 'ready' && !s.key && !s.gsOn, 'Cancel saves nothing and the galaxy keeps going');

    console.log('page errors', JSON.stringify(h.errors.slice(0, 8)));
    ok(h.errors.length === 0, 'no page errors (' + h.errors.length + ')');
    await h.browser.close();
    console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
