#!/usr/bin/env node
/* Gap bubbles check (28 Oct 2026, 22:54). Emmanuel on the call: "They're supposed to be bubbles ... just like when you click on
   sleep or water ... or move", "nuke that window"; the long press (Nach dem Essen) stays. This opens the app and walks it with a
   finger: tap Gap -> two orbs (Letzte Mahlzeit / Erste Mahlzeit), no Essenspause window; Erste Mahlzeit -> its times as orbs;
   Jetzt -> the timer stops; Letzte Mahlzeit -> vor 30 min -> the timer runs from 30 minutes ago; Letzte Mahlzeit -> Andere Zeit
   (the time input) -> the start moves; hold Gap -> Nach dem Essen (phases), no orbs; every orb on screen and off Misty; page errors.
   Screenshots in --out.
   node tools/check-gap-bloom.cjs [--engine chromium|webkit] [--lang de|en|es] [--w 390 --h 844] [--url <live index.html>]
   Simulated browser, not a physical iPhone. */
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const engine = arg('engine', 'chromium'), lang = arg('lang', 'de'), url = arg('url', ''), out = arg('out', '/tmp/gap-bloom-check');
const W = +arg('w', 390), Hh = +arg('h', 844);
require('fs').mkdirSync(out, { recursive: true });
const res = []; const ok = (name, pass, info) => { res.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); };
(async () => {
    const R = await H.open({ engine, lang, url, probe: false, fresh: false, viewport: { width: W, height: Hh } });
    const P = R.page;
    await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); } catch (e) { } }, lang);
    await R.goto();
    await H.sleep(6000);
    const shot = n => R.shot(out + '/' + n + '-' + engine + '-' + lang + '-' + W + '.png');
    const state = () => P.evaluate(() => {
        const bloom = document.getElementById('hb2Bloom');
        const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 4 && s.visibility !== 'hidden' && s.display !== 'none'; };
        const m = document.querySelector('#whHud [data-orbit="misty"], #whMisty, .wh-misty');
        const mr = m ? m.getBoundingClientRect() : null;
        const orbs = bloom ? [...bloom.querySelectorAll('.hb2-orb')].map(o => { const r = o.getBoundingClientRect(); return { id: o.dataset.id, tag: o.tagName, label: (o.querySelector('b') || {}).textContent || '', sub: (o.querySelector('small') || {}).textContent || '', on: o.classList.contains('hb2-on'), x: r.left, y: r.top, w: r.width, h: r.height, inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; }) : [];
        const note = bloom && bloom.querySelector('.hb2-note');
        const gv = document.getElementById('gvSheet');
        let mode = ''; try { mode = window.LowiGapView && LowiGapView.isOpen && LowiGapView.isOpen() ? (LowiGapView.mode ? LowiGapView.mode() : 'open') : ''; } catch (e) { }
        const F = window.LowiFastStop;
        return { kind: bloom && bloom.dataset.kind, orbs, note: note ? note.textContent : '', gapView: !!(gv && vis(gv)) && mode, mode, start: F ? F.startOf() : -1, misty: mr && { x: mr.left + mr.width / 2, y: mr.top + mr.height / 2, r: mr.width / 2 } };
    });
    const tapOrb = async id => { await H.sleep(700); await R.tap('#hb2Bloom .hb2-orb[data-id="' + id + '"]'); await H.sleep(900); };
    const close = async () => { await P.evaluate(() => { try { LowiHomeBloomsV2.close(); } catch (e) { } try { LowiGapView.close(); } catch (e) { } }); await H.sleep(900); };
    /* a running timer, last meal 3 h 40 min ago, like his screenshot */
    await P.evaluate(() => {
        const t = Date.now() - 220 * 60000;
        try { if (LowiFastStop.startOf() > 0) LowiFastEdit.save(t); else LowiFastStop.firstMeal(t); } catch (e) { }
    });
    await H.sleep(800);
    const start0 = (await state()).start;
    ok('setup: timer running about 3 h 40 min', start0 > 0 && Math.abs(Date.now() - 220 * 60000 - start0) < 120000, new Date(start0).toTimeString().slice(0, 5));

    /* 1. tap Gap */
    await close();
    await R.tap('[data-orbit="gap"]');
    await H.sleep(1300);
    let s = await state();
    await shot('1-tap-gap');
    ok('tap Gap: the bloom opens on Gap', s.kind === 'gap', s.kind);
    ok('tap Gap: no Essenspause window', !s.gapView, s.mode);
    ok('tap Gap: two orbs, Letzte / Erste Mahlzeit', JSON.stringify(s.orbs.map(o => o.id)) === '["g-last","g-first"]', s.orbs.map(o => o.label + (o.sub ? ' ' + o.sub : '')));
    ok('tap Gap: Letzte Mahlzeit marked with its time', s.orbs[0] && s.orbs[0].on && /\d\d:\d\d/.test(s.orbs[0].sub), s.orbs[0]);
    ok('tap Gap: every orb on screen', s.orbs.every(o => o.inside), s.orbs.map(o => [o.id, Math.round(o.x), Math.round(o.y)]));
    ok('tap Gap: no orb on Misty', !s.misty || s.orbs.every(o => Math.hypot(o.x + o.w / 2 - s.misty.x, o.y + o.h / 2 - s.misty.y) > s.misty.r + o.w / 2 - 2), s.misty);
    console.log('  note:', s.note);

    /* 2. Erste Mahlzeit -> times */
    await tapOrb('g-first');
    s = await state();
    await shot('2-erste-times');
    ok('Erste Mahlzeit: its times as orbs', s.kind === 'gap' && s.orbs.length === 5 && s.orbs[4].id === 'g-other', s.orbs.map(o => o.label + (o.sub ? ' ' + o.sub : '')));
    ok('Erste Mahlzeit: still running (opening the times changes nothing)', s.start === start0);
    ok('Erste Mahlzeit: times on screen', s.orbs.every(o => o.inside));
    ok('Andere Zeit is a label with a time input', s.orbs[4] && s.orbs[4].tag === 'LABEL' && await P.evaluate(() => !!document.querySelector('#hb2Bloom .hb2-orb[data-id="g-other"] input[type="time"]')));
    console.log('  note:', s.note);

    /* 3. Jetzt -> stopped */
    await tapOrb('g-t0');
    await H.sleep(1200);
    s = await state();
    await shot('3-stopped');
    ok('Jetzt: the timer stopped', s.start === 0, s.start);
    ok('Jetzt: the bloom folded, no window', !s.kind && !s.gapView, { kind: s.kind, gv: s.gapView });
    await P.evaluate(() => { try { document.querySelectorAll('.lc-ov, .r2-ov.on').forEach(() => { }); LowiR2 && LowiR2.closeAll && LowiR2.closeAll(); } catch (e) { } });
    await H.sleep(1500);

    /* 4. stopped: tap Gap, Erste Mahlzeit marked; Letzte Mahlzeit -> vor 30 min */
    await close();
    await R.tap('[data-orbit="gap"]');
    await H.sleep(1300);
    s = await state();
    await shot('4-stopped-bloom');
    ok('stopped: Erste Mahlzeit marked with its time', s.orbs[1] && s.orbs[1].on && /\d\d:\d\d/.test(s.orbs[1].sub), s.orbs.map(o => o.label + ' ' + o.sub + (o.on ? ' (on)' : '')));
    console.log('  note:', s.note);
    await tapOrb('g-last');
    s = await state();
    ok('Letzte Mahlzeit: its times', s.orbs.length === 5, s.orbs.map(o => o.label));
    const t30 = Date.now() - 30 * 60000;
    await tapOrb('g-t30');
    await H.sleep(800);
    s = await state();
    await shot('5-started-30');
    ok('vor 30 min: timer runs from 30 minutes ago', s.start > 0 && Math.abs(s.start - t30) < 120000, new Date(s.start).toTimeString().slice(0, 5));
    ok('vor 30 min: folded', !s.kind && !s.gapView);

    /* 5. running: Letzte Mahlzeit -> Andere Zeit (the input) -> start moves */
    await close();
    await R.tap('[data-orbit="gap"]');
    await H.sleep(1300);
    await tapOrb('g-last');
    const want = await P.evaluate(() => { const d = new Date(Date.now() - 95 * 60000); const p = n => String(n).padStart(2, '0'); return p(d.getHours()) + ':' + p(d.getMinutes()); });
    await H.sleep(700);
    await R.tap('#hb2Bloom .hb2-orb[data-id="g-other"]').catch(e => console.log('tap other', e.message));
    await H.sleep(500);
    s = await state();
    ok('Andere Zeit: tapping it keeps the bloom (picker opens)', s.kind === 'gap', s.kind);
    await P.evaluate(v => { const i = document.querySelector('#hb2Bloom .hb2-time'); i.focus(); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); i.blur(); }, want);
    await H.sleep(1200);
    s = await state();
    await shot('6-other-time');
    ok('Andere Zeit ' + want + ': the start moved there', s.start > 0 && new Date(s.start).toTimeString().slice(0, 5) === want, new Date(s.start).toTimeString().slice(0, 5));
    ok('Andere Zeit: folded', !s.kind);

    /* 6. hold Gap -> Nach dem Essen (phases), no bloom */
    await close();
    await H.sleep(1000);
    const box = await P.locator('[data-orbit="gap"]').first().boundingBox();
    const cdp = engine === 'chromium' ? await P.context().newCDPSession(P) : null;
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    if (cdp) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await H.sleep(900);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
        await P.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true }; e.dispatchEvent(new PointerEvent('pointerdown', o)); window.__gbE = e; window.__gbO = o; }, [x, y]);
        await H.sleep(900);
        await P.evaluate(() => { window.__gbE.dispatchEvent(new PointerEvent('pointerup', window.__gbO)); });
    }
    await H.sleep(1500);
    s = await state();
    await shot('7-hold-phases');
    ok('hold Gap: Nach dem Essen (phases)', s.mode === 'phases', s.mode);
    ok('hold Gap: no orbs', !s.kind, s.kind);
    const txt = await P.evaluate(() => { const g = document.getElementById('gvSheet'); return g ? g.innerText.slice(0, 300) : ''; });
    ok('hold Gap: no meal buttons, no stats', !/Mahlzeit eintragen|Kochen|Heutige Stats|Erste Mahlzeit: jetzt/.test(txt), txt.replace(/\s+/g, ' ').slice(0, 160));
    await close();

    ok('no page errors', !R.errs.length, R.errs.slice(0, 4));
    const bad = res.filter(r => !r.pass);
    console.log(bad.length ? 'FAILED ' + bad.length + ' of ' + res.length : 'ALL ' + res.length + ' PASS');
    await R.close();
    process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
