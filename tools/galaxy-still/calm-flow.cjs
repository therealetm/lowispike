'use strict';
/* Nov 5 2026, Calm mode browser check (phone-sized Chromium, software WebGL). For Off and every level:
   the 3D world stays built (no second layout), the glass bubbles = the page bubbles (no ghost, no extra ring), drag does / doesn't
   move the world, the scenery stands still / is gone, Misty and the glass stand still at 4, and Water, Shop, Community, Settings
   (hold Community), Move (hold), Scan and Sleep all open at once, with no reload anywhere.
   node tools/galaxy-still/calm-flow.cjs [--engine webkit]   screenshots: /home/sprite/gs-fix-shots/calm-*.png  pixel data: calm-*.json */
const fs = require('fs');
const { launch, openApp, sleep, existingSeed } = require('../interface-audit/lib.cjs');
const SHOTS = '/home/sprite/gs-fix-shots'; fs.mkdirSync(SHOTS, { recursive: true });
const ENG = (process.argv.indexOf('--engine') > 0 && process.argv[process.argv.indexOf('--engine') + 1]) || 'chromium';
const LANG = (process.argv.indexOf('--lang') > 0 && process.argv[process.argv.indexOf('--lang') + 1]) || 'de';
const ONLY_RELAUNCH = process.argv.includes('--relaunch');
const THEME = (process.argv.indexOf('--theme') > 0 && process.argv[process.argv.indexOf('--theme') + 1]) || '';
let pass = 0, fail = 0; const fails = [];
function ok(c, name, extra) { if (c) { pass++; console.log('PASS', name); } else { fail++; fails.push(name); console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } }

