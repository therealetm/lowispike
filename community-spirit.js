/* Oct 16, 2026 (handoff task 1): the Metabolic Spirit World behind Community.
   E-man's own picture replaces ONLY Community's generic outer-space backdrop. It is the third and farthest zoom of the one world:
   Today (Misty close up) -> World Map (the same world from above) -> Community (out past our own bubble, where everyone's
   bubbles gather). Three layers on Community: this picture (bottom, never takes a tap), the companions (cgField), the UI.
   - fills the whole screen behind the chat, the nav and the tab bar; object-fit: cover, so it never stretches;
   - a dark veil keeps names and the chat readable;
   - galaxy-zoom.js drives it while the camera pulls out of Home (it fades in while it shrinks from 1.18 to 1, so it reads as
     coming into view from far away) and reverses it on the way back down;
   - a light parallax: it drifts at a tenth of the companions' map pan, and not at all with prefers-reduced-motion.
   Nothing else on Community is touched: the companions, names, auras, status dots, spots, gestures, chat and glass stay as they are. */
(function (W) {
    'use strict';
    const D = W.document; if (!D) return;
    const H = D.documentElement;
    const IMG = 'spirit/metabolic-spirit-world', FAR = 1.18;
    const reduced = () => !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let layer = null, raf = 0, px = 0, py = 0, driving = false;
    function build() {
        if (layer && layer.isConnected) return layer;
        const tab = D.getElementById('tab-foryou'); if (!tab) return null;
        layer = D.getElementById('cgSpirit');
        if (!layer) {
            layer = D.createElement('div'); layer.id = 'cgSpirit'; layer.className = 'cg-spirit'; layer.setAttribute('aria-hidden', 'true');
            /* the phone file is a full-height centre crop of the same picture (sharper on a tall screen); iPad and wider get the whole picture */
            layer.innerHTML = '<div class="cg-spirit-pan"><picture>' +
                '<source type="image/webp" media="(max-aspect-ratio: 3/4)" srcset="' + IMG + '-phone.webp">' +
                '<source type="image/webp" srcset="' + IMG + '.webp">' +
                '<source media="(max-aspect-ratio: 3/4)" srcset="' + IMG + '-phone.jpg">' +
                '<img class="cg-spirit-img" src="' + IMG + '.jpg" alt="" decoding="async" draggable="false">' +
                '</picture></div><div class="cg-spirit-veil"></div>';
        }
        if (layer.parentElement !== tab || tab.firstChild !== layer) tab.insertBefore(layer, tab.firstChild);
        H.classList.add('cg-spirit-on');
        return layer;
    }
    function onCommunity() { const t = D.querySelector('.tab.active'); return !!(t && t.id === 'tab-foryou'); }
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
    /* parallax: follow the Community map camera at a tenth of its pan, eased; only while Community is on screen */
    function loop() {
        raf = 0; if (!layer || !onCommunity() || D.hidden || reduced()) { if (layer && !reduced()) {} return; }
        let tx = 0, ty = 0;
        try { const M = W.LowiCgMap, c = M && M.cam && M.cam(); if (c && isFinite(c.x) && isFinite(c.y)) { tx = Math.max(-18, Math.min(18, -c.x * 0.1)); ty = Math.max(-18, Math.min(18, -c.y * 0.1)); } } catch (e) { }
        px += (tx - px) * 0.12; py += (ty - py) * 0.12;
        layer.style.setProperty('--sp-x', px.toFixed(2) + 'px'); layer.style.setProperty('--sp-y', py.toFixed(2) + 'px');
        raf = W.requestAnimationFrame(loop);
    }
    function sync() { build(); if (onCommunity() && !raf && !reduced() && W.requestAnimationFrame) raf = W.requestAnimationFrame(loop); }
    function boot() {
        if (!build()) { setTimeout(boot, 400); return; }
        sync();
        if (typeof MutationObserver !== 'undefined') { const m = D.getElementById('main'); if (m) new MutationObserver(() => sync()).observe(m, { attributes: true, attributeFilter: ['class'], subtree: true }); }
        D.addEventListener('visibilitychange', sync);
    }
    W.LowiSpiritWorld = { paint, clear, build, FAR, image: IMG, driving: () => driving };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : globalThis);
