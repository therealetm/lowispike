/* back-swipe.js: Oct 20 (ship sweep). Safari's edge swipe back (and Android back) used to leave LOWiSPIKE (inside Community it
   left the app and reloaded it) and never closed a sheet; only the Move player handled back.
   One guard history entry ({lowiBack:1}) sits under the app once you have touched it. Back pops it, and then:
   1. the top sheet closes (every sheet already closes on Escape, so back sends Escape),
   2. else a page other than Today goes back to Today,
   3. else (Today with nothing open) back goes on and leaves, like before.
   The guard is put back on the next touch. The Move player keeps its own guard ({lowiMv:1}) on top of ours. */
(function (W, D) {
    'use strict';
    if (!W.history || !W.history.pushState || W.LowiBackSwipe) return;
    const H = D.documentElement;
    const ours = s => !!(s && (s.lowiBack || s.lowiMv || s.lowiSec));   /* Oct 21: section-nav.js's section entries are ours too */
    function guard() { try { if (!ours(history.state)) history.pushState({ lowiBack: 1 }, ''); } catch (e) { } }
    function activeTab() { const t = D.querySelector('.tab.active'); return t ? t.id.replace(/^tab-/, '') : 'home'; }
    function sig() {
        /* Oct 22: a closing sheet (.r2-ov) loses .on at once but stays in the page for its slide-out, so the union count alone
           did not change within 80 ms and back on Home with a scanned product (or any sheet) open left the app. Count open
           sheets on their own too.
           Oct 23 (bug hunt): the same for every other sheet that keeps role="dialog" / aria-modal while it slides out (the Gap
           view from the meal-gap bubble on Home): back left the app. Count the open markers (.on / .open / [open]) on their own. */
        return H.className + '|' + D.body.className + '|' + activeTab() + '|' +
            D.querySelectorAll('.on, .open, [open], .r2-ov, [role="dialog"], [aria-modal="true"]').length + '|' +
            D.querySelectorAll('.r2-ov.on').length + '|' +
            D.querySelectorAll('.on, .open, [open]').length + '|' +
            /* Oct 24 (button sweep): the Community chat is open while #cgThread has data-open. Back closed it through its own
               Escape handler, but this signature did not change, so section-nav.js closed Community for Home as well. */
            D.querySelectorAll('#cgThread[data-open]').length;
    }
    /* Oct 24 (back and close sweep): a layer can listen for Escape on itself only (keys on its own element). Escape sent to the
       document never reached it: back from Community went Home and left that layer on top of Home, and the next back left the
       app. Send Escape to the top open layer unless focus is already in it; it still bubbles up to the document, so layers that
       listen there close exactly as before. (The layer that showed this first, Circles, was removed on Oct 24 2026.) */
    function topLayer() {
        try {
            const all = Array.prototype.slice.call(D.querySelectorAll('[aria-modal="true"], dialog[open]') || []);
            let best = null, bz = -Infinity;
            all.forEach(e => {
                if (!e || !e.getBoundingClientRect || e.hidden || e.isConnected === false) return;
                const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
                const cs = typeof W.getComputedStyle === 'function' ? W.getComputedStyle(e) : null;
                if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return;
                const z = cs ? (parseInt(cs.zIndex, 10) || 0) : 0;
                if (z >= bz) { bz = z; best = e; }
            });
            return best;
        } catch (e) { return null; }
    }
    function escape() {
        const a = D.activeElement && D.activeElement !== D.body ? D.activeElement : null;
        const top = topLayer();
        const t = top && !(a && typeof top.contains === 'function' && top.contains(a)) ? top : (a || D);
        try { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true })); } catch (e) { }
    }
    function home() {
        /* Oct 21: no menu bar any more; section-nav.js brings Home back exactly as it was */
        if (W.LowiSections && typeof W.LowiSections.close === 'function') W.LowiSections.close(); else if (typeof W.goTab === 'function') W.goTab('home');
    }
    let closedEvt = null;
    const layers = g => g.split('|').slice(2).join('|');
    function onPop(e) {
        if (ours(history.state)) return;
        /* Oct 22: section-nav.js dropping a section's entry quietly is not a back; acting on it left the app */
        try { if (W.LowiSections && W.LowiSections.swallowed && W.LowiSections.swallowed(e)) return; } catch (x) { }                 /* the Move player's own entry popped down to ours: not for us */
        if (D.querySelector('#mv-player.on')) return;      /* the Move player handles its own back */
        const before = sig();
        /* Oct 24 12:40 (back and close sweep): Body stats and Weight journey (body-stats.js) keep role=dialog / aria-modal and
           add .bs-out while they fade, and use no .on marker, so the signature did not change: the sheet closed and back left the
           app too (open Body stats, back, open it again, back = out of LOWiSPIKE). Shop finds (grocery-hunt.js) the same: its
           aria-modal card sits in an overlay that swaps .in for .out. The top layer itself tells: once Escape closed it, it is
           gone, it or a box around it changed its classes (.bs-out, .out, lost .on) or it is no longer on top. */
        const chain = el => { let s = '', n = el, k = 0; while (n && n !== D.body && n !== H && k++ < 12) { s += '|' + String(n.className); n = n.parentElement || n.parentNode; } return s; };
        const top0 = topLayer(), cls0 = top0 ? chain(top0) : '';
        const topClosed = () => { try { return !!top0 && (top0.isConnected === false || chain(top0) !== cls0 || topLayer() !== top0); } catch (x) { return false; } };
        escape();
        /* Oct 23 (bug hunt): tell section-nav.js (its popstate runs after this one) that this back already closed a layer,
           so it keeps the section open. It reads the page after this Escape, saw nothing open any more, and closed Cook for
           Home under a sheet just closed (the add-a-meal sheet over Shop it). */
        /* only the open layers count here, not the page's classes: any key press adds a class (nm-f) to the page */
        try { if (layers(sig()) !== layers(before) || topClosed()) closedEvt = e; } catch (x) { }
        setTimeout(() => {
            if (sig() !== before || topClosed()) { guard(); return; }
            if (activeTab() !== 'home') { home(); guard(); return; }
            try { history.back(); } catch (e) { }            /* Today with nothing open: back leaves, as it always did */
        }, 80);
    }
    W.addEventListener('popstate', onPop);
    D.addEventListener('pointerdown', guard, true);
    W.LowiBackSwipe = { guard, onPop, sig, escape, topLayer, closed: e => !!e && e === closedEvt };
})(window, document);
