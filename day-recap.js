/* Oct 26 2026 (Emmanuel, voice message 11:22 PM: "Und setze das mit dem ... Day-Recap, whatever we call it, setz das um").
   MAYA-HANDOFF 0.40. The Day recap panel: your companion looks back at today in one glass sheet (LowiR2.sheet, so back swipe,
   the X and a tap on the scrim close it like every other sheet). Data rules and every line live in day-recap-core.js.
   Reached from the companion card (hold your companion -> "Your day" bubble) and from My day (Community hold -> You -> My day).
   It never opens by itself and never sends a notification: the evening catch-up (MAYA-HANDOFF 0.39) owns the evening prompt.
   On an empty day it offers that catch-up when evening-catchup is loaded (feature-detected, LowiEveningCatchup.open). */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement;
    if (W.LowiDayRecap) return;
    const LAST_KEY = 'lowi.dayrecap.last';
    const lang = () => { try { return ((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || H.lang || 'de').slice(0, 2); } catch (e) { return 'de'; } };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const js = k => { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } };
    const core = () => { try { return typeof S !== 'undefined' && S ? S : js('lowispike.v2'); } catch (e) { return js('lowispike.v2'); } };
    const C = () => W.LowiDayRecapCore;

    /* same chain as misty-hub.js / cell-room.js companionName(): own companion > a typed name > the app default */
    function companionName() { const pick = v => { v = v == null ? '' : String(v).trim(); return v ? v.slice(0, 24) : ''; }; let auto = ''; try { auto = pick(W.LowiHerbIdentity && W.LowiHerbIdentity.autoName && W.LowiHerbIdentity.autoName()); } catch (e) { } const typed = v => { v = pick(v); return v && v !== auto ? v : ''; }; let n = ''; try { const B = W.LowiBirthCompanion; if (B && B.has && B.has()) { const c = B.get(); n = pick(c && c.name); } } catch (e) { } if (!n) try { const t = W.LowiHerbTamagotchi, p = t && t.readPrefs && t.readPrefs(); n = typed(p && p.name); } catch (e) { } if (!n) try { const R = W.LowiR2, s = R && R.S && R.S(); n = typed(s && s.herb && s.herb.name); } catch (e) { } return n || 'Misty'; }
    function aura() { try { const c = W.LowiWorldHomeCore, id = W.LowiWorldHome && W.LowiWorldHome.auraId ? W.LowiWorldHome.auraId() : ''; return c ? c.aura(id) : null; } catch (e) { return null; } }

    function data(now) {
        const s = core() || {};
        let lv = null; try { if (typeof levelOf === 'function') lv = x => levelOf(x, true); } catch (e) { lv = null; }
        return C().summarize({ now: now || Date.now(), logs: s.logs, ledger: s.ledger, xp: s.xp, fast: js('lowi_fast_v1'), move: js('lowispike.move.v1'), levelOf: lv });
    }
    function lastIdx() { try { const v = JSON.parse(localStorage.getItem(LAST_KEY) || 'null'); return v && typeof v.i === 'number' ? v : null; } catch (e) { return null; } }
    function build() {
        const sum = data(), prev = lastIdx();
        const last = prev && prev.mood ? prev.i : -1;
        /* the same pool never repeats the last line (a different mood pool may start anywhere) */
        let v = C().view(sum, { lang: lang(), name: companionName(), last });
        if (prev && prev.mood !== v.mood) v = C().view(sum, { lang: lang(), name: companionName(), last: -1 });
        try { localStorage.setItem(LAST_KEY, JSON.stringify({ i: v.helloIdx, mood: v.mood })); } catch (e) { }
        return { sum, v };
    }
    function art() {
        try {
            const src = D.querySelector('#spBubble .sp-home-herb svg.tmg-plant');
            if (src) { const c = src.cloneNode(true); c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(e => e.removeAttribute('id')); c.setAttribute('aria-hidden', 'true'); return c.outerHTML; }
        } catch (e) { }
        return '<span class="drc-orb" aria-hidden="true"></span>';
    }
    const DOT = { low: 'ok', medium: 'mid', high: 'warn', unknown: 'none' };
    function html() {
        const { v } = build(), a = aura() || {};
        const stats = v.stats.map(x => '<li class="drc-st ' + esc(x.tone) + '" data-k="' + esc(x.k) + '"><b class="num">' + esc(x.n) + '</b><span>' + esc(x.b) + '</span>' + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + '</li>').join('');
        const meals = v.meals.length ? '<ul class="drc-meals">' + v.meals.map(m => '<li><i class="drc-dot ' + DOT[m.v] + '" aria-hidden="true"></i>' + esc(m.t || '\u2026') + '</li>').join('') + '</ul>' : '';
        const catchUp = v.catchUp && W.LowiEveningCatchup && typeof W.LowiEveningCatchup.open === 'function'
            ? '<button type="button" class="drc-btn ghost" data-drc="catchup">' + esc(v.labels.catchUp) + '</button>' : '';
        return '<section class="drc" id="dayRecap" data-noi18n data-mood="' + esc(v.mood) + '" style="--a:' + esc(a.a || '#7cf0c0') + ';--b:' + esc(a.b || '#5ab0ff') + '" aria-labelledby="drcTitle">' +
            '<header class="drc-head"><div class="drc-art">' + art() + '</div><div><h2 id="drcTitle">' + esc(v.title) + '</h2>' +
            '<p class="drc-say" data-drc-say>' + esc(v.hello) + '</p></div></header>' +
            (stats ? '<ul class="drc-stats">' + stats + '</ul>' : '') + meals +
            (v.levelUp ? '<p class="drc-level">' + esc(v.levelUp) + '</p>' : '') +
            '<div class="drc-card"><span>' + esc(v.labels.takeaway) + '</span><p data-drc-take>' + esc(v.takeaway) + '</p></div>' +
            '<div class="drc-card soft"><span>' + esc(v.labels.tomorrow) + '</span><p data-drc-nudge>' + esc(v.nudge) + '</p></div>' +
            '<div class="drc-acts">' + catchUp + '<button type="button" class="drc-btn" data-drc="done">' + esc(v.labels.done) + '</button></div>' +
            '<p class="drc-note">' + esc(v.estimate) + '</p></section>';
    }
    function sheet() { return Array.from(D.querySelectorAll('#dayRecap')).find(e => !(e.closest && e.closest('.r2-ov.off'))) || null; }
    function close() { const ex = sheet(), ov = ex && ex.closest('.r2-ov'); try { if (ov && W.LowiR2 && W.LowiR2.close) W.LowiR2.close(ov); else if (ov) ov.remove(); } catch (e) { ov && ov.remove(); } }
    function open() {
        const R2 = W.LowiR2; if (!R2 || !R2.sheet || !C()) return false;
        if (sheet()) return true; /* a double tap opens one panel */
        R2.sheet(html(), { cls: 'drc-ov' });
        return true;
    }
    D.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('[data-drc]'); if (!b || !b.closest('#dayRecap')) return;
        const k = b.dataset.drc;
        if (k === 'done') close();
        else if (k === 'catchup') { close(); setTimeout(() => { try { W.LowiEveningCatchup.open(); } catch (x) { console.error(x); } }, 360); }
    });
    W.LowiDayRecap = { open, close, isOpen: () => !!sheet(), data, _html: html };
})();
