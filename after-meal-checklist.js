/* After-meal checklist card (Oct 25 2026, Emmanuel: "after they log their meal and also if they just ate it ... instant reduction
   tips checklist which they get extra points for ... Secret achievement."). Model and sources: after-meal-checklist-core.js.
   - Opens only for a meal eaten just now (Fuel's "When did you eat?" = Now, or Gap's "I just ate"); a backdated meal never does.
   - A small glass card docked at the bottom of the screen, never modal: logging, sheets and the world stay usable. It waits while
     a sheet (the "Meal logged" result, Gap, the tour) is open and comes back when it closes.
   - Each tick pays XP once through LowiVitalsBridge.awardWith (the normal ledger, so it syncs and shows in the level), only within
     60 minutes of the meal and for at most three meals a day. Deleting the meal takes its ticks back.
   - The first full checklist unlocks a hidden achievement; nothing hints at it before.
   - The x skips it with one tap. Quiet by design: no notification, no post, no What's New.
   - Oct 25 evening (Emmanuel: four taps in seconds paid 12 XP, Spike Tamer and a level-up; water paid but the Home cup bubble
     stayed put): walk / squats / upright start a timer on the first tap and only count after the timer ran out AND a second
     tap confirms it (C.start / C.claim). The card says it is a timer, not tracking. The glass of water is gone (it paid points
     but never reached the Home water bubble); Emmanuel had it replaced by a real spike flattener: stairs up and down, 6 min. */
