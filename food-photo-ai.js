/* LOWiSPIKE food photo AI (Oct 19, 2026)
   Why: Scan > Snap food took the photo and then only asked "What is it?". Emmanuel: "no AI analyses it".
   Now the photo goes to our Supabase Edge Function "food-photo" (supabase/functions/food-photo/index.ts), which asks
   Google Gemini (free tier) for the dishes, portions and nutrition. The Gemini key is a Supabase secret, never in here.
   Config slot: window.LOWI_FOOD_AI_URL overrides the endpoint; default is <LOWI_CFG.url>/functions/v1/food-photo.
   Until the function is deployed with GEMINI_API_KEY, available() is false and the photo sheet keeps the old
   "What is it?" form with one small note, so nothing breaks. The pure parts (normalize, totals, title) run in node tests. */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiFoodAI = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
    'use strict';
    const KEYS = ['kcal', 'protein', 'carbs', 'sugar', 'fiber', 'fat'];
    const LIMIT = { kcal: 3000, protein: 200, carbs: 400, sugar: 300, fiber: 100, fat: 250, grams: 3000 };
    const STR = {
        en: { net: 'I can’t reach the photo check right now (no connection?). Tap Try again, or type what it is.', slow: 'The photo check took too long. Tap Try again, or type what it is.', sign_in: 'Your sign-in ran out, so I can’t check the photo. Type what it is: that always works.', limit: 'You’ve used today’s 3 photo checks. New ones at midnight. Type what it is: typed meals are unlimited.', look: 'Misty is looking…', look2: 'Still looking. Busy plates take a few seconds more…', again: 'Misty is taking another look…', retry: 'Try again', found: 'Here’s what I see', est: 'Estimates from your photo. Change the name if I got it wrong.', total: 'Total', remove: 'Remove', off: 'Photo recognition isn’t switched on yet, so type what it is.', fail: 'I couldn’t read this photo. Tap Try again, or type what it is.', busy: 'Too many photos right now. Type what it is, or try again in a few minutes.', none: 'I don’t see food in this photo. Type what it is if I’m wrong.', low: 'Not sure about this one, so check the name.', kcal: 'kcal', protein: 'Protein', carbs: 'Carbs', sugar: 'Sugar', fiber: 'Fiber', fat: 'Fat', and: 'and' },
        de: { net: 'Ich erreiche die Foto-Prüfung gerade nicht (keine Verbindung?). Tipp auf Nochmal versuchen oder schreib, was es ist.', slow: 'Die Foto-Prüfung hat zu lange gedauert. Tipp auf Nochmal versuchen oder schreib, was es ist.', sign_in: 'Deine Anmeldung ist abgelaufen, deshalb kann ich das Foto nicht prüfen. Schreib, was es ist: Das klappt immer.', limit: 'Du hast heute deine 3 Foto-Checks genutzt. Neue gibt es um Mitternacht. Schreib, was es ist: Getippte Mahlzeiten sind unbegrenzt.', look: 'Misty schaut sich das an…', look2: 'Ich schaue noch. Volle Teller dauern ein paar Sekunden länger…', again: 'Misty schaut noch einmal hin…', retry: 'Nochmal versuchen', found: 'Das sehe ich', est: 'Schätzungen aus deinem Foto. Ändere den Namen, wenn ich falsch liege.', total: 'Gesamt', remove: 'Entfernen', off: 'Die Fotoerkennung ist noch nicht eingeschaltet. Schreib bitte, was es ist.', fail: 'Ich konnte das Foto nicht lesen. Tipp auf Nochmal versuchen oder schreib, was es ist.', busy: 'Gerade zu viele Fotos. Schreib, was es ist, oder versuch es in ein paar Minuten nochmal.', none: 'Ich sehe kein Essen auf dem Foto. Schreib, was es ist, falls ich falsch liege.', low: 'Da bin ich unsicher, prüf den Namen.', kcal: 'kcal', protein: 'Eiweiß', carbs: 'Kohlenhydrate', sugar: 'Zucker', fiber: 'Ballaststoffe', fat: 'Fett', and: 'und' },
        es: { net: 'No puedo conectar con el análisis de fotos ahora (¿sin conexión?). Toca Reintentar o escribe qué es.', slow: 'El análisis de la foto tardó demasiado. Toca Reintentar o escribe qué es.', sign_in: 'Tu sesión caducó, así que no puedo analizar la foto. Escribe qué es: eso siempre funciona.', limit: 'Ya usaste tus 3 análisis de foto de hoy. Vuelven a medianoche. Escribe qué es: las comidas escritas no tienen límite.', look: 'Misty está mirando…', look2: 'Sigo mirando. Los platos llenos tardan unos segundos más…', again: 'Misty mira otra vez…', retry: 'Reintentar', found: 'Esto es lo que veo', est: 'Estimaciones de tu foto. Cambia el nombre si me equivoqué.', total: 'Total', remove: 'Quitar', off: 'El reconocimiento de fotos aún no está activado, así que escribe qué es.', fail: 'No pude leer esta foto. Toca Reintentar o escribe qué es.', busy: 'Demasiadas fotos ahora mismo. Escribe qué es o inténtalo en unos minutos.', none: 'No veo comida en esta foto. Escribe qué es si me equivoco.', low: 'No estoy seguro, revisa el nombre.', kcal: 'kcal', protein: 'Proteína', carbs: 'Carbohidratos', sugar: 'Azúcar', fiber: 'Fibra', fat: 'Grasa', and: 'y' }
    };
    const lang = () => { try { const l = root.LowiLang && root.LowiLang.get ? root.LowiLang.get() : (root.document && document.documentElement.lang) || 'en'; return STR[l] ? l : 'en'; } catch (e) { return 'en'; } };
    const wnm = s => { try { const B = (typeof window !== 'undefined' ? window : globalThis).LowiBirthCompanion; return s && B && B.withName ? B.withName(s) : s; } catch (e) { return s; } }; /* BH-045: the user's own companion name, never the default "Misty" */
    const t = (k, l) => wnm((STR[l || lang()] || STR.en)[k] || STR.en[k] || k);
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

    function num(v, max) {
        const n = typeof v === 'string' ? parseFloat(v) : v;
        if (typeof n !== 'number' || !isFinite(n) || n < 0) return 0;
        return Math.min(max, Math.round(n * 10) / 10);
    }
    // Model answer -> safe shape. Unknown or wild values never reach the meal log.
    function normalize(raw) {
        raw = raw && typeof raw === 'object' ? raw : {};
        const dishes = (Array.isArray(raw.dishes) ? raw.dishes : []).map(d => {
            d = d && typeof d === 'object' ? d : {};
            const name = String(d.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
            if (!name) return null;
            return {
                name,
                portion: String(d.portion || '').replace(/\s+/g, ' ').trim().slice(0, 40),
                grams: num(d.grams, LIMIT.grams),
                kcal: Math.round(num(d.kcal != null ? d.kcal : d.calories, LIMIT.kcal)),
                protein: num(d.protein_g != null ? d.protein_g : d.protein, LIMIT.protein),
                carbs: num(d.carbs_g != null ? d.carbs_g : d.carbs, LIMIT.carbs),
                sugar: num(d.sugar_g != null ? d.sugar_g : d.sugar, LIMIT.sugar),
                fiber: num(d.fiber_g != null ? d.fiber_g : d.fiber, LIMIT.fiber),
                fat: num(d.fat_g != null ? d.fat_g : d.fat, LIMIT.fat),
                count: Math.max(1, Math.min(50, Math.round(+d.count || 1)))
            };
        }).filter(Boolean).slice(0, 8);
        const conf = ['low', 'medium', 'high'].includes(raw.confidence) ? raw.confidence : 'medium';
        return { isFood: raw.is_food !== false && dishes.length > 0, dishes, confidence: conf, note: String(raw.note || '').trim().slice(0, 160),
            // Master Knowledge v3 verdict block. Kept raw here; meal-result validates it (LowiFoodKnowledge.parse) and it can
            // only make the app's own verdict stricter, never looser.
            verdictBlock: raw.lowispike && typeof raw.lowispike === 'object' && !Array.isArray(raw.lowispike) ? raw.lowispike : null };
    }
    function totals(dishes) {
        const out = {};
        for (const k of KEYS) out[k] = Math.round((dishes || []).reduce((s, d) => s + (+d[k] || 0), 0) * 10) / 10;
        out.kcal = Math.round(out.kcal);
        return out;
    }
    function title(dishes, l) {
        const names = (dishes || []).map(d => d.name).filter(Boolean);
        if (!names.length) return '';
        const s = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' ' + t('and', l) + ' ' + names[names.length - 1];
        return s.slice(0, 100);
    }

    function endpoint() {
        if (root.LOWI_FOOD_AI_URL) return String(root.LOWI_FOOD_AI_URL);
        const cfg = root.LOWI_CFG || {};
        return cfg.url ? String(cfg.url).replace(/\/$/, '') + '/functions/v1/food-photo' : '';
    }
    function headers(token) {
        const cfg = root.LOWI_CFG || {}, h = { 'Content-Type': 'application/json' };
        if (cfg.key) h.apikey = cfg.key;
        h.Authorization = 'Bearer ' + (token || cfg.key || '');
        return h;
    }
    function timed(ms) {
        const c = typeof AbortController === 'function' ? new AbortController() : null;
        const id = c ? setTimeout(() => c.abort(), ms) : 0;
        return { signal: c ? c.signal : undefined, done: () => clearTimeout(id) };
    }
    /* Oct 22: one try may take TRY_MS (server budget 26 s + sign-in check + upload); a slow, failed or unreachable try is
       repeated once on its own (failed reads are handed back by the server). The photo sent is the original, downscaled to
       AI_PX on the long side as JPEG (iPhone HEIC is decoded by Safari first); if that can't be made, the sheet photo is sent. */
    const TRY_MS = 35000, AI_PX = 1024, AUTO_RETRY = ['slow', 'net', 'failed'];
    function prep(dataURL, file) {
        if (!file || typeof document === 'undefined' || typeof Image !== 'function' || !root.URL || !URL.createObjectURL) return Promise.resolve(dataURL);
        return new Promise(ok => {
            let u = '';
            try { u = URL.createObjectURL(file); } catch (e) { ok(dataURL); return; }
            const im = new Image();
            const done = v => { clearTimeout(to); try { URL.revokeObjectURL(u); } catch (e) {} ok(v || dataURL); };
            const to = setTimeout(() => done(''), 5000);
            im.onload = () => {
                try {
                    const w = im.naturalWidth, h = im.naturalHeight;
                    if (!w || !h) return done('');
                    const k = Math.min(1, AI_PX / Math.max(w, h)), c = document.createElement('canvas');
                    c.width = Math.round(w * k); c.height = Math.round(h * k);
                    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
                    const out = c.toDataURL('image/jpeg', 0.8);
                    c.width = 0; c.height = 0;
                    done(/^data:image\/jpeg;base64,/.test(out) && out.length < 1400000 ? out : '');
                } catch (e) { done(''); }
            };
            im.onerror = () => done('');
            im.src = u;
        });
    }
    const zone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } };
    const snap = () => root.LowiMealSnap || null;
    let probe = null, probeAt = 0, probeWhy = '';
    const why = () => probeWhy;
    let nameOn = false; // Oct 23: the deployed function answers name reads (GET says name:true); the old one only reads photos
    // One cheap GET per session: is the function deployed and does it have its key? A miss is re-checked after 10 min.
    function available() {
        const url = endpoint();
        if (!url || typeof fetch !== 'function') return Promise.resolve(false);
        if (probe && (Date.now() - probeAt < 600000)) return probe;
        probeAt = Date.now();
        const tm = timed(6000);
        /* Oct 20 food audit: a phone without a connection (or a probe that times out) used to show "Photo recognition isn't
           switched on yet" and kept that answer for 10 minutes. Now the reason is kept (probeWhy: 'net' | 'off') and a
           network miss is asked again on the next photo. */
        probe = fetch(url, { method: 'GET', headers: headers(), signal: tm.signal, cache: 'no-store' })
            .then(r => r.ok ? r.json() : null).then(j => { probeWhy = 'off'; nameOn = !!(j && j.ok && j.configured && j.name === true); return !!(j && j.ok && j.configured); }).catch(() => { probeWhy = 'net'; return false; })
            .then(v => { tm.done(); if (v) { probeAt = Infinity; probeWhy = ''; } else if (probeWhy === 'net') probeAt = 0; return v; });
        return probe;
    }
    /* a session refresh that never answers must not keep "Looking at your plate…" spinning: 8 s, then no token */
    function token() {
        return Promise.race([tokenNow(), new Promise(ok => setTimeout(() => ok(''), 8000))]);
    }
    async function tokenNow() {
        try {
            const cx = root.LOWI_CLOUD_X;
            if (!cx || !cx.client) return '';
            const sb = await cx.client();
            let s = (await sb.auth.getSession()).data.session;
            if (!s && sb.auth.signInAnonymously) s = (await sb.auth.signInAnonymously(root.lowiAnonOpts ? root.lowiAnonOpts() : undefined)).data.session;   /* test browsers sign in as test accounts (index.html lowiAnonOpts) */
            return (s && s.access_token) || '';
        } catch (e) { return ''; }
    }
    // Oct 19: 3 photo checks per person per day (Snap food + Community), counted by the server. This asks how many are left
    // today (needs the user's token) and keeps it in LowiMealSnap for the sheets. Resolves {limit,left} or null.
    async function allowance() {
        const url = endpoint();
        if (!url || typeof fetch !== 'function') return null;
        const tok = await token(); if (!tok) return null;
        const tm = timed(6000);
        try {
            const r = await fetch(url + '?tz=' + encodeURIComponent(zone()), { method: 'GET', headers: headers(tok), signal: tm.signal, cache: 'no-store' });
            const j = r.ok ? await r.json() : null;
            if (j && typeof j.left === 'number') { if (snap()) snap().setLeft(j.left, j.limit); return { limit: j.limit, left: j.left }; }
        } catch (e) {} finally { tm.done(); }
        return null;
    }
    // Photo (data URL) -> {dishes,total,...}. Throws Error with .code: off | sign_in | limit | busy | net | slow | failed.
    async function analyse(dataURL, opts) {
        opts = opts || {};
        const url = endpoint();
        if (!url) { const e = new Error('off'); e.code = 'off'; throw e; }
        const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(String(dataURL || ''));
        if (!m) { const e = new Error('failed'); e.code = 'failed'; throw e; }
        /* Oct 22 (photo check "took too long" on a normal iPhone photo): the sign-in wait (up to 8 s) used to run inside the
           30 s clock, and the server itself may take up to 26 s (Gemini 6-21 s measured), so the phone gave up just before
           the answer came. Now the token comes first and the request alone gets TRY_MS. */
        const tok = opts.token != null ? opts.token : await token();
        const tm = timed(opts.timeout || +root.LOWI_FOOD_AI_TRY_MS || TRY_MS); // the knob is for the simulator check only
        let r;
        try {
            r = await fetch(url, { method: 'POST', headers: headers(tok), signal: tm.signal, body: JSON.stringify({ image: m[2], mime: m[1], lang: opts.lang || lang(), tz: zone() }) });
        } catch (err) { tm.done(); const code = tm.signal && tm.signal.aborted ? 'slow' : 'net'; const e = new Error(code); e.code = code; throw e; }
        tm.done();
        let j = null;
        try { j = await r.json(); } catch (err) { j = null; }
        if (j && typeof j.left === 'number' && snap()) snap().setLeft(j.left, j.limit);
        if (!r.ok) {
            const code = r.status === 504 ? 'slow' : r.status === 503 || r.status === 404 ? 'off' : r.status === 401 ? 'sign_in' : r.status === 429 ? (j && j.error === 'limit' ? 'limit' : 'busy') : 'failed';
            if (code === 'limit' && snap()) snap().setLeft(0, j && j.limit);
            if (code === 'off') { probe = Promise.resolve(false); probeAt = Date.now(); }
            const e = new Error(code); e.code = code; throw e;
        }
        const out = normalize(j);
        out.total = totals(out.dishes);
        out.model = j && j.model ? String(j.model) : '';
        return out;
    }

    /* Oct 23 (Emmanuel: "if the app knows the name, it should still give an analysis"): a product or food name -> the same
       normalized answer as a photo read ({isFood, dishes, confidence, note, lowispike}). It never uses a photo read. Only when
       the deployed function says it can (GET name:true); else it throws 'off' and the scanner keeps its own name rules.
       The app re-rates the dish names with its own engine and keeps the stricter verdict, like the photo read. */
    async function analyseName(name, opts) {
        opts = opts || {};
        const q = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
        if (q.length < 2) { const e = new Error('failed'); e.code = 'failed'; throw e; }
        const url = endpoint();
        if (!url || !(await available()) || !nameOn) { const e = new Error('off'); e.code = 'off'; throw e; }
        const tok = opts.token != null ? opts.token : await token();
        const tm = timed(opts.timeout || 15000);
        let r;
        try {
            r = await fetch(url, { method: 'POST', headers: headers(tok), signal: tm.signal, body: JSON.stringify({ text: q, lang: opts.lang || lang(), tz: zone() }) });
        } catch (err) { tm.done(); const code = tm.signal && tm.signal.aborted ? 'slow' : 'net'; const e = new Error(code); e.code = code; throw e; }
        tm.done();
        let j = null;
        try { j = await r.json(); } catch (err) { j = null; }
        if (!r.ok) { const code = r.status === 401 ? 'sign_in' : r.status === 429 ? 'busy' : r.status === 503 || r.status === 404 ? 'off' : 'failed'; const e = new Error(code); e.code = code; throw e; }
        const out = normalize(j);
        if (out.confidence === 'high') out.confidence = 'medium'; // a name alone is never high
        out.total = totals(out.dishes);
        out.mode = 'name';
        return out;
    }

    function rowsHTML(dishes, l) {
        const chip = (k, v) => '<span class="fai-m fai-' + k + '"><b>' + (k === 'kcal' ? Math.round(v) : Math.round(v) + ' g') + '</b><small>' + esc(t(k, l)) + '</small></span>';
        const tot = totals(dishes);
        return dishes.map((d, i) => '<li class="fai-dish" data-i="' + i + '"><div class="fai-dh"><b>' + esc(d.name) + '</b>' + (d.portion ? '<small>' + esc(d.portion) + '</small>' : '') +
            '<button type="button" class="fai-x" data-fai-rm="' + i + '" aria-label="' + esc(t('remove', l) + ' ' + d.name) + '">×</button></div>' +
            '<div class="fai-ms">' + KEYS.slice(0, 5).map(k => chip(k, d[k])).join('') + '</div></li>').join('') +
            (dishes.length > 1 ? '<li class="fai-dish fai-total"><div class="fai-dh"><b>' + esc(t('total', l)) + '</b></div><div class="fai-ms">' + KEYS.slice(0, 5).map(k => chip(k, tot[k])).join('') + '</div></li>' : '');
    }
    // Fills a photo sheet: box = <div class="sp-ai">, form = the meal form with name="title".
    // Writes hidden macro inputs into the form so the normal Log as meal saves them. Never throws.
    function mount(box, form, dataURL, opts) {
        opts = opts || {};
        if (!box || !form) return Promise.resolve(null);
        const l = opts.lang || lang();
        const titleIn = form.querySelector('[name="title"]');
        let dishes = [], typed = false;
        if (titleIn) titleIn.addEventListener('input', () => { typed = true; }, { once: true });
        const setHidden = () => {
            const tot = totals(dishes);
            for (const k of KEYS) {
                let el = form.querySelector('input[type="hidden"][name="' + k + '"]');
                if (!el) { el = document.createElement('input'); el.type = 'hidden'; el.name = k; form.appendChild(el); }
                el.value = dishes.length ? String(tot[k]) : '';
            }
            if (titleIn && !typed) titleIn.value = title(dishes, l);
        };
        const say = (cls, msg) => { box.className = 'sp-ai fai ' + cls; box.innerHTML = '<p class="fai-msg" role="status">' + esc(msg) + '</p>'; };
        const paint = (res) => {
            box.className = 'sp-ai fai fai-done';
            box.innerHTML = '<p class="fai-h">' + esc(t('found', l)) + '</p><ul class="fai-list">' + rowsHTML(dishes, l) + '</ul>' +
                '<p class="fai-msg">' + esc(res.confidence === 'low' ? t('low', l) : t('est', l)) + (res.note ? ' ' + esc(res.note) : '') + '</p>';
        };
        /* Oct 22: "Misty is looking…" while it runs (after 9 s: "Still looking…"), one automatic retry, and on a miss a
           Try again button that uses the same photo, so nobody has to retake it. */
        let slowT = 0, aiURL = null, busy = false;
        const wait = (k) => {
            clearTimeout(slowT);
            box.className = 'sp-ai fai fai-wait';
            box.innerHTML = '<p class="fai-msg" role="status" aria-live="polite"><i class="fai-spin" aria-hidden="true"></i><span class="fai-wt">' + esc(t(k, l)) + '</span></p>';
            slowT = setTimeout(() => { const w = box.querySelector('.fai-wt'); if (w && box.classList.contains('fai-wait')) w.textContent = t('look2', l); }, 9000);
        };
        const sayRetry = (msg) => {
            clearTimeout(slowT);
            box.className = 'sp-ai fai fai-err fai-can-retry';
            box.innerHTML = '<p class="fai-msg" role="status">' + esc(msg) + '</p><button type="button" class="fai-retry" data-fai-retry>' + esc(t('retry', l)) + '</button>';
        };
        box.addEventListener('click', ev => {
            const b = ev.target.closest && ev.target.closest('[data-fai-retry]');
            if (!b || busy) return;
            ev.preventDefault();
            run();
        });
        const MS = snap();
        const q = MS && MS.left ? MS.left() : null;
        if (q && q.left === 0) { say('fai-err fai-limit', t('limit', l)); return Promise.resolve(null); }
        const once = (n) => (aiURL ? Promise.resolve(aiURL) : prep(dataURL, opts.file).then(u => (aiURL = u)))
            .then(u => analyse(u, { lang: l }))
            .catch(err => {
                const c = err && err.code;
                if (n < 1 && AUTO_RETRY.includes(c) && box.isConnected) { wait('again'); return new Promise(ok => setTimeout(ok, 800)).then(() => once(n + 1)); }
                throw err;
            });
        const run = () => {
            busy = true;
            wait('look');
            return go().then(v => { busy = false; clearTimeout(slowT); return v; }, () => { busy = false; clearTimeout(slowT); sayRetry(t('fail', l)); return null; });
        };
        const go = () => available().then(on => {
            if (!on) { if (why() === 'net') sayRetry(t('net', l)); else say('fai-off', t('off', l)); return null; }
            return once(0).then(res => {
                if (!box.isConnected) return res;
                if (!res.isFood) { say('fai-none', t('none', l)); return res; }
                dishes = res.dishes.slice();
                /* Oct 21: the result screen is LowiMealResult (meal-result.js): spike verdict first, then each food (tap to
                   fix it), drinks, the XP. Fixes are estimated on the device, so they never use another photo check.
                   Without it (old cache), the plain list below still works. */
                const MR = root.LowiMealResult;
                let ctl = null;
                if (MR && MR.mount) { try { ctl = MR.mount(box, form, { dishes, lang: l, low: res.confidence === 'low', note: res.note, verdictBlock: res.verdictBlock, photo: dataURL, db: opts.db, dbReady: opts.dbReady }); } catch (e) { console.warn(e); ctl = null; } }
                if (!ctl) { setHidden(); paint(res); }
                /* Oct 19: the read is remembered by photo (sharing never asks the AI again); under it: checks left today,
                   (Oct 22: sharing moved to "Share to Community" after Log as meal, meal-journal.js) and the optional mealtime reminder offer. */
                if (MS) {
                    try {
                        MS.remember(dataURL, { dishes: res.dishes, name: title(res.dishes, l) });
                        const host = document.createElement('div'); host.className = 'ms-host';
                        form.parentNode.insertBefore(host, form.nextSibling);
                        const getMeal = () => { const all = ctl ? ctl.all() : dishes; return MS.meal({ dishes: all, name: (titleIn && titleIn.value.trim()) || title(all, l) }); };
                        /* Oct 22 (meal-journal.js): the estimate as the user leaves it (after edits) is saved with the meal by spirit.js finishMeal */
                        form.__lowiMeal = () => { const m = getMeal(); return m ? Object.assign(m, { note: res.note || '', low: res.confidence === 'low' }) : null; };
                        MS.snapExtras(host, form, dataURL, getMeal);
                    } catch (e) { console.warn(e); }
                }
                if (!ctl) box.addEventListener('click', ev => {
                    const b = ev.target.closest && ev.target.closest('[data-fai-rm]');
                    if (!b) return;
                    ev.preventDefault();
                    dishes.splice(+b.dataset.faiRm, 1);
                    setHidden();
                    if (dishes.length) paint(res); else say('fai-none', t('none', l));
                });
                return res;
            }, err => {
                const c = err && err.code;
                if (!box.isConnected) return null;
                if (['limit', 'off', 'sign_in'].includes(c)) say('fai-err', t(c, l));
                else sayRetry(['busy', 'net', 'slow'].includes(c) ? t(c, l) : t('fail', l));
                return null;
            });
        });
        return run();
    }
    return { KEYS, normalize, totals, title, endpoint, available, allowance, analyse, analyseName, nameReady: () => nameOn, mount, prep, TRY_MS, AI_PX, strings: STR, _reset() { probe = null; probeAt = 0; probeWhy = ''; nameOn = false; }, _why: why };
});