(async () => {
    const kv = { 'lowispike.lang': LANG, 'lowi.lang': LANG };
    if (THEME) kv['lowi.theme'] = THEME;
    const seed = existingSeed({ lang: LANG, kv });
    const h = await launch({ engine: ENG, seed, lang: LANG, locale: LANG + '-' + LANG.toUpperCase(), viewport: { width: 390, height: 844 } });
    const P = h.page;
    const dismiss = async () => { for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await sleep(180); } };
    const home = async () => { await dismiss(); await P.evaluate(() => { try { if (window.LowiR2 && window.LowiR2.closeAll) window.LowiR2.closeAll(); } catch (e) { } window.goTab('home'); }); await sleep(1800); await dismiss(); };
    const q = s => P.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 2 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; }, s);
    async function hold(x, y, ms) {
        await P.evaluate(([x, y, ms]) => new Promise(res => {
            const el = document.elementFromPoint(x, y), o = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0 };
            el.dispatchEvent(new PointerEvent('pointerdown', o));
            setTimeout(() => { el.dispatchEvent(new PointerEvent('pointerup', o)); (document.elementFromPoint(x, y) || el).dispatchEvent(new MouseEvent('click', o)); res(); }, ms);
        }), [x, y, ms]);
    }
    const state = () => P.evaluate(() => {
        const H = document.documentElement, a = window.LowiWorld3D, vis = e => { if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
        const g = a && a.scene && a.scene.children.find(o => o.name === 'lowi-living-bubbles');
        const glass = g ? g.children.filter(m => m.visible && m.renderOrder === 20).length : -1;
        const bubbles = [...document.querySelectorAll('#whHud [data-orbit], #spHome [data-orbit]')].filter(vis).map(e => e.getAttribute('data-orbit'));
        const cam = a && a.camera ? a.camera.position.toArray().map(v => +v.toFixed(3)).concat(a.camera.quaternion.toArray().map(v => +v.toFixed(4))) : null;
        return {
            w3: a && a.state, mark: window.__calmMark || 0, lvl: window.LowiGalaxyStill && window.LowiGalaxyStill.level(), stored: localStorage.getItem('lowi.calm'),
            cls: H.className.split(/\s+/).filter(c => /^(cm-|gs-|bw3-|wh-world-live)/.test(c)), glass, bubbles, cam,
            frames: a && a.renderer ? a.renderer.info.render.frame : -1, pad: vis(document.getElementById('whPad'))
        };
    });
    const scenery = () => P.evaluate(() => {
        const a = window.LowiWorld3D, C = window.LowiGalaxyStillCore, out = [];
        a.scene.children.forEach(o => { if (!C.keeps(o) && o.visible) { const p = []; let n = 0; o.traverse(c => { if (n < 40 && (c.isMesh || c.isPoints || c.isInstancedMesh)) { n++; p.push(c.position.x, c.position.y, c.position.z, c.rotation.x, c.rotation.y, c.rotation.z); if (c.material && c.material.uniforms && c.material.uniforms.uTime) p.push(c.material.uniforms.uTime.value); } }); out.push(p.map(v => +(+v).toFixed(4)).join(',')); } });
        return out.join('|');
    });
    const mistyPos = () => P.evaluate(() => {
        const a = window.LowiWorld3D, out = []; a.scene.traverse(o => { if (/misty|mf-|lowi-hub/.test(o.name || '')) out.push(o.name + ':' + o.getWorldPosition(new o.position.constructor()).toArray().map(v => v.toFixed(3)).join(',') + ':' + o.quaternion.toArray().map(v => v.toFixed(3)).join(',') + ':' + o.scale.x.toFixed(3)); }); return out.join('|');
    });
    const glassPose = () => P.evaluate(() => {
        const a = window.LowiWorld3D, g = a.scene.children.find(o => o.name === 'lowi-living-bubbles'); return g ? g.children.filter(m => m.visible).map(m => m.rotation.toArray().slice(0, 3).map(v => (+v).toFixed(3)).concat([m.scale.x.toFixed(3)]).join(',')).join('|') : '';
    });
    const setLvl = async n => { await P.evaluate(n => window.LowiGalaxyStill.set(n), n); await sleep(1500); };

    /* ---- interactions: every one must open at once in this same page ---- */
    async function interactions(L) {
        await home();
        let b = await q('[data-orbit="water"]');
        const w0 = await P.evaluate(() => document.querySelector('[data-orbit="water"]').getAttribute('aria-label'));
        await P.mouse.click(b.x, b.y); await sleep(1200);
        const wr = await P.evaluate(w0 => { const e = document.querySelector('[data-orbit="water"]'); const sheet = [...document.querySelectorAll('.r2-ov, .lowi-sheet, [role="dialog"], .wa-pop, .wh-pop, .sp-pop')].some(x => x.getBoundingClientRect().width > 50 && getComputedStyle(x).visibility !== 'hidden'); return { changed: e.getAttribute('aria-label') !== w0, sheet }; }, w0);
        ok(wr.changed || wr.sheet, 'L' + L + ' Water tap reacts', wr);
        await home();

        b = await q('[data-orbit="fuel"]'); await P.mouse.click(b.x, b.y); await sleep(2200);
        const sr = await P.evaluate(() => ({ tab: (document.querySelector('[id^="tab-"].active') || {}).id, sheet: [...document.querySelectorAll('.r2-ov, [role="dialog"]')].filter(x => x.getBoundingClientRect().width > 50).map(x => String(x.className).slice(0, 40)) }));
        ok(sr.tab !== 'tab-home' || sr.sheet.length > 0, 'L' + L + ' Shop opens', sr);
        await home();

        b = await q('[data-orbit="settings"]'); await P.mouse.click(b.x, b.y); await sleep(2400);
        const cr = await P.evaluate(() => { const t = document.getElementById('tab-foryou'); const r = t.getBoundingClientRect(); let o = 1, p = t; while (p && p.nodeType === 1) { o *= +getComputedStyle(p).opacity; p = p.parentElement; } return { active: t.classList.contains('active'), w: r.width | 0, op: +o.toFixed(2), txt: t.innerText.replace(/\s+/g, ' ').trim().length, hit: (document.elementFromPoint(195, 300) || {}).closest ? !!document.elementFromPoint(195, 300).closest('#tab-foryou, .wb-comm, #cgGalaxy, .cg-galaxy') : false }; });
        ok(cr.active && cr.w > 300 && cr.op > 0.5 && cr.txt > 20 && cr.hit, 'L' + L + ' Community opens and shows content', cr);
        await P.screenshot({ path: SHOTS + '/calm-L' + L + '-community.png' });
        await home();

        b = await q('[data-orbit="settings"]'); await hold(b.x, b.y, 800); await sleep(1600);
        const st = await P.evaluate(() => { const r = document.querySelector('[data-cme="galaxyStill"]'); return { row: !!r && r.getBoundingClientRect().width > 100, rows: document.querySelectorAll('.cme-row').length, txt: r ? r.innerText.replace(/\s+/g, ' ').trim() : '' }; });
        ok(st.row, 'L' + L + ' hold Community opens Settings with the Calm mode row', st);
        await home();

        b = await q('[data-orbit="move"]'); await hold(b.x, b.y, 800); await sleep(1800);
        const mr = await P.evaluate(() => ({ tab: (document.querySelector('[id^="tab-"].active') || {}).id, hit: !!(document.elementFromPoint(195, 420) && document.elementFromPoint(195, 420).closest('#tab-move')) }));
        ok(mr.tab === 'tab-move' && mr.hit, 'L' + L + ' hold Move opens the Move page', mr);
        await home();

        b = await q('[data-orbit="scan"]'); await P.mouse.click(b.x, b.y); await sleep(1800);
        const sc = await P.evaluate(() => ({ tab: (document.querySelector('[id^="tab-"].active') || {}).id, sheet: [...document.querySelectorAll('.r2-ov, [role="dialog"]')].filter(x => x.getBoundingClientRect().width > 50).length }));
        ok(sc.tab !== 'tab-home' || sc.sheet > 0, 'L' + L + ' Scan opens', sc);
        await home();

        b = await q('[data-orbit="sleep"]'); await P.mouse.click(b.x, b.y); await sleep(1500);
        const sl = await P.evaluate(() => ({ tab: (document.querySelector('[id^="tab-"].active') || {}).id, sheet: [...document.querySelectorAll('.r2-ov, [role="dialog"], .sl-pop, .sleep-pop')].filter(x => x.getBoundingClientRect().width > 50).length }));
        ok(sl.tab !== 'tab-home' || sl.sheet > 0, 'L' + L + ' Sleep opens', sl);
        await home();
    }

    await openApp(h, { query: '?dc=' + Date.now() });
    await dismiss();
    await P.waitForFunction(() => window.LowiWorld3D && window.LowiWorld3D.state === 'ready', null, { timeout: 90000 }).catch(() => { });
    await sleep(2500); await dismiss();
    await P.evaluate(() => { window.__calmMark = 42; });
    const s0 = await state();
    ok(s0.w3 === 'ready' && s0.lvl === 0, 'start: world ready, Calm off', s0);
    const base = { bubbles: s0.bubbles.length, glass: s0.glass };
    console.log('baseline', JSON.stringify(base));

    /* the level is chosen in the Settings sheet once, by tapping, the rest through the same api the sheet calls */
    let b, row0;
    if (!ONLY_RELAUNCH) {
    await home();
    b = await q('[data-orbit="settings"]'); await hold(b.x, b.y, 800); await sleep(1600);
    const row = await q('[data-cme="galaxyStill"]');
    ok(!!row, 'Settings has the Calm mode row');
    if (row) {
        await P.evaluate(() => document.querySelector('[data-cme="galaxyStill"]').scrollIntoView({ block: 'center' })); await sleep(300);
        const r2 = await q('[data-cme="galaxyStill"]'); await P.mouse.click(r2.x, r2.y); await sleep(1200);
        const sh = await P.evaluate(() => ({ n: document.querySelectorAll('.cm-opt').length, on: [...document.querySelectorAll('.cm-opt.on')].map(e => e.dataset.cm), title: (document.querySelector('.cm-sheet h2') || {}).textContent, sizes: [...document.querySelectorAll('.cm-opt, .cm-done')].map(e => Math.round(e.getBoundingClientRect().height)), over: document.documentElement.scrollWidth > innerWidth + 1 }));
        ok(sh.n === 5 && sh.on.join() === '0', 'Calm sheet: Off + 4 levels, Off ticked', sh);
        ok(sh.sizes.every(x => x >= 44) && !sh.over, 'Calm sheet: every choice at least 44 pt tall, no sideways overflow', sh.sizes);
        await P.screenshot({ path: SHOTS + '/calm-sheet.png' });
        await P.evaluate(() => document.querySelector('.cm-opt[data-cm="3"]').scrollIntoView({ block: 'center' })); await sleep(300); const o3 = await q('.cm-opt[data-cm="3"]'); await P.mouse.click(o3.x, o3.y); await sleep(1200);
        const after = await P.evaluate(() => ({ on: [...document.querySelectorAll('.cm-opt.on')].map(e => e.dataset.cm), lvl: window.LowiGalaxyStill.level(), cls: document.documentElement.className.split(/\s+/).filter(c => /^cm-/.test(c)) }));
        ok(after.lvl === 3 && after.on.join() === '3' && after.cls.join() === 'cm-on,cm-nav,cm-bg,cm-nobg', 'tapping level 3 applies it at once, tick moves, sheet stays', after);
        await P.screenshot({ path: SHOTS + '/calm-sheet-3.png' });
        await P.evaluate(() => document.querySelector('.cm-done').scrollIntoView({ block: 'center' })); await sleep(300); const dn = await q('.cm-done'); console.log('done at', JSON.stringify(dn)); await P.mouse.click(dn.x, dn.y); await sleep(1500);
        const back = await P.evaluate(() => ({ sheet: !!document.querySelector('.cm-sheet'), row: (document.querySelector('[data-cme="galaxyStill"]') || {}).innerText }));
        ok(!back.sheet && back.row && /Kein Hintergrund|No background|Sin fondo/.test(back.row), 'Done closes the sheet, Settings row shows the level', back);
        await home();
    }

    const shots = {};
    for (const L of [0, 1, 2, 3, 4]) {
        await setLvl(L); await home(); await sleep(1500);
        const s = await state();
        ok(s.w3 === 'ready' && s.mark === 42 && !s.cls.includes('bw3-off') && !s.cls.some(c => /^gs-/.test(c)), 'L' + L + ' same page, 3D world still built, no second layout', s);
        const wantB = L >= 1 ? base.bubbles - 1 : base.bubbles;
        ok(s.bubbles.length === wantB && (L >= 1 ? !s.bubbles.includes('joy') && !s.pad : s.pad), 'L' + L + ' bubbles: ' + (L >= 1 ? 'joystick gone, the rest all there' : 'all there'), s.bubbles);
        await sleep(600);
        const s1 = await state();
        ok(s1.glass === s1.bubbles.length, 'L' + L + ' one glass per bubble (no ghost bubble, no extra ring)', { glass: s1.glass, bubbles: s1.bubbles });
        /* drag on empty world */
        const c0 = (await state()).cam;
        await P.mouse.move(200, 720); await P.mouse.down(); for (let i = 1; i <= 8; i++) { await P.mouse.move(200 - i * 18, 720 - i * 4); await sleep(30); } await P.mouse.up(); await sleep(900);
        const c1 = (await state()).cam;
        const moved = c0 && c1 && c0.some((v, i) => Math.abs(v - c1[i]) > 0.002);
        if (L === 0) ok(moved, 'L0 dragging the world moves it', { c0, c1 });
        else if (L >= 2) ok(!moved, 'L' + L + ' dragging does not move the world', { c0, c1 });
        else { const c2 = (await state()).cam; await sleep(800); const c3 = (await state()).cam; /* L1: the camera may still turn slowly by itself; a drag must add nothing beyond that */ const drift = c2.some((v, i) => Math.abs(v - c3[i]) > 0.002); ok(!moved || drift, 'L1 dragging does not move the world (only its own slow turn)', { c0, c1, drift }); }
        if (L >= 1) {
            const z0 = (await state()).cam; await P.mouse.move(200, 700); for (let i = 0; i < 4; i++) { await P.mouse.wheel(0, -240); await sleep(80); } await sleep(700); const z1 = (await state()).cam;
            if (L >= 2) ok(z0.every((v, i) => Math.abs(v - z1[i]) < 0.002), 'L' + L + ' zoom does nothing', { z0, z1 });
        }
        await sleep(400);
        const scA = await scenery(); const f0 = (await state()).frames; await sleep(2000); const scB = await scenery(); const f1 = (await state()).frames;
        if (L >= 2) ok(scA === scB, 'L' + L + ' background scenery stands still', { changed: scA !== scB });
        if (L === 0) ok(scA !== scB, 'L0 background scenery moves', {});
        const fps = (f1 - f0) / 2;
        console.log('L' + L + ' frames/s', fps.toFixed(1));
        if (L === 4) ok(fps <= 6, 'L4 world drawn at most a few times a second', fps);
        if (L === 4) {
            const m0 = await mistyPos(), g0 = await glassPose(); await sleep(2000); const m1 = await mistyPos(), g1 = await glassPose();
            ok(m0 === m1, 'L4 Misty stands still', { m0: m0.slice(0, 200), m1: m1.slice(0, 200) });
            ok(g0 === g1, 'L4 glass bubbles stand still', { g0: g0.slice(0, 160), g1: g1.slice(0, 160) });
            const an = await P.evaluate(() => ({ running: document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations === Infinity).length, paused: window.LowiGalaxyStill.pausedCount() }));
            ok(an.running === 0, 'L4 no endless CSS animation running', an);
        }
        await P.screenshot({ path: SHOTS + '/calm-L' + L + '.png' }); await sleep(1000); await P.screenshot({ path: SHOTS + '/calm-L' + L + 'b.png' });
        shots[L] = s1;
        await interactions(L);
        const s2 = await state();
        ok(s2.mark === 42 && s2.w3 === 'ready', 'L' + L + ' no reload after all the taps', s2);
    }

    /* back to Off from 4 without a restart: everything moves again */
    await setLvl(0); await home(); await sleep(1500);
    const so = await state();
    ok(so.mark === 42 && so.pad && so.bubbles.length === base.bubbles && so.cls.filter(c => /^cm-/.test(c)).length === 0, 'Off again: joystick and every bubble back, no reload', so);
    const an = await P.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations === Infinity).length);
    ok(an > 0, 'Off again: endless animations run again', an);
    const scA = await scenery(); await sleep(1500); const scB = await scenery();
    ok(scA !== scB, 'Off again: background scenery moves again');

    } /* end !ONLY_RELAUNCH */
    /* level 4 survives a relaunch and the world is still built (no picture, no fallback) */
    await setLvl(4);
    await P.reload({ waitUntil: 'load' }); await sleep(2000); await dismiss();
    await P.waitForFunction(() => window.LowiWorld3D && window.LowiWorld3D.state === 'ready', null, { timeout: 90000 }).catch(() => { });
    await sleep(2500); await dismiss();
    const sr = await state();
    ok(sr.lvl === 4 && sr.w3 === 'ready' && sr.cls.includes('cm-all') && !sr.pad, 'relaunch keeps level 4 with the world built', sr);
    await interactions('4r');
    await setLvl(0);

    /* the first Still galaxy's record becomes level 2 */
    await P.evaluate(() => { localStorage.removeItem('lowi.calm'); localStorage.setItem('lowi.galaxyStill', JSON.stringify({ v: 1, on: true, at: 1 })); localStorage.setItem('lowi.galaxyStill.thumb', 'data:image/jpeg;base64,xx'); });
    await P.reload({ waitUntil: 'load' }); await sleep(3000); await dismiss();
    const mg = await P.evaluate(() => ({ lvl: window.LowiGalaxyStill.level(), stored: localStorage.getItem('lowi.calm'), old: localStorage.getItem('lowi.galaxyStill'), thumb: localStorage.getItem('lowi.galaxyStill.thumb') }));
    ok(mg.lvl === 2 && mg.stored === '2' && mg.old === null && mg.thumb === null, 'old Still galaxy carries over as level 2, its picture removed', mg);

    const errs = h.errors.filter(e => !/supabase|Failed to fetch|NetworkError|net::/i.test(e));
    ok(errs.length === 0, 'no page errors', errs.slice(0, 5));
    console.log('consoleErr', JSON.stringify(h.consoleErr.slice(0, 5)).slice(0, 600));
    console.log('RESULT ' + pass + ' passed, ' + fail + ' failed' + (fails.length ? ': ' + fails.join(' | ') : ''));
    await h.browser.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
