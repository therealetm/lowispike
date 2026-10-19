/* LOWiSPIKE: companion adventures (Oct 16, E-man: "a button to send Misty on an adventure, start and stop, she collects
   stuff, like a screensaver: slow, the camera follows her, she floats from corner to corner a bit lost, gravity pulls her
   into a world, she gets smaller and falls in, and out again the same way. Like watching fish in an aquarium.")

   No button of its own (Oct 16, E-man: no pills crammed next to the controller). It starts from the control Today already
   has: triple-tap Misty's controller (was double-tap; Oct 17 two taps + hold = back) (autopilot, misty-pad.js calls LowiAdventure.start()) = her tour in slow "aquarium"
   pacing (misty-flight.js does the flying, gated on LowiAdventure.on). Tapping her empty cell = recall: she flies straight
   home, a little faster, and settles in her cell. Touching the controller = you take over, the adventure stops.

   Finds, with anti-cheat rules (pure, tested in tests/oct16-adventure.test.cjs):
   - one find per completed visit, a visit counts only after RULES.minStay seconds inside a world that you actually
     watched (the flight loop only runs while Today is on screen and the app is visible: no background time, no
     offline/elapsed rewards, nothing runs when the screen is off)
   - at most one find per world per day and RULES.perDay finds per day; each find has a fixed id adv:<day>:<world>,
     so a stop/start loop, a reload or a sync can never pay twice
   - finds are collectibles only: no XP, no sunbeams, no energy, no ledger entry, so adventures can't feed any other
     loop (and nothing else can be farmed to speed them up)
   No camera, no recording, no notifications, nothing in the background. */
