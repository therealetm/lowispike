/* LOWiSPIKE Dark (true black), Nov 5 2026. The fourth look beside Day, Night and Auto: everything that was navy goes black or
   neutral grey, from the 3D galaxy to every sheet, card and glass panel. Loaded in <head> right after true-black-core.js, before
   the app's own painters, so the canvas hook is in place before anything draws.
   - State: localStorage 'lowi.theme.dark' = 'black' (Dark) or 'night' (old Night). lowi.theme stays 'dark' / 'light' / 'sunrise',
     so every older switch, the Day & night slider and its tests keep working. <html data-black="1"> is set while the dark kind is
     black and the effective theme is not light (so Auto at night and the slider's night side are black too).
   - Style sheets: every same-origin rule is walked once; blue-dark colours are rewritten in place (the cascade and specificity
     stay exactly as they were). Leaving Dark restores the original values. New <style> / <link> sheets are picked up as they load.
   - Canvas: fillStyle / strokeStyle / shadowColor / gradient stops that are blue-dark are drawn neutral (cached per colour).
   - 3D world: just before each render the scene background, fog and the hemisphere light's ground colour are neutralised and
     put back right after, so season.js / atmosphere.js keep easing their own colours.
   - true-black.css carries the fixed parts: #000 page, sky gradient off, the glass at its iOS dark values, reduced transparency
     and increased contrast. API: window.LowiTrueBlack = { kind, set, on, refresh }. */
