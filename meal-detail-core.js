/* LOWiSPIKE meal details (Oct 25 2026, E-man: "I can click on a friend's picture and see the information that they got about
   whatever they are eating"). A meal post in Chat / Circles / For You carries what the POSTER's own photo check said, and the spike
   label opens it in a sheet.
   - fromLog(log): built on the poster's phone at share time, from that one meal's photo analysis (log.ai) and the same verdict
     engine the result screen used (LowiMealSnap.bloodSugar + LowiFoodKnowledge.rateMeal). Nothing else is ever read.
   - clean(d): the ONLY way a detail is read or written. A strict whitelist (WHITE): unknown keys are dropped, numbers clamped,
     strings cut. So cycle, sleep, weight, goals or anything outside this meal can never ride along, from us or from anyone.
   - sheetHTML(d, ctx): the glass sheet. Only what was stored is shown; a meal without details gets a calm "No details" line.
   Pure: runs in node tests (tests/meal-detail.test.cjs). The DOM side is meal-detail.js.
   Oct 25 2026 (Emmanuel, honesty rule: no medical promises): the labels and why lines are the scanner's own words (meal-result.js
   STR: Lower impact / Small rise / Spike likely, "About {net} g net carbs."), never "blood sugar should stay steady";
   tests/steady-onion.test.cjs keeps them equal. */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiMealDetailCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
    'use strict';
    const KEYS = ['kcal', 'carbs', 'protein', 'fiber', 'sugar', 'fat'];
    const CAP = { kcal: 6000, protein: 400, carbs: 800, sugar: 600, fiber: 200, fat: 500, net: 800 };
    const WHITE = ['v', 'name', 'lvl', 'bs', 'net', 'drink', 'verdict', 'rule', 'low', 'note', 'items', 'total'];
    const LV = ['low', 'mid', 'high'], VERDICTS = ['JA', 'SELTEN', 'NEIN'];
    const STR = {
        en: {
            title: 'Meal details', from: 'From {n}’s photo check', low: 'Lower impact', mid: 'Small rise', high: 'Spike likely',
            why: 'Why', whyLow: 'About {net} g net carbs.', whyMid: 'About {net} g net carbs: a moderate rise.',
            whyHigh: 'About {net} g net carbs. That’s enough to spike.', whyDrink: 'The sugary drink alone is enough to spike.',
            ing: 'What the photo check saw', nut: 'Numbers from the photo', tip: 'Tip', est: 'Estimate from the photo, not a measurement.',
            lowConf: 'The photo was hard to read, so this is a rough guess.', none: 'No details for this meal.', noneS: 'It was shared before meal details were saved with posts.',
            hint: 'Details', open: '{l}. Show meal details', close: 'Close',
            kcal: 'kcal', carbs: 'carbs', protein: 'protein', fiber: 'fiber', sugar: 'sugar', fat: 'fat'
        },
        de: {
            title: 'Mahlzeit-Details', from: 'Aus dem Foto-Check von {n}', low: 'Niedrigere Wirkung', mid: 'Leichter Anstieg', high: 'Spike wahrscheinlich',
            why: 'Warum', whyLow: 'Etwa {net} g Netto-Kohlenhydrate.', whyMid: 'Etwa {net} g Netto-Kohlenhydrate: eher ein mäßiger Anstieg.',
            whyHigh: 'Etwa {net} g Netto-Kohlenhydrate. Das reicht für einen Spike.', whyDrink: 'Allein das süße Getränk reicht für einen Spike.',
            ing: 'Was der Foto-Check erkannt hat', nut: 'Zahlen aus dem Foto', tip: 'Tipp', est: 'Schätzung aus dem Foto, keine Messung.',
            lowConf: 'Das Foto war schwer zu erkennen, daher nur eine grobe Schätzung.', none: 'Keine Details zu dieser Mahlzeit.', noneS: 'Sie wurde geteilt, bevor Details mit Posts gespeichert wurden.',
            hint: 'Details', open: '{l}. Mahlzeit-Details zeigen', close: 'Schließen',
            kcal: 'kcal', carbs: 'Kohlenh.', protein: 'Eiweiß', fiber: 'Ballastst.', sugar: 'Zucker', fat: 'Fett'
        },
        es: {
            title: 'Detalles de la comida', from: 'Del análisis de foto de {n}', low: 'Impacto bajo', mid: 'Subida leve', high: 'Pico probable',
            why: 'Por qué', whyLow: 'Unos {net} g de carbohidratos netos.', whyMid: 'Unos {net} g de carbohidratos netos: una subida moderada.',
            whyHigh: 'Unos {net} g de carbohidratos netos. Suficiente para un pico.', whyDrink: 'Solo la bebida azucarada ya basta para un pico.',
            ing: 'Lo que vio el análisis', nut: 'Números de la foto', tip: 'Consejo', est: 'Estimación a partir de la foto, no una medición.',
            lowConf: 'La foto era difícil de leer, así que es una estimación aproximada.', none: 'No hay detalles de esta comida.', noneS: 'Se compartió antes de que los detalles se guardaran con las publicaciones.',
            hint: 'Detalles', open: '{l}. Ver detalles de la comida', close: 'Cerrar',
            kcal: 'kcal', carbs: 'carbohidratos', protein: 'proteína', fiber: 'fibra', sugar: 'azúcar', fat: 'grasa'
        }
    };
    const lang = (l) => { try { l = l || (root.LowiLang && root.LowiLang.get && root.LowiLang.get()) || (root.localStorage && root.localStorage.getItem('lowispike.lang')) || (root.document && root.document.documentElement.lang) || 'en'; } catch (e) { l = 'en'; } l = String(l).slice(0, 2).toLowerCase(); return STR[l] ? l : 'en'; };
    const t = (k, l, v) => { let s = (STR[lang(l)] || STR.en)[k]; if (s == null) s = STR.en[k] != null ? STR.en[k] : k; if (v) for (const x in v) s = s.split('{' + x + '}').join(String(v[x])); return s; };
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
    const num = (v, max) => { const n = typeof v === 'string' ? parseFloat(v) : v; return typeof n === 'number' && isFinite(n) && n > 0 ? Math.min(max, Math.round(n * 10) / 10) : 0; };
    const lvlOf = (v) => { v = v === 'medium' ? 'mid' : String(v || ''); return LV.includes(v) ? v : ''; };
    const rule = (v) => { v = String(v || ''); return /^[a-z]+(\.[a-z_]+)?$/.test(v) && v.length <= 40 ? v : ''; };
    const req = (name, glob) => { try { if (root[glob]) return root[glob]; return typeof require === 'function' ? require('./' + name) : null; } catch (e) { return null; } };

    /* the only gate, used on write (fromLog, the insert) and on read (every message / post that claims a detail) */
    function clean(d) {
        if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
        const o = { v: 1 };
        const name = str(d.name, 100); if (name) o.name = name;
        const lvl = lvlOf(d.lvl); if (lvl) o.lvl = lvl;
        const bs = lvlOf(d.bs); if (bs) o.bs = bs;
        if (d.net != null && isFinite(+d.net) && +d.net >= 0) o.net = Math.min(CAP.net, Math.round(+d.net));
        if (d.drink === true) o.drink = true;
        if (VERDICTS.includes(d.verdict)) o.verdict = d.verdict;
        const r = rule(d.rule); if (r) o.rule = r;
        if (d.low === true) o.low = true;
        const note = str(d.note, 160); if (note) o.note = note;
        const items = (Array.isArray(d.items) ? d.items : []).map(x => {
            if (!x || typeof x !== 'object') return null;
            const n = str(x.name, 60); if (!n) return null;
            const it = { name: n }; const p = str(x.portion, 40); if (p) it.portion = p; if (VERDICTS.includes(x.v)) it.v = x.v; return it;
        }).filter(Boolean).slice(0, 8);
        if (items.length) o.items = items;
        const tot = d.total && typeof d.total === 'object' ? d.total : null;
        if (tot) { const total = {}; for (const k of KEYS) { const n = k === 'kcal' ? Math.round(num(tot[k], CAP.kcal)) : num(tot[k], CAP[k]); if (n > 0) total[k] = n; } if (Object.keys(total).length) o.total = total; }
        return o.name || o.items || o.total || o.lvl ? o : null;
    }
    const hasDetail = (d) => !!(d && (d.items || d.total || d.net != null || d.verdict || d.note));

    /* built on the poster's phone, from one logged meal: its photo analysis (log.ai = {name, items, total, bs, note, low}) and its
       spike label. Re-runs the same deterministic engine as the result screen, so the verdict and the why match what they saw. */
    function fromLog(log, lvl) {
        if (!log || typeof log !== 'object') return null;
        const ai = log.ai && typeof log.ai === 'object' ? log.ai : null;
        const name = str((ai && ai.name) || log.t, 100), L = lvlOf(lvl || log.lvl || (ai && ai.bs));
        if (!ai) return clean({ name, lvl: L });
        const S = req('meal-photo.js', 'LowiMealSnap'), K = req('food-knowledge-core.js', 'LowiFoodKnowledge');
        const items = (Array.isArray(ai.items) ? ai.items : []).filter(x => x && x.name);
        const total = ai.total && typeof ai.total === 'object' ? ai.total : (log.macros && typeof log.macros === 'object' ? log.macros : null);
        let bs = null; try { bs = S && S.bloodSugar && total ? S.bloodSugar(total, items) : null; } catch (e) { bs = null; }
        /* bloodSugar() says high for a sugary drink (>= 20 g sugar) even below the 40 load line: that is the drink case */
        const drinkSugar = !!(bs && bs.level === 'high' && bs.score < 40);
        const level = (bs && bs.level) || lvlOf(ai.bs) || '';
        let food = null; try { food = K && K.rateMeal && items.length ? K.rateMeal(items, { level, score: bs ? bs.score : undefined }, 'en') : null; } catch (e) { food = null; }
        const d = {
            name, lvl: L, bs: level, net: bs ? bs.net : (total ? Math.max(0, Math.round(num(total.carbs, CAP.carbs) - num(total.fiber, CAP.fiber))) : undefined),
            drink: !!drinkSugar, verdict: food && food.verdict, rule: food && food.rule, low: ai.low === true, note: ai.note,
            items: items.map((x, i) => ({ name: x.name, portion: x.portion, v: food && food.dishes && food.dishes[i] ? food.dishes[i].verdict : undefined })),
            total
        };
        return clean(d);
    }

    /* ---------- what the sheet says ---------- */
    function whyText(d, l) {
        if (!d) return '';
        if (d.drink) return t('whyDrink', l);
        const k = d.bs || d.lvl; if (d.net == null || !k) return '';
        return t(k === 'high' ? 'whyHigh' : k === 'mid' ? 'whyMid' : 'whyLow', l, { net: d.net });
    }
    function foodLines(d, l) {
        const K = req('food-knowledge-core.js', 'LowiFoodKnowledge'); if (!d || !d.verdict || !K) return null;
        const tier = K.TIERS && (K.TIERS[lang(l)] || K.TIERS.en)[d.verdict];
        const reason = d.rule && K.reasonText ? K.reasonText(d.rule, l) : '';
        const sub = tier ? (d.verdict === 'NEIN' && d.rule === 'glucose.high' && tier.subSpike ? tier.subSpike : tier.sub) : '';
        return { name: tier ? tier.name : '', light: K.LIGHT ? K.LIGHT[d.verdict] : '', reason, sub, anyway: d.verdict !== 'JA' && K.anywayLine ? K.anywayLine(l) : '' };
    }
    function chipHTML(lvl, l, cls) {
        lvl = lvlOf(lvl) || 'mid';
        return '<span class="md-lv md-lv-' + lvl + (cls ? ' ' + cls : '') + '"><i aria-hidden="true"></i>' + esc(t(lvl, l)) + '</span>';
    }
    /* ctx: {by, name, lvl, photo, l} - by/name/lvl/photo come from the post itself (its body), the rest only from the stored detail */
    function sheetHTML(detail, ctx) {
        ctx = ctx || {}; const l = lang(ctx.l), d = clean(detail);
        const name = (d && d.name) || str(ctx.name, 100), lvl = lvlOf(ctx.lvl) || (d && d.lvl) || '';
        let h = '<div class="md-sheet" data-noi18n>';
        if (ctx.photo && /^https:\/\//.test(String(ctx.photo))) h += '<figure class="md-photo"><img alt="" src="' + esc(ctx.photo) + '"></figure>';
        h += '<p class="md-k">' + esc(t('title', l)) + '</p>';
        if (name) h += '<h3 class="md-name">' + esc(name) + '</h3>';
        if (ctx.by) h += '<p class="md-by">' + esc(t('from', l, { n: str(ctx.by, 40) })) + '</p>';
        if (lvl) h += chipHTML(lvl, l);
        if (!hasDetail(d)) return h + '<p class="md-none" role="status"><b>' + esc(t('none', l)) + '</b><small>' + esc(t('noneS', l)) + '</small></p></div>';
        const why = whyText(d, l), fl = foodLines(d, l);
        if (why || (fl && (fl.reason || fl.sub))) {
            h += '<section class="md-sec md-why"><h4>' + esc(t('why', l)) + '</h4>';
            if (why) h += '<p>' + esc(why) + '</p>';
            if (fl && fl.name) h += '<p class="md-verdict md-v-' + esc(String(fl.light || '').toLowerCase()) + '"><b>' + esc(fl.name) + '</b>' + (fl.reason ? '<span>' + esc(fl.reason) + '</span>' : '') + '</p>';
            h += '</section>';
        }
        if (d.items) {
            h += '<section class="md-sec"><h4>' + esc(t('ing', l)) + '</h4><ul class="md-ing">' + d.items.map(x =>
                '<li' + (x.v ? ' class="md-i-' + x.v.toLowerCase() + '"' : '') + '><i aria-hidden="true"></i><span>' + esc(x.name) + (x.portion ? ' <small>' + esc(x.portion) + '</small>' : '') + '</span></li>').join('') + '</ul></section>';
        }
        if (d.total) {
            const cells = KEYS.filter(k => d.total[k] > 0).map(k => '<span class="md-n"><b>' + (k === 'kcal' ? Math.round(d.total[k]) : Math.round(d.total[k]) + ' g') + '</b>' + esc(t(k, l)) + '</span>').join('');
            if (cells) h += '<section class="md-sec"><h4>' + esc(t('nut', l)) + '</h4><div class="md-nut">' + cells + '</div></section>';
        }
        if (fl && (fl.sub || fl.anyway)) h += '<section class="md-sec md-tip"><h4>' + esc(t('tip', l)) + '</h4>' + (fl.sub ? '<p>' + esc(fl.sub) + '</p>' : '') + (fl.anyway ? '<p>' + esc(fl.anyway) + '</p>' : '') + '</section>';
        if (d.note) h += '<p class="md-note">' + esc(d.note) + '</p>';
        h += '<p class="md-est">' + esc(t(d.low ? 'lowConf' : 'est', l)) + '</p>';
        return h + '</div>';
    }
    /* the visible tap hint next to a spike label: a small "Details" word + chevron */
    const hintHTML = (l) => '<span class="md-hint" aria-hidden="true">' + esc(t('hint', l)) + '<svg viewBox="0 0 10 16" width="7" height="11"><path d="M2 2l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
    return { WHITE, KEYS, STR, t, lang, esc, clean, hasDetail, fromLog, whyText, foodLines, chipHTML, hintHTML, sheetHTML, lvlOf };
});
