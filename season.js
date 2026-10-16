/* LOWiSPIKE seasonal themes (Oct 15, 2026): the world changes look with the season, automatically by date.
   - <html data-season="autumn" data-season-phase="peak"> + --ssn-a/--ssn-b/--ssn-c, so CSS (season.css) tints the Home
     background, the living cell (.cw-env), the 3D window frame and the cell room (.cr-scene). Night/Cloud/Sunrise all work.
   - #ssnSky: one layer behind every screen (next to the weather sky) with a seasonal wash + a few drifting leaves/petals/
     flakes/pollen (<= 10 DOM particles, transform/opacity only, none with reduced motion). Takes no touches.
   - 3D: inside the ONE shared world (window.LowiWorld3D) only. No particles in the body (Oct 15: no leaves inside you);
     it only lerps the hub fog/background toward the season haze in onFrame (after world health). Never in a region (regions keep
     their hue), never during a cell ride, never a second WebGL context.
   - No setting, no reward, no countdown. ?season=winter (dev) previews another season. */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement;
    if (W.LowiSeason) return;
    const C = W.LowiSeasonCore;
    if (!C) { console.warn('season-core missing'); return; }
    const me = D.currentScript || D.querySelector('script[src*="season.js"]');
    if (!D.getElementById('ssnCss')) {
        const l = D.createElement('link'); l.id = 'ssnCss'; l.rel = 'stylesheet';
        l.href = me && me.getAttribute('src') ? me.getAttribute('src').replace('season.js', 'season.css') : 'season.css';
        D.head.appendChild(l);
    }
    const mqReduce = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    const themeNow = () => (H.dataset.theme === 'light' ? 'light' : 'dark');
    function forced() {
        try { const m = /[?&]season=(spring|summer|autumn|winter)(?:[-:](early|peak|late))?/.exec(location.search); return m ? { force: m[1], phase: m[2] } : {}; } catch (e) { return {}; }
    }
    let cur = null, layer = null, layerSig = '', themeSig = '';

    function now() { return C.season(Date.now(), forced()); }

    /* ---------- html attributes + css vars ---------- */
    function paintVars() {
        if (!cur) return;
        const L = C.look(cur, themeNow());
        H.style.setProperty('--ssn-a', L.a); H.style.setProperty('--ssn-b', L.b); H.style.setProperty('--ssn-c', L.c);
        themeSig = themeNow();
    }
    function apply() {
        const s = now();
        const changed = !cur || cur.key !== s.key;
        cur = s;
        if (changed) { H.dataset.season = s.id; H.dataset.seasonPhase = s.phase; paintVars(); try { W.dispatchEvent(new CustomEvent('lowi:season', { detail: s })); } catch (e) {} }
        else if (themeSig !== themeNow()) paintVars();
        build();
        hook3d();
        return s;
    }

    /* ---------- 2D layer behind every screen ---------- */
    function build() {
        const app = D.getElementById('app');
        if (!app || !cur) return null;
        const wet = /^(rain|drizzle|storm|snow)$/.test(H.dataset.wxCond || '');
        const n = C.counts({ w: W.innerWidth, reduced: mqReduce.matches, phase: cur.phase, wet }).dom;
        const sig = cur.key + '|' + n;
        if (layer && layer.parentNode === app && sig === layerSig) return layer;
        layer = D.getElementById('ssnSky') || D.createElement('div');
        layer.id = 'ssnSky'; layer.setAttribute('aria-hidden', 'true');
        const ps = C.particles(n, cur.id.length * 97 + 11);
        layer.innerHTML = '<i class="ssn-wash"></i><i class="ssn-glow"></i>' + ps.map(p => '<i class="ssn-p ssn-t' + p.tone + '" style="--x:' + p.x + '%;--d:' + p.delay + 's;--t:' + p.dur + 's;--s:' + p.size + 'px;--w:' + p.sway + 'px;--r:' + p.spin + 'deg"></i>').join('');
        const wx = D.getElementById('wxSky');
        if (wx && wx.parentNode === app) app.insertBefore(layer, wx.nextSibling); else app.insertBefore(layer, app.firstChild);
        layerSig = sig;
        return layer;
    }

    /* ---------- 3D: a season haze on the bloodstream fog (no particles inside the body) ---------- */
    let world3d = null, motes = null, offFrame = null, moteSig = '', haze = null;
    /* clears motes an older build may have left in the hub */
    function disposeMotes() {
        if (!motes) return;
        try { motes.parent && motes.parent.remove(motes); motes.geometry.dispose(); motes.material.map && motes.material.map.dispose(); motes.material.dispose(); } catch (e) {}
        motes = null; moteSig = '';
    }
    /* Oct 15 (user): leaves make no sense inside the body. The season stays outside (Home #ssnSky, cell light, frame) and
       only a soft haze tints the bloodstream fog; no leaves/petals/flakes/pollen are ever added to the 3D body world. */
    function buildMotes() {
        const a = world3d; if (!a || !cur) return;
        const th = themeNow(), sig = cur.key + '|' + th;
        if (haze && sig === moteSig) return;
        disposeMotes();
        const L = C.look(cur, th);
        /* Oct 16: the world stays silvery dark blue (brand); the season only nudges it, never turns it orange or red */
        if (a.THREE) { haze = new a.THREE.Color(L.haze).lerp(new a.THREE.Color(th === 'light' ? '#8ea3c2' : '#1a2846'), 0.85); haze.amt = L.amt; moteSig = sig; }
    }
    function inRegion(a) { try { return !!(a.hub && a.camera && !a.hub.layers.test(a.camera.layers)); } catch (e) { return false; } }
    let tAcc = 0;
    function frame(dt) {
        const a = world3d; if (!a || !a.scene || !cur) return;
        dt = dt > 1 ? dt / 1000 : dt; if (!(dt > 0)) dt = 1 / 60; dt = Math.min(dt, 0.05);
        tAcc += dt;
        if (!haze || moteSig !== cur.key + '|' + themeNow()) buildMotes();
        if (inRegion(a)) return;
        /* season haze on top of the base + world-health colour; the regions build sets its own look when inside */
        const bg = a.scene.background, f = a.scene.fog;
        if (haze && bg && bg.isColor) { bg.lerp(haze, haze.amt); if (f && f.color) f.color.copy(bg); }
    }
    function hook3d() {
        const a = W.LowiWorld3D;
        if (!a || typeof a.onFrame !== 'function') return;
        if (!offFrame) { offFrame = a.onFrame(frame) || null; world3d = a; }
        if (a.ready && a.hub && a.THREE) { world3d = a; buildMotes(); }
    }

    function boot() {
        apply();
        W.addEventListener('lowi:world3d-ready', () => { world3d = W.LowiWorld3D; hook3d(); buildMotes(); });
        new MutationObserver(() => { if (cur && themeSig !== themeNow()) paintVars(); }).observe(H, { attributes: true, attributeFilter: ['data-theme'] });
        const app = D.getElementById('app');
        if (app) new MutationObserver(() => { if (!layer || layer.parentNode !== app) { layerSig = ''; build(); } }).observe(app, { childList: true });
        if (mqReduce.addEventListener) mqReduce.addEventListener('change', () => { layerSig = ''; build(); });
        D.addEventListener('visibilitychange', () => { if (!D.hidden) apply(); });
        W.addEventListener('resize', () => { build(); });
        setInterval(() => { if (!D.hidden) apply(); }, 10 * 60000);
        /* the app shell may mount #app or the 3D world a moment later */
        let tries = 0; const t = setInterval(() => { apply(); if (++tries > 20 || (layer && layer.isConnected && world3d)) clearInterval(t); }, 500);
    }
    W.LowiSeason = { now: () => (cur ? Object.assign({}, cur) : now()), apply, look: () => (cur ? C.look(cur, themeNow()) : null), get motes() { return motes ? motes.geometry.attributes.position.count : 0; } };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
