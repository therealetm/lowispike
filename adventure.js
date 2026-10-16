/* LOWiSPIKE: companion adventures (Oct 16, E-man: "a button to send Misty on an adventure, start and stop, she collects
   stuff, like a screensaver: slow, the camera follows her, she floats from corner to corner a bit lost, gravity pulls her
   into a world, she gets smaller and falls in, and out again the same way. Like watching fish in an aquarium.")

   Button: a glass pill under Misty's controller on Today (world view only). Start = her autopilot tour in slow
   "aquarium" pacing (misty-flight.js does the flying, gated on LowiAdventure.on). Stop / recall = she flies straight home,
   a little faster, and settles in her cell. Touching the controller = you take over, the adventure stops.

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
        go: ['Send {n} on an adventure', '{n} auf Abenteuer schicken', 'Enviar a {n} de aventura'],
        stop: ['Call {n} back', '{n} zurückrufen', 'Llamar a {n}'],
        goShort: ['Adventure', 'Abenteuer', 'Aventura'], stopShort: ['Call back', 'Zurückrufen', 'Llamar'],
        out: ['{n} is exploring', '{n} ist unterwegs', '{n} está explorando'],
        paused: ['Adventure paused, it goes on when you are back on Today', 'Abenteuer pausiert, es geht weiter, wenn du auf Heute bist', 'Aventura en pausa, sigue cuando vuelvas a Hoy'],
        found: ['{n} found a {i} in the {w}!', '{n} hat in der {w} ein {i} gefunden!', '¡{n} encontró {i} en {w}!'],
        cap: ['{n} found plenty today. She keeps exploring just for fun.', '{n} hat heute genug gefunden. Sie erkundet einfach weiter.', '{n} ya encontró bastante hoy. Sigue explorando por diversión.'],
        rules: ['Finds: one per world per day, up to {c} a day, after she has spent a little while inside. She only explores while you watch Today: nothing runs in the background or with the screen off.', 'Funde: einer pro Welt und Tag, bis zu {c} am Tag, wenn sie eine Weile drin war. Sie erkundet nur, während du auf Heute zuschaust: nichts läuft im Hintergrund oder bei ausgeschaltetem Bildschirm.', 'Hallazgos: uno por mundo y día, hasta {c} al día, tras pasar un rato dentro. Solo explora mientras miras Hoy: nada funciona en segundo plano ni con la pantalla apagada.'],
        count: ['Today: {a} of {c} finds', 'Heute: {a} von {c} Funden', 'Hoy: {a} de {c} hallazgos'],
        steer: ['You took the controls, adventure stopped.', 'Du steuerst, Abenteuer beendet.', 'Tomaste el control, aventura detenida.'],
        reduced: ['Adventures need the moving world (reduced motion is on).', 'Abenteuer brauchen die bewegte Welt (Bewegung reduzieren ist an).', 'Las aventuras necesitan el mundo en movimiento (movimiento reducido activado).']
    };
    const tr = (k, o) => { let s = T[k][L()] || T[k][0]; if (o) Object.keys(o).forEach(x => { s = s.split('{' + x + '}').join(o[x]); }); return s; };
    const S = () => { try { return (W.LowiVitalsBridge && W.LowiVitalsBridge.state && W.LowiVitalsBridge.state()) || W.S || null; } catch (e) { return null; } };
    const save = () => { try { W.LowiVitalsBridge.save(); } catch (e) { } };
    const name = () => { try { const M = W.LowiHerbTamagotchi, c = M && M.current && M.current(); return c ? String(M.name(c.p, c.m) || 'Misty') : 'Misty'; } catch (e) { return 'Misty'; } };
    const reduced = () => { try { return W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const live = () => H.classList.contains('wh-world-live');
    const say = s => { try { if (W.LowiPraise && W.LowiPraise.say) W.LowiPraise.say(s); } catch (e) { } };
    let on = false, btn = null, info = null;
    const hint = () => { try { return W.LowiMistyHints ? W.LowiMistyHints.now() : null; } catch (e) { return null; } };
    function store() { const s = S(); if (!s) return null; s.adventure = norm(s.adventure); return s; }
    function setPad(m) { try { if (W.LowiPad && W.LowiPad.mode) W.LowiPad.mode(m); } catch (e) { } }
    function padMode() { try { const st = W.LowiPad && W.LowiPad.state && W.LowiPad.state(); return st ? (st.pad && st.pad.mode) || st.mode || '' : ''; } catch (e) { return ''; } }
    function start() {
        if (on) return true;
        if (!live() || reduced()) { say(tr('reduced')); return false; }
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
    function svgDot(hue) { return '<i class="lw-adv-dot" style="--h:' + (+hue || 200) + '"></i>'; }
    function paint() {
        if (!btn) return;
        const n = name(), s = store(), got = s ? today(s.adventure).length : 0;
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.setAttribute('aria-label', on ? tr('stop', { n }) : tr('go', { n }));
        btn.querySelector('.lw-adv-t').textContent = on ? tr('stopShort') : tr('goShort');
        btn.querySelector('.lw-adv-n').textContent = got ? got + '/' + RULES.perDay : '';
        if (info) {
            const fs = s ? today(s.adventure) : [];
            const h = hint(), esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
            info.innerHTML = '<b>' + (on ? tr('out', { n }) : tr('go', { n })) + '</b>' + (h ? '<span class="lw-adv-hint">' + esc(h.text) + '</span>' : '') + '<span>' + tr('count', { a: fs.length, c: RULES.perDay }) + '</span>' +
                (fs.length ? '<span class="lw-adv-finds">' + fs.map(f => { const it = ITEMS.find(i => i.id === f.item); return svgDot(it && it.hue) + (it ? it.n[L()] : f.item); }).join(' · ') + '</span>' : '') +
                '<small>' + tr('rules', { c: RULES.perDay }) + '</small>';
        }
    }
    function mount() {
        const host = D.querySelector('#tab-home .wh-hud') || D.querySelector('.wh-hud');
        if (btn && btn.isConnected && (!host || btn.parentNode === host)) return;
        if (!host) return;
        if (btn) { btn.remove(); if (info) info.remove(); }
        btn = D.createElement('button'); btn.type = 'button'; btn.className = 'lw-adv-btn';
        btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".55"/><path d="M12 5.5l1.9 4.6 4.6 1.9-4.6 1.9L12 18.5l-1.9-4.6L5.5 12l4.6-1.9z" fill="currentColor"/></svg><span class="lw-adv-t"></span><span class="lw-adv-n"></span>';
        info = D.createElement('div'); info.className = 'lw-adv-info'; info.setAttribute('role', 'status'); info.hidden = true;
        btn.addEventListener('click', () => { if (on) stop('recall'); else if (start()) { paint(); info.hidden = false; clearTimeout(mount.t); mount.t = setTimeout(() => { info.hidden = true; }, 6000); } });
        btn.addEventListener('contextmenu', e => { e.preventDefault(); info.hidden = !info.hidden; });
        host.appendChild(btn); host.appendChild(info);
        paint();
    }
    /* the controller is yours: misty-flight stops the adventure when you steer with the controller (stop('steer')).
       Leaving Today or hiding the app pauses the flight (misty-flight aborts, nothing renders); back on Today, misty-flight
       resumes the tour itself while LowiAdventure.on is still true. */
    function resume() { if (on && live() && !D.hidden && H.classList.contains('wh-home') && !padMode()) setPad('auto'); }
    function boot() { mount(); paint(); }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
    [1500, 4000, 9000].forEach(t => setTimeout(boot, t));
    W.addEventListener('pageshow', boot);
    const api = Object.assign({}, core, { start, stop, visited, resume, paint, _mount: mount });
    Object.defineProperty(api, 'on', { get: () => on, enumerable: true }); /* live getter (Object.assign would freeze it) */
    W.LowiAdventure = api;
})(typeof window !== 'undefined' ? window : globalThis);
