/* Nov 5 2026, Calm mode (was "Still galaxy"), the browser part. Levels, words and why: galaxy-still-core.js.

   - Runs in <head>: the stored level's html classes are on before the first paint (cm-on, cm-nav, cm-bg, cm-nobg, cm-all).
   - Settings > Calm mode (community-me.js row 'galaxyStill', unchanged id) opens one sheet with one stepped choice (Off and four
     levels, each one adding to the one before). A tap applies the level at once, the sheet stays open with the tick moved, Done
     goes back to Settings. No reload, no picture, no second layout.
   - The parts that do the work read LowiGalaxyStill.level(): body-world-3d.js (world drag / pinch / travel off from level 1),
     body-world-3d-scene.js (world time and the camera's slow turn stop from 2, the scenery is not drawn from 3, from 4 the world
     is drawn only when something changes), living-bubbles.js (the glass stops turning at 4), galaxy-still.css (joystick hidden
     from 1, plain page from 3). Level 4 also pauses every endless CSS animation here (finite ones, like a sheet sliding in, are
     left alone so nothing waits forever on an animation that never ends).
   - 'lowi:calm' {level} is sent on every change. */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement, C = W.LowiGalaxyStillCore;
    if (!C || W.LowiGalaxyStill) return;
    const ls = (() => { try { return W.localStorage; } catch (e) { return null; } })();
    const get = k => { try { return ls ? ls.getItem(k) : null; } catch (e) { return null; } };
    const set = (k, v) => { try { ls.setItem(k, v); return true; } catch (e) { return false; } };
    const del = k => { try { ls.removeItem(k); } catch (e) { } };
    const lang = () => { const l = (H.lang || 'en').slice(0, 2); return C.TX[l] ? l : 'en'; };

    /* ---------- the stored level (the first Still galaxy becomes level 2 once, its pictures are removed) ---------- */
    let level = C.parse(get(C.KEY));
    const old = get(C.OLD.KEY);
    if (old != null || get(C.OLD.THUMB) != null) {
        if (level == null) { const m = C.migrate(old); if (m != null) { level = m; set(C.KEY, String(m)); } }
        del(C.OLD.KEY); del(C.OLD.THUMB);
        try { W.sessionStorage.removeItem(C.OLD.FRAME); } catch (e) { }
        try { if (W.indexedDB) W.indexedDB.deleteDatabase(C.OLD.DB); } catch (e) { }
    }
    if (level == null) level = 0;

    function paintClasses() {
        const want = C.classes(level);
        C.CLS.forEach(c => H.classList.toggle(c, want.indexOf(c) >= 0));
        H.classList.remove('gs-on', 'gs-pic', 'gs-framing');   /* the first Still galaxy's classes, never on again */
    }
    paintClasses();

    /* ---------- level 4: endless CSS animations paused ---------- */
    const paused = new Set(); let sweepT = 0;
    function endless(a) {
        try { if (!a || a.playState !== 'running' || !a.effect || typeof a.effect.getComputedTiming !== 'function') return false; return a.effect.getComputedTiming().iterations === Infinity; } catch (e) { return false; }
    }
    function sweep() {
        if (!C.allStill(level) || typeof D.getAnimations !== 'function') return 0;
        let n = 0;
        try { D.getAnimations().forEach(a => { if (endless(a)) { try { a.pause(); paused.add(a); n++; } catch (e) { } } }); } catch (e) { }
        return n;
    }
    function freeze(on) {
        clearInterval(sweepT); sweepT = 0;
        if (on) { sweep(); sweepT = setInterval(() => { if (!D.hidden) sweep(); }, 1000); return; }
        paused.forEach(a => { try { if (a.playState === 'paused') a.play(); } catch (e) { } });
        paused.clear();
    }
    if (C.allStill(level)) { if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', () => freeze(true), { once: true }); else freeze(true); }

    function w3() { return W.LowiWorld3D || null; }
    function setLevel(n) {
        n = C.clamp(n); const was = level;
        if (n === was) return level;
        level = n; set(C.KEY, String(n)); paintClasses();
        if (C.allStill(n) !== C.allStill(was)) freeze(C.allStill(n));
        try { const a = w3(); if (a && a.calmChanged) a.calmChanged(n, was); } catch (e) { }
        try { W.dispatchEvent(new CustomEvent('lowi:calm', { detail: { level: n, was } })); } catch (e) { }
        return level;
    }

    /* ---------- the sheet: one stepped choice ---------- */
    const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    function optsHtml(l) {
        let h = '';
        for (let i = 0; i <= C.MAX; i++) {
            const on = i === level;
            h += '<button type="button" class="cm-opt' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-cm="' + i + '">' +
                (i ? '<span class="cm-step" aria-hidden="true">' + i + '</span>' : '<span class="cm-step cm-step0" aria-hidden="true"></span>') +
                '<span class="cm-tx"><b>' + C.t(l, 'l' + i) + '</b><small>' + C.t(l, 'd' + i) + '</small></span><span class="cm-tick">' + CHECK + '</span></button>';
        }
        return h;
    }
    function paintSheet(ov) {
        ov.querySelectorAll('.cm-opt').forEach(b => { const on = +b.dataset.cm === level; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
    }
    function openSheet(back) {
        const l = lang(), R2 = W.LowiR2;
        if (!R2 || typeof R2.sheet !== 'function') { setLevel(level >= C.MAX ? 0 : level + 1); if (typeof back === 'function') back(); return null; }
        const ov = R2.sheet('<div class="cm-sheet" data-noi18n><h2>' + C.t(l, 'title') + '</h2><p class="cm-intro">' + C.t(l, 'intro') + '</p>' +
            '<div class="cm-list" role="radiogroup" aria-label="' + C.t(l, 'title') + '">' + optsHtml(l) + '</div>' +
            '<button type="button" class="cm-done" data-cmdone>' + C.t(l, 'done') + '</button></div>',
            { cls: 'cm-ov', onClose: () => { if (typeof back === 'function') back(); } });
        ov.addEventListener('click', e => {
            const o = e.target.closest('[data-cm]');
            if (o) { e.preventDefault(); setLevel(+o.dataset.cm); paintSheet(ov); return; }
            if (e.target.closest('[data-cmdone]')) { e.preventDefault(); try { R2.close(ov); } catch (e2) { } }
        });
        return ov;
    }

    const api = {
        level: () => level,
        set: setLevel,
        on: () => level > 0,
        navOff: () => C.navOff(level), bgStill: () => C.bgStill(level), bgGone: () => C.bgGone(level), allStill: () => C.allStill(level),
        available: () => true,
        label: l => C.t(l || lang(), 'row'), sub: l => C.t(l || lang(), 'sub'),
        status: l => { l = l || lang(); return level ? C.levelName(level, l) : C.t(l, 'off'); },
        tap: o => openSheet(o && o.back),
        openSheet,
        pausedCount: () => paused.size,
        /* the first Still galaxy's launch question; the world is always built now */
        worldAtLaunch: () => 'live'
    };
    W.LowiGalaxyStill = api;
    W.LowiCalm = api;
})();
