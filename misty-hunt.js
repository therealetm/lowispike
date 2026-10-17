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
        sense: ['I can feel {n} sugar crumbs hiding in the corners here. Steer me close and I gobble them up!', 'Ich spüre {n} Zuckerkrümel, versteckt in den Ecken hier. Steuer mich nah ran und ich futtere sie weg!', 'Siento {n} migas de azúcar escondidas en los rincones. ¡Guíame cerca y me las zampo!'],
        found: ['Got one! {left} left in this world.', 'Erwischt! Noch {left} in dieser Welt.', '¡Atrapada! Quedan {left} en este mundo.'],
        clean: ['This world is sparkling clean again!', 'Diese Welt glänzt wieder!', '¡Este mundo vuelve a brillar!'],
        level: ['Level up! Misty is now level {L}. I feel stronger!', 'Level up! Misty ist jetzt Level {L}. Ich fühl mich stärker!', '¡Subes de nivel! Misty ya es nivel {L}. ¡Me siento más fuerte!'],
        entered: ['We made it in! That gives me a boost.', 'Wir sind drin! Das gibt mir Kraft.', '¡Lo logramos! Eso me da un empujón.'],
        bounce: ['The pull is weak today and I bounced off. Try again, I am almost in!', 'Der Sog ist heute schwach, ich bin abgeprallt. Nochmal, ich bin fast drin!', 'Hoy la atracción es débil y reboté. ¡Otra vez, ya casi entro!'],
        full: ['I am full of power for today. The crumbs still get cleared!', 'Für heute bin ich voller Kraft. Die Krümel räum ich trotzdem weg!', 'Por hoy estoy llena de poder. ¡Igual limpio las migas!'],
        warm: ['Warmer... one is close!', 'Wärmer... einer ist ganz nah!', 'Caliente... ¡hay una cerca!']
    };
    const li = lang => { const l = String(lang || 'de').slice(0, 2); return l === 'en' ? 0 : l === 'es' ? 2 : 1; };
    const tr = (k, lang, v) => String((STR[k] || [''])[li(lang)] || '').replace(/\{(\w+)\}/g, (m, x) => v && v[x] != null ? v[x] : m);
    function read(st, now, lang) {
        const s = norm(st, now), L = levelOf(s.xp);
        return { level: L.level, xp: L.xp, next: L.next, boost: s.boost, label: L.level > 0 ? tr('label', lang) + L.level : '', total: s.xp, today: s.today, cap: RULES.xpDay };
    }
    const core = { RULES, dayKey, count, need, levelOf, tries, strength, spots, norm, eat, enter, read, STR, tr };
    if (typeof module !== 'undefined' && module.exports) module.exports = core;
    root.LowiMistyHuntCore = core;

    /* ---------- browser ---------- */
    const W = root, D = W.document;
    if (!D || !W.addEventListener || W.LowiMistyHunt) return;
    const S = () => { try { return (W.LowiVitalsBridge && W.LowiVitalsBridge.state && W.LowiVitalsBridge.state()) || W.S || null; } catch (e) { return null; } };
    const save = () => { try { W.LowiVitalsBridge.save(); } catch (e) { } };
    const lang = () => String((W.LowiI18n && W.LowiI18n.lang) || D.documentElement.lang || 'de').slice(0, 2);
    let lastSay = 0;
    const say = (s, force) => { const t = Date.now(); if (!force && t - lastSay < 2500) return; lastSay = t; try { if (W.LowiPraise && W.LowiPraise.say) W.LowiPraise.say(s); } catch (e) { } };
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
        art = {
            sugar: mk(g => {
                const gr = g.createRadialGradient(48, 48, 4, 48, 48, 46); gr.addColorStop(0, 'rgba(255,214,150,.55)'); gr.addColorStop(1, 'rgba(255,170,90,0)');
                g.fillStyle = gr; g.fillRect(0, 0, 96, 96);
                g.translate(48, 50); g.rotate(0.5);
                g.fillStyle = 'rgba(255,196,120,.85)'; g.strokeStyle = 'rgba(255,246,220,.95)'; g.lineWidth = 3;
                g.beginPath(); g.rect(-15, -15, 30, 30); g.fill(); g.stroke();
                g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(-11, -11, 9, 5);
            }),
            germ: mk(g => {
                const gr = g.createRadialGradient(48, 48, 4, 48, 48, 46); gr.addColorStop(0, 'rgba(176,120,230,.5)'); gr.addColorStop(1, 'rgba(120,80,190,0)');
                g.fillStyle = gr; g.fillRect(0, 0, 96, 96);
                g.strokeStyle = 'rgba(214,176,255,.9)'; g.lineWidth = 3;
                for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; g.beginPath(); g.moveTo(48 + Math.cos(a) * 16, 48 + Math.sin(a) * 16); g.lineTo(48 + Math.cos(a) * 25, 48 + Math.sin(a) * 25); g.stroke(); }
                g.fillStyle = 'rgba(120,70,170,.85)'; g.beginPath(); g.arc(48, 48, 17, 0, Math.PI * 2); g.fill(); g.stroke();
                g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(42, 42, 4, 0, Math.PI * 2); g.fill();
            }),
            murk: mk(g => { const gr = g.createRadialGradient(48, 48, 2, 48, 48, 48); gr.addColorStop(0, 'rgba(70,40,90,.55)'); gr.addColorStop(1, 'rgba(70,40,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, 96, 96); })
        };
        return art;
    }
    /* ---- live hunt in the current world ---- */
    const H = { reg: null, id: null, bits: [], n: 0, t: 0, eatAnim: [], warmT: 0, sensed: {} };
    const bounced = {};
    function regions() { return W.LowiWorldRegions || null; }
    function spikesToday() { try { const m = W.LowiWorldMood && W.LowiWorldMood.mood; return m ? (+m.food || 0) + (+m.products || 0) : 0; } catch (e) { return 0; } }
    function murk() { const R = regions(); if (!R || !R.state) return; const left = H.bits.filter(b => !b.gone).length; R.state.murk = H.n ? left / H.n : 0; }
    function spawn(ctx, reg, id, reach) {
        H.reg = reg; H.id = id; H.bits = []; H.eatAnim = []; H.n = 0;
        const a = ctx.a, T = a && a.THREE; if (!T || !reg || !reg.group || !id || id === 'hub') return;
        const day = dayKey(), n = count(spikesToday()), s = mine(), done = s.eaten[cleanId(id)] || [], A = canvasArt();
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
        if (left && !H.sensed[key]) { H.sensed[key] = 1; setTimeout(() => { if (H.id === id) say(tr('sense', lang(), { n: left }), true); }, 2600); }
    }
    function clear() {
        H.reg = null; H.id = null; H.bits = []; H.eatAnim = []; H.n = 0;
        const R = regions(); if (R && R.state) R.state.murk = 0;
    }
    function eatBit(ctx, b, p) {
        const st = S(); const before = read(mine(), Date.now(), lang());
        const r = eat(mine(), { world: H.id, i: b.i, n: H.n });
        b.gone = true;
        if (st) { st.mistyPower = r.state; save(); }
        H.eatAnim.push({ b, t: 0 });
        try { if (ctx.burst) ctx.burst(p, 14, 0.7); } catch (e) { }
        const left = H.bits.filter(x => !x.gone).length; murk();
        const now = read(r.state, Date.now(), lang());
        pub({ gained: r.gained, why: 'eat', world: H.id, left, count: H.n });
        if (now.level > before.level) say(tr('level', lang(), { L: now.level }), true);
        else if (!left) { say(tr('clean', lang()), true); try { if (ctx.burst) ctx.burst(p, 30, 1.6); } catch (e) { } }
        else if (r.why === 'cap') say(tr('full', lang()));
        else say(tr('found', lang(), { left }), true);
    }
    /* called by misty-flight.js every frame while she is inside a world. p = her position, steer = you are steering her */
    function frame(ctx, p, steer, reach) {
        const R = regions(), reg = R && R.state && R.state.region, id = R && R.current ? R.current() : null;
        if (!reg || !id || id === 'hub' || (R.state.busy || R.state.warp)) { if (H.reg && H.reg !== reg) clear(); return; }
        if (reg !== H.reg || id !== H.id) spawn(ctx, reg, id, reach);
        if (!H.bits.length) return;
        const dt = Math.min(0.05, ctx.dt || 0.016), red = !!ctx.reduced; H.t += dt;
        /* her reach scales with how far out the camera is (like her pace in misty-flight): "next to it" on screen stays about the same */
        const zs = clamp((+(ctx.r && ctx.r.dist) || 8) / 8, 1, 4), pw = strength(read(mine(), Date.now(), lang()).level), eatR = RULES.eatR * pw * zs, senseR = RULES.senseR * zs;
        let nearest = 1e9;
        if (!H.fw) { const T = ctx.a.THREE; H.fw = new T.Vector3(); H.dv = new T.Vector3(); H.cam = new T.Vector3(); }
        ctx.a.camera.getWorldPosition(H.cam); H.fw.subVectors(p, H.cam); H.pd = H.fw.length() || 1e-3; H.fw.divideScalar(H.pd);
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
        if (steer && nearest < senseR && H.t - H.warmT > 25) { H.warmT = H.t; say(tr('warm', lang())); }
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
        if ((bounced[key] || 0) < need) { bounced[key] = (bounced[key] || 0) + 1; say(tr('bounce', lang()), true); return false; }
        return true;
    }
    function entered(id) {
        const st = S(); if (!st) return;
        const r = enter(mine(), { world: id });
        if (!r.ok) return;
        st.mistyPower = r.state; save();
        if (r.gained || r.boosted) { pub({ gained: r.gained, why: 'enter', world: cleanId(id) }); setTimeout(() => say(tr('entered', lang())), 900); }
    }
    W.addEventListener('lowi:world-region', e => { const id = e && e.detail && e.detail.id; if (!id || id === 'hub') clear(); });
    W.LowiMistyHunt = Object.assign({}, core, { frame, gate, entered, clear, state: () => ({ id: H.id, n: H.n, left: H.bits.filter(b => !b.gone).length, spots: H.bits.filter(b => !b.gone).map(b => { b.sp.getWorldPosition(b.w); return [+b.w.x.toFixed(2), +b.w.y.toFixed(2), +b.w.z.toFixed(2)]; }) }) });
    setTimeout(() => pub(), 1500);
})(typeof window !== 'undefined' ? window : globalThis);
