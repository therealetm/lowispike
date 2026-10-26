/* Oct 26 2026 (Emmanuel, voice message 11:22 PM: "Und setze das mit dem ... Day-Recap, whatever we call it, setz das um").
   MAYA-HANDOFF 0.40. Day recap = your companion's read-only look back at today, built ONLY from what the app already holds:
   meals (S.logs) with their likely-blood-sugar-spike verdicts, water (lowi_fast_v1.water), the longest gap between meals
   (overnight gap from the meal times, or a finished fast in lowi_fast_v1.hist), Move minutes and steps (lowispike.move.v1),
   XP earned today (S.ledger) and the companion's level before/after today (levelOf).
   Pure: no DOM, no storage, no network. day-recap.js reads the data and draws the glass panel.
   Words: "likely blood sugar spike", never insulin; no medical promises; every line in EN/DE/ES with the same count. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiDayRecapCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const H = 3600000, MAX_GAP_H = 36, EVENING_H = 18;
    const pad = n => (n < 10 ? '0' : '') + n;
    const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const arr = v => (Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : []);
    const num = v => { v = +v; return isFinite(v) ? v : 0; };

    /* same rule as LowiVitalsBridge.spiky (index.html) plus the medium level analyseMeal gives */
    function verdict(l) {
        const r = String(l && l.r != null ? l.r : '').toLowerCase(), v = String(l && l.lvl || '').toLowerCase();
        if (r === 'ja' || v === 'low' || r === 'low' || r === 'yes') return 'low';
        if (r === 'nein' || v === 'high' || r === 'high' || r === 'no') return 'high';
        if (v === 'medium' || v === 'med' || r === 'medium' || r === 'mid') return 'medium';
        return 'unknown';
    }
    function bucket(src) {
        src = String(src || '').toLowerCase();
        if (/^meal|^scan|barcode/.test(src)) return 'meal';
        if (/^water/.test(src)) return 'water';
        if (/^move|walk|steps|mirror|deadlift/.test(src)) return 'move';
        if (/^fast|^gap|f2_break|r3a_fast/.test(src)) return 'gap';
        return 'other';
    }

    function summarize(o) {
        o = o || {};
        const now = num(o.now) || Date.now(), day = dayKey(now);
        const logs = arr(o.logs).filter(l => num(l.ts) > 0 || l.day);
        const onDay = l => (l.day ? l.day === day : dayKey(num(l.ts)) === day);
        const meals = logs.filter(onDay).map(l => ({ t: String(l.t || ''), ts: num(l.ts), v: verdict(l) })).sort((a, b) => a.ts - b.ts);
        const counts = { low: 0, medium: 0, high: 0, unknown: 0 };
        meals.forEach(m => { counts[m.v]++; });
        /* longest gap: between two meals that end today (the first one today counts the overnight gap), or a finished fast */
        const times = logs.map(l => num(l.ts)).filter(t => t > 0 && t <= now).sort((a, b) => a - b);
        let gap = 0;
        for (let i = 1; i < times.length; i++) {
            if (dayKey(times[i]) !== day) continue;
            const g = (times[i] - times[i - 1]) / H;
            if (g <= MAX_GAP_H && g > gap) gap = g;
        }
        const f = o.fast && typeof o.fast === 'object' ? o.fast : {};
        arr(f.hist).forEach(h => { if (num(h.e) > 0 && dayKey(num(h.e)) === day && num(h.h) <= MAX_GAP_H) gap = Math.max(gap, num(h.h)); });
        const water = Math.max(0, Math.floor(num(f.water && f.water[day])));
        const m = o.move && typeof o.move === 'object' ? o.move : {};
        const moveMin = Math.floor(arr(m.sessions).filter(s => s.day === day).reduce((a, s) => a + Math.max(0, num(s.moved)), 0) / 60);
        const steps = Math.max(0, Math.floor(num(m.steps && m.steps[day])));
        const xpBy = { meal: 0, water: 0, move: 0, gap: 0, other: 0 };
        let xp = 0, care = 0;
        arr(o.ledger).forEach(e => {
            const d = e.day || (num(e.ts) ? dayKey(num(e.ts)) : '');
            if (d !== day) return;
            if (/^care/.test(String(e.src || ''))) care++;
            const a = num(e.amt); if (!a) return;
            xp += a; xpBy[bucket(e.src)] += a;
        });
        let levelFrom = 0, levelTo = 0;
        if (typeof o.levelOf === 'function') {
            try { const total = Math.max(0, num(o.xp)); levelTo = num((o.levelOf(total) || {}).L); levelFrom = num((o.levelOf(Math.max(0, total - xp)) || {}).L); } catch (e) { levelFrom = levelTo = 0; }
        }
        const gapH = Math.round(gap * 10) / 10;
        return {
            day, meals, counts, water, gapH, moveMin, steps, xp, xpBy, levelFrom, levelTo, care,
            empty: !meals.length && !water && !moveMin && !steps && !xp && !gapH && !care,
            evening: new Date(now).getHours() >= EVENING_H || new Date(now).getHours() < 4
        };
    }

    /* {name} = companion name, {n} {m} = numbers. Same count in every language (tests). */
    const POOLS = {
        hello_good: {
            en: ['That was a good day, and I felt every bit of it.', 'Look at you today. I am glowing over here.', 'Today went well. I saved the best bits for you.', 'I loved today. Here is what we did together.', 'You took good care of us today.', 'A calm, steady day. My favourite kind.'],
            de: ['Das war ein guter Tag, und ich hab jedes bisschen gesp\u00fcrt.', 'Schau dich an heute. Ich leuchte hier richtig.', 'Heute lief gut. Ich hab dir das Beste aufgehoben.', 'Heute war sch\u00f6n. Das haben wir zusammen geschafft.', 'Du hast heute gut auf uns aufgepasst.', 'Ein ruhiger, gleichm\u00e4\u00dfiger Tag. Meine Lieblingssorte.'],
            es: ['Fue un buen d\u00eda, y lo sent\u00ed todo.', 'M\u00edrate hoy. Estoy brillando aqu\u00ed.', 'Hoy sali\u00f3 bien. Te guard\u00e9 lo mejor.', 'Me encant\u00f3 hoy. Esto hicimos juntos.', 'Hoy nos cuidaste bien.', 'Un d\u00eda tranquilo y constante. Mi favorito.']
        },
        hello_mixed: {
            en: ['Some ups, some bumps. That is a real day.', 'Not perfect, and that is fine. Here is your day.', 'A bit of everything today. Let us look at it together.', 'You showed up today. That counts for a lot.', 'Every day teaches me something about you. Here is today.', 'Okay, deep breath. Here is how today went.'],
            de: ['Ein paar Hochs, ein paar Huckel. So ist ein echter Tag.', 'Nicht perfekt, und das ist okay. Hier ist dein Tag.', 'Heute von allem ein bisschen. Schauen wir zusammen drauf.', 'Du warst heute dabei. Das z\u00e4hlt viel.', 'Jeder Tag zeigt mir etwas \u00fcber dich. Hier ist heute.', 'Okay, tief durchatmen. So lief heute.'],
            es: ['Algunos altos, algunos baches. As\u00ed es un d\u00eda real.', 'No fue perfecto, y est\u00e1 bien. Aqu\u00ed tienes tu d\u00eda.', 'Hoy hubo un poco de todo. Mir\u00e9moslo juntos.', 'Hoy estuviste aqu\u00ed. Eso cuenta mucho.', 'Cada d\u00eda aprendo algo de ti. Aqu\u00ed est\u00e1 hoy.', 'Vale, respira hondo. As\u00ed fue hoy.']
        },
        hello_quiet: {
            en: ['A quiet day. I am still right here.', 'Nothing logged yet today, and that is okay.', 'Some days are just for living. I kept your spot warm.', 'Quiet day on my side. Tomorrow is a fresh page.', 'No rush. I will be here whenever you are ready.', 'Today was peaceful over here.'],
            de: ['Ein ruhiger Tag. Ich bin trotzdem genau hier.', 'Heute ist noch nichts eingetragen, und das ist okay.', 'Manche Tage sind einfach zum Leben da. Ich hab deinen Platz warm gehalten.', 'Ruhiger Tag bei mir. Morgen ist eine neue Seite.', 'Keine Eile. Ich bin da, wann immer du bereit bist.', 'Heute war es friedlich hier.'],
            es: ['Un d\u00eda tranquilo. Sigo aqu\u00ed contigo.', 'Hoy a\u00fan no hay nada registrado, y est\u00e1 bien.', 'Algunos d\u00edas son solo para vivir. Te guard\u00e9 el sitio.', 'D\u00eda tranquilo por aqu\u00ed. Ma\u00f1ana es una p\u00e1gina nueva.', 'Sin prisa. Estar\u00e9 aqu\u00ed cuando quieras.', 'Hoy todo estuvo en calma por aqu\u00ed.']
        },
        take_spike: {
            en: ['{n} of {m} meals today had a likely blood sugar spike.'],
            de: ['{n} von {m} Mahlzeiten heute hatten einen wahrscheinlichen Blutzucker-Spike.'],
            es: ['{n} de {m} comidas hoy tuvieron un probable pico de az\u00facar.']
        },
        take_calm: {
            en: ['Every meal with a verdict today was a calmer pick, no likely blood sugar spike.'],
            de: ['Jede bewertete Mahlzeit heute war eine ruhigere Wahl, kein wahrscheinlicher Blutzucker-Spike.'],
            es: ['Todas las comidas con veredicto hoy fueron opciones m\u00e1s tranquilas, sin probable pico de az\u00facar.']
        },
        take_gap: {
            en: ['Your longest gap between meals was {n} hours.'],
            de: ['Deine l\u00e4ngste Pause zwischen Mahlzeiten war {n} Stunden.'],
            es: ['Tu pausa m\u00e1s larga entre comidas fue de {n} horas.']
        },
        take_move: {
            en: ['You moved {n} minutes today.'],
            de: ['Du hast dich heute {n} Minuten bewegt.'],
            es: ['Hoy te moviste {n} minutos.']
        },
        take_meals: {
            en: ['You logged {m} meals today. The ones I could not judge stay without a verdict.'],
            de: ['Du hast heute {m} Mahlzeiten eingetragen. Die ich nicht einsch\u00e4tzen konnte, bleiben ohne Urteil.'],
            es: ['Hoy registraste {m} comidas. Las que no pude valorar se quedan sin veredicto.']
        },
        take_xp: {
            en: ['You earned {n} XP today.'],
            de: ['Du hast heute {n} XP gesammelt.'],
            es: ['Hoy ganaste {n} XP.']
        },
        take_quiet: {
            en: ['Nothing logged today. A quiet day still counts.'],
            de: ['Heute nichts eingetragen. Auch ein ruhiger Tag z\u00e4hlt.'],
            es: ['Hoy no registraste nada. Un d\u00eda tranquilo tambi\u00e9n cuenta.']
        },
        nudge_first: {
            en: ['Tomorrow, snap your first meal. One photo is enough.', 'Tomorrow, tell me one thing you ate. A few words are enough.'],
            de: ['Morgen: Fotografier deine erste Mahlzeit. Ein Foto reicht.', 'Morgen: Sag mir eine Sache, die du gegessen hast. Ein paar Worte reichen.'],
            es: ['Ma\u00f1ana, haz una foto a tu primera comida. Con una basta.', 'Ma\u00f1ana, cu\u00e9ntame una cosa que comiste. Unas palabras bastan.']
        },
        nudge_spike: {
            en: ['Tomorrow, scan one snack before you buy it. Scan shows a calmer pick.', 'Tomorrow, try a calmer swap for one of today\u2019s spike meals.'],
            de: ['Morgen: Scann einen Snack, bevor du ihn kaufst. Scan zeigt dir eine ruhigere Wahl.', 'Morgen: Probier f\u00fcr eine der Spike-Mahlzeiten von heute eine ruhigere Alternative.'],
            es: ['Ma\u00f1ana, escanea un snack antes de comprarlo. Escanear te muestra una opci\u00f3n m\u00e1s tranquila.', 'Ma\u00f1ana, prueba una alternativa m\u00e1s tranquila para una de las comidas con pico de hoy.']
        },
        nudge_move: {
            en: ['Tomorrow, a five minute Move session after a meal counts.', 'Tomorrow, a short walk after lunch would make me glow.'],
            de: ['Morgen: F\u00fcnf Minuten Move nach dem Essen z\u00e4hlen schon.', 'Morgen: Ein kurzer Spaziergang nach dem Mittag l\u00e4sst mich leuchten.'],
            es: ['Ma\u00f1ana, cinco minutos de Move despu\u00e9s de comer ya cuentan.', 'Ma\u00f1ana, un paseo corto despu\u00e9s de comer me har\u00eda brillar.']
        },
        nudge_water: {
            en: ['Tomorrow, a glass of water with each meal.', 'Tomorrow, start the day with a glass of water.'],
            de: ['Morgen: Ein Glas Wasser zu jeder Mahlzeit.', 'Morgen: Starte den Tag mit einem Glas Wasser.'],
            es: ['Ma\u00f1ana, un vaso de agua con cada comida.', 'Ma\u00f1ana, empieza el d\u00eda con un vaso de agua.']
        },
        nudge_keep: {
            en: ['Tomorrow, just do it again. Same rhythm, same calm.', 'Tomorrow, keep one thing from today that felt easy.'],
            de: ['Morgen: Einfach nochmal so. Gleicher Rhythmus, gleiche Ruhe.', 'Morgen: Behalte eine Sache von heute, die leicht ging.'],
            es: ['Ma\u00f1ana, rep\u00edtelo. Mismo ritmo, misma calma.', 'Ma\u00f1ana, qu\u00e9date con una cosa de hoy que te result\u00f3 f\u00e1cil.']
        }
    };
    const UI = {
        title: { en: 'Day recap', de: 'Tagesr\u00fcckblick', es: 'Resumen del d\u00eda' },
        titleSoFar: { en: 'Your day so far', de: 'Dein Tag bisher', es: 'Tu d\u00eda hasta ahora' },
        door: { en: 'Your day', de: 'Dein Tag', es: 'Tu d\u00eda' },
        meals: { en: 'Meals', de: 'Mahlzeiten', es: 'Comidas' },
        gap: { en: 'Longest gap', de: 'L\u00e4ngste Pause', es: 'Pausa m\u00e1s larga' },
        move: { en: 'Move', de: 'Move', es: 'Move' },
        water: { en: 'Glasses of water', de: 'Gl\u00e4ser Wasser', es: 'Vasos de agua' },
        xp: { en: 'XP today', de: 'XP heute', es: 'XP hoy' },
        calm: { en: 'calmer', de: 'ruhiger', es: 'tranquilas' },
        mid: { en: 'in between', de: 'mittel', es: 'intermedias' },
        spike: { en: 'likely blood sugar spike', de: 'wahrscheinlicher Blutzucker-Spike', es: 'probable pico de az\u00facar' },
        noVerdict: { en: 'no verdict', de: 'ohne Urteil', es: 'sin veredicto' },
        takeaway: { en: 'Today', de: 'Heute', es: 'Hoy' },
        tomorrow: { en: 'For tomorrow', de: 'F\u00fcr morgen', es: 'Para ma\u00f1ana' },
        levelUp: { en: '{name} grew to level {n} today', de: '{name} ist heute auf Level {n} gewachsen', es: '{name} subi\u00f3 hoy al nivel {n}' },
        catchUp: { en: 'Catch up on today', de: 'Heute nachtragen', es: 'Ponerte al d\u00eda' },
        done: { en: 'Good night', de: 'Gute Nacht', es: 'Buenas noches' },
        ok: { en: 'Got it', de: 'Alles klar', es: 'Entendido' },
        estimate: { en: 'Estimates from what you logged, not medical advice.', de: 'Sch\u00e4tzungen aus deinen Eintr\u00e4gen, keine medizinische Beratung.', es: 'Estimaciones de lo que registraste, no es consejo m\u00e9dico.' },
        glasses: { en: '{n} glasses', de: '{n} Gl\u00e4ser', es: '{n} vasos' },
        min: { en: '{n} min', de: '{n} Min.', es: '{n} min' },
        care: { en: 'Care sent', de: 'F\u00fcrsorge gesendet', es: 'Cuidado enviado' },
        journal: { en: 'One line about today', de: 'Eine Zeile zu heute', es: 'Una l\u00ednea sobre hoy' },
        journalPh: { en: 'Optional. Type it or tap the mic.', de: 'Freiwillig. Tippen oder aufs Mikro tippen.', es: 'Opcional. Escr\u00edbela o toca el micro.' },
        journalSaved: { en: 'Saved on this phone', de: 'Auf diesem Handy gespeichert', es: 'Guardado en este m\u00f3vil' }
    };
    /* the optional journal line: one clean line, saved on this phone only (day-recap.js), newest 60 days kept */
    const JOURNAL_MAX = 140, JOURNAL_DAYS = 60;
    function journalClean(t) { return String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, JOURNAL_MAX).trim(); }
    function journalPut(store, day, text) {
        const out = {}; const src = store && typeof store === 'object' ? store : {};
        Object.keys(src).forEach(k => { if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof src[k] === 'string' && src[k]) out[k] = src[k]; });
        const t = journalClean(text); if (t) out[day] = t; else delete out[day];
        Object.keys(out).sort().reverse().slice(JOURNAL_DAYS).forEach(k => { delete out[k]; });
        return out;
    }

    const L = lang => (lang === 'de' || lang === 'es' ? lang : 'en');
    function fill(s, vars) { return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? String(vars[k]) : '')); }
    function ui(k, lang, vars) { const u = UI[k]; return u ? fill(u[L(lang)] || u.en, vars) : ''; }
    function fmt(n, lang) { const s = String(Math.round(n * 10) / 10); return L(lang) === 'en' ? s : s.replace('.', ','); }
    function pickIdx(len, rnd, avoid) {
        if (len <= 1) return 0;
        let i = Math.min(len - 1, Math.max(0, Math.floor((typeof rnd === 'function' ? rnd() : Math.random()) * len)));
        if (i === avoid) i = (i + 1) % len;
        return i;
    }

    /* view(summary, {lang, name, rnd, last}) -> everything the panel shows, already in the right language */
    function view(s, o) {
        o = o || {}; s = s || summarize({});
        const lang = L(o.lang), name = String(o.name || '').trim() || 'Misty', rnd = o.rnd, vars = { name };
        const c = s.counts || { low: 0, medium: 0, high: 0, unknown: 0 }, total = (s.meals || []).length, judged = c.low + c.medium + c.high;
        const mood = s.empty ? 'hello_quiet' : (c.high > 0 && c.high >= c.low) ? 'hello_mixed' : (judged || s.moveMin || s.gapH >= 12 || s.xp) ? 'hello_good' : 'hello_mixed';
        const pool = POOLS[mood][lang], helloIdx = pickIdx(pool.length, rnd, o.last);
        /* the ONE takeaway: the most telling true fact of the day */
        let take;
        if (s.empty) take = POOLS.take_quiet[lang][0];
        else if (c.high > 0) take = fill(POOLS.take_spike[lang][0], { n: c.high, m: total });
        else if (judged >= 2) take = POOLS.take_calm[lang][0];
        else if (s.gapH >= 12) take = fill(POOLS.take_gap[lang][0], { n: fmt(s.gapH, lang) });
        else if (s.moveMin >= 10) take = fill(POOLS.take_move[lang][0], { n: s.moveMin });
        else if (total) take = fill(POOLS.take_meals[lang][0], { m: total });
        else if (s.xp) take = fill(POOLS.take_xp[lang][0], { n: s.xp });
        else if (s.gapH) take = fill(POOLS.take_gap[lang][0], { n: fmt(s.gapH, lang) });
        else take = fill(POOLS.take_move[lang][0], { n: s.moveMin });
        /* the ONE nudge for tomorrow: the softest spot of today */
        const nk = !total ? 'nudge_first' : c.high > 0 ? 'nudge_spike' : (!s.moveMin && !s.steps) ? 'nudge_move' : (s.water < 4) ? 'nudge_water' : 'nudge_keep';
        const np = POOLS[nk][lang], nudge = np[pickIdx(np.length, rnd)];
        const stats = [];
        if (total) {
            const parts = [];
            if (c.low) parts.push(c.low + ' ' + ui('calm', lang));
            if (c.medium) parts.push(c.medium + ' ' + ui('mid', lang));
            if (c.high) parts.push(c.high + ' ' + ui('spike', lang));
            if (c.unknown) parts.push(c.unknown + ' ' + ui('noVerdict', lang));
            stats.push({ k: 'meals', n: String(total), b: ui('meals', lang), sub: parts.join(' \u00b7 '), tone: c.high ? 'warn' : c.low ? 'ok' : '' });
        }
        if (s.gapH) stats.push({ k: 'gap', n: fmt(s.gapH, lang) + ' h', b: ui('gap', lang), sub: '', tone: s.gapH >= 12 ? 'ok' : '' });
        if (s.moveMin || s.steps) stats.push({ k: 'move', n: s.moveMin ? ui('min', lang, { n: s.moveMin }) : String(s.steps), b: ui('move', lang), sub: s.moveMin && s.steps ? s.steps + ' ' + (lang === 'de' ? 'Schritte' : lang === 'es' ? 'pasos' : 'steps') : (!s.moveMin ? (lang === 'de' ? 'Schritte' : lang === 'es' ? 'pasos' : 'steps') : ''), tone: s.moveMin >= 10 ? 'ok' : '' });
        if (s.water) stats.push({ k: 'water', n: String(s.water), b: ui('water', lang), sub: '', tone: s.water >= 6 ? 'ok' : '' });
        if (s.care) stats.push({ k: 'care', n: String(s.care), b: ui('care', lang), sub: '', tone: 'ok' });
        if (s.xp) stats.push({ k: 'xp', n: (s.xp > 0 ? '+' : '') + s.xp, b: ui('xp', lang), sub: '', tone: 'ok' });
        const levelUp = s.levelTo > s.levelFrom && s.levelFrom > 0 ? ui('levelUp', lang, { name, n: s.levelTo }) : '';
        return {
            lang, title: ui(s.evening ? 'title' : 'titleSoFar', lang), hello: fill(pool[helloIdx], vars), helloIdx, mood,
            takeaway: take, nudge, stats, levelUp, catchUp: !total, estimate: ui('estimate', lang),
            labels: { takeaway: ui('takeaway', lang), tomorrow: ui('tomorrow', lang), done: ui(s.evening ? 'done' : 'ok', lang), catchUp: ui('catchUp', lang) },
            meals: (s.meals || []).slice(-6).map(m => ({ t: m.t, v: m.v }))
        };
    }

    return { POOLS, UI, verdict, bucket, summarize, view, ui, dayKey, EVENING_H, JOURNAL_MAX, journalClean, journalPut };
});
