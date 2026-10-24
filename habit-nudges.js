/* LOWiSPIKE personal habit nudges, the drawing part (Oct 24, 2026). Rules: habit-nudges-core.js. Notes: COORD-nudges.md.
   Mostly quiet: a small cue inside a Home bubble when it fits the person's day (a bead of dew on Water, a little basket on
   Scan on their shop day, a soft glint on Fuel when a usual meal went unlogged). Rarely, the person's own companion says
   one warm line on Home (LowiPraise.say, the same small anchored speech bubble as the rest of the app).
   - Separate from the community inspiration bot: nothing leaves the phone, nothing is posted, no push notification.
   - Lines follow the existing reminder settings (LowiN1: on/off, "Rarely", quiet hours). Cues have their own On/Off row
     in the same sheet. Reduce motion: the cues stand still. A screen reader never hears a cue (they are decoration). */
(function (W) {
    'use strict';
    const D = W.document, H = D && D.documentElement, C = W.LowiHabitNudgeCore;
    if (!D || !C || W.LowiHabitNudge) return;
    const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };
    const js = k => { try { return JSON.parse(ls.get(k) || 'null'); } catch (e) { return null; } };
    let S = C.normalize(js(C.KEY)), ev = null, evAt = 0, hidAt = 0, lastEval = null;
    const save = () => ls.set(C.KEY, JSON.stringify(S));
    const lang = () => { let l = 'en'; try { l = (W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || ls.get('lowispike.lang') || H.lang || 'en'; } catch (e) { } return C.LANGS.indexOf(String(l).slice(0, 2)) >= 0 ? String(l).slice(0, 2) : 'en'; };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* ---------- reading the app (read only) ---------- */
    function n1() { try { return W.LowiN1 && W.LowiN1.get ? W.LowiN1.get() : Object.assign({ on: true, freq: 'normal', qs: 22, qe: 7 }, js('lowi.n1') || {}); } catch (e) { return { on: true, freq: 'normal', qs: 22, qe: 7 }; } }
    function cups() { const f = js('lowi_fast_v1') || {}, w = f.water || {}; return +w[C.dayKey(Date.now())] || 0; }
    function goal() { try { const g = W.LowiSpiritCore && W.LowiSpiritCore.WATER && W.LowiSpiritCore.WATER.goal; if (+g > 0) return +g; } catch (e) { } return 6; }
    function meals() { const s = js('lowispike.v2') || {}; return (Array.isArray(s.logs) ? s.logs : []).map(x => +(x && x.ts) || 0).filter(Boolean).sort((a, b) => a - b); }
    function plan() { const p = js('lowispike.shopplan.v1') || {}; try { if (W.LowiShopPlanCore) return W.LowiShopPlanCore.normalize(p); } catch (e) { } return p; }
    function lastShop() { try { if (W.LowiGrocery && W.LowiGrocery.state) return +W.LowiGrocery.state().lastRenew || 0; } catch (e) { } const g = js('lowi.grocery.v1') || {}; return +g.lastRenew || 0; }
    function snapOn() { try { return !!(W.LowiMealSnap && W.LowiMealSnap.getRem && W.LowiMealSnap.getRem().on); } catch (e) { return false; } }

    /* ---------- where the cues sit ---------- */
    const SPOT = { water: '#whHud .wh-water', shop: '#whHud .o8-scan', log: '#whHud .wh-meals' };
    const ICON = {
        water: '<svg viewBox="0 0 12 16" aria-hidden="true"><path d="M6 1C6 1 1.2 7 1.2 10.2A4.8 4.8 0 0 0 10.8 10.2C10.8 7 6 1 6 1Z"/><ellipse class="hn-glint" cx="4.3" cy="10.4" rx="1.1" ry="1.8"/></svg>',
        shop: '<svg viewBox="0 0 16 14" aria-hidden="true"><path d="M5 5.5L7.4 1.6M11 5.5L8.6 1.6" fill="none" stroke-width="1.4" stroke-linecap="round"/><path d="M1.2 5.5H14.8L13.3 12.2A1.4 1.4 0 0 1 11.9 13.3H4.1A1.4 1.4 0 0 1 2.7 12.2Z"/></svg>',
        log: '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 0.8L8.4 5.6L13.2 7L8.4 8.4L7 13.2L5.6 8.4L0.8 7L5.6 5.6Z"/></svg>'
    };
    function paint(k, on, speaking) {
        const b = D.querySelector(SPOT[k]); if (!b) return;
        let c = b.querySelector(':scope > .hn-cue');
        if (!on) { if (c) c.remove(); return; }
        if (!c) { c = D.createElement('span'); c.className = 'hn-cue hn-' + k; c.setAttribute('aria-hidden', 'true'); c.innerHTML = ICON[k]; b.appendChild(c); }
        c.classList.toggle('hn-say', !!speaking);
    }
    function clearCues() { Object.keys(SPOT).forEach(k => paint(k, false)); }

    /* ---------- may a line be spoken right now (Home, nothing else talking or open) ---------- */
    function vis(e) { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(e).visibility !== 'hidden'; }
    function homeFree() {
        if (D.hidden || !D.querySelector('#tab-home.active')) return false;
        if (H.classList.contains('mf-on') || H.classList.contains('gate-up') || H.classList.contains('gate-boot') || H.classList.contains('g1-touring') || H.classList.contains('wh-away')) return false;
        try { if (W.LowiG1 && W.LowiG1.state && W.LowiG1.state()) return false; } catch (e) { }
        const mn = D.getElementById('main'); if (!mn || mn.classList.contains('hidden')) return false; /* sign-in / setup still up */
        if (D.querySelector('#sheetwrap.open, .r2-ov.on:not(.off), #rsSheet.open, #result.open, .o8-sheet.on, .os-sheet.open')) return false;
        if (vis(D.getElementById('n1B')) || vis(D.getElementById('mhNudge')) || vis(D.getElementById('r2ob')) || vis(D.getElementById('lcUpd'))) return false;
        try { if (W.LowiPraise && W.LowiPraise.talking && W.LowiPraise.talking()) return false; } catch (e) { }
        return !!(W.LowiPraise && W.LowiPraise.say);
    }

    /* ---------- one pass: note what changed, paint the cues, maybe one line ---------- */
    function evaluate(o) {
        o = o || {};
        const now = o.now || Date.now(), set = n1();
        if (C.noteCups(S, cups(), now)) { ev = null; }
        const base = { now, qs: set.qs, qe: set.qe };
        const wv = C.water(Object.assign({ cups: cups(), goal: goal(), waters: S.hist.water, opens: S.hist.open, event: ev, eventAt: evAt }, base));
        const sv = C.shop(Object.assign({ plan: plan(), lastShop: lastShop() }, base));
        const lv = C.logMeal(Object.assign({ meals: meals(), snapOn: snapOn() }, base));
        const res = { water: wv, shop: sv, log: lv, said: '' };
        let speak = null;
        if (!o.quietOnly) for (const [k, v] of [['water', wv], ['shop', sv], ['log', lv]]) {
            if (!v.moment) continue;
            if (!C.canSay(S, k, now, { remindersOn: set.on !== false, freq: set.freq, qs: set.qs, qe: set.qe })) continue;
            speak = { k, moment: v.moment }; break;
        }
        if (speak && (o.force || homeFree())) {
            const text = C.line(S, speak.moment, lang());
            if (text) { C.markSaid(S, speak.k, now); res.said = speak.moment; if (speak.k === 'water') ev = null; try { W.LowiPraise.say(text); } catch (e) { } }
        }
        save();
        const cuesOn = S.cues !== false;
        paint('water', cuesOn && wv.cue, res.said && C.HABIT[res.said] === 'water');
        paint('shop', cuesOn && sv.cue, res.said === 'shop');
        paint('log', cuesOn && lv.cue, res.said === 'log');
        lastEval = res;
        return res;
    }

    /* ---------- settings row in the reminder sheet (LowiN1 sheetHTML) ---------- */
    const TX = {
        en: { h: 'Little hints from your companion', sub: 'A bead of dew on Water when a sip fits your day, a small basket on Scan on your shop day. No sound, no pop-up.', on: 'On', off: 'Off' },
        de: { h: 'Kleine Hinweise von deinem Begleiter', sub: 'Ein Tautropfen auf Wasser, wenn ein Schluck in deinen Tag passt, ein kleiner Korb auf Scannen an deinem Einkaufstag. Kein Ton, kein Pop-up.', on: 'An', off: 'Aus' },
        es: { h: 'Pistas de tu compañero', sub: 'Una gota de rocío en Agua cuando un sorbo encaja en tu día, una cestita en Escanear el día de compras. Sin sonido ni avisos.', on: 'Sí', off: 'No' }
    };
    function rowHTML() {
        const t = TX[lang()] || TX.en, on = S.cues !== false;
        const chip = (v, txt, sel) => '<button type="button" class="chip n1-opt' + (sel ? ' on' : '') + '" data-hn="cues" data-v="' + v + '" aria-pressed="' + (sel ? 'true' : 'false') + '">' + esc(txt) + '</button>';
        return '<div class="n1-row hn-row" data-noi18n><b>' + esc(t.h) + '</b><div class="small muted" style="margin:2px 0 8px">' + esc(t.sub) + '</div><div class="n1-opts">' + chip('1', t.on, on) + chip('0', t.off, !on) + '</div></div>';
    }
    function setCues(on) { S.cues = !!on; save(); if (!S.cues) clearCues(); else evaluate({ quietOnly: true }); }
    D.addEventListener('click', e => {
        const b = e.target && e.target.closest && e.target.closest('[data-hn="cues"]'); if (!b) return;
        e.preventDefault(); e.stopPropagation(); setCues(b.dataset.v === '1');
        try { if (W.LowiN1 && W.LowiN1.repaintSheet) W.LowiN1.repaintSheet(); } catch (x) { }
        D.querySelectorAll('.hn-row').forEach(r => { const t = D.createElement('div'); t.innerHTML = rowHTML(); r.replaceWith(t.firstChild); });
    }, true);

    /* ---------- timing: on open, after a meal, every 30 s while the app is up ---------- */
    function opened() { const now = Date.now(); C.noteOpen(S, now); ev = 'open'; evAt = now; save(); }
    function onMeal() { ev = 'meal'; evAt = Date.now(); setTimeout(() => evaluate(), 6000); }
    let mealSeen = 0;
    W.addEventListener('lowi:meal-logged', () => { const n = Date.now(); if (n - mealSeen > 2000) { mealSeen = n; onMeal(); } });
    D.addEventListener('lowi:meal-logged', () => { const n = Date.now(); if (n - mealSeen > 2000) { mealSeen = n; onMeal(); } });
    D.addEventListener('visibilitychange', () => {
        if (D.hidden) { hidAt = Date.now(); return; }
        if (hidAt && Date.now() - hidAt > 20 * 6e4) { opened(); setTimeout(() => evaluate(), 4000); }
    });
    /* a cue goes away the moment its thing is done (water logged, meal logged, shopping checked in) */
    ['lowi:reward', 'lowi:state', 'lowi:award', 'lowi:water', 'storage'].forEach(n => W.addEventListener(n, () => { clearTimeout(W.__hnT); W.__hnT = setTimeout(() => evaluate({ quietOnly: true }), 700); }));
    function init() {
        opened();
        setTimeout(() => evaluate(), 9000); /* after boot, the tour check and N1's own first look */
        setInterval(() => { if (!D.hidden) evaluate(); }, 30000);
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0);

    W.LowiHabitNudge = {
        evaluate, rowHTML, setCues,
        /* LowiN1 leaves its generic water line out: the companion handles water at moments that fit the day */
        ownsWater: () => true,
        state: () => JSON.parse(JSON.stringify(S)),
        last: () => lastEval,
        free: homeFree,
        _reset: () => { S = C.normalize(null); save(); clearCues(); }
    };
})(typeof window !== 'undefined' ? window : globalThis);
