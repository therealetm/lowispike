/* LOWiSPIKE evening catch-up screen (Oct 26 2026, MAYA-HANDOFF 0.39). The rules are evening-catchup-core.js.
   Emmanuel (call, 26 Oct ~23:30): a beta user, pushing 80, can only use her phone at the end of the day, so she can barely use
   the app; she must be able to catch up on the whole day at night. "A checklist game ... points after points after points,
   animation and everything ... the best bubble checklist ever."
   - The greeting: in the evening (or from mid-afternoon with nothing logged), opening the app shows one gentle card "Ready to
     catch up on your day?" with one big "Catch up on today" and a small "Not now". Once a day. It waits for every other sheet
     and card (LowiRitual.busy), like the Day card does. Any time: Settings, first row "Catch up on today" (data-ec-open).
   - The checklist: a calm twilight-purple screen. One big glowing bubble at a time, standing still. Tap it and it opens into a
     few big choices (her usual foods for that time of day first), "Something else" (a text box; the app's mic sits in it, so
     speaking is optional) and "Skip". A pick pops the bubble: burst, sparkles, "+15" floating up, a buzz where phones buzz,
     and her companion cheers out loud (recorded lines). Then the next bubble drifts in.
   - Nothing is saved until the end: the day is read back in plain words with one big "Save". Meals go in at the usual time of
     day (morning 8:00, noon 12:30, afternoon 15:30, evening 18:30) through the app's own LowiVitalsBridge.logMeal, water through
     .water, movement through LowiMoveBubble.pick, so points follow the reward table and the 8-meal cap, spikes and duplicates.
     Ids are one per day and bubble, so a second catch-up can never count anything twice. Then a calm finish celebration.
   - Picks wait in a draft for today, so closing by mistake loses nothing. Back (swipe or Escape) steps back one screen.
   - Reduce Motion: no drifting, no sparkles; fades only. */
