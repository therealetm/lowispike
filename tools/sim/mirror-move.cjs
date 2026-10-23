'use strict';
// Oct 23, 2026, mirror-move: Mirror mode is two taps from Home (tap Move, then the Mirror bubble) and the first card of the Move page.
// Simulated phone check (browser simulation, not a real phone): tap the Move bubble on Home, the bloom's first bubble is Mirror and
// every orb of the Move bloom (home-blooms-v2) is on screen and apart; tapping Mirror closes the bloom and opens Mirror mode (no stacked layers); the Move page opens
// with the Mirror hero as its first card, in view without scrolling, in the app language, Start opens Mirror; nothing is wider than
// the screen; no page errors.
// Usage: THEME=light|dark node tools/sim/mirror-move.cjs [device] [lang] [url]
const path = require('path');
const H = require('./harness.cjs');
const device = process.argv[2] || 'iPhone 13', lang = process.argv[3] || 'en', url = process.argv[4] || '';
const theme = process.env.THEME || '';
const tag = device.replace(/\s+/g, '') + '-' + lang + (theme ? '-' + (theme === 'light' ? 'day' : 'night') : '');
const NAME = { en: 'Mirror mode', de: 'Spiegel-Modus', es: 'Modo espejo' };
const ORB = { en: 'Mirror', de: 'Spiegel', es: 'Espejo' };
let bad = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + '[' + tag + '] ' + m); if (!c) bad++; };

