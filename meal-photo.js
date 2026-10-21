/* LOWiSPIKE meal photos: three a day, sharing, blood sugar estimate, mealtime reminders (Oct 19, 2026)
   Emmanuel: "people only get to unlock three meals and pictures a day, so that we don't reach that limit" and: share a
   meal photo with its name, ingredients, nutrition and how it likely hits your blood sugar underneath, without typing.
   - The count (3 photo checks a day, Snap food and Community together) is enforced by the food-photo function; this
     file only shows it (allowance cache filled by LowiFoodAI).
   - A read is remembered by photo, so sharing it (or adding the same photo to a post) never asks the AI again.
   - bloodSugar() is an estimate from the meal's carbs, fiber, sugar, protein and fat: it never says "measured".
   - Reminders are off until the user turns them on. Typed meals are never limited by any of this.
   Pure parts (bloodSugar, meal, clean, due, cardHTML) run in node tests (tests/meal-photo.test.cjs). */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiMealSnap = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
    'use strict';
    const DAY_MAX = 3, KEYS = ['kcal', 'protein', 'carbs', 'sugar', 'fiber', 'fat'];
    const CAP = { kcal: 6000, protein: 400, carbs: 800, sugar: 600, fiber: 200, fat: 500 };
    const STR = {
        en: {
            left: '{n} of {max} photo checks left today', none: 'No photo checks left today. New ones at midnight. Typing what you ate always works.',
            shareT: 'Also share to Community', shareS: 'Your photo with the meal name, ingredients, nutrition and blood sugar estimate. No typing.',
            remT: 'Remind me to snap my meals', remS: 'A nudge at {times}. Change it in Reminders.',
            read: 'Read this meal with AI', readFree: 'Add the meal details (already read)', reading: 'Reading your meal…', removeMeal: 'Remove meal details',
            readFail: 'I couldn’t read this photo. You can still post it.',
            ing: 'Estimated ingredients', bsL: 'Likely blood sugar response', low: 'Gentle rise', mid: 'Moderate rise', high: 'Likely spike',
            note: 'Estimated from the photo’s nutrition, not measured. Your own response can differ.', noteS: 'Estimate from the photo, not measured.',
            foot: 'Shared: the photo, the meal name, the estimated ingredients and nutrition, and the blood sugar estimate. Nothing else about your health or goals.',
            kcal: 'kcal', protein: 'protein', carbs: 'carbs', sugar: 'sugar', fiber: 'fiber', fat: 'fat',
            remH: 'Meal photo reminders', remSub: 'A nudge at mealtimes to snap your plate. Skipped when that meal is already logged or no photo checks are left.',
            on: 'On', off: 'Off', b: 'Breakfast', l: 'Lunch', d: 'Dinner',
            nudge: '{meal} time. Snap your plate and I’ll read it: {n} of {max} photo checks left today.', nudgeU: '{meal} time. Snap your plate and I’ll read it.',
            go: 'Snap my meal', later: 'Later'
        },
        de: {
            left: 'Heute noch {n} von {max} Foto-Checks', none: 'Heute keine Foto-Checks mehr. Neue gibt es um Mitternacht. Schreiben, was du gegessen hast, geht immer.',
            shareT: 'Auch in der Community teilen', shareS: 'Dein Foto mit Name, Zutaten, Nährwerten und Blutzucker-Schätzung. Ohne Tippen.',
            remT: 'Erinnere mich, meine Mahlzeiten zu fotografieren', remS: 'Ein Hinweis um {times}. Änderbar unter Erinnerungen.',
            read: 'Mahlzeit mit KI lesen', readFree: 'Mahlzeit-Details hinzufügen (schon gelesen)', reading: 'Ich lese deine Mahlzeit…', removeMeal: 'Mahlzeit-Details entfernen',
            readFail: 'Ich konnte das Foto nicht lesen. Du kannst es trotzdem posten.',
            ing: 'Geschätzte Zutaten', bsL: 'Wahrscheinliche Blutzucker-Reaktion', low: 'Sanfter Anstieg', mid: 'Mittlerer Anstieg', high: 'Wahrscheinlich ein Spike',
            note: 'Geschätzt aus den Nährwerten des Fotos, nicht gemessen. Deine eigene Reaktion kann anders sein.', noteS: 'Schätzung aus dem Foto, nicht gemessen.',
            foot: 'Geteilt werden: das Foto, der Name der Mahlzeit, die geschätzten Zutaten und Nährwerte und die Blutzucker-Schätzung. Sonst nichts über deine Gesundheit oder Ziele.',
            kcal: 'kcal', protein: 'Eiweiß', carbs: 'Kohlenh.', sugar: 'Zucker', fiber: 'Ballastst.', fat: 'Fett',
            remH: 'Erinnerungen für Essensfotos', remSub: 'Ein Hinweis zu den Mahlzeiten, deinen Teller zu fotografieren. Entfällt, wenn die Mahlzeit schon eingetragen ist oder keine Foto-Checks mehr übrig sind.',
            on: 'An', off: 'Aus', b: 'Frühstück', l: 'Mittagessen', d: 'Abendessen',
            nudge: 'Zeit fürs {meal}. Fotografier deinen Teller, ich lese ihn: heute noch {n} von {max} Foto-Checks.', nudgeU: 'Zeit fürs {meal}. Fotografier deinen Teller, ich lese ihn.',
            go: 'Mahlzeit fotografieren', later: 'Später'
        },
        es: {
            left: 'Te quedan {n} de {max} análisis de foto hoy', left1: 'Te queda 1 de {max} análisis de foto hoy', none: 'Hoy no te quedan análisis de foto. Vuelven a medianoche. Escribir lo que comiste siempre funciona.',
            shareT: 'Compartir también en la Comunidad', shareS: 'Tu foto con el nombre, ingredientes, nutrición y estimación de azúcar en sangre. Sin escribir.',
            remT: 'Recuérdame fotografiar mis comidas', remS: 'Un aviso a las {times}. Cámbialo en Avisos.',
            read: 'Analizar esta comida con IA', readFree: 'Añadir los detalles de la comida (ya analizada)', reading: 'Analizando tu comida…', removeMeal: 'Quitar detalles de la comida',
            readFail: 'No he podido analizar esta foto. Aun así puedes publicarla.',
            ing: 'Ingredientes estimados', bsL: 'Respuesta probable de azúcar en sangre', low: 'Subida suave', mid: 'Subida moderada', high: 'Probable pico de azúcar',
            note: 'Estimado a partir de la nutrición de la foto, no medido. Tu respuesta puede ser distinta.', noteS: 'Estimación de la foto, no medida.',
            foot: 'Se comparte: la foto, el nombre de la comida, los ingredientes y la nutrición estimados y la estimación de azúcar en sangre. Nada más sobre tu salud u objetivos.',
            kcal: 'kcal', protein: 'proteína', carbs: 'carbohidratos', sugar: 'azúcar', fiber: 'fibra', fat: 'grasa',
            remH: 'Recordatorios de fotos de comida', remSub: 'Un aviso a la hora de comer para fotografiar tu plato. Se salta si ya registraste esa comida o no te quedan análisis.',
            on: 'Sí', off: 'No', b: 'Desayuno', l: 'Almuerzo', d: 'Cena',
            nudge: '{meal}: fotografía tu plato y lo analizo. Te quedan {n} de {max} análisis hoy.', nudge1: '{meal}: fotografía tu plato y lo analizo. Te queda 1 de {max} análisis hoy.', nudgeU: '{meal}: fotografía tu plato y lo analizo.',
            go: 'Fotografiar mi comida', later: 'Luego'
        }
    };
    const lang = () => { try { const l = root.LowiLang && root.LowiLang.get ? root.LowiLang.get() : (root.document && document.documentElement.lang) || 'en'; return STR[l] ? l : 'en'; } catch (e) { return 'en'; } };
    const t = (k, l, v) => { let s = (STR[l || lang()] || STR.en)[k] || STR.en[k] || k; if (v) for (const x in v) s = s.split('{' + x + '}').join(String(v[x])); return s; };
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
    const num = (v, max) => { const n = typeof v === 'string' ? parseFloat(v) : v; return typeof n === 'number' && isFinite(n) && n > 0 ? Math.min(max, Math.round(n * 10) / 10) : 0; };
    const dayKey = (d) => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

    /* ---------- blood sugar estimate (never a measurement) ---------- */
    const REFINED = /(white rice|\brice\b|\breis\b|arroz|bread|brot|\bpan\b|toast|bagel|baguette|pasta|spaghetti|noodle|nudel|fideo|potato|kartoffel|patata|pommes|fries|pizza|cake|kuchen|pastel|cookie|keks|galleta|donut|croissant|pastry|cereal|cornflakes|candy|dessert|pancake|waffle|tortilla|couscous|fufu|ugali|cassava|yuca|maniok|ice cream|helado|\beis\b)/i;
    const DRINK = /(soda|\bcolas?\b|\bcoke\b|\bpepsi\b|\bfanta\b|\bsprite\b|\blimo\b|\benergy\b|red ?bull|juice|saft|zumo|jugo|lemonade|limonade|smoothie|milkshake|refresco|energy drink|iced tea|eistee)/i; // \b: not choCOLAte (Oct 20 food audit)
    // load = net carbs (refined count fully, others 0.8) + some of the sugar, softened by protein, fat and fiber.
    // Whole-meal levels: under 20 gentle, 20-39 moderate, 40+ likely spike; a sugary drink is a likely spike.
    function bloodSugar(total, dishes) {
        const x = total || {};
        const carbs = num(x.carbs, CAP.carbs), fiber = num(x.fiber, CAP.fiber), sugar = num(x.sugar, CAP.sugar), protein = num(x.protein, CAP.protein), fat = num(x.fat, CAP.fat);
        const names = (dishes || []).map(d => (d && (d.name || '')) + ' ' + (d && d.portion || '')).join(' ');
        const net = Math.max(0, carbs - fiber);
        const load = net * (REFINED.test(names) ? 1 : 0.8) + 0.3 * Math.min(sugar, net);
        const damp = Math.min(load * 0.4, protein * 0.4 + fat * 0.1 + fiber * 0.8);
        const score = Math.round(load - damp);
        const drink = DRINK.test(names) && sugar >= 20;
        return { level: drink || score >= 40 ? 'high' : score >= 20 ? 'mid' : 'low', score, net: Math.round(net) };
    }

    /* ---------- the shareable meal (what a post carries in meta.meal) ---------- */
    function totalOf(dishes) {
        const o = {}; for (const k of KEYS) o[k] = Math.round((dishes || []).reduce((s, d) => s + num(d && d[k], CAP[k]), 0) * 10) / 10;
        o.kcal = Math.round(o.kcal); return o;
    }
    function nameOf(items) {
        const n = items.map(d => d.name).filter(Boolean);
        return n.length <= 1 ? (n[0] || '') : n.slice(0, -1).join(', ') + ' & ' + n[n.length - 1];
    }
    // src: {dishes, total?, name?} from LowiFoodAI -> {v, name, items:[{name, portion}], total, bs}
    function meal(src) {
        src = src && typeof src === 'object' ? src : {};
        const raw = Array.isArray(src.dishes) ? src.dishes : Array.isArray(src.items) ? src.items : [];
        const items = raw.map(d => d && typeof d === 'object' ? { name: str(d.name, 60), portion: str(d.portion, 40) } : null).filter(d => d && d.name).slice(0, 8);
        const tot = src.total && typeof src.total === 'object' ? src.total : totalOf(raw);
        const total = {}; for (const k of KEYS) total[k] = k === 'kcal' ? Math.round(num(tot[k], CAP.kcal)) : num(tot[k], CAP[k]);
        const name = str(src.name, 100) || str(nameOf(items), 100);
        if (!name && !items.length) return null;
        return { v: 1, name, items, total, bs: bloodSugar(total, items).level };
    }
    // A meal from someone else's post: same shape, rebuilt from scratch (numbers clamped, bs recomputed, never trusted).
    const clean = (m) => (m && typeof m === 'object' ? meal({ name: m.name, items: m.items, total: m.total }) : null);

    function cardHTML(m, opts) {
        opts = opts || {};
        m = clean(m); if (!m) return '';
        const l = opts.lang || lang(), bs = bloodSugar(m.total, m.items);
        const ing = m.items.map(d => esc(d.name) + (d.portion ? ' <small>(' + esc(d.portion) + ')</small>' : '')).join(', ');
        const chip = k => '<span class="ms-n ms-' + k + '"><b>' + (k === 'kcal' ? Math.round(m.total[k]) : Math.round(m.total[k]) + ' g') + '</b> ' + esc(t(k, l)) + '</span>';
        return '<div class="ms-card' + (opts.compact ? ' ms-compact' : '') + '" data-noi18n>' +
            (opts.noName ? '' : '<b class="ms-name">' + esc(m.name) + '</b>') +
            (ing ? '<p class="ms-ing"><span>' + esc(t('ing', l)) + ':</span> ' + ing + '</p>' : '') +
            '<div class="ms-nut">' + KEYS.map(chip).join('') + '</div>' +
            '<p class="ms-bs ms-bs-' + bs.level + '"><i aria-hidden="true"></i><span>' + esc(t('bsL', l)) + ': <b>' + esc(t(bs.level, l)) + '</b></span></p>' +
            '<p class="ms-note">' + esc(t(opts.compact ? 'noteS' : 'note', l)) + '</p></div>';
    }

    /* ---------- one read per photo: remember it so sharing never asks the AI again ---------- */
    function hash(s) { s = String(s || ''); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + s.length; }
    const reads = new Map();
    const SS = 'lowi.mealsnap.reads';
    function remember(photo, src) {
        const m = src && src.v === 1 ? clean(src) : meal(src);
        if (!photo || !m) return null;
        const k = hash(photo); reads.delete(k); reads.set(k, m);
        while (reads.size > 12) reads.delete(reads.keys().next().value);
        try { const o = {}; Array.from(reads.entries()).slice(-6).forEach(([a, b]) => { o[a] = b; }); root.sessionStorage.setItem(SS, JSON.stringify(o)); } catch (e) {}
        return m;
    }
    function recall(photo) {
        if (!photo) return null;
        const k = hash(photo);
        if (reads.has(k)) return reads.get(k);
        try { const o = JSON.parse(root.sessionStorage.getItem(SS) || '{}'); if (o[k]) return clean(o[k]); } catch (e) {}
        return null;
    }

    /* ---------- the day's allowance, as the server last told us ---------- */
    const QK = 'lowi.mealsnap.left';
    function setLeft(left, limit) {
        if (typeof left !== 'number' || !isFinite(left)) return;
        try { root.localStorage.setItem(QK, JSON.stringify({ day: dayKey(), left: Math.max(0, Math.round(left)), limit: limit || DAY_MAX })); } catch (e) {}
        try { root.dispatchEvent && root.CustomEvent && root.dispatchEvent(new CustomEvent('lowi:photo-left', { detail: { left, limit: limit || DAY_MAX } })); } catch (e) {}
    }
    function left() { try { const o = JSON.parse(root.localStorage.getItem(QK) || 'null'); if (o && o.day === dayKey()) return { left: o.left, limit: o.limit || DAY_MAX }; } catch (e) {} return null; }
    const one = (k, l, n) => (n === 1 && (STR[l || lang()] || {})[k + '1']) ? k + '1' : k; /* Spanish: 'Te queda 1', not 'Te quedan 1' */
    function leftText(l) { const q = left(); return q ? (q.left > 0 ? t(one('left', l, q.left), l, { n: q.left, max: q.limit }) : t('none', l)) : ''; }

    /* ---------- mealtime reminders (off until turned on) ---------- */
    const RK = 'lowi.mealsnap.rem', LK = 'lowi.mealsnap.log', MEALS = ['b', 'l', 'd'];
    const DEF = { on: false, b: { on: true, h: '08:00' }, l: { on: true, h: '12:30' }, d: { on: true, h: '18:30' } };
    const WINDOW = 90, AGAIN = 30, MAX_SHOWS = 2;
    const hm = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '')); return m ? Math.min(23, +m[1]) * 60 + Math.min(59, +m[2]) : -1; };
    function getRem() { let s = null; try { s = JSON.parse(root.localStorage.getItem(RK) || 'null'); } catch (e) {} s = s && typeof s === 'object' ? s : {}; const o = { on: !!s.on }; for (const k of MEALS) o[k] = { on: s[k] ? s[k].on !== false : true, h: s[k] && hm(s[k].h) >= 0 ? s[k].h : DEF[k].h }; return o; }
    function setRem(p) { const s = getRem(); for (const k in p) s[k] = (k === 'on') ? !!p[k] : Object.assign({}, s[k], p[k]); try { root.localStorage.setItem(RK, JSON.stringify(s)); } catch (e) {} return s; }
    function getLog(now) { let g = null; try { g = JSON.parse(root.localStorage.getItem(LK) || 'null'); } catch (e) {} const d = dayKey(now || new Date()); if (!g || g.day !== d) g = { day: d, shown: {}, last: {}, meals: [] }; return g; }
    function putLog(g) { try { root.localStorage.setItem(LK, JSON.stringify(g)); } catch (e) {} }
    // Pure: which meal (b/l/d) is due for a nudge right now, or ''. Rules: reminders on, that meal on, within 90 min
    // after its time, at most 2 nudges per meal per day and 30 min apart, nothing logged since an hour before its time,
    // and photo checks left (when known). Typed meal logging is never blocked by any of this.
    function due(now, set, log, leftNow) {
        if (!set || !set.on || leftNow === 0) return '';
        const m = now.getHours() * 60 + now.getMinutes(), ms = now.getTime();
        for (const k of MEALS) {
            const c = set[k]; if (!c || !c.on) continue;
            const start = hm(c.h); if (start < 0 || m < start || m >= start + WINDOW) continue;
            if ((log.shown[k] || 0) >= MAX_SHOWS) continue;
            if (log.last[k] && ms - log.last[k] < AGAIN * 60000) continue;
            const from = ms - (m - start + 60) * 60000;
            if ((log.meals || []).some(x => x >= from)) continue;
            return k;
        }
        return '';
    }
    const timesText = (s, l) => MEALS.filter(k => s[k].on).map(k => s[k].h).join(', ');
    function nudgeText(k, l) { const q = left(), meal = t(k, l); return q ? t(one('nudge', l, q.left), l, { meal, n: q.left, max: q.limit }) : t('nudgeU', l, { meal }); }
    function tick() {
        try {
            if (!root.document || document.hidden) return;
            const N = root.LowiN1; if (!N || !N.show) return;
            const now = new Date(), s = getRem(); if (!s.on) return;
            if (N.cur && N.cur()) return;
            if (N.appFree && !N.appFree()) return;
            if (N.quiet && N.quiet(now)) return;
            const q = left(), g = getLog(now), k = due(now, s, g, q ? q.left : null);
            if (!k) return;
            const l = lang();
            const ok = N.show({ id: 'snap-' + k, text: nudgeText(k, l), label: t('go', l), laterLabel: t('later', l),
                fn: () => { const x = getLog(); x.shown[k] = MAX_SHOWS; putLog(x); try { root.LowiSpirit && root.LowiSpirit.photo && root.LowiSpirit.photo(); } catch (e) {} },
                laterFn: (how) => { if (how === 'x') { const x = getLog(); x.shown[k] = MAX_SHOWS; putLog(x); } } });
            if (ok !== false) { g.shown[k] = (g.shown[k] || 0) + 1; g.last[k] = now.getTime(); putLog(g); }
        } catch (e) {}
    }
    function mealLogged() { const g = getLog(); g.meals = (g.meals || []).concat(Date.now()).slice(-12); putLog(g); }

    // The row inside Reminders (LowiN1 settings sheet).
    function rowHTML() {
        const s = getRem(), l = lang();
        const chip = (v, txt, on) => '<button type="button" class="chip n1-opt' + (on ? ' on' : '') + '" data-ms="on" data-v="' + v + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(txt) + '</button>';
        return '<div class="n1-row ms-rem" data-noi18n><b>' + esc(t('remH', l)) + '</b><div class="small muted" style="margin:2px 0 8px">' + esc(t('remSub', l)) + '</div>' +
            '<div class="n1-opts">' + chip('1', t('on', l), s.on) + chip('0', t('off', l), !s.on) + '</div>' +
            '<div class="ms-times' + (s.on ? '' : ' dis') + '">' + MEALS.map(k => '<label class="ms-time"><input type="checkbox" data-ms="meal" data-k="' + k + '"' + (s[k].on ? ' checked' : '') + (s.on ? '' : ' disabled') + '><span>' + esc(t(k, l)) + '</span><input class="input" type="time" data-ms="time" data-k="' + k + '" value="' + esc(s[k].h) + '"' + (s.on && s[k].on ? '' : ' disabled') + '></label>').join('') + '</div></div>';
    }
    function repaint() {
        try { if (root.LowiN1 && root.LowiN1.repaintSheet) root.LowiN1.repaintSheet(); } catch (e) {}
        if (root.document) document.querySelectorAll('.ms-rem').forEach(el => { const tmp = document.createElement('div'); tmp.innerHTML = rowHTML(); el.replaceWith(tmp.firstChild); });
    }

    /* ---------- Snap food extras: allowance line, share toggle, reminder offer ---------- */
    // Called by LowiFoodAI.mount after a good read. photo = data URL, getMeal() -> current meal (after removals/renames).
    function snapExtras(box, form, photo, getMeal) {
        if (!box || !root.document) return;
        const l = lang(), s = getRem();
        const wrap = document.createElement('div'); wrap.className = 'ms-extra'; wrap.setAttribute('data-noi18n', '');
        const lt = leftText(l);
        wrap.innerHTML = (lt ? '<p class="ms-left">' + esc(lt) + '</p>' : '') +
            '<label class="ms-opt"><input type="checkbox" data-ms="share"><span><b>' + esc(t('shareT', l)) + '</b><small>' + esc(t('shareS', l)) + '</small></span></label>' +
            (s.on ? '' : '<label class="ms-opt"><input type="checkbox" data-ms="offer"><span><b>' + esc(t('remT', l)) + '</b><small>' + esc(t('remS', l, { times: timesText(s, l) })) + '</small></span></label>');
        box.appendChild(wrap);
        const offer = wrap.querySelector('[data-ms="offer"]');
        if (offer) offer.addEventListener('change', () => { setRem({ on: offer.checked }); });
        form.addEventListener('submit', () => {
            const sh = wrap.querySelector('[data-ms="share"]');
            if (!sh || !sh.checked) return;
            const m = getMeal(); if (m) shareAfter(photo, m, 1100);
        });
    }
    // Opens the Community post sheet with the photo and its meal card attached: no caption needed, no new AI read.
    function share(photo, m) {
        m = m && m.v === 1 ? clean(m) : meal(m);
        if (!photo || !m || !root.LowiR3F || !root.LowiR3F.postSheet || !root.TRIBE) return false;
        remember(photo, m);
        try { if (root.LowiSpirit && root.LowiSpirit.isOpen && root.LowiSpirit.isOpen()) root.LowiSpirit.close(); } catch (e) {}
        root.LowiR3F.postSheet('', '');
        if (root.TRIBE.setPhoto) root.TRIBE.setPhoto(photo);
        if (root.TRIBE.setMeal) root.TRIBE.setMeal(m);
        return true;
    }
    function shareAfter(photo, m, ms) { setTimeout(() => { try { share(photo, m); } catch (e) { console.warn(e); } }, ms || 0); }

    if (root.document && root.addEventListener) {
        const onMeal = () => mealLogged();
        root.addEventListener('lowi:meal-logged', onMeal);
        document.addEventListener('click', e => {
            const b = e.target && e.target.closest && e.target.closest('.ms-rem [data-ms="on"]');
            if (!b) return; e.preventDefault(); setRem({ on: b.dataset.v === '1' }); repaint();
        });
        document.addEventListener('change', e => {
            const el = e.target; if (!el || !el.closest || !el.closest('.ms-rem')) return;
            const k = el.dataset.k; if (MEALS.indexOf(k) < 0) return;
            if (el.dataset.ms === 'meal') { setRem({ [k]: { on: el.checked } }); repaint(); }
            else if (el.dataset.ms === 'time' && hm(el.value) >= 0) setRem({ [k]: { h: el.value } });
        });
        setInterval(tick, 60000);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(tick, 4000); });
    }

    return { DAY_MAX, KEYS, strings: STR, t, bloodSugar, meal, clean, cardHTML, remember, recall, hash, setLeft, left, leftText, nudgeText,
        getRem, setRem, due, rowHTML, snapExtras, share, tick, dayKey, _reads: reads };
});