(function (W) {
    'use strict';
    if (!W || !W.document || W.LowiEveningCatchup) return;
    const D = W.document, C = W.LowiEveningCatchupCore;
    if (!C) return;
    const lang = () => { try { return C.L((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || D.documentElement.lang || 'en'); } catch (e) { return 'en'; } };
    const t = () => C.tx(lang());
    const reduced = () => { try { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) || D.documentElement.classList.contains('reduce-motion'); } catch (e) { return false; } };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const S = () => { try { return (W.LowiR2 && W.LowiR2.S && W.LowiR2.S()) || {}; } catch (e) { return {}; } };
    const B = () => W.LowiVitalsBridge || null;
    const today = () => C.dayKey(Date.now());
    const get = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null || (d !== null && typeof d === 'object' && (!v || typeof v !== 'object')) ? d : v; } catch (e) { return d; } }; /* bug hunt 55: a store saved as a number or text gives the default object, not a value that throws on write */
    const put = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
    const buzz = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { } };
    const speak = s => { try { if (s && W.LowiVoice && !(W.LowiAudio && W.LowiAudio.muted && W.LowiAudio.muted())) W.LowiVoice.speak(s, { lang: lang(), queue: false, onlyClips: true }); } catch (e) { } };

    /* today's numbers the points come from */
    function waterNow() { try { const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); return +((f.water || {})[today()]) || 0; } catch (e) { return 0; } }
    /* glasses already paid today: the app's water() pays one ledger entry per glass under herb-care:<day>:water: */
    function waterHave() { const d = today(), pre = 'herb-care:' + d + ':water:'; return (S().ledger || []).filter(e => e && e.day === d && e.src === 'water' && String(e.eventId || '').indexOf(pre) === 0).length; }
    function moved() { const M = W.LowiMoveEstimateCore, d = today(); return (S().ledger || []).some(e => e && e.day === d && M && (e.src === M.SRC || (M.isMove && M.isMove(e)))); }
    function movePlan(level) {
        const M = W.LowiMoveEstimateCore; if (!M || !M.plan) return null;
        const L = S().ledger || [], p = M.plan(L, today(), level, Date.now()); if (!p) return null;
        const gone = (p.removeIds || []).reduce((a, id) => a + L.filter(e => e && e.eventId === id).reduce((x, e) => x + (+e.amt || 0), 0), 0);
        return { xp: p.xp, back: gone, action: p.action };
    }
    function mealsToday() { const d = today(); return (S().logs || []).filter(l => l && (l.day || C.dayKey(+l.ts || 0)) === d).length; }
    function ctx() {
        const b = B();
        return { why: b && b.mealWhy ? d => b.mealWhy(d) : null, spiky: b && b.spiky ? d => b.spiky(d) : null, mealsToday: mealsToday(), water: waterNow(), waterHave: waterHave(), movePlan };
    }
    function analyse(name) { try { return typeof W.analyseMeal === 'function' ? W.analyseMeal(name) || {} : {}; } catch (e) { return {}; } }

    /* her own companion, drawn by the app's companion code (same as the chat), with ids of its own */
    function companionHTML() {
        let svg = '';
        try { const T = W.LowiHerbTamagotchi, c = T && T.current && T.current(); if (c && T.plantHTML) svg = T.plantHTML(c.m, 'node', c.p, { label: t().companion }) || ''; } catch (e) { svg = ''; }
        if (!svg) { const el = D.querySelector('#spBubble .tmg-plant'); svg = el ? el.outerHTML : ''; }
        svg = String(svg).replace(/\blh\d+/g, 'lhec');
        return svg ? '<span class="ec-pal-art">' + svg + '</span>' : '<span class="ec-pal-orb"></span>';
    }
    const ICON = {
        breakfast: '<path d="M12 30h40"/><path d="M18 30a14 14 0 0 1 28 0"/><path d="M32 10v6M18 15l3 4M46 15l-3 4"/>',
        lunch: '<path d="M10 30h44c0 12-10 20-22 20S10 42 10 30z"/><path d="M24 22c0-4 4-4 4-8M34 22c0-4 4-4 4-8"/>',
        dinner: '<path d="M40 12a18 18 0 1 0 12 30A16 16 0 0 1 40 12z"/>',
        snack: '<circle cx="32" cy="36" r="16"/><path d="M32 20c0-5 3-8 8-9"/>',
        water: '<path d="M32 8C24 22 18 30 18 38a14 14 0 0 0 28 0c0-8-6-16-14-30z"/>',
        move: '<circle cx="36" cy="10" r="5"/><path d="M34 18l-8 14 10 6-4 16M26 32l-8 4M36 24l10 6M30 44l-10 10"/>'
    };
    const icon = s => '<svg class="ec-ico" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + (ICON[s] || '') + '</svg>';

    let ov = null, st = null;
    /* st: {list (bubbles), i, view ('bubble'|'choices'|'other'|'pop'|'review'|'finish'|'empty'), picks, last (cheer), busy} */
    function draftSave() { if (st) put(C.DRAFT, { day: today(), i: st.i, picks: st.picks }); }
    function draftLoad() { const d = get(C.DRAFT, null); return d && d.day === today() && Array.isArray(d.picks) ? d : null; }

    function points() { return C.total(C.preview(st.picks, ctx()), false); }
    function paintTop() {
        if (!ov) return;
        const n = st.list.length, dots = st.list.map((s, k) => '<i class="' + (k < st.i ? 'ec-d-done' : k === st.i ? 'ec-d-now' : '') + '"></i>').join('');
        const d = ov.querySelector('.ec-dots'); if (d) { d.innerHTML = dots; d.setAttribute('aria-label', C.fill(t().progress, { i: Math.min(st.i + 1, n), n })); }
        const p = ov.querySelector('.ec-pts-n'); if (p) p.textContent = C.fill(t().points, { n: points() });
    }
    function say(line, voice) {
        const b = ov && ov.querySelector('.ec-say'); if (!b) return;
        b.textContent = line || ''; b.classList.toggle('on', !!line);
        if (voice) speak(line);
    }
    /* Bug hunt 56: a view is swapped in place inside this screen, so it is not a new overlay for fresh-scrim.js. A double tap on
       the big bubble picked the first choice the next view put under the finger (live WebKit iPhone 13: "Eggs" logged 165 ms
       later), and a double tap on Back in "Something else" picked a meal too. mark() gives the new view the same-spot rule. */
    function stage(html, step) {
        const s = ov.querySelector('.ec-stage'); s.innerHTML = html; ov.setAttribute('data-back-step', step);
        try { if (W.LowiFreshScrim && W.LowiFreshScrim.mark) W.LowiFreshScrim.mark(s); } catch (e) { }
        s.classList.remove('ec-in'); void s.offsetWidth; s.classList.add('ec-in');
        paintTop();
        const f = s.querySelector('[data-ec-first]') || s.querySelector('button, input'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } }
    }
    function viewBubble() {
        if (st.i >= st.list.length) return viewReview();
        st.view = 'bubble'; const s = st.list[st.i], T = t();
        stage('<p class="ec-step">' + esc(C.fill(T.step, { i: st.i + 1, n: st.list.length })) + '</p>' +
            '<button type="button" class="ec-bubble ec-b-' + s + (reduced() ? '' : ' ec-drift') + '" data-ec="open" data-ec-first aria-label="' + esc(C.fill(T.bubbleLabel, { name: T.name[s] })) + '">' +
            icon(s) + '<span class="ec-bname" id="ecH">' + esc(T.name[s]) + '</span></button>' +
            '<p class="ec-hint" aria-hidden="true">' + esc(T.tapBubble) + '</p>', 'bubble-' + st.i);
    }
    function viewChoices() {
        st.view = 'choices'; const s = st.list[st.i], T = t(), opts = C.choices(s, { lang: lang(), logs: S().logs || [], now: Date.now() });
        st.opts = opts;
        const meal = C.MEALS.includes(s);
        stage('<div class="ec-mini ec-b-' + s + '" aria-hidden="true">' + icon(s) + '</div>' +
            '<h2 class="ec-q" id="ecH">' + esc(T.q[s]) + '</h2>' +
            '<div class="ec-opts" role="group" aria-labelledby="ecH">' + opts.map((o, k) => '<button type="button" class="ec-opt" data-ec="pick" data-k="' + k + '"' + (k === 0 ? ' data-ec-first' : '') + '>' +
                '<span class="ec-opt-l">' + esc(o.label) + '</span>' + (o.hint ? '<span class="ec-opt-h">' + esc(o.hint) + '</span>' : o.usual ? '<span class="ec-opt-h">' + esc(T.usual) + '</span>' : '') + '</button>').join('') + '</div>' +
            '<div class="ec-row">' + (meal ? '<button type="button" class="ec-soft" data-ec="other">' + esc(T.other) + '</button>' : '') +
            '<button type="button" class="ec-soft" data-ec="skip">' + esc(T.skip) + '</button></div>', 'choices-' + st.i);
        speak(T.q[s]);
    }
    function viewOther() {
        st.view = 'other'; const T = t();
        stage('<h2 class="ec-q" id="ecH">' + esc(T.otherQ) + '</h2>' +
            '<input class="ec-input" type="text" maxlength="60" autocomplete="off" enterkeyhint="done" aria-labelledby="ecH" placeholder="' + esc(T.otherPh) + '" data-ec-first>' +
            '<button type="button" class="ec-big" data-ec="add" disabled>' + esc(T.add) + '</button>' +
            '<button type="button" class="ec-soft ec-wide" data-ec="back">' + esc(T.back) + '</button>', 'other-' + st.i);
    }
    function pick(p) {
        const s = st.list[st.i]; p.slot = s;
        st.picks = st.picks.filter(x => x.slot !== s).concat([p]);
        draftSave();
        const pts = C.preview([p].concat(st.picks.filter(x => x.slot !== s)), ctx())[s];
        /* the order matters for the cap: preview the whole list and read this one */
        const all = C.preview(st.picks, ctx()), got = all[s] != null ? all[s] : pts || 0;
        pop(got, p.label);
    }
    function pop(got, label) {
        st.view = 'pop'; const s = st.list[st.i], T = t(), calm = reduced();
        const sparks = calm ? '' : Array.from({ length: 14 }, (_, k) => '<i style="--a:' + (k * 360 / 14) + 'deg;--d:' + (70 + (k % 3) * 26) + 'px"></i>').join('');
        stage('<div class="ec-popwrap" role="status">' +
            '<div class="ec-bubble ec-b-' + s + ' ec-popping' + (calm ? ' ec-calm' : '') + '" aria-hidden="true">' + icon(s) + '</div>' +
            '<div class="ec-burst" aria-hidden="true">' + sparks + '</div>' +
            '<p class="ec-got">' + esc(label) + '</p>' +
            '<p class="ec-plus' + (got ? '' : ' ec-zero') + '">' + esc(got ? C.fill(T.plus, { n: got }) : T.added) + '</p></div>', 'pop-' + st.i);
        buzz(got ? [18, 40, 28] : 14);
        st.last = C.cheer(lang(), st.last); say(st.last, true);
        const pal = ov.querySelector('.ec-pal'); if (pal && !calm) { pal.classList.remove('ec-cheer'); void pal.offsetWidth; pal.classList.add('ec-cheer'); }
        clearTimeout(st.timer);
        st.timer = setTimeout(() => { if (!ov) return; st.i++; draftSave(); say(''); viewBubble(); }, calm ? 900 : 1500);
    }
    function skip() {
        const s = st.list[st.i]; st.picks = st.picks.filter(x => x.slot !== s).concat([{ slot: s, skip: true }]);
        st.i++; draftSave(); say(''); viewBubble();
    }
    function viewReview() {
        st.view = 'review'; const T = t(), rows = C.summary(st.picks, lang(), ctx().spiky), pv = C.preview(st.picks, ctx());
        if (!rows.length) {
            stage('<h2 class="ec-q" id="ecH">' + esc(T.nothing) + '</h2><button type="button" class="ec-big" data-ec="close" data-ec-first>' + esc(T.done) + '</button>' +
                '<button type="button" class="ec-soft ec-wide" data-ec="again">' + esc(T.again) + '</button>', 'review');
            return;
        }
        const bonus = C.bonusDue(st.picks, S().ledger || [], today()), sum = C.total(pv, bonus);
        stage('<h2 class="ec-q" id="ecH">' + esc(T.review) + '</h2>' +
            '<ul class="ec-list">' + rows.map(r => '<li><span class="ec-l-h">' + esc(r.head) + '</span><span class="ec-l-w">' + esc(r.what) +
                (r.spike ? '<span class="ec-l-s">' + esc(T.spike) + '</span>' : '') + '</span>' +
                '<span class="ec-l-p">' + (pv[r.slot] ? esc(C.fill(T.plus, { n: pv[r.slot] })) : '') + '</span></li>').join('') +
            (bonus ? '<li class="ec-l-bonus"><span class="ec-l-h">\u2605</span><span class="ec-l-w">' + esc(T.bonus) + '</span><span class="ec-l-p">' + esc(C.fill(T.plus, { n: C.BONUS.xp })) + '</span></li>' : '') + '</ul>' +
            '<p class="ec-total">' + esc(C.fill(T.points, { n: sum })) + '</p>' +
            '<button type="button" class="ec-big" data-ec="save" data-ec-first>' + esc(T.save) + '</button>' +
            '<button type="button" class="ec-soft ec-wide" data-ec="again">' + esc(T.again) + '</button>', 'review');
        say(C.LINES[lang()].review, true);
    }
    /* Save: everything through the app's own code, in the order of the day */
    function save() {
        if (st.saving) return; st.saving = true;
        const b = B(), day = today(), now = Date.now(), before = +S().xp || 0, L0 = (S().ledger || []).length;
        const bonus = C.bonusDue(st.picks, S().ledger || [], day);
        let n = 0;
        C.plan(st.picks, now).forEach(p => {
            try {
                if (C.MEALS.includes(p.slot)) {
                    if (!b || !b.logMeal) return;
                    const d = Object.assign({}, p.data, { id: C.entryId(day, p.slot), ts: p.at, slot: p.slot === 'snack' ? 'snack' : 'meal', via: 'catchup' });
                    W.LowiMealCtx = { from: 'when', ateAt: p.at, at: Date.now() };
                    b.logMeal(d); n++;
                } else if (p.slot === 'water') {
                    if (b && b.water) { b.water(C.entryId(day, 'water'), +p.cups || 1); n++; }
                } else if (p.slot === 'move') {
                    if (W.LowiMoveBubble && W.LowiMoveBubble.pick) { W.LowiMoveBubble.pick(p.level, null); n++; }
                }
            } catch (e) { }
        });
        try { W.LowiMealCtx = null; } catch (e) { }
        if (bonus && n >= C.BONUS.min && b && b.awardWith) { try { b.awardWith(C.BONUS.xp, C.BONUS.label, C.BONUS.src, C.bonusId(day), {}, true); } catch (e) { } }
        const after = +S().xp || 0, earned = Math.max(0, after - before) || (S().ledger || []).slice(L0).reduce((a, e) => a + (+e.amt || 0), 0);
        put(C.DRAFT, null);
        const stt = get(C.STORE, {}) || {}; stt.done = day; stt.seen = day; put(C.STORE, stt);
        try { W.dispatchEvent(new CustomEvent('lowi:catchup-saved', { detail: { day, n, xp: earned } })); } catch (e) { }
        viewFinish(earned);
    }
    function viewFinish(earned) {
        st.view = 'finish'; const T = t(), night = new Date().getHours() >= 18 || new Date().getHours() < 4, calm = reduced();
        const lv = levelLine();
        stage('<div class="ec-fin' + (calm ? ' ec-calm' : '') + '">' +
            '<div class="ec-fin-glow" aria-hidden="true"><i></i><i></i><i></i>' + companionHTML() + '</div>' +
            '<h2 class="ec-q" id="ecH">' + esc(T.saved) + '</h2>' +
            '<p class="ec-total ec-count" data-n="' + earned + '">' + esc(C.fill(T.plus, { n: calm ? earned : 0 })) + '</p>' +
            (lv ? '<p class="ec-lv">' + esc(lv) + '</p>' : '') + '</div>' +
            '<button type="button" class="ec-big" data-ec="close" data-ec-first>' + esc(night ? T.night : T.done) + '</button>', 'finish');
        ov.classList.add('ec-finished');
        say(night ? C.LINES[lang()].finish : C.LINES[lang()].finishDay, true);
        buzz([20, 60, 20, 60, 40]);
        if (!calm) countUp(ov.querySelector('.ec-count'), earned);
    }
    /* the companion's level line as the app shows it on its card, when the app tells it */
    function levelLine() { try { const s = W.LowiSpirit && W.LowiSpirit.levelText && W.LowiSpirit.levelText(); return s ? String(s) : ''; } catch (e) { return ''; } }
    function countUp(el, n) {
        if (!el || !n) return; const T = t(), t0 = performance.now(), dur = 900;
        const step = now => { if (!el.isConnected) return; const k = Math.min(1, (now - t0) / dur); el.textContent = C.fill(T.plus, { n: Math.round(n * (1 - Math.pow(1 - k, 3))) }); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
    }
    function onClick(e) {
        const btn = e.target.closest && e.target.closest('[data-ec]'); if (!btn || !ov || st.view === 'pop' && btn.getAttribute('data-ec') !== 'close') return;
        const a = btn.getAttribute('data-ec');
        if (a === 'close') return close();
        if (a === 'open') { buzz(10); return viewChoices(); }
        if (a === 'pick') {
            const o = st.opts && st.opts[+btn.getAttribute('data-k')]; if (!o) return;
            const s = st.list[st.i];
            if (s === 'water') return pick({ cups: o.cups, label: o.label });
            if (s === 'move') return pick({ level: o.level, label: o.label });
            const an = o.usual ? { lvl: o.lvl, r: o.r } : analyse(o.a || o.t);
            return pick({ label: o.label, data: { t: o.t, lvl: an.lvl || '', r: an.r != null ? an.r : (an.rec || '') } });
        }
        if (a === 'other') return viewOther();
        if (a === 'back') return viewChoices();
        if (a === 'skip') return skip();
        if (a === 'add') {
            const v = (ov.querySelector('.ec-input') || {}).value; const s = String(v || '').trim().slice(0, 60); if (!s) return;
            const an = analyse(s); return pick({ label: s, data: { t: s, lvl: an.lvl || '', r: an.r != null ? an.r : '' } });
        }
        if (a === 'save') return save();
        if (a === 'again') { st.picks = []; st.i = 0; draftSave(); say(''); return viewBubble(); }
    }
    function onInput(e) { if (e.target && e.target.classList && e.target.classList.contains('ec-input')) { const b = ov.querySelector('[data-ec="add"]'); if (b) b.disabled = !String(e.target.value || '').trim(); } }
    function onKey(e) {
        if (!ov) return;
        if (e.key === 'Enter' && e.target && e.target.classList && e.target.classList.contains('ec-input')) { e.preventDefault(); const b = ov.querySelector('[data-ec="add"]'); if (b && !b.disabled) b.click(); return; }
        if (e.key !== 'Escape') return;
        e.preventDefault(); e.stopPropagation();
        /* back steps back one screen; from a bubble (or the end) it closes */
        if (st.view === 'other') return viewChoices();
        if (st.view === 'choices') return viewBubble();
        if (st.view === 'review' && st.list.length) { st.i = st.list.length - 1; return viewBubble(); }
        if (st.view === 'pop') return;
        close();
    }
    function trap(e) {
        if (!ov || e.key !== 'Tab') return;
        const f = Array.from(ov.querySelectorAll('button:not([disabled]), input')).filter(x => x.offsetParent !== null); if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && D.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && D.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function open(o) {
        o = o || {};
        if (ov) return true;
        hideGreet();
        const list = C.needed({ logs: S().logs || [], day: today(), water: waterNow(), moved: moved() });
        const d = draftLoad();
        st = { list, i: 0, picks: [], view: '', last: '' };
        if (d) { st.picks = d.picks.filter(p => p && list.includes(p.slot)); st.i = Math.max(0, Math.min(list.length, +d.i || 0)); }
        const T = t();
        ov = D.createElement('div');
        ov.id = 'ecOv'; ov.className = 'ec-ov' + (reduced() ? ' ec-reduced' : '');
        ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'ecH'); ov.setAttribute('data-noi18n', '');
        ov.setAttribute('lang', lang());
        ov.innerHTML = '<div class="ec-sky" aria-hidden="true"></div>' +
            '<div class="ec-top"><div class="ec-dots" role="img"></div><p class="ec-pts" aria-live="polite"><span aria-hidden="true">\u2605 </span><span class="ec-pts-n"></span></p>' +
            '<button type="button" class="ec-x" data-ec="close" aria-label="' + esc(T.close) + '"><span aria-hidden="true">\u00d7</span></button></div>' +
            '<div class="ec-stage"></div>' +
            '<div class="ec-pal" aria-hidden="true">' + companionHTML() + '</div><p class="ec-say" role="status" aria-live="polite"></p>';
        D.body.appendChild(ov);
        D.documentElement.classList.add('ec-open');
        ov.addEventListener('click', onClick);
        ov.addEventListener('input', onInput);
        ov.addEventListener('keydown', onKey);
        ov.addEventListener('keydown', trap);
        st.back = e => onKey(e); D.addEventListener('keydown', st.back, true);
        requestAnimationFrame(() => { if (ov) ov.classList.add('on'); });
        if (!list.length) { st.view = 'empty'; stage('<h2 class="ec-q" id="ecH">' + esc(T.allDone) + '</h2><button type="button" class="ec-big" data-ec="close" data-ec-first>' + esc(T.done) + '</button>', 'empty'); say(T.allDone, true); }
        else viewBubble();
        const stt = get(C.STORE, {}) || {}; stt.seen = today(); put(C.STORE, stt);
        try { W.dispatchEvent(new CustomEvent('lowi:catchup-open', { detail: { from: o.from || '' } })); } catch (e) { }
        return true;
    }
    function close() {
        if (!ov) return;
        const el = ov; clearTimeout(st && st.timer);
        if (st && st.back) D.removeEventListener('keydown', st.back, true);
        ov = null; D.documentElement.classList.remove('ec-open');
        el.classList.remove('on'); el.setAttribute('aria-hidden', 'true'); el.removeAttribute('role'); el.removeAttribute('aria-modal');
        setTimeout(() => { try { el.remove(); } catch (e) { } }, reduced() ? 0 : 320);
        const back = D.querySelector('#spBubble') || D.body; try { back.focus && back.focus({ preventScroll: true }); } catch (e) { }
        st = null;
    }

    /* ---------- the evening greeting ---------- */
    let hi = null, quiet = 0;
    /* setup finished (or skipped) and not half-way through it */
    function onboarded() { const s = S(); return !!(s && s.onboarded && !s.setupMid); }
    function due() {
        const s = S();
        return C.shouldGreet({ now: Date.now(), logs: s.logs || [], state: get(C.STORE, {}) || {}, water: waterNow(), moved: moved(), activity: (s.ledger || []).filter(e => e && e.day === today()).length, onboarded: onboarded() });
    }
    function busy() {
        if (D.hidden || ov || hi) return true;
        try { if (W.LowiRitual && W.LowiRitual.busy && W.LowiRitual.busy()) return true; } catch (e) { }
        if (D.querySelector('[aria-modal="true"]:not([aria-hidden="true"]), .r2-ov.on')) return true;
        return false;
    }
    function showGreet() {
        const T = t();
        hi = D.createElement('div'); hi.id = 'ecHi'; hi.className = 'ec-hi' + (reduced() ? ' ec-reduced' : '');
        hi.setAttribute('role', 'dialog'); hi.setAttribute('aria-modal', 'true'); hi.setAttribute('aria-labelledby', 'ecHiH'); hi.setAttribute('data-noi18n', ''); hi.setAttribute('lang', lang());
        hi.innerHTML = '<div class="ec-hi-card"><div class="ec-hi-pal" aria-hidden="true">' + companionHTML() + '</div>' +
            '<h2 class="ec-hi-h" id="ecHiH">' + esc(T.greet) + '</h2>' +
            '<button type="button" class="ec-big" data-hi="go">' + esc(T.go) + '</button>' +
            '<button type="button" class="ec-soft ec-wide" data-hi="later">' + esc(T.later) + '</button></div>';
        D.body.appendChild(hi);
        const stt = get(C.STORE, {}) || {}; stt.seen = today(); put(C.STORE, stt);
        hi.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-hi]'); if (!b) return; if (b.getAttribute('data-hi') === 'go') open({ from: 'greet' }); else hideGreet(); });
        hi.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hideGreet(); } });
        requestAnimationFrame(() => { if (hi) { hi.classList.add('on'); const b = hi.querySelector('[data-hi="go"]'); try { b.focus({ preventScroll: true }); } catch (e) { } } });
        speak(T.greet);
    }
    function hideGreet() {
        if (!hi) return; const el = hi; hi = null;
        el.classList.remove('on'); el.setAttribute('aria-hidden', 'true'); el.removeAttribute('role'); el.removeAttribute('aria-modal');
        setTimeout(() => { try { el.remove(); } catch (e) { } }, reduced() ? 0 : 300);
    }
    function tick() {
        if (busy() || !due()) { quiet = 0; return; }
        if (++quiet < 2) return;   /* two quiet ticks in a row, like the Day card */
        quiet = 0; showGreet();
    }
    /* the first row of Settings (and the hub), plus any element with data-ec-open */
    D.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-ec-open]'); if (!b) return; e.preventDefault(); setTimeout(() => open({ from: b.getAttribute('data-ec-open') || 'button' }), 60); });
    setInterval(tick, 4000);
    D.addEventListener('visibilitychange', () => { quiet = 0; });

    W.LowiEveningCatchup = { open, close, isOpen: () => !!ov, greet: () => { if (!hi && !ov) showGreet(); }, due, _state: () => st };
})(typeof window !== 'undefined' ? window : null);