(async () => {
    const R = await H.open({ root: path.join(__dirname, '..', '..'), url, lang, device, members: 4, messages: 4 });
    try {
        await R.ctx.addInitScript(l => { try { if (l !== 'en') localStorage.setItem('lowispike.lang', l); } catch (e) { } }, lang);
        await R.goto(); await H.sleep(2500);
        const P = R.page;
        if (theme) { await P.evaluate(t => { try { window.LowiR2.applyTheme(t); } catch (e) { } }, theme); await H.sleep(600); }
        const mirrorOpen = () => P.evaluate(() => { const o = document.querySelector('.mm-ov'); return !!(o && !o.hidden && getComputedStyle(o).display !== 'none'); });
        const closeMirror = async () => { await P.evaluate(() => { try { window.LowiMirror.close(); } catch (e) { } }); await H.sleep(700); };

        /* tap 1: the Move bubble on Home */
        const mv = await P.evaluate(() => { const b = document.querySelector('#whHud .wh-move'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
        ok(!!mv && mv.w > 0, 'Move bubble on Home');
        if (mv) { try { await P.touchscreen.tap(mv.x, mv.y); } catch (e) { await P.mouse.click(mv.x, mv.y); } }
        await H.sleep(1200);
        let bl = await P.evaluate(() => {
            const ov = document.querySelector('.hb2-bloom.hb2-move'); if (!ov) return null;
            const orbs = [...ov.querySelectorAll('.hb2-orb')].map(o => { const r = o.getBoundingClientRect(); return { mir: o.classList.contains('hb2-mirror'), x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, l: r.left, t: r.top, r: r.right, b: r.bottom, tx: o.textContent.trim() }; });
            return { orbs, vw: innerWidth, vh: innerHeight };
        });
        if (!bl && mv) { await P.evaluate(() => { try { window.LowiHomeBloomsV2.open('move'); } catch (e) { } }); await H.sleep(1200); bl = await P.evaluate(() => { const ov = document.querySelector('.hb2-bloom.hb2-move'); if (!ov) return null; return { tapFallback: true, orbs: [...ov.querySelectorAll('.hb2-orb')].map(o => { const r = o.getBoundingClientRect(); return { mir: o.classList.contains('hb2-mirror'), x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, l: r.left, t: r.top, r: r.right, b: r.bottom, tx: o.textContent.trim() }; }), vw: innerWidth, vh: innerHeight }; }); }
        ok(!!bl && !bl.tapFallback, 'one tap on Move opens the bloom');
        if (bl) {
            ok(bl.orbs.length === 5, 'five bubbles (' + bl.orbs.length + ')');
            ok(bl.orbs[0] && bl.orbs[0].mir && bl.orbs[0].tx.includes(ORB[lang]), 'first bubble is Mirror in the app language (' + (bl.orbs[0] && bl.orbs[0].tx) + ')');
            ok(bl.orbs.every(o => o.l >= -1 && o.t >= -1 && o.r <= bl.vw + 1 && o.b <= bl.vh + 1), 'every bubble on screen');
            let apart = true; for (let i = 0; i < bl.orbs.length; i++) for (let j = i + 1; j < bl.orbs.length; j++) if (Math.hypot(bl.orbs[i].x - bl.orbs[j].x, bl.orbs[i].y - bl.orbs[j].y) < bl.orbs[i].w * 0.9) apart = false;
            ok(apart, 'bubbles do not overlap');
            /* tap 2: Mirror */
            const m = bl.orbs.find(o => o.mir);
            if (m) { try { await P.touchscreen.tap(m.x, m.y); } catch (e) { await P.mouse.click(m.x, m.y); } }
            await H.sleep(1500);
            const st = await P.evaluate(() => ({ bloom: [...document.querySelectorAll('.hb2-bloom.hb2-move')].some(b => b.classList.contains('on')) }));
            ok(await mirrorOpen(), 'second tap opens Mirror mode');
            ok(!st.bloom, 'the bloom is closed under Mirror (no stacked layers)');
            await closeMirror();
        }

        /* the Move page: Mirror hero first */
        await P.evaluate(() => { try { window.LowiMoveBubble.page(); } catch (e) { } }); await H.sleep(1800);
        const pg = await P.evaluate(() => {
            const s = document.querySelector('#mv-screen'); if (!s) return null;
            const hero = s.querySelector('.mm-hero'), quick = s.querySelector('.mv-hero'), head = s.querySelector('.mv-head');
            if (!hero) return { hero: false };
            const r = hero.getBoundingClientRect(), go = hero.querySelector('.mm-hero-go').getBoundingClientRect(), vw = innerWidth;
            const wide = [...s.querySelectorAll('*')].filter(e => { const q = e.getBoundingClientRect(); return q.width && q.right > vw + 1; }).length;
            return {
                hero: true, before: !!(quick && hero.compareDocumentPosition(quick) & 4), afterHead: !!(head && head.compareDocumentPosition(hero) & 4),
                strip: !!s.querySelector('.mm-strip'), name: hero.querySelector('.mm-hero-tx b').textContent.trim(), goIn: go.bottom <= innerHeight && go.top >= 0,
                goH: Math.round(go.height), clipped: [...hero.querySelectorAll('b, .mm-hero-line, .mm-hero-go span')].some(e => e.scrollWidth > e.clientWidth + 1),
                wide, sw: document.documentElement.scrollWidth > vw + 1, top: Math.round(r.top)
            };
        });
        ok(!!pg && pg.hero, 'Mirror hero on the Move page');
        if (pg && pg.hero) {
            ok(pg.afterHead && pg.before, 'first card, right under the header, before the quick session');
            ok(!pg.strip, 'no second Mirror strip lower down');
            ok(pg.name === NAME[lang], 'name in the app language (' + pg.name + ')');
            ok(pg.goIn && pg.goH >= 44, 'Start is on screen without scrolling and big enough to tap (' + pg.goH + ' px, top ' + pg.top + ')');
            ok(!pg.clipped, 'no clipped words');
            ok(pg.wide === 0 && !pg.sw, 'nothing wider than the screen (' + pg.wide + ')');
            await P.evaluate(() => { const b = document.querySelector('#mv-screen .mm-hero-go'); b && b.click(); }); await H.sleep(1500);
            ok(await mirrorOpen(), 'Start opens Mirror mode');
            await closeMirror();
        }
        const errs = R.errs.filter(e => !/supabase|realtime|websocket|getUserMedia|NotAllowed|NotFound|camera|mediapipe|vision_bundle|wasm/i.test(e.m));
        ok(errs.length === 0, 'no page errors (' + errs.length + ')'); if (errs.length) console.log(JSON.stringify(errs.slice(0, 4)).slice(0, 1200));
    } catch (e) { ok(false, e.message.slice(0, 300)); } finally { await R.close(); }
    console.log(bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
    process.exit(bad ? 1 : 0);
})();
