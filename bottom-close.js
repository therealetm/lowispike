/* bottom-close.js: Oct 28 2026, owner request 14 (Emmanuel, iPhone: "the back button and x button should always be in the middle
   down, basically the home button, so it's convenient to use for one hand").
   Design rule (MAYA-HANDOFF section 5): every back button and every X / close button sits at the bottom center of the screen.
   One round glass button, always in the same spot, above the home indicator. It stands in for the back or close button of the
   layer on top (a page, a sheet, a panel, an overlay): the original button stays in the page, hidden, and a tap here presses it,
   so every screen keeps its own close logic (history, trail, reopen, Escape). The original top-left arrows and top-corner X
   buttons are hidden while this button stands in for them.
   It never covers a text field, the chat composer, the kitchen bin or another control at the bottom: it rises just above them.
   While the keyboard is up (a text field has focus) it steps away. */
(function (W, D) {
    'use strict';
    if (W.LowiBottomClose) return;
    const H = D.documentElement;
    const CLOSE_RE = /^\s*(close|schlie(ß|ss)en|cerrar|dismiss|ausblenden|x)\b/i;
    const CLOSE_ANY = /(^|\s)(close|schlie(ß|ss)en|cerrar)\b/i;
    const BACK_RE = /^\s*(back|zur(ü|u)ck|atr(á|a)s|volver)\b/i;
    /* close / back controls known by class (some carry no label); per-item remove buttons (a snack, a photo, a list row) never match */
    const KNOWN = '#secX,.sec-x,.gv-x,.stp-close,.kg-back,.kg-qx,.sh-back,.hs-back,.hs-x,.ss2-back,.ss2-page-x,.r5-sback,.f2-back,.f2-x,.gb-x,.bs-close,.ap-close,.sz-close,.tmg-close,.cf-back,.cf-x,.cf-aura-close,.rm-back,.rm-x,.r2-back,.r2-x,.cr-back,.cr-x,.a1-back,.a1-x,.mv-back,.nm-back,.yd-back,.g1-back,.wb-back,.bw3-x,.ck-out-x,.ltp-x,.hq-x,.e1-x,.ec-x,.fai-x,.pd-x,.mp-x,.ig-x,.cs-x,.dr-x,.r3a-x,[data-close],[data-bx]';
    const NEVER = '.cs-mic-card .cs-photo-x,#n1B *,.stp-snack-x,.mr-add-x,.cg-photo-x,.rk-lad-x,.lw-bx,[data-no-bx],#ltTour *,.lt-tour *';
    const SRC = 'lw-bx-src';
    const obs = [];
    let btn = null, target = null, raf = 0, last = '', bottomPx = 0;
    const T = (en, de, es) => { const l = (H.lang || 'en').slice(0, 2); return l === 'de' ? de : l === 'es' ? es : en; };
    const ICON = {
        back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
        close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
    };
    const labelOf = el => ((el.getAttribute('aria-label') || el.getAttribute('title') || '') + '').trim();
    function kindOf(el) {
        const l = labelOf(el), c = String(el.className && el.className.baseVal != null ? el.className.baseVal : el.className || '') + ' ' + (el.id || '');
        if (BACK_RE.test(l)) return 'back';
        if (CLOSE_RE.test(l)) return 'close';
        if (/back/i.test(c) || el.id === 'secX') return 'back';
        return 'close';
    }
    function isCandidate(el) {
        if (!el || el === btn || el.closest(NEVER)) return false;
        if (el.matches(KNOWN)) {
            if (el.matches('#secX,[data-close],[data-bx]')) return true;
            const l = labelOf(el);
            if (l) return CLOSE_ANY.test(l) || BACK_RE.test(l);
            return /^[\s×✕✖‹←<xX]*$/.test(el.textContent || '');   /* an icon-only X or arrow, never a "Remove" text button */
        }
        const l = labelOf(el); if (!l || l.length > 40) return false;
        return CLOSE_RE.test(l) && !/\b(tip|hinweis|consejo)\b/i.test(l) || /^(back|zur(ü|u)ck|atr(á|a)s|volver)( to| zur| al)?\b/i.test(l) && l.split(/\s+/).length <= 4;
    }
    /* shown = laid out on screen, not hidden, no ancestor faded out (its own fade is ours, so it is skipped) */
    function shown(el) {
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return false;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return false;
        if (el.closest('#main>.tab:not(.active),.holo-under')) return false;   /* Home drawn under a rising panel is not the layer on top */
        for (let a = el.parentElement; a && a !== D.body; a = a.parentElement) {
            const s = getComputedStyle(a);
            if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.08 || a.hidden || a.getAttribute('aria-hidden') === 'true' && !a.matches('#main,#app')) return false;
        }
        return true;
    }
    /* the layer a control belongs to: its outermost ancestor under body / #app, with that layer's z-index */
    function layerZ(el) {
        let z = 0, best = 0;
        for (let a = el; a && a !== D.body && a !== H; a = a.parentElement) {
            const s = getComputedStyle(a); if (s.position !== 'static' && s.zIndex !== 'auto') { z = +s.zIndex || 0; best = z; }
        }
        return best;
    }
    function pick() {
        const all = D.querySelectorAll('button,[role="button"],a[aria-label]');
        let top = null, topZ = -1e9, hide = [];
        for (const el of all) {
            if (!isCandidate(el)) continue;
            const wasSrc = el.classList.contains(SRC);
            if (!shown(el)) { if (wasSrc) el.classList.remove(SRC); continue; }
            hide.push(el);
            /* the page's own back (#secX) is the floor: a sheet, a zoomed shelf or an overlay on that page closes first */
            const z = el.matches('#secX,.sec-x') ? -1 : layerZ(el);
            if (z >= topZ) { top = el; topZ = z; }
        }
        return { top, hide };
    }
    function ensureBtn() {
        if (btn && btn.isConnected) return btn;
        btn = D.getElementById('lwBX') || D.createElement('button');
        btn.id = 'lwBX'; btn.type = 'button'; btn.className = 'lw-bx'; btn.setAttribute('data-noi18n', '');
        btn.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            const t = target; if (!t || !t.isConnected) { schedule(); return; }
            try { if (navigator.vibrate) navigator.vibrate(8); } catch (x) { }
            /* press the screen's own back / close, so its own logic runs */
            t.click();
            setTimeout(schedule, 60); setTimeout(schedule, 360);
        });
        D.body.appendChild(btn);
        return btn;
    }
    const typing = () => { const a = D.activeElement; return !!(a && a !== D.body && (a.matches('textarea,select,[contenteditable=""],[contenteditable="true"]') || a.matches('input') && !/^(button|checkbox|radio|range|submit|reset|color|file|image)$/i.test(a.type || 'text'))); };
    /* rise above whatever sits at the bottom center: a text field, the chat composer, the bin, any control */
    let cardBlock = false;
    /* a text field or the voice-message bar always lifts the button, wherever it sits */
    const FIELD = o => o.matches('textarea,input,select,[contenteditable="true"],[role="textbox"],.cs-rec');
    function clearance(b) {
        const base = 14, size = 56, cx = innerWidth / 2;
        let lift = 0; obs.length = 0; cardBlock = false;
        const prev = b.style.pointerEvents; b.style.pointerEvents = 'none';
        try {
            for (let i = 0; i < 8; i++) {
                const y0 = innerHeight - safeBottom() - base - lift - size, hits = [];
                for (const dx of [-26, 0, 26]) for (const y of [y0 + 4, y0 + size / 2, y0 + size - 4]) { const e = D.elementFromPoint(cx + dx, y); if (e) hits.push(e); }
                let ob = hits.map(e => e.closest('.cs-rec,textarea,input:not([type=hidden]),select,[contenteditable="true"],button,a[href],[role="button"],[role="textbox"],.kg-bin,.cc-composer,.cmp,.chat-composer,form'))
                    .filter(o => o && o !== b && !o.classList.contains(SRC) && !isCandidate(o))
                    .sort((p, q) => (FIELD(q) ? 1 : 0) - (FIELD(p) ? 1 : 0))[0];
                /* Oct 28 (owner: the X sat on the "Mikrofon ist aus" card's text): a card, popup, hint or plain text that stays put
                   at the bottom lifts it too. Take whichever obstacle reaches lowest under the button. */
                const R = { l: cx - 30, r: cx + 30, t: y0, b: y0 + 56 };
                const cards = hits.map(e => contentBox(e, R)).filter(o => o && o !== b && !b.contains(o) && anchored(o)).concat(ghostToasts(R));
                let isCard = false;
                if (cards.length) {
                    const low = cards.reduce((m, o) => (o.getBoundingClientRect().top > m.getBoundingClientRect().top ? o : m));
                    if (!ob || !(anchored(ob) || FIELD(ob))) { ob = low; isCard = true; }
                }
                if (!ob || !(anchored(ob) || FIELD(ob))) break;
                const r = ob.getBoundingClientRect(); obs.push((ob.id || String(ob.className).slice(0, 40) || ob.tagName) + '@' + Math.round(r.top) + '-' + Math.round(r.bottom));
                const need = innerHeight - safeBottom() - base - r.top + 10;
                /* a card it cannot clear without floating up the middle of the screen: the button steps aside instead (the card
                   has its own close, and the button comes back when the card goes) */
                /* Oct 28 (owner: nothing overlapping at any moment): the same for anything else it would have to climb past
                   (stacked obstacles used to leave it on the last one it could not clear, e.g. a galaxy body above the
                   voice-message bar on a small phone) */
                if (need > innerHeight * 0.3) { cardBlock = true; break; }
                if (need <= lift) break;
                lift = need;
            }
        } finally { b.style.pointerEvents = prev; }
        return lift;
    }
    /* Oct 28: fixed toasts that let taps through (pointer-events: none, e.g. the dictation hint ".mic-hint") never come back from
       elementFromPoint, so look for them directly */
    function ghostToasts(R) {
        const out = [];
        for (const el of D.querySelectorAll('.mic-hint.on,[role="status"].on,.toast.on,.lw-toast.on,.cs-rec-hint')) {
            if (el === btn || el.classList.contains(SRC)) continue;
            const cs = getComputedStyle(el);
            /* the voice-message hint ("Loslassen zum Senden") sits above the recording bar, also see-through for taps */
            if ((cs.position !== 'fixed' && !el.classList.contains('cs-rec-hint')) || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) continue;
            if (hitR(el.getBoundingClientRect(), R)) out.push(el);
        }
        return out;
    }
    /* a card / popup / hint / toast around a hit, or the hit itself when text, a picture or a control of it lies under the
       button (R = the button's box); never a whole screen or layer */
    const BOX_RE = /(^|[\s_-])(card|toast|hint|popup|notice|banner|snack|tip|alert|bubble)([\s_-]|$)/i;
    const hitR = (q, R) => q.width > 0 && q.height > 0 && q.right > R.l && q.left < R.r && q.bottom > R.t && q.top < R.b;
    function inkUnder(e, R) {
        let k = 0;
        for (const el of [e, ...e.querySelectorAll('img,svg,video,input,textarea,select,button,[role="button"]')]) {
            if (++k > 60) break;
            if (el !== e && el.matches('img,svg,video,input,textarea,select,button,[role="button"]') && hitR(el.getBoundingClientRect(), R)) return el;
        }
        const w = D.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n; k = 0;
        while ((n = w.nextNode()) && ++k < 120) {
            if (!n.nodeValue.trim()) continue;
            const pe = n.parentElement; if (!pe || (btn && btn.contains(pe))) continue;
            const cs = getComputedStyle(pe); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
            const rg = D.createRange(); rg.selectNodeContents(n);
            for (const q of rg.getClientRects()) if (hitR(q, R)) return pe;
        }
        return null;
    }
    function contentBox(e, R) {
        if (!e || e === H || e === D.body || (btn && (e === btn || btn.contains(e)))) return null;
        const vw = innerWidth, vh = innerHeight;
        for (let a = e, k = 0; a && a !== D.body && a !== H && k < 7; a = a.parentElement, k++) {
            const r = a.getBoundingClientRect();
            if (r.height > vh * 0.5 || r.width * r.height > vw * vh * 0.55) break;
            const role = a.getAttribute('role') || '', cls = typeof a.className === 'string' ? a.className : '';
            if (/^(alert|alertdialog|status|tooltip)$/.test(role) || BOX_RE.test(cls)) return a;
        }
        const ink = inkUnder(e, R);
        if (!ink) return null;
        const r = e.getBoundingClientRect();
        return (r.height > vh * 0.3) ? ink : e;
    }
    /* an obstacle counts when it stays put at the bottom (fixed or sticky, like a composer or a camera shutter); content that
       scrolls under the button does not lift it (the panels end with room for it) */
    function anchored(el) {
        for (let a = el; a && a !== D.body && a !== H; a = a.parentElement) {
            const s = getComputedStyle(a);
            /* a scrolling panel (even a fixed one, like Profile on a small phone) carries its content past the button */
            if (a !== el && /(auto|scroll)/.test(s.overflowY) && a.scrollHeight > a.clientHeight + 2) return false;
            if (s.position === 'fixed' || s.position === 'sticky') return true;
        }
        return false;
    }
    let sb = null;
    function safeBottom() {
        if (sb == null) { const p = D.createElement('div'); p.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px);width:0;visibility:hidden'; D.body.appendChild(p); sb = p.getBoundingClientRect().height || 0; p.remove(); }
        return sb;
    }
    function tourOver(b, lift) {
        const t = D.querySelector('#ltTour,.lt-tour');
        if (!t) return false;
        const prev = b.style.pointerEvents; b.style.pointerEvents = 'none';
        try {
            const e = D.elementFromPoint(innerWidth / 2, innerHeight - safeBottom() - 14 - lift - 28);
            return !!(e && (e === t || t.contains(e)));
        } finally { b.style.pointerEvents = prev; }
    }
    function update() {
        raf = 0;
        if (!D.body) return;
        const { top, hide } = pick();
        D.querySelectorAll('.' + SRC).forEach(el => { if (!hide.includes(el)) el.classList.remove(SRC); });
        hide.forEach(el => el.classList.add(SRC));
        const b = ensureBtn();
        target = top;
        if (!top || typing()) { b.classList.remove('on'); H.classList.toggle('lw-bx-on', !!top); return; }
        H.classList.add('lw-bx-on');
        const k = kindOf(top), lab = labelOf(top) || (k === 'back' ? T('Back', 'Zurück', 'Atrás') : T('Close', 'Schließen', 'Cerrar'));
        const sig = k + '|' + lab;
        if (sig !== last) { b.innerHTML = ICON[k]; b.setAttribute('aria-label', lab); b.dataset.kind = k; last = sig; }
        b.classList.add('on');
        const lift = clearance(b);
        /* Oct 28 (owner: the X must never lag behind a card or field that appears): while something around the bottom center
           is still sliding, fading or growing in, the X is measured against a layout that is about to change, so it stays out
           of sight until that motion ends and then appears in its final place (no slide, see bottom-close.css) */
        const moving = settling(b, lift);
        b.classList.toggle('bx-settle', moving);
        /* Oct 28: the talking tutorial lies over the screen the X would close: the tour has its own buttons, so the X waits */
        const veiled = tourOver(b, lift);
        b.classList.toggle('bx-aside', cardBlock || veiled);
        /* stepped aside: the screen's own back / close shows again meanwhile, so there is always a way out */
        if (cardBlock) hide.forEach(el => el.classList.remove(SRC));
        if (lift !== bottomPx) { bottomPx = lift; b.style.setProperty('--bx-lift', lift + 'px'); }
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(update); }
    /* a finite CSS animation / transition still running on something that reaches the zone the X sits in (the button's column,
       from its lifted spot down to the bottom), e.g. a card fading in, a pane sliding, the composer changing height. Looping
       glows never count. Hidden at most 1.5 s in a row, so a busy screen can never lose its way out. */
    let settleSince = 0, settleWait = null;
    function settling(b, lift) {
        if (!D.getAnimations) return false;
        const cx = innerWidth / 2, top = innerHeight - safeBottom() - 14 - lift - 56 - 12, now = performance.now();
        let list;
        try { list = D.getAnimations(); } catch (e) { return false; }
        const running = list.filter(a => {
            if (a.playState !== 'running') return false;
            const t = a.effect && a.effect.target;
            if (!t || !t.getBoundingClientRect || t === b || b.contains(t) || t.contains(b)) return false;
            let tm; try { tm = a.effect.getComputedTiming(); } catch (e) { return false; }
            if (!isFinite(tm.endTime) || tm.iterations === Infinity || tm.endTime > 2500) return false;
            const r = t.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) return false;
            return r.right > cx - 40 && r.left < cx + 40 && r.bottom > top;
        });
        if (!running.length) { settleSince = 0; return false; }
        if (!settleSince) settleSince = now;
        if (now - settleSince > 1500) return false;
        /* look again the moment the motion ends, and every frame meanwhile */
        const w = running.map(a => a.finished.catch(() => { }));
        if (settleWait !== w.length) { settleWait = w.length; Promise.all(w).then(() => { settleWait = null; update(); }); }
        schedule();
        return true;
    }
    /* a DOM change measures at once (in the same frame the card / field appears), at most 4 times a frame, else next frame */
    let syncN = 0, syncReset = 0;
    function syncUpdate() {
        if (!syncReset) syncReset = requestAnimationFrame(() => { syncN = 0; syncReset = 0; });
        if (++syncN > 4) { schedule(); return; }
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        try { update(); } catch (e) { schedule(); }
    }
    function start() {
        ensureBtn();
        new MutationObserver(ms => { for (const m of ms) { const t = m.target; if (t === btn || btn && btn.contains(t)) continue; if (m.type === 'attributes' && t.classList && m.attributeName === 'class' && t.classList.contains(SRC) && String(m.oldValue || '').replace(SRC, '').trim() === String(t.className).replace(SRC, '').trim()) continue; syncUpdate(); return; } }).observe(D.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'open'], attributeOldValue: true });
        ['resize', 'orientationchange', 'focusin', 'focusout', 'transitionend', 'animationend', 'scroll'].forEach(ev => W.addEventListener(ev, schedule, true));
        /* a card, pane or composer starting to move: hide the X in that same frame */
        ['transitionstart', 'transitionrun', 'animationstart'].forEach(ev => W.addEventListener(ev, e => { if (!btn || e.target === btn || btn.contains(e.target)) return; syncUpdate(); }, true));
        if (W.visualViewport) W.visualViewport.addEventListener('resize', schedule);
        setInterval(schedule, 700);
        schedule();
    }
    W.LowiBottomClose = { update: () => update(), get target() { return target; }, get lifted() { return obs.slice(); }, isCandidate };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})(window, document);
