/* LOWiSPIKE · who reacted (7 Nov 2026, Emmanuel: "When I long press on an emoji that someone ... reacts to the bubbles with just
   emojis ... a heart or the number 2 or 3, I should be able to see who left that").
   A long press (HOLD_MS with the finger still) on a reaction chip under a chat message opens a small card over the chip: the
   reaction and the names of everyone who left it, you first as "You". A tap still adds or takes back your own reaction; the click
   that ends a long press does nothing. Right-click does the same on a computer. The card closes on a tap elsewhere, on scroll and on
   Escape. Names come from the Community (LowiCommunityHost.people), else from that person's messages, else "Member". */
(function (W) {
    'use strict';
    const HOLD_MS = 450, SLOP = 10, MAX = 30;
    /* pure: the names for one reaction, you first, each once */
    function who(rows, mid, emoji, me, nameOf) {
        const seen = new Set(), out = [];
        for (const r of rows || []) {
            if (!r || r.message_id !== mid || r.emoji !== emoji || !r.user_id || seen.has(r.user_id)) continue;
            seen.add(r.user_id); out.push({ uid: r.user_id, me: r.user_id === me, n: nameOf(r.user_id) });
        }
        return out.sort((a, b) => (b.me ? 1 : 0) - (a.me ? 1 : 0));
    }
    const api = { HOLD_MS, SLOP, MAX, who };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (!W || !W.document || W.LowiReactWho) return;
    const D = W.document, SEL = '.cm-rx [data-chat="react"]';
    const li = () => { let l = ''; try { l = W.LowiLang && W.LowiLang.get ? W.LowiLang.get() : D.documentElement.lang; } catch (e) { l = ''; } l = String(l || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const T = (en, de, es) => [en, de, es][li()];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    let hold = null, card = null, swallow = null;
    function host() { return W.LowiCommunityHost || null; }
    function nameOf(uid) {
        const H = host();
        try { const p = H && H.people ? (H.people() || []).find(x => x && x.uid === uid) : null; if (p && String(p.n || '').trim()) return String(p.n).trim(); } catch (e) { }
        try { const ms = H && H.messages ? H.messages() || [] : []; for (let i = ms.length - 1; i >= 0; i--) { const m = ms[i]; if (m && (m.uid === uid || m.user_id === uid) && String(m.by || '').trim()) return String(m.by).trim(); } } catch (e) { }
        return T('Member', 'Mitglied', 'Miembro');
    }
    function close() { const c = card; card = null; if (c) { c.classList.remove('on'); setTimeout(() => { try { c.remove(); } catch (e) { } }, 160); } }
    function open(chip) {
        const H = host(); if (!H || !H.reactions) return;
        const mid = chip.getAttribute('data-id'), em = chip.getAttribute('data-emoji');
        let me = ''; try { me = (H.state && H.state().uid) || ''; } catch (e) { me = ''; }
        const list = who(H.reactions(), mid, em, me, nameOf); if (!list.length) return;
        close();
        const glyph = (chip.querySelector('.cm-emo') || {}).textContent || em;
        const c = D.createElement('div'); c.className = 'rw-card'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', T('Who reacted', 'Wer reagiert hat', 'Quién reaccionó'));
        const shown = list.slice(0, MAX), more = list.length - shown.length;
        c.innerHTML = '<div class="rw-head"><span class="rw-emo" aria-hidden="true">' + esc(glyph) + '</span><b>' + list.length + '</b></div><ul class="rw-list">' +
            shown.map(p => '<li' + (p.me ? ' class="me"' : '') + '>' + esc(p.me ? T('You', 'Du', 'Tú') : p.n) + '</li>').join('') +
            (more > 0 ? '<li class="more">' + esc(T('+' + more + ' more', '+' + more + ' weitere', '+' + more + ' más')) + '</li>' : '') + '</ul>';
        D.body.appendChild(c); card = c;
        const r = chip.getBoundingClientRect(), w = c.offsetWidth, h = c.offsetHeight, vw = D.documentElement.clientWidth || W.innerWidth;
        const left = Math.max(10, Math.min(vw - w - 10, r.left + r.width / 2 - w / 2)), above = r.top - h - 10 > 10;
        c.style.left = Math.round(left) + 'px'; c.style.top = Math.round(above ? r.top - h - 10 : r.bottom + 10) + 'px';
        requestAnimationFrame(() => { if (card === c) c.classList.add('on'); });
        try { if (W.navigator && W.navigator.vibrate) W.navigator.vibrate(10); } catch (e) { }
    }
    function cancel() { if (hold) { clearTimeout(hold.t); hold = null; } }
    D.addEventListener('pointerdown', e => {
        if (card && !(e.target && card.contains(e.target))) close();
        if (e.isPrimary === false) { cancel(); return; }
        const chip = e.target && e.target.closest && e.target.closest(SEL);
        if (!chip || (e.button && e.button !== 0)) return;
        cancel();
        hold = { chip, x: e.clientX, y: e.clientY, t: setTimeout(() => { const c = hold && hold.chip; hold = null; if (!c) return; swallow = { chip: c, until: Date.now() + 900 }; open(c); }, HOLD_MS) };
    }, true);
    D.addEventListener('pointermove', e => { if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > SLOP) cancel(); }, true);
    ['pointerup', 'pointercancel'].forEach(n => D.addEventListener(n, cancel, true));
    /* the click that ends a long press must not toggle your own reaction */
    W.addEventListener('click', e => {
        if (!swallow || Date.now() > swallow.until) { swallow = null; return; }
        const chip = e.target && e.target.closest && e.target.closest(SEL);
        if (chip && chip === swallow.chip) { e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); }
        swallow = null;
    }, true);
    D.addEventListener('contextmenu', e => { const chip = e.target && e.target.closest && e.target.closest(SEL); if (chip) { e.preventDefault(); open(chip); } }, true);
    D.addEventListener('keydown', e => { if (card && e.key === 'Escape') close(); });
    D.addEventListener('scroll', () => { cancel(); if (card) close(); }, true);
    W.LowiReactWho = Object.assign({}, api, { open, close, isOpen: () => !!card });
})(typeof window !== 'undefined' ? window : null);
