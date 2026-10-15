/* LOWiSPIKE moving cell ride, pure core (Oct 15, 2026). Ref: Random42 "Intercellular – An Interbody VR Experience" (youtu.be/aogLFedcnTI):
   the camera travels by itself through vessels while you look around 360. You ride along with your own cell.
   - route(id, world): hub -> vessel -> region, as smooth Catmull-Rom points; uses LowiWorld3D regions/vesselPath when present.
   - stops along the route (u = 0..1): buddy moments and a fact card on the way, the arrival card at the end.
   - look(): drag/gyro offset; released, it waits HOLD s and then eases back to the path (rate EASE /s).
   - duration(): ~40 s per ride at 1x; a healthier world flows a bit faster (world-health look.flow), never slower than 0.8x.
   Tested in tests/body-ride.test.cjs. */
(function (root) {
    'use strict';
    const HOLD = 0.7, EASE = 2.4, BASE_S = 40, SPEEDS = [1, 1.5, 2, 0.6];
    const PLACES = {
        gut: { pos: [0, -70, -150], hue: '#2ef8b6', n: ['Gut', 'Darm', 'Intestino'], f: ['Millions of microbes live here and love fiber.', 'Hier wohnen Millionen Mikroben, und sie lieben Ballaststoffe.', 'Aquí viven millones de microbios y les encanta la fibra.'] },
        liver: { pos: [80, -25, -125], hue: '#e78631', n: ['Liver', 'Leber', 'Hígado'], f: ['Your liver stores energy and hands it out while you fast.', 'Deine Leber speichert Energie und gibt sie beim Fasten wieder ab.', 'Tu hígado guarda energía y la reparte mientras ayunas.'] },
        pancreas: { pos: [45, -55, -165], hue: '#f8ea40', n: ['Pancreas', 'Bauchspeicheldrüse', 'Páncreas'], f: ['This is where insulin comes from. Calm meals mean calm waves.', 'Hier kommt das Insulin her. Ruhige Mahlzeiten, ruhige Wellen.', 'De aquí sale la insulina. Comidas tranquilas, olas tranquilas.'] },
        muscle: { pos: [-95, -65, -135], hue: '#9feb25', n: ['Muscle', 'Muskel', 'Músculo'], f: ['Moving muscles pull sugar out of the blood, no extra insulin needed.', 'Arbeitende Muskeln holen Zucker aus dem Blut, ganz ohne extra Insulin.', 'Los músculos en marcha sacan azúcar de la sangre sin insulina extra.'] },
        heart: { pos: [-30, 35, -105], hue: '#f14770', n: ['Heart', 'Herz', 'Corazón'], f: ['About 100,000 beats a day push this whole stream.', 'Rund 100.000 Schläge am Tag treiben diesen ganzen Strom an.', 'Unos 100.000 latidos al día mueven toda esta corriente.'] },
        lungs: { pos: [-65, 55, -120], hue: '#a8e0ff', n: ['Lungs', 'Lunge', 'Pulmones'], f: ['Fresh oxygen jumps onto the red cells right here.', 'Genau hier springt frischer Sauerstoff auf die roten Zellen.', 'Justo aquí el oxígeno fresco salta a los glóbulos rojos.'] },
        brain: { pos: [0, 115, -70], hue: '#1cf7f9', n: ['Brain', 'Gehirn', 'Cerebro'], f: ['Your brain runs on a steady supply. Fewer spikes, steadier focus.', 'Dein Gehirn mag gleichmäßigen Nachschub. Weniger Spitzen, ruhigerer Fokus.', 'Tu cerebro prefiere un suministro estable. Menos picos, más foco.'] }
    };
    const ALIAS = { lung: 'lungs', blood: 'heart', vessels: 'heart', intestine: 'gut', darm: 'gut', muscles: 'muscle', sugar: 'pancreas' };
    const BUDDIES = [
        { id: 'bifi', hue: '#2ef8b6', n: 'Bifi', l: ['Hi! I eat the fiber you send me.', 'Hi! Ich futtere die Ballaststoffe, die du schickst.', '¡Hola! Me como la fibra que me mandas.'] },
        { id: 'lacto', hue: '#9feb25', n: 'Lacto', l: ['Wheee, the stream is fast today!', 'Juhu, der Strom ist heute schnell!', '¡Yuju, la corriente va rápida hoy!'] },
        { id: 'akki', hue: '#1cf7f9', n: 'Akki', l: ['I keep the gut wall cosy. Wave back!', 'Ich halte die Darmwand gemütlich. Wink zurück!', 'Mantengo cómoda la pared intestinal. ¡Saluda!'] },
        { id: 'rosa', hue: '#f14770', n: 'Rosa', l: ['Ride with us, there is room!', 'Fahr mit, hier ist Platz!', '¡Ven con nosotros, hay sitio!'] },
        { id: 'sol', hue: '#f8ea40', n: 'Sol', l: ['Water day? Everything flows so smooth.', 'Wassertag? Alles fließt so sanft.', '¿Día de agua? Todo fluye tan suave.'] }
    ];
    const placeId = id => { id = String(id || '').toLowerCase(); return PLACES[id] ? id : (ALIAS[id] || 'gut'); };
    function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
    function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
    const len = a => Math.hypot(a[0], a[1], a[2]), norm = a => { const l = len(a) || 1; return mul(a, 1 / l); };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

    /* the vessel: from the hub to the place, gently winding, deterministic per place */
    function route(id, world) {
        const pid = placeId(id), w = world || {};
        const reg = (w.regions || []).find(r => r && placeId(r.id) === pid);
        const v3 = p => Array.isArray(p) ? p.slice(0, 3) : [+p.x || 0, +p.y || 0, +p.z || 0];
        const end = reg && reg.pos ? v3(reg.pos) : PLACES[pid].pos, start = (w.hub && w.hub.pos) ? v3(w.hub.pos) : [0, 0, 0];
        let pts = null;
        if (typeof w.vesselPath === 'function') { try { const p = w.vesselPath('hub', pid); if (p && p.length >= 2) pts = p.map(q => Array.isArray(q) ? q.slice(0, 3) : [q.x, q.y, q.z]); } catch (e) { pts = null; } }
        if (!pts) {
            const dir = sub(end, start), L = len(dir), f = norm(dir), up = Math.abs(f[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
            const s1 = norm(cross(f, up)), s2 = norm(cross(s1, f)), r = rng(hash(pid)), N = 7;
            pts = [start];
            for (let i = 1; i < N; i++) { const t = i / N, amp = Math.sin(Math.PI * t) * L * 0.16; pts.push(add(add(start, mul(dir, t)), add(mul(s1, (r() - 0.5) * 2 * amp), mul(s2, (r() - 0.5) * 2 * amp)))); }
            pts.push(end);
        }
        return { id: pid, place: PLACES[pid], points: pts, curve: curve(pts), stops: stops(pid) };
    }
    /* centripetal-ish uniform Catmull-Rom, sampled by arc length */
    function curve(pts) {
        const P = pts.length < 2 ? [pts[0] || [0, 0, 0], pts[0] || [0, 0, 1]] : pts;
        const seg = (i, t) => {
            const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[Math.min(P.length - 1, i + 1)], p3 = P[Math.min(P.length - 1, i + 2)], t2 = t * t, t3 = t2 * t;
            return [0, 1, 2].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
        };
        const raw = t => { const n = P.length - 1, x = Math.max(0, Math.min(1, t)) * n, i = Math.min(n - 1, Math.floor(x)); return seg(i, x - i); };
        const S = 240, table = [0];
        let prev = raw(0), total = 0;
        for (let i = 1; i <= S; i++) { const p = raw(i / S); total += len(sub(p, prev)); table.push(total); prev = p; }
        const toT = u => { const d = Math.max(0, Math.min(1, u)) * total; let lo = 0, hi = S; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (table[m] < d) lo = m; else hi = m; } const span = (table[hi] - table[lo]) || 1; return (lo + (d - table[lo]) / span) / S; };
        const at = u => raw(toT(u));
        const tangent = u => { const a = at(Math.max(0, u - 0.004)), b = at(Math.min(1, u + 0.004)); return norm(sub(b, a)); };
        return { at, tangent, length: total };
    }
    function stops(pid) {
        const r = rng(hash('stops:' + pid)), b1 = BUDDIES[Math.floor(r() * BUDDIES.length)];
        let b2 = BUDDIES[Math.floor(r() * BUDDIES.length)]; if (b2.id === b1.id) b2 = BUDDIES[(BUDDIES.indexOf(b1) + 2) % BUDDIES.length];
        return [{ u: 0.2, kind: 'buddy', buddy: b1 }, { u: 0.48, kind: 'fact' }, { u: 0.72, kind: 'buddy', buddy: b2 }, { u: 0.95, kind: 'arrive' }];
    }
    function duration(flow, speed) { const f = Math.max(0.45, Math.min(1.3, +flow || 1)); return BASE_S / (0.8 + 0.2 * f) / Math.max(0.1, +speed || 1); }
    /* progress step; returns new u (0..1) */
    function advance(u, dt, dur, paused) { return paused ? u : Math.min(1, u + Math.max(0, dt) / Math.max(1, dur)); }
    /* the stops that were just passed between u0 and u1 */
    const passed = (list, u0, u1) => list.filter(s => s.u > u0 && s.u <= u1);
    const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
    /* look offset: free while held, eases back to the path HOLD s after release; free-look mode never eases */
    function look(st, dt, holding, free) {
        st = Object.assign({ yaw: 0, pitch: 0, idle: 0 }, st);
        if (holding || free) { st.idle = 0; st.pitch = Math.max(-1.35, Math.min(1.35, st.pitch)); st.yaw = wrap(st.yaw); return st; }
        st.idle += dt;
        if (st.idle > HOLD) { const k = Math.exp(-EASE * dt); st.yaw = wrap(st.yaw) * k; st.pitch *= k; if (Math.abs(st.yaw) < 1e-3) st.yaw = 0; if (Math.abs(st.pitch) < 1e-3) st.pitch = 0; }
        return st;
    }
    const nextSpeed = s => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length] || 1;
    const api = { HOLD, EASE, BASE_S, SPEEDS, PLACES, BUDDIES, ALIAS, placeId, route, curve, stops, duration, advance, passed, look, wrap, nextSpeed, hash, rng };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.LowiRideCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
