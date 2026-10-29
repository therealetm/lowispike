/* LOWiSPIKE Scan in the shared Liquid Glass design (Oct 16, E-man: "when I click on the scan, the scan looks very different to
   everything else ... has to be fixed and aligned"). scan-glass.css restyles the camera layer; this glue keeps the app's glass
   dock visible over the camera, like on every other page:
   - the full-screen scanner (body > .b3-cam, opened by the Scan button) moves into #app, so the dock (#tabbar) can sit above it.
     #main stops being its own layer while the camera is open (html.sg-dock) and the dock is lifted over the camera.
   - --sg-dock on the scanner = space the dock takes at the bottom, so the capture panel ends just above it.
   - a tap on another tab closes the camera first and then goes there; a tap on Scan keeps the camera; the dock does not page.
   Only with the glass design (html.lg) and a horizontal dock (phone/tablet). The camera, permissions, capture and food logging
   stay in index.html untouched: this file only moves the layer and closes it through its own X. */
(() => {
    'use strict';
    const D = document, H = D.documentElement;
    if (!H.classList.contains('lg') && !D.querySelector('script[src*="liquid-glass.js"]')) return;
    const app = () => D.getElementById('app');
    const bar = () => D.getElementById('tabbar');
    function dockFlat() {
        const b = bar(); if (!b) return false;
        const r = b.getBoundingClientRect(), s = getComputedStyle(b);
        return r.width > r.height && s.display !== 'none' && s.visibility !== 'hidden';
    }
    function measure(cam) {
        const b = bar(); if (!cam || !b) return;
        const cr = cam.getBoundingClientRect(), br = b.getBoundingClientRect();
        const gap = Math.max(0, Math.round(cr.bottom - br.top));
        cam.style.setProperty('--sg-dock', gap + 'px');
    }
    function adopt(cam) {
        if (!cam || cam.__sg) return;
        if (!H.classList.contains('lg') || !dockFlat()) return;
        const a = app(); if (!a) return;
        cam.__sg = 1;
        a.appendChild(cam);   /* same node: its listeners and the camera state stay with it */
        cam.classList.add('sg-docked');
        H.classList.add('sg-dock');
        const b = bar(); if (b) b.classList.add('no-page-swipe');
        measure(cam);
        requestAnimationFrame(() => measure(cam));
    }
    /* Oct 18 (Emmanuel, Home decisions: "Scanner: X bottom right. Keep barcode, snap, flash and manual barcode entry."): the X leaves
       the top bar and sits at the bottom right of the capture panel, at the right end of the Deep analyze row, where the thumb is.
       Same node, so the app's data-b3="camclose" tap, its label and the tab-bar close above keep working. The torch stays in the top
       bar. Not inside Misty's world (#spWorld hides this X; the world has its own close). Once per scanner (openScanner builds a new one). */
    function dockX(cam) {
        if (!cam || cam.__sgx) return;
        if (cam.closest && cam.closest('#spWorld')) return;
        const x = cam.querySelector('.b3-cx[data-b3="camclose"]'), bot = cam.querySelector('.b3-cbot');
        if (!x || !bot || !D.createElement) return;
        cam.__sgx = 1;
        const row = D.createElement('div'); row.className = 'sg-xrow';
        const deep = bot.querySelector('.b3-deep');
        if (deep && deep.parentElement === bot) { bot.insertBefore(row, deep); row.appendChild(deep); } else bot.appendChild(row);
        row.appendChild(x);
        cam.classList.add('sg-xbot');
    }
    /* Oct 29 2026 (bug hunt, iPhone SE): the photo-first card (.b3-pickbox in .b3-cmsg) is centred in a box that ended a fixed
       236-250px above the bottom, but the typing panel (.b3-cbot) is taller than that, and taller still with the bottom X lifted
       (bottom-close.css). On short screens the card ran over the panel and, being on top (z 4), took the taps: the barcode field,
       Check, the food-name field and Analyze by name all hit From photos / Live barcode scan. --b3-cbot-top is the panel's real
       top, measured from the scanner's bottom, so the card's box ends just above it (scan-glass.css). */
    function fitPick(cam) {
        if (!cam || !cam.querySelector || !cam.getBoundingClientRect || !cam.style || !cam.style.setProperty) return;
        const bot = cam.querySelector('.b3-cbot'); if (!bot || !bot.getBoundingClientRect) return;
        const cr = cam.getBoundingClientRect(), br = bot.getBoundingClientRect();
        if (!br || !cr || !br.height || !cr.height) return;
        const v = Math.max(0, Math.round(cr.bottom - br.top)) + 'px';
        if (cam.__sgcb !== v) { cam.__sgcb = v; cam.style.setProperty('--b3-cbot-top', v); }
    }
    function watchPick(cam) {
        if (!cam || cam.__sgfit) return;
        const bot = cam.querySelector('.b3-cbot'); if (!bot) return;
        cam.__sgfit = 1;
        fitPick(cam);
        if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(() => fitPick(cam)); ro.observe(bot); ro.observe(cam); }
        requestAnimationFrame(() => fitPick(cam));
    }
    function sync() {
        const cam = D.getElementById('b3Cam');
        if (cam && cam.parentElement === D.body) adopt(cam);
        if (cam && !cam.__sgx) dockX(cam);
        if (cam) { watchPick(cam); fitPick(cam); }
        const docked = !!(cam && cam.classList.contains('sg-docked') && H.classList.contains('b3-camon'));
        /* Scan is the current page while the camera is open (the lit tab is scan-glass.css) */
        const sb = D.querySelector('#tabbar .tb.scan'), open = !!(cam && H.classList.contains('b3-camon'));
        if (sb && (sb.getAttribute('aria-current') === 'page') !== open) { if (open) sb.setAttribute('aria-current', 'page'); else sb.removeAttribute('aria-current'); }
        if (!docked) {
            /* only when set: classList.remove always rewrites the attribute, which would wake the class observer again */
            if (H.classList.contains('sg-dock')) H.classList.remove('sg-dock');
            const b = bar(); if (b && b.classList.contains('no-page-swipe')) b.classList.remove('no-page-swipe');
        }
    }
    /* a tab tapped while the camera is open: Scan keeps it, any other tab closes it through its own X and then opens */
    D.addEventListener('click', e => {
        if (!H.classList.contains('sg-dock')) return;
        const tb = e.target && e.target.closest && e.target.closest('#tabbar .tb, #tabbar button');
        if (!tb) return;
        const cam = D.getElementById('b3Cam'); if (!cam) return;
        const isScan = tb.classList.contains('scan') || tb.dataset.tab === 'scan';
        if (isScan) { e.preventDefault(); e.stopPropagation(); return; }
        const x = cam.querySelector('[data-b3="camclose"]');
        if (x) x.click();
        if (H.classList.contains('sg-dock')) H.classList.remove('sg-dock');
    }, true);
    /* liquid-glass.js moves its sheet to the end of <body> on load; this sheet follows it so Scan's rules keep the last word */
    function lastSheet() {
        const l = D.getElementById('sgCss');
        if (l && D.body && D.body.lastElementChild !== l) D.body.appendChild(l);
    }
    function boot() {
        sync(); lastSheet();
        window.addEventListener('load', lastSheet, { once: true });
        new MutationObserver(sync).observe(D.body, { childList: true });
        new MutationObserver(sync).observe(H, { attributes: true, attributeFilter: ['class'] });
        const re = () => { const cam = D.getElementById('b3Cam'); if (cam) fitPick(cam); if (cam && cam.classList.contains('sg-docked')) measure(cam); };
        window.addEventListener('resize', re);
        window.addEventListener('orientationchange', () => setTimeout(re, 250));
    }
    if (D.body) boot(); else D.addEventListener('DOMContentLoaded', boot, { once: true });
    window.LowiScanGlass = { sync, measure, dockX, fitPick };
})();
