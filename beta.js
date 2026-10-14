/* LOWiSPIKE beta glue (Oct 14, 2026): small, idempotent fixes for the legacy tabs.
   Every fix re-applies itself when the legacy renderer rebuilds its DOM. */
(function() {
    'use strict';
    const D = document;
    const lang = () => {
        try {
            return (window.LowiLang && LowiLang.get()) || localStorage.getItem('lowi.lang') || 'de';
        } catch (e) {
            return 'de';
        }
    };
    const L = (en, de) => lang() === 'de' ? de : en;
    const svg = (d, extra) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + d + '</svg>';

    /* 1. Scan tab: a real icon where the old orb used to be */
    const SCAN_ICON = svg('<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M8 12h8"/><path d="M12 8.5c2.2 0 3.4 1.2 3.4 3.5" opacity=".55"/>', ' class="b-scan-ic"');

    function fixTabbar() {
        const sp = D.querySelector('#tabbar .tb.scan .tbsp');
        if (sp && !sp.querySelector('.b-scan-ic')) sp.innerHTML = SCAN_ICON;
    }

    /* 2. One solid bottom sheet for moved-in legacy panels (no new pages) */
    let sheetHome = null;

    function closeSheet() {
        const ov = D.getElementById('bSheet');
        if (!ov) return;
        const body = ov.querySelector('.b-body');
        if (sheetHome && body.firstElementChild) {
            sheetHome.parent.insertBefore(body.firstElementChild, sheetHome.next);
        }
        sheetHome = null;
        ov.classList.remove('on');
        setTimeout(() => {
            if (!ov.classList.contains('on')) ov.hidden = true;
        }, 260);
    }

    function openSheet(title, node) {
        let ov = D.getElementById('bSheet');
        if (!ov) {
            ov = D.createElement('div');
            ov.id = 'bSheet';
            ov.className = 'b-ov';
            ov.hidden = true;
            ov.innerHTML = '<div class="b-scrim" data-b-close></div><section class="b-sh" role="dialog" aria-modal="true"><i class="b-grab" aria-hidden="true"></i><header><b></b><button type="button" class="b-x" data-b-close aria-label="Close">' + svg('<path d="M6 6l12 12M18 6L6 18"/>') + '</button></header><div class="b-body"></div></section>';
            D.body.appendChild(ov);
            ov.addEventListener('click', e => {
                if (e.target.closest('[data-b-close]')) closeSheet();
            });
            D.addEventListener('keydown', e => {
                if (e.key === 'Escape' && ov.classList.contains('on')) closeSheet();
            });
        }
        closeSheet();
        ov.querySelector('header b').textContent = title;
        if (node) {
            sheetHome = {
                parent: node.parentNode,
                next: node.nextSibling
            };
            ov.querySelector('.b-body').appendChild(node);
        }
        ov.hidden = false;
        requestAnimationFrame(() => ov.classList.add('on'));
    }

    /* 3. Cook: one screen. The swap tool lives in a sheet behind its own tile. */
    function fixCook() {
        const tiles = D.getElementById('g2cTiles');
        if (!tiles || tiles.querySelector('[data-b-open="swap"]')) return;
        const b = D.createElement('button');
        b.type = 'button';
        b.className = 'g2h-tile g2c-tile b-swap-tile';
        b.dataset.bOpen = 'swap';
        b.innerHTML = '<span class="g2h-ic">' + svg('<path d="M7 7h11l-3-3M17 17H6l3 3"/>') + '</span><b>' + L('Swap ingredients', 'Zutatentausch') + '</b><small>' + L('Healthier swaps', 'Gesündere Swaps') + '</small>';
        const gpt = tiles.querySelector('.g2c-gpt');
        tiles.insertBefore(b, gpt || null);
        tiles.classList.remove('g2c-odd');
    }
    D.addEventListener('click', e => {
        const t = e.target.closest('[data-b-open="swap"]');
        if (!t) return;
        const tb = D.querySelector('#tab-shelf .sf-toolbar');
        if (tb) openSheet(L('Swap ingredients', 'Zutatentausch'), tb);
    });
    // a swap search that navigates away must close the sheet and put the panel back
    D.addEventListener('submit', e => {
        if (e.target.closest('#bSheet')) setTimeout(closeSheet, 60);
    }, true);

    const fixes = [fixTabbar, fixCook];
    let queued = false;

    function run() {
        queued = false;
        for (const f of fixes) {
            try {
                f();
            } catch (e) {
                console.warn('[beta]', f.name, e);
            }
        }
    }

    function schedule() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(run);
    }

    window.LowiBeta = {
        add(f) {
            fixes.push(f);
            schedule();
        },
        run,
        openSheet,
        closeSheet,
        L,
        svg,
        lang
    };

    new MutationObserver(schedule).observe(D.body, {
        childList: true,
        subtree: true
    });
    run();
})();