(function () {
    'use strict';
    const C = window.LowiTrueBlackCore;
    if (!C || window.LowiTrueBlack) return;
    const D = document, H = D.documentElement;
    const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
    let on = false;

    /* ---------- style sheets ---------- */
    let seen = new WeakSet(), edits = [];
    const LIGHT_MEDIA = /prefers-color-scheme\s*:\s*light/i;
    function fixStyle(st) {
        for (let i = 0; i < st.length; i++) {
            const prop = st[i], v = st.getPropertyValue(prop);
            if (!v) continue;
            const n = C.rewrite(v);
            if (n == null || n === v) continue;
            const pr = st.getPropertyPriority(prop);
            edits.push([st, prop, v, pr]);
            try { st.setProperty(prop, n, pr); } catch (e) { }
        }
    }
    function walk(rules) {
        if (!rules) return;
        for (let i = 0; i < rules.length; i++) {
            const r = rules[i];
            if (r.media && LIGHT_MEDIA.test(r.media.mediaText || '')) continue;
            if (r.selectorText != null && C.skipSelector(r.selectorText)) continue;
            if (r.style) fixStyle(r.style);
            if (r.cssRules && r.cssRules.length) walk(r.cssRules);
        }
    }
    function sweep() {
        if (!on) return;
        const list = D.styleSheets;
        for (let i = 0; i < list.length; i++) {
            const s = list[i];
            if (seen.has(s)) continue;
            const own = s.ownerNode;
            if (own && own.hasAttribute && own.hasAttribute('data-tb-keep')) { seen.add(s); continue; }
            let rules = null;
            try { rules = s.cssRules; } catch (e) { continue; } /* not loaded yet or another origin: try again on its load */
            seen.add(s);
            walk(rules);
        }
    }
    function restore() {
        for (let i = edits.length - 1; i >= 0; i--) { const [st, prop, v, pr] = edits[i]; try { st.setProperty(prop, v, pr); } catch (e) { } }
        edits = []; seen = new WeakSet();
    }
    let soon = 0;
    function sweepSoon() { if (!on || soon) return; soon = requestAnimationFrame(() => { soon = 0; sweep(); }); }
    try {
        new MutationObserver(muts => {
            for (const m of muts) for (const n of m.addedNodes) {
                if (n.nodeType !== 1) continue;
                if (n.tagName === 'LINK') { n.addEventListener('load', sweepSoon, { once: true }); sweepSoon(); }
                else if (n.tagName === 'STYLE') sweepSoon();
            }
        }).observe(D, { childList: true, subtree: true });
    } catch (e) { }
    /* a <style> whose text is replaced by JS gets a new sheet object: the next sweep sees it as new */
    D.addEventListener('load', e => { if (e.target && e.target.tagName === 'LINK') sweepSoon(); }, true);

    /* ---------- canvas ---------- */
    const cache = new Map();
    function fix(v) {
        if (!on || typeof v !== 'string') return v;
        let r = cache.get(v);
        if (r === undefined) { r = C.rewrite(v) || v; if (cache.size > 3000) cache.clear(); cache.set(v, r); }
        return r;
    }
    function hookCanvas(P) {
        if (!P || P.__tb) return;
        ['fillStyle', 'strokeStyle', 'shadowColor'].forEach(k => {
            const d = Object.getOwnPropertyDescriptor(P, k);
            if (!d || !d.set || !d.get) return;
            Object.defineProperty(P, k, { configurable: true, enumerable: d.enumerable, get: d.get, set(v) { d.set.call(this, on ? fix(v) : v); } });
        });
        P.__tb = true;
    }
    try { hookCanvas(window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype); } catch (e) { }
    try { hookCanvas(window.OffscreenCanvasRenderingContext2D && OffscreenCanvasRenderingContext2D.prototype); } catch (e) { }
    try {
        const G = window.CanvasGradient && CanvasGradient.prototype;
        if (G && !G.__tb) { const add = G.addColorStop; G.addColorStop = function (o, c) { return add.call(this, o, on ? fix(c) : c); }; G.__tb = true; }
    } catch (e) { }

    /* ---------- 3D world ---------- */
    function neutralColor(c, deep) {
        if (!c || !c.isColor || typeof c.getHex !== 'function') return false;
        const x = c.getHex(), r = x >> 16 & 255, g = x >> 8 & 255, b = x & 255;
        if (!C.isBlueDark(r, g, b)) return false;
        const l = C.hsl(r, g, b)[2], v = deep ? 0 : Math.round(Math.min(1, l * C.LIFT) * 255); /* the sky and fog: pure black */
        c.setHex((v << 16) | (v << 8) | v);
        return true;
    }
    let hooked3d = null;
    function hook3d() {
        const a = window.LowiWorld3D, rd = a && a.renderer;
        if (!rd || hooked3d === rd || typeof rd.render !== 'function') return;
        hooked3d = rd;
        const render = rd.render;
        rd.render = function (scene, cam) {
            if (!on || !scene) return render.apply(this, arguments);
            const bg = scene.background, fog = scene.fog, keep = [];
            const save = c => { if (c && c.isColor) keep.push([c, c.getHex()]); };
            save(bg); if (fog) save(fog.color);
            neutralColor(bg, true); if (fog) neutralColor(fog.color, true);
            const kids = scene.children || [];
            for (let i = 0; i < kids.length; i++) { const o = kids[i]; if (o && o.isHemisphereLight && o.groundColor) { save(o.groundColor); neutralColor(o.groundColor); } }
            try { return render.apply(this, arguments); } finally { for (let i = keep.length - 1; i >= 0; i--) keep[i][0].setHex(keep[i][1]); }
        };
    }

    /* ---------- state ---------- */
    /* Nov 5 repair: build 20261105-030004's Day/night switch saved 'night' (the blue look) on its first Day -> dark tap, without the
       person ever choosing Night. Once per device, a saved 'night' that was not picked by hand goes back to Dark. A Night picked by
       hand from now on is marked (PICKED) and stays. */
    /* Nov 5 2026: the first script that writes storage on boot, so it notes whether storage was empty before (install-guide.js
       reads window.__lowiFresh to spot a first start from the Home Screen; the writes below used to hide that). */
    try { if (window.__lowiFresh == null) window.__lowiFresh = localStorage.length === 0; } catch (e) { }
    const FIX = 'lowi.theme.dark.fix1', PICKED = 'lowi.theme.dark.picked';
    try { if (!ls.get(FIX)) { if (ls.get(C.KEY) === 'night' && !ls.get(PICKED)) ls.set(C.KEY, 'black'); ls.set(FIX, '1'); } } catch (e) { }
    /* Nov 5 2026 (owner: "let's make dark mode the universal mode for everyone, cuz it just looks better"): once per device,
       every account, new or existing, starts on true black Dark, whatever look it had (Day, Night, Auto, a slider spot).
       Runs here in <head>, before the boot scripts read lowi.theme, so the first paint is already black. The stored sky CSS
       of the old look is dropped (atmosphere.js rebuilds it for Dark). Any look picked after this stays: the flag never resets. */
    const ALL = 'lowi.theme.dark.all1';
    try {
        if (!ls.get(ALL)) {
            ls.set(C.KEY, 'black'); ls.set('lowi.theme', 'dark');
            ls.set('lowi.atmos', JSON.stringify({ mode: 'manual', p: 100 }));
            try { localStorage.removeItem('lowi.atmos.css'); localStorage.removeItem(PICKED); } catch (x) { }
            ls.set(ALL, '1');
        }
    } catch (e) { }
    const kind = () => C.kindOf(ls.get(C.KEY));
    function meta() {
        if (!on) return;
        const m = D.querySelector('meta[name="theme-color"]');
        if (m && m.getAttribute('content') !== '#000000') m.setAttribute('content', '#000000');
    }
    function sync() {
        const want = C.isOn(kind(), H.getAttribute('data-theme'));
        if (want === on) { if (on) meta(); return; }
        on = want;
        if (on) { H.setAttribute('data-black', '1'); cache.clear(); sweep(); meta(); }
        else { H.removeAttribute('data-black'); restore(); cache.clear(); }
        try { D.dispatchEvent(new CustomEvent('lowi:trueblack', { detail: { on } })); } catch (e) { }
    }
    function set(k, opts) {
        k = C.kindOf(k);
        if (k !== ls.get(C.KEY)) ls.set(C.KEY, k);
        if (opts && opts.byHand) { try { ls.set(PICKED, k); } catch (e) { } }
        sync();
    }
    try { new MutationObserver(sync).observe(H, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) { }
    try { const m = D.querySelector('meta[name="theme-color"]'); if (m) new MutationObserver(meta).observe(m, { attributes: true, attributeFilter: ['content'] }); } catch (e) { }
    D.addEventListener('DOMContentLoaded', () => {
        try { const m = D.querySelector('meta[name="theme-color"]'); if (m && !m.__tb) { m.__tb = true; new MutationObserver(meta).observe(m, { attributes: true, attributeFilter: ['content'] }); } } catch (e) { }
        sync(); sweepSoon();
    });
    window.addEventListener('load', () => { sync(); sweepSoon(); });
    window.addEventListener('storage', e => { if (e.key === C.KEY) sync(); });
    /* the 3D world is built late (and rebuilt after a lost context): look for its renderer now and then, cheaply */
    setInterval(() => { if (on) hook3d(); }, 1500);
    window.LowiTrueBlack = { kind, set, on: () => on, refresh() { sync(); if (on) { sweep(); hook3d(); } }, _edits: () => edits.length };
    sync();
})();
