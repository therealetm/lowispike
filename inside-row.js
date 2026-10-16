/* LOWiSPIKE "Your inside" row on Today (Oct 16, 2026). Replaces body-ride.js.
   E-man: "'Ride along': you click it, it says 'where should your cell go?', you click Gut, and now it's a completely different
   interface, it looks like a video. We should nuke that, because we already have our cell able to move around our world."
   So the ride, its picker and its video-like tube screen are gone. What stays is the part that was never the ride:
   - one slim row in the Today sheet: "Your inside" + LowiWorldHealth's plain line (how calm or hazy your inside is today).
     A tap opens the whole line in a small sheet (the row truncates it on phones). No button, no ride.
   - the shared 3D world's fog and brightness keep following LowiWorldHealth, so the real world still shows how you treat yourself.
   Misty's real journeys live in body-trips.js ("Start next journey") and she flies the real world (misty-pad.js / misty-flight.js). */
(function () {
    'use strict';
    const W = window, D = document;
    if (W.LowiInside) return;
    const WH = () => W.LowiWorldHealth;
    const lang = () => { try { return String(W.LowiLang.get() || 'de').slice(0, 2).toLowerCase(); } catch (e) { return String(D.documentElement.lang || 'de').slice(0, 2).toLowerCase(); } };
    const L = () => { const v = { en: 0, de: 1, es: 2 }[lang()]; return v == null ? 1 : v; };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const copy = {
        inside: ['Your inside', 'Dein Inneres', 'Tu interior'],
        more: ['It shows in your world too: the clearer your inside, the brighter and calmer it looks.', 'Das zeigt sich auch in deiner Welt: je klarer dein Inneres, desto heller und ruhiger sieht sie aus.', 'También se ve en tu mundo: cuanto más claro tu interior, más brillante y tranquilo se ve.']
    };
    const tr = k => (copy[k] || [k])[L()] || (copy[k] || [k])[0];
    const B = () => W.LowiVitalsBridge;
    const state = () => { try { return (B() && B().state()) || {}; } catch (e) { return {}; } };
    function health() { try { return WH().forState(state(), Date.now(), L()); } catch (e) { return { score: 62, tier: 'steady', look: { clarity: .8, fog: .2, bright: .8, flow: .9, microbes: .7, cellGlow: .7, warmth: .7, t: .6 }, line: '' }; } }
    const tierHue = t => t === 'bright' ? '#4ff5d2' : t === 'steady' ? '#8fb4ff' : '#b49cff';
    function css() {
        if (D.getElementById('inCss')) return;
        const s = D.createElement('style'); s.id = 'inCss';
        s.textContent = '.br-row{--br-h:#8fb4ff;--br-g:.7;display:flex;align-items:center;gap:8px;width:100%;min-height:30px;margin:0 0 6px;padding:3px 10px 3px 9px;box-sizing:border-box;' +
            'border:1px solid color-mix(in srgb,var(--br-h) 24%,transparent);border-radius:13px;background:linear-gradient(90deg,color-mix(in srgb,var(--br-h) 10%,transparent),color-mix(in srgb,var(--text,#fff) 3%,transparent));' +
            'color:var(--text,#fff);font:inherit;text-align:left;cursor:pointer;overflow:hidden;-webkit-tap-highlight-color:transparent}' +
            '.br-row:focus-visible{outline:2px solid var(--br-h);outline-offset:2px}' +
            '.br-dot{flex:none;width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 40% 38%,#fff 0 18%,var(--br-h) 45%,color-mix(in srgb,var(--br-h) 30%,transparent) 75%);box-shadow:0 0 calc(4px + 10px * var(--br-g,.7)) color-mix(in srgb,var(--br-h) 70%,transparent)}' +
            '.br-name{flex:none;font-size:12.5px;font-weight:700;white-space:nowrap}' +
            '.br-line{flex:1 1 auto;min-width:0;font-size:11.5px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
            '.in-sheet{text-align:center;padding:4px 4px 2px}.in-sheet h2{margin:6px 0;font-size:22px}.in-sheet p{margin:0 auto 10px;max-width:34ch;font-size:15px;line-height:1.4}.in-sheet .in-note{font-size:13px;opacity:.75}';
        D.head.appendChild(s);
    }

    /* ---------- one slim row in the Today sheet ---------- */
    let row = null, lastRow = '';
    function mountRow() {
        const home = D.getElementById('spHome'), log = home && home.querySelector('.sp-log');
        if (!log) return null;
        if (!row) { row = D.createElement('button'); row.type = 'button'; row.id = 'brRow'; row.className = 'br-row'; row.dataset.inside = 'info'; }
        const anchor = log.querySelector('#btBar') || log.querySelector('#lsSun');
        if (anchor) { if (anchor.nextSibling !== row) { anchor.after(row); lastRow = ''; } }
        else if (row.parentNode !== log) { const head = log.querySelector(':scope > header'); log.insertBefore(row, head ? head.nextSibling : log.firstChild); lastRow = ''; }
        return row;
    }
    function renderRow() {
        if (!mountRow()) return;
        const h = health(), sig = h.score + h.tier + L() + h.line;
        if (sig === lastRow) return; lastRow = sig;
        row.style.setProperty('--br-h', tierHue(h.tier));
        row.style.setProperty('--br-g', String(h.look.cellGlow));
        row.dataset.tier = h.tier;
        row.setAttribute('aria-label', tr('inside') + ': ' + h.line);
        row.innerHTML = '<span class="br-dot" aria-hidden="true"></span><span class="br-name">' + esc(tr('inside')) + '</span><span class="br-line">' + esc(h.line) + '</span>';
    }
    function info() {
        const h = health(), R = W.LowiR2;
        if (!R || !R.sheet) return;
        R.sheet('<div class="in-sheet"><h2>' + esc(tr('inside')) + '</h2><p>' + esc(h.line) + '</p><p class="in-note">' + esc(tr('more')) + '</p></div>', { cls: 'in-ov' });
    }
    let rq = 0;
    const schedule = () => { if (rq) return; rq = setTimeout(() => { rq = 0; try { renderRow(); } catch (e) {} }, 120); };
    D.addEventListener('click', e => { const t = e.target && e.target.closest && e.target.closest('#brRow'); if (!t) return; e.preventDefault(); info(); });
    ['lowi:reward', 'lowi:meal-logged', 'lowi:lang', 'lowi:state', 'storage', 'focus'].forEach(n => W.addEventListener(n, schedule));
    D.addEventListener('visibilitychange', schedule);
    W.LowiInside = { health, info, render: renderRow };
    /* world health in the real world: the shared world's fog and depth follow LowiWorldHealth */
    let hTs = 0, hLook = null, fogBase = 0, fogSet = -1, wmNow = 0;
    const moodNow = () => { try { return W.LowiWorldMood ? Math.max(0, Math.min(1, +W.LowiWorldMood.level || 0)) : 0; } catch (e) { return 0; } };
    W.addEventListener('lowi:world-mood', () => { hTs = 0; schedule(); });
    function hookWorld() {
        const w = W.LowiWorld3D; if (!w || w.__brHealth || typeof w.onFrame !== 'function') return; w.__brHealth = 1;
        w.onFrame(() => {
            if (!w.scene || !(w.isOpen && w.isOpen())) return;
            const now = Date.now(); if (!hLook || now - hTs > 5000) { hLook = health().look; hTs = now; wmNow = moodNow(); }
            /* Oct 16 fast weather: the 4-day score is the slow baseline, today's weather (LowiWorldMood) moves the fog fast */
            const fog = Math.min(1, 0.65 * hLook.fog + 0.45 * wmNow), bright = hLook.bright * (1 - 0.25 * wmNow);
            const f = w.scene.fog, bg = w.scene.background;
            if (f) { if (f.density !== fogSet) fogBase = f.density; f.density = fogSet = fogBase * (0.7 + 0.9 * fog); }
            if (bg && bg.isColor) { bg.multiplyScalar(0.8 + 0.25 * bright); if (f) f.color.copy(bg); }
        });
    }
    function boot() {
        css(); schedule(); hookWorld(); W.addEventListener('lowi:world3d-ready', hookWorld);
        const mo = new MutationObserver(() => { if (row && !row.isConnected) { lastRow = ''; schedule(); } else if (!row) schedule(); });
        const home = D.getElementById('spHome') || D.body; mo.observe(home, { childList: true, subtree: true });
        setInterval(schedule, 60000);
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
