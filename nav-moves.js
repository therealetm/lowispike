/* LOWiSPIKE navigation moves (Oct 15, 2026)
   - For You lives in Cook: a "For You" button top right in Cook opens the feed right there.
   - Leaderboard lives in Move: a "Leaderboard" button top right in Move opens the board right there.
   - Community is the spirit galaxy alone: no For You / Leaderboard tabs, no big title, no Privacy & quiet button.
   A thin layer over the legacy modules. The real panes (#cmPaneFeed, #cmPaneBoard) are moved, not copied, so their
   styles, renderers and listeners keep working. No legacy module is edited or reordered. */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement;
    if (W.LowiNavMoves) return;
    const lang = () => { try { return ((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || H.lang || 'en').slice(0, 2); } catch (e) { return 'en'; } };
    const T = (en, de, es) => ({ de, es })[lang()] || en;
    const $ = s => D.querySelector(s);
    const ICO = {
        fy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.8" width="14" height="18.4" rx="3.4"/><path d="M10.3 8.9v6.2l4.9-3.1z" class="nm-fill"/></svg>',
        lb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v1.5A3 3 0 0 0 8 10.5M16 6h3v1.5a3 3 0 0 1-3 3M12 13v4M8.5 20h7M9.5 17h5"/></svg>',
        back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'
    };
    const SPOTS = {
        fy: { tab: 'shelf', root: '#tab-shelf', pane: 'cmPaneFeed', label: () => T('For You', 'F\u00fcr dich', 'Para ti'), back: () => T('Cook', 'Kochen', 'Cocina') },
        lb: { tab: 'move', root: '#tab-move', pane: 'cmPaneBoard', label: () => T('Care board', 'F\u00fcrsorge-Board', 'Tabla de cuidado'), back: () => T('Move', 'Bewegen', 'Moverse') }
    };
    const activeTab = () => { const t = $('.tab.active'); return t ? t.id.replace(/^tab-/, '') : ''; };
    function go(t) { try { if (typeof W.goTab === 'function') W.goTab(t);  } catch (e) { console.error(e); } }

    /* ---------- the panes ---------- */
    function ensurePane(k) {
        const s = SPOTS[k]; let p = D.getElementById(s.pane);
        if (!p) {
            p = D.createElement('div');
            if (k === 'fy') { p.className = 'ls-pane fy-pane'; p.id = 'cmPaneFeed'; p.innerHTML = '<div id="cmFeed"></div>'; }
            else { p.className = 'ls-pane ls-board'; p.id = 'cmPaneBoard'; }
        }
        return p;
    }
    function paint(k) {
        try {
            if (k === 'fy') { const f = D.getElementById('cmFeed'); if (f && W.TRIBE && W.TRIBE.renderForYou) W.TRIBE.renderForYou(f); }
            else if (W.LowiR3F && W.LowiR3F.paintBoard) W.LowiR3F.paintBoard();
        } catch (e) { console.error(e); }
    }
    /* move the live pane into its new home (Cook or Move); a fresh Community render hands over its new pane */
    function adopt(k) {
        const L = layer(k); if (!L) return null;
        const body = L.querySelector('.nm-body'), p = ensurePane(k);
        if (p.parentElement !== body) { body.querySelectorAll('#' + SPOTS[k].pane).forEach(o => { if (o !== p) o.remove(); }); body.appendChild(p); }
        p.removeAttribute('inert');
        return p;
    }

    /* ---------- the entry buttons and the layers ---------- */
    function pill(k) {
        const s = SPOTS[k], root = $(s.root); if (!root) return null;
        let b = root.querySelector(':scope > .nm-pill');
        if (!b) {
            b = D.createElement('button'); b.type = 'button'; b.className = 'nm-pill nm-pill-' + k; b.dataset.nm = k; b.setAttribute('data-noi18n', '');
            b.innerHTML = ICO[k] + '<span></span>'; root.appendChild(b);
        }
        const t = s.label(); if (b.lastChild.textContent !== t) { b.lastChild.textContent = t; b.setAttribute('aria-label', t); }
        return b;
    }
    /* Oct 16 (E-man: "For You should behave like Shuffle and Swipe"): For You is a window inside Cook, in the spot where the
       Shuffle game and the Swipe cards appear (right under Cook's top row). Cook stays on screen; the window holds the feed and
       you swipe up and down through the posts inside it. The full-screen layer is only a fallback when that row is missing. */
    const LAY = {};
    function home(k) { return k === 'fy' ? $('#tab-shelf #shBody > #ckBar') : null; }
    function layer(k) {
        const s = SPOTS[k], root = $(s.root); if (!root) return null;
        let L = LAY[k] || root.querySelector('.nm-layer-' + k);
        if (!L) {
            L = D.createElement('section'); L.className = 'nm-layer nm-layer-' + k; L.hidden = true; L.setAttribute('role', 'region');
            L.innerHTML = '<header class="nm-head"><button type="button" class="nm-back" data-nm="back" data-noi18n>' + ICO.back + '<span></span></button><b class="nm-title" data-noi18n></b></header><div class="nm-body"></div>';
        }
        LAY[k] = L;
        const bar = home(k);
        if (bar) { if (L.previousElementSibling !== bar || !L.isConnected) bar.after(L); }
        else if (L.parentElement !== root) root.appendChild(L);
        L.classList.toggle('fyw', !!bar);
        if (k === 'fy') H.classList.toggle('nm-fyw', !!bar);
        /* Oct 18 game-perf: write only when the words change. A textContent write with the same words still swaps the text node,
           and tick() calls layer('fy') on every DOM change, so the unguarded writes kept waking every observer: a loop that ran
           every frame after Community or Cook, even on Home and with the phone locked. Compare with the last value written here,
           never with the text on screen: spirit.js swaps emoji for icons and the translator rewrites words, so the shown text
           never matches again (the Care board loop, release 20261018-000407). */
        const bk = L.querySelector('.nm-back span'), ti = L.querySelector('.nm-title'), back = s.back(), label = s.label();
        if (bk && bk.__nmW !== back) { bk.__nmW = back; bk.textContent = back; }
        if (ti && ti.__nmW !== label) { ti.__nmW = label; ti.textContent = label; }
        if (L.__nmAria !== label) { L.__nmAria = label; L.setAttribute('aria-label', label); }
        return L;
    }
    const isOpen = k => { const L = layer(k); return !!(L && !L.hidden); };
    function show(k, on) {
        const L = layer(k); if (!L) return;
        if (on) { const rt = $(SPOTS[k].root); if (rt && !L.classList.contains('fyw')) rt.scrollTop = 0; adopt(k); paint(k); L.hidden = false; H.classList.add('nm-open-' + k); }
        else { L.hidden = true; H.classList.remove('nm-open-' + k); if (k === 'fy') { try { if (W.LowiFyEmbed) W.LowiFyEmbed.closeAll(null); D.querySelectorAll('video.fyv-v').forEach(v => v.pause()); } catch (e) { } } }
        const b = pill(k); if (b) b.setAttribute('aria-expanded', on ? 'true' : 'false');
        if (k === 'fy') { marks(); fit(); }
    }
    /* the For You button in Cook's Shuffle | For You | Swipe switch lights up like the other two while the window is open */
    function marks() {
        const on = isOpen('fy');
        D.querySelectorAll('#tab-shelf .ck-fy').forEach(b => { b.classList.toggle('on', on); const as = on ? 'true' : 'false'; if (b.getAttribute('aria-selected') !== as) b.setAttribute('aria-selected', as); });
    }
    /* the window fills the room left under Cook's top row, down to just above the tab bar (like the Swipe cards) */
    function fit() {
        const L = LAY.fy; if (!L || L.hidden || !L.classList.contains('fyw') || !L.isConnected) return;
        const body = $('#tab-shelf #shBody'); if (!body) return;
        const br = body.getBoundingClientRect(), lr = L.getBoundingClientRect(); if (!br.height) return;
        const pb = parseFloat(getComputedStyle(body).paddingBottom) || 0;
        let bottom = Math.min(br.bottom - pb, W.innerHeight);
        { /* Oct 21: no bottom bar to stop above */ }
        const h = Math.round(Math.max(320, Math.min(bottom - lr.top - 4, 900)));
        if (L.style.height !== h + 'px') { L.style.height = h + 'px'; try { if (W.LowiFyEmbed) D.querySelectorAll('.nm-layer-fy .fy-slide.fye-on').forEach(W.LowiFyEmbed.place); } catch (e) { } }
    }
    function open(k) {
        const s = SPOTS[k];
        if (activeTab() !== s.tab) go(s.tab);
        setTimeout(() => { show(k, true); align(); }, 30);
    }
    /* the entry button sits on the right of the Cook / Move title row, vertically centred on it */
    function align() {
        Object.keys(SPOTS).forEach(k => {
            const b = pill(k); if (!b) return;
            const root = $(SPOTS[k].root);
            const row = k === 'fy' ? $('#shTop .sh-row') : $('#mv-screen .mv-head');
            const mainCook = k === 'fy' ? !!$('#shTop .sh-row:only-child > div:only-child') : true;
            const ok = !!(row && root && row.getBoundingClientRect().height && mainCook);
            b.classList.toggle('nm-hide', !ok);
            if (!ok) return;
            const rr = root.getBoundingClientRect(), r = row.getBoundingClientRect();
            const top = Math.round(r.top - rr.top + root.scrollTop + r.height / 2 - 19);
            if (b.style.top !== top + 'px') b.style.top = top + 'px';
        });
    }

    /* ---------- Community: the galaxy alone ---------- */
    let swipeGuard = false;
    function solo() {
        const el = D.getElementById('tab-foryou'); if (!el) return;
        el.classList.add('nm-solo');
        if (D.getElementById('cmPaneFeed') && D.getElementById('cmPaneFeed').closest('#cmTrack')) adopt('fy');
        if (D.getElementById('cmPaneBoard') && D.getElementById('cmPaneBoard').closest('#cmTrack')) adopt('lb');
        const ch = D.getElementById('cmPaneChat'); if (ch) ch.removeAttribute('inert');
    }
    function hook() {
        if (typeof W.renderCommunity === 'function' && !W.renderCommunity.__nm) {
            const r0 = W.renderCommunity;
            const r = function () {
                try { if (W.cmSetView) W.cmSetView.__nmRaw('chat'); } catch (e) { }
                const out = r0.apply(this, arguments);
                try { solo(); } catch (e) { console.error(e); }
                return out;
            };
            r.__nm = true; W.renderCommunity = r;
        }
        if (typeof W.cmSetView === 'function' && !W.cmSetView.__nm) {
            const v0 = W.cmSetView;
            const v = function (x) { if (x === 'feed' || x === 'board') { v0.call(this, 'chat'); setTimeout(() => open(x === 'feed' ? 'fy' : 'lb'), 60); return; } return v0.apply(this, arguments); };
            v.__nm = true; v.__nmRaw = x => v0(x); W.cmSetView = v;
        }
        if (typeof W.cmSeg === 'function' && !W.cmSeg.__nm) {
            const s0 = W.cmSeg;
            const s = function (x) {
                if (x === 'feed' || x === 'board') {
                    /* a sideways drag in the galaxy must not throw you into Cook or Move: snap back to the galaxy */
                    if (swipeGuard) return s0.call(this, 'chat');
                    s0.call(this, 'chat'); open(x === 'feed' ? 'fy' : 'lb'); return;
                }
                return s0.apply(this, arguments);
            };
            s.__nm = true; W.cmSeg = s;
            try { cmSeg = s; } catch (e) { } // eslint-disable-line no-undef
        }
        /* Oct 20 (regression run W6/W8): with the galaxy alone, solo() moves the feed and board panes out of #cmTrack, so
           the chat pane is the only pane left (index 0). cmSeg('chat') and R3A's fixCm() still count Chat as index 1 of
           [feed, chat, board] and call cmPanesInert(1), which marked the chat pane inert on the 2nd and later visits:
           the box showed but a tap went to #cmTrack, no keyboard came up and typed letters went nowhere. In solo mode
           the chat pane is the one on screen, so it is never inert. */
        if (typeof W.cmPanesInert === 'function' && !W.cmPanesInert.__nm) {
            const p0 = W.cmPanesInert;
            const p = function (i) {
                const el = D.getElementById('tab-foryou');
                if (el && el.classList.contains('nm-solo')) {
                    D.querySelectorAll('#cmTrack > .ls-pane').forEach(x => { if (x.id === 'cmPaneChat') x.removeAttribute('inert'); else x.setAttribute('inert', ''); });
                    return;
                }
                return p0.apply(this, arguments);
            };
            p.__nm = true; W.cmPanesInert = p;
            try { cmPanesInert = p; } catch (e) { } // eslint-disable-line no-undef
        }
    }

    /* ---------- events ---------- */
    D.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('[data-nm]'); if (!b) return;
        const k = b.dataset.nm;
        if (k === 'fy' || k === 'lb') { e.preventDefault(); show(k, !isOpen(k)); align(); return; }
        if (k === 'back') { e.preventDefault(); const L = b.closest('.nm-layer'); if (L) show(L.classList.contains('nm-layer-fy') ? 'fy' : 'lb', false); }
    }, true);
    /* Chat on a post: the chat lives in Community, so go there with the @name ready to type (it used to fill a hidden box) */
    D.addEventListener('click', e => {
        const b = e.target && e.target.closest && e.target.closest('.nm-layer-fy [data-tr="comment"]'); if (!b || typeof W.cmComment !== 'function') return;
        e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        let who = ''; try { const p = W.TRIBE && W.TRIBE.post ? W.TRIBE.post(b.dataset.id) : null; who = p && !p.me ? (p.who || '') : ''; } catch (x) { }
        go('foryou'); setTimeout(() => { try { W.cmComment(who); } catch (x) { console.error(x); } }, 160);
    }, true);
    /* Shuffle or Swipe in Cook's switch closes the For You window, so that game shows in the same spot */
    D.addEventListener('click', e => {
        const b = e.target && e.target.closest && e.target.closest('#tab-shelf #ckBar [data-ck="view"]');
        if (b && isOpen('fy')) show('fy', false);
    }, true);
    /* the feed's filter chips and the board's switches only re-render on the old Community tab; re-render them here too */
    D.addEventListener('click', e => {
        const t = e.target; if (!t || !t.closest) return;
        if (t.closest('.nm-layer-fy [data-tr="filter"]')) setTimeout(() => paint('fy'), 0);
        if (t.closest('.nm-layer-lb [data-r3lb]')) setTimeout(() => paint('lb'), 0);
    });
    ['pointerdown', 'pointerup', 'pointercancel'].forEach(n => D.addEventListener(n, e => {
        if (n === 'pointerdown') swipeGuard = !!(e.target && e.target.closest && e.target.closest('#tab-foryou'));
        else if (swipeGuard) setTimeout(() => { swipeGuard = false; }, 0);
    }, true));
    D.addEventListener('keydown', e => { if (e.key !== 'Escape') return; ['fy', 'lb'].forEach(k => { if (isOpen(k) && activeTab() === SPOTS[k].tab) show(k, false); }); });

    /* Privacy & quiet left Community with its old header (Oct 16): it now lives in Profile, in the Community section. */
    function privacy() {
        const t = D.getElementById('tab-profile'); if (!t || t.querySelector('.nm-privacy')) return;
        const c = D.createElement('div'); c.className = 'card nm-privacy';
        c.innerHTML = '<button type="button" class="nm-privbtn" data-nm="privacy"><b>' + T('Chat privacy & quiet hours', 'Chat-Privatsph\u00e4re & Ruhezeiten', 'Privacidad del chat y horas de silencio') + '</b><span>' + T('Who can message you, your companion in the galaxy, blocked people', 'Wer dir schreiben darf, dein Begleiter in der Galaxie, Blockierte', 'Qui\u00e9n puede escribirte, tu compa\u00f1ero en la galaxia, bloqueados') + '</span></button>';
        t.appendChild(c);
    }
    D.addEventListener('click', e => {
        const b = e.target && e.target.closest && e.target.closest('[data-nm="privacy"]'); if (!b) return;
        e.preventDefault();
        try { if (W.LowiCommunity && W.LowiCommunity.settings) W.LowiCommunity.settings(); } catch (x) { console.error(x); }
    });
    /* Move (Oct 16): the Leaderboard is a card right under the Move title, above the Start card, in the same card style.
       The odd Safety shield in the header is gone; its notes now sit as a quiet "Safety notes" line under the tiles. */
    /* Oct 17: the board ranks the care Misty got (care-board-core.js), so the card reads "Care board" and shows your
       sunbeams this week. Read at most every 4 s: tick() runs on every DOM change. */
    let careTxt = '', careAt = 0;
    function careLine() {
        const n = Date.now(); if (n - careAt < 4000) return careTxt; careAt = n;
        try { const m = W.LowiR3 && W.LowiR3.me && W.LowiR3.me(), w = m && m.care && m.care.w; careTxt = w && w.key ? ' \u00b7 \u2600 ' + w.pts : ''; } catch (e) { careTxt = ''; }
        return careTxt;
    }
    function moveCard() {
        const head = $('#mv-screen .mv-head'); if (!head) return;
        let c = head.parentElement.querySelector(':scope > .nm-lbcard');
        if (!c) {
            c = D.createElement('button'); c.type = 'button'; c.className = 'card goldline nm-lbcard'; c.dataset.nm = 'lb'; c.setAttribute('data-noi18n', '');
            c.innerHTML = '<span class="mv-ic nm-lbic">' + ICO.lb + '</span><span class="nm-lbtx"><span class="tiny gold"></span><b class="h3"></b></span><svg class="nm-lbgo" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
        }
        if (c.previousElementSibling !== head) head.after(c);
        const tg = T('This week', 'Diese Woche', 'Esta semana') + careLine(), nm = SPOTS.lb.label();
        /* Oct 17 crash fix: compare with what we last wrote, never with what the page shows. spirit.js swaps the sun emoji for
           its icon, so the shown text never matched again and this line rewrote itself on every frame (an endless DOM loop that
           woke every observer, heated the phone and crashed Safari). */
        const tiny = c.querySelector('.tiny');
        if (tiny.__tg !== tg) { tiny.__tg = tg; tiny.textContent = tg; }
        if (c.querySelector('b').textContent !== nm) { c.querySelector('b').textContent = nm; c.setAttribute('aria-label', nm); }
        const tl = head.parentElement.querySelector(':scope > .g2-tiles');
        if (tl && !(tl.nextElementSibling && tl.nextElementSibling.classList.contains('nm-safeline'))) {
            head.parentElement.querySelectorAll(':scope > .nm-safeline').forEach(o => o.remove());
            tl.insertAdjacentHTML('afterend', '<p class="nm-safeline" data-noi18n>' + T('Stop if anything hurts.', 'Hör auf, wenn etwas wehtut.', 'Para si algo duele.') + ' <button type="button" class="nm-safe" data-mv="safety">' + T('Safety notes', 'Sicherheitshinweise', 'Notas de seguridad') + '</button></p>');
        }
    }
    let raf = 0;
    function tick() {
        raf = 0; hook(); align(); privacy(); moveCard();
        /* a Cook re-render replaces its page: put the open For You window back under the new top row */
        if (LAY.fy && (!LAY.fy.hidden || LAY.fy.classList.contains('fyw'))) { layer('fy'); marks(); fit(); }
        const el = D.getElementById('tab-foryou');
        if (el && D.getElementById('cmTrack') && (!el.classList.contains('nm-solo') || (D.getElementById('cmPaneFeed') || {}).parentElement === D.getElementById('cmTrack') || (D.getElementById('cmPaneBoard') || {}).parentElement === D.getElementById('cmTrack'))) solo();
    }
    const soon = () => { if (!raf) raf = requestAnimationFrame(tick); };
    function boot() {
        H.classList.add('nm-on');
        hook(); pill('fy'); pill('lb'); layer('fy'); layer('lb'); tick();
        try { new MutationObserver(soon).observe(D.getElementById('main') || D.body, { childList: true, subtree: true }); } catch (e) { }
        W.addEventListener('resize', soon);
        setInterval(soon, 1500);
    }
    W.LowiNavMoves = { open, show, isOpen, solo, align, fit };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
