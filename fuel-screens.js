/* fuel-screens.js - Oct 18 2026 (Emmanuel, iPad landscape, the Fuel bloom: "The what you ate is design not cohesive. I don't
   understand the swap feature. The last image is confusing UI.").
   The Fuel bubble opens four screens built by four different systems, so they looked like four apps:
     - Log a meal (hold Fuel)      -> spirit.js quick meal form in an R2 sheet (.sp-quick-log)
     - What did you eat?           -> the F2 meal flow in the host sheet (#sheet > #f2Sheet)
     - Today's step / Your pick    -> spirit.js showPick() in an R2 sheet (.sp-pick)
     - Swap / Craving SOS          -> #sos (index.html openSOS, now two steps)
     - Snack "What can I buy here?"-> store-picks.js (.stp-card)
   This module marks each of them .fs-panel (fuel-screens.css paints them as one family in the Home bubble glass), gives
   every one exactly one close control (top right, inside the panel: the bottom-centre #whX is hidden while a Fuel panel
   is open), and on iPad / desktop docks the panel beside Misty near the Fuel bubble, sized to its content, using the same
   tested dockSpot() as misty-bloom.js. Phones keep a floating sheet at the bottom.
   Paint and placement only: every button keeps its own handler. */
(function (root) {
    'use strict';
    /* pure: where a Fuel panel goes. g: {vw, vh, top, misty {l,t,r,b} | null, bub {x,y} | null, natH(w), dock (fn = dockSpot)} */
    function spot(g) {
        if (!g || g.vw < 700 || !g.misty || !g.bub || typeof g.dock !== 'function') return { mode: 'sheet' };
        const s = g.dock({ vw: g.vw, vh: g.vh, top: g.top || 10, margin: 12, gap: 14, misty: g.misty, bub: g.bub, want: 440, minW: 300, minH: 200, natH: g.natH });
        return s ? Object.assign({ mode: 'dock' }, s) : { mode: 'sheet' };
    }
    /* which Fuel screen a panel element is, or '' */
    function kindOf(el) {
        if (!el || !el.classList) return '';
        if (el.id === 'sos') return 'swap';
        if (el.id === 'sheet') return el.querySelector && el.querySelector('#f2Sheet') ? 'eat' : '';
        /* Shop (store-picks .stp-card) keeps its own look for now: its bottom close and its paged list need their own small
           change in store-picks.js/.css (second release). Do not tag it here until that ships. */
        if (el.classList.contains('r2-sh') && el.querySelector) {
            if (el.querySelector('.sp-pick')) return 'pick';
            if (el.querySelector('.sp-quick-log')) return 'log';
        }
        return '';
    }
    const API = { spot, kindOf };
    if (typeof module === 'object' && module.exports) module.exports = API;
    if (!root || !root.document) return;
    const W = root, D = W.document, H = D.documentElement;
    if (W.LowiFuelScreens) return;
    W.LowiFuelScreens = API;

    function shown(el) {
        if (!el || !el.isConnected) return false;
        if (el.id === 'sos') return el.classList.contains('open');
        if (el.id === 'sheet') { const w = D.getElementById('sheetwrap'); return !!(w && w.classList.contains('open')); }
        const ov = el.closest('.r2-ov');
        if (ov) return !ov.classList.contains('off');
        return true;
    }
    function candidates() {
        const out = [];
        const sos = D.getElementById('sos'); if (sos) out.push(sos);
        const sh = D.getElementById('sheet'); if (sh) out.push(sh);
        D.querySelectorAll('.r2-ov .r2-sh, .stp-ov .stp-card').forEach(e => out.push(e));
        return out;
    }
    function fuelBubble() {
        const b = D.querySelector('#whHud [data-orbit="fuel"]') || D.querySelector('[data-orbit="fuel"]') || D.querySelector('#whHud .wh-meals');
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return r.width > 2 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    }
    function mistyRect() {
        const sp = D.getElementById('spBubble'); if (!sp) return null;
        const r = sp.getBoundingClientRect();
        return r.width > 2 ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null;
    }
    const VARS = ['--fs-l', '--fs-t', '--fs-w', '--fs-h'];
    function undock(p) { p.classList.remove('fs-dock'); VARS.forEach(k => p.style.removeProperty(k)); delete p.dataset.fsSide; }
    function place(p) {
        let top = 12;
        try { top = Math.max(12, (parseFloat(getComputedStyle(H).getPropertyValue('--sat')) || 0) + 12); } catch (e) { }
        const home = H.classList.contains('wh-home');
        const vw = W.innerWidth, vh = W.innerHeight;
        p.classList.add('fs-measure', 'fs-dock');
        p.style.setProperty('--fs-l', '12px'); p.style.setProperty('--fs-t', '12px'); p.style.setProperty('--fs-h', 'none');
        const natH = w => { p.style.setProperty('--fs-w', w + 'px'); return Math.ceil(p.scrollHeight || p.getBoundingClientRect().height); };
        const s = spot({ vw, vh, top, misty: home ? mistyRect() : null, bub: home ? fuelBubble() : null, natH, dock: W.LowiBloomDock && W.LowiBloomDock.dockSpot });
        if (s.mode !== 'dock') undock(p);
        else {
            p.style.setProperty('--fs-l', s.l + 'px'); p.style.setProperty('--fs-t', s.t + 'px');
            p.style.setProperty('--fs-w', s.w + 'px'); p.style.setProperty('--fs-h', s.h + 'px');
            p.dataset.fsSide = s.side;
        }
        p.classList.remove('fs-measure');
        /* the bloom (misty-bloom.css) grows the panel out of the tapped spot: aim it at the panel's new place */
        try {
            if (p.classList.contains('mb-on') && W.LowiBloom && W.LowiBloom.origin) {
                const o = W.LowiBloom.origin(), r = p.getBoundingClientRect();
                p.style.setProperty('--mb-dx', Math.round(o.x - (r.left + r.width / 2)) + 'px');
                p.style.setProperty('--mb-dy', Math.round(o.y - (r.top + r.height / 2)) + 'px');
            }
        } catch (e) { }
        p.__fsKey = vw + 'x' + vh + ':' + p.scrollHeight;
    }
    let raf = 0;
    function sync() {
        raf = 0;
        let open = 0;
        candidates().forEach(p => {
            const k = kindOf(p);
            if (!k) { if (p.classList.contains('fs-panel')) { p.classList.remove('fs-panel', 'fs-swap', 'fs-eat', 'fs-pick', 'fs-log', 'fs-snack'); undock(p); } return; }
            p.classList.add('fs-panel', 'fs-' + k);
            p.dataset.fs = k;
            if (!shown(p)) return;
            open++;
            const key = W.innerWidth + 'x' + W.innerHeight + ':' + p.scrollHeight;
            if (p.__fsKey !== key || !p.__fsHtml || p.__fsHtml !== p.childElementCount + ':' + (p.firstElementChild && p.firstElementChild.className)) {
                place(p);
                p.__fsHtml = p.childElementCount + ':' + (p.firstElementChild && p.firstElementChild.className);
            }
        });
        H.classList.toggle('fs-open', open > 0);
    }
    function soon() { if (!raf) raf = requestAnimationFrame(sync); }
    function burst() { soon(); setTimeout(soon, 60); setTimeout(soon, 260); setTimeout(soon, 700); }
    W.LowiFuelScreens.sync = () => { sync(); };
    W.LowiFuelScreens.burst = burst;

    /* #sos lived inside the app shell (absolute, under the Home layers on the ring Home); a Fuel panel floats in the page */
    function adoptSOS() {
        const s = D.getElementById('sos');
        if (s && s.parentNode !== D.body) D.body.appendChild(s);
        return s;
    }
    function watch() {
        const s = adoptSOS(), sw = D.getElementById('sheetwrap'), sh = D.getElementById('sheet');
        const mo = new MutationObserver(burst);
        mo.observe(D.body, { childList: true });
        if (s) mo.observe(s, { attributes: true, attributeFilter: ['class'], childList: true });
        if (sw) mo.observe(sw, { attributes: true, attributeFilter: ['class'] });
        if (sh) mo.observe(sh, { childList: true });
        /* no subtree observer (the game toggles classes every frame): R2 overlays settle within the burst after they are
           added, and in-place content changes (tabs, pages, steps) follow a tap, which bursts too */
        W.addEventListener('resize', () => { candidates().forEach(p => { p.__fsKey = ''; }); burst(); });
        W.addEventListener('orientationchange', () => setTimeout(burst, 300));
        D.addEventListener('click', burst, true);
        burst();
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', watch); else watch();
})(typeof window !== 'undefined' ? window : null);
