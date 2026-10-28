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
            en: ['That was a good day, and I felt every bit of it.', 'Look at you today. I am glowing over here.', 'Today went well. I saved the best bits for you.', 'I loved today. Here is what we did together.', 'You took good care of us today.', 'You logged your day. That helps me a lot.'],
            de: ['Das war ein guter Tag, und ich hab jedes bisschen gesp\u00fcrt.', 'Schau dich an heute. Ich leuchte hier richtig.', 'Heute lief gut. Ich hab dir das Beste aufgehoben.', 'Heute war sch\u00f6n. Das haben wir zusammen geschafft.', 'Du hast heute gut auf uns aufgepasst.', 'Du hast deinen Tag eingetragen. Das hilft mir sehr.'],
            es: ['Fue un buen d\u00eda, y lo sent\u00ed todo.', 'M\u00edrate hoy. Estoy brillando aqu\u00ed.', 'Hoy sali\u00f3 bien. Te guard\u00e9 lo mejor.', 'Me encant\u00f3 hoy. Esto hicimos juntos.', 'Hoy nos cuidaste bien.', 'Registraste tu d\u00eda. Eso me ayuda mucho.']
        },
        hello_mixed: {
            en: ['Some ups, some bumps. That is a real day.', 'Not perfect, and that is fine. Here is your day.', 'A bit of everything today. Let us look at it together.', 'You showed up today. That counts for a lot.', 'Every day teaches me something about you. Here is today.', 'Okay, deep breath. Here is how today went.'],
            de: ['Ein paar Hochs, ein paar Huckel. So ist ein echter Tag.', 'Nicht perfekt, und das ist okay. Hier ist dein Tag.', 'Heute von allem ein bisschen. Schauen wir zusammen drauf.', 'Du warst heute dabei. Das z\u00e4hlt viel.', 'Jeder Tag zeigt mir etwas \u00fcber dich. Hier ist heute.', 'Okay, tief durchatmen. So lief heute.'],
            es: ['Algunos altos, algunos baches. As\u00ed es un d\u00eda real.', 'No fue perfecto, y est\u00e1 bien. Aqu\u00ed tienes tu d\u00eda.', 'Hoy hubo un poco de todo. Mir\u00e9moslo juntos.', 'Hoy estuviste aqu\u00ed. Eso cuenta mucho.', 'Cada d\u00eda aprendo algo de ti. Aqu\u00ed est\u00e1 hoy.', 'Vale, respira hondo. As\u00ed fue hoy.']
        },
        hello_quiet: {
            en: ['Not much logged today. I am still right here.', 'Nothing logged yet today, and that is okay.', 'Some days are just for living. I kept your spot warm.', 'Quiet day on my side. Tomorrow is a fresh page.', 'No rush. I will be here whenever you are ready.', 'Today was peaceful over here.'],
            de: ['Heute wenig eingetragen. Ich bin trotzdem genau hier.', 'Heute ist noch nichts eingetragen, und das ist okay.', 'Manche Tage sind einfach zum Leben da. Ich hab deinen Platz warm gehalten.', 'Heute war wenig los. Morgen ist eine neue Seite.', 'Keine Eile. Ich bin da, wann immer du bereit bist.', 'Heute war es friedlich hier.'],
            es: ['Hoy registraste poco. Sigo aqu\u00ed contigo.', 'Hoy a\u00fan no hay nada registrado, y est\u00e1 bien.', 'Algunos d\u00edas son solo para vivir. Te guard\u00e9 el sitio.', 'D\u00eda tranquilo por aqu\u00ed. Ma\u00f1ana es una p\u00e1gina nueva.', 'Sin prisa. Estar\u00e9 aqu\u00ed cuando quieras.', 'Hoy todo estuvo en calma por aqu\u00ed.']
        },
        take_spike: {
            en: ['For {n} of your {m} meals today, the app estimates a likely blood sugar spike (from the food, like a scan). Nothing was measured.'],
            de: ['Bei {n} von {m} Mahlzeiten heute sch\u00e4tzt die App einen wahrscheinlichen Blutzucker-Spike (aus dem Essen, wie beim Scan). Gemessen wurde nichts.'],
            es: ['En {n} de tus {m} comidas de hoy, la app estima un probable pico de az\u00facar (por la comida, como al escanear). No se midi\u00f3 nada.']
        },
        take_calm: {
            en: ['For your {j} rated meals today, the app expects only a small blood sugar rise, no likely blood sugar spike. That is an estimate from the food, not a measurement.'],
            de: ['F\u00fcr deine {j} bewerteten Mahlzeiten heute erwartet die App nur einen kleinen Blutzuckeranstieg, keinen wahrscheinlichen Blutzucker-Spike. Das ist eine Sch\u00e4tzung aus dem Essen, kein Messwert.'],
            es: ['Para tus {j} comidas valoradas de hoy, la app espera solo una subida peque\u00f1a del az\u00facar, sin probable pico de az\u00facar. Es una estimaci\u00f3n por la comida, no una medici\u00f3n.']
        },
        take_gap: {
            en: ['Your longest time without food was {n} hours, counted from your logged meals and meal break.'],
            de: ['Am l\u00e4ngsten hast du {n} Stunden nichts gegessen, gerechnet aus deinen eingetragenen Mahlzeiten und der Essenspause.'],
            es: ['Lo m\u00e1s largo sin comer fueron {n} horas, contado con tus comidas registradas y tu pausa.']
        },
        take_move: {
            en: ['You moved {n} minutes today, counted in the app\u2019s Move.'],
            de: ['Du hast dich heute {n} Minuten bewegt, gez\u00e4hlt mit Bewegen in der App.'],
            es: ['Hoy te moviste {n} minutos, contados con Move en la app.']
        },
        take_water: {
            en: ['Today you logged water {n} times. No meals logged yet, so nothing to rate.'],
            de: ['Du hast heute {n}-mal Wasser eingetragen. Mahlzeiten sind noch keine eingetragen, also gibt es nichts zu bewerten.'],
            es: ['Hoy registraste agua {n} veces. A\u00fan no hay comidas registradas, as\u00ed que no hay nada que valorar.']
        },
        take_meals: {
            en: ['You logged {m} meals today. The app could rate {j} of them.'],
            de: ['Du hast heute {m} Mahlzeiten eingetragen. {j} davon konnte die App bewerten.'],
            es: ['Hoy registraste {m} comidas. La app pudo valorar {j}.']
        },
        take_xp: {
            en: ['You earned {n} points (XP) today. They make {name} grow.'],
            de: ['Du hast heute {n} Punkte (XP) gesammelt. Damit w\u00e4chst {name}.'],
            es: ['Hoy ganaste {n} puntos (XP). Con ellos crece {name}.']
        },
        take_quiet: {
            en: ['Nothing logged today, so there is nothing to rate yet.'],
            de: ['Heute ist nichts eingetragen, also gibt es noch nichts zu bewerten.'],
            es: ['Hoy no registraste nada, as\u00ed que a\u00fan no hay nada que valorar.']
        },
        nudge_first: {
            en: ['Tomorrow, snap your first meal. One photo is enough.', 'Tomorrow, tell me one thing you ate. A few words are enough.'],
            de: ['Morgen: Fotografier deine erste Mahlzeit. Ein Foto reicht.', 'Morgen: Sag mir eine Sache, die du gegessen hast. Ein paar Worte reichen.'],
            es: ['Ma\u00f1ana, haz una foto a tu primera comida. Con una basta.', 'Ma\u00f1ana, cu\u00e9ntame una cosa que comiste. Unas palabras bastan.']
        },
        nudge_spike: {
            en: ['Tomorrow, scan one snack before you buy it. The scan shows if a spike is likely.', 'Tomorrow, swap one of today\u2019s spike meals for one the app rates better.'],
            de: ['Morgen: Scann einen Snack, bevor du ihn kaufst. Der Scan zeigt dir, ob ein Spike wahrscheinlich ist.', 'Morgen: Tausch eine der Spike-Mahlzeiten von heute gegen eine, die die App besser bewertet.'],
            es: ['Ma\u00f1ana, escanea un snack antes de comprarlo. El escaneo te dice si un pico es probable.', 'Ma\u00f1ana, cambia una de las comidas con pico de hoy por una que la app valore mejor.']
        },
        nudge_move: {
            en: ['Tomorrow, move for 5 minutes after a meal. It counts in Move.', 'Tomorrow, take a 10 minute walk after lunch. A short walk after eating can make the sugar rise flatter.'],
            de: ['Morgen: Beweg dich 5 Minuten nach dem Essen. Das z\u00e4hlt schon bei Bewegen.', 'Morgen: Geh nach dem Mittagessen 10 Minuten spazieren. Ein kurzer Spaziergang nach dem Essen kann den Zuckeranstieg danach flacher machen.'],
            es: ['Ma\u00f1ana, mu\u00e9vete 5 minutos despu\u00e9s de comer. Ya cuenta en Move.', 'Ma\u00f1ana, camina 10 minutos despu\u00e9s de comer. Un paseo corto despu\u00e9s de comer puede hacer m\u00e1s suave la subida del az\u00facar.']
        },
        nudge_water: {
            en: ['Tomorrow, a glass of water with each meal.', 'Tomorrow, start the day with a glass of water.'],
            de: ['Morgen: Ein Glas Wasser zu jeder Mahlzeit.', 'Morgen: Starte den Tag mit einem Glas Wasser.'],
            es: ['Ma\u00f1ana, un vaso de agua con cada comida.', 'Ma\u00f1ana, empieza el d\u00eda con un vaso de agua.']
        },
        nudge_keep: {
            en: ['Tomorrow, just do it again: log your meals the same way.', 'Tomorrow, keep one thing from today that felt easy.'],
            de: ['Morgen: Einfach nochmal so. Trag deine Mahlzeiten genauso ein.', 'Morgen: Behalte eine Sache von heute, die leicht ging.'],
            es: ['Ma\u00f1ana, rep\u00edtelo: registra tus comidas igual.', 'Ma\u00f1ana, qu\u00e9date con una cosa de hoy que te result\u00f3 f\u00e1cil.']
        }
    };
    const UI = {
        title: { en: 'Day recap', de: 'Tagesr\u00fcckblick', es: 'Resumen del d\u00eda' },
        titleSoFar: { en: 'Your day so far', de: 'Dein Tag bisher', es: 'Tu d\u00eda hasta ahora' },
        door: { en: 'Your day', de: 'Dein Tag', es: 'Tu d\u00eda' },
        meals: { en: 'Meals logged', de: 'Mahlzeiten eingetragen', es: 'Comidas registradas' },
        gap: { en: 'Longest time without food', de: 'L\u00e4ngste Zeit ohne Essen', es: 'Lo m\u00e1s largo sin comer' },
        gapSub: { en: 'from your logged meals and meal break', de: 'aus deinen Mahlzeiten und der Essenspause', es: 'seg\u00fan tus comidas y tu pausa' },
        hours: { en: '{n} hrs', de: '{n} Std.', es: '{n} h' },
        move: { en: 'Movement', de: 'Bewegung', es: 'Movimiento' },
        moveSub: { en: 'counted in Move', de: 'gez\u00e4hlt mit Bewegen', es: 'contado con Move' },
        steps: { en: 'Steps', de: 'Schritte', es: 'Pasos' },
        stepsN: { en: '{n} steps', de: '{n} Schritte', es: '{n} pasos' },
        water: { en: 'Glasses of water', de: 'Gl\u00e4ser Wasser', es: 'Vasos de agua' },
        waterSub: { en: 'how often you logged water today', de: 'so oft hast du heute Wasser eingetragen', es: 'las veces que registraste agua hoy' },
        xp: { en: 'Points (XP) today', de: 'Punkte (XP) heute', es: 'Puntos (XP) hoy' },
        xpSub: { en: 'make {name} grow', de: 'damit w\u00e4chst {name}', es: 'con ellos crece {name}' },
        xpMeal: { en: 'meals', de: 'Essen', es: 'comidas' }, xpWater: { en: 'water', de: 'Wasser', es: 'agua' }, xpMove: { en: 'movement', de: 'Bewegung', es: 'movimiento' }, xpGap: { en: 'meal break', de: 'Essenspause', es: 'pausa' }, xpOther: { en: 'other', de: 'Sonstiges', es: 'otros' },
        calm: { en: 'small rise expected', de: 'kleiner Anstieg erwartet', es: 'subida peque\u00f1a esperada' },
        mid: { en: 'medium rise expected', de: 'mittlerer Anstieg erwartet', es: 'subida media esperada' },
        spike: { en: 'likely blood sugar spike', de: 'wahrscheinlicher Blutzucker-Spike', es: 'probable pico de az\u00facar' },
        noVerdict: { en: 'not rated', de: 'nicht bewertet', es: 'sin valorar' },
        takeaway: { en: 'Today', de: 'Heute', es: 'Hoy' },
        tomorrow: { en: 'For tomorrow', de: 'F\u00fcr morgen', es: 'Para ma\u00f1ana' },
        levelUp: { en: '{name} grew to level {n} today', de: '{name} ist heute auf Level {n} gewachsen', es: '{name} subi\u00f3 hoy al nivel {n}' },
        catchUp: { en: 'Catch up on today', de: 'Heute nachtragen', es: 'Ponerte al d\u00eda' },
        done: { en: 'Good night', de: 'Gute Nacht', es: 'Buenas noches' },
        ok: { en: 'Got it', de: 'Alles klar', es: 'Entendido' },
        estimate: { en: 'Everything here comes from what you logged in the app. Your blood sugar is not measured: meal ratings are the app\u2019s estimate from the food, like a scan. Not medical advice.', de: 'Alles hier stammt aus deinen Eintr\u00e4gen in der App. Dein Blutzucker wird nicht gemessen: Die Bewertungen sind Sch\u00e4tzungen der App aus dem Essen, wie beim Scan. Keine medizinische Beratung.', es: 'Todo viene de lo que registraste en la app. Tu az\u00facar no se mide: las valoraciones son estimaciones de la app por la comida, como al escanear. No es consejo m\u00e9dico.' },
        glasses: { en: '{n} glasses', de: '{n} Gl\u00e4ser', es: '{n} vasos' },
        min: { en: '{n} min', de: '{n} Min.', es: '{n} min' },
        care: { en: 'Care sent to friends', de: 'Mal F\u00fcrsorge an Freunde gesendet', es: 'Cuidados enviados a amigos' },
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
    const VTAG = { low: 'calm', medium: 'mid', high: 'spike', unknown: 'noVerdict' };
    function hhmm(ts) { const d = new Date(Number(ts) || 0); return ts ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : ''; }
    function num0(n, lang) { const s = String(Math.round(n)); return s.replace(/\B(?=(\d{3})+(?!\d))/g, L(lang) === 'en' ? ',' : '.'); }
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
        else if (judged >= 2) take = fill(POOLS.take_calm[lang][0], { j: judged });
        else if (s.gapH >= 12) take = fill(POOLS.take_gap[lang][0], { n: fmt(s.gapH, lang) });
        else if (s.moveMin >= 10) take = fill(POOLS.take_move[lang][0], { n: s.moveMin });
        else if (total) take = fill(POOLS.take_meals[lang][0], { m: total, j: judged });
        else if (s.xp) take = fill(POOLS.take_xp[lang][0], { n: s.xp, name });
        else if (s.gapH) take = fill(POOLS.take_gap[lang][0], { n: fmt(s.gapH, lang) });
        /* Oct 28: this used to fall through to "Du hast dich heute 0 Minuten bewegt" on a water-only day */
        else if (s.moveMin) take = fill(POOLS.take_move[lang][0], { n: s.moveMin });
        else if (s.water) take = fill(POOLS.take_water[lang][0], { n: s.water });
        else take = POOLS.take_quiet[lang][0];
        /* the ONE nudge for tomorrow: the softest spot of today */
        const nk = !total ? 'nudge_first' : c.high > 0 ? 'nudge_spike' : (!s.moveMin && !s.steps) ? 'nudge_move' : (s.water < 4) ? 'nudge_water' : 'nudge_keep';
        const np = POOLS[nk][lang], nudge = np[pickIdx(np.length, rnd)];
        const stats = [];
        if (total) {
            const parts = [];
            if (c.low) parts.push(c.low + ' \u00d7 ' + ui('calm', lang));
            if (c.medium) parts.push(c.medium + ' \u00d7 ' + ui('mid', lang));
            if (c.high) parts.push(c.high + ' \u00d7 ' + ui('spike', lang));
            if (c.unknown) parts.push(c.unknown + ' \u00d7 ' + ui('noVerdict', lang));
            stats.push({ k: 'meals', n: String(total), b: ui('meals', lang), sub: parts.join(' \u00b7 '), tone: c.high ? 'warn' : c.low ? 'ok' : '' });
        }
        if (s.gapH) stats.push({ k: 'gap', n: ui('hours', lang, { n: fmt(s.gapH, lang) }), b: ui('gap', lang), sub: ui('gapSub', lang), tone: s.gapH >= 12 ? 'ok' : '' });
        if (s.moveMin) stats.push({ k: 'move', n: ui('min', lang, { n: s.moveMin }), b: ui('move', lang), sub: ui('moveSub', lang) + (s.steps ? ' \u00b7 ' + ui('stepsN', lang, { n: num0(s.steps, lang) }) : ''), tone: s.moveMin >= 10 ? 'ok' : '' });
        else if (s.steps) stats.push({ k: 'move', n: num0(s.steps, lang), b: ui('steps', lang), sub: '', tone: '' });
        if (s.water) stats.push({ k: 'water', n: String(s.water), b: ui('water', lang), sub: ui('waterSub', lang), tone: s.water >= 6 ? 'ok' : '' });
        if (s.care) stats.push({ k: 'care', n: String(s.care), b: ui('care', lang), sub: '', tone: 'ok' });
        if (s.xp) {
            /* where the points came from, so "+85" is not a mystery number */
            const by = s.xpBy || {}, from = [['meal', 'xpMeal'], ['water', 'xpWater'], ['move', 'xpMove'], ['gap', 'xpGap'], ['other', 'xpOther']].filter(([k]) => by[k] > 0).map(([k, l]) => ui(l, lang) + ' +' + by[k]);
            stats.push({ k: 'xp', n: (s.xp > 0 ? '+' : '') + s.xp, b: ui('xp', lang), sub: ui('xpSub', lang, { name }) + (from.length ? ': ' + from.join(', ') : ''), tone: 'ok' });
        }
        const levelUp = s.levelTo > s.levelFrom && s.levelFrom > 0 ? ui('levelUp', lang, { name, n: s.levelTo }) : '';
        return {
            lang, title: ui(s.evening ? 'title' : 'titleSoFar', lang), hello: fill(pool[helloIdx], vars), helloIdx, mood,
            takeaway: take, nudge, stats, levelUp, catchUp: !total, estimate: ui('estimate', lang),
            labels: { takeaway: ui('takeaway', lang), tomorrow: ui('tomorrow', lang), done: ui(s.evening ? 'done' : 'ok', lang), catchUp: ui('catchUp', lang) },
            meals: (s.meals || []).slice(-6).map(m => ({ t: m.t, v: m.v, time: hhmm(m.ts), tag: ui(VTAG[m.v] || 'noVerdict', lang) })),
            legendSpike: ui('spike', lang)
        };
    }

    return { POOLS, UI, verdict, bucket, summarize, view, ui, dayKey, EVENING_H, JOURNAL_MAX, journalClean, journalPut };
});
