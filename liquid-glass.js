/* LOWiSPIKE Liquid Glass glue (see liquid-glass.css). Adds html.lg, mirrors the visible tab into html[data-lg-tab] and keeps
   liquid-glass.css as the very last stylesheet so the shared design wins over every older per-screen style. */
(() => {
    'use strict';
    const D = document, H = D.documentElement;
    H.classList.add('lg');
    const TAB_IDS = ['home', 'foryou', 'scan', 'shelf', 'move', 'profile'];
    function activeTab() {
        const t = D.querySelector('#main > .tab.active');
        return t && t.id ? t.id.replace(/^tab-/, '') : 'home';
    }
    function syncTab() {
        const t = activeTab();
        if (H.getAttribute('data-lg-tab') !== t) H.setAttribute('data-lg-tab', t);
    }
    function lastSheet() {
        const l = D.getElementById('lgCss');
        if (l && D.body && D.body.lastElementChild !== l) D.body.appendChild(l);
    }
    function boot() {
        syncTab(); lastSheet();
        const main = D.getElementById('main');
        if (main) new MutationObserver(syncTab).observe(main, { subtree: true, attributes: true, attributeFilter: ['class'] });
        /* moved once (not on every body change: re-inserting a sheet would flash the old design) */
        window.addEventListener('load', lastSheet, { once: true });
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
    window.LowiLiquidGlass = { activeTab, TAB_IDS };
})();
