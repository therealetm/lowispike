/* LOWiSPIKE hunt count (Oct 17, build 20261017-1xxxxx). E-man inside a world: "how many are left? Now I'm just flying around,
   not knowing if there are still any, or I've already ate all of the ones that are in there."
   A slim line that continues the Daily Quest glass box while Misty is inside a world: the world's name, one dot per crumb
   (filled = collected) and "2/6 collected · 4 left"; when all are gone it says the world is clean.
   - The numbers come only from misty-hunt.js ('lowi:hunt-count' / LowiMistyHunt.tally()): the crumbs that are really there,
     so it is right after a reload, on a world switch, on a new day and when today's food changed the number of crumbs.
   - Event driven: it re-renders on a count change and re-measures on resize / when the box changes size. No frame loop.
   - Not a button and not a popup: no touches, no timers, no sound. Screen readers hear the change (polite live region).
   - Speech bubbles, Misty, the cell guide and the controls stay on top: the line sits under the box, below their layers. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;
    const L = {
        en: { go: '{c}/{n} collected', left: '{l} left', clean: 'World clean', all: 'all {n} collected', aria: '{w}: {c} of {n} collected, {l} left.', ariaClean: '{w} is clean: all {n} collected.' },
        de: { go: '{c}/{n} gesammelt', left: 'noch {l}', clean: 'Welt sauber', all: 'alle {n} gesammelt', aria: '{w}: {c} von {n} gesammelt, noch {l}.', ariaClean: '{w} ist sauber: alle {n} gesammelt.' },
        es: { go: '{c}/{n} recogidos', left: 'quedan {l}', clean: 'Mundo limpio', all: 'los {n} recogidos', aria: '{w}: {c} de {n} recogidos, quedan {l}.', ariaClean: '{w} está limpio: los {n} recogidos.' }
    };
    const fill = (s, v) => String(s).replace(/\{(\w)\}/g, (m, k) => (v[k] != null ? v[k] : ''));
    /* pure, tested: what the line says for a count {n, left} in a language. null = nothing to show (no hunt here) */
    function model(c, lang, world) {
        const n = Math.max(0, Math.floor(+(c && c.n) || 0));
        if (!c || !c.world || c.world === 'hub' || !n) return null;
        const left = Math.max(0, Math.min(n, Math.floor(+c.left || 0))), got = n - left, T = L[String(lang || 'en').slice(0, 2)] || L.en, w = world || '';
        const v = { c: got, n, l: left, w };
        const dots = n <= 12 ? Array.from({ length: n }, (_, i) => i < got) : null;
        if (!left) return { clean: true, n, left, got, world: w, main: T.clean, sub: fill(T.all, v), aria: fill(T.ariaClean, v), dots };
        return { clean: false, n, left, got, world: w, main: fill(T.go, v), sub: fill(T.left, v), aria: fill(T.aria, v), dots };
    }
    const core = { L, model };
    if (typeof module !== 'undefined' && module.exports) module.exports = core;
    W.LowiHuntCount = core;
    if (!D || !D.addEventListener) return;
    if (!D.getElementById('hcCss')) {
        const me = D.currentScript || D.querySelector('script[src*="hunt-count.js"]'), l = D.createElement('link'); l.id = 'hcCss'; l.rel = 'stylesheet';
        l.href = me && me.getAttribute('src') ? me.getAttribute('src').replace('hunt-count.js', 'hunt-count.css') : 'hunt-count.css';
        D.head.appendChild(l);
    }
    const H = D.documentElement;
    const lang = () => String((W.LowiI18n && W.LowiI18n.lang) || H.lang || 'de').slice(0, 2);
    const li = () => ({ en: 0, de: 1, es: 2 })[lang()] ?? 1;
    function worldName(id) { try { const R = W.LowiWorldRegions, r = R && R.byId && R.byId(id); if (r && r.n) return r.n[li()] || r.n[0]; } catch (e) { } return ''; }
    let cur = null, el = null, ro = null, lastHtml = '', lastAria = '';
    function board() { return D.getElementById('f3Board'); }
    function make() {
        if (el && el.isConnected) return el;
        const b = board(); if (!b || !b.parentElement) return null;
        el = D.getElementById('hcLine') || D.createElement('div'); el.id = 'hcLine'; el.className = 'hc-line';
        el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); el.setAttribute('aria-atomic', 'true');
        const slot = D.getElementById('hqSlot'), after = slot && slot.parentElement === b.parentElement ? slot : b;
        after.insertAdjacentElement('afterend', el);
        if (W.ResizeObserver && !ro) { ro = new ResizeObserver(() => place()); ro.observe(b); if (slot) ro.observe(slot); }
        return el;
    }
    /* under the Daily Quest box (and under the arrival card when one is in the box), same left edge and width */
    function place() {
        if (!el || !el.classList.contains('on')) return;
        const b = board(); if (!b) return;
        const slot = D.getElementById('hqSlot'), useSlot = slot && slot.classList.contains('arr-on') && slot.offsetHeight > 4 && slot.parentElement === el.parentElement;
        const lo = useSlot ? slot : b;
        const css = W.getComputedStyle ? W.getComputedStyle(b) : null, abs = css && (css.position === 'absolute' || css.position === 'fixed');
        if (abs && el.parentElement === b.parentElement) {
            el.style.position = css.position === 'fixed' ? 'fixed' : 'absolute';
            el.style.left = b.offsetLeft + 'px'; el.style.width = b.offsetWidth + 'px'; el.style.top = (lo.offsetTop + lo.offsetHeight) + 'px';
        } else { el.style.position = ''; el.style.left = ''; el.style.width = ''; el.style.top = ''; }
        const r = css && parseFloat(css.borderTopLeftRadius); if (r > 0) el.style.setProperty('--hc-r', Math.min(26, r) + 'px');
        /* the box steps away in some views (sheets, map zoom, warps): the line follows it instead of floating alone */
        const gone = !css || css.display === 'none' || css.visibility === 'hidden' || +css.opacity < 0.15 || !b.offsetWidth;
        el.classList.toggle('hc-away', gone);
        H.classList.toggle('hc-slot', !!useSlot);
        /* an XP card (herb-quests.js) that popped just before the line came: move it below the line */
        const pop = D.querySelector('.hq-pop.on');
        if (pop && !el.classList.contains('hc-away')) { const a = el.getBoundingClientRect(), q = pop.getBoundingClientRect(); if (a.height && q.top < a.bottom && q.bottom > a.top) pop.style.top = Math.round(a.bottom + 10) + 'px'; }
    }
    function render() {
        const m = H.classList.contains('wh-home') ? model(cur, lang(), cur && worldName(cur.world)) : null;
        const b = board();
        if (!m) {
            if (el) { el.classList.remove('on'); el.setAttribute('aria-hidden', 'true'); }
            if (b) b.classList.remove('hc-joined'); H.classList.remove('hc-on', 'hc-slot'); return;
        }
        if (!make()) return;
        const dots = m.dots ? '<span class="hc-dots" aria-hidden="true">' + m.dots.map(x => '<i' + (x ? ' class="got"' : '') + '></i>').join('') + '</span>' : '';
        const html = (m.clean ? '<span class="hc-ok" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3.5 8.4l3 3 6-6.6"/></svg></span>' : '') +
            '<span class="hc-w" aria-hidden="true"></span>' + dots + '<span class="hc-t" aria-hidden="true"><b></b><span class="hc-sep">\u00b7</span><span class="hc-sub"></span></span>';
        if (html !== lastHtml || el.childElementCount === 0) { el.innerHTML = html; lastHtml = html; }
        el.querySelector('.hc-w').textContent = m.world; el.querySelector('.hc-t b').textContent = m.main; el.querySelector('.hc-sub').textContent = m.sub;
        el.classList.toggle('clean', m.clean);
        if (m.aria !== lastAria) { el.setAttribute('aria-label', m.aria); lastAria = m.aria; }
        el.removeAttribute('aria-hidden');
        el.classList.add('on'); if (b) b.classList.add('hc-joined'); H.classList.add('hc-on');
        place();
    }
    W.addEventListener('lowi:hunt-count', e => { cur = e && e.detail ? Object.assign({}, e.detail) : null; render(); });
    /* back to the bloodstream / world map: no world, no count (misty-hunt.js also sends a zero count then) */
    W.addEventListener('lowi:world-region', e => { const id = e && e.detail && e.detail.id; if (!id || id === 'hub' || (cur && cur.world !== id)) { cur = null; render(); } });
    W.addEventListener('lowi:lang', () => { lastAria = ''; render(); });
    W.addEventListener('resize', () => place(), { passive: true });
    W.addEventListener('orientationchange', () => setTimeout(place, 250), { passive: true });
    /* home on / off (other tabs, onboarding): follow the html class that world-home.js sets */
    let mt = 0;
    try { new MutationObserver(() => { const on = H.classList.contains('wh-home'); if (on !== render.on) { render.on = on; render(); }
        else if (el && el.classList.contains('on')) { clearTimeout(mt); mt = setTimeout(place, 420); } }).observe(H, { attributes: true, attributeFilter: ['class'] }); } catch (e) { }
    W.addEventListener('lowi:arrival', () => setTimeout(place, 360));
    function boot() { try { const M = W.LowiMistyHunt; if (M && M.tally) { const c = M.tally(); if (c && c.world) { cur = c; render(); } } } catch (e) { } }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
