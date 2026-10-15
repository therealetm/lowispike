/* LOWiSPIKE microbe buddies, pure core (Oct 15, 2026). Part of the body-universe depth layer.
   Up to three microbes from the microbe book join your cell as a crew (Finch-like companions). Everyone starts with Lacto,
   a starter buddy that joins the book through the external-buddy contract (window.LowiBodyBuddies + found()).
   Each buddy has one favourite action (from the book microbe's own metric: low-spike food, water, movement, scanning,
   fasting, a full sun, body trips, or any entry). Buddies react to what is logged right now (mood) and grow closer on every
   day their favourite was done while they were in the crew (bond levels 1-5, a one-time XP gift per new level).
   The crew's lead buddy comes along on body trips (adventure log); each trip counts as a bond day for it.
   Only data the app already has: meal logs with the app's own verdict, the XP ledger, today's water glasses, the trip log.
   A picture of your entries, not a measurement. Tests: tests/microbe-buddies.test.cjs. */
(function (root) {
    'use strict';
    const MIN = 60000, HOUR = 60 * MIN;
    const pad = n => String(n).padStart(2, '0');
    const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const T = (en, de, es) => [en, de, es];
    const pick = (a, l) => Array.isArray(a) ? (a[l] || a[0] || '') : String(a == null ? '' : a);
    const MAX_CREW = 3, SPIKE_H = 3, CHEER_H = 2;

    /* starter buddy: joins the microbe book as an event-found buddy (micro-book merge() contract) */
    const STARTER = {
        id: 'lacto', shape: 'rod', hue: 96, fav: 'low',
        names: T('Lacto', 'Lacto', 'Lacto'),
        sub: T('Starter buddy · Lactobacillus', 'Start-Buddy · Laktobazillus', 'Compañero inicial · Lactobacilo'),
        fact: T('Lactobacilli live in yogurt, sauerkraut and your gut. They turn sugars into lactic acid.',
            'Laktobazillen leben in Joghurt, Sauerkraut und deinem Darm. Sie machen aus Zucker Milchsäure.',
            'Los lactobacilos viven en el yogur, el chucrut y tu intestino. Convierten azúcares en ácido láctico.')
    };

    /* favourite action per book metric */
    const FAV_BY_M = { meal: 'low', fiber: 'low', protein: 'low', sugar: 'low', water: 'water', move: 'move', scan: 'scan', fast: 'fast', sun: 'sun', days: 'any', trip: 'trip' };
    const FAVS = {
        low: { n: T('Low-spike food', 'Low-Spike-Essen', 'Comida sin pico'),
            wish: T('I’d love a low-spike meal today.', 'Ich hätte heute so gern ein Low-Spike-Essen.', 'Me encantaría una comida sin pico hoy.'),
            cheer: T('That low-spike meal was delicious!', 'Das Low-Spike-Essen war lecker!', '¡Esa comida sin pico estaba riquísima!'),
            happy: T('Thanks for the low-spike food today. I feel great.', 'Danke fürs Low-Spike-Essen heute. Mir geht’s super.', 'Gracias por la comida sin pico de hoy. Me siento genial.') },
        water: { n: T('Water', 'Wasser', 'Agua'),
            wish: T('Could we have a glass of water?', 'Trinken wir ein Glas Wasser?', '¿Nos tomamos un vaso de agua?'),
            cheer: T('Ahh, fresh water! Everything flows.', 'Ahh, frisches Wasser! Alles fließt.', '¡Ahh, agua fresca! Todo fluye.'),
            happy: T('Thanks for the water today. So fresh in here.', 'Danke fürs Wasser heute. So frisch hier drin.', 'Gracias por el agua de hoy. Qué fresco aquí dentro.') },
        move: { n: T('Movement', 'Bewegung', 'Movimiento'),
            wish: T('Let’s move a little, even five minutes.', 'Lass uns ein bisschen bewegen, schon fünf Minuten.', 'Movámonos un poco, aunque sean cinco minutos.'),
            cheer: T('We moved! I’m buzzing with energy.', 'Wir haben uns bewegt! Ich sprühe vor Energie.', '¡Nos movimos! Estoy lleno de energía.'),
            happy: T('Thanks for moving today. I feel strong.', 'Danke für die Bewegung heute. Ich fühl mich stark.', 'Gracias por moverte hoy. Me siento fuerte.') },
        scan: { n: T('Scanning', 'Scannen', 'Escanear'),
            wish: T('Scan something new with me?', 'Scannst du was Neues mit mir?', '¿Escaneamos algo nuevo juntos?'),
            cheer: T('Ooh, a new scan! Let’s learn about it.', 'Ooh, ein neuer Scan! Schauen wir’s uns an.', '¡Uy, un escaneo nuevo! Vamos a verlo.'),
            happy: T('Thanks for scanning today. I learned something.', 'Danke fürs Scannen heute. Ich hab was gelernt.', 'Gracias por escanear hoy. Aprendí algo.') },
        fast: { n: T('Fasting', 'Fasten', 'Ayuno'),
            wish: T('A fasting step would make me happy.', 'Eine Fasten-Etappe würde mich freuen.', 'Una etapa de ayuno me haría feliz.'),
            cheer: T('Fasting step done. Calm and quiet in here.', 'Fasten-Etappe geschafft. Ruhig und still hier drin.', 'Etapa de ayuno hecha. Todo en calma aquí dentro.'),
            happy: T('Thanks for fasting today. Nice and calm.', 'Danke fürs Fasten heute. Schön ruhig.', 'Gracias por el ayuno de hoy. Qué calma.') },
        sun: { n: T('Full sun', 'Volle Sonne', 'Sol lleno'),
            wish: T('Let’s fill your sun today.', 'Lass uns heute deine Sonne füllen.', 'Llenemos tu sol hoy.'),
            cheer: T('Your sun is full. I’m glowing!', 'Deine Sonne ist voll. Ich leuchte!', 'Tu sol está lleno. ¡Brillo!'),
            happy: T('Your sun was full today. Warm in here.', 'Deine Sonne war heute voll. Warm hier drin.', 'Tu sol se llenó hoy. Qué calorcito.') },
        trip: { n: T('Body trips', 'Körperreisen', 'Viajes por el cuerpo'),
            wish: T('Can we go on a body trip?', 'Machen wir eine Körperreise?', '¿Hacemos un viaje por el cuerpo?'),
            cheer: T('What a trip! Where to next?', 'Was für eine Reise! Wohin als Nächstes?', '¡Qué viaje! ¿A dónde ahora?'),
            happy: T('Thanks for the trip today. I saw so much.', 'Danke für die Reise heute. Ich hab so viel gesehen.', 'Gracias por el viaje de hoy. Vi muchísimo.') },
        any: { n: T('Any entry', 'Jeder Eintrag', 'Cualquier registro'),
            wish: T('Log anything today and I’ll cheer.', 'Trag heute irgendwas ein, dann jubel ich.', 'Registra cualquier cosa hoy y lo celebro.'),
            cheer: T('You logged something. High five!', 'Du hast was eingetragen. High five!', 'Registraste algo. ¡Choca esos cinco!'),
            happy: T('Thanks for showing up today.', 'Danke, dass du heute dabei warst.', 'Gracias por estar hoy.') }
    };
    const SAY = {
        sleepy: T('Zzz… it’s late. Let’s both rest.', 'Zzz … es ist spät. Ruhen wir uns beide aus.', 'Zzz… es tarde. Descansemos los dos.'),
        tidy: T('Sugar wave! I’m helping your cell tidy up.', 'Zuckerwelle! Ich helfe deiner Zelle beim Aufräumen.', '¡Ola de azúcar! Ayudo a tu célula a ordenar.')
    };
    /* bond: days the favourite was done while in the crew (trip days count for the lead buddy) */
    const LEVELS = [0, 1, 3, 7, 14];
    const TITLES = [T('New friend', 'Neu dabei', 'Recién llegado'), T('Pal', 'Kumpel', 'Colega'), T('Buddy', 'Buddy', 'Compañero'), T('Close buddy', 'Enger Buddy', 'Gran compañero'), T('Best buddy', 'Bester Buddy', 'Mejor compañero')];
    const GIFT = lvl => lvl >= 2 ? 5 * lvl : 0;

    function favOf(b) {
        if (!b) return 'any';
        if (b.fav && FAVS[b.fav]) return b.fav;
        if (b.id === STARTER.id) return STARTER.fav;
        return FAV_BY_M[b.m] || 'any';
    }
    /* body silhouette for the 2D/3D art, from the book shape */
    function bodyOf(b) {
        const s = b && b.shape;
        if (s === 'rod' || s === 'chain') return 'rod';
        if (s === 'disc' || s === 'bean' || s === 'island') return 'wide';
        if (s === 'drop' || s === 'tri' || s === 'cup') return 'drop';
        if (s === 'star' || s === 'spark') return 'star';
        return 'round';
    }

    /* the same meal verdict as the living cell (lvl high|medium|low, r nein|selten|ja); hand-typed meals stay neutral here */
    function verdict(log) {
        if (!log) return '';
        const lvl = String(log.lvl || '').toLowerCase(), r = String(log.r || '').toLowerCase();
        if (lvl === 'high' || r === 'nein' || r === 'spike') return 'spike';
        if (lvl === 'low' || r === 'ja' || r === 'ok') return 'low';
        if (lvl === 'medium' || lvl === 'mid' || r === 'selten' || r === 'jein' || r === 'better') return 'medium';
        const sugar = log.macros && log.macros.sugar;
        if (sugar != null && sugar !== '' && Number.isFinite(+sugar) && +sugar >= 25) return 'spike';
        return '';
    }
    /* ledger kinds, same rules as the microbe book */
    function kind(e) {
        const src = String(e && e.src || ''), id = String(e && e.eventId || ''), txt = (src + ' ' + (e && e.label || '')).toLowerCase();
        if (/^buddy-bond/.test(src)) return 'other';
        if (/^sun-full:/.test(id) || /^sun-full/.test(src)) return 'sun';
        if (/^body-trip:/.test(id) || /^body-trip/.test(src)) return 'trip';
        if (/^macro-goal/.test(id) || /^macro-goal/.test(src)) return /:(protein|fiber)$/.test(id) ? 'low' : 'other';
        if (!src || /^f\d|^f3all|^f2_break|^e1:|^rhythm|^hq|^quest|^care/.test(src)) return 'quest';
        if (/^meal/.test(src) || /^meal:|^plan-meal:/.test(id)) return 'meal';
        if (/scan|capture|product|dex/.test(txt)) return 'scan';
        if (/water|wasser|agua|hydrat/.test(txt)) return 'water';
        if (/move|walk|workout|steps|dance|yoga|stretch/.test(txt)) return 'move';
        if (/fast/.test(txt) && !/breakfast/.test(txt)) return 'fast';
        return 'other';
    }

    /* what was done, per day: { 'YYYY-MM-DD': { low: lastTs, water: lastTs, ..., spike: lastTs } } */
    function activity(input) {
        input = input || {};
        const now = +input.now || Date.now(), out = {}, vd = typeof input.verdict === 'function' ? input.verdict : verdict;
        const mark = (k, ts) => { if (!(+ts > 0) || ts > now + MIN) return; const d = dayKey(ts); const o = out[d] || (out[d] = {}); if (!o[k] || ts > o[k]) o[k] = +ts; };
        for (const l of input.logs || []) {
            if (!l || l.voided || !(+l.ts > 0)) continue;
            let v = '';
            try { v = vd(l) || ''; } catch (e) { v = verdict(l); }
            mark('meal', +l.ts);
            if (v === 'low') mark('low', +l.ts);
            if (v === 'spike') mark('spike', +l.ts);
        }
        for (const e of input.ledger || []) {
            if (!e || !(+e.amt > 0) || !(+e.ts > 0)) continue;
            const k = kind(e);
            if (/^(low|water|move|scan|fast|sun|trip)$/.test(k)) mark(k, +e.ts);
            if (k === 'meal') mark('meal', +e.ts);
        }
        for (const t of input.trips || []) if (t && +t.ts > 0) mark('trip', +t.ts);
        if (+input.water > 0) { const d = dayKey(now), o = out[d] || (out[d] = {}); if (!o.water) o.water = now; }
        return out;
    }
    function doneAt(act, day, fav) {
        const o = act && act[day];
        if (!o) return 0;
        if (fav === 'any') return Math.max(o.low || 0, o.meal || 0, o.water || 0, o.move || 0, o.scan || 0, o.fast || 0, o.sun || 0, o.trip || 0);
        return o[fav] || 0;
    }

    /* stored state (S.buddies, synced with the account) */
    const okId = id => typeof id === 'string' && /^[a-z0-9_-]{2,24}$/.test(id);
    function clean(st) {
        st = st && typeof st === 'object' ? st : {};
        const crew = Array.isArray(st.crew) ? st.crew.filter(okId).filter((x, i, a) => a.indexOf(x) === i).slice(0, MAX_CREW) : [];
        const days = {}, lvl = {}, trips = {}, joined = {};
        const src = st.days && typeof st.days === 'object' ? st.days : {};
        for (const id in src) if (okId(id) && Array.isArray(src[id])) days[id] = src[id].filter(d => /^\d{4}-\d\d-\d\d$/.test(d)).filter((x, i, a) => a.indexOf(x) === i).sort().slice(-400);
        for (const id in (st.lvl || {})) if (okId(id) && Number.isFinite(+st.lvl[id])) lvl[id] = Math.max(1, Math.min(LEVELS.length, Math.floor(+st.lvl[id])));
        for (const id in (st.trips || {})) if (okId(id) && Number.isFinite(+st.trips[id])) trips[id] = Math.max(0, Math.floor(+st.trips[id]));
        for (const id in (st.joined || {})) if (okId(id) && +st.joined[id] > 0) joined[id] = +st.joined[id];
        const tripIds = Array.isArray(st.tripIds) ? st.tripIds.filter(x => typeof x === 'string').slice(-60) : [];
        return { crew, days, lvl, trips, joined, tripIds, starter: !!st.starter };
    }
    /* the crew as book cards: stored order, found only; Lacto (or the first finds) when nothing is stored */
    function crew(st, cards) {
        st = clean(st);
        const found = (cards || []).filter(c => c && c.found);
        const by = id => found.find(c => c.id === id);
        let list = st.crew.map(by).filter(Boolean);
        if (!list.length) {
            const s = by(STARTER.id);
            list = s ? [s] : found.slice().sort((a, b) => (a.since || 0) - (b.since || 0) || a.no - b.no).slice(0, 1);
        }
        return list.slice(0, MAX_CREW);
    }
    function add(st, id, cards, now) {
        st = clean(st);
        const c = (cards || []).find(x => x && x.id === id);
        if (!c || !c.found) return { st, ok: false, why: 'notfound' };
        const cur = crew(st, cards).map(x => x.id);
        if (cur.includes(id)) return { st, ok: false, why: 'in' };
        if (cur.length >= MAX_CREW) return { st, ok: false, why: 'full' };
        st.crew = cur.concat(id);
        if (!st.joined[id]) st.joined[id] = +now || Date.now();
        return { st, ok: true };
    }
    function drop(st, id, cards) {
        st = clean(st);
        const cur = crew(st, cards).map(x => x.id);
        if (!cur.includes(id)) return { st, ok: false, why: 'out' };
        if (cur.length <= 1) return { st, ok: false, why: 'last' };
        st.crew = cur.filter(x => x !== id);
        return { st, ok: true };
    }
    function lead(st, id, cards) {
        st = clean(st);
        const cur = crew(st, cards).map(x => x.id);
        if (!cur.includes(id)) return { st, ok: false, why: 'out' };
        st.crew = [id].concat(cur.filter(x => x !== id));
        return { st, ok: true };
    }
    function bond(st, id) {
        st = st && st.days ? st : clean(st);
        const n = (st.days[id] || []).length;
        let lvl = 1;
        LEVELS.forEach((t, i) => { if (n >= t) lvl = i + 1; });
        const next = lvl < LEVELS.length ? LEVELS[lvl] : 0, prev = LEVELS[lvl - 1];
        return { days: n, lvl, next, left: next ? next - n : 0, pct: next ? Math.round((n - prev) / (next - prev) * 100) : 100, title: TITLES[lvl - 1], trips: st.trips[id] || 0 };
    }
    /* today's bond day for every crew buddy whose favourite was done today; returns the new levels to gift once */
    function sync(st, cards, act, now) {
        st = clean(st);
        now = +now || Date.now();
        const day = dayKey(now), ups = [], list = crew(st, cards);
        if (!st.crew.length && list.length) st.crew = list.map(c => c.id);
        for (const c of list) {
            if (!st.joined[c.id]) st.joined[c.id] = now;
            const d = st.days[c.id] || (st.days[c.id] = []);
            if (!d.includes(day) && doneAt(act, day, favOf(c.b)) && doneAt(act, day, favOf(c.b)) >= dayStart(now)) { d.push(day); d.sort(); }
            const b = bond(st, c.id), had = st.lvl[c.id] || 1;
            if (b.lvl > had) { for (let l = had + 1; l <= b.lvl; l++) ups.push({ id: c.id, lvl: l, amt: GIFT(l) }); st.lvl[c.id] = b.lvl; }
            else if (!st.lvl[c.id]) st.lvl[c.id] = b.lvl;
        }
        return { st, ups };
    }
    function dayStart(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
    /* a body trip finished: the lead buddy came along (once per trip id) */
    function trip(st, cards, t, now) {
        st = clean(st);
        const id = t && (t.id || t.ts) ? String(t.id || t.ts) : '';
        const list = crew(st, cards);
        if (!id || !list.length || st.tripIds.includes(id)) return { st, who: null };
        const who = list[0];
        st.tripIds.push(id); st.tripIds = st.tripIds.slice(-60);
        st.trips[who.id] = (st.trips[who.id] || 0) + 1;
        const day = dayKey(+t.ts || +now || Date.now()), d = st.days[who.id] || (st.days[who.id] = []);
        if (!d.includes(day)) { d.push(day); d.sort(); }
        return { st, who };
    }

    /* right-now mood: sleepy at night, tidy after a spike meal, cheer right after its favourite, happy once it was done today */
    function mood(b, act, now, opts) {
        now = +now || Date.now();
        opts = opts || {};
        const hour = opts.hour != null ? +opts.hour : new Date(now).getHours(), fav = favOf(b), day = dayKey(now), o = act && act[day] || {};
        const last = doneAt(act, day, fav);
        if (hour >= 23 || hour < 5) return { m: 'sleepy', fav, last };
        if (o.spike && now - o.spike < SPIKE_H * HOUR) return { m: 'tidy', fav, last };
        if (last && now - last < CHEER_H * HOUR) return { m: 'cheer', fav, last };
        if (last) return { m: 'happy', fav, last };
        return { m: 'wish', fav, last };
    }
    function line(md, l) {
        if (!md) return '';
        if (md.m === 'sleepy' || md.m === 'tidy') return pick(SAY[md.m], l);
        const f = FAVS[md.fav] || FAVS.any;
        return pick(f[md.m] || f.wish, l);
    }
    /* spots around the cell in the herb world stage (percent of the stage), clear of the centre */
    function spots(n) {
        const all = [[16, 64], [84, 40], [22, 26], [80, 70]];
        return all.slice(0, Math.max(0, Math.min(n, all.length)));
    }
    /* 3D orbit around the cell (cell radius 1.4 in world units) */
    function orbit(i, n, t, md) {
        const sp = md === 'cheer' ? 1.6 : md === 'sleepy' ? 0.35 : 1;
        const a = (i / Math.max(1, n)) * Math.PI * 2 + t * 0.28 * sp, r = 2.45 + 0.25 * (i % 2);
        const bob = Math.sin(t * (md === 'cheer' ? 4.2 : 1.6) + i * 2.1) * (md === 'cheer' ? 0.22 : md === 'sleepy' ? 0.05 : 0.12);
        return [Math.cos(a) * r, 0.35 * Math.sin(a * 0.7 + i) + bob, Math.sin(a) * r];
    }

    const api = { MAX_CREW, STARTER, FAVS, FAV_BY_M, LEVELS, TITLES, SAY, GIFT, dayKey, pick, favOf, bodyOf, verdict, kind, activity, doneAt, clean, crew, add, drop, lead, bond, sync, trip, mood, line, spots, orbit };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.LowiBuddiesCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
