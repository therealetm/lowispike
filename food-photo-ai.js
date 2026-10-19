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
        en: { limit: 'You’ve used today’s 3 photo checks. New ones at midnight. Type what it is: typed meals are unlimited.', look: 'Looking at your plate…', found: 'Here’s what I see', est: 'Estimates from your photo. Change the name if I got it wrong.', total: 'Total', remove: 'Remove', off: 'Photo recognition isn’t switched on yet, so type what it is.', fail: 'I couldn’t read this photo, so type what it is.', busy: 'Too many photos right now. Type what it is, or try again in a few minutes.', none: 'I don’t see food in this photo. Type what it is if I’m wrong.', low: 'Not sure about this one, so check the name.', kcal: 'kcal', protein: 'Protein', carbs: 'Carbs', sugar: 'Sugar', fiber: 'Fiber', fat: 'Fat', and: 'and' },
        de: { limit: 'Du hast heute deine 3 Foto-Checks genutzt. Neue gibt es um Mitternacht. Schreib, was es ist: Getippte Mahlzeiten sind unbegrenzt.', look: 'Ich schaue mir deinen Teller an…', found: 'Das sehe ich', est: 'Schätzungen aus deinem Foto. Ändere den Namen, wenn ich falsch liege.', total: 'Gesamt', remove: 'Entfernen', off: 'Die Fotoerkennung ist noch nicht eingeschaltet. Schreib bitte, was es ist.', fail: 'Ich konnte das Foto nicht lesen. Schreib bitte, was es ist.', busy: 'Gerade zu viele Fotos. Schreib, was es ist, oder versuch es in ein paar Minuten nochmal.', none: 'Ich sehe kein Essen auf dem Foto. Schreib, was es ist, falls ich falsch liege.', low: 'Da bin ich unsicher, prüf den Namen.', kcal: 'kcal', protein: 'Eiweiß', carbs: 'Kohlenhydrate', sugar: 'Zucker', fiber: 'Ballaststoffe', fat: 'Fett', and: 'und' },
        es: { limit: 'Ya usaste tus 3 análisis de foto de hoy. Vuelven a medianoche. Escribe qué es: las comidas escritas no tienen límite.', look: 'Mirando tu plato…', found: 'Esto es lo que veo', est: 'Estimaciones de tu foto. Cambia el nombre si me equivoqué.', total: 'Total', remove: 'Quitar', off: 'El reconocimiento de fotos aún no está activado, así que escribe qué es.', fail: 'No pude leer esta foto, así que escribe qué es.', busy: 'Demasiadas fotos ahora mismo. Escribe qué es o inténtalo en unos minutos.', none: 'No veo comida en esta foto. Escribe qué es si me equivoco.', low: 'No estoy seguro, revisa el nombre.', kcal: 'kcal', protein: 'Proteína', carbs: 'Carbohidratos', sugar: 'Azúcar', fiber: 'Fibra', fat: 'Grasa', and: 'y' }
    };
    const lang = () => { try { const l = root.LowiLang && root.LowiLang.get ? root.LowiLang.get() : (root.document && document.documentElement.lang) || 'en'; return STR[l] ? l : 'en'; } catch (e) { return 'en'; } };
    const t = (k, l) => (STR[l || lang()] || STR.en)[k] || STR.en[k] || k;
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
                fat: num(d.fat_g != null ? d.fat_g : d.fat, LIMIT.fat)
            };
        }).filter(Boolean).slice(0, 8);
        const conf = ['low', 'medium', 'high'].includes(raw.confidence) ? raw.confidence : 'medium';
        return { isFood: raw.is_food !== false && dishes.length > 0, dishes, confidence: conf, note: String(raw.note || '').trim().slice(0, 160) };
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
    const zone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } };
    const snap = () => root.LowiMealSnap || null;
    let probe = null, probeAt = 0;
    // One cheap GET per session: is the function deployed and does it have its key? A miss is re-checked after 10 min.
    function available() {
        const url = endpoint();
        if (!url || typeof fetch !== 'function') return Promise.resolve(false);
        if (probe && (Date.now() - probeAt < 600000)) return probe;
        probeAt = Date.now();
        const tm = timed(6000);
        probe = fetch(url, { method: 'GET', headers: headers(), signal: tm.signal, cache: 'no-store' })
            .then(r => r.ok ? r.json() : null).then(j => !!(j && j.ok && j.configured)).catch(() => false)
            .then(v => { tm.done(); if (v) probeAt = Infinity; return v; });
        return probe;
    }
    async function token() {
        try {
            const cx = root.LOWI_CLOUD_X;
            if (!cx || !cx.client) return '';
            const sb = await cx.client();
            let s = (await sb.auth.getSession()).data.session;
            if (!s && sb.auth.signInAnonymously) s = (await sb.auth.signInAnonymously()).data.session;
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
    // Photo (data URL) -> {dishes,total,...}. Throws Error with .code: off | sign_in | limit | busy | failed.
    async function analyse(dataURL, opts) {
        opts = opts || {};
        const url = endpoint();
        if (!url) { const e = new Error('off'); e.code = 'off'; throw e; }
        const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(String(dataURL || ''));
        if (!m) { const e = new Error('failed'); e.code = 'failed'; throw e; }
        const tm = timed(opts.timeout || 30000);
        let r;
        try {
            r = await fetch(url, { method: 'POST', headers: headers(opts.token != null ? opts.token : await token()), signal: tm.signal, body: JSON.stringify({ image: m[2], mime: m[1], lang: opts.lang || lang(), tz: zone() }) });
        } catch (err) { tm.done(); const e = new Error('failed'); e.code = 'failed'; throw e; }
        tm.done();
        let j = null;
        try { j = await r.json(); } catch (err) { j = null; }
        if (j && typeof j.left === 'number' && snap()) snap().setLeft(j.left, j.limit);
        if (!r.ok) {
            const code = r.status === 503 || r.status === 404 ? 'off' : r.status === 401 ? 'sign_in' : r.status === 429 ? (j && j.error === 'limit' ? 'limit' : 'busy') : 'failed';
            if (code === 'limit' && snap()) snap().setLeft(0, j && j.limit);
            if (code === 'off') { probe = Promise.resolve(false); probeAt = Date.now(); }
            const e = new Error(code); e.code = code; throw e;
        }
        const out = normalize(j);
        out.total = totals(out.dishes);
        out.model = j && j.model ? String(j.model) : '';
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
        box.className = 'sp-ai fai fai-wait';
        box.innerHTML = '<p class="fai-msg" role="status"><i class="fai-spin" aria-hidden="true"></i>' + esc(t('look', l)) + '</p>';
        const MS = snap();
        const q = MS && MS.left ? MS.left() : null;
        if (q && q.left === 0) { say('fai-err fai-limit', t('limit', l)); return Promise.resolve(null); }
        return available().then(on => {
            if (!on) { say('fai-off', t('off', l)); return null; }
            return analyse(dataURL, { lang: l }).then(res => {
                if (!box.isConnected) return res;
                if (!res.isFood) { say('fai-none', t('none', l)); return res; }
                dishes = res.dishes.slice();
                setHidden(); paint(res);
                /* Oct 19: the read is remembered by photo (sharing never asks the AI again); under it: checks left today,
                   "Also share to Community" (opt-in, after Log as meal) and the optional mealtime reminder offer. */
                if (MS) {
                    try {
                        MS.remember(dataURL, { dishes: res.dishes, name: title(res.dishes, l) });
                        const host = document.createElement('div'); host.className = 'ms-host';
                        form.parentNode.insertBefore(host, form.nextSibling);
                        MS.snapExtras(host, form, dataURL, () => MS.meal({ dishes, name: (titleIn && titleIn.value.trim()) || title(dishes, l) }));
                    } catch (e) { console.warn(e); }
                }
                box.addEventListener('click', ev => {
                    const b = ev.target.closest && ev.target.closest('[data-fai-rm]');
                    if (!b) return;
                    ev.preventDefault();
                    dishes.splice(+b.dataset.faiRm, 1);
                    setHidden();
                    if (dishes.length) paint(res); else say('fai-none', t('none', l));
                });
                return res;
            }, err => {
                say('fai-err', err && err.code === 'limit' ? t('limit', l) : err && err.code === 'busy' ? t('busy', l) : err && err.code === 'off' ? t('off', l) : t('fail', l));
                return null;
            });
        }).catch(() => { say('fai-err', t('fail', l)); return null; });
    }
    return { KEYS, normalize, totals, title, endpoint, available, allowance, analyse, mount, strings: STR, _reset() { probe = null; probeAt = 0; } };
});
