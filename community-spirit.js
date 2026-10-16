/* Oct 16, 2026 (handoff task 1): the Metabolic Spirit World behind Community.
   E-man: "use the picture as inspiration and expand the world", not as a wallpaper. Community's backdrop is the live world itself,
   zoomed out past our own membrane bubble into the spirit world, where everyone's bubbles hang in connective tissue
   (body-world-3d-scene.js draws it, in the picture's deep navy, blues, pale cyan and soft lavender). One continuous camera:
   Today (Misty close up) -> World Map (the same world from above) -> Community (out past our bubble, among the others).
   Three layers on Community: the live world (bottom, never takes a tap), the companions (cgField), the UI.
   This file adds only:
   - a dark veil at the top and bottom of the Community page, so names, the chat and the tab bar stay readable over the world;
   - galaxy-zoom.js drives the veil with the zoom out (it comes in as the camera leaves our bubble) and the way back down;
   - whichever way Community is opened (the Today warp, the tab bar from Cook, a swipe), the camera goes out to the spirit
     world, and every other page brings it back down into Misty's world (body-world-3d.js syncBack).
   Nothing else on Community is touched: the companions, names, auras, status dots, spots, gestures, chat and glass stay as they are. */
(function (W) {
    'use strict';
    const D = W.document; if (!D) return;
    const H = D.documentElement;
    const FAR = 1.18;
    let layer = null, driving = false;
    function build() {
        if (layer && layer.isConnected) return layer;
        const tab = D.getElementById('tab-foryou'); if (!tab) return null;
        layer = D.getElementById('cgSpirit');
        if (!layer) {
            layer = D.createElement('div'); layer.id = 'cgSpirit'; layer.className = 'cg-spirit'; layer.setAttribute('aria-hidden', 'true');
            layer.innerHTML = '<div class="cg-spirit-veil"></div>';
        }
        if (layer.parentElement !== tab || tab.firstChild !== layer) tab.insertBefore(layer, tab.firstChild);
        H.classList.add('cg-spirit-on');
        return layer;
    }
    /* galaxy-zoom.js: k runs 0 -> 1 over the move. 'out' = Home -> Community, 'in' = Community -> Home. */
    function paint(dir, k) {
        const L = build(); if (!L) return;
        k = Math.max(0, Math.min(1, +k || 0)); driving = true;
        const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
        let o, s;
        if (dir === 'out') { o = sm(0.18, 0.8, k); s = FAR - (FAR - 1) * (1 - Math.pow(1 - k, 3)); }
        else { o = 1 - sm(0, 0.5, k); s = 1 + (FAR - 1) * (k * k); }
        L.style.opacity = o >= 0.999 ? '' : o.toFixed(3);
        L.style.setProperty('--sp-s', s.toFixed(4));
    }
    function clear() { driving = false; if (layer) { layer.style.opacity = ''; layer.style.removeProperty('--sp-s'); } }
    function boot() { if (!build()) { setTimeout(boot, 400); } }
    W.LowiSpiritWorld = { paint, clear, build, FAR, driving: () => driving };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : globalThis);
