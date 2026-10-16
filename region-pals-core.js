/* LOWiSPIKE region companions core (Oct 16, 2026; handoff task 10). Pure data and maths, no DOM (node tests load it).
   E-man: inside Gut, Pancreas, Brain and the other regions, each place gets its own small glass companion creature. It swims
   along with you and tells you about the place in a Misty-style speech bubble, instead of the leftover gold info cards.
   Rules: these are guides, not pets. No collection, no XP, no microbe buddies (the gut guide is a villus, a fold of the gut
   wall, not a microbe). Misty stays the blue comet and the only companion with an XP ledger. Facts come from arrival-core.js
   (the reviewed place facts); this file adds only names, shapes and the greeting. */
(function (root) {
    'use strict';
    /* shape: drawn by region-pals.js as a small inline SVG inside a glass orb; rgb: the region's light (body-world-regions.js) */
    const PALS = {
        brain: { shape: 'spark', rgb: '28,247,249', name: ['Spark', 'Funke', 'Chispa'], kind: ['a little nerve-spark', 'ein kleiner Nervenfunke', 'una chispa nerviosa'] },
        lung: { shape: 'puff', rgb: '168,224,255', name: ['Puff', 'Hauch', 'Soplo'], kind: ['a little air sac', 'ein kleines Lungenbl\u00e4schen', 'un alv\u00e9olo peque\u00f1o'] },
        heart: { shape: 'beat', rgb: '241,71,112', name: ['Pulse', 'Puls', 'Pulso'], kind: ['a little heartbeat', 'ein kleiner Herzschlag', 'un latido peque\u00f1o'] },
        liver: { shape: 'hex', rgb: '231,134,49', name: ['Hexa', 'Hexa', 'Hexa'], kind: ['a little liver cell', 'eine kleine Leberzelle', 'una celulita del h\u00edgado'] },
        pancreas: { shape: 'islet', rgb: '248,234,64', name: ['Isla', 'Isla', 'Isla'], kind: ['a little islet', 'eine kleine Zellinsel', 'un islote peque\u00f1o'] },
        gut: { shape: 'villus', rgb: '46,248,182', name: ['Villo', 'Zotti', 'Velli'], kind: ['a little villus from your gut wall', 'eine kleine Zotte deiner Darmwand', 'una vellosidad de tu pared intestinal'] },
        muscle: { shape: 'fibre', rgb: '159,235,37', name: ['Flex', 'Flex', 'Flex'], kind: ['a little muscle fibre', 'eine kleine Muskelfaser', 'una fibra muscular'] }
    };
    const IDS = Object.keys(PALS);
    const ALIAS = { lungs: 'lung', muscles: 'muscle', intestine: 'gut', darm: 'gut' };
    const pid = id => { id = String(id || '').toLowerCase(); id = ALIAS[id] || id; return PALS[id] ? id : null; };
    const li3 = li => (li === 0 || li === 1 || li === 2) ? li : ({ en: 0, de: 1, es: 2 }[String(li || '').slice(0, 2)] ?? 1);
    const COPY = {
        hi: ['Hi, I\u2019m {n}, {k}. I\u2019ll swim along with you here.', 'Hallo, ich bin {n}, {k}. Ich schwimme hier mit dir mit.', 'Hola, soy {n}, {k}. Nadar\u00e9 contigo por aqu\u00ed.'],
        tap: ['Tap me for more.', 'Tipp mich an f\u00fcr mehr.', 'T\u00f3came para saber m\u00e1s.'],
        aria: ['{n}, your guide here. Tap for a fact.', '{n}, dein Guide hier. Tippen f\u00fcr einen Fakt.', '{n}, tu gu\u00eda aqu\u00ed. Toca para un dato.'],
        bye: ['See you next time.', 'Bis zum n\u00e4chsten Mal.', 'Hasta la pr\u00f3xima.']
    };
    function tr(key, li, n, k) { const a = COPY[key]; return a ? a[li3(li)].replace('{n}', n || '').replace('{k}', k || '') : ''; }
    function pal(id, li) { const p = PALS[pid(id)]; if (!p) return null; li = li3(li); return { id: pid(id), shape: p.shape, rgb: p.rgb, name: p.name[li], kind: p.kind[li] }; }
    /* what the companion says, in order: greeting, the place's facts (arrival-core), today's line; tapping walks the list */
    function lines(id, li, A, todayText) {
        id = pid(id); if (!id) return [];
        li = li3(li); const p = pal(id, li), out = [tr('hi', li, p.name, p.kind)];
        const P = A && A.PLACES && A.PLACES[id];
        if (P && P.f) P.f.forEach(f => { if (f && f[li]) out.push(f[li]); });
        if (todayText) out.push(String(todayText));
        return out;
    }
    /* ---------- moving with you ---------- */
    /* the companion keeps a home spot in the view and follows your drags and steering with a soft spring (lagging behind,
       never leaving the safe area). Positions are fractions of the host (0..1). */
    const FOLLOW = { home: [0.24, 0.56], reach: 0.16, k: 0.075, damp: 0.82, back: 0.02, wander: 0.012, margin: [0.1, 0.2, 0.9, 0.78] };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    /* target from a drag offset (dx, dy as fractions of the host): it swims a little way in the direction you move */
    function target(home, off, M) {
        M = M || FOLLOW.margin; home = home || FOLLOW.home; off = off || [0, 0];
        const r = FOLLOW.reach;
        return [clamp(home[0] + clamp(off[0], -1, 1) * r, M[0], M[2]), clamp(home[1] + clamp(off[1], -1, 1) * r, M[1], M[3])];
    }
    /* one spring step: returns {p, v}; t is seconds since start for the idle wander (0 in reduced motion) */
    function step(p, v, tgt, t, reduced) {
        const wx = reduced ? 0 : Math.sin(t * 0.7) * FOLLOW.wander, wy = reduced ? 0 : Math.sin(t * 1.1 + 1) * FOLLOW.wander * 0.8;
        const ax = (tgt[0] + wx - p[0]) * FOLLOW.k, ay = (tgt[1] + wy - p[1]) * FOLLOW.k;
        const nv = [(v[0] + ax) * FOLLOW.damp, (v[1] + ay) * FOLLOW.damp];
        if (reduced) return { p: [tgt[0], tgt[1]], v: [0, 0] };
        return { p: [p[0] + nv[0], p[1] + nv[1]], v: nv };
    }
    /* the drag offset relaxes back towards home after you let go */
    function relax(off) { return [off[0] * (1 - FOLLOW.back * 4), off[1] * (1 - FOLLOW.back * 4)].map(x => Math.abs(x) < 0.002 ? 0 : x); }
    /* tilt (degrees) from velocity: it leans into the way it swims */
    function tilt(v) { return clamp(Math.round((v && v[0] || 0) * 900), -18, 18); }
    const api = { PALS, IDS, pid, li3, COPY, tr, pal, lines, FOLLOW, target, step, relax, tilt, awardsXp: false };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiRegionPalsCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
