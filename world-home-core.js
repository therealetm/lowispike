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
    const api = { AURAS, STAGES, pick, aura, owns, cleanAura, auraItems, stage, heroView, rigAngles, nearAngle, zoomTarget };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiWorldHomeCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
