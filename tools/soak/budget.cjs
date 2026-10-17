/* LOWiSPIKE game budgets, checked against a game-soak result (tools/soak/game-soak.cjs --check).
   Each rule is a thing that, when broken, made the phone hot or Safari reload the page. Rates are per second in desktop
   Chromium with software WebGL, so rules are relative (compared with the world's own frame rate) or must-be-zero counts,
   never absolute frame rates. See GAME_PERFORMANCE.md for the reasons and sources. */
'use strict';

/* the loops allowed to run every frame: one world renderer, plus the 2D canvases that ARE the screen you look at */
const FRAME_OWNERS = [/^body-world-3d-scene\.js:/, /^fast-bubble\.js:/, /^community-galaxy\.js:/, /^galaxy-zoom\.js:/];
/* scenes that repeat a visit already made once: GPU objects must not keep growing there */
/* screens you look at without tapping (frame-loop rules apply there) */
const HOLDS = ['home-idle', 'care-board-week', 'care-board-month', 'community-open', 'community-galaxy-zoom-x20', 'back-home-idle', 'visible-again'];
const REPEATS = ['care-board-month-toggle', 'cook-home-nav-x8', 'home-community-x6', 'community-galaxy-zoom-x20'];

function check(result) {
    const out = [], S = (result && result.scenarios) || {};
    Object.keys(S).forEach(name => {
        const s = S[name], callers = s.rafByAll || s.rafBy || [];
        const fps = callers.reduce((m, c) => Math.max(m, c[1]), 0);
        /* 1. frame-loop ownership, on screens where you only look (not while tapping through tabs): nothing but the renderers
              may run on every frame. An observer that schedules a frame because the page changed, while the page changes
              because of it, shows up as many callers at the world's own rate. */
        if (HOLDS.indexOf(name) >= 0 && fps >= 5) {
            const hot = callers.filter(c => c[1] >= fps * 0.5 && !FRAME_OWNERS.some(r => r.test(c[0])));
            if (hot.length) out.push(`${name}: ${hot.length} non-renderer callback(s) run on (almost) every frame: ${hot.slice(0, 6).map(c => c[0] + ' ' + c[1] + '/s').join(', ')}`);
            const other = callers.filter(c => !FRAME_OWNERS.some(r => r.test(c[0]))).reduce((n, c) => n + c[1], 0);
            if (other > fps * 4) out.push(`${name}: ${Math.round(other)} non-renderer frame callbacks/s for a ${fps}/s frame rate (budget 4 per frame)`);
        }
        /* 2. hidden page: the world stops drawing and nothing runs per frame */
        if (name === 'hidden-tab') {
            if (s.glDrawsPerSec > 10) out.push(`hidden-tab: WebGL still draws ${s.glDrawsPerSec}/s while hidden`);
            const all = callers.reduce((n, c) => n + c[1], 0);
            if (all > 30) out.push(`hidden-tab: ${Math.round(all)} frame callbacks/s while hidden (budget 30): ${callers.slice(0, 5).map(c => c[0] + ' ' + c[1] + '/s').join(', ')}`);
        }
        /* 3. one WebGL context for the whole game */
        if (s.ctxAliveGL > 1) out.push(`${name}: ${s.ctxAliveGL} live WebGL contexts (budget 1): ${(s.glBy || []).join('; ')}`);
        /* 4. no GPU leaks on repeat visits */
        if (REPEATS.indexOf(name) >= 0 && s.liveDelta) {
            const d = s.liveDelta;
            if (d.tex > 0 || d.prog > 0 || d.fb > 0 || d.rb > 0 || d.buf > 12) out.push(`${name}: GPU objects grew on a repeat visit ${JSON.stringify(d)}`);
        }
        /* 5. no canvas re-uploaded as a texture every frame */
        if (s.canvasTexUploadsPerSec > Math.max(2, fps * 0.5)) out.push(`${name}: a canvas is uploaded as a texture ${s.canvasTexUploadsPerSec}/s`);
        /* 6. no DOM write loop: most writes setting a value that is already there means someone writes from an observer */
        if (s.unchangedWritesPerSec > 250 && s.unchangedWritesPerSec > s.writesPerSec * 0.7) out.push(`${name}: ${s.unchangedWritesPerSec} no-op DOM writes/s of ${s.writesPerSec} (write only on change)`);
    });
    if (result && result.errors && result.errors.some(e => /CRASHED/.test(e))) out.push('the page crashed');
    return out;
}

module.exports = { check, FRAME_OWNERS, REPEATS, HOLDS };
