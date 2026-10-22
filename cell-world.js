/* LOWiSPIKE living cell (Oct 15, 2026): the herb companion is drawn as a see-through, glowing cell, and its home is a
   bloodstream-like world that mirrors what the user logs. Only data the app already has is read: meal logs with the
   app's own spike verdict (lvl/r), the XP ledger (Move, fasting, water), today's water glasses, the sun meter (full +
   garden trip, shown here as a journey through the body) and the local clock. No medical claims.
   Oct 22 (E-man): the optional mood tap ("How do you feel?" here and "Tell Misty how you feel" in her sheet) is gone:
   "it's so hidden nobody uses it". Nothing you tap overrides her look any more; an old saved S.cell.mood /
   lowi.cell.mood is cleared once on load (dropOldMood).
   Stages, wardrobe pieces, XP and saved herb data stay as they are: the original plant SVG is still built and its face,
   hat, neck, glasses, halo, comet and pot effects are moved onto the cell. Pure model at the top: tests/cell-world.test.cjs. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;
    if (W.LowiCell) return;
    const MIN = 60000, HOUR = 60 * MIN;
    const SPIKE_H = 4, MOVE_H = 2, LOWMEAL_H = 4, FAST_H = 8, MOOD_H = 8, WATER_GOAL = 6;
    const STATES = ['clear', 'calm', 'active', 'spiked', 'night', 'tired', 'unwell'];
    const pad = n => String(n).padStart(2, '0');
    const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const clamp = x => Math.max(0, Math.min(1, x));

    /* ---------- pure model ---------- */
    /* The app's analyzer stores lvl high|medium|low and r nein|selten|ja on a meal; barcode logs map the scan verdict the same way.
       Meals typed by hand carry no verdict: then only clear sweet words or a logged sugar amount count (a picture, not a measurement). */
    const SWEET = /schoko|chocolate|chocolat|pudding|kuchen|torte|\bcake|cupcake|brownie|candy|süßigkeit|suessigkeit|gummib|haribo|nutella|donut|doughnut|cola\b|limo\b|soda\b|eiscreme|ice ?cream|helado|keks|cookie|galleta|croissant|waffel|pancake|pfannkuchen|churro|bonbon|caramel|karamell|marmelade|dulce|pastel|tarta/i;
    function verdict(log) {
        if (!log) return '';
        const lvl = String(log.lvl || '').toLowerCase(), r = String(log.r || '').toLowerCase();
        if (lvl === 'high' || r === 'nein' || r === 'spike') return 'spike';
        if (lvl === 'low' || r === 'ja' || r === 'ok') return 'low';
        if (lvl === 'medium' || r === 'selten' || r === 'better') return 'medium';
        const sugar = log.macros && log.macros.sugar;
        if (Number.isFinite(+sugar) && sugar !== null && sugar !== '' && +sugar >= 25) return 'spike';
        if (SWEET.test(String(log.t || log.name || ''))) return 'spike';
        return '';
    }
    const kindOf = e => {
        const txt = (String(e && e.src || '') + ' ' + String(e && e.label || '')).toLowerCase();
        if (/^sun-full/.test(String(e && e.src || ''))) return 'sun';
        if (/move|walk|workout|steps|dance|yoga|stretch|training|sport/.test(txt)) return 'move';
        if (/fast/.test(txt) && !/breakfast/.test(txt)) return 'fast';
        return '';
    };
    function model(input) {
        input = input || {};
        const now = +input.now || Date.now(), hour = input.hour != null ? +input.hour : new Date(now).getHours();
        const logs = (input.logs || []).filter(l => l && !l.voided && +l.ts > 0 && +l.ts <= now + MIN);
        const ledger = (input.ledger || []).filter(e => e && +e.ts > 0 && +e.ts <= now + MIN && +e.amt > 0);
        const reasons = [];
        /* sugar wave: each high-spike meal fades out over SPIKE_H hours */
        let spike = 0, lastSpike = null, low = 0;
        logs.forEach(l => {
            const age = (now - l.ts) / HOUR, v = verdict(l);
            if (v === 'spike' && age < SPIKE_H) { spike += 1 - age / SPIKE_H; if (!lastSpike || l.ts > lastSpike.ts) lastSpike = l; }
            if (v === 'medium' && age < SPIKE_H) spike += (1 - age / SPIKE_H) * 0.35;
            if (v === 'low' && age < LOWMEAL_H) low = Math.max(low, 1 - age / LOWMEAL_H * 0.5);
        });
        spike = clamp(spike);
        let energy = 0, lastMove = null, fast = 0, sunFull = false;
        const key = dayKey(now);
        ledger.forEach(e => {
            const k = kindOf(e), age = (now - e.ts) / HOUR;
            if (k === 'move' && age < MOVE_H) { energy = Math.max(energy, 1 - age / MOVE_H * 0.8); if (!lastMove || e.ts > lastMove.ts) lastMove = e; }
            if (k === 'fast' && age < FAST_H) fast = 1;
            if (k === 'sun' && (e.day ? e.day === key : dayKey(e.ts) === key)) sunFull = true;
        });
        if (input.sun && input.sun.full) sunFull = true;
        if (input.fasting) fast = Math.max(fast, 0.6);
        const water = Math.max(0, +input.water || 0);
        const night = hour >= 23 || hour < 5;
        /* low energy from the existing body diary (1-5), if anything was ever logged there */
        const lowEnergy = input.energy != null && +input.energy > 0 && +input.energy <= 2;
        let clear = clamp(Math.min(water / WATER_GOAL, 1) * 0.35 + low * 0.3 + fast * 0.2 + (sunFull ? 0.35 : 0) - spike * 0.6);
        let state = 'calm';
        if (spike >= 0.35 && spike >= energy) state = 'spiked';
        else if (energy >= 0.35) state = 'active';
        else if (night) state = 'night';
        else if (lowEnergy) state = 'tired';
        else if (clear >= 0.45) state = 'clear';
        const tired = state === 'night' ? 1 : state === 'tired' ? 0.7 : state === 'unwell' ? 0.6 : night ? 0.5 : 0;
        if (lastSpike) reasons.push({ k: 'spike', t: lastSpike.t || '', ago: Math.round((now - lastSpike.ts) / MIN) });
        if (lastMove) reasons.push({ k: 'move', ago: Math.round((now - lastMove.ts) / MIN) });
        if (night) reasons.push({ k: 'night' });
        if (water) reasons.push({ k: 'water', n: water });
        if (low > 0) reasons.push({ k: 'low' });
        if (fast) reasons.push({ k: 'fast' });
        if (sunFull) reasons.push({ k: 'sun' });
        const away = !!(input.sun && input.sun.away);
        const activity = away ? 'journey' : { active: 'pump', spiked: 'clean', night: 'yawn', tired: 'rest', unwell: 'repair', clear: 'glow', calm: 'drift' }[state];
        /* how fast the world flows, in seconds per pass (lower = faster) */
        const speed = { active: 1.8, calm: 9, clear: 10, spiked: 17, night: 22, tired: 16, unwell: 20 }[state];
        return { state, spike: +spike.toFixed(3), energy: +energy.toFixed(3), clear: +clear.toFixed(3), tired, night, water, fast: !!fast, sunFull, away, left: away ? +input.sun.left || 0 : 0, activity, speed, reasons };
    }

    /* ---------- the cell, drawn as an SVG string (viewBox 0 0 260 310, same as the herb) ---------- */
    const FACE_Y = [196, 191, 179, 171, 159, 153], HEAD_R = [27, 31, 37, 42, 45, 49];
    const CELL_R = [64, 70, 76, 82, 88, 94], CILIA = [0, 8, 12, 16, 20, 26], MITO = [1, 2, 3, 3, 4, 5], VES = [3, 4, 5, 6, 7, 8];
    const CX = 130, CY = 158;
    function rnd(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
    function cellParts(i, id, a, b) {
        i = Math.max(0, Math.min(5, i | 0));
        const R = CELL_R[i], r = rnd(7 + i * 31), f = n => n.toFixed(1);
        /* colours from the visual brief: cyan-to-magenta see-through membrane, magenta nucleus, amber (ATP) mitochondria;
           the user's own palette stays in the vesicles and the ER */
        const defs = '<radialGradient id="' + id + 'cyto" cx=".42" cy=".4" r=".68"><stop stop-color="#1cf7f9" stop-opacity=".16"/><stop offset=".6" stop-color="' + a + '" stop-opacity=".12"/><stop offset=".9" stop-color="#8e068c" stop-opacity=".34"/><stop offset="1" stop-color="#c50ddd" stop-opacity=".5"/></radialGradient>' +
            '<radialGradient id="' + id + 'nuc" cx=".38" cy=".34" r=".75"><stop stop-color="#ffd6ff" stop-opacity=".9"/><stop offset=".45" stop-color="#c50ddd" stop-opacity=".75"/><stop offset="1" stop-color="#8e068c" stop-opacity=".55"/></radialGradient>' +
            '<radialGradient id="' + id + 'mito"><stop stop-color="#f8ea40" stop-opacity=".55"/><stop offset="1" stop-color="#e78631" stop-opacity="0"/></radialGradient>' +
            '<radialGradient id="' + id + 'aura"><stop offset=".55" stop-color="#1cf7f9" stop-opacity=".22"/><stop offset=".8" stop-color="#c50ddd" stop-opacity=".1"/><stop offset="1" stop-color="#c50ddd" stop-opacity="0"/></radialGradient>';
        let cilia = '';
        for (let k = 0; k < CILIA[i]; k++) {
            const ang = k / CILIA[i] * Math.PI * 2, x1 = CX + Math.cos(ang) * R, y1 = CY + Math.sin(ang) * R * 0.96, x2 = CX + Math.cos(ang) * (R + 11), y2 = CY + Math.sin(ang) * (R + 11) * 0.96;
            const qx = CX + Math.cos(ang + 0.12) * (R + 7), qy = CY + Math.sin(ang + 0.12) * (R + 7);
            cilia += '<path class="cw-cilium" style="--k:' + k + '" d="M' + f(x1) + ' ' + f(y1) + 'Q' + f(qx) + ' ' + f(qy) + ' ' + f(x2) + ' ' + f(y2) + '"/>';
        }
        let org = '';
        for (let k = 0; k < MITO[i]; k++) {
            const ang = r() * Math.PI * 2, d = R * (0.35 + r() * 0.35), x = CX + Math.cos(ang) * d, y = CY + 6 + Math.sin(ang) * d * 0.8, rot = Math.round(r() * 180);
            org += '<g class="cw-org cw-mito" style="--k:' + k + '" transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + rot + ')"><circle r="15" fill="url(#' + id + 'mito)"/><rect x="-11" y="-5" width="22" height="10" rx="5" fill="#e78631" fill-opacity=".7" stroke="#f8ea40" stroke-opacity=".9"/><path d="M-7 -3v6M-3 -3v6M1 -3v6M5 -3v6" stroke="#fff6c2" stroke-opacity=".7" stroke-width="1"/></g>';
        }
        for (let k = 0; k < VES[i]; k++) {
            const ang = r() * Math.PI * 2, d = R * (0.2 + r() * 0.62), x = CX + Math.cos(ang) * d, y = CY + Math.sin(ang) * d * 0.9, rr = 2.2 + r() * 3.4;
            org += '<circle class="cw-org cw-ves" style="--k:' + (k + 3) + '" cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(rr) + '" fill="' + (k % 2 ? a : '#2ef8b6') + '" fill-opacity=".5" stroke="#ffffff" stroke-opacity=".55" stroke-width=".8"/>';
        }
        let ribo = '';
        for (let k = 0; k < 10 + i * 3; k++) {
            const ang = r() * Math.PI * 2, d = R * (0.15 + r() * 0.75);
            ribo += '<circle cx="' + f(CX + Math.cos(ang) * d) + '" cy="' + f(CY + Math.sin(ang) * d * 0.9) + '" r="1.1"/>';
        }
        let xtal = '';
        for (let k = 0; k < 7; k++) {
            const ang = k / 7 * Math.PI * 2 + 0.4, d = k % 2 ? R * 0.55 : R * 1.18, x = CX + Math.cos(ang) * d, y = CY + Math.sin(ang) * d * 0.9, s = 3.5 + (k % 3) * 1.6;
            xtal += '<path class="cw-xtal" style="--k:' + k + '" transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + (k * 23) + ')" d="M0 ' + f(-s * 1.4) + 'L' + f(s) + ' ' + f(-s * .4) + 'L' + f(s) + ' ' + f(s * .6) + 'L0 ' + f(s * 1.4) + 'L' + f(-s) + ' ' + f(s * .6) + 'L' + f(-s) + ' ' + f(-s * .4) + 'Z"/>';
        }
        const nx = CX + R * 0.34, ny = CY - R * 0.4, nr = R * (0.22 + i * 0.012);
        const nucleus = '<g class="cw-nucleus"><ellipse cx="' + f(nx) + '" cy="' + f(ny) + '" rx="' + f(nr * 1.08) + '" ry="' + f(nr) + '" fill="url(#' + id + 'nuc)" stroke="#c50ddd" stroke-opacity=".9" stroke-width="1.5"/><ellipse cx="' + f(nx) + '" cy="' + f(ny) + '" rx="' + f(nr * 0.8) + '" ry="' + f(nr * 0.72) + '" fill="none" stroke="#ffd6ff" stroke-opacity=".5" stroke-dasharray="2 3"/><circle class="cw-nucleolus" cx="' + f(nx + nr * 0.2) + '" cy="' + f(ny + nr * 0.12) + '" r="' + f(nr * 0.34) + '" fill="#5a0470" fill-opacity=".8"/></g>';
        const er = '<path class="cw-er" d="M' + f(nx - nr * 1.5) + ' ' + f(ny + nr * 0.4) + 'q' + f(nr * 0.5) + ' ' + f(nr * 0.9) + ' ' + f(nr * 1.4) + ' ' + f(nr * 1.1) + 'q' + f(nr * 0.7) + ' ' + f(nr * 0.2) + ' ' + f(nr * 1.2) + ' ' + f(-nr * 0.3) + '" fill="none" stroke="' + a + '" stroke-opacity=".55" stroke-width="2.4" stroke-linecap="round"/>';
        const back = '<ellipse class="cw-aura" cx="' + CX + '" cy="' + CY + '" rx="' + f(R * 1.62) + '" ry="' + f(R * 1.55) + '" fill="url(#' + id + 'aura)"/>' +
            (i >= 4 ? '<ellipse class="cw-ring" cx="' + CX + '" cy="' + CY + '" rx="' + f(R + 22) + '" ry="' + f(R + 20) + '" fill="none" stroke="' + b + '" stroke-opacity=".35" stroke-dasharray="1 6" stroke-linecap="round" stroke-width="2"/>' : '') +
            '<ellipse class="lh-reflection" cx="130" cy="' + (CY + R + 28) + '" rx="' + f(R * 0.6) + '" ry="7" fill="' + a + '" opacity=".16"/>';
        const body = '<g class="cw-membrane" style="transform-origin:' + CX + 'px ' + CY + 'px"><g class="cw-cilia" stroke="#1cf7f9" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round" fill="none">' + cilia + '</g>' +
            '<ellipse class="lh-body cw-wall" cx="' + CX + '" cy="' + CY + '" rx="' + R + '" ry="' + f(R * 0.96) + '" fill="url(#' + id + 'cyto)" stroke="#1cf7f9" stroke-opacity=".9" stroke-width="1.6"/>' +
            '<ellipse cx="' + CX + '" cy="' + CY + '" rx="' + (R - 5) + '" ry="' + f(R * 0.96 - 5) + '" fill="none" stroke="' + a + '" stroke-opacity=".6" stroke-width="1.2" stroke-dasharray="5 4"/>' +
            '<g class="cw-inside">' + er + nucleus + '<g class="cw-ribo" fill="#ffffff" fill-opacity=".7">' + ribo + '</g>' + org + '<g class="cw-xtals" fill="#fff3fb" fill-opacity=".85" stroke="#ff8fbf" stroke-width="1">' + xtal + '</g></g>' +
            '<path class="cw-shine" d="M' + f(CX - R * 0.72) + ' ' + f(CY - R * 0.25) + 'A' + R + ' ' + R + ' 0 0 1 ' + f(CX - R * 0.12) + ' ' + f(CY - R * 0.86) + '" fill="none" stroke="#ffffff" stroke-opacity=".8" stroke-width="4" stroke-linecap="round"/>' +
            '<ellipse cx="' + f(CX - R * 0.42) + '" cy="' + f(CY - R * 0.5) + '" rx="' + f(R * 0.12) + '" ry="' + f(R * 0.06) + '" fill="#ffffff" opacity=".75" transform="rotate(-38 ' + f(CX - R * 0.42) + ' ' + f(CY - R * 0.5) + ')"/></g>';
        /* face + head pieces from the herb, moved onto the cell: hat top lands on the membrane top */
        const s = 1.0 * R / (HEAD_R[i] + 9), fy = CY + R * 0.2;
        const faceT = 'translate(' + CX + ' ' + f(fy) + ') scale(' + s.toFixed(3) + ') translate(-130 ' + (-FACE_Y[i]) + ')';
        return { defs, back, body, faceT, R, s };
    }
    /* Rebuild the herb SVG string as a cell. Everything the wardrobe draws is kept. */
    /* Oct 19 (E-man: "why wasn't the version shown in onboarding given to me?"): a user whose own companion came to life in the
       onboarding reveal (companion-birth.js) keeps THAT companion everywhere the cell is drawn (Home, Forms, care room, dock,
       the 3D sprite): its body shape, colours, sign motif, marks, cheeks, eyes, mouth, accessory and particles, from
       LowiBirthCompanionCore.parts(), the very strings the reveal draws, at this stage's size in place of the shared cell. The
       face keeps the mood parts (sleepy eyes, the energy mouths Home shows since Oct 16). No own companion: the cell as before.
       q = parts(companion, id). */
    const OWN_FACE_MAX = 2.3; /* own face units -> herb face units: the reveal's face/body proportion, capped to misty-face's crop */
    function groupEnd(str, at) {
        const re = /<g\b[^>]*?(\/?)>|<\/g\s*>/g; re.lastIndex = at; let depth = 0, t;
        while ((t = re.exec(str))) { if (t[0][1] === '/') { if (--depth === 0) return t.index + t[0].length; } else if (t[1] !== '/') depth++; }
        return -1;
    }
    function ownParts(i, id, q) {
        i = Math.max(0, Math.min(5, i | 0));
        const R = CELL_R[i], f = n => (+n).toFixed(1), k = R / 22, kp = (R + 30) / 42, p = q.palette || {};
        const a = p.a || '#8fdcff', b = p.b || '#a9b8ff';
        const defs = q.grad + '<radialGradient id="' + id + 'aura"><stop offset=".55" stop-color="' + a + '" stop-opacity=".22"/><stop offset=".8" stop-color="' + b + '" stop-opacity=".1"/><stop offset="1" stop-color="' + b + '" stop-opacity="0"/></radialGradient>';
        const back = '<ellipse class="cw-aura" cx="' + CX + '" cy="' + CY + '" rx="' + f(R * 1.62) + '" ry="' + f(R * 1.55) + '" fill="url(#' + id + 'aura)"/>' +
            (i >= 4 ? '<ellipse class="cw-ring" cx="' + CX + '" cy="' + CY + '" rx="' + f(R + 22) + '" ry="' + f(R + 20) + '" fill="none" stroke="' + b + '" stroke-opacity=".35" stroke-dasharray="1 6" stroke-linecap="round" stroke-width="2"/>' : '') +
            '<g class="cw-own-parts" transform="translate(' + CX + ' ' + CY + ') scale(' + kp.toFixed(3) + ') translate(-60 -60)">' + q.parts + '</g>';
        /* the wall ellipse stays (invisible) as the anchor other code measures her by: companion-core apply(), misty-face splitArt() */
        const body = '<g class="cw-membrane cw-own" style="transform-origin:' + CX + 'px ' + CY + 'px">' +
            '<ellipse class="lh-body cw-wall" cx="' + CX + '" cy="' + CY + '" rx="' + R + '" ry="' + f(R * 0.96) + '" fill="none" stroke="none" style="visibility:hidden"/>' +
            '<g class="cw-own-body" transform="translate(' + CX + ' ' + CY + ') scale(' + k.toFixed(3) + ')"><g class="lc-motif">' + q.motif + '</g>' + q.shape + q.marks + q.acc + '</g></g>';
        const s = 1.0 * R / (HEAD_R[i] + 9), fy = CY + R * 0.2;
        const faceT = 'translate(' + CX + ' ' + f(fy) + ') scale(' + s.toFixed(3) + ') translate(-130 ' + (-FACE_Y[i]) + ')';
        /* own face origin on the body centre, as in the reveal; same scale as the body up to the crop cap */
        const kf = Math.min(OWN_FACE_MAX, (HEAD_R[i] + 9) / 22), faceY = FACE_Y[i] - 0.2 * (HEAD_R[i] + 9), ink = q.ink || '#0b1d3f';
        const st = ' fill="none" stroke="' + ink + '" stroke-width="1.8" stroke-linecap="round"';
        const face = '<g class="lh-face cw-own-face" transform="translate(130 ' + f(faceY) + ')"><g transform="scale(' + kf.toFixed(3) + ')">' +
            '<g class="lh-eyes">' + q.eyes + '</g>' +
            '<g class="lh-sleep-eyes"><path d="M-11 -1q3 2.6 6 0M5 -1q3 2.6 6 0"' + st + '/></g>' +
            '<g class="lh-dizzy-eyes"><path d="M-8 -2m-1 0a1 1 0 1 1 2 0a2 2 0 1 1-4 0a3 3 0 1 1 6 0M8 -2m-1 0a1 1 0 1 1 2 0a2 2 0 1 1-4 0a3 3 0 1 1 6 0" fill="none" stroke="' + ink + '" stroke-width="1.4" stroke-linecap="round"/></g>' +
            '<ellipse class="lh-blush" cx="-12.5" cy="5" rx="3.4" ry="2" fill="#ff9ec8" opacity=".4"/><ellipse class="lh-blush" cx="12.5" cy="5" rx="3.4" ry="2" fill="#ff9ec8" opacity=".4"/>' +
            '<g class="lh-smile">' + q.mouth + '</g>' +
            '<path class="lh-flat" d="M-3 7h6"' + st + '/><path class="lh-calm" d="M-2 7.2h4"' + st + '/><path class="lh-frown" d="M-3.4 8.8q3.4-2.8 6.8 0"' + st + '/>' +
            '<ellipse class="lh-ooh" cy="7.4" rx="2" ry="2.5" fill="' + ink + '"/></g></g>';
        return { defs, back, body, faceT, R, s, face };
    }
    function compose(orig, i, opts) {
        opts = opts || {};
        if (typeof orig !== 'string' || orig.indexOf('<g class="lh-foliage">') < 0 || orig.indexOf('<g class="lh-pot">') < 0) return orig;
        const open = orig.slice(0, orig.indexOf('>') + 1), defsEnd = orig.indexOf('</defs>');
        const idm = /id="([a-z0-9]+)glow"/.exec(orig), id = (idm ? idm[1] : 'cw' + i) + 'c';
        const ca = (/--tmg-a:([^;"]+)/.exec(open) || [])[1] || '#8fe3c8', cb = (/--tmg-b:([^;"]+)/.exec(open) || [])[1] || '#b7a6ff';
        const fol = orig.indexOf('<g class="lh-foliage">'), pot = orig.indexOf('<g class="lh-pot">');
        const faceAt = orig.indexOf('<g class="lh-face"', fol);
        const foliage = orig.slice(faceAt > 0 && faceAt < pot ? faceAt : pot, pot);
        let faceAndPieces = foliage.slice(0, foliage.lastIndexOf('</g>'));
        const cometAt = orig.indexOf('<g class="lh-comet-orbit">'), fxAt = orig.indexOf('<g class="lh-care-fx">');
        const after = cometAt > 0 ? cometAt : fxAt > 0 ? fxAt : orig.lastIndexOf('</svg>');
        const potPart = orig.slice(pot, after), potFxAt = potPart.indexOf('<g class="lh-pot-fx">');
        const potFx = potFxAt >= 0 ? potPart.slice(potFxAt, potPart.length - 8) : '';
        const tail = orig.slice(after, orig.lastIndexOf('</svg>'));
        const halo = (/<g class="lh-halo">[\s\S]*?<\/g>/.exec(orig) || [''])[0];
        const stars = (/<g class="lh-constellation">[\s\S]*?<\/g>/.exec(orig) || [''])[0];
        const q = opts.own && typeof opts.own === 'object' && opts.own.shape ? opts.own : null;
        const c = q ? ownParts(i, id, q) : cellParts(i, id, ca, cb);
        if (q) { const at = faceAndPieces.indexOf('<g class="lh-face"'), end = at >= 0 ? groupEnd(faceAndPieces, at) : -1; faceAndPieces = end > 0 ? faceAndPieces.slice(0, at) + c.face + faceAndPieces.slice(end) : c.face + faceAndPieces; }
        /* a pot from the wardrobe becomes a small glowing dock the cell floats above */
        const potId = (/lh-pot-([a-z0-9-]+)/.exec(open) || [])[1] || 'ceramic';
        const dock = potFx || potId !== 'ceramic' ? '<g class="lh-pot cw-dock" transform="translate(130 ' + (CY + c.R + 24) + ') scale(.72) translate(-130 -262)"><ellipse cx="130" cy="262" rx="44" ry="10" fill="' + cb + '" fill-opacity=".22" stroke="#ffffff" stroke-opacity=".5"/>' + potFx + '</g>' : '<g class="lh-pot cw-dock"></g>';
        const haloT = halo ? '<g transform="translate(0 ' + Math.round(CY - c.R - 30 - 48) + ')">' + halo + '</g>' : '';
        /* frame the cell tightly (room for a hat above and the dock below), so it fills the bubble like the herb did */
        const vx = 130 - (c.R + 36), vy = CY - c.R - 50, vw = 2 * (c.R + 36), vh = 2 * c.R + 50 + 46;
        const cls = open.replace('class="tmg-plant', 'class="tmg-plant cw-cell' + (q ? ' cw-own-cell' : '')).replace(/viewBox="[^"]*"/, 'viewBox="' + vx + ' ' + vy + ' ' + vw + ' ' + vh + '"');
        return cls + orig.slice(open.length, defsEnd) + c.defs + '</defs>' + (stars ? '<g class="cw-stars" opacity=".45">' + stars + '</g>' : '') + c.back + haloT +
            '<g class="lh-creature"><g class="lh-foliage cw-float">' + c.body + '<g class="cw-face" transform="' + c.faceT + '">' + faceAndPieces + '</g></g>' + dock + '</g>' + tail + '</svg>';
    }

    const core = { STATES, SPIKE_H, MOVE_H, MOOD_H, WATER_GOAL, verdict, kindOf, model, cellParts, ownParts, compose, dayKey };
    if (!D) { if (typeof module !== 'undefined' && module.exports) module.exports = core; return; }

    /* ---------- copy ---------- */
    const lang = () => { try { return (W.LowiLang.get() || 'de').slice(0, 2); } catch (e) { return ((D.documentElement.lang) || 'de').slice(0, 2); } };
    const L = () => ({ en: 0, de: 1, es: 2 }[lang()] || 0);
    const copy = {
        world: ['Your cell world', 'Deine Zellwelt', 'Tu mundo celular'],
        clear: ['Clear & bright', 'Klar & leuchtend', 'Clara y brillante'],
        calm: ['Calm flow', 'Ruhiger Fluss', 'Flujo tranquilo'],
        active: ['Pumping', 'Volle Pumpe', 'A todo ritmo'],
        spiked: ['Sugar rush', 'Zuckerflut', 'Subidón de azúcar'],
        night: ['Up too late', 'Zu spät wach', 'Despierta muy tarde'],
        tired: ['Low energy', 'Wenig Energie', 'Poca energía'],
        unwell: ['Taking it slow', 'Ganz langsam heute', 'Con calma hoy'],
        say_clear: ['Clear flow, calm water. I’m glowing!', 'Klarer Fluss, ruhiges Wasser. Ich leuchte!', 'Flujo claro, agua tranquila. ¡Estoy brillando!'],
        say_calm: ['I’m drifting along with you.', 'Ich treibe gemütlich mit dir mit.', 'Voy flotando contigo.'],
        say_active: ['Whoa, everything’s rushing! I love this flow.', 'Wow, hier rauscht alles! Ich liebe diesen Flow.', '¡Uau, todo va a toda prisa! Me encanta.'],
        say_spiked: ['Sugar crystals everywhere… I’m slow while I tidy up.', 'Überall Zuckerkristalle … ich bin ganz träge und räume auf.', 'Cristales de azúcar por todas partes… voy lenta mientras ordeno.'],
        say_night: ['It’s late… I’m awake because you are. So tired.', 'Es ist spät … ich bin wach, weil du wach bist. So müde.', 'Es tarde… estoy despierta porque tú lo estás. Qué sueño.'],
        say_tired: ['Low energy today. Let’s go easy.', 'Heute wenig Energie. Machen wir’s gemütlich.', 'Hoy poca energía. Vamos con calma.'],
        say_unwell: ['I’m curling up and resting with you.', 'Ich kuschel mich ein und ruh mich mit dir aus.', 'Me acurruco y descanso contigo.'],
        say_journey: ['I’m off exploring your body. Back soon!', 'Ich bin auf Entdeckungsreise durch deinen Körper. Bin gleich zurück!', 'Estoy explorando tu cuerpo. ¡Vuelvo pronto!'],
        act_journey: ['Exploring your body · back in', 'Auf Reise durch deinen Körper · zurück in', 'Explorando tu cuerpo · vuelve en'],
        act_pump: ['Racing through your bloodstream', 'Rast durch deinen Blutkreislauf', 'Corre por tu torrente sanguíneo'],
        act_clean: ['Clearing sugar crystals', 'Räumt Zuckerkristalle weg', 'Limpia cristales de azúcar'],
        act_yawn: ['Awake and yawning', 'Wach und am Gähnen', 'Despierta y bostezando'],
        act_rest: ['Saving energy', 'Spart Energie', 'Ahorra energía'],
        act_repair: ['Resting and repairing', 'Ruht und repariert', 'Descansa y repara'],
        act_glow: ['Glowing and recharging', 'Leuchtet und tankt auf', 'Brilla y se recarga'],
        act_drift: ['Drifting through your bloodstream', 'Treibt durch deinen Blutkreislauf', 'Flota por tu torrente sanguíneo'],
        why_spike: ['Spike food', 'Spike-Essen', 'Comida con pico'],
        why_move: ['Moved', 'Bewegt', 'Movimiento'],
        why_night: ['Late night', 'Späte Nacht', 'Muy tarde'],
        why_water: ['glasses', 'Gläser', 'vasos'],
        why_low: ['Low-spike meal', 'Low-Spike-Essen', 'Comida sin pico'],
        why_fast: ['Fasting step', 'Fasten-Etappe', 'Etapa de ayuno'],
        why_sun: ['Sun full', 'Sonne voll', 'Sol lleno'],
        ago: ['ago', 'vor', 'hace']
    };
    const tr = k => (copy[k] || [k])[L()] || (copy[k] || [k])[0];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const reduced = () => !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const B = () => W.LowiVitalsBridge;
    const S = () => { try { return B().state() || {}; } catch (e) { try { return W.LowiR2.S() || {}; } catch (x) { return {}; } } };
    const save = () => { try { B().save(); } catch (e) {} try { clearTimeout(save.t); save.t = setTimeout(() => { const X = W.LOWI_CLOUD_X; if (X && X.backupNow) X.backupNow().catch(() => {}); }, 1500); } catch (e) {} };
    let sim = '';
    try { sim = new URLSearchParams(W.location.search).get('cell') || ''; } catch (e) {}

    function readInput(now) {
        const s = S(), key = dayKey(now);
        let f = {};
        try { f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}') || {}; } catch (e) {}
        let sun = null;
        try { if (W.LowiSun && W.LowiSun.live) { const v = W.LowiSun.live(); sun = { full: !!(v.full || v.fullDone), away: !!v.away, left: v.left || 0 }; } } catch (e) {}
        let energy = null;
        try { const o = s.health && s.health.body && s.health.body.observations; if (Array.isArray(o)) { const x = o.filter(z => z && z.energy != null && now - z.ts < MOOD_H * HOUR).sort((p, q) => q.ts - p.ts)[0]; if (x) energy = +x.energy; } } catch (e) {}
        const fasting = !!(f && (f.start || f.startedAt || f.on) && !f.end);
        return { now, logs: s.logs || [], ledger: s.ledger || s.xpLog || [], water: +(f.water && f.water[key]) || 0, fasting, sun, energy };
    }
    function live(now) {
        now = now || Date.now();
        const v = model(readInput(now));
        if (sim && STATES.indexOf(sim) >= 0) { const fake = { clear: { clear: 0.9 }, calm: {}, active: { energy: 1 }, spiked: { spike: 1 }, night: { tired: 1, night: true }, tired: { tired: 0.7 }, unwell: { tired: 0.6 } }[sim]; Object.assign(v, { state: sim, spike: 0, energy: 0, clear: 0.2, tired: 0 }, fake, { activity: v.away ? 'journey' : { active: 'pump', spiked: 'clean', night: 'yawn', tired: 'rest', unwell: 'repair', clear: 'glow', calm: 'drift' }[sim], speed: { active: 1.8, calm: 9, clear: 10, spiked: 17, night: 22, tired: 16, unwell: 20 }[sim], sim: true }); }
        if (sim === 'journey') Object.assign(v, { away: true, activity: 'journey', left: v.left || 42 * MIN });
        return v;
    }

    /* ---------- herb SVG becomes the cell ---------- */
    /* Oct 19: the user's own companion (onboarding reveal) is what the cell draws. Friends' art passes { own: false }. */
    function ownOpts(opts, out) {
        if (opts && opts.own === false) return opts;
        let q = null;
        try {
            const B = W.LowiBirthCompanion, K = W.LowiBirthCompanionCore;
            if (B && K && K.parts && B.has && B.has()) {
                const c = B.get(), idm = /id="([a-z0-9]+)glow"/.exec(out || '');
                if (c && c.look && c.palette) q = K.parts(c, (idm ? idm[1] : 'cwo') + 'o');
            }
        } catch (e) { q = null; }
        return q ? Object.assign({}, opts || {}, { own: q }) : opts;
    }
    function wrap() {
        const T = W.LowiHerbTamagotchi;
        if (!T || !T.plantHTML || T.plantHTML.cell) return !!(T && T.plantHTML && T.plantHTML.cell);
        const orig = T.plantHTML;
        const cellHTML = function (m, size, prefs, opts) {
            const out = orig.apply(this, arguments);
            /* wardrobe thumbnails crop onto one piece: keep those as they are */
            if (opts && opts.crop) return out;
            try { return compose(out, m && m.index | 0, ownOpts(opts, out)); } catch (e) { return out; }
        };
        cellHTML.cell = true;
        cellHTML.original = orig;
        T.plantHTML = cellHTML;
        return true;
    }

    /* ---------- world layer ---------- */
    function envHTML(n) {
        let h = '<i class="cw-glow"></i>';
        for (let k = 0; k < n; k++) h += '<i class="cw-rbc" style="--k:' + k + ';--y:' + ((k * 37) % 88 + 6) + '%;--s:' + (0.7 + (k % 4) * 0.18).toFixed(2) + '"></i>';
        for (let k = 0; k < Math.ceil(n * 0.8); k++) h += '<i class="cw-dot" style="--k:' + k + ';--y:' + ((k * 53 + 11) % 90 + 4) + '%"></i>';
        for (let k = 0; k < 6; k++) h += '<i class="cw-sugar" style="--k:' + k + ';--x:' + ((k * 41 + 9) % 86 + 6) + '%;--y:' + ((k * 29 + 17) % 80 + 8) + '%"></i>';
        for (let k = 0; k < 4; k++) h += '<i class="cw-stream" style="--k:' + k + ';--y:' + (18 + k * 21) + '%"></i>';
        return h + '<i class="cw-zz">z</i><i class="cw-zz cw-zz2">z</i>';
    }
    function ensureEnv(host, cls, n) {
        if (!host) return null;
        let env = host.querySelector(':scope > .cw-env');
        if (!env) {
            env = D.createElement('div');
            env.className = 'cw-env ' + cls;
            env.setAttribute('aria-hidden', 'true');
            env.innerHTML = envHTML(n);
            host.insertBefore(env, host.firstChild);
        }
        return env;
    }
    function fmtLeft(ms) { const m = Math.max(0, Math.ceil(ms / MIN)); return Math.floor(m / 60) + ':' + pad(m % 60); }
    function reasonsHTML(v) {
        return v.reasons.slice(0, 4).map(r => {
            let t = tr('why_' + r.k);
            if (r.k === 'water') t = r.n + ' ' + t;
            if ((r.k === 'spike' || r.k === 'move') && r.ago != null) t += ' · ' + (L() === 0 ? (r.ago < 60 ? r.ago + ' min' : Math.round(r.ago / 60) + ' h') + ' ' + tr('ago') : tr('ago') + ' ' + (r.ago < 60 ? r.ago + ' min' : Math.round(r.ago / 60) + ' h'));
            return '<span class="cw-why cw-why-' + r.k + '">' + esc(t) + '</span>';
        }).join('');
    }
    let pill = null, lastSig = '', said = '', moodDropped = false;
    /* Oct 22: the mood tap was removed; clear an old saved choice once so nothing stale lingers in the account data */
    function dropOldMood() {
        if (moodDropped) return;
        try { localStorage.removeItem('lowi.cell.mood'); } catch (e) {}
        try {
            const s = S(); if (!s || !Object.keys(s).length) return; /* account data not loaded yet: try again on the next render */
            moodDropped = true;
            if (s.cell && typeof s.cell === 'object' && 'mood' in s.cell) { delete s.cell.mood; save(); }
        } catch (e) {}
    }
    function speak(text) {
        const sp = D.querySelector('#spWorld .sp-speech');
        if (!sp || !text) return;
        sp.textContent = text;
        sp.classList.add('cw-say');
        clearTimeout(speak.t);
        speak.t = setTimeout(() => sp.classList.remove('cw-say'), W.LowiReadTime ? W.LowiReadTime.atLeast(text, 4200) : 4200); /* reading time */
    }
    function render(force) {
        dropOldMood();
        if (!wrap()) return;
        const v = live(), root = D.documentElement;
        const home = D.getElementById('spHome'), world = D.getElementById('spWorld');
        const bubble = home && home.querySelector('#spBubble'), stage = world && world.querySelector('.sp-stage');
        ensureEnv(bubble, 'cw-env-home', 5);
        ensureEnv(stage, 'cw-env-world', 9);
        if (root.dataset.cell !== v.state) { try { W.dispatchEvent(new CustomEvent('lowi:cell-state', { detail: v })); } catch (e) {} }
        root.dataset.cell = v.state;
        root.classList.add('cw-on');
        root.classList.toggle('cw-away', !!v.away);
        root.classList.toggle('cw-night', !!v.night);
        root.style.setProperty('--cw-spike', v.spike);
        root.style.setProperty('--cw-energy', v.energy);
        root.style.setProperty('--cw-clear', v.clear);
        root.style.setProperty('--cw-tired', v.tired);
        root.style.setProperty('--cw-speed', v.speed + 's');
        const label = tr(v.state), act = v.activity === 'journey' ? tr('act_journey') + ' ' + fmtLeft(v.left) : tr('act_' + v.activity);
        if (bubble) {
            if (!pill || !pill.isConnected) { pill = D.createElement('span'); pill.className = 'cw-pill'; pill.setAttribute('aria-hidden', 'true'); bubble.appendChild(pill); }
            if (pill.textContent !== label) pill.textContent = label;
            const base = bubble.getAttribute('aria-label') || '', clean = base.split(' · ')[0];
            const al = clean + ' · ' + label;
            if (base !== al) bubble.setAttribute('aria-label', al);
        }
        if (stage) {
            let tag = stage.querySelector(':scope > .cw-tag');
            if (!tag) { tag = D.createElement('div'); tag.className = 'cw-tag'; tag.setAttribute('role', 'status'); stage.appendChild(tag); }
            const th = '<div class="cw-head"><i class="cw-dotstate" aria-hidden="true"></i><b>' + esc(label) + '</b><span>' + esc(act) + '</span></div><div class="cw-whys">' + reasonsHTML(v) + '</div>';
            if (tag.innerHTML !== th) tag.innerHTML = th;
        }
        /* the cell says how it feels once when the world opens or its state changes */
        const open = world && !world.hidden;
        const key = v.state + (v.away ? ':away' : '');
        if (open && said !== key) { said = key; setTimeout(() => speak(tr(v.away ? 'say_journey' : 'say_' + v.state)), 650); }
        if (!open) said = '';
        return v;
    }
    function repaintCreature() {
        /* spirit.js paints the creature once per signature; repaint now so the cell shows from the first frame */
        try {
            const T = W.LowiHerbTamagotchi, c = D.querySelector('.sp-creature');
            if (!c || !T || !T.current) return;
            if (c.querySelector('svg.cw-cell')) return;
            const x = T.current(), svg = c.querySelector('svg.tmg-plant');
            const dim = svg && svg.classList.contains('lh-droopy');
            c.innerHTML = T.plantHTML(Object.assign({}, x.m, dim ? { dim: true, mood: 'droopy' } : {}), 'hero', x.p);
        } catch (e) {}
    }
    let queued = false;
    function schedule(force) {
        if (queued) return;
        queued = true;
        (W.requestAnimationFrame || setTimeout)(() => { queued = false; render(force); repaintCreature(); });
    }
    function boot() {
        if (!D.getElementById('cwCss')) {
            const l = D.createElement('link');
            l.id = 'cwCss'; l.rel = 'stylesheet';
            const me = D.querySelector('script[src*="cell-world.js"]');
            l.href = me ? me.getAttribute('src').replace('cell-world.js', 'cell-world.css') : 'cell-world.css';
            D.head.appendChild(l);
        }
        wrap();
        ['lowi:reward', 'lowi:state', 'lowi:meal-logged', 'lowi:care', 'lowi:lang', 'storage'].forEach(ev => { W.addEventListener(ev, () => schedule()); D.addEventListener(ev, () => schedule()); });
        /* Oct 19: the onboarding reveal saved (or renamed) the user's own companion: Home / dock / sheets redraw with it now */
        W.addEventListener('lowi:companion', () => { try { if (W.LowiHerbIdentity && W.LowiHerbIdentity.refresh) W.LowiHerbIdentity.refresh(); else if (W.LowiHerbTamagotchi && W.LowiHerbTamagotchi.refresh) W.LowiHerbTamagotchi.refresh(true); } catch (e) {} schedule(true); });
        D.addEventListener('visibilitychange', () => { if (!D.hidden) schedule(true); });
        D.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-sp="open"],#spBubble,[data-sp="water"],#tabbar .tb')) setTimeout(() => schedule(), 120); }, true);
        const tab = D.getElementById('tab-home');
        if (tab && W.MutationObserver) new MutationObserver(() => { const b = D.getElementById('spBubble'); if (b && (!b.querySelector(':scope > .cw-env') || !pill || !pill.isConnected)) schedule(); }).observe(tab, { childList: true, subtree: true });
        if (W.MutationObserver) new MutationObserver(() => { const c = D.querySelector('.sp-creature'); if (c && !c.querySelector('svg.cw-cell') && c.querySelector('svg')) schedule(); const w = D.getElementById('spWorld'); if (w && !w.hidden) schedule(); }).observe(D.body, { childList: true, subtree: false, attributes: false });
        schedule(true);
        setTimeout(() => schedule(true), 900);
        setInterval(() => { if (!D.hidden) schedule(); }, 20000);
        /* the world dialog toggles hidden: watch it once it exists */
        const watchWorld = () => { const w = D.getElementById('spWorld'); if (!w) return setTimeout(watchWorld, 800); new MutationObserver(() => schedule()).observe(w, { attributes: true, attributeFilter: ['hidden'] }); const sb = w.querySelector('.sp-body'); if (sb) new MutationObserver(() => { if (!sb.querySelector('svg.cw-cell') && sb.querySelector('svg')) schedule(); }).observe(sb, { childList: true, subtree: true }); };
        watchWorld();
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();

    W.LowiCell = Object.assign({}, core, {
        live, render, copy,
        simulate(st) { sim = st || ''; lastSig = ''; said = ''; render(true); return live(); }
    });
    if (typeof module !== 'undefined' && module.exports) module.exports = W.LowiCell;
})();
