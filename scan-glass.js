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
    function sync() {
        const cam = D.getElementById('b3Cam');
        if (cam && cam.parentElement === D.body) adopt(cam);
        const docked = !!(cam && cam.classList.contains('sg-docked') && H.classList.contains('b3-camon'));
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
        const re = () => { const cam = D.getElementById('b3Cam'); if (cam && cam.classList.contains('sg-docked')) measure(cam); };
        window.addEventListener('resize', re);
        window.addEventListener('orientationchange', () => setTimeout(re, 250));
    }
    if (D.body) boot(); else D.addEventListener('DOMContentLoaded', boot, { once: true });
    window.LowiScanGlass = { sync, measure };
})();
