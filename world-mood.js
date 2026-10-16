/* LOWiSPIKE game-world mood, applied (Oct 15, 2026). Reads world-mood-core.js from the app state and keeps the 3D world's
   look in step with its sound: html[data-wm=clear|stormy], --wm-filter on the world canvas, a murky veil that breathes on the
   same rhythm as the low pulse (UNEASY.pulse.every), and a short game-world line under the world's title.
   Fires window 'lowi:world-mood' on every change; LowiWorldMood.level is the live value world-audio.js fades to. */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement;
    if (W.LowiWorldMood) return;
    const C = W.LowiWorldMoodCore; if (!C) { console.warn('world-mood-core missing'); return; }
    const me = D.currentScript || D.querySelector('script[src*="world-mood.js"]');
    if (!D.getElementById('wmCss')) {
        const l = D.createElement('link'); l.id = 'wmCss'; l.rel = 'stylesheet';
        l.href = me && me.getAttribute('src') ? me.getAttribute('src').replace('world-mood.js', 'world-mood.css') : 'world-mood.css';
        D.head.appendChild(l);
    }
    const lang = () => { try { return (W.LowiLang.get() || H.lang || 'de').slice(0, 2); } catch (e) { return (H.lang || 'de').slice(0, 2); } };
    const state = () => { try { return (W.LowiVitalsBridge && W.LowiVitalsBridge.state()) || null; } catch (e) { return null; } };
    const AC = W.LowiWorldAudioCore, beat = AC && AC.UNEASY ? AC.UNEASY.pulse.every : 1.3;
    let cur = { level: 0, tier: 'clear', why: [] }, lastSig = null;
    function apply() {
        const lk = C.look(cur.level);
        H.dataset.wm = cur.tier;
        H.style.setProperty('--wm', String(cur.level));
        H.style.setProperty('--wm-filter', lk.filter);
        H.style.setProperty('--wm-veil', String(lk.veil));
        H.style.setProperty('--wm-beat', beat + 's');
        D.querySelectorAll('.bw3-stage, .bw3-full').forEach(host => {
            /* the veil sits right above the world picture and below labels, buttons and the top bar (DOM order) */
            let v = host.querySelector(':scope > .wm-veil');
            if (!v) { v = D.createElement('div'); v.className = 'wm-veil'; v.setAttribute('aria-hidden', 'true'); }
            const pic = host.querySelector(':scope > .bw3-view, :scope > canvas.bw3-canvas');
            if (pic) { if (pic.nextSibling !== v) host.insertBefore(v, pic.nextSibling); }
            else if (host.firstChild !== v) host.insertBefore(v, host.firstChild);
        });
        const top = D.querySelector('.bw3-full .bw3-top > div:first-child');
        if (top) {
            let el = top.querySelector('.wm-line'); if (!el) { el = D.createElement('span'); el.className = 'wm-line'; el.setAttribute('role', 'status'); top.appendChild(el); }
            const t = C.line(cur, lang()); if (el.textContent !== t) el.textContent = t;
            el.dataset.tier = cur.tier;
        }
    }
    function check(force) {
        const wh = W.LowiWorldHealth, s = state(), now = Date.now(), g = C.sig(s, now, wh);
        if (!force && g === lastSig) { apply(); return; }
        lastSig = g;
        const m = C.read(s, now, wh), changed = m.level !== cur.level || m.why.join() !== cur.why.join();
        cur = m; apply();
        if (changed) { try { W.dispatchEvent(new CustomEvent('lowi:world-mood', { detail: { level: m.level, tier: m.tier, why: m.why.slice() } })); } catch (e) { } }
    }
    new MutationObserver(() => { if (H.classList.contains('bw3-full-open')) apply(); }).observe(H, { attributes: true, attributeFilter: ['class'] });
    ['focus', 'storage', 'lowi:lang'].forEach(n => W.addEventListener(n, () => check(n === 'lowi:lang')));
    /* Oct 16 fast weather: react the moment something is logged (events, no extra loop); the 2 s poll stays as the safety net */
    let soon = 0;
    ['lowi:meal-logged', 'lowi:reward', 'lowi:care'].forEach(n => W.addEventListener(n, () => { if (!soon) soon = setTimeout(() => { soon = 0; check(); }, 60); }));
    D.addEventListener('visibilitychange', () => { if (!D.hidden) check(); });
    setInterval(() => { if (!D.hidden) check(); }, 2000);
    check(true);
    W.LowiWorldMood = { get level() { return cur.level; }, get tier() { return cur.tier; }, get why() { return cur.why.slice(); }, get mood() { return Object.assign({}, cur, { why: cur.why.slice() }); }, refresh: () => check(true) };
})();
