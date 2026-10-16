/* LOWiSPIKE sun meter (Oct 15, 2026): one daily bar on Today, fed only by actions the XP ledger counted.
   Meal +3, scan +3, Move +4, fasting milestone +3, macro goal +2, water +1, any other counted action +1. 12 = full.
   Duplicate meals and meals over the daily cap never reach the ledger, so they add nothing.
   Full sun: one reward per local day (ledger eventId sun-full:<day>, +10 XP), one reward sheet, then the herb goes out
   into the garden for an hour (countdown on its bubble and on the bar) and comes back with one find.
   Finds are kept in S.garden (account data). Pure model at the top is tested in tests/sun-meter.test.cjs.
   Oct 16 (E-man): Misty's ENERGY (energy() below) comes from what was tracked today: meals (rated by the app's own verdict),
   glasses of water and Moves. Not tracked = no energy from it yet, never "you didn't". Low energy: she looks tired (spiky
   food logged: worn out) and is too tired to head out; the sun-full bonus still counts and she leaves once she has energy.
   Full of energy when she leaves: she brings back a second find. The countdown shows in her empty bubble on Home.
   The trip is timestamps only (start/back), reconciled on load: nothing simulates in the background. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;
    if (W.LowiSun) return;
    const GOAL = 12, AWAY_MS = 60 * 60000, BONUS = 10;
    const PTS = { meal: 3, scan: 3, move: 4, fast: 3, macro: 2, water: 1, other: 1, sun: 0, quest: 0 };
    /* per-type ceiling: no single habit fills the sun alone, a mix of Today/Scan/Cook/Move does */
    const CAP = { meal: 9, scan: 6, move: 8, fast: 6, macro: 4, water: 4, other: 3 };
    const pad = n => String(n).padStart(2, '0');
    const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

    /* ---------- pure model ---------- */
    function classify(e) {
        if (!e) return 'other';
        const src = String(e.src || ''), id = String(e.eventId || ''), txt = (src + ' ' + (e.label || '')).toLowerCase();
        if (/^sun-full/.test(src) || /^sun-full:/.test(id)) return 'sun';
        if (/^(tap|combo)$/.test(src)) return 'quest'; /* xtp: tap XP and streak bonus add no sunbeams and no herb praise */
        /* quest, streak and board bonuses reward actions that already counted: no second sunbeam */
        if (!src || /^f\d|^f3all|^f2_break|^e1:/.test(src)) return 'quest';
        if (/^meal/.test(src) || /^meal:|^plan-meal:/.test(id)) return 'meal';
        if (/^macro-goal/.test(src) || /^macro-goal/.test(id)) return 'macro';
        if (/scan|capture|product|dex/.test(txt)) return 'scan';
        if (/water|wasser|agua|hydrat/.test(txt)) return 'water';
        if (/move|walk|workout|steps|dance|yoga|stretch/.test(txt)) return 'move';
        if (/fast/.test(txt)) return 'fast';
        return 'other';
    }
    const points = e => (e && +e.amt > 0) ? (PTS[classify(e)] || 0) : 0;
    /* meal logs: their own day decides (a meal can be logged for another day) */
    const isDay = (e, key) => (e.day ? e.day === key : dayKey(+e.ts || 0) === key);
    /* Oct 16 (E-man: "Sun is full 12/12... did it even reset?"): XP ledger entries count for the sun on the local day
       they happened. Their moment (ts, in ms) decides; the stamped day is only the fallback, so an entry stamped with
       another day (a sync from another device or time zone, a re-save) can never keep yesterday's sun full today. */
    const inDay = (e, key) => (+e.ts > 1e12 ? dayKey(+e.ts) === key : e.day ? e.day === key : false);
    function msToMidnight(now) {
        const d = new Date(now), m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
        return Math.max(0, m.getTime() - now);
    }
    /* "6:05" until the new sun */
    function fmtHM(ms) {
        const m = Math.max(1, Math.ceil(Math.max(0, +ms || 0) / 60000));
        return Math.floor(m / 60) + ':' + pad(m % 60);
    }
    function model(input) {
        input = input || {};
        const now = +input.now || Date.now(), key = dayKey(now), ledger = (input.ledger || []).filter(e => e && inDay(e, key));
        const parts = {};
        let raw = 0;
        for (const e of ledger) {
            const p = points(e);
            if (!p) continue;
            const k = classify(e);
            parts[k] = parts[k] || { n: 0, pts: 0 };
            const add = Math.max(0, Math.min(p, (CAP[k] || 99) - parts[k].pts));
            parts[k].n++; parts[k].pts += add; raw += add;
        }
        const fullDone = (input.ledger || []).some(e => e && e.eventId === 'sun-full:' + key);
        const trip = input.garden && input.garden.trips && input.garden.trips[key] || null;
        let away = null;
        for (const t of Object.values((input.garden && input.garden.trips) || {})) if (t && !t.got && +t.back > now) away = t;
        const pending = Object.entries((input.garden && input.garden.trips) || {}).filter(([, t]) => t && !t.got && +t.back <= now).map(([d, t]) => Object.assign({ day: d }, t));
        return { key, goal: GOAL, raw, points: Math.min(GOAL, raw), ratio: Math.min(1, raw / GOAL), full: raw >= GOAL, fullDone, parts, trip, away, left: away ? +away.back - now : 0, pending };
    }
    const ITEMS = [
        { id: 'dew', hue: 195, n: ['Morning dew drop', 'Morgentautropfen', 'Gota de rocío'] },
        { id: 'pebble', hue: 48, n: ['Star pebble', 'Sternenkiesel', 'Guijarro estelar'] },
        { id: 'feather', hue: 230, n: ['Moon feather', 'Mondfeder', 'Pluma lunar'] },
        { id: 'seed', hue: 140, n: ['Glow seed', 'Leuchtsamen', 'Semilla luminosa'] },
        { id: 'shard', hue: 20, n: ['Meteor shard', 'Meteoritensplitter', 'Fragmento de meteorito'] },
        { id: 'petal', hue: 300, n: ['Night-bloom petal', 'Nachtblütenblatt', 'Pétalo nocturno'] },
        { id: 'ribbon', hue: 165, n: ['Aurora ribbon', 'Polarlichtband', 'Cinta de aurora'] },
        { id: 'shell', hue: 265, n: ['Comet shell', 'Kometenmuschel', 'Concha de cometa'] },
        { id: 'acorn', hue: 32, n: ['Tiny acorn', 'Mini-Eichel', 'Bellota diminuta'] },
        { id: 'crystal', hue: 175, n: ['Crystal leaf', 'Kristallblatt', 'Hoja de cristal'] }
    ];
    /* one find per trip: stable for the day, prefers something the user doesn't have yet */
    function pickItem(key, owned) {
        const have = new Set((owned || []).map(o => o && (o.id || o)));
        let h = 7;
        for (const c of String(key)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
        const fresh = ITEMS.filter(i => !have.has(i.id)), pool = fresh.length ? fresh : ITEMS;
        return pool[h % pool.length].id;
    }
    /* countdown as h:mm, never 0:00 while still away */
    function fmtLeft(ms) {
        const m = Math.max(1, Math.ceil(Math.max(0, +ms || 0) / 60000));
        return Math.floor(m / 60) + ':' + pad(m % 60);
    }
    /* ---------- Misty's energy (pure) ----------
       0.15 resting base + food 40% + water 30% + Move 30%. Food = mean app verdict of today's logged meals (same rule as
       LowiWorldHealth.verdict: low 1, mid .55, unknown .6, spike .15). Water = glasses / 4. Move = any Move logged.
       tiers: thriving >= .75, ok >= .4, below: 'weak' if a spiky meal was logged, else 'tired'. Travel needs >= .4. */
    const ENERGY = { base: 0.15, food: 0.4, water: 0.3, move: 0.3, waterGoal: 4, travel: 0.4, strong: 0.75 };
    function verdict(l) {
        const r = String(l && l.r != null ? l.r : '').toLowerCase(), v = String(l && l.lvl || '').toLowerCase();
        if (r === 'ja' || v === 'low' || r === 'low' || r === 'yes') return 1;
        if (r === 'nein' || v === 'high' || r === 'high' || r === 'no') return 0.15;
        if (r === 'jein' || v === 'mid' || v === 'medium' || r === 'mid' || r === 'maybe') return 0.55;
        return 0.6;
    }
    function energy(input) {
        input = input || {};
        const now = +input.now || Date.now(), key = dayKey(now);
        /* Oct 16 fair play: twins, repeats and rapid-fire taps count once (LowiWorldHealth.fairDay, the shared rule) */
        const WHc = W.LowiWorldHealth, fair = WHc && typeof WHc.fairDay === 'function' ? WHc.fairDay({ logs: (input.logs || []).filter(l => l && isDay(l, key)), ledger: (input.ledger || []).filter(e => e && inDay(e, key)).map(e => Object.assign({}, e, { day: key })) }, key) : null;
        const logs = fair ? fair.logs : (input.logs || []).filter(l => l && isDay(l, key));
        const ledger = fair ? fair.ledger : (input.ledger || []).filter(e => e && inDay(e, key));
        const counted = ledger.filter(e => classify(e) === 'water').length;
        const raw = fair ? (input.ledger || []).filter(e => e && inDay(e, key) && classify(e) === 'water').length : counted;
        const tapped = Math.max(0, Math.floor(+input.water || 0));
        /* glasses past the daily water XP limit still count (the counter knows them), rapid-fire repeats the ledger caught do not */
        const water = tapped ? (raw ? Math.min(tapped, counted + Math.max(0, tapped - raw)) : tapped) : counted;
        const moves = ledger.filter(e => +e.amt > 0 && classify(e) === 'move').length;
        const spikes = logs.filter(l => verdict(l) <= 0.15).length;
        const food = logs.length ? logs.reduce((a, l) => a + verdict(l), 0) / logs.length : 0;
        const parts = { food, water: Math.min(1, water / ENERGY.waterGoal), move: moves ? 1 : 0 };
        const value = Math.max(0, Math.min(1, ENERGY.base + (1 - ENERGY.base) * (ENERGY.food * parts.food + ENERGY.water * parts.water + ENERGY.move * parts.move)));
        const tier = value >= ENERGY.strong ? 'thriving' : value >= ENERGY.travel ? 'ok' : spikes ? 'weak' : 'tired';
        return { value, tier, canTravel: value >= ENERGY.travel, meals: logs.length, spikes, water, moves, parts, known: { food: logs.length > 0, water: water > 0, move: moves > 0 } };
    }
    /* a trip may start today only once the sun bonus is in, nothing is out, and Misty has the energy */
    const mayDepart = (v, en) => !!(v && v.fullDone && !v.trip && !v.away && en && en.canTravel);
    /* "42 min" / "1 h 05" for the bubble countdown, never 0 while still away */
    function fmtBack(ms) {
        const m = Math.max(1, Math.ceil(Math.max(0, +ms || 0) / 60000));
        return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + pad(m % 60);
    }
    /* the finds a trip brings home: one, plus a bonus one when Misty left full of energy */
    function tripFinds(trip, day) {
        if (!trip || !trip.item) return [];
        const out = [{ id: trip.item, day }];
        if (trip.vigor === 'thriving' && trip.item2) out.push({ id: trip.item2, day, bonus: true });
        return out;
    }
    function makeTrip(key, owned, now, tier) {
        const item = pickItem(key, owned), t = { start: now, back: now + AWAY_MS, item, got: false, vigor: tier || 'ok' };
        if (tier === 'thriving') t.item2 = pickItem(key + ':2', (owned || []).concat([item]));
        return t;
    }
    /* how much today's trip has energised the world's cells, 0..1: grows over the trip, stays for the rest of the day.
       Full of energy when she left: 1, okay: .5. */
    function tended(trip, now) {
        if (!trip || !(+trip.start > 0)) return 0;
        const mult = trip.vigor === 'thriving' ? 1 : trip.vigor === 'ok' ? 0.5 : 0.25;
        const prog = trip.got ? 1 : Math.max(0, Math.min(1, ((+now || Date.now()) - trip.start) / AWAY_MS));
        return +(mult * prog).toFixed(3);
    }
    const core = { GOAL, AWAY_MS, BONUS, PTS, CAP, ITEMS, ENERGY, tended, classify, points, model, pickItem, fmtLeft, fmtBack, fmtHM, msToMidnight, dayKey, verdict, energy, mayDepart, tripFinds, makeTrip };
    if (!D) {
        if (typeof module !== 'undefined' && module.exports) module.exports = core;
        return;
    }

    /* ---------- copy ---------- */
    const lang = () => { try { return (W.LowiLang.get() || 'de').slice(0, 2); } catch (e) { return ((D.documentElement.lang) || 'de').slice(0, 2); } };
    const L = () => ({ en: 0, de: 1, es: 2 }[lang()] || 0);
    const copy = {
        sun: ['Sun', 'Sonne', 'Sol'],
        full: ['Sun is full', 'Sonne ist voll', 'Sol lleno'],
        away: ['Out tending the world', 'Pflegt die Welt', 'Cuidando el mundo'],
        back: ['back in', 'zurück in', 'vuelve en'],
        title: ['Your sun is full!', 'Deine Sonne ist voll!', '¡Tu sol está lleno!'],
        thanks: ['Thank you! All that sunshine gives me so much energy. I’m flying out into the world to help everything grow, and I’ll bring you something back. Watch for me out there!', 'Danke! So viel Sonne gibt mir so viel Kraft. Ich flieg raus in die Welt und helfe allem beim Wachsen, und ich bring dir was mit. Schau, wo ich herumfliege!', '¡Gracias! Tanto sol me da mucha energía. Salgo volando al mundo a ayudar a que todo crezca y te traigo algo. ¡Búscame por ahí!'],
        filled: ['What filled it today', 'Das hat sie heute gefüllt', 'Lo que la llenó hoy'],
        go: ['Off you go', 'Los, flieg los', '¡Ve!'],
        backIn: ['Back in', 'Zurück in', 'Vuelvo en'],
        tomorrow: ['Tomorrow your sun starts fresh.', 'Morgen fängt deine Sonne neu an.', 'Mañana tu sol empieza de nuevo.'],
        newIn: ['new in', 'neu in', 'nuevo en'],
        resetAt: ['At midnight your sun starts fresh. New sun in', 'Um Mitternacht fängt deine Sonne neu an. Neue Sonne in', 'A medianoche tu sol empieza de nuevo. Sol nuevo en'],
        home: ['I’m back!', 'Ich bin zurück!', '¡Ya volví!'],
        found: ['Look what I found out in the world:', 'Schau, was ich draußen in der Welt gefunden hab:', 'Mira lo que encontré en el mundo:'],
        keep: ['Keep it', 'Behalten', 'Guardar'],
        finds: ['World finds', 'Welt-Funde', 'Hallazgos del mundo'],
        none: ['Fill your sun and I’ll bring the first one.', 'Füll deine Sonne, dann bring ich den ersten mit.', 'Llena tu sol y te traigo el primero.'],
        how: ['How the sun fills', 'So füllt sich die Sonne', 'Cómo se llena el sol'],
        howTx: ['Every counted action is a sunbeam for me, up to a daily limit per kind, so a mix fills me fastest. Repeats, spiky meals and meals over the daily limit don’t count.', 'Jede gezählte Aktion ist ein Sonnenstrahl für mich, pro Art bis zu einer Grenze. Eine Mischung füllt mich am schnellsten. Doppeltes, Spike-Mahlzeiten und Essen über dem Tageslimit zählen nicht.', 'Cada acción contada es un rayo de sol para mí, con un límite por tipo, así que una mezcla me llena antes. Repeticiones, comidas con pico y comidas sobre el límite diario no cuentan.'],
        awayTap: ['I’m out tending the world! Back in', 'Ich pflege gerade die Welt! Zurück in', '¡Estoy cuidando el mundo! Vuelvo en'],
        tiredT: ['Thank you! The sun is full, but I’m too tired to head out right now. A meal, a glass of water or a Move gives me energy, and then I’m off.', 'Danke! Die Sonne ist voll, aber ich bin gerade zu müde zum Losfliegen. Eine Mahlzeit, ein Glas Wasser oder Bewegung gibt mir Kraft, dann flieg ich los.', '¡Gracias! El sol está lleno, pero ahora no tengo energía para salir. Una comida, un vaso de agua o moverte me da energía y salgo.'],
        tooTired: ['Too tired to explore', 'Zu müde zum Erkunden', 'Sin energía para explorar'],
        tiredTap: ['I’m too tired to head out. A meal, water or a Move gives me energy.', 'Ich bin zu müde zum Losfliegen. Essen, Wasser oder Bewegung geben mir Kraft.', 'No tengo energía para salir. Comer, agua o moverte me da energía.'],
        okay: ['Okay', 'Okay', 'Vale'],
        out: ['Out exploring', 'Unterwegs', 'Explorando'],
        backShort: ['back in', 'zurück in', 'vuelve en'],
        leaves: ['I’ve got energy now, I’m heading out! Back in', 'Jetzt hab ich Kraft, ich flieg los! Zurück in', '¡Ya tengo energía, salgo! Vuelvo en'],
        bonusFind: ['I had so much energy, I found a second one:', 'Ich hatte so viel Kraft, ich hab noch was gefunden:', 'Tenía tanta energía que encontré otro:'],
        energy: ['Misty’s energy', 'Mistys Energie', 'Energía de Misty'],
        eThriving: ['Full of energy', 'Voller Energie', 'Llena de energía'], eOk: ['Doing okay', 'Geht so', 'Bien'], eTired: ['Low on energy', 'Wenig Energie', 'Poca energía'], eWeak: ['Worn out', 'Erschöpft', 'Agotada'],
        eFood: ['Food', 'Essen', 'Comida'], eWater: ['Water', 'Wasser', 'Agua'], eMove: ['Move', 'Bewegung', 'Movimiento'],
        notYet: ['not tracked yet', 'noch nicht eingetragen', 'aún sin registrar'],
        mealsN: ['logged', 'eingetragen', 'registradas'], spikyN: ['spiky', 'mit Spike', 'con pico'], glasses: ['glasses', 'Gläser', 'vasos'], moved: ['logged', 'eingetragen', 'registrado'],
        eNote: ['“Not tracked yet” only means Misty gets no energy from it yet, not that you didn’t do it. Energy is what sends Misty out on adventures.', '„Noch nicht eingetragen“ heißt nur, dass Misty daraus noch keine Kraft bekommt, nicht dass du es nicht gemacht hast. Für Abenteuer braucht Misty Energie.', '“Aún sin registrar” solo significa que Misty aún no recibe energía de eso, no que no lo hayas hecho. Necesita energía para sus aventuras.'],
        meal: ['Meal', 'Mahlzeit', 'Comida'], scan: ['Scan', 'Scan', 'Escaneo'], move: ['Move', 'Bewegung', 'Movimiento'], fast: ['Fasting milestone', 'Fasten-Etappe', 'Etapa de ayuno'],
        macro: ['Macro goal', 'Makro-Ziel', 'Meta de macros'], water: ['Glass of water', 'Glas Wasser', 'Vaso de agua'], other: ['Other action', 'Andere Aktion', 'Otra acción']
    };
    const tr = k => (copy[k] || [k])[L()] || (copy[k] || [k])[0];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const itemName = id => { const it = ITEMS.find(i => i.id === id); return it ? (it.n[L()] || it.n[0]) : id; };
    const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const sunSvg = r => '<svg class="ls-ico" viewBox="0 0 24 24" aria-hidden="true"><g class="ls-rays">' +
        [0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => '<line x1="12" y1="2.2" x2="12" y2="4.6" transform="rotate(' + a + ' 12 12)" style="opacity:' + (r >= (i + 1) / 8 ? 1 : .28) + '"/>').join('') +
        '</g><circle cx="12" cy="12" r="5.2"/></svg>';
    const itemSvg = id => { const it = ITEMS.find(i => i.id === id) || ITEMS[0]; return '<svg class="ls-find" viewBox="0 0 40 40" aria-hidden="true" style="--h:' + it.hue + '"><circle cx="20" cy="20" r="17" class="ls-find-bg"/><path d="M20 8l3.2 8.1L31 19l-7.8 2.9L20 30l-3.2-8.1L9 19l7.8-2.9z" class="ls-find-fg"/></svg>'; };

    /* ---------- state ---------- */
    const B = () => W.LowiVitalsBridge;
    const S = () => { try { return B().state() || {}; } catch (e) { return {}; } };
    const save = () => { try { B().save(); } catch (e) {} };
    function garden() { const s = S(); if (!s.garden || typeof s.garden !== 'object') s.garden = { trips: {}, items: [] }; s.garden.trips = s.garden.trips || {}; s.garden.items = s.garden.items || []; return s.garden; }
    const live = () => { const s = S(); return model({ now: Date.now(), ledger: s.ledger || [], garden: s.garden }); };
    function waterToday(now) { try { const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}') || {}; return +((f.water || {})[dayKey(now)]) || 0; } catch (e) { return 0; } }
    const energyNow = () => { const s = S(), now = Date.now(); return energy({ now, logs: s.logs || [], ledger: s.ledger || [], water: waterToday(now) }); };

    /* ---------- bar on Today ---------- */
    let row = null, last = '';
    function mount() {
        const home = D.getElementById('spHome'), log = home && home.querySelector('.sp-log');
        if (!log) return null;
        if (!row) {
            row = D.createElement('button');
            row.type = 'button';
            row.id = 'lsSun';
            row.className = 'ls-sun';
            row.dataset.ls = 'info';
        }
        const dash = log.querySelector('#lvDash'), head = log.querySelector(':scope > header');
        const before = dash || (head ? head.nextSibling : log.firstChild);
        if (row.parentNode !== log || (dash && row.nextSibling !== dash)) { log.insertBefore(row, before); last = ''; }
        return row;
    }
    function render() {
        if (!mount()) return;
        const v = live(), home = D.getElementById('spHome');
        const away = !!v.away, label = away ? tr('away') : v.full ? tr('full') : tr('sun');
        /* when full, the row says when the new sun starts, so it is clear it resets every night */
        const right = away ? tr('back') + ' ' + fmtLeft(v.left) : v.points + '/' + v.goal + (v.full ? ' · ' + tr('newIn') + ' ' + fmtHM(msToMidnight(Date.now())) : '');
        const sig = [label, right, v.ratio.toFixed(3), lang(), away, v.key].join('|');
        if (home) { if (away) home.dataset.sunAway = '1'; else delete home.dataset.sunAway; }
        const en = energyNow();
        if (home && home.dataset.misty !== en.tier) home.dataset.misty = en.tier;
        awayBadge(v);
        backChip(v, en);
        if (sig === last) return;
        last = sig;
        row.classList.toggle('full', v.full);
        row.classList.toggle('away', away);
        row.style.setProperty('--ls-fill', v.ratio.toFixed(3));
        row.setAttribute('aria-label', label + ', ' + right);
        const pops = [...row.querySelectorAll('.ls-pop')];
        row.innerHTML = sunSvg(v.ratio) + '<span class="ls-name">' + esc(label) + '</span><span class="ls-track" aria-hidden="true"><i class="ls-fill"></i></span><span class="ls-num num">' + esc(right) + '</span>';
        pops.forEach(p => row.appendChild(p));
    }
    function awayBadge() {
        /* Oct 16 (E-man): no garden countdown label in Misty's bubble. While she is out you see her flying through the world
           (world-home.js adventure); the countdown stays on the sun bar in Today. */
        const b = D.querySelector('#spBubble .ls-away'); if (b) b.remove();
    }
    /* Oct 16 (E-man: "a timer, so we know when Misty comes back"): while she is out, her empty bubble on Home shows
       "Out exploring · back in 42 min"; when the sun is full but she is too tired, it says so under her. */
    function backChip(v, en) {
        const bub = D.getElementById('spBubble');
        let c = bub && bub.querySelector(':scope > .ls-back');
        const waiting = !v.away && v.fullDone && !v.trip && en && !en.canTravel;
        if (!bub || (!v.away && !waiting)) { if (c) c.remove(); return; }
        if (!c) { c = D.createElement('span'); c.className = 'ls-back'; c.setAttribute('role', 'status'); bub.appendChild(c); }
        const txt = v.away ? tr('out') + ' · ' + tr('backShort') + ' ' + fmtBack(v.left) : tr('tooTired');
        c.classList.toggle('tired', !v.away);
        if (c.textContent !== txt) c.textContent = txt;
    }
    function pop(n) {
        if (!row || !row.isConnected || !n) return;
        const p = D.createElement('span');
        p.className = 'ls-pop' + (reduced() ? ' rm' : '');
        p.textContent = '+' + n;
        p.setAttribute('aria-hidden', 'true');
        row.appendChild(p);
        row.classList.remove('ls-bump'); void row.offsetWidth; if (!reduced()) row.classList.add('ls-bump');
        setTimeout(() => p.remove(), 1300);
    }

    /* ---------- sheets ---------- */
    const R = () => W.LowiR2;
    function partsHtml(v) {
        const ks = Object.keys(v.parts);
        if (!ks.length) return '';
        return '<ul class="ls-parts">' + ks.map(k => '<li><span>' + esc(tr(k)) + (v.parts[k].n > 1 ? ' ×' + v.parts[k].n : '') + '</span><b class="num">+' + v.parts[k].pts + '</b></li>').join('') + '</ul>';
    }
    function fullSheet(v) {
        if (!R() || !R().sheet) return;
        try { localStorage.setItem('lowi.sun.sheet', v.key); } catch (e) {}
        const gone = !!v.trip;
        const html = '<div class="ls-sheet"><div class="ls-big">' + sunSvg(1) + '</div><h2>' + esc(tr('title')) + '</h2><p class="ls-say">' + esc(tr(gone ? 'thanks' : 'tiredT')) + '</p>' +
            '<p class="ls-bonus num">+' + BONUS + ' XP</p>' +
            (Object.keys(v.parts).length ? '<h3>' + esc(tr('filled')) + '</h3>' + partsHtml(v) : '') +
            '<p class="ls-note">' + (gone ? esc(tr('backIn')) + ' ' + fmtBack(Math.max(0, +v.trip.back - Date.now())) + ' · ' : '') + esc(tr('tomorrow')) + '</p>' +
            '<button type="button" class="ls-cta" data-ls="close">' + esc(tr(gone ? 'go' : 'okay')) + '</button></div>';
        R().sheet(html, { cls: 'ls-ov' });
    }
    function returnSheet(trip) {
        const name = itemName(trip.item);
        const bonus = trip.vigor === 'thriving' && trip.item2 ? '<p class="ls-say">' + esc(tr('bonusFind')) + '</p><div class="ls-big sm">' + itemSvg(trip.item2) + '</div><p class="ls-item">' + esc(itemName(trip.item2)) + '</p>' : '';
        if (R() && R().sheet) {
            R().sheet('<div class="ls-sheet"><div class="ls-big">' + itemSvg(trip.item) + '</div><h2>' + esc(tr('home')) + '</h2><p class="ls-say">' + esc(tr('found')) + '</p><p class="ls-item">' + esc(name) + '</p>' + bonus +
                '<button type="button" class="ls-cta" data-ls="close">' + esc(tr('keep')) + '</button></div>', { cls: 'ls-ov' });
        }
    }
    function energyHtml(en) {
        const name = { thriving: 'eThriving', ok: 'eOk', tired: 'eTired', weak: 'eWeak' }[en.tier] || 'eOk';
        const food = en.meals ? en.meals + ' ' + tr('mealsN') + (en.spikes ? ' · ' + en.spikes + ' ' + tr('spikyN') : '') : tr('notYet');
        const water = en.water ? en.water + ' ' + tr('glasses') : tr('notYet');
        const move = en.moves ? tr('moved') : tr('notYet');
        const li = (k, t, known) => '<li class="' + (known ? '' : 'unk') + '"><span>' + esc(tr(k)) + '</span><b>' + esc(t) + '</b></li>';
        return '<h3>' + esc(tr('energy')) + ' · ' + esc(tr(name)) + '</h3><div class="ls-track big ls-energy ' + en.tier + '" style="--ls-fill:' + en.value.toFixed(3) + '"><i class="ls-fill"></i></div>' +
            '<ul class="ls-parts ls-eparts">' + li('eFood', food, en.known.food) + li('eWater', water, en.known.water) + li('eMove', move, en.known.move) + '</ul>' +
            '<p class="ls-note">' + esc(tr('eNote')) + (v0().away || en.canTravel ? '' : ' ' + esc(tr('tiredTap'))) + '</p>';
    }
    const v0 = () => live();
    function infoSheet() {
        if (!R() || !R().sheet) return;
        const v = live(), g = garden();
        const how = ['meal', 'scan', 'move', 'fast', 'macro', 'water'].map(k => '<li><span>' + esc(tr(k)) + '</span><b class="num">+' + PTS[k] + ' <small>/ ' + CAP[k] + '</small></b></li>').join('');
        const finds = g.items.length ? '<ul class="ls-finds">' + g.items.slice(-12).reverse().map(i => '<li>' + itemSvg(i.id) + '<span>' + esc(itemName(i.id)) + '</span></li>').join('') + '</ul>' : '<p class="ls-note">' + esc(tr('none')) + '</p>';
        R().sheet('<div class="ls-sheet ls-info"><div class="ls-head">' + sunSvg(v.ratio) + '<div><h2>' + esc(v.away ? tr('away') : v.full ? tr('full') : tr('sun')) + '</h2><p class="num">' + (v.away ? esc(tr('back')) + ' ' + fmtLeft(v.left) : v.points + '/' + v.goal) + '</p></div></div>' +
            '<div class="ls-track big" style="--ls-fill:' + v.ratio.toFixed(3) + '"><i class="ls-fill"></i></div>' + '<p class="ls-note ls-reset num">' + esc(tr('resetAt')) + ' ' + fmtHM(msToMidnight(Date.now())) + '.</p>' + partsHtml(v) + energyHtml(energyNow()) +
            '<h3>' + esc(tr('how')) + '</h3><p class="ls-note">' + esc(tr('howTx')) + '</p><ul class="ls-parts how">' + how + '</ul>' +
            '<h3>' + esc(tr('finds')) + '</h3>' + finds + '</div>', { cls: 'ls-ov' });
    }

    /* ---------- flow ---------- */
    let busy = false;
    function check(e) {
        const v = live();
        render();
        const en = e && e.detail && e.detail.entry;
        if (en && points(en)) {
            const s = S(), before = model({ now: Date.now(), ledger: (s.ledger || []).filter(x => x !== en), garden: s.garden });
            const n = Math.min(v.points, GOAL) - Math.min(before.raw, GOAL);
            if (n > 0) pop(n);
        }
        if (v.full && !v.fullDone && !busy) { busy = true; setTimeout(fill, 700); }
        else if (v.fullDone && !v.trip) depart();
    }
    function fill() {
        busy = false;
        const v = live();
        if (!v.full || v.fullDone || !W.LowiHost) return;
        const got = LowiHost.award('sun-full', null, { amt: BONUS, label: 'Sun meter full', eventId: 'sun-full:' + v.key, perDay: 1 });
        if (!got) return;
        const g = garden(), en = energyNow();
        if (!g.trips[v.key] && en.canTravel) g.trips[v.key] = makeTrip(v.key, g.items, Date.now(), en.tier);
        save();
        let shown = '';
        try { shown = localStorage.getItem('lowi.sun.sheet') || ''; } catch (x) {}
        if (shown !== v.key) fullSheet(live());
        render();
    }
    /* the sun bonus is in but Misty was too tired: she leaves as soon as she has the energy (same day only) */
    function depart() {
        const v = live(), en = energyNow();
        if (!mayDepart(v, en)) return false;
        const g = garden();
        if (g.trips[v.key]) return false;
        g.trips[v.key] = makeTrip(v.key, g.items, Date.now(), en.tier);
        save();
        render();
        if (W.LowiPraise && LowiPraise.say) setTimeout(() => { try { LowiPraise.say(tr('leaves') + ' ' + fmtBack(AWAY_MS) + '.'); } catch (e) {} }, 900);
        return true;
    }
    function collect() {
        const v = live();
        if (!v.pending.length || D.hidden) return;
        if (R() && R().top && R().top()) return;
        const home = D.querySelector('#tab-home.active');
        if (!home) return;
        const g = garden(), t = v.pending[0], trip = g.trips[t.day];
        if (!trip || trip.got) return;
        trip.got = true;
        for (const f of tripFinds(trip, t.day)) if (!g.items.some(i => i.day === t.day && !!i.bonus === !!f.bonus)) g.items.push(Object.assign({ ts: Date.now() }, f));
        save();
        render();
        returnSheet(trip);
    }
    D.addEventListener('click', e => {
        const c = e.target.closest && e.target.closest('[data-ls]');
        if (c && c.dataset.ls === 'close') { const ov = c.closest('.r2-ov'); if (ov && R()) R().close(ov); return; }
        if (c && c.dataset.ls === 'info') { e.preventDefault(); infoSheet(); return; }
        const bub = e.target.closest && e.target.closest('#spBubble');
        if (bub) {
            const v = live();
            /* ambience only: the trip never blocks the herb world or anything in it */
            if (v.away && W.LowiPraise && LowiPraise.say) LowiPraise.say(tr('awayTap') + ' ' + fmtBack(v.left) + '.');
            else if (v.fullDone && !v.trip && !energyNow().canTravel && W.LowiPraise && LowiPraise.say) LowiPraise.say(tr('tiredTap'));
        }
    }, true);

    let queued = 0;
    const schedule = () => { if (queued) return; queued = requestAnimationFrame(() => { queued = 0; try { render(); } catch (e) {} }); };
    W.addEventListener('lowi:reward', e => { try { check(e); } catch (x) {} });
    ['lowi:lang', 'lowi:state', 'storage', 'focus'].forEach(n => W.addEventListener(n, schedule));
    D.addEventListener('visibilitychange', () => { schedule(); setTimeout(collect, 600); });
    function boot() {
        if (!D.getElementById('lsCss')) {
            const l = D.createElement('link');
            l.id = 'lsCss'; l.rel = 'stylesheet';
            const me = D.querySelector('script[src*="sun-meter.js"]');
            l.href = me ? me.getAttribute('src').replace('sun-meter.js', 'sun-meter.css') : 'sun-meter.css';
            D.head.appendChild(l);
        }
        const tab = D.getElementById('tab-home');
        if (tab && W.MutationObserver) new MutationObserver(() => { if (!row || !row.isConnected || (row.nextSibling && row.nextSibling.id !== 'lvDash' && D.getElementById('lvDash'))) schedule(); }).observe(tab, { childList: true, subtree: true });
        schedule();
        setTimeout(() => check(null), 1500);
        setInterval(() => { if (D.hidden) return; const v = live(); if (v.away || v.pending.length) { schedule(); collect(); } }, 5000);
        setInterval(() => { if (!D.hidden) { schedule(); try { depart(); } catch (e) {} } }, 30000);
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();

    const tendedNow = () => { const v = live(); return tended(v.trip, Date.now()); };
    W.LowiSun = Object.assign({}, core, { tendedNow, render, live, energyNow, info: infoSheet, collect, depart });
    if (typeof module !== 'undefined' && module.exports) module.exports = W.LowiSun;
})();
