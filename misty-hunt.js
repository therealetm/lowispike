/* LOWiSPIKE Misty world hunt (Oct 17, 2026). E-man: "When I go from world to world with Misty, that should make us healthier.
   It's difficult flying into a world when you're unhealthy, but once you're in, that should power you up." "In every world there
   should be bad stuff, or sugar, that they have to attack. Attacking is just flying next to it, Misty eats them, then levels up
   and gets stronger." "They need to be hidden really hard... in corners and spread out... 4 to 10 depending on what you eat."
   - Each world hides 4..10 sugar crumbs / murk germs (4 + 2 per spiky log today, LowiWorldMood food + products: the weather's
     own count, no formula of our own). They sit far out in the world's corners, small and faint in the fog; each world and each
     day has its own layout. Misty eats one when YOU steer her right next to it (the autopilot never eats: no free farming).
   - Every crumb eaten gives power XP and a little energy boost, and the world's murk thins (body-world-regions st.murk).
     Getting into a world gives a one-time power-up per world per day. On a weak day (energy below .5) the world's pull is weak:
     she bounces off its edge once or twice before she gets in (still always possible).
   - Fair rules: each crumb once per day, entry bonus once per world per day, max 60 XP and +.2 energy boost per day; all of it
     resets at local midnight. Game only: the copy talks about the world, never about health.
   Shared API (COORDINATOR.md, read by the health scale): window.LowiMistyPower.read() -> { level, xp, next, boost, label }
   and window event 'lowi:misty-power' with the same object (+ gained, why, world, left, total), fired only on change.
   No loop of its own: misty-flight.js calls frame() from its inside-a-world frame, so it only runs while she is in a world. */
