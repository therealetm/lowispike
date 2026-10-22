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
    /* Aura shop step 1 (Oct 22 2026, Emmanuel: "more impressive bubbles ... locked, then unlocked with XP points they can spend").
       Spending must never lower the level or the leaderboard, so the shop uses Sparks, not XP: every XP gain is also a spark
       (1:1, so the same fair-play caps), and a spark spent is gone while the XP stays. Sparks = total XP - sparks spent, so an
       existing user starts with sparks equal to the XP they already have (the back-fill), and an XP gain that is taken back
       (a deleted log) takes its spark back too. The 8 glows above stay level rewards (free at their XP, Nebula at 3000 XP =
       Legend): nothing anyone already wears gets a price tag. These animated auras are the ones you buy. */
    const SHOP = [
        { id: 'ember', sp: 250, fx: 'ember', a: '#ffb36b', b: '#ff4d2e', n: ['Ember', 'Glut', 'Brasa'], d: ['Warm sparks rise from her membrane.', 'Warme Funken steigen von ihrer Membran auf.', 'Chispas cálidas suben de su membrana.'] },
        { id: 'orbs', sp: 500, fx: 'orbs', a: '#9ef7ff', b: '#5a8cff', n: ['Orbiting orbs', 'Kreisende Kugeln', 'Orbes en órbita'], d: ['Three little orbs circle her.', 'Drei kleine Kugeln kreisen um sie.', 'Tres orbes pequeños giran a su alrededor.'] },
        { id: 'trail', sp: 900, fx: 'trail', a: '#fff3b0', b: '#c39bff', n: ['Stardust trail', 'Sternenstaub-Spur', 'Estela de polvo estelar'], d: ['Glitter follows her when she swims.', 'Glitzer folgt ihr, wenn sie schwimmt.', 'Purpurina la sigue cuando nada.'] },
        { id: 'electric', sp: 1400, fx: 'electric', a: '#b8f4ff', b: '#4f7bff', n: ['Electric', 'Elektrisch', 'Eléctrica'], d: ['Crackling arcs of light.', 'Knisternde Lichtbogen.', 'Arcos de luz que chisporrotean.'] },
        { id: 'prism', sp: 2000, fx: 'prism', a: '#ffd1f2', b: '#8be9ff', n: ['Prism', 'Prisma', 'Prisma'], d: ['Light breaks into a rainbow around her.', 'Licht bricht sich als Regenbogen um sie.', 'La luz se rompe en un arcoíris a su alrededor.'] },
        { id: 'galaxy', sp: 3000, fx: 'galaxy', a: '#c9a8ff', b: '#3b2a8f', n: ['Galaxy', 'Galaxie', 'Galaxia'], d: ['A swirling star field inside her.', 'Ein wirbelndes Sternenfeld in ihr.', 'Un campo de estrellas girando dentro de ella.'] }
    ];
    /* Step 2 hooks (not built yet, see MAYA-HANDOFF.md): bubble size and shape are their own unlockables, bought with the same
       sparks and saved in the same wallet (wallet.size / wallet.shape = the one picked, wallet.own = every id bought). */
    const SIZES = [
        { id: 'size:m', kind: 'size', sp: 0, scale: 1, n: ['Normal', 'Normal', 'Normal'] },
        { id: 'size:l', kind: 'size', sp: 600, scale: 1.12, n: ['Big', 'Groß', 'Grande'] },
        { id: 'size:xl', kind: 'size', sp: 1500, scale: 1.24, n: ['Huge', 'Riesig', 'Enorme'] }
    ];
    const SHAPES = [
        { id: 'shape:round', kind: 'shape', sp: 0, n: ['Round', 'Rund', 'Redonda'] },
        { id: 'shape:square', kind: 'shape', sp: 800, n: ['Square', 'Quadrat', 'Cuadrada'] },
        { id: 'shape:rect', kind: 'shape', sp: 800, n: ['Rectangle', 'Rechteck', 'Rectángulo'] },
        { id: 'shape:triangle', kind: 'shape', sp: 1200, n: ['Triangle', 'Dreieck', 'Triángulo'] },
        { id: 'shape:diamond', kind: 'shape', sp: 2500, n: ['Diamond', 'Diamant', 'Diamante'] },
        { id: 'shape:gem', kind: 'shape', sp: 4000, n: ['Gem cut', 'Edelsteinschliff', 'Talla de gema'] }
    ];
    const PRICE = {};
    SHOP.forEach(a => { PRICE[a.id] = a.sp; });
    SIZES.concat(SHAPES).forEach(a => { if (a.sp) PRICE[a.id] = a.sp; });
    /* the wallet: { spent, own: [ids bought], size, shape }; anything odd is cleaned, never trusted */
    function wallet(w) {
        w = w && typeof w === 'object' ? w : {};
        const own = Array.isArray(w.own) ? w.own.filter((id, i, a) => typeof id === 'string' && PRICE[id] && a.indexOf(id) === i) : [];
        const spent = own.reduce((s, id) => s + PRICE[id], 0);
        return { v: 1, spent: Math.max(spent, Math.floor(+w.spent || 0)), own, size: typeof w.size === 'string' ? w.size : '', shape: typeof w.shape === 'string' ? w.shape : '' };
    }
    /* sparks you can spend: every XP ever earned minus what you spent (never below 0) */
    function sparks(xp, w) { return Math.max(0, Math.floor(Math.max(0, +xp || 0)) - wallet(w).spent); }
    /* buy: pure, returns a new wallet. XP is only read, never changed, so the level and the leaderboard stay where they are. */
    function buy(w, id, xp) {
        const cw = wallet(w), price = PRICE[id];
        if (!price) return { ok: false, why: 'unknown', wallet: cw, need: 0 };
        if (cw.own.indexOf(id) >= 0) return { ok: false, why: 'owned', wallet: cw, need: 0 };
        const have = sparks(xp, cw);
        if (have < price) return { ok: false, why: 'short', wallet: cw, need: price - have };
        const out = wallet(Object.assign({}, cw, { own: cw.own.concat(id), spent: cw.spent + price }));
        return { ok: true, why: '', wallet: out, need: 0, left: sparks(xp, out) };
    }
    /* the same thresholds as LOWI_HERB_CONFIG.stages, named for a cell */
    const STAGES = [
        { xp: 0, n: ['Spark', 'Funke', 'Chispa'], d: ['Just born. Every log makes you glow.', 'Gerade entstanden. Jeder Eintrag lässt dich leuchten.', 'Recién nacida. Cada registro te hace brillar.'] },
        { xp: 100, n: ['Little cell', 'Kleine Zelle', 'Celulita'], d: ['Your membrane gets its first shimmer.', 'Deine Membran bekommt ihren ersten Schimmer.', 'Tu membrana recibe su primer brillo.'] },
        { xp: 300, n: ['Glow cell', 'Leuchtzelle', 'Célula brillante'], d: ['Stronger light, calmer flow.', 'Stärkeres Licht, ruhigerer Fluss.', 'Más luz, flujo más tranquilo.'] },
        { xp: 700, n: ['Bright cell', 'Strahlende Zelle', 'Célula radiante'], d: ['Your glow reaches further.', 'Dein Leuchten reicht weiter.', 'Tu brillo llega más lejos.'] },
        { xp: 1500, n: ['Star cell', 'Sternzelle', 'Célula estelar'], d: ['A whole halo of light.', 'Ein ganzer Lichtkranz.', 'Todo un halo de luz.'] },
        { xp: 3000, n: ['Legend', 'Legende', 'Leyenda'], d: ['The brightest cell in your body.', 'Die hellste Zelle in deinem Körper.', 'La célula más brillante de tu cuerpo.'] },
        /* Oct 19 2026 night: four more levels after Legend, same XP as herb-config.js stages (XP only, never a food or the Collection) */
        { xp: 4500, n: ['Nova', 'Nova', 'Nova'], d: ['Your light breaks out in a mane of blades and a gold crown.', 'Dein Licht bricht als Klingenmähne mit Goldkrone hervor.', 'Tu luz estalla en una melena de cuchillas y una corona dorada.'] },
        { xp: 7000, n: ['Titan', 'Titan', 'Titán'], d: ['Twin tails and a third pair of wings.', 'Zwei Schwänze und ein drittes Flügelpaar.', 'Dos colas y un tercer par de alas.'] },
        { xp: 10000, n: ['Monarch', 'Monarch', 'Monarca'], d: ['Power spikes all around you and a second pair of horns.', 'Kraftzacken rund um dich und ein zweites Hörnerpaar.', 'Picos de poder a tu alrededor y un segundo par de cuernos.'] },
        { xp: 14000, n: ['Majesty', 'Majestät', 'Majestad'], d: ['The highest form: a tall gold crown and a ring of stars.', 'Die höchste Form: eine hohe Goldkrone und ein Sternenring.', 'La forma más alta: una gran corona dorada y un anillo de estrellas.'] }
    ];
    const ix = l => ({ de: 1, es: 2 })[l] || 0;
    const pick = (arr, l) => arr[ix(l)] || arr[0];
    const ALL = AURAS.concat(SHOP);
    function aura(id) { return ALL.find(a => a.id === id) || AURAS[0]; }
    /* a level glow is yours at its XP; a shop aura is yours once bought (w = the sparks wallet) */
    function owns(id, xp, w) {
        const a = AURAS.find(x => x.id === id); if (a) return (+xp || 0) >= a.xp;
        const s = SHOP.find(x => x.id === id); return !!s && wallet(w).own.indexOf(id) >= 0;
    }
    /* a saved aura only counts while it is unlocked; anything else falls back to the starter light */
    function cleanAura(id, xp, w) { return owns(id, xp, w) ? id : AURAS[0].id; }
    function auraItems(xp, cur, w) {
        xp = +xp || 0; cur = cleanAura(cur, xp, w);
        return AURAS.map(a => ({ id: a.id, xp: a.xp, a: a.a, b: a.b, n: a.n, d: a.d, status: a.id === cur ? 'on' : xp >= a.xp ? 'ready' : 'locked', left: Math.max(0, a.xp - xp) }));
    }
    /* the shop cards: price, whether you can pay it now and how many sparks are still missing */
    function shopItems(xp, cur, w) {
        const cw = wallet(w), have = sparks(xp, cw); cur = cleanAura(cur, xp, cw);
        return SHOP.map(a => { const own = cw.own.indexOf(a.id) >= 0; return { id: a.id, sp: a.sp, fx: a.fx, a: a.a, b: a.b, n: a.n, d: a.d, status: a.id === cur ? 'on' : own ? 'ready' : 'locked', afford: !own && have >= a.sp, need: own ? 0 : Math.max(0, a.sp - have) }; });
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
    const api = { AURAS, SHOP, SIZES, SHAPES, PRICE, STAGES, pick, aura, owns, cleanAura, auraItems, shopItems, wallet, sparks, buy, stage, heroView, rigAngles, nearAngle, zoomTarget };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiWorldHomeCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
