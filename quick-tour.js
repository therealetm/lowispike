/* quick-tour.js: Oct 26 2026 (MAYA-HANDOFF 0.38, Emmanuel: "use the same video as a quick tour on the onboarding page").
   The promo video (VIDEO below: file, poster, length) (Reels/TikTok cut, made from real app footage with a made-up account) as a Quick tour:
   - a pill on the first onboarding screen (herb-start.js step 0) and a Quick tour row next to Tutorial in Settings
     (home-settings-sleep-v2.js SETTINGS_IDS) open it; any [data-qt="open"] button does;
   - it starts muted (iOS only autoplays muted video) with a Tap for sound button, and Skip closes it at any time;
   - the video is lazy: nothing downloads until the tour opens (no src, preload none), and the service worker never caches
     or touches .mp4 (sw.js), so Safari's range requests reach the server;
   - Escape, Safari's back swipe (back-swipe.js sends Escape to the open dialog) and the end of the video close it; closing
     pauses it, drops the src (frees memory, no sound left playing) and gives focus back to the button that opened it.
   EN / DE / ES labels. The video itself is English with burned-in English captions; SRC maps a language to its own cut
   when one exists and falls back to English. */
(function (root) {
    'use strict';
    const LANGS = ['en', 'de', 'es'];
    const TX = {
        en: { open: 'Quick tour', len: '{s} s', title: 'LOWiSPIKE in {s} seconds', sound: 'Tap for sound', mute: 'Mute', skip: 'Skip', replay: 'Watch again', done: 'Done' },
        de: { open: 'Kurze Tour', len: '{s} Sek.', title: 'LOWiSPIKE in {s} Sekunden', sound: 'Tippen f\u00fcr Ton', mute: 'Ton aus', skip: '\u00dcberspringen', replay: 'Nochmal ansehen', done: 'Fertig' },
        es: { open: 'Tour r\u00e1pido', len: '{s} s', title: 'LOWiSPIKE en {s} segundos', sound: 'Toca para el sonido', mute: 'Silenciar', skip: 'Saltar', replay: 'Ver otra vez', done: 'Listo' }
    };
    /* ===== THE VIDEO: the one place to swap it (Oct 26 2026, Emmanuel: a new cut is coming) =====
       New cut: put the mp4 (H.264 + AAC, 720x1280, faststart, under 4 MB) and a small poster jpg in media/, point src / poster
       at them, set seconds to its length and bump version. Labels, title and the cache-buster follow; tests/quick-tour-swap
       checks the file's real length against seconds. A language with its own cut gets its own src entry (de: ..., es: ...). */
    const VIDEO = {
        src: { en: 'media/quick-tour-en.mp4' },
        poster: 'media/quick-tour-poster.jpg',
        seconds: 45,
        version: '1'
    };
    const SRC = VIDEO.src, POSTER = VIDEO.poster;
    const SEEN_KEY = 'lowi.quickTour.seen';
    const lang = () => { let l = 'en'; try { l = (root.LowiLang && root.LowiLang.get && root.LowiLang.get()) || (root.document && root.document.documentElement.lang) || 'en'; } catch (e) { } l = String(l).slice(0, 2).toLowerCase(); return LANGS.includes(l) ? l : 'en'; };
    const tx = (k, l) => String((TX[l || lang()] || TX.en)[k] || TX.en[k]).replace('{s}', VIDEO.seconds);
    const src = l => (SRC[l || lang()] || SRC.en) + '?v=' + VIDEO.version;
    const posterUrl = () => POSTER + '?v=' + VIDEO.version;
    /* the pill / row label: "Quick tour \u00b7 45 s" */
    const label = l => tx('open', l) + ' \u00b7 ' + tx('len', l);
    const core = { LANGS, TX, VIDEO, SRC, POSTER, SEEN_KEY, tx, src, label };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!root.document) return;

    const D = root.document;
    let ov = null, vid = null, opener = null, endTimer = 0;
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

    function isOpen() { return !!(ov && ov.isConnected && ov.classList.contains('on')); }
    function soundBtn() { return ov && ov.querySelector('[data-qt="sound"]'); }
    function syncSound() {
        const b = soundBtn(); if (!b || !vid) return;
        const muted = vid.muted;
        b.setAttribute('aria-pressed', muted ? 'false' : 'true');
        b.querySelector('span').textContent = muted ? tx('sound') : tx('mute');
        b.classList.toggle('qt-loud', !muted);
    }
    function build(l) {
        /* a modal <dialog> sits in the browser's top layer: above everything, never clipped by a parent (the start gate
           scrolls and hides overflow), and the rest of the page is inert while it is open */
        const el = D.createElement(typeof root.HTMLDialogElement === 'function' ? 'dialog' : 'div');
        el.className = 'qt-ov';
        el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', tx('title', l));
        el.innerHTML = '<div class="qt-box">' +
            '<video class="qt-vid" playsinline webkit-playsinline muted autoplay preload="none" poster="' + esc(posterUrl()) + '" aria-label="' + esc(tx('title', l)) + '"></video>' +
            '<button type="button" class="qt-tap" data-qt="sound" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>' + esc(tx('sound', l)) + '</span></button>' +
            '<button type="button" class="qt-skip" data-qt="skip">' + esc(tx('skip', l)) + '</button>' +
            '<div class="qt-bar" aria-hidden="true"><i></i></div>' +
            '<div class="qt-end" hidden><button type="button" class="qt-again" data-qt="again">' + esc(tx('replay', l)) + '</button><button type="button" class="qt-done" data-qt="skip">' + esc(tx('done', l)) + '</button></div>' +
            '</div>';
        return el;
    }
    function onTime() { if (!vid || !ov) return; const d = vid.duration || 45, i = ov.querySelector('.qt-bar i'); if (i) i.style.transform = 'scaleX(' + Math.min(1, vid.currentTime / d).toFixed(4) + ')'; }
    function onEnded() {
        try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { }
        const end = ov && ov.querySelector('.qt-end'); if (end) { end.hidden = false; const d = end.querySelector('.qt-done'); if (d) try { d.focus({ preventScroll: true }); } catch (e) { } }
    }
    function open(opts) {
        if (isOpen()) return true;
        if (ov && !ov.isConnected) close();
        const l = (opts && opts.lang) || lang();
        opener = (opts && opts.from) || (D.activeElement && D.activeElement !== D.body ? D.activeElement : null);
        if (ov) { ov.remove(); ov = null; }
        /* while the start gate is up, everything else in <body> is inert and hidden, so the sheet goes inside the gate */
        const gate = D.getElementById('r2gate'), gateUp = gate && gate.isConnected && root.getComputedStyle(gate).display !== 'none' && root.getComputedStyle(gate).visibility !== 'hidden';
        ov = build(l); (gateUp ? gate : D.body).appendChild(ov);
        if (ov.showModal) { try { ov.showModal(); } catch (e) { } ov.addEventListener('cancel', e => { e.preventDefault(); close(); }); }
        vid = ov.querySelector('video');
        vid.muted = true; vid.defaultMuted = true;
        vid.addEventListener('timeupdate', onTime);
        vid.addEventListener('ended', onEnded);
        vid.src = src(l);   /* lazy: the file is only requested now */
        void ov.offsetWidth; ov.classList.add('on');
        D.documentElement.classList.add('qt-open');
        const p = vid.play(); if (p && p.catch) p.catch(() => { ov && ov.classList.add('qt-paused'); });
        syncSound();
        /* after the tap that opened it has finished (WebKit keeps focus on the tapped button otherwise) */
        const me = ov; setTimeout(() => { if (ov === me) try { me.querySelector('[data-qt="skip"]').focus({ preventScroll: true }); } catch (e) { } }, 60);
        return true;
    }
    function close() {
        if (!ov) return false;
        const el = ov, v = vid; ov = null; vid = null; clearTimeout(endTimer);
        if (v) { try { v.pause(); } catch (e) { } v.removeAttribute('src'); try { v.load(); } catch (e) { } }
        el.classList.remove('on'); D.documentElement.classList.remove('qt-open');
        if (el.close && el.open) try { el.close(); } catch (e) { }
        const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) el.remove(); else endTimer = setTimeout(() => el.remove(), 260);
        const o = opener; opener = null;
        if (o && o.isConnected && o.focus) try { o.focus({ preventScroll: true }); } catch (e) { }
        return true;
    }
    function toggleSound() {
        if (!vid) return;
        vid.muted = !vid.muted;
        if (vid.paused) { const p = vid.play(); if (p && p.catch) p.catch(() => { }); }
        ov && ov.classList.remove('qt-paused');
        syncSound();
    }
    D.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('[data-qt]'); if (!b) return;
        const k = b.getAttribute('data-qt');
        if (k === 'open') { e.preventDefault(); e.stopPropagation(); open({ from: b }); }
        else if (!ov || !ov.contains(b)) return;
        else if (k === 'sound') { e.preventDefault(); toggleSound(); }
        else if (k === 'skip') { e.preventDefault(); close(); }
        else if (k === 'again') { e.preventDefault(); const end = ov.querySelector('.qt-end'); if (end) end.hidden = true; if (vid) { vid.currentTime = 0; const p = vid.play(); if (p && p.catch) p.catch(() => { }); } }
    }, true);
    /* a tap on the video itself (not a button) also turns the sound on, like Reels */
    D.addEventListener('click', e => { if (vid && e.target === vid) { e.preventDefault(); toggleSound(); } }, false);
    D.addEventListener('keydown', e => { if (isOpen() && (e.key === 'Escape' || e.key === 'Esc')) { e.preventDefault(); e.stopPropagation(); close(); } }, true);
    D.addEventListener('visibilitychange', () => { if (D.hidden && vid) try { vid.pause(); } catch (e) { } });
    /* the browser visitor's very first screen is the Add to Home Screen guide (index.html a1, mode "start"): the same pill goes
       under its "Free app: ..." line, so people can see the app before they install it. Mounted from here (the guide can draw
       before this file loads), kept in the page's language. */
    function pillHtml() { return '<i aria-hidden="true">\u25B6</i>' + esc(label()); }
    function mountPills() {
        const what = D.querySelector('#r2gate .r2-start.a1-first .a1-what');
        if (what && !(what.nextElementSibling && what.nextElementSibling.classList.contains('a1-qt'))) {
            const b = D.createElement('button'); b.type = 'button'; b.className = 'hs-qt a1-qt'; b.setAttribute('data-qt', 'open'); b.innerHTML = pillHtml();
            what.insertAdjacentElement('afterend', b);
        }
        D.querySelectorAll('.a1-qt').forEach(b => { const h = pillHtml(); if (b.innerHTML !== h) b.innerHTML = h; });
    }
    function watch() {
        mountPills();
        try { new MutationObserver(() => mountPills()).observe(D.getElementById('r2gate') || D.body, { childList: true, subtree: true }); } catch (e) { }
        try { new MutationObserver(() => mountPills()).observe(D.documentElement, { attributes: true, attributeFilter: ['lang'] }); } catch (e) { }
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', watch, { once: true }); else watch();
    root.LowiQuickTour = Object.assign({ open, close, isOpen, mountPills }, core);
})(typeof window !== 'undefined' ? window : globalThis);