(function (root) {
    'use strict';
    const RULES = { min: 4, max: 10, perSpike: 2, xpEat: 3, xpEnter: 4, xpDay: 60, boostEat: 0.02, boostEnter: 0.03, boostDay: 0.2, eatR: 0.55, senseR: 2.4 };
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const r3 = x => Math.round(x * 1000) / 1000;
    const pad = n => (n < 10 ? '0' : '') + n;
    const dayKey = ts => { const d = new Date(+ts || Date.now()); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const cleanId = id => String(id || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 24);
    /* more spiky logs today -> more to clear (never more power: the daily cap is the same) */
    const count = spikes => clamp(RULES.min + RULES.perSpike * Math.max(0, Math.floor(+spikes || 0)), RULES.min, RULES.max);
    /* XP from level L to L+1 */
    const need = L => 20 + 15 * L;
    function levelOf(total) {
        let L = 0, x = Math.max(0, Math.floor(+total || 0));
        while (L < 50 && x >= need(L)) { x -= need(L); L++; }
        return { level: L, xp: x, next: L >= 50 ? 0 : need(L) };
    }
    /* weak day = weak pull: how many times she bounces off a world's edge before she gets in */
    const tries = energy => { const e = +energy; if (!isFinite(e)) return 0; return e >= 0.5 ? 0 : e >= 0.3 ? 1 : 2; };
    /* a stronger Misty flies a little faster and eats from a little further away */
    const strength = level => 1 + Math.min(0.3, 0.03 * Math.max(0, +level || 0));
    function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    /* hiding spots: the world's corners first (cube corners), then its far top/bottom/sides, jittered, far out (72-96% of her
       reach), shuffled per world and day: every world and every day looks different. Unit vectors * rad (0..1 of reach). */
    const CORNERS = [[1, 1, 1], [-1, 1, 1], [1, -1, 1], [-1, -1, 1], [1, 1, -1], [-1, 1, -1], [1, -1, -1], [-1, -1, -1], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
    function spots(day, world, n) {
        const r = rng(hash(day + '|' + world)), c = CORNERS.slice(0, 8).sort(() => r() - 0.5).concat(CORNERS.slice(8).sort(() => r() - 0.5)), out = [];
        for (let i = 0; i < n; i++) {
            const b = c[i % c.length];
            let x = b[0] + (r() - 0.5) * 0.5, y = b[1] * 0.8 + (r() - 0.5) * 0.5, z = b[2] + (r() - 0.5) * 0.5;
            const L = Math.hypot(x, y, z) || 1; x /= L; y /= L; z /= L;
            out.push({ i, x: r3(x), y: r3(y), z: r3(z), rad: r3(0.72 + 0.24 * r()), kind: r() < 0.5 ? 'sugar' : 'germ' });
        }
        return out;
    }
    function norm(st, now) {
        const s = st && typeof st === 'object' ? st : {}, day = dayKey(now);
        const o = { xp: Math.max(0, Math.floor(+s.xp || 0)), day, today: 0, boost: 0, eaten: {}, entered: [] };
        if (s.day === day) {
            o.today = clamp(Math.floor(+s.today || 0), 0, RULES.xpDay); o.boost = clamp(+s.boost || 0, 0, RULES.boostDay);
            if (s.eaten && typeof s.eaten === 'object') for (const k of Object.keys(s.eaten)) { const w = cleanId(k); if (w && Array.isArray(s.eaten[k])) o.eaten[w] = s.eaten[k].filter(i => Number.isInteger(i) && i >= 0 && i < RULES.max).filter((i, j, a) => a.indexOf(i) === j); }
            if (Array.isArray(s.entered)) o.entered = s.entered.map(cleanId).filter((w, j, a) => w && a.indexOf(w) === j);
        }
        return o;
    }
    function grant(s, xp, boost) {
        const gx = Math.max(0, Math.min(xp, RULES.xpDay - s.today)), gb = Math.max(0, Math.min(boost, RULES.boostDay - s.boost));
        s.xp += gx; s.today += gx; s.boost = r3(s.boost + gb);
        return { gained: gx, boosted: r3(gb) };
    }
    /* she eats crumb i of n in a world: once per day, within the daily caps */
    function eat(st, o) {
        o = o || {}; const s = norm(st, o.now), w = cleanId(o.world), i = Math.floor(+o.i), n = clamp(Math.floor(+o.n || 0), 0, RULES.max);
        if (!w || !(i >= 0 && i < n)) return { state: s, ok: false, why: 'bad', gained: 0, boosted: 0 };
        const list = s.eaten[w] || (s.eaten[w] = []);
        if (list.includes(i)) return { state: s, ok: false, why: 'dup', gained: 0, boosted: 0 };
        list.push(i);
        const g = grant(s, RULES.xpEat, RULES.boostEat);
        return Object.assign({ state: s, ok: true, why: g.gained ? 'eat' : 'cap', left: Math.max(0, n - list.length) }, g);
    }
    /* getting into a world powers her up, once per world per day */
    function enter(st, o) {
        o = o || {}; const s = norm(st, o.now), w = cleanId(o.world);
        if (!w || w === 'hub' || s.entered.includes(w)) return { state: s, ok: false, why: w ? 'dup' : 'bad', gained: 0, boosted: 0 };
        s.entered.push(w);
        const g = grant(s, RULES.xpEnter, RULES.boostEnter);
        return Object.assign({ state: s, ok: true, why: 'enter' }, g);
    }
    const STR = {
        label: ['Hunt power Lv ', 'Jagdkraft Lv ', 'Poder de caza Nv '],
        sense: ['I sense {n} sugar crumbs. Steer me close and I gobble them!', 'Ich spüre {n} Zuckerkrümel. Steuer mich hin, ich futtere sie!', 'Siento {n} migas de azúcar. ¡Acércame y me las como!'],
        found: ['Got one! {left} left in this world.', 'Erwischt! Noch {left} in dieser Welt.', '¡Atrapada! Quedan {left} en este mundo.'],
        clean: ['This world is sparkling clean again!', 'Diese Welt glänzt wieder!', '¡Este mundo vuelve a brillar!'],
        level: ['Level up! Misty is now level {L}. I feel stronger!', 'Level up! Misty ist jetzt Level {L}. Ich fühl mich stärker!', '¡Subes de nivel! Misty ya es nivel {L}. ¡Me siento más fuerte!'],
        entered: ['We made it in! That gives me a boost.', 'Wir sind drin! Das gibt mir Kraft.', '¡Lo logramos! Eso me da un empujón.'],
        bounce: ['The pull is weak today and I bounced off. Try again, I am almost in!', 'Der Sog ist heute schwach, ich bin abgeprallt. Nochmal, ich bin fast drin!', 'Hoy la atracción es débil y reboté. ¡Otra vez, ya casi entro!'],
        full: ['I am full of power for today. The crumbs still get cleared!', 'Für heute bin ich voller Kraft. Die Krümel räum ich trotzdem weg!', 'Por hoy estoy llena de poder. ¡Igual limpio las migas!'],
        warm: ['Warmer... one is close!', 'Wärmer... einer ist ganz nah!', 'Caliente... ¡hay una cerca!']
    };
    const li = lang => { const l = String(lang || 'de').slice(0, 2); return l === 'en' ? 0 : l === 'es' ? 2 : 1; };
    const wnm = s => { try { const B = (typeof window !== 'undefined' ? window : globalThis).LowiBirthCompanion; return s && B && B.withName ? B.withName(s) : s; } catch (e) { return s; } }; /* BH-045: the user's own companion name, never the default "Misty" */
    const tr = (k, lang, v) => String((STR[k] || [''])[li(lang)] || '').replace(/\{(\w+)\}/g, (m, x) => v && v[x] != null ? v[x] : m);
    function read(st, now, lang) {
        const s = norm(st, now), L = levelOf(s.xp);
        return { level: L.level, xp: L.xp, next: L.next, boost: s.boost, label: L.level > 0 ? tr('label', lang) + L.level : '', total: s.xp, today: s.today, cap: RULES.xpDay };
    }
    /* Oct 19 (E-man): weak Misty can't break free of a world's rings and gets pulled back in. What she says then: short, warm, her
       own voice, never a lecture. He is "not a fan of text repeating itself too often", so they come out of a shuffle bag (bagNext):
       every line once before any comes back, and never the same line twice in a row, also when the bag is refilled. */
    const HELD = {
        en: ['Whoa, the rings pulled me right back in! Let me catch my breath and try again.', 'So close! This world wants me to stay a little longer.', 'My little engine sputtered. One more push?', 'The pull is strong today and I am running low. Next try!', 'Back in! I will build up speed and break free next time.', 'Oof, the rings hugged me back in. I am not giving up!', 'A little more energy and I will fly right out of here.', 'I almost touched the stars! Let us try that again.'],
        de: ['Huch, die Ringe haben mich zurückgezogen! Kurz durchatmen, dann nochmal.', 'So knapp! Diese Welt will, dass ich noch ein bisschen bleibe.', 'Mein kleiner Antrieb hat gestottert. Noch ein Anlauf?', 'Der Sog ist heute stark und meine Kraft knapp. Nächster Versuch!', 'Wieder drin! Ich hole Schwung und breche beim nächsten Mal durch.', 'Uff, die Ringe haben mich zurückgeholt. Ich gebe nicht auf!', 'Noch etwas mehr Energie, dann fliege ich hier raus.', 'Fast hätte ich die Sterne berührt! Versuchen wir es nochmal.'],
        es: ['¡Uy, los anillos me arrastraron de vuelta! Respiro un momento y lo intento otra vez.', '¡Casi! Este mundo quiere que me quede un poquito más.', 'Mi pequeño motor tosió. ¿Otro empujón?', 'Hoy la atracción es fuerte y me queda poca energía. ¡Siguiente intento!', '¡Otra vez dentro! Tomo impulso y la próxima vez me escapo.', 'Uf, los anillos me abrazaron de vuelta. ¡No me rindo!', 'Con un poco más de energía salgo volando de aquí.', '¡Casi toco las estrellas! Probemos otra vez.']
    };
    function bagNext(bag, n, rnd) {
        n = Math.max(0, Math.floor(+n || 0)); rnd = typeof rnd === 'function' ? rnd : Math.random;
        if (!n) return { i: -1, bag: { left: [], last: -1 } };
        const last = bag && Number.isInteger(bag.last) && bag.last < n ? bag.last : -1;
        let left = bag && Array.isArray(bag.left) ? bag.left.filter((i, j, a) => Number.isInteger(i) && i >= 0 && i < n && a.indexOf(i) === j && i !== last) : [];
        if (!left.length) {
            left = []; for (let i = 0; i < n; i++) left.push(i);
            for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)) % (i + 1); const t = left[i]; left[i] = left[j]; left[j] = t; }
            if (n > 1 && left[0] === last) { const j = 1 + (Math.floor(rnd() * (n - 1)) % (n - 1)); const t = left[0]; left[0] = left[j]; left[j] = t; }
        }
        const i = left.shift();
        return { i, bag: { left, last: i } };
    }
    const heldLine = (i, lang) => { const L = HELD[String(lang || 'de').slice(0, 2)] || HELD.de; return L[i] || L[0]; };
    const core = { RULES, dayKey, count, need, levelOf, tries, strength, spots, norm, eat, enter, read, STR, tr, HELD, bagNext, heldLine };
    if (typeof module !== 'undefined' && module.exports) module.exports = core;
    root.LowiMistyHuntCore = core;

    /* ---------- browser ---------- */
    const W = root, D = W.document;
    if (!D || !W.addEventListener || W.LowiMistyHunt) return;
    const S = () => { try { return (W.LowiVitalsBridge && W.LowiVitalsBridge.state && W.LowiVitalsBridge.state()) || W.S || null; } catch (e) { return null; } };
    const save = () => { try { W.LowiVitalsBridge.save(); } catch (e) { } };
    const lang = () => String((W.LowiI18n && W.LowiI18n.lang) || D.documentElement.lang || 'de').slice(0, 2);
    let lastSay = 0;
    /* cell-guide (Oct 17, E-man): in a world the little cell guide says these lines itself, in its bubble beside it, placed clear of
       the Daily Quest and the controls (region-pals.js). The top toast is only the fallback when no guide is there (e.g. the bounce
       at a world's edge, before you are in). */
    const say = (key, v, force, world) => {
        try { const G = W.LowiRegionPals; if (G && G.hunt && G.hunt(key, v || {}, world || H.id)) return; } catch (e) { }
        if (!STR[key]) return;
        const t = Date.now(); if (!force && t - lastSay < 2500) return; lastSay = t;
        try { if (W.LowiPraise && W.LowiPraise.say) W.LowiPraise.say(wnm(tr(key, lang(), v))); } catch (e) { }
    };
    const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const mine = () => { const s = S(); return s ? (s.mistyPower = norm(s.mistyPower)) : norm(null); };
    let last = null;
    function pub(extra) {
        const r = Object.assign(read(mine(), Date.now(), lang()), extra || {});
        const key = [r.level, r.xp, r.next, r.boost].join('|');
        if (!extra && last === key) return r;
        last = key;
        try { W.dispatchEvent(new CustomEvent('lowi:misty-power', { detail: r })); } catch (e) { }
        return r;
    }
    W.LowiMistyPower = {
        read: () => read(mine(), Date.now(), lang()),
        get level() { return read(mine(), Date.now(), lang()).level; },
        get boost() { return read(mine(), Date.now(), lang()).boost; },
        strength: () => strength(read(mine(), Date.now(), lang()).level)
    };
    /* ---- art: a sugar crumb (amber glass cube) and a murk germ (dim violet blob with little spikes), plus a soft murk cloud ---- */
    let art = null;
    function canvasArt() {
        if (art) return art;
        const mk = (draw) => { const c = D.createElement('canvas'); c.width = c.height = 96; draw(c.getContext('2d')); return c; };
        /* cell-guide (Oct 17, E-man: "not in the same visual language"): the crumbs are small glass bubbles like the rest of the app
           (pale rim, soft tint, a highlight top-left), with the sugar cube / germ inside, instead of flat stickers */
        const orb = (g, rgb, rim) => {
            const halo = g.createRadialGradient(48, 48, 10, 48, 48, 47); halo.addColorStop(0, 'rgba(' + rgb + ',.42)'); halo.addColorStop(1, 'rgba(' + rgb + ',0)');
            g.fillStyle = halo; g.fillRect(0, 0, 96, 96);
            const body = g.createRadialGradient(42, 40, 3, 48, 48, 27); body.addColorStop(0, 'rgba(255,255,255,.22)'); body.addColorStop(0.6, 'rgba(' + rgb + ',.26)'); body.addColorStop(1, 'rgba(' + rgb + ',.5)');
            g.fillStyle = body; g.beginPath(); g.arc(48, 48, 27, 0, Math.PI * 2); g.fill();
            g.strokeStyle = rim; g.lineWidth = 2.2; g.stroke();
        };
        const shine = g => { const hl = g.createRadialGradient(38, 35, 1, 38, 35, 12); hl.addColorStop(0, 'rgba(255,255,255,.85)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hl; g.beginPath(); g.arc(38, 35, 12, 0, Math.PI * 2); g.fill(); };
        art = {
            sugar: mk(g => {
                orb(g, '255,190,110', 'rgba(255,240,215,.9)');
                g.save(); g.translate(48, 50); g.rotate(0.5);
                g.fillStyle = 'rgba(255,200,130,.9)'; g.strokeStyle = 'rgba(255,248,230,.95)'; g.lineWidth = 2;
                g.beginPath(); if (g.roundRect) g.roundRect(-11, -11, 22, 22, 5); else g.rect(-11, -11, 22, 22); g.fill(); g.stroke();
                g.restore(); shine(g);
            }),
            germ: mk(g => {
                orb(g, '176,128,236', 'rgba(232,214,255,.9)');
                g.strokeStyle = 'rgba(226,200,255,.9)'; g.lineWidth = 2;
                for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.beginPath(); g.moveTo(48 + Math.cos(a) * 10, 48 + Math.sin(a) * 10); g.lineTo(48 + Math.cos(a) * 16, 48 + Math.sin(a) * 16); g.stroke(); }
                g.fillStyle = 'rgba(132,82,190,.9)'; g.beginPath(); g.arc(48, 48, 10, 0, Math.PI * 2); g.fill(); g.stroke();
                shine(g);
            }),
            murk: mk(g => { const gr = g.createRadialGradient(48, 48, 2, 48, 48, 48); gr.addColorStop(0, 'rgba(70,40,90,.55)'); gr.addColorStop(1, 'rgba(70,40,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, 96, 96); })
        };
        return art;
    }
    /* ---- live hunt in the current world ---- */
    const H = { reg: null, id: null, bits: [], n: 0, t: 0, eatAnim: [], warmT: 0, sensed: {}, day: '', dayChk: 0, steerAt: 0, autoSaid: 0, autoChk: 0 };
    /* hunt-count (Oct 17, E-man: "how many are left? I'm just flying around, not knowing if there are still any"): the live
       count of THIS world's hunt, straight from the crumbs that are really there. 'lowi:hunt-count' fires only when it changes
       (she gets in, eats one, leaves, a new day), never per frame. hunt-count.js shows it under the Daily Quest box. */
    function tally() { const left = H.bits.filter(b => !b.gone).length; return { world: H.id, n: H.n, left, collected: Math.max(0, H.n - left) }; }
    let lastTally = '';
    function tell() { const c = tally(), k = [c.world, c.n, c.left].join('|'); if (k === lastTally) return c; lastTally = k; try { W.dispatchEvent(new CustomEvent('lowi:hunt-count', { detail: c })); } catch (e) { } return c; }
    /* hunt-count: take the crumbs of a world out of the scene (a new day respawns the same world with its new layout) */
    function drop() { for (const b of H.bits) for (const o of [b.sp, b.cloud]) { try { if (o.parent) o.parent.remove(o); o.material.dispose(); } catch (e) { } } }
    const bounced = {};
    function regions() { return W.LowiWorldRegions || null; }
    function spikesToday() { try { const m = W.LowiWorldMood && W.LowiWorldMood.mood; return m ? (+m.food || 0) + (+m.products || 0) : 0; } catch (e) { return 0; } }
    function murk() { const R = regions(); if (!R || !R.state) return; const left = H.bits.filter(b => !b.gone).length; R.state.murk = H.n ? left / H.n : 0; }
    function spawn(ctx, reg, id, reach) {
        H.reg = reg; H.id = id; H.bits = []; H.eatAnim = []; H.n = 0; H.autoSaid = 0; H.autoChk = 0;
        const a = ctx.a, T = a && a.THREE; if (!T || !reg || !reg.group || !id || id === 'hub') { tell(); return; }
        const day = dayKey(); H.day = day; const n = count(spikesToday()), s = mine(), done = s.eaten[cleanId(id)] || [], A = canvasArt();
        const tex = {}; for (const k of ['sugar', 'germ', 'murk']) { tex[k] = new T.CanvasTexture(A[k]); if (T.SRGBColorSpace) tex[k].colorSpace = T.SRGBColorSpace; }
        H.n = n;
        for (const p of spots(day, cleanId(id), n)) {
            if (done.includes(p.i)) continue;
            const m = new T.SpriteMaterial({ map: tex[p.kind], transparent: true, depthWrite: false, fog: true, opacity: 0.6 });
            const sp = new T.Sprite(m), q = new T.Vector3(p.x, p.y, p.z).multiplyScalar(p.rad * reach);
            sp.position.copy(q); sp.scale.setScalar(0.5); sp.renderOrder = 3;
            const mm = new T.SpriteMaterial({ map: tex.murk, transparent: true, depthWrite: false, fog: true, opacity: 0.5 });
            const cloud = new T.Sprite(mm); cloud.position.copy(q); cloud.scale.setScalar(2.4); cloud.renderOrder = 2;
            reg.group.add(cloud); reg.group.add(sp);
            H.bits.push({ i: p.i, sp, cloud, home: q.clone(), ph: (p.i * 1.7) % 6.28, gone: false, w: new T.Vector3() });
        }
        murk();
        const left = H.bits.length, key = day + id;
        if (left && !H.sensed[key]) { H.sensed[key] = 1; setTimeout(() => { if (H.id === id) say('sense', { n: left }, true, id); }, 2600); }
        tell();
    }
    function clear() {
        H.reg = null; H.id = null; H.bits = []; H.eatAnim = []; H.n = 0;
        const R = regions(); if (R && R.state) R.state.murk = 0;
        tell();
    }
    function eatBit(ctx, b, p) {
        const st = S(); const before = read(mine(), Date.now(), lang());
        const r = eat(mine(), { world: H.id, i: b.i, n: H.n });
        b.gone = true;
        if (st) { st.mistyPower = r.state; save(); }
        H.eatAnim.push({ b, t: 0 });
        try { if (ctx.burst) ctx.burst(p, 14, 0.7); } catch (e) { }
        const left = H.bits.filter(x => !x.gone).length; murk(); tell();
        const now = read(r.state, Date.now(), lang());
        pub({ gained: r.gained, why: 'eat', world: H.id, left, count: H.n });
        if (now.level > before.level) say('level', { L: now.level }, true);
        else if (!left) { say('clean', {}, true); try { if (ctx.burst) ctx.burst(p, 30, 1.6); } catch (e) { } }
        else if (r.why === 'cap') say('full', {});
        else say('found', { left }, true);
    }
    /* called by misty-flight.js every frame while she is inside a world. p = her position, steer = you are steering her */
    function frame(ctx, p, steer, reach) {
        const R = regions(), reg = R && R.state && R.state.region, id = R && R.current ? R.current() : null;
        if (!reg || !id || id === 'hub' || (R.state.busy || R.state.warp)) { if (H.reg && H.reg !== reg) clear(); return; }
        if (reg !== H.reg || id !== H.id) spawn(ctx, reg, id, reach);
        /* hunt-count: past local midnight the world gets its new day's crumbs (checked every few seconds, not every frame) */
        else { const ms = Date.now(); if (ms - H.dayChk > 5000) { H.dayChk = ms; if (H.day && H.day !== dayKey(ms)) { drop(); spawn(ctx, reg, id, reach); } } }
        if (!H.bits.length) return;
        const dt = Math.min(0.05, ctx.dt || 0.016), red = !!ctx.reduced; H.t += dt;
        /* her reach scales with how far out the camera is (like her pace in misty-flight): "next to it" on screen stays about the same */
        const zs = clamp((+(ctx.r && ctx.r.dist) || 8) / 8, 1, 4), pw = strength(read(mine(), Date.now(), lang()).level), eatR = RULES.eatR * pw * zs, senseR = RULES.senseR * zs;
        let nearest = 1e9;
        if (!H.fw) { const T = ctx.a.THREE; H.fw = new T.Vector3(); H.dv = new T.Vector3(); H.cam = new T.Vector3(); }
        ctx.a.camera.getWorldPosition(H.cam); H.fw.subVectors(p, H.cam); H.pd = H.fw.length() || 1e-3; H.fw.divideScalar(H.pd);
        /* cell-guide: remembered for toward() (asked at most every second by the guide, never per frame) */
        H.camObj = ctx.a.camera; H.mp = p; if (steer) H.steerAt = performance.now();
        /* on autopilot the guide says once per visit that crumbs only count when you steer (checked every 2 s, not per frame) */
        if (!steer && !H.autoSaid && H.t > 9 && H.t - H.autoChk > 2) { H.autoChk = H.t; let auto = false; try { auto = W.LowiPad.state().pad === 'auto'; } catch (e) { } if (auto && H.bits.some(b => !b.gone)) { H.autoSaid = 1; say('auto', {}, true); } }
        for (const b of H.bits) {
            if (b.gone) continue;
            if (!red) { b.sp.position.copy(b.home); b.sp.position.y += Math.sin(H.t * 0.9 + b.ph) * 0.08; b.sp.material.rotation = Math.sin(H.t * 0.6 + b.ph) * 0.4; }
            b.sp.getWorldPosition(b.w);
            /* you steer her across the screen (depth comes from turning the world), so "next to it" is measured mostly on screen */
            /* (distance from the crumb to the line from the camera through her, taken at her depth, plus a little of the depth gap) */
            H.dv.subVectors(b.w, H.cam); const along = H.dv.dot(H.fw), pl = Math.sqrt(Math.max(0, H.dv.lengthSq() - along * along)) * (H.pd / Math.max(0.1, along));
            const d = Math.hypot(pl, (along - H.pd) * 0.1); nearest = Math.min(nearest, d);
            /* faint from afar, glows up when she is close: you find them by exploring, not from the doorway */
            const near = clamp(1 - d / senseR, 0, 1);
            b.sp.material.opacity = 0.42 + 0.5 * near + (red ? 0 : Math.sin(H.t * 2 + b.ph) * 0.06);
            if (steer && d < eatR) eatBit(ctx, b, p);
        }
        if (steer && nearest < senseR && H.t - H.warmT > 25) { H.warmT = H.t; say('warm', {}); }
        /* eaten: pulled into her, shrinking; its murk cloud fades away */
        for (let k = H.eatAnim.length - 1; k >= 0; k--) {
            const e = H.eatAnim[k]; e.t += dt; const q = clamp(e.t / 0.45, 0, 1), b = e.b;
            if (b.sp.parent) { const loc = b.sp.parent.worldToLocal(p.clone()); b.sp.position.lerp(loc, q); b.sp.scale.setScalar(0.5 * (1 - q)); }
            b.cloud.material.opacity = 0.5 * (1 - q);
            if (q >= 1) { b.sp.visible = false; b.cloud.visible = false; H.eatAnim.splice(k, 1); }
        }
    }
    /* getting in: false = she bounced off a weak pull (try again); true = in */
    function gate(id) {
        id = cleanId(id); if (!id || id === 'hub') return true;
        let en = null; try { en = W.LowiSun && W.LowiSun.energyNow && W.LowiSun.energyNow(); } catch (e) { }
        const need = tries(en && en.value), key = dayKey() + id;
        if ((bounced[key] || 0) < need) { bounced[key] = (bounced[key] || 0) + 1; say('bounce', {}, true); return false; }
        return true;
    }
    /* getting out by your own steering (Oct 19): false = weak Misty, the rings pull her back in (same tries rule as getting in,
       counted on its own per world and day, so she gets out on the next try or the one after); true = out */
    const heldBack = {};
    function gateOut(id) {
        id = cleanId(id); if (!id || id === 'hub') return true;
        let en = null; try { en = W.LowiSun && W.LowiSun.energyNow && W.LowiSun.energyNow(); } catch (e) { }
        const need = tries(en && en.value), key = dayKey() + id;
        if ((heldBack[key] || 0) < need) { heldBack[key] = (heldBack[key] || 0) + 1; return false; }
        return true;
    }
    /* what she says once she is back inside: the next line from the bag (kept across visits, so a restart doesn't replay them) */
    const BAG_KEY = 'lowi-misty-held-bag';
    function heldSay() {
        let bag = null; try { bag = JSON.parse(W.localStorage.getItem(BAG_KEY) || 'null'); } catch (e) { bag = null; }
        const r = bagNext(bag, HELD.en.length);
        try { W.localStorage.setItem(BAG_KEY, JSON.stringify(r.bag)); } catch (e) { }
        const text = heldLine(r.i, lang());
        try { if (W.LowiPraise && W.LowiPraise.say) W.LowiPraise.say(text); } catch (e) { }
        return text;
    }
    function entered(id) {
        const st = S(); if (!st) return;
        const r = enter(mine(), { world: id });
        if (!r.ok) return;
        st.mistyPower = r.state; save();
        if (r.gained || r.boosted) { pub({ gained: r.gained, why: 'enter', world: cleanId(id) }); setTimeout(() => say('entered', {}, false, cleanId(id)), 900); }
    }
    W.addEventListener('lowi:world-region', e => { const id = e && e.detail && e.detail.id; if (!id || id === 'hub') clear(); });
    /* cell-guide: which way the nearest crumb is on screen from Misty (x right, y up), for the guide's nudge; null when none */
    function toward() {
        const cam = H.camObj, p = H.mp; if (!cam || !p || !H.id) return null;
        let best = null, bd = 1e9; const live = H.bits.filter(b => !b.gone);
        for (const b of live) { const d = b.w.distanceTo(p); if (d < bd) { bd = d; best = b; } }
        if (!best) return { x: 0, y: 0, left: 0, behind: false, steerAgo: performance.now() - (H.steerAt || 0) };
        const a = best.w.clone().project(cam), m = p.clone().project(cam);
        return { x: +(a.x - m.x).toFixed(3), y: +(a.y - m.y).toFixed(3), left: live.length, behind: a.z > 1, steerAgo: performance.now() - (H.steerAt || 0) };
    }
    W.LowiMistyHunt = Object.assign({}, core, { frame, gate, gateOut, heldSay, entered, clear, toward, tally, state: () => ({ id: H.id, n: H.n, left: H.bits.filter(b => !b.gone).length, spots: H.bits.filter(b => !b.gone).map(b => { b.sp.getWorldPosition(b.w); return [+b.w.x.toFixed(2), +b.w.y.toFixed(2), +b.w.z.toFixed(2)]; }) }) });
    setTimeout(() => pub(), 1500);
})(typeof window !== 'undefined' ? window : globalThis);
