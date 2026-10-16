/* LOWiSPIKE · the Metabolic Spirit World behind Cook, Move and Scan: pure rules (Oct 16, 2026).
   E-man: Cook, Move and the visible part of Scan use the SAME background as the expanded Community world (the gathering of
   metabolic spirits: translucent world-bubbles linked by threads of light), so the whole app outside Today reads as one place.
   Today/Home is not touched: it keeps Misty's own living world.
   This file has no DOM: which pages show the realm, how it comes in, when the Scan camera asks, and the drifting motes. */
(function (root) {
    'use strict';
    /* the pages that sit in the realm (Community has its own copy of the same picture, LowiSpiritWorld, inside its page) */
    const PAGES = ['tab-shelf', 'tab-move', 'tab-scan'];
    const COMMUNITY = 'tab-foryou', HOME = 'tab-home';
    /* Scan: the world shows first; the glass camera prompt follows after about a second */
    const ASK_DELAY = 1000;
    /* coming in from Today: from a little further away, as on the way out to Community (community-spirit.js FAR = 1.18) */
    const FAR = 1.08, ARRIVE_MS = 650, LEAVE_MS = 450;

    const isPage = id => PAGES.indexOf(id) >= 0;
    /* s: { active: id of the active page, zoom: Home<->Community warp running (gx-out/gx-in),
            sliding: ids of pages mid-slide (lg-out/lg-in/lg-peek) }
       The realm shows on Cook, Move and Scan. On Community it is hidden (Community's own picture covers the page), except while a
       Cook/Move/Scan page is still sliding away, so the wallpaper under both pages stays the same picture. Never during the warp
       between Home and Community: there the live 3D camera itself pulls out. */
    function want(s) {
        s = s || {};
        if (s.zoom) return false;
        if (isPage(s.active)) return true;
        if (s.active === COMMUNITY) return (s.sliding || []).some(isPage);
        return false;
    }
    /* how the realm turns on or off between two states.
       'arrive' = from Today: fade in while settling from FAR to 1. 'instant' = the same picture was already on screen (Community's
       copy) or nobody can see the change. 'fade' = going back to Today: Misty's world shows through as it fades. */
    function change(prev, next, on) {
        if (on) return prev === COMMUNITY ? 'instant' : (prev === HOME ? 'arrive' : 'fade');
        return next === HOME ? 'fade' : 'instant';
    }
    /* Scan camera start. perm: Permissions API state for 'camera' ('granted' | 'prompt' | 'denied'), or '' when unknown.
       granted: start at once; the world stays visible until the first camera frame plays, then the feed fades in over it.
       denied: after the delay the normal start runs and shows the existing "camera is off" card (no system prompt can appear).
       prompt / unknown: after the delay the glass card asks first; the system prompt comes only after the user's tap. */
    function gate(perm) {
        if (perm === 'granted') return { act: 'start', delay: 0 };
        if (perm === 'denied') return { act: 'start', delay: ASK_DELAY };
        return { act: 'ask', delay: ASK_DELAY };
    }
    /* small seeded random so the motes sit in the same places on every launch (no reshuffle between pages) */
    function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
    /* the picture's own colours: Misty blue, violet, green, amber */
    const HUES = [205, 268, 150, 32];
    /* drifting motes of light: positions in % of the screen, size in px, a slow rise with a little sideways sway */
    function motes(n, seed) {
        const r = rng(seed || 7), out = [];
        n = Math.max(0, Math.min(40, n | 0));
        for (let i = 0; i < n; i++) {
            out.push({
                x: +(4 + r() * 92).toFixed(1), y: +(8 + r() * 84).toFixed(1),
                s: +(2 + r() * 3.5).toFixed(1),
                dx: +((r() - 0.5) * 36).toFixed(1), dy: +(24 + r() * 60).toFixed(1),
                dur: +(14 + r() * 16).toFixed(1), delay: -(+(r() * 30).toFixed(1)),
                hue: HUES[i % HUES.length], a: +(0.45 + r() * 0.45).toFixed(2)
            });
        }
        return out;
    }
    /* fewer motes on a small phone, more on an iPad; none with reduced motion (the picture alone is enough) */
    function moteCount(w, h, reduced) { if (reduced) return 0; const a = Math.max(0, w) * Math.max(0, h); return a > 700000 ? 22 : a > 330000 ? 16 : 12; }

    const api = { PAGES, COMMUNITY, HOME, ASK_DELAY, FAR, ARRIVE_MS, LEAVE_MS, isPage, want, change, gate, motes, moteCount, HUES };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiRealmCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
