/* Oct 25 2026 (Emmanuel: "when you send a picture of your food into the community, that also actually analyzes it with the AI,
   gives you all the estimates, creates everything for you, you don't even have to type anything"). Task: food photos posted to
   Community get analyzed automatically.

   A photo picked in the Chat/Circles composer is read by the same meal-photo AI as Snap food (LowiFoodAI.analyse, the server
   counts it against the same 3 photo checks a day). The read starts as soon as the photo is picked, so it usually finishes while
   the caption is typed; Send waits for it (never longer than WAIT_MS) and then posts:
   - food  -> a meal post (🍽 <meal-<id>.jpg>#l=<lvl>&n=<name>, community-chat-core mealBody) plus messages.meal (meal-detail-core
              fromLog shape), so the spike label opens the details and Add to kitchen can read the foods;
   - not food, no checks left, offline, switched off, slow or failed -> the plain 📷 photo exactly as before, with one line
              saying why. The post is never blocked or lost.
   Nothing is logged to the meal journal and nothing goes to For You from here: only the post carries the read.
   The name, verdict and numbers come from the app's own engine (meal-result formValues: the AI verdict can only make it
   stricter), the same as the Snap food result screen. Estimates are labelled as estimates; no blood-sugar promises. */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiChatMeal = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
    'use strict';
    const WAIT_MS = 45000; // the AI try itself stops at LowiFoodAI.TRY_MS (35 s) plus the sign-in wait; this is the last guard
    const STR = {
        en: {
            look: 'Misty is reading your meal…', lookSub: 'Estimates come from the photo. You don’t need to type anything.',
            wait: 'Sending as soon as Misty has read your meal…',
            est: 'Estimate from the photo. It posts with the foods and numbers.',
            plainBar: 'It goes as a normal photo.', posted: 'Posted as a normal photo. {why}',
            notFood: 'No food spotted.', limit: 'No photo checks left today (new ones at midnight).',
            net: 'No connection for the photo check.', off: 'The photo check is switched off right now.',
            sign_in: 'Sign in so meal photos can be checked.', slow: 'The photo check took too long.',
            failed: 'The photo check didn’t work this time.'
        },
        de: {
            look: 'Misty liest dein Essen…', lookSub: 'Die Schätzung kommt vom Foto. Du musst nichts tippen.',
            wait: 'Wird gesendet, sobald Misty dein Essen gelesen hat…',
            est: 'Schätzung vom Foto. Wird mit Zutaten und Zahlen gepostet.',
            plainBar: 'Es geht als normales Foto raus.', posted: 'Als normales Foto gepostet. {why}',
            notFood: 'Kein Essen erkannt.', limit: 'Heute keine Foto-Checks mehr (neue um Mitternacht).',
            net: 'Keine Verbindung für den Foto-Check.', off: 'Der Foto-Check ist gerade aus.',
            sign_in: 'Melde dich an, damit Essensfotos geprüft werden.', slow: 'Der Foto-Check hat zu lange gedauert.',
            failed: 'Der Foto-Check hat diesmal nicht geklappt.'
        },
        es: {
            look: 'Misty está leyendo tu comida…', lookSub: 'La estimación sale de la foto. No tienes que escribir nada.',
            wait: 'Se envía en cuanto Misty lea tu comida…',
            est: 'Estimación por la foto. Se publica con los alimentos y los números.',
            plainBar: 'Se envía como foto normal.', posted: 'Publicada como foto normal. {why}',
            notFood: 'No se ve comida.', limit: 'Hoy no quedan análisis de foto (vuelven a medianoche).',
            net: 'Sin conexión para el análisis de foto.', off: 'El análisis de foto está apagado ahora.',
            sign_in: 'Inicia sesión para que se analicen las fotos de comida.', slow: 'El análisis de foto tardó demasiado.',
            failed: 'El análisis de foto no funcionó esta vez.'
        }
    };
    const LV = { en: { low: 'Low spike', mid: 'Medium spike', high: 'Likely spike' }, de: { low: 'Kleiner Spike', mid: 'Mittlerer Spike', high: 'Wahrscheinlich Spike' }, es: { low: 'Pico bajo', mid: 'Pico medio', high: 'Pico probable' } };
    const CODES = ['notFood', 'limit', 'net', 'off', 'sign_in', 'slow', 'failed'];
    function lang(l) {
        l = String(l || (root.LowiLang && root.LowiLang.get && root.LowiLang.get()) || (root.document && root.document.documentElement && root.document.documentElement.lang) || 'en').slice(0, 2).toLowerCase();
        return STR[l] ? l : 'en';
    }
    function t(k, l, v) { l = lang(l); let s = (STR[l] && STR[l][k]) || STR.en[k] || ''; for (const x in (v || {})) s = s.split('{' + x + '}').join(v[x]); return s; }
    const code = c => c === 'busy' ? 'failed' : CODES.includes(c) ? c : 'failed';
    const lvlKey = x => x === 'medium' || x === 'mid' ? 'mid' : x === 'high' ? 'high' : x === 'low' ? 'low' : '';
    function label(lvl, l) {
        const MD = root.LowiMealDetailCore, k = lvlKey(lvl) || 'mid';
        try { if (MD && MD.t) { const s = MD.t(k, lang(l)); if (s) return s; } } catch (e) {}
        return LV[lang(l)][k];
    }

    /* An AI read (LowiFoodAI.analyse shape) -> {name, lvl, detail}, or null when it is not food. Pure apart from the app's own
       engines on root (LowiMealResult, LowiMealSnap, LowiMealDetailCore, LowiFoodAI), each optional. */
    function fromRead(res, l) {
        if (!res || res.isFood === false || !Array.isArray(res.dishes)) return null;
        const dishes = res.dishes.filter(d => d && typeof d === 'object' && String(d.name || '').trim());
        if (!dishes.length) return null;
        const FA = root.LowiFoodAI, MS = root.LowiMealSnap, MR = root.LowiMealResult, MD = root.LowiMealDetailCore;
        let total = res.total && typeof res.total === 'object' ? res.total : null;
        if (!total && FA && FA.totals) total = FA.totals(dishes);
        let name = '', lvl = '';
        if (MR && MR.formValues && MR.clean) {
            try {
                const v = MR.formValues(dishes.map(MR.clean).filter(x => x && x.name), [], lang(l), res.verdictBlock || null);
                name = v.title || ''; lvl = lvlKey(v.lvl);
                if (v.macros) total = v.macros;
            } catch (e) { name = ''; lvl = ''; }
        }
        if (!name) name = FA && FA.title ? FA.title(dishes, lang(l)) : dishes.map(d => d.name).join(', ');
        if (!lvl) { let bs = null; try { bs = MS && MS.bloodSugar && total ? MS.bloodSugar(total, dishes) : null; } catch (e) { bs = null; } lvl = lvlKey(bs && bs.level) || 'mid'; }
        name = String(name).replace(/\s+/g, ' ').trim().slice(0, 60);
        if (!name) return null;
        let detail = null;
        if (MD && MD.fromLog) {
            try {
                detail = MD.fromLog({ t: name, ai: { name, items: dishes, total: total || undefined, note: String(res.note || '').slice(0, 160), low: res.confidence === 'low' } }, lvl);
                if (detail && MD.clean) detail = MD.clean(detail);
            } catch (e) { detail = null; }
        }
        return { name, lvl, detail: detail || null };
    }

    /* ---------- one read per picked photo ---------- */
    const jobs = new Map(); // photo id -> {state, promise, listeners}
    function blobURL(blob) {
        return new Promise(ok => {
            try { const r = new root.FileReader(); r.onload = () => ok(String(r.result || '')); r.onerror = () => ok(''); r.readAsDataURL(blob); } catch (e) { ok(''); }
        });
    }
    async function photoData(blob) {
        const FA = root.LowiFoodAI;
        let u = '';
        try { u = FA && FA.prep ? await FA.prep('', blob) : ''; } catch (e) { u = ''; }
        if (!/^data:image\/[a-z]+;base64,/.test(u)) u = await blobURL(blob);
        return u;
    }
    function finish(job, st) { job.state = st; for (const f of job.listeners) { try { f(st); } catch (e) {} } return st; }
    async function run(job, blob, l) {
        const FA = root.LowiFoodAI, MS = root.LowiMealSnap;
        if (!FA || !FA.analyse) return finish(job, { phase: 'plain', code: 'off' });
        if (root.navigator && root.navigator.onLine === false) return finish(job, { phase: 'plain', code: 'net' });
        const q = MS && MS.left ? MS.left() : null;
        if (q && q.left === 0) return finish(job, { phase: 'plain', code: 'limit' }); // the server would say no: do not spend a call
        try {
            if (FA.available && !(await FA.available())) return finish(job, { phase: 'plain', code: (FA._why && FA._why()) === 'net' ? 'net' : 'off' });
            const data = await photoData(blob);
            if (!data) return finish(job, { phase: 'plain', code: 'failed' });
            const res = await FA.analyse(data, { lang: lang(l) });
            const meal = fromRead(res, l);
            return finish(job, meal ? { phase: 'meal', meal, low: res.confidence === 'low' } : { phase: 'plain', code: 'notFood' });
        } catch (e) {
            return finish(job, { phase: 'plain', code: code(e && e.code) });
        }
    }
    // Start reading the photo with this id (idempotent). onChange(state) is called when the read is done.
    function start(id, blob, opts) {
        opts = opts || {};
        if (!id || !blob) return null;
        let job = jobs.get(id);
        if (!job) {
            job = { state: { phase: 'look' }, listeners: new Set() };
            jobs.set(id, job);
            if (jobs.size > 6) jobs.delete(jobs.keys().next().value);
            job.promise = run(job, blob, opts.lang);
        }
        if (typeof opts.onChange === 'function') job.listeners.add(opts.onChange);
        return job.state;
    }
    function state(id) { const j = jobs.get(id); return j ? j.state : null; }
    /* For Send: the finished read, starting one if none ran (or the last one failed for lack of a connection), never waiting longer
       than ms. A read that is still running past ms posts the photo plain ('slow'). */
    async function settle(id, blob, opts) {
        opts = opts || {};
        let j = jobs.get(id);
        if (j && j.state.phase === 'plain' && j.state.code === 'net' && !(root.navigator && root.navigator.onLine === false)) { jobs.delete(id); j = null; }
        if (!j) { start(id, blob, opts); j = jobs.get(id); }
        if (!j) return { phase: 'plain', code: 'failed' };
        if (j.state.phase !== 'look') return j.state;
        const ms = opts.ms || WAIT_MS;
        let tid = 0;
        const guard = new Promise(ok => { tid = setTimeout(() => ok({ phase: 'plain', code: 'slow' }), ms); });
        return Promise.race([j.promise, guard]).then(st => { clearTimeout(tid); return st; });
    }
    function forget(id) { jobs.delete(id); }

    /* ---------- words for the composer ---------- */
    // The line under "Photo ready" in the composer: [bold, small]
    function bar(st, l) {
        if (!st || st.phase === 'look') return [t('look', l), t('lookSub', l)];
        if (st.phase === 'meal') return [st.meal.name + ' · ' + label(st.meal.lvl, l), t('est', l)];
        return [t(code(st.code), l), t('plainBar', l)];
    }
    // After a plain post: one line saying why it was not read; nothing for a photo without food.
    function postedNote(st, l) {
        if (!st || st.phase !== 'plain' || st.code === 'notFood') return '';
        return t('posted', l, { why: t(code(st.code), l) });
    }
    return { WAIT_MS, STR, t, lang, label, fromRead, start, state, settle, forget, bar, postedNote, _jobs: jobs };
});