(function (root) {
    'use strict';
    const RULES = { minStay: 20, perDay: 5, keepDays: 60 };
    const ITEMS = [
        { id: 'drop', hue: 195, n: ['Drifting droplet', 'Treibender Tropfen', 'Gota a la deriva'] },
        { id: 'spark', hue: 48, n: ['Lost spark', 'Verirrter Funke', 'Chispa perdida'] },
        { id: 'bubble', hue: 210, n: ['Tiny bubble', 'Mini-Bläschen', 'Burbuja diminuta'] },
        { id: 'thread', hue: 165, n: ['Glow thread', 'Leuchtfaden', 'Hilo luminoso'] },
        { id: 'pearl', hue: 280, n: ['Orbit pearl', 'Orbitperle', 'Perla orbital'] },
        { id: 'leaf', hue: 130, n: ['Star leaf', 'Sternblatt', 'Hoja estelar'] },
        { id: 'comet', hue: 20, n: ['Comet crumb', 'Kometenkrümel', 'Miga de cometa'] },
        { id: 'moon', hue: 240, n: ['Moon pebble', 'Mondkiesel', 'Guijarro lunar'] }
    ];
    const WORLDS = {
        gut: ['Gut world', 'Darmwelt', 'Mundo del intestino'], liver: ['Liver world', 'Leberwelt', 'Mundo del hígado'],
        muscle: ['Muscle world', 'Muskelwelt', 'Mundo del músculo'], brain: ['Brain world', 'Gehirnwelt', 'Mundo del cerebro'],
        pancreas: ['Pancreas world', 'Bauchspeicheldrüsen-Welt', 'Mundo del páncreas'], heart: ['Heart world', 'Herzwelt', 'Mundo del corazón'],
        fat: ['Fat world', 'Fettwelt', 'Mundo de la grasa'], kidney: ['Kidney world', 'Nierenwelt', 'Mundo del riñón']
    };
    const pad = n => (n < 10 ? '0' : '') + n;
    const dayKey = ts => { const d = new Date(+ts || Date.now()); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const cleanId = s => String(s || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
    function itemFor(day, world, owned) {
        let h = 11; for (const c of day + '|' + world) h = (h * 33 + c.charCodeAt(0)) >>> 0;
        const have = new Set((owned || []).map(f => f && f.item));
        const fresh = ITEMS.filter(i => !have.has(i.id)), pool = fresh.length ? fresh : ITEMS;
        return pool[h % pool.length].id;
    }
    function norm(st) {
        const a = st && typeof st === 'object' ? st : {};
        const finds = (Array.isArray(a.finds) ? a.finds : []).filter(f => f && typeof f.id === 'string' && /^adv:\d{4}-\d\d-\d\d:[a-z0-9_-]+$/.test(f.id));
        const seen = new Set(), out = [];
        for (const f of finds) if (!seen.has(f.id)) { seen.add(f.id); out.push(f); }
        return { finds: out };
    }
    /* a visit just ended: does it earn a find? returns { ok, why, find, state } and never mutates the input */
    function award(st, o) {
        o = o || {};
        const s = norm(st), now = +o.now || Date.now(), day = dayKey(now), world = cleanId(o.world);
        const res = r => Object.assign({ ok: false, find: null, state: s }, r);
        if (!world || world === 'hub') return res({ why: 'no-world' });
        if (!o.adventure) return res({ why: 'not-adventuring' });
        if (!(+o.stay >= RULES.minStay)) return res({ why: 'too-short' });
        const id = 'adv:' + day + ':' + world;
        if (s.finds.some(f => f.id === id)) return res({ why: 'already-today' });
        if (s.finds.filter(f => f.day === day).length >= RULES.perDay) return res({ why: 'day-cap' });
        const find = { id, day, world, item: itemFor(day, world, s.finds), ts: now };
        const cutoff = dayKey(now - RULES.keepDays * 864e5);
        const keep = s.finds.filter(f => f.day >= cutoff || f.keep);
        return { ok: true, why: 'found', find, state: { finds: keep.concat([find]) } };
    }
    const today = (st, now) => { const d = dayKey(now); return norm(st).finds.filter(f => f.day === d); };
    const core = { RULES, ITEMS, WORLDS, dayKey, itemFor, norm, award, today };
    if (typeof module === 'object' && module.exports) module.exports = core;
    const W = root, D = W.document;
    if (!D || !D.addEventListener || W.LowiAdventure) { if (W && !W.LowiAdventure) W.LowiAdventureCore = core; return; }
    W.LowiAdventureCore = core;

    /* ---------- browser ---------- */
    const H = D.documentElement;
    const L = () => { const l = String((W.LowiI18n && W.LowiI18n.lang) || H.lang || 'de').slice(0, 2); return l === 'en' ? 0 : l === 'es' ? 2 : 1; };
    const T = {
        found: ['{n} found a {i} in the {w}!', '{n} hat in der {w} ein {i} gefunden!', '¡{n} encontró {i} en {w}!'],
        cap: ['{n} found plenty today. She keeps exploring just for fun.', '{n} hat heute genug gefunden. Sie erkundet einfach weiter.', '{n} ya encontró bastante hoy. Sigue explorando por diversión.'],
        steer: ['You took the controls, adventure stopped.', 'Du steuerst, Abenteuer beendet.', 'Tomaste el control, aventura detenida.'],
        reduced: ['Adventures need the moving world (reduced motion is on).', 'Abenteuer brauchen die bewegte Welt (Bewegung reduzieren ist an).', 'Las aventuras necesitan el mundo en movimiento (movimiento reducido activado).']
    };
    const tr = (k, o) => { let s = T[k][L()] || T[k][0]; if (o) Object.keys(o).forEach(x => { s = s.split('{' + x + '}').join(o[x]); }); return s; };
    const S = () => { try { return (W.LowiVitalsBridge && W.LowiVitalsBridge.state && W.LowiVitalsBridge.state()) || W.S || null; } catch (e) { return null; } };
    const save = () => { try { W.LowiVitalsBridge.save(); } catch (e) { } };
    /* Oct 19, 2026 (worlds playtest W-003): her name is the user's companion (LowiBirthCompanion: Misty unless they brought their
       own to life), the same as the cell guides use; never the old herb identity name from the star sign ("Moss Leaf found ..."). */
    const name = () => { try { const B = W.LowiBirthCompanion, c = B && B.get ? B.get() : null, n = c && c.name ? String(c.name).trim() : ''; return n ? n.slice(0, 24) : 'Misty'; } catch (e) { return 'Misty'; } };
    const reduced = () => { try { return W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const live = () => H.classList.contains('wh-world-live');
    const say = s => { try { if (W.LowiPraise && W.LowiPraise.say) W.LowiPraise.say(s); } catch (e) { } };
    let on = false;
    const hint = () => { try { return W.LowiMistyHints ? W.LowiMistyHints.now() : null; } catch (e) { return null; } };
    function store() { const s = S(); if (!s) return null; s.adventure = norm(s.adventure); return s; }
    function setPad(m) { try { if (W.LowiPad && W.LowiPad.mode) W.LowiPad.mode(m); } catch (e) { } }
    function padMode() { try { const st = W.LowiPad && W.LowiPad.state && W.LowiPad.state(); return st ? (st.pad && st.pad.mode) || st.mode || '' : ''; } catch (e) { return ''; } }
    function start() {
        if (on) return true;
        if (!live() || reduced()) { if (reduced()) say(tr('reduced')); return false; }
        /* below LowiSun's travel energy (0.4) she stays home, and says kindly why (misty-hints.js reads the existing signals) */
        const h = hint();
        if (h && !h.canTravel) { say(h.text); paint(); return false; }
        on = true; H.classList.add('lw-adv'); setPad('auto'); paint();
        try { W.dispatchEvent(new CustomEvent('lowi:adventure', { detail: { on: true } })); } catch (e) { }
        return true;
    }
    function stop(why) {
        if (!on) return;
        on = false; H.classList.remove('lw-adv');
        /* recall: straight home, a bit quicker, and she settles in her cell (no going back into the tour) */
        if (why !== 'steer' && why !== 'abort') { try { const F = W.LowiMistyFlight; if (F && F.recall) F.recall(); else setPad('home'); } catch (e) { setPad('home'); } }
        if (why === 'steer') say(tr('steer'));
        paint();
        try { W.dispatchEvent(new CustomEvent('lowi:adventure', { detail: { on: false, why: why || 'stop' } })); } catch (e) { }
    }
    /* misty-flight calls this when a watched visit ends (she leaves a world by herself during an adventure) */
    function visited(world, stay) {
        const s = store(); if (!s) return null;
        const r = award(s.adventure, { world, stay, adventure: on, now: Date.now() });
        if (!r.ok) { if (r.why === 'day-cap' && !visited.capSaid) { visited.capSaid = true; say(tr('cap', { n: name() })); } return r; }
        s.adventure = r.state; save();
        const it = ITEMS.find(i => i.id === r.find.item), wn = WORLDS[r.find.world];
        say(tr('found', { n: name(), i: it ? it.n[L()] : r.find.item, w: wn ? wn[L()] : r.find.world }));
        paint();
        try { W.dispatchEvent(new CustomEvent('lowi:adventure-find', { detail: r.find })); } catch (e) { }
        return r;
    }
    /* no UI of its own: the controller shows autopilot (misty-pad.js), finds are spoken through LowiPraise */
    function paint() { }
    /* the controller is yours: misty-flight stops the adventure when you steer with the controller (stop('steer')).
       Leaving Today or hiding the app pauses the flight (misty-flight aborts, nothing renders); back on Today, misty-flight
       resumes the tour itself while LowiAdventure.on is still true. */
    function resume() { if (on && live() && !D.hidden && H.classList.contains('wh-home') && !padMode()) setPad('auto'); }
    const api = Object.assign({}, core, { start, stop, visited, resume, paint });
    Object.defineProperty(api, 'on', { get: () => on, enumerable: true }); /* live getter (Object.assign would freeze it) */
    W.LowiAdventure = api;
})(typeof window !== 'undefined' ? window : globalThis);
