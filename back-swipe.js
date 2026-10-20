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
    const ours = s => !!(s && (s.lowiBack || s.lowiMv));
    function guard() { try { if (!ours(history.state)) history.pushState({ lowiBack: 1 }, ''); } catch (e) { } }
    function activeTab() { const t = D.querySelector('.tab.active'); return t ? t.id.replace(/^tab-/, '') : 'home'; }
    function sig() {
        return H.className + '|' + D.body.className + '|' + activeTab() + '|' +
            D.querySelectorAll('.on, .open, [open], .r2-ov, [role="dialog"], [aria-modal="true"]').length;
    }
    function escape() {
        const t = D.activeElement && D.activeElement !== D.body ? D.activeElement : D;
        try { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true })); } catch (e) { }
    }
    function home() {
        const b = D.querySelector('#tabbar .tb[data-tab="home"]');
        if (b) b.click(); else if (typeof W.goTab === 'function') W.goTab('home');
    }
    function onPop() {
        if (ours(history.state)) return;                 /* the Move player's own entry popped down to ours: not for us */
        if (D.querySelector('#mv-player.on')) return;      /* the Move player handles its own back */
        const before = sig();
        escape();
        setTimeout(() => {
            if (sig() !== before) { guard(); return; }
            if (activeTab() !== 'home') { home(); guard(); return; }
            try { history.back(); } catch (e) { }            /* Today with nothing open: back leaves, as it always did */
        }, 80);
    }
    W.addEventListener('popstate', onPop);
    D.addEventListener('pointerdown', guard, true);
    W.LowiBackSwipe = { guard, onPop, sig };
})(window, document);
