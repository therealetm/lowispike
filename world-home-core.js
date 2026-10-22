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
    /* THE level table (Misty's level, the growth map, herb-config stages, care board, Forms, toasts all read it).
       Oct 22, 2026 evolution step 1 (Emmanuel: "I'm leveling up too fast. We need more levels. After level 10, it should go up to 25."):
       25 levels. Levels 1-6 keep their XP (the first days stay quick), 7-9 take a little longer, 10 is unchanged, and every level
       from 11 to 25 is 2-4 weeks of daily use (a regular day earns about 250 XP; math in MAYA-HANDOFF.md, "Evolution plan").
       evo: the evolution stage reached at that level (1-5 at levels 5, 10, 15, 20, 25), 0 elsewhere.
       Hooks for later steps, read through hooks(L) and left empty on purpose: stats (swim speed, shot strength, world-to-world
       speed per level), powers (e.g. the spike magnet, full at 25) and the Home bubble's look per evolution stage. */
    const STAGES = [
        { xp: 0, n: ['Spark', 'Funke', 'Chispa'], d: ['Just born. Every log makes you glow.', 'Gerade entstanden. Jeder Eintrag lässt dich leuchten.', 'Recién nacida. Cada registro te hace brillar.'] },
        { xp: 100, n: ['Little cell', 'Kleine Zelle', 'Celulita'], d: ['Your membrane gets its first shimmer.', 'Deine Membran bekommt ihren ersten Schimmer.', 'Tu membrana recibe su primer brillo.'] },
        { xp: 300, n: ['Glow cell', 'Leuchtzelle', 'Célula brillante'], d: ['Stronger light, calmer flow.', 'Stärkeres Licht, ruhigerer Fluss.', 'Más luz, flujo más tranquilo.'] },
        { xp: 700, n: ['Bright cell', 'Strahlende Zelle', 'Célula radiante'], d: ['Your glow reaches further.', 'Dein Leuchten reicht weiter.', 'Tu brillo llega más lejos.'] },
        { xp: 1500, evo: 1, n: ['Star cell', 'Sternzelle', 'Célula estelar'], d: ['A whole halo of light.', 'Ein ganzer Lichtkranz.', 'Todo un halo de luz.'] },
        { xp: 3000, n: ['Legend', 'Legende', 'Leyenda'], d: ['The brightest cell in your body.', 'Die hellste Zelle in deinem Körper.', 'La célula más brillante de tu cuerpo.'] },
        { xp: 5000, n: ['Nova', 'Nova', 'Nova'], d: ['Your light breaks out in a mane of blades and a gold crown.', 'Dein Licht bricht als Klingenmähne mit Goldkrone hervor.', 'Tu luz estalla en una melena de cuchillas y una corona dorada.'] },
        { xp: 7500, n: ['Titan', 'Titan', 'Titán'], d: ['Twin tails and a third pair of wings.', 'Zwei Schwänze und ein drittes Flügelpaar.', 'Dos colas y un tercer par de alas.'] },
        { xp: 10500, n: ['Monarch', 'Monarch', 'Monarca'], d: ['Power spikes all around you and a second pair of horns.', 'Kraftzacken rund um dich und ein zweites Hörnerpaar.', 'Picos de poder a tu alrededor y un segundo par de cuernos.'] },
        { xp: 14000, evo: 2, n: ['Majesty', 'Majestät', 'Majestad'], d: ['A tall gold crown and a ring of stars.', 'Eine hohe Goldkrone und ein Sternenring.', 'Una gran corona dorada y un anillo de estrellas.'] },
        { xp: 17500, n: ['Pulsar cell', 'Pulsarzelle', 'Célula púlsar'], d: ['Your light beats in a steady pulse.', 'Dein Licht schlägt in einem ruhigen Puls.', 'Tu luz late con un pulso firme.'] },
        { xp: 21200, n: ['Prism cell', 'Prismazelle', 'Célula prisma'], d: ['Your glow splits into every colour.', 'Dein Leuchten bricht sich in alle Farben.', 'Tu brillo se abre en todos los colores.'] },
        { xp: 25100, n: ['Crystal cell', 'Kristallzelle', 'Célula de cristal'], d: ['Your membrane turns clear and hard as crystal.', 'Deine Membran wird klar und fest wie Kristall.', 'Tu membrana se vuelve clara y dura como el cristal.'] },
        { xp: 29200, n: ['Thunder cell', 'Donnerzelle', 'Célula trueno'], d: ['Sparks crackle along your edges.', 'Funken knistern an deinen Rändern.', 'Chispas crepitan por tus bordes.'] },
        { xp: 33500, evo: 3, n: ['Supernova', 'Supernova', 'Supernova'], d: ['Your light bursts out brighter than ever.', 'Dein Licht bricht heller hervor als je zuvor.', 'Tu luz estalla más brillante que nunca.'] },
        { xp: 38000, n: ['Orbit cell', 'Orbitzelle', 'Célula órbita'], d: ['Small lights start to circle you.', 'Kleine Lichter beginnen, dich zu umkreisen.', 'Pequeñas luces empiezan a girar a tu alrededor.'] },
        { xp: 42700, n: ['Quasar cell', 'Quasarzelle', 'Célula cuásar'], d: ['A beam of light runs right through you.', 'Ein Lichtstrahl geht mitten durch dich.', 'Un rayo de luz te atraviesa.'] },
        { xp: 47600, n: ['Zenith cell', 'Zenitzelle', 'Célula cénit'], d: ['You shine from the highest point of the sky.', 'Du strahlst vom höchsten Punkt des Himmels.', 'Brillas desde lo más alto del cielo.'] },
        { xp: 52700, n: ['Phoenix cell', 'Phönixzelle', 'Célula fénix'], d: ['Flames of light rise around you.', 'Flammen aus Licht steigen um dich auf.', 'Llamas de luz se alzan a tu alrededor.'] },
        { xp: 58000, evo: 4, n: ['Galaxy', 'Galaxie', 'Galaxia'], d: ['A whole galaxy turns inside your glow.', 'Eine ganze Galaxie dreht sich in deinem Leuchten.', 'Una galaxia entera gira dentro de tu brillo.'] },
        { xp: 63500, n: ['Celestial cell', 'Himmelszelle', 'Célula celestial'], d: ['The sky itself seems to follow you.', 'Der Himmel selbst scheint dir zu folgen.', 'El cielo mismo parece seguirte.'] },
        { xp: 69200, n: ['Eternal cell', 'Ewige Zelle', 'Célula eterna'], d: ['Your light no longer fades.', 'Dein Licht verblasst nicht mehr.', 'Tu luz ya no se apaga.'] },
        { xp: 75100, n: ['Cosmic cell', 'Kosmoszelle', 'Célula cósmica'], d: ['Stars gather in your wake.', 'Sterne sammeln sich hinter dir.', 'Las estrellas se reúnen a tu paso.'] },
        { xp: 81200, n: ['Genesis cell', 'Genesiszelle', 'Célula génesis'], d: ['New light is born wherever you swim.', 'Wo du schwimmst, entsteht neues Licht.', 'Donde nadas nace luz nueva.'] },
        { xp: 87500, evo: 5, n: ['Cosmos', 'Kosmos', 'Cosmos'], d: ['The final form: a whole universe of light.', 'Die letzte Form: ein ganzes Universum aus Licht.', 'La forma final: todo un universo de luz.'] }
    ];
    STAGES.forEach(s => { s.evo = s.evo || 0; });
    const MAX_LEVEL = STAGES.length;
    const EVO_LEVELS = STAGES.map((s, i) => s.evo ? i + 1 : 0).filter(Boolean); /* [5, 10, 15, 20, 25] */
    /* the level (1-based) where evolution stage k (1-5) arrives, and the evolution stage a level has reached (0 before level 5) */
    function evoLevel(k) { return EVO_LEVELS[k - 1] || 0; }
    function evoOf(L) { let e = 0; for (let i = 0; i < Math.min(MAX_LEVEL, L | 0); i++) if (STAGES[i].evo) e = STAGES[i].evo; return e; }
    /* hooks for evolution steps 2-5 (see MAYA-HANDOFF.md "Evolution plan"): empty until those steps fill them */
    const HOOKS = { stats: null, powers: [], bubble: null };
    function hooks(L) { L = Math.max(1, Math.min(MAX_LEVEL, L | 0)); return { level: L, evo: evoOf(L), stats: HOOKS.stats ? HOOKS.stats(L) : null, powers: HOOKS.powers.filter(p => L >= p.lv), bubble: HOOKS.bubble ? HOOKS.bubble(evoOf(L)) : null }; }
    /* ---------- the fair-play floor for the curve change (Oct 22, 2026) ----------
       Before this, the XP for levels 1-10 was OLD_XP. Nobody loses XP; the level is worked out again from total XP. Someone whose
       level would drop keeps the old level as a floor until the new curve passes it (only XP between 4,500-5,000, 7,000-7,500 and
       10,000-10,500 is affected). Stored once per phone; only YOUR level reads it (mine = true), never another member's. */
    const OLD_XP = [0, 100, 300, 700, 1500, 3000, 4500, 7000, 10000, 14000];
    const CURVE = 2, CURVE_KEY = 'lowi.lvCurve', FLOOR_KEY = 'lowi.lvFloor';
    function curveLevel(xp, table) { xp = Math.max(0, +xp || 0); const t = table || STAGES.map(s => s.xp); let i = 0; while (i < t.length - 1 && xp >= t[i + 1]) i++; return i + 1; }
    function floorFor(xp) { const was = curveLevel(xp, OLD_XP), now = curveLevel(xp); return was > now ? was : 0; }
    const LS = () => { try { return root.localStorage || null; } catch (e) { return null; } };
    function migrate(xp, store) {
        const ls = store || LS(); if (!ls) return 0;
        try {
            if (+ls.getItem(CURVE_KEY) >= CURVE) return +ls.getItem(FLOOR_KEY) || 0;
            const f = floorFor(xp);
            if (f) ls.setItem(FLOOR_KEY, String(f)); else ls.removeItem(FLOOR_KEY);
            ls.setItem(CURVE_KEY, String(CURVE));
            return f;
        } catch (e) { return 0; }
    }
    /* your floor right now: gone for good once the curve level reaches it */
    function myFloor(xp, store) {
        const ls = store || LS(); if (!ls) return 0;
        try {
            const f = +ls.getItem(FLOOR_KEY) || 0; if (!f) return 0;
            if (curveLevel(xp) >= f) { ls.removeItem(FLOOR_KEY); return 0; }
            return Math.min(MAX_LEVEL, f);
        } catch (e) { return 0; }
    }
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
    /* stage(xp): the level for any XP. stage(xp, true): YOUR level (keeps the fair-play floor); a number is a floor level. */
    function stage(xp, mine) {
        xp = Math.max(0, +xp || 0); let i = 0;
        STAGES.forEach((s, k) => { if (xp >= s.xp) i = k; });
        const base = i, f = mine === true ? myFloor(xp) : (+mine || 0);
        if (f > i + 1) i = Math.min(MAX_LEVEL, f) - 1;
        const next = STAGES[i + 1] || null, cur = STAGES[i], from = STAGES[base].xp;
        const pct = next ? Math.max(0, Math.min(1, (xp - from) / (next.xp - from))) : 1;
        return { index: i, cur, next, pct, left: next ? Math.ceil(next.xp - xp) : 0, evo: evoOf(i + 1), floored: i > base };
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
    const api = { AURAS, STAGES, MAX_LEVEL, EVO_LEVELS, OLD_XP, HOOKS, evoLevel, evoOf, hooks, curveLevel, floorFor, migrate, myFloor, pick, aura, owns, cleanAura, auraItems, stage, heroView, rigAngles, nearAngle, zoomTarget };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiWorldHomeCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
