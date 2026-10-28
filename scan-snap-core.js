/* LOWiSPIKE · scanner Snap + Focus: pure rules (Oct 28, 2026).
   Emmanuel (call, 28 Oct, about 3:35 PM CET): "Sometimes it takes too long to scan. And I would like to be able to either like
   autofocus ... an autofocus click. Or a snap click, so it snaps the photo. So the scanner now has the photo, so I can walk away
   without having to stand there like an idiot as it's scanning." Then, with a screenshot of the Scan camera: "have that next to
   the back button, left and right."
   So the scan camera gets two round buttons beside the bottom-center X: Snap on the left, Focus on the right.
   - Snap keeps a short burst of real frames from the camera (about half a second), lets the camera go, shows the kept photo and
     reads the barcode from it on the phone. The lookup then runs like any scan. Nothing is uploaded anywhere new.
   - Focus only appears when the phone's browser says it can do it (focusMode in the track capabilities, Chrome on Android).
     iPhone Safari has no focus control for web pages (WebKit's MediaTrackConstraints has no focusMode / pointsOfInterest), so
     there it offers Zoom 2x instead when the camera reports zoom (hold the phone further back), and nothing when it reports neither.
   No DOM here: index.html's scanner (the b3 block) draws the buttons and runs the camera; tests/scan-snap.test.cjs checks these. */
(function (root) {
    'use strict';
    const BURST = 4;          /* frames kept per Snap */
    const GAP_MS = 110;       /* time between them: about 0.35 s from first to last */

    /* what the button on the right of the X can honestly do on this camera. caps = track.getCapabilities() (may be {}) */
    function focusPlan(caps) {
        caps = caps || {};
        const fm = Array.isArray(caps.focusMode) ? caps.focusMode : [];
        if (fm.indexOf('single-shot') >= 0 || fm.indexOf('continuous') >= 0) {
            return { kind: 'focus', once: fm.indexOf('single-shot') >= 0, cont: fm.indexOf('continuous') >= 0, poi: !!caps.pointsOfInterest };
        }
        const z = caps.zoom;
        if (z && typeof z.max === 'number' && isFinite(z.max) && z.max >= 1.5) {
            const min = typeof z.min === 'number' && isFinite(z.min) ? z.min : 1;
            return { kind: 'zoom', min, to: Math.min(2, z.max) };
        }
        return { kind: '' };
    }
    /* the constraints for one press. Focus: one refocus on the middle of the picture (where the frame is). Zoom: toggles. */
    function focusConstraints(plan, on) {
        if (!plan || !plan.kind) return null;
        if (plan.kind === 'focus') {
            const c = { focusMode: plan.once ? 'single-shot' : 'continuous' };
            if (plan.poi) c.pointsOfInterest = [{ x: 0.5, y: 0.42 }];
            return { advanced: [c] };
        }
        if (plan.kind === 'zoom') return { advanced: [{ zoom: on ? plan.to : plan.min }] };
        return null;
    }

    /* the ways a kept frame is read, cheapest first. The live scanner reads only the middle band; a photo is read in the band,
       the whole picture, and turned a quarter (a barcode printed upright on the pack). W/H: the frame's size in pixels. */
    function readPlan(W, H) {
        W = Math.max(1, Math.round(W || 0)); H = Math.max(1, Math.round(H || 0));
        const bw = Math.round(W * 0.86), bh = Math.round(Math.min(H, W) * 0.5);
        const band = { x: Math.round((W - bw) / 2), y: Math.round((H - bh) / 2), w: bw, h: bh };
        const tall = { x: Math.round((W - bh) / 2), y: Math.round((H - bw) / 2), w: Math.min(W, bh), h: Math.min(H, bw) };
        tall.x = Math.max(0, tall.x); tall.y = Math.max(0, tall.y);
        const all = { x: 0, y: 0, w: W, h: H };
        /* band: every kept frame (sharpest first); the rest: the two sharpest only, so a photo without a barcode is given up on in
           about a second on a phone instead of grinding on. ZXing (TRY_HARDER) also tries each crop turned a quarter itself. */
        return [
            Object.assign({ id: 'band', rot: 0, max: 900 }, band),
            Object.assign({ id: 'all', rot: 0, max: 1280 }, all),
            Object.assign({ id: 'upright', rot: 90, max: 1200 }, tall),
            Object.assign({ id: 'band-hi', rot: 0, max: 1600 }, band)
        ];
    }
    /* scale so the longer side of a rect is at most max px */
    function fit(w, h, max) { const s = Math.min(1, max / Math.max(w, h, 1)); return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) }; }

    /* how sharp a frame is: variance of a 4-neighbour Laplacian over grey values (higher = sharper). g: grey bytes, w x h. */
    function sharpness(g, w, h) {
        if (!g || w < 3 || h < 3) return 0;
        let n = 0, sum = 0, sq = 0;
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
            const i = y * w + x, v = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
            sum += v; sq += v * v; n++;
        }
        if (!n) return 0; const m = sum / n; return sq / n - m * m;
    }
    /* grey from RGBA bytes (ImageData.data) */
    function grey(rgba, w, h) { const g = new Uint8Array(w * h); for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8; return g; }
    /* sharpest kept frame first; equal scores keep their order */
    function order(scores) { return scores.map((s, i) => ({ s: +s || 0, i })).sort((a, b) => b.s - a.s || a.i - b.i).map(o => o.i); }

    /* may Snap start now? st: {stream, live, hold, snap, typing} */
    function canSnap(st) { return !!(st && st.stream && st.live && !st.hold && !st.snap && !st.typing); }
    /* after a result card closes (Scan next / Try again / closed): what the camera should do */
    function resumeAction(st) { if (!st) return 'none'; if (st.stream) return 'loop'; if (st.snap || st.snapped) return 'restart'; return 'none'; }
    /* the camera comes back on its own after the app was in the background, never while a Snap is kept or being read */
    function mayAutoRestart(st) { return !!(st && !st.done && !st.stream && !st.typing && !st.snap && ['denied', 'nocam', 'lookup', 'snapread', 'snapnone'].indexOf(st.st) < 0); }
    /* a read finishes for the Snap it started from only (closed, retaken, or the live scan got there first = drop it) */
    function stillMine(cur, mine, snap) { return !!(cur && cur === mine && mine.snap === snap && snap && !snap.over && !mine.hold); }

    const api = { BURST, GAP_MS, focusPlan, focusConstraints, readPlan, fit, sharpness, grey, order, canSnap, resumeAction, mayAutoRestart, stillMine };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiScanSnapCore = api;
})(typeof window !== 'undefined' ? window : null);
