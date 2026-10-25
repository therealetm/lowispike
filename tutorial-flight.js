/* tutorial-flight.js: her first real flight after the first finished tour (Oct 25 2026, Emmanuel: "after the very first completed tour
   the companion starts a real, tidy autopilot flight: into a cell world and out again, to the edge of the universe/nebula, back into the
   bubble and through the currents home. No teleporting. Any touch hands control back immediately, and it makes no tracking entries").

   It is the real autopilot (misty-pad mode 'auto', misty-flight.js tour + misty-explore.js excursion), only ordered and tuned for once:
     1. the normal autopilot tour until she has been INSIDE a cell world and come out again (the excursion is held back till then)
     2. the excursion right away: out through her world's edge, atmosphere points out at the spirit world's soft outer edge
        (misty-galaxy.js GAL.R; PLAN.RIN/ROUT are in her world's reaches), a short string tour along the currents, and home
     3. back in her world: autopilot off, everything put back.
   She flies all the way (no _probe, no jumps). Any touch, key or wheel hands control back at once (pad mode 'drive'). misty-pad's
   setMode is used, never userMode, so LowiAdventure (her timed adventure, sun) never starts: autopilot flights make no tracking entries.
   Once per ACCOUNT: the record is a lowispike.* key, so it follows the account to the iPad/iPhone and is never shown twice; it is
   written when she takes off, so an interrupted first flight is not replayed either. */
(function () {
    'use strict';
    if (typeof window === 'undefined') { if (typeof module !== 'undefined') module.exports = {}; return; }
    const W = window, D = document, H = D.documentElement, KEY = 'lowispike.first-flight.v1';
    const PLAN = { AFTER: 1500, POLL: 400, MAX: 420, RIN: 19, ROUT: 20, PTS: 1, LIM_ATMOS: 80, LIM_EDGE: 40, TOUR: 75, LIM_HOME: 90 };
    const rec = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
    const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } };
    let run = null, pollT = 0, waitT = 0;
    const X = () => (W.LowiMistyExplore && W.LowiMistyExplore.X) || null;
    function emit(d) { try { W.dispatchEvent(new CustomEvent('lowi:first-flight', { detail: d })); } catch (e) { } }
    function ready() {
        return !!(W.LowiPad && W.LowiMistyFlight && X()) && H.classList.contains('wh-world-live') && !(W.LowiTutorial && W.LowiTutorial.isOn && W.LowiTutorial.isOn());
    }
    function tune() {
        const x = X(); if (!x) return null;
        const keep = { FIRST: x.FIRST, EVERY: x.EVERY, RIN: x.RIN, ROUT: x.ROUT, PTS: x.PTS, TOUR: x.TOUR, atmos: x.LIM.atmos, edge: x.LIM.edge, home: x.LIM.home };
        x.FIRST = x.EVERY = 1e9;   /* no excursion before the cell world */
        x.RIN = PLAN.RIN; x.ROUT = PLAN.ROUT; x.PTS = PLAN.PTS; x.TOUR = PLAN.TOUR; x.LIM.atmos = PLAN.LIM_ATMOS; x.LIM.edge = PLAN.LIM_EDGE; x.LIM.home = PLAN.LIM_HOME;
        return keep;
    }
    function untune(k) {
        const x = X(); if (!x || !k) return;
        x.FIRST = k.FIRST; x.EVERY = k.EVERY; x.RIN = k.RIN; x.ROUT = k.ROUT; x.PTS = k.PTS; x.TOUR = k.TOUR; x.LIM.atmos = k.atmos; x.LIM.edge = k.edge; x.LIM.home = k.home;
    }
    const touch = () => handBack('touch');
    function listen(on) {
        ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(t => { if (on) W.addEventListener(t, touch, { capture: true, passive: true }); else W.removeEventListener(t, touch, { capture: true }); });
    }
    function start(why) {
        if (run || !ready()) return false;
        const keep = tune(); if (!keep) return false;
        run = { t0: Date.now(), keep, inside: false, exDue: false, ph: [], far: 0, home: false };
        save({ at: new Date().toISOString(), v: 1, why: why || 'first-tour' });
        H.classList.add('lowi-first-flight');
        try { W.LowiPad.mode('auto'); } catch (e) { }
        setTimeout(() => { if (run) listen(true); }, 250);   /* the tap that ended the tour is not a hand-back */
        clearInterval(pollT); pollT = setInterval(poll, PLAN.POLL);
        emit({ start: true });
        return true;
    }
    function poll() {
        if (!run) return;
        let F = {}, E = {}, G = {};
        try { F = W.LowiMistyFlight.state() || {}; } catch (e) { }
        try { E = W.LowiMistyExplore.state() || {}; } catch (e) { }
        try { G = (W.LowiMistyGalaxy && W.LowiMistyGalaxy.state()) || {}; } catch (e) { }
        if (F.st === 'inside') run.inside = true;
        if (run.inside && F.st !== 'inside' && !run.exDue) { run.exDue = true; const x = X(); if (x) x.FIRST = x.EVERY = 0; }
        if (E.ph && run.ph[run.ph.length - 1] !== E.ph) run.ph.push(E.ph);
        run.far = Math.max(run.far, +G.far || 0);
        if (run.ph.indexOf('home') >= 0 && !E.ph) run.home = true;
        if (W.LowiPad.state && W.LowiPad.state().pad !== 'auto') { finish('mode'); return; }
        if (run.home && run.exDue) { finish('home'); return; }
        if ((Date.now() - run.t0) / 1000 > PLAN.MAX) finish('time');
    }
    function finish(why) {
        if (!run) return;
        const r = run; run = null; clearInterval(pollT); pollT = 0; listen(false);
        untune(r.keep); H.classList.remove('lowi-first-flight');
        if (why === 'home' || why === 'time') { try { if (W.LowiPad.state().pad === 'auto') W.LowiPad.mode(''); } catch (e) { } }
        const out = Object.assign({}, rec() || {}, { end: why, inside: r.inside, phases: r.ph, far: r.far, s: Math.round((Date.now() - r.t0) / 1000) });
        save(out); emit(out);
    }
    function handBack(why) {
        if (!run) return;
        try { W.LowiPad.mode('drive'); } catch (e) { }
        finish(why || 'touch');
    }
    function maybe() {
        clearTimeout(waitT);
        if (rec()) return;
        if (!ready()) { waitT = setTimeout(maybe, 1500); return; }
        start('first-tour');
    }
    W.addEventListener('lowi:tutorial', e => {
        const d = (e && e.detail) || {};
        if (d.reason === 'finished' && !d.news) { clearTimeout(waitT); waitT = setTimeout(maybe, PLAN.AFTER); }
    });
    W.LowiFirstFlight = { PLAN, KEY, rec, start, finish, handBack, state: () => (run ? { on: true, inside: run.inside, exDue: run.exDue, ph: run.ph.slice(), far: run.far, s: Math.round((Date.now() - run.t0) / 1000) } : { on: false, rec: rec() }) };
})();