(function () {
    'use strict';
    const W = window, D = document;
    if (W.LowiAfterMeal) return;
    const C = W.LowiAfterMealCore; if (!C) return;
    const KEY = 'lowi.pmc.v1';
    let P = null, el = null, timer = 0, hideT = 0, finT = 0, note = '';

    const lang = () => { try { return (W.LowiLang.get() || 'en').slice(0, 2); } catch (e) { return ((D.documentElement && D.documentElement.lang) || 'en').slice(0, 2); } };
    const s = (k, v) => C.t(lang(), k, v);
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const B = () => W.LowiVitalsBridge || null;
    const ledger = () => { try { const st = B() && B().state(); return (st && Array.isArray(st.ledger)) ? st.ledger : []; } catch (e) { return []; } };
    function name() {
        try { const b = W.LowiBirthCompanion; if (b && b.has && b.has()) { const c = b.get(), n = c && String(c.name || '').trim(); if (n) return n.slice(0, 24); } } catch (e) { }
        return 'Misty';
    }
    function load() { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.id && +v.ts ? v : null; } catch (e) { return null; } }
    function save() { try { if (P) localStorage.setItem(KEY, JSON.stringify(P)); else localStorage.removeItem(KEY); } catch (e) { } }
    /* another tab may have moved on: take its ticks and keep the earliest start of each timer before changing anything */
    function sync() {
        const o = load(); if (!o || !P || o.id !== P.id) return;
        o.done && o.done.forEach(i => { if (P.done.indexOf(i) < 0) P.done.push(i); });
        const run = Object.assign({}, P.run || {});
        Object.keys(o.run || {}).forEach(i => { if (+o.run[i] > 0 && (!(+run[i] > 0) || +o.run[i] < +run[i])) run[i] = +o.run[i]; });
        P.run = run; if (o.skip) P.skip = true; if (o.fin) P.fin = true;
    }

    const ICON = {
        walk: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="4.5" r="2"/><path d="M10 21l2.2-6 2.8 2.6V21M8 11.5l3-3.5 3 1.5 2 3.5h3M11 8l-1.6 6.5"/></svg>',
        muscle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/></svg>',
        stairs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20h5v-4h4v-4h4V8h5"/><path d="M15 3.5l3 3" opacity=".6"/></svg>',
        upright: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M12 8v7M9 21l3-6 3 6M8 11h8"/></svg>',
        wave: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 15c3.5-6 6.5-6 10 0s6.5 6 10 0"/><path d="M2 15h20" opacity=".35"/></svg>',
        tick: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
        x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
        star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>'
    };

    /* a sheet, the Gap view, the tour or a dialog is open, or another tab than Home shows: wait */
    function vis(n) { if (!n || !n.getClientRects().length) return false; const cs = getComputedStyle(n); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; }
    function blocker() {
        if (D.visibilityState === 'hidden') return 'hidden';
        const tab = D.documentElement.getAttribute('data-lg-tab'); if (tab && tab !== 'home') return 'tab:' + tab;
        for (const n of D.querySelectorAll('.r2-ov.on, .gv-ov, .lt-tour, [aria-modal="true"], [role="dialog"].on, [role="dialog"].open')) if (n !== el && !(el && el.contains(n)) && vis(n)) return n.id || String(n.className).slice(0, 40) || n.tagName;
        return '';
    }
    const blocked = () => !!blocker();

    function prog() { const d = (P && P.done || []).length; return s('prog', { d, n: C.ITEMS.length, x: paidXp() }); }
    /* the header line: before any tick "60 min left · +3 XP each", after a tick "1/4 · +3 XP · 58 min left" */
    function sub(now) { const m = C.minsLeft(P, now), head = P.done.length ? prog() : s('each', { x: C.XP_EACH }); return m > 0 ? head + ' \u00b7 ' + s('left', { m }) : head; }
    /* small screens: when the open card would cover a Home bubble or the joystick, it starts folded (one tap opens it) */
    function coversRing() {
        if (!el) return false; const g = el.getBoundingClientRect(), top = el.offsetTop, bottom = top + el.offsetHeight;   /* layout box: the slide-in transform must not hide an overlap */
        for (const b of D.querySelectorAll('.wh-cell, #whPad, #spBubble')) { const q = b.getBoundingClientRect(); if (q.width < 10 || !vis(b)) continue; if (!(q.right <= g.left || q.left >= g.right || q.bottom <= top - 4 || q.top >= bottom)) return true; }
        return false;
    }
    function paidXp() { if (!P) return 0; const L = ledger(); return C.ITEMS.reduce((a, it) => a + (L.some(e => e && e.eventId === C.eventId(P.id, it.id)) ? C.XP_EACH : 0), 0); }
    /* the second line of a tile: why it helps; for a timed one "Tap to start · 10 min", then "9:41 left", then "Done? Tap to confirm" */
    function line(it, now) {
        const l = lang();
        if (P.done.indexOf(it.id) >= 0) return C.why(it, l);
        if (C.timed(it.id)) {
            if (C.ready(P, it.id, now)) return s('confirm');
            if (C.live(P, it.id, now)) return s('run', { t: C.clock(C.remaining(P, it.id, now)) });
            return s('start', { d: C.durText(it.id, l) });
        }
        return C.why(it, l);
    }
    function state(it, now) { return P.done.indexOf(it.id) >= 0 ? 'on' : C.ready(P, it.id, now) ? 'ready' : C.live(P, it.id, now) ? 'run' : ''; }
    function tiles(now) {
        const l = lang();
        return C.ITEMS.map(it => {
            const st = state(it, now), on = st === 'on';
            return '<button type="button" class="pmc-it' + (st ? ' ' + st : '') + '" role="checkbox" aria-checked="' + on + '" data-pmc="' + it.id + '">' +
                '<span class="pmc-ic">' + (on ? ICON.tick : ICON[it.id]) + '</span><span class="pmc-tx"><b>' + esc(C.label(it, l)) + '</b><small>' + esc(line(it, now)) + '</small></span>' +
                '<span class="pmc-xp" aria-hidden="true">+' + C.XP_EACH + '</span></button>';
        }).join('');
    }
    /* once a second: count the running timers down; a timer that ran out redraws its tile as "Done? Tap to confirm" */
    function tickTiles(now) {
        if (!el || P.fold) return;
        for (const it of C.ITEMS) {
            const b = el.querySelector('[data-pmc="' + it.id + '"]'); if (!b) continue;
            const st = state(it, now), had = b.classList.contains('ready') ? 'ready' : b.classList.contains('run') ? 'run' : b.classList.contains('on') ? 'on' : '';
            if (st !== had) { paint(); return; }
            const m = b.querySelector('small'), want = line(it, now); if (m && m.textContent !== want) m.textContent = want;
        }
    }
    /* while a timer runs, the honest line takes the place of the intro line (same two-line slot), so a started timer never makes
       the card taller: a taller card overlapped a Home bubble in DE/ES and mount() folded it after a reload */
    function paint() {
        if (!el || !P) return;
        const now = Date.now(), honest = note === s('honest') || C.running(P, now).length > 0, foot = note === s('honest') ? '' : note;
        el.classList.toggle('fold', !!P.fold);
        el.innerHTML =
            '<div class="pmc-hd"><button type="button" class="pmc-hb" data-pmc="fold" aria-expanded="' + !P.fold + '" aria-label="' + esc(s(P.fold ? 'open' : 'fold')) + '">' +
            '<span class="pmc-wave">' + ICON.wave + '</span><span class="pmc-ht"><b>' + esc(s('title')) + '</b><small>' + esc(sub(now)) + '</small></span></button>' +
            '<button type="button" class="pmc-x" data-pmc="skip" aria-label="' + esc(s('skip')) + '" title="' + esc(s('skip')) + '">' + ICON.x + '</button></div>' +
            (P.fold ? '' : '<p class="pmc-say" aria-live="polite"><b>' + esc(name()) + '</b> \u00b7 ' + esc(s(honest ? 'honest' : P.spike ? 'subSpike' : 'sub')) + '</p><div class="pmc-grid">' + tiles(now) + '</div>' +
                '<p class="pmc-ft" aria-live="polite">' + esc(foot) + '</p>');
    }
    function paintFinal(ach) {
        if (!el) return;
        el.classList.remove('fold'); el.classList.add('fin');
        el.innerHTML = ach
            ? '<div class="pmc-ach" role="status"><span class="pmc-star">' + ICON.star + '</span><span class="pmc-ht"><small>' + esc(s('achHead')) + '</small><b>' + esc(s('achName')) + '</b><small>' + esc(s('achText', { x: C.ACH.xp })) + '</small></span>' +
              '<button type="button" class="pmc-x" data-pmc="close" aria-label="' + esc(s('skip')) + '">' + ICON.x + '</button></div>'
            : '<div class="pmc-hd pmc-done" role="status"><span class="pmc-wave">' + ICON.tick + '</span><span class="pmc-ht"><b>' + esc(s('done')) + '</b><small>' + esc(note || prog()) + '</small></span>' +
              '<button type="button" class="pmc-x" data-pmc="close" aria-label="' + esc(s('skip')) + '">' + ICON.x + '</button></div>';
        clearTimeout(hideT); hideT = setTimeout(remove, ach ? 9000 : 4500);
        /* the loop has stopped by now: keep the closing card out of the way of a sheet or another page opened while it shows (it sits above almost everything) */
        clearInterval(finT); finT = setInterval(() => { if (!el || !el.isConnected) { clearInterval(finT); finT = 0; return; } const b = blocked(); if (el.hidden !== b) el.hidden = b; }, 250);
        if (blocked()) el.hidden = true;
    }

    function mount() {
        if (el) return el;
        el = D.createElement('section');
        el.className = 'pmc'; el.id = 'pmcCard';
        el.setAttribute('role', 'region'); el.setAttribute('aria-label', s('region'));
        el.addEventListener('click', onTap);
        D.body.appendChild(el);
        paint();
        settleFold(0);
        return el;
    }
    /* the fold is decided once the Home ring has settled: html.wh-home places the joystick in the ring; before that it sits at
       its boot spot low on the screen, and an early check folded the card for good although nothing was covered. A real
       overlap has to show on two checks in a row. */
    let foldT = 0;
    function settleFold(n, seen) {
        clearTimeout(foldT);
        foldT = setTimeout(() => {
            if (!el || !P || P.fold || P.opened || el.classList.contains('fin')) return;
            if (el.hidden || !D.documentElement.classList.contains('wh-home')) { if (n < 20) settleFold(n + 1, 0); return; }
            if (!coversRing()) return;
            if (!seen) { settleFold(n + 1, 1); return; }
            P.fold = true; save(); paint();
        }, 450);
    }
    function remove() { clearTimeout(hideT); clearTimeout(foldT); clearInterval(finT); finT = 0; if (el) { el.remove(); el = null; } }

    function onTap(e) {
        const b = e.target.closest('[data-pmc]'); if (!b || !P) { if (b && b.dataset.pmc === 'close') remove(); return; }
        const k = b.dataset.pmc;
        if (k === 'close') { remove(); return; }
        if (k === 'skip') { P.skip = true; save(); stop(); remove(); return; }
        if (k === 'fold') { P.fold = !P.fold; if (!P.fold) P.opened = true; save(); paint(); return; }
        tick(k, b);
    }
    function tick(item, b) {
        if (!P || C.IDS.indexOf(item) < 0) return;
        sync();
        if (P.done.indexOf(item) >= 0) { paint(); return; }
        const now = Date.now();
        if (!C.open(P, now)) { stop(); remove(); return; }
        if (C.timed(item) && !C.live(P, item, now)) {   /* first tap: start the timer, pay nothing */
            const st = C.start(P, item, now);
            if (st.ok) { P = st.p; note = s('honest'); save(); } else if (st.why === 'late') note = s('late');
            paint(); return;
        }
        if (C.timed(item) && !C.ready(P, item, now)) { note = s('honest'); paint(); return; }   /* tapping a running timer does nothing */
        const r = C.claim(ledger(), P, item, now);
        if (!r.complete) { if (r.why === 'expired' && P.run) { delete P.run[item]; save(); } paint(); return; }
        let got = 0;
        if (r.ok && B() && B().awardWith) { try { got = +B().awardWith(r.xp, C.LABEL, C.SRC, r.eventId, { meal: P.id, item }, true) || 0; } catch (x) { got = 0; } }
        note = r.why === 'cap' ? s('cap') : '';
        P.done.push(item); save();
        if (b && got) { const pop = D.createElement('span'); pop.className = 'pmc-pop'; pop.setAttribute('aria-hidden', 'true'); pop.textContent = '+' + got + ' XP'; b.appendChild(pop); }
        if (C.full(P.done)) { finish(); return; }
        paint();
    }
    function finish() {
        const unlock = C.shouldUnlock(ledger(), P.done);
        let ach = false;
        if (unlock && B() && B().awardWith) { try { ach = +B().awardWith(C.ACH.xp, C.ACH.label, C.SRC, C.ACH.eventId, { ach: C.ACH.id }, true) > 0; } catch (x) { ach = false; } }
        P.fin = true; save(); stop();
        setTimeout(() => paintFinal(ach), 450);
    }

    /* take the ticks of a meal back (it was deleted, or moved to an earlier time): XP and entries go together */
    function drop(id) {
        if (!P || P.id !== id) return;
        const b = B();
        if (b && b.unaward) C.IDS.concat(['water']).forEach(id => { try { b.unaward(C.eventId(P.id, id)); } catch (x) { } });   /* water: a tick from before Oct 25 evening */
        P = null; save(); stop(); remove();
    }

    function loop() {
        if (!P || !C.open(P, Date.now())) { if (P && !P.fin && C.minsLeft(P, Date.now()) <= 0) { P = null; save(); } stop(); if (el && !el.classList.contains('fin')) remove(); return; }
        if (el && !el.isConnected) el = null;   /* something else removed the node: draw it again */
        if (blocked()) { if (el) el.hidden = true; return; }
        if (!el) mount(); else if (el.hidden) { el.hidden = false; paint(); }
        else { const m = el.querySelector('.pmc-ht small'); if (m && !el.classList.contains('fin')) { const now = Date.now(), want = sub(now); if (m.textContent !== want) m.textContent = want; tickTiles(now); } }
    }
    function go() { if (!timer) timer = setInterval(loop, 1000); setTimeout(loop, 1200); }
    function stop() { if (timer) { clearInterval(timer); timer = 0; } }

    W.addEventListener('lowi:meal-logged', ev => {
        const d = ev && ev.detail, now = Date.now();
        if (!C.justAte(d, now)) return;
        if (P && P.id === String(d.id)) return;   /* the same meal announced again: keep its ticks and its skip */
        P = C.pending(d, now); note = ''; save(); remove(); go();
    });
    W.addEventListener('lowi:meal-removed', ev => { const d = ev && ev.detail || {}; if (d.id) drop(String(d.id)); });
    W.addEventListener('lowi:meal-moved', ev => { const d = ev && ev.detail || {}; if (P && d.id && String(d.id) === P.id && !C.justAte({ id: P.id, ts: d.ts }, P.at)) drop(P.id); });
    D.addEventListener('visibilitychange', () => { if (D.visibilityState === 'visible' && P) go(); });
    W.addEventListener('lowi:lang', () => { if (el && !el.classList.contains('fin')) { el.setAttribute('aria-label', s('region')); paint(); } });

    P = load();
    if (P && !P.run) P.run = {};
    if (P && C.open(P, Date.now())) go(); else if (P && !P.fin && C.minsLeft(P, Date.now()) <= 0) { P = null; save(); }

    W.LowiAfterMeal = { state: () => (P ? JSON.parse(JSON.stringify(P)) : null), tick: item => tick(item, el && el.querySelector('[data-pmc="' + item + '"]')), skip: () => { if (P) { P.skip = true; save(); } stop(); remove(); }, shown: () => !!(el && !el.hidden), waitingFor: () => blocker() };
})();
