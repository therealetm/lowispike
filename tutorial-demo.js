/* tutorial-demo.js: the short base tour's auto demo (Oct 25 2026, Emmanuel: "a brown hand/finger in my skin tone taps or holds the
   real bubbles, real pages open and visibly show their content", "Scan in the tour never calls the camera").

   run({ root, el, g, onGesture, onShown }) shows the finger on the tour layer: it glides to the real bubble `el`, taps it (g 'tap'),
   holds it with a filling ring (g 'hold') or drags it a little (g 'drag', the joystick), then calls onGesture() so the tour opens the
   real place read-only, steps aside so the page stays readable, and calls onShown() once the page has been visible for SHOW ms.
   The finger is a picture only: it never dispatches a touch to the app, so nothing is ever logged by the demo.

   scanOpen(root, lang) is the mocked Scan screen: a sample photo inside a camera frame, a shutter, and after shutter() a verdict marked
   Demo ("Kaum Spike · 9/10"). It never touches getUserMedia, so iOS never asks for the camera during the tour; the real permission
   prompt comes at the first real scan. */
(function (root) {
    'use strict';
    if (!root || !root.document) { if (typeof module !== 'undefined') module.exports = {}; return; }
    const W = root, D = W.document;
    const T = { MOVE: 650, TAP: 260, HOLD: 950, DRAG: 1300, AFTER: 380, SHOW: 2600, SHUTTER_GAP: 650, VERDICT: 2600 };
    /* Emmanuel's chosen brown skin tone lives in one place: --lt-skin (tutorial-demo.css) */
    const HAND = '<svg class="ltd-svg" viewBox="0 0 64 80" aria-hidden="true" focusable="false">' +
        '<path class="ltd-skin" d="M24 6c0-3.3 2.7-6 6-6s6 2.7 6 6v26.5c1.1-1.3 2.8-2.1 4.6-2.1 2.6 0 4.8 1.6 5.6 3.9 1-.7 2.2-1.1 3.5-1.1 2.7 0 5 1.8 5.7 4.3.8-.4 1.7-.6 2.6-.6 3.3 0 6 2.7 6 6V58c0 12.2-9.8 22-22 22h-3.4c-6.4 0-12.4-3-16.3-8.1L4.2 52.3c-1.9-2.5-1.5-6.1 1-8.1 2.4-1.9 5.9-1.6 7.9.7L24 56.6V6z"/>' +
        '<path class="ltd-nail" d="M26.2 7.2c0-2.1 1.7-3.8 3.8-3.8s3.8 1.7 3.8 3.8v4.3c0 .9-.7 1.6-1.6 1.6h-4.4c-.9 0-1.6-.7-1.6-1.6V7.2z"/>' +
        '<path class="ltd-line" d="M36 33v12M46.2 35.8V46M55.4 39.5V47"/></svg>';
    const TIP = { x: 30, y: 2 };   /* the fingertip inside the 64x80 picture, scaled by --ltd-size */
    let tok = 0, timers = [], hand = null, ring = null, knob = null, scan = null;
    const reduced = () => { try { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) || D.documentElement.classList.contains('lowi-rm'); } catch (e) { return false; } };
    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
    function clear() { timers.forEach(t => clearTimeout(t)); timers = []; }
    function nodes(host) {
        if (!hand || !hand.isConnected) {
            hand = D.createElement('div'); hand.className = 'ltd-hand'; hand.setAttribute('aria-hidden', 'true'); hand.innerHTML = HAND;
            ring = D.createElement('div'); ring.className = 'ltd-ring'; ring.setAttribute('aria-hidden', 'true');
            knob = D.createElement('div'); knob.className = 'ltd-knob'; knob.setAttribute('aria-hidden', 'true');
        }
        if (host && hand.parentNode !== host) { host.appendChild(ring); host.appendChild(knob); host.appendChild(hand); }
    }
    function scale() { const v = parseFloat(getComputedStyle(hand).getPropertyValue('--ltd-size')) || 64; return v / 64; }
    function put(x, y, ms) {
        const k = scale();
        hand.style.transitionDuration = (reduced() ? 0 : ms || 0) + 'ms';
        hand.style.transform = 'translate(' + Math.round(x - TIP.x * k) + 'px,' + Math.round(y - TIP.y * k) + 'px)';
        hand.dataset.x = Math.round(x); hand.dataset.y = Math.round(y);
    }
    function center(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; }
    function ringAt(p, size, cls) {
        ring.className = 'ltd-ring'; void ring.offsetWidth;
        ring.style.left = Math.round(p.x - size / 2) + 'px'; ring.style.top = Math.round(p.y - size / 2) + 'px';
        ring.style.width = ring.style.height = Math.round(size) + 'px';
        if (cls) ring.classList.add(cls);
    }
    function press(on) { hand.classList.toggle('ltd-down', !!on); }
    function aside(p) {
        /* step out of the way of the page that just opened: down to the lower edge on the side of the bubble */
        const x = Math.min(innerWidth - 40, Math.max(40, p.x < innerWidth / 2 ? 34 : innerWidth - 34));
        put(x, innerHeight + 40, T.MOVE); hand.classList.add('ltd-away');
    }
    /* one gesture on one element; resolves through cb(true) when done, cb(false) when stopped */
    function gesture(el, g, mine, cb) {
        if (!el) { cb(true); return; }
        const p = center(el), size = Math.max(54, Math.min(110, Math.max(p.r.width, p.r.height) + 18));
        hand.classList.remove('ltd-away', 'ltd-hide'); hand.dataset.g = g;
        if (!hand.dataset.x) put(innerWidth * 0.78, innerHeight + 30, 0);
        void hand.offsetWidth;
        put(p.x, p.y, T.MOVE);
        later(() => {
            if (mine !== tok) return;
            press(true);
            if (g === 'hold') {
                ringAt(p, size, 'ltd-holding'); ring.style.animationDuration = T.HOLD + 'ms';
                later(() => { if (mine !== tok) return; press(false); ring.className = 'ltd-ring'; cb(true); }, T.HOLD);
            } else if (g === 'drag') {
                knob.style.left = Math.round(p.x - 17) + 'px'; knob.style.top = Math.round(p.y - 17) + 'px'; knob.classList.add('ltd-on');
                knob.style.transform = 'translate(0,0)';
                const path = [[34, -26], [-30, -20], [0, 0]], each = T.DRAG / path.length;
                path.forEach((d, n) => later(() => {
                    if (mine !== tok) return;
                    put(p.x + d[0], p.y + d[1], each * 0.9);
                    knob.style.transitionDuration = (reduced() ? 0 : each * 0.9) + 'ms';
                    knob.style.transform = 'translate(' + d[0] + 'px,' + d[1] + 'px)';
                }, n * each));
                later(() => { if (mine !== tok) return; press(false); knob.classList.remove('ltd-on'); cb(true); }, T.DRAG + 60);
            } else {
                ringAt(p, size, 'ltd-tapping');
                later(() => { if (mine !== tok) return; press(false); cb(true); }, T.TAP);
            }
        }, reduced() ? 120 : T.MOVE + 40);
    }
    function stop() {
        tok++; clear();
        if (hand) { press(false); hand.classList.add('ltd-hide'); delete hand.dataset.x; }
        if (ring) ring.className = 'ltd-ring';
        if (knob) knob.classList.remove('ltd-on');
    }
    /* opts: { root, el, g, onGesture(), onShown(), then(done) } — then: an extra demo phase after the page opened (the mocked Scan's
       shutter), called with a function to call when it has finished */
    function run(o) {
        stop(); const mine = ++tok; nodes(o.root);
        hand.classList.remove('ltd-hide');
        gesture(o.el, o.g || 'tap', mine, ok => {
            if (!ok || mine !== tok) return;
            try { if (o.onGesture) o.onGesture(); } catch (e) { }
            const shown = () => { if (mine !== tok) return; later(() => { if (mine === tok && o.onShown) o.onShown(); }, o.show == null ? T.SHOW : o.show); };
            if (o.then) later(() => { if (mine !== tok) return; try { o.then(shown, mine); } catch (e) { shown(); } }, T.AFTER);
            else { later(() => { if (mine === tok) aside(center(o.el)); }, T.AFTER); shown(); }
        });
        return mine;
    }
    const alive = m => m === tok;

    /* ---------- the mocked Scan screen ---------- */
    const SCAN = {
        en: { tag: 'Demo · camera stays off', food: 'Scrambled eggs with avocado', verdict: 'Barely a spike', demo: 'Demo', shutter: 'Take photo', note: 'Your real first scan asks for the camera.' },
        de: { tag: 'Demo · Kamera bleibt aus', food: 'Rührei mit Avocado', verdict: 'Kaum Spike', demo: 'Demo', shutter: 'Foto aufnehmen', note: 'Erst dein echter erster Scan fragt nach der Kamera.' },
        es: { tag: 'Demo · la cámara sigue apagada', food: 'Huevos revueltos con aguacate', verdict: 'Apenas pico', demo: 'Demo', shutter: 'Hacer foto', note: 'Tu primer escaneo real pedirá la cámara.' }
    };
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
    function scanOpen(host, lang) {
        scanClose();
        const L = SCAN[lang] || SCAN.en;
        scan = D.createElement('div'); scan.className = 'lt-scan'; scan.setAttribute('data-demo', 'scan');
        scan.innerHTML = '<div class="lts-frame"><img class="lts-photo" src="tutorial-img/scan-sample.webp" alt="' + esc(L.food) + '" draggable="false">' +
            '<span class="lts-corner lts-tl"></span><span class="lts-corner lts-tr"></span><span class="lts-corner lts-bl"></span><span class="lts-corner lts-br"></span>' +
            '<span class="lts-tag">' + esc(L.tag) + '</span><span class="lts-flash"></span></div>' +
            '<div class="lts-bar"><span class="lts-shutter" role="img" aria-label="' + esc(L.shutter) + '"></span></div>' +
            '<div class="lts-verdict" role="status" aria-live="polite"><span class="lts-demo">' + esc(L.demo) + '</span>' +
            '<b class="lts-score">' + esc(L.verdict) + ' \u00b7 9/10</b><span class="lts-food">' + esc(L.food) + '</span><small class="lts-note">' + esc(L.note) + '</small></div>';
        (host || D.body).appendChild(scan);
        return scan;
    }
    function scanShutter() {
        if (!scan) return;
        scan.classList.add('lts-shot');
        setTimeout(() => { if (scan) scan.classList.add('lts-done'); }, 420);
    }
    function scanClose() { if (scan) { try { scan.remove(); } catch (e) { } } scan = null; }
    /* the Scan step's second phase: the finger presses the mocked shutter, the verdict appears */
    function scanThen(done, mine) {
        const sh = scan && scan.querySelector('.lts-shutter');
        if (!sh) { done(); return; }
        later(() => {
            if (!alive(mine)) return;
            gesture(sh, 'tap', mine, ok => {
                if (!ok || !alive(mine)) return;
                scanShutter();
                later(() => { if (alive(mine)) aside(center(sh)); }, T.AFTER);
                later(() => { if (alive(mine)) done(); }, 420);
            });
        }, T.SHUTTER_GAP);
    }
    if (!D.getElementById('ltdCss')) { const mb = D.querySelector('meta[name="lowi-build"]'), k = D.createElement('link'); k.id = 'ltdCss'; k.rel = 'stylesheet'; k.href = 'tutorial-demo.css?v=' + encodeURIComponent((mb && mb.content) || '1'); D.head.appendChild(k); }
    W.LowiTutorialDemo = { T, run, stop, alive, scanOpen, scanShutter, scanClose, scanThen, isScanOpen: () => !!(scan && scan.isConnected), SCAN };
    if (typeof module !== 'undefined') module.exports = W.LowiTutorialDemo;
})(typeof window !== 'undefined' ? window : null);
