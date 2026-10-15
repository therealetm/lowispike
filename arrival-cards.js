/* LOWiSPIKE arrival cards (Oct 15, 2026; body-universe depth layer). One gold, glowing card when your cell arrives in a
   body place: the place's name, one short real fact, and how today's logged entries show up there (arrival-core.js).
   - 3D world regions (body-world-regions.js, event 'lowi:world-region'): the card IS the region's arrival label. It sits
     near the top of the world, only the card takes touches (drag/pinch/gyro keep working everywhere else), X closes it,
     it fades by itself after a while and goes when you leave the region or close the world. While it shows, the region
     label and the place text of the base card step aside (one label card at a time; the base card keeps its buttons).
     Without the regions module the base world's 'lowi:world3d-place' shows it.
   - Cell ride (body-ride.js, 'lowi:ride-arrive'): the ride's own arrival card becomes this card (same buttons, plus X).
   - Body journeys (body-trips.js, 'lowi:body-trip-done'): the surprise sheet gets the gold "today here" strip.
   - Anywhere else: LowiArrival.show(id) floats the card at the top of the screen (no backdrop, nothing blocked).
   Never touches WebGL. API: window.LowiArrival {show(id, opts), close(), current(), core}. Event out: 'lowi:arrival' {place, where}. */
(function () {
    'use strict';
    const W = window, D = document;
    if (W.LowiArrival) return;
    const C = () => W.LowiArrivalCore;
    const lang = () => { try { return String(W.LowiLang.get() || 'de').slice(0, 2).toLowerCase(); } catch (e) { return String(D.documentElement.lang || 'de').slice(0, 2).toLowerCase(); } };
    const L = () => { const v = { en: 0, de: 1, es: 2 }[lang()]; return v == null ? 1 : v; };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const state = () => { try { return (W.LowiVitalsBridge && W.LowiVitalsBridge.state()) || {}; } catch (e) { return {}; } };
    const STAY_MS = 15000;
    let cur = null, last = { id: '', t: 0 };

    function css() {
        if (D.getElementById('arrCss')) return;
        const l = D.createElement('link'); l.id = 'arrCss'; l.rel = 'stylesheet';
        const me = D.querySelector('script[src*="arrival-cards.js"]');
        l.href = me ? me.getAttribute('src').replace('arrival-cards.js', 'arrival-cards.css') : 'arrival-cards.css';
        D.head.appendChild(l);
    }
    function data(id) { try { return C() && C().card(id, state(), Date.now(), L(), W.LowiWorldHealth); } catch (e) { return null; } }
    const XSVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    function inner(c) {
        return '<div class="arr-hd"><span class="arr-orb" aria-hidden="true"></span><div class="arr-tt"><small>' + esc(c.over) + '</small><b>' + esc(c.name) + '</b></div>' +
            '<button type="button" class="arr-x" data-arr-x aria-label="' + esc(c.close) + '">' + XSVG + '</button></div>' +
            '<p class="arr-fact"><span>' + esc(c.factLabel) + '</span>' + esc(c.fact) + '</p>' +
            '<p class="arr-today"><span>' + esc(c.todayLabel) + '</span>' + esc(c.today) + '</p>';
    }
    function shield(el) { ['pointerdown', 'pointermove', 'touchstart', 'touchmove', 'wheel', 'mousedown'].forEach(n => el.addEventListener(n, e => e.stopPropagation(), { passive: true })); }
    function worldHost() {
        const a = W.LowiWorld3D; if (!a || !a.isOpen || !a.isOpen()) return null;
        const h = D.querySelector('.bw3-full'); return h && h.isConnected ? h : null;
    }
    const rideOpen = () => !!D.getElementById('brOv');
    function emit(id, where) { try { W.dispatchEvent(new CustomEvent('lowi:arrival', { detail: { place: id, where } })); } catch (e) {} }

    function close(how) {
        const c = cur; cur = null; if (!c) return;
        clearTimeout(c.t);
        if (c.host) c.host.classList.remove('arr-on');
        const el = c.el; if (!el) return;
        if (c.where === 'ride') { el.remove(); return; }
        el.classList.remove('on'); el.classList.add('out');
        setTimeout(() => el.remove(), reduced() || how === 'now' ? 0 : 320);
    }
    function arm(c) {
        clearTimeout(c.t);
        if (c.where === 'ride') return; /* the ride card stays until the ride goes on, like before */
        c.t = setTimeout(() => { if (cur === c && !c.hold) close(); else if (cur === c) arm(c); }, STAY_MS);
    }
    function mount(el, parent, where, host, id) {
        el.addEventListener('click', e => { if (e.target.closest('[data-arr-x]')) { e.preventDefault(); e.stopPropagation(); close(); } });
        shield(el);
        const c = { el, where, host, id, t: 0, hold: false };
        el.addEventListener('pointerenter', () => { c.hold = true; }); el.addEventListener('pointerleave', () => { c.hold = false; });
        el.addEventListener('focusin', () => { c.hold = true; }); el.addEventListener('focusout', () => { c.hold = false; });
        parent.appendChild(el); cur = c;
        if (host) host.classList.add('arr-on');
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
        arm(c); emit(id, where);
        return el;
    }
    function build(c, cls) {
        const el = D.createElement('section'); el.className = 'arr-card ' + cls; el.id = 'arrCard';
        el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); el.dataset.place = c.id; el.style.setProperty('--h', c.hue);
        el.innerHTML = inner(c); return el;
    }

    /* ---------- the three places a card can appear ---------- */
    function inWorld(id) {
        const h = worldHost(); if (!h) return null;
        const c = data(id); if (!c) return null;
        close('now'); css();
        return mount(build(c, 'arr-world'), h, 'world', h, c.id);
    }
    function floating(id) {
        const c = data(id); if (!c) return null;
        close('now'); css();
        return mount(build(c, 'arr-float'), D.body, 'float', null, c.id);
    }
    function inRide(id, tries) {
        const ov = D.getElementById('brOv'); if (!ov) return null;
        const rc = ov.querySelector('.br-cards .br-c-arrive');
        if (!rc) { if ((tries || 0) < 10) setTimeout(() => inRide(id, (tries || 0) + 1), 60); return null; }
        if (rc.dataset.arr) return rc;
        const c = data(id); if (!c) return null;
        close('now'); css();
        const btns = rc.querySelector('.br-cbtn');
        rc.dataset.arr = c.id; rc.classList.add('arr-card', 'arr-ride', 'on'); rc.style.setProperty('--h', c.hue);
        rc.innerHTML = '<div class="arr-body">' + inner(c) + '</div>';
        if (btns) rc.querySelector('.arr-body').appendChild(btns);
        rc.addEventListener('click', e => { if (e.target.closest('[data-arr-x]')) { e.preventDefault(); e.stopPropagation(); close(); } });
        shield(rc);
        cur = { el: rc, where: 'ride', host: null, id: c.id, t: 0 };
        emit(c.id, 'ride');
        return rc;
    }
    function inTrip(place, tries) {
        const id = C() && C().pid(place); if (!id) return null;
        const sh = Array.from(D.querySelectorAll('.bt-surprise')).pop();
        if (!sh) { if ((tries || 0) < 20) setTimeout(() => inTrip(place, (tries || 0) + 1), 60); return null; }
        if (sh.querySelector('.arr-strip')) return sh;
        const c = data(id); if (!c) return null; css();
        const s = D.createElement('div'); s.className = 'arr-strip'; s.style.setProperty('--h', c.hue);
        s.innerHTML = '<span class="arr-orb" aria-hidden="true"></span><p><small>' + esc(c.todayLabel) + ' \u00b7 ' + esc(c.name) + '</small>' + esc(c.today) + '</p>';
        const after = sh.querySelector('.bt-card');
        if (after && after.parentNode) after.parentNode.insertBefore(s, after.nextSibling); else sh.appendChild(s);
        emit(id, 'trip');
        return sh;
    }

    function offHome() { const h = D.documentElement; if (h.classList.contains('gx-out') || h.classList.contains('gx-hold')) return true; const t = D.querySelector('.tab.active'); return !!(t && t.id === 'tab-foryou'); }
    /* public: show(id) picks the right surface */
    function show(id, opts) {
        opts = opts || {};
        /* Oct 16: never over the Community galaxy (a "You arrived: Brain" card popped up there during the zoom) */
        if (!opts.force && !rideOpen() && offHome()) return null;
        const p = C() && C().pid(id); if (!p) return null;
        const now = Date.now();
        if (!opts.force && p === last.id && now - last.t < 2500 && cur && cur.id === p) return cur.el;
        last = { id: p, t: now };
        if (rideOpen()) return inRide(p);
        if (worldHost()) return inWorld(p);
        return floating(p);
    }

    /* ---------- hooks ---------- */
    const regionsOn = () => !!(W.LowiWorldRegions);
    W.addEventListener('lowi:world-region', e => {
        try {
            const d = e && e.detail || {}; const id = d.id;
            if (rideOpen()) return;
            if (!id || id === 'hub') { if (cur && cur.where === 'world') close(); return; }
            show(id);
        } catch (err) {}
    });
    W.addEventListener('lowi:world3d-place', e => {
        try { if (regionsOn() || rideOpen()) return; const id = e && e.detail && e.detail.id; if (id) show(id); } catch (err) {}
    });
    W.addEventListener('lowi:ride-arrive', e => { try { const id = e && e.detail && e.detail.place; if (id) { last = { id: C().pid(id), t: Date.now() }; inRide(C().pid(id)); } } catch (err) {} });
    W.addEventListener('lowi:ride-end', () => { if (cur && cur.where === 'ride') cur = null; });
    W.addEventListener('lowi:body-trip-done', e => { try { const d = e && e.detail || {}; inTrip(d.place); } catch (err) {} });
    /* the world closed or the card's host went away: forget it */
    setInterval(() => { if (cur && cur.el && !cur.el.isConnected) { clearTimeout(cur.t); cur = null; } }, 1500);

    /* the stylesheet comes in up front, so the first card is already styled when it slides in */
    if (D.head) css(); else D.addEventListener('DOMContentLoaded', css, { once: true });

    W.LowiArrival = { show, close: () => close(), current: () => cur && { id: cur.id, where: cur.where }, core: C };
    if (typeof module !== 'undefined' && module.exports) module.exports = W.LowiArrival;
})();
