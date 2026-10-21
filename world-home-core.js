/* LOWiSPIKE world-first Home: pure helpers (Oct 15).
   Auras replace the old wardrobe (a cell wears light, not hats), cell-native growth names, the region "hero view"
   (which way the camera faces when you arrive in a region) and the zoom-out toggle. No DOM here, so node tests can load it. */
(function (root) {
    'use strict';
    /* A cell wears light: membrane glow colours, unlocked by the same XP the herb always used. */
    const AURAS = [
        { id: 'dew', xp: 0, a: '#7ff3d6', b: '#3fc7c9', n: ['Morning dew', 'Morgentau', 'Rocío'], d: ['Soft mint, your starting light.', 'Sanftes Mint, dein Startlicht.', 'Menta suave, tu luz inicial.'] },
        { id: 'ocean', xp: 60, a: '#7cc8ff', b: '#3d7bff', n: ['Ocean', 'Ozean', 'Océano'], d: ['Calm deep blue.', 'Ruhiges Tiefblau.', 'Azul profundo y tranquilo.'] },
        { id: 'gold', xp: 150, a: '#ffd36e', b: '#ff9f43', n: ['Gold flow', 'Goldfluss', 'Flujo dorado'], d: ['Warm golden glow.', 'Warmes goldenes Leuchten.', 'Brillo dorado y cálido.'] },
        { id: 'coral', xp: 300, a: '#ff9aa8', b: '#ff5f7e', n: ['Coral', 'Koralle', 'Coral'], d: ['Rosy, alive.', 'Rosig und lebendig.', 'Rosado y vivo.'] },
        { id: 'violet', xp: 500, a: '#c8a6ff', b: '#8a5cff', n: ['Stardust', 'Sternenstaub', 'Polvo de estrellas'], d: ['Violet with a sparkle.', 'Violett mit Funkeln.', 'Violeta con destellos.'] },
        { id: 'aurora', xp: 800, a: '#8affc1', b: '#b07cff', n: ['Aurora', 'Polarlicht', 'Aurora'], d: ['Green fading into violet.', 'Grün, das in Violett fließt.', 'Verde que fluye a violeta.'] },
        { id: 'sun', xp: 1500, a: '#fff2a8', b: '#ffc23d', n: ['Sun core', 'Sonnenkern', 'Núcleo solar'], d: ['Bright as noon.', 'Hell wie Mittag.', 'Brillante como el mediodía.'] },
        { id: 'nebula', xp: 3000, a: '#ffb3f0', b: '#5ad1ff', n: ['Nebula', 'Nebel', 'Nebulosa'], d: ['For legends only.', 'Nur für Legenden.', 'Solo para leyendas.'] }
    ];
    /* the same thresholds as LOWI_HERB_CONFIG.stages, named for a cell */
    const STAGES = [
        { xp: 0, n: ['Spark', 'Funke', 'Chispa'], d: ['Just born. Every log makes you glow.', 'Gerade entstanden. Jeder Eintrag lässt dich leuchten.', 'Recién nacida. Cada registro te hace brillar.'] },
        { xp: 100, n: ['Little cell', 'Kleine Zelle', 'Celulita'], d: ['Your membrane gets its first shimmer.', 'Deine Membran bekommt ihren ersten Schimmer.', 'Tu membrana recibe su primer brillo.'] },
        { xp: 300, n: ['Glow cell', 'Leuchtzelle', 'Célula brillante'], d: ['Stronger light, calmer flow.', 'Stärkeres Licht, ruhigerer Fluss.', 'Más luz, flujo más tranquilo.'] },
        { xp: 700, n: ['Bright cell', 'Strahlende Zelle', 'Célula radiante'], d: ['Microbes start to follow you.', 'Mikroben fangen an, dir zu folgen.', 'Los microbios empiezan a seguirte.'] },
        { xp: 1500, n: ['Star cell', 'Sternzelle', 'Célula estelar'], d: ['A whole halo of light.', 'Ein ganzer Lichtkranz.', 'Todo un halo de luz.'] },
        { xp: 3000, n: ['Legend', 'Legende', 'Leyenda'], d: ['The brightest cell in your body.', 'Die hellste Zelle in deinem Körper.', 'La célula más brillante de tu cuerpo.'] }
    ];
    const ix = l => ({ de: 1, es: 2 })[l] || 0;
    const pick = (arr, l) => arr[ix(l)] || arr[0];
    function aura(id) { return AURAS.find(a => a.id === id) || AURAS[0]; }
    function owns(id, xp) { const a = AURAS.find(x => x.id === id); return !!a && (+xp || 0) >= a.xp; }
    /* a saved aura only counts while it is unlocked; anything else falls back to the starter light */
    function cleanAura(id, xp) { return owns(id, xp) ? id : AURAS[0].id; }
    function auraItems(xp, cur) {
        xp = +xp || 0; cur = cleanAura(cur, xp);
        return AURAS.map(a => ({ id: a.id, xp: a.xp, a: a.a, b: a.b, n: a.n, d: a.d, status: a.id === cur ? 'on' : xp >= a.xp ? 'ready' : 'locked', left: Math.max(0, a.xp - xp) }));
    }
    function stage(xp) {
        xp = Math.max(0, +xp || 0); let i = 0;
        STAGES.forEach((s, k) => { if (xp >= s.xp) i = k; });
        const next = STAGES[i + 1] || null, cur = STAGES[i];
        const pct = next ? Math.max(0, Math.min(1, (xp - cur.xp) / (next.xp - cur.xp))) : 1;
        return { index: i, cur, next, pct, left: next ? Math.ceil(next.xp - xp) : 0 };
    }
    /* ---------- hero view: when you arrive in a region, face its prettiest part ----------
       samples: [[x,y,z,w], ...] relative to the region centre (w = how much that piece is worth looking at).
       Scores a ring of view directions by the weight inside a cone around each one (nearer pieces count more),
       keeps the camera fairly level, and returns the direction plus how far to slide the orbit target towards it
       so the cluster sits a few units in front of the lens instead of far away in the fog. */
    function heroView(samples, o) {
        o = o || {};
        const cone = Math.cos((o.coneDeg || 34) * Math.PI / 180), maxPitch = o.maxPitch != null ? o.maxPitch : 0.55, n = o.dirs || 120,
            camDist = o.camDist || 2.6, want = o.want || 5;
        const pts = [];
        for (const s of samples || []) {
            const x = +s[0], y = +s[1], z = +s[2], w = s[3] == null ? 1 : +s[3], d = Math.hypot(x, y, z);
            if (!(d > 0.05) || !isFinite(d) || !(w > 0)) continue;
            pts.push([x / d, y / d, z / d, d, w / (1 + Math.pow(d / 9, 2))]);
        }
        if (!pts.length) return null;
        let best = null;
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < n; i++) {
            const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), th = golden * i;
            if (Math.abs(Math.asin(y)) > maxPitch) continue;
            const dx = Math.cos(th) * r, dz = Math.sin(th) * r;
            let sc = 0;
            for (const p of pts) { const c = p[0] * dx + p[1] * y + p[2] * dz; if (c > cone) sc += p[4] * (c - cone) / (1 - cone); }
            if (!best || sc > best.score) best = { dir: [dx, y, dz], score: sc };
        }
        if (!best || !(best.score > 0)) return null;
        const inCone = pts.filter(p => p[0] * best.dir[0] + p[1] * best.dir[1] + p[2] * best.dir[2] > cone).map(p => p[3]).sort((a, b) => a - b);
        const med = inCone.length ? inCone[Math.floor(inCone.length / 2)] : 0;
        const shift = Math.max(0, Math.min(Math.max(0, med - 3), med + camDist - want));
        return { dir: best.dir, score: best.score, median: med, shift };
    }
    /* camera rig angles that look along dir (the rig places the camera at target + dist * (sin y cos p, sin p, cos y cos p)) */
    function rigAngles(dir, pMax) {
        const x = -dir[0], y = -dir[1], z = -dir[2], lim = pMax == null ? 1.2 : pMax;
        return { yaw: Math.atan2(x, z), pitch: Math.max(-lim, Math.min(lim, Math.asin(Math.max(-1, Math.min(1, y))))) };
    }
    /* nearest equivalent angle, so a turn never spins the long way round */
    function nearAngle(from, to) { const t = Math.PI * 2; return to + Math.round((from - to) / t) * t; }
    /* zoom toggle: out to the whole world, or back in to the normal view */
    function zoomTarget(dist, minD, maxD, homeD) {
        const mid = (homeD + maxD) / 2;
        return dist > mid - 0.01 ? { to: homeD, out: false } : { to: maxD, out: true };
    }
    /* ---------- Home stat bubbles (Oct 15 late): six glass cells float around Misty ----------
       Pure layout: Misty's cell plus fasting, water, Move, sun, herb and meals as circles that never touch each other,
       the screen edge or anything in `obst` (header, quest card, thumb row buttons, gift dot, tab bar, hint line).
       Misty keeps `walk` px of room on every side, so her slow walk from cell to cell never reaches a stat cell. */
    const STATS = ['fast', 'water', 'move', 'sun', 'herb', 'meal'];
    /* angles in degrees clockwise from 12 o'clock: fasting + water low (near the thumb), Move + meals at the sides, sun + herb up top */
    const STAT_SETS = [
        { fast: 225, water: 135, move: 90, meal: 270, sun: 315, herb: 45 },
        { fast: 212, water: 148, move: 70, meal: 290, sun: 330, herb: 30 },
        { fast: 238, water: 122, move: 100, meal: 260, sun: 300, herb: 60 },
        { fast: 200, water: 160, move: 62, meal: 298, sun: 338, herb: 22 },
        /* short, wide room (small phones, landscape): the low pair spreads out to the sides */
        { fast: 248, water: 112, move: 66, meal: 294, sun: 338, herb: 22 },
        { fast: 258, water: 102, move: 54, meal: 306, sun: 350, herb: 10 }
    ];
    function circRect(x, y, r, b, pad) {
        const nx = Math.max(b.l, Math.min(x, b.r)), ny = Math.max(b.t, Math.min(y, b.b));
        const dx = x - nx, dy = y - ny;
        return dx * dx + dy * dy < (r + pad) * (r + pad);
    }
    function statTry(o, s, set, cx, cy) {
        const z = o.zone, pad = o.pad, obst = o.obst || [];
        const R = o.R0 * s, walk = Math.max(6, Math.round(o.walk * s));
        const rr = { fast: Math.max(o.minFast, o.rf * s), water: Math.max(o.minSmall + 6, o.rw * s), move: Math.max(o.minSmall, o.rs * s), sun: Math.max(o.minSmall, o.rs * s), herb: Math.max(o.minSmall, o.rs * s), meal: Math.max(o.minSmall, o.rs * s) };
        const inZone = (x, y, r) => x - r >= z.l && x + r <= z.r && y - r >= z.t && y + r <= z.b;
        const hits = (x, y, r) => obst.some(b => circRect(x, y, r, b, pad));
        if (!inZone(cx, cy, R + walk) || hits(cx, cy, R + walk)) return null;
        const out = { misty: { x: cx, y: cy, r: R }, walk, scale: s, cells: {} };
        const placed = [];
        /* the free-gift dot (o.gift = its radius) floats in the ring too, just under Misty */
        const keys = o.gift ? STATS.concat('gift') : STATS; rr.gift = o.gift;
        for (const k of keys) {
            const r = rr[k], a = (k === 'gift' ? (set.gift != null ? set.gift : 180) : set[k]) * Math.PI / 180, ring = R + walk + pad + r;
            const x = cx + Math.sin(a) * ring, y = cy - Math.cos(a) * ring;
            if (!inZone(x, y, r) || hits(x, y, r)) return null;
            for (const p of placed) { const dx = p.x - x, dy = p.y - y; if (dx * dx + dy * dy < (p.r + r + pad) * (p.r + r + pad)) return null; }
            const c = { x, y, r }; placed.push(c); out.cells[k] = c;
        }
        return out;
    }
    /* o: { zone:{l,t,r,b}, obst:[{l,t,r,b}], cx, cy (Misty's preferred centre), R0 (preferred radius), rf/rw/rs (fasting / water / small radius),
            minFast, minSmall, pad, walk }. Biggest Misty first, then the calmest angles, then the smallest shift from her spot. */
    function statLayout(o) {
        o = Object.assign({ pad: 8, walk: 18, minFast: 44, minSmall: 25 }, o || {});
        if (!o.rf) o.rf = Math.max(48, Math.min(72, o.R0 * 0.5));
        if (!o.rw) o.rw = Math.max(36, Math.min(56, o.R0 * 0.4));
        if (!o.rs) o.rs = Math.max(27, Math.min(40, o.R0 * 0.3));
        const dy = [0, 16, -16, 32, -32, 48, -48, 64, -64, 84, -84], dx = [0, -24, 24, -48, 48, -80, 80];
        for (let s = 1; s >= 0.5 - 1e-9; s -= 0.04) {
            for (const set of STAT_SETS) for (const y of dy) for (const x of dx) {
                const r = statTry(o, s, set, o.cx + x, o.cy + y);
                if (r) { r.ok = true; return r; }
            }
        }
        /* nothing fits (a tiny or very crowded screen): the smallest ring, flagged so the caller can fall back */
        const f = { misty: { x: o.cx, y: o.cy, r: o.R0 * 0.5 }, walk: 0, scale: 0.5, cells: {}, ok: false };
        STATS.forEach(k => { const a = STAT_SETS[0][k] * Math.PI / 180, r = o.minSmall, ring = f.misty.r + o.pad + r; f.cells[k] = { x: o.cx + Math.sin(a) * ring, y: o.cy - Math.cos(a) * ring, r }; });
        return f;
    }
    /* Misty's walk: she drifts toward one stat cell, rests there, then strolls on to the next one round the ring.
       Offsets in px from her resting centre, never longer than `walk`, so she never touches a cell. Deterministic in time. */
    const WALK_ORDER = ['sun', 'herb', 'move', 'water', 'fast', 'meal'];
    function walkAt(tMs, lay, opt) {
        opt = Object.assign({ travel: 5200, rest: 6800 }, opt || {});
        if (!lay || !lay.misty || !lay.walk) return { x: 0, y: 0, moving: false, at: null };
        const pts = WALK_ORDER.filter(k => lay.cells[k]).map(k => {
            const c = lay.cells[k], dx = c.x - lay.misty.x, dy = c.y - lay.misty.y, d = Math.hypot(dx, dy) || 1;
            return { k, x: dx / d * lay.walk, y: dy / d * lay.walk };
        });
        if (!pts.length) return { x: 0, y: 0, moving: false, at: null };
        const leg = opt.travel + opt.rest, n = pts.length, t = ((tMs % (leg * n)) + leg * n) % (leg * n), i = Math.floor(t / leg), u = t - i * leg;
        const from = pts[(i + n - 1) % n], to = pts[i];
        if (u >= opt.travel) return { x: to.x, y: to.y, moving: false, at: to.k };
        const k = u / opt.travel, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        /* stroll through a point a bit closer to her centre, so the path curves round her spot instead of cutting a chord */
        const mx = (from.x + to.x) * 0.3, my = (from.y + to.y) * 0.3;
        const q = 1 - e, x = q * q * from.x + 2 * q * e * mx + e * e * to.x, y = q * q * from.y + 2 * q * e * my + e * e * to.y;
        return { x, y, moving: true, at: null, dir: Math.sign(to.x - from.x) || 1 };
    }
    const api = { AURAS, STAGES, pick, aura, owns, cleanAura, auraItems, stage, heroView, rigAngles, nearAngle, zoomTarget, STATS, STAT_SETS, statLayout, walkAt, WALK_ORDER };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiWorldHomeCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
