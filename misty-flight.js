/* LOWiSPIKE Misty's free flight (Oct 16, 2026, E-man, iPhone screenshots: "when I use the joystick to move Misty out, she suddenly
   shrinks and gets tiny inside her bubble ... once she's out she seems locked to the outer atmosphere").
   What he wants: "It should just move the companion out of the bubble ... and even kind of stretch out the bubble a little bit.
   Imagine an insect being stuck in a bubble, trying to move out, but the bubble doesn't pop." Then she explores, planet to planet;
   only as she gets close to a glowing place does she get smaller, and right at its atmosphere the same warp plays as a tap on it.
   Inside a world she flew into she is there with you and you keep steering her. A tap on a place still enters without her.

   How it works (all inside Home's one 3D world, window.LowiWorld3D; the controller is misty-pad.js, Home's pad state and the
   3D sprite "wand" live in world-home.js, which hands the sprite to this file through LowiMistyFlight.wants/frame each frame):
   - exit: the sprite starts exactly where the DOM Misty was and at her exact on-screen size (measured from #spBubble .tmg-plant).
     Pushing out tents the membrane toward her (a vertex deform patched into the membrane shader at runtime, uPushD/uPushA),
     she slows as it stretches, then slips through; the membrane springs back with a damped wobble. Let go early: it pulls her back.
   - free: the stick moves her in the screen plane at a constant on-screen size, anywhere in the world (no orbit, no shell).
     Pointing the stick at a glowing place you can see bends her path toward it in depth too. The camera follows her.
   - near a place she shrinks gradually and the camera eases in; at its atmosphere: LowiWorld3D.flyTo(id), the tap's own warp.
   - inside: once that warp lands she fades in, in front of you, and the stick steers her around the place (camera follows).
   - auto (double-tap): she leaves her bubble and tours the world by herself. Oct 16 (E-man: "Misty enters the worlds herself,
     free roaming everywhere"): at each place she pauses at the door, then dives in on her own (the same warp), roams around inside,
     and after a while heads back out (only if you are not touching the world) and on to the next place.
   - roam (misty-roam): whenever you are inside a place without her (a tap on it, the World map), she follows on her own a moment
     after the warp lands, rising in from the bottom, and wanders freely across the view: soft curves between spots she picks on
     screen, short pauses, now and then a ring of light where she tends something. The camera is never moved for her roaming and
     she draws in the 3D canvas, so she never blocks a tap. Steer her with the stick at any time; 6 s after you let go she roams
     on her own again. Reduced motion: she does not come in by herself (and Home has no 3D world then anyway).
   - home (tap her empty cell, or 20 s without steering): she flies back and slips into her cell.
   Tired Misty is slower (same energy as her face). Reduced motion: no bob, no wobble (and Home has no 3D world then anyway).
   Pure helpers at the top are tested in tests/misty-flight.test.cjs. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;

    /* ---------- pure helpers ---------- */
    const K = { CR: 1.4, ENTRY: 1.35, NEAR: 4.4, MIN_K: 0.42, ROAM: 11, MAG_DEG: 42, IN_R: 3.0, IDLE_HOME: 20,
        JOIN: 0.7, HANDBACK: 6, STAY_IN: 32, CAM_IDLE: 6, ADV_STAY: 42, LOST: 5, ADV_SPEED: 0.5, PULL: 4.6, FALL: 1.8, EMERGE: 1.6, RECALL: 1.6, SAFE: { x0: 0.14, x1: 0.86, y0: 0.36, y1: 0.74 } };
    const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
    function smooth(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
    /* 0 while far from a place, 1 at the edge of its atmosphere (the entry threshold) */
    const approach = d => smooth(K.NEAR, K.ENTRY, d);
    /* her on-screen size factor: 1 everywhere, shrinking only as she nears a place */
    const sizeK = ap => 1 - (1 - K.MIN_K) * clamp(ap, 0, 1);
    /* world units per second; tired is slower but never stuck. where: 'out' (the world), 'exit' (pushing her bubble), 'in' (a place) */
    function speed(k, where) {
        k = clamp(+k || 0, 0, 1);
        if (where === 'in') return 0.55 + 1.05 * k;
        if (where === 'exit') return 0.8 + 1.3 * k;
        return 1.5 + 2.7 * k;
    }
    /* how far the membrane is tented out by her, and how much it holds her back */
    const stretchOf = (off, rin, smax) => clamp(off - rin, 0, smax);
    const resist = (s, smax) => 1 - 0.6 * clamp(smax > 0 ? s / smax : 0, 0, 1);
    /* after she slips through, the membrane rings out and settles (no pop) */
    const wobble = (a0, t, still) => still ? 0 : a0 * Math.exp(-3.2 * t) * Math.cos(13 * t);
    /* which visible place the stick points at, as seen from Misty on screen. cands: [{id, sx, sy, front}] offsets in px, y up */
    function aimAt(vx, vy, cands, maxDeg) {
        const m = Math.hypot(vx, vy); if (m < 0.1 || !cands) return null;
        maxDeg = maxDeg || K.MAG_DEG; let best = null;
        for (const c of cands) {
            if (!c || !c.front) continue;
            const L = Math.hypot(c.sx, c.sy); if (L < 1) continue;
            const deg = Math.acos(clamp((vx * c.sx + vy * c.sy) / (m * L), -1, 1)) * 180 / Math.PI;
            if (deg > maxDeg) continue;
            const w = 1 - deg / maxDeg; if (!best || w > best.w) best = { id: c.id, w };
        }
        return best;
    }
    /* the screen height the whole 260x310 sprite texture needs so Misty's art matches the DOM Misty (both letterbox the viewBox) */
    function spritePx(rectW, rectH, vbW, vbH) {
        vbW = vbW || 260; vbH = vbH || 310;
        const sD = Math.min(rectW / vbW, rectH / vbH), sC = Math.min(260 / vbW, 310 / vbH);
        return sC > 0 ? sD * 310 / sC : 0;
    }
    /* misty-roam: does she come into the place you are in by herself? Only once the warp and the place's own hero turn have
       finished and the view has been still for K.JOIN s; never with reduced motion. */
    function joinOk(o) { return !!(o && o.inRegion && !o.busy && !o.hero && !o.reduced && (+o.settled || 0) >= K.JOIN); }
    /* Oct 17 (E-man: "the movement is a bit limited"): inside a world she reaches far out into its corners (was maxD * .32) */
    const inReach = maxD => Math.max(K.IN_R, (+maxD || 10) * 0.62);
    /* misty-turn (Oct 17, E-man): "total freedom to fly to any corner of anything that I see ... fly down into the dark and get lost".
       Your own flying reaches out to just inside the world's visible walls (a heart / organ shell ~20-26, the gut tube 15.5), not the
       old camera-sized bubble. The hunt's crumbs and the autopilot's tour stay in the core (inReach). */
    const FREE_R = 20, FREE_R_GUT = 13;
    const freeReach = (maxD, id) => Math.max(inReach(maxD), String(id || '') === 'gut' ? FREE_R_GUT : FREE_R);
    const power = () => { try { return W.LowiMistyPower && W.LowiMistyPower.strength ? W.LowiMistyPower.strength() : 1; } catch (e) { return 1; } };
    /* inside a place: she roams on her own unless you are steering her (or let go less than K.HANDBACK s ago) */
    const roams = (mode, idle) => mode !== 'drive' || (+idle || 0) > K.HANDBACK;
    /* autopilot: after K.STAY_IN s inside she heads out to the next place, but never while you are touching the world */
    const autoLeave = (mode, inT, camIdle, stay) => mode === 'auto' && inT > (stay || K.STAY_IN) && camIdle > K.CAM_IDLE;
    /* adventure (adventure.js): gravity pull into a world. e = eased 0..1 progress: slow start, accelerating fall (t^2),
       radius shrinks to a quarter, she circles up to ~2.2 rad round the world, her size drops to 25% of where she began */
    function pullAt(t) { const q = clamp(+t || 0, 0, 1), e = q * q; return { e, rad: 1 - 0.75 * e, ang: 2.2 * q * q * (3 - 2 * q), size: 1 - 0.75 * e }; }
    /* falling into the world: she starts at 30% size above, grows to full as she lands (ease-out) */
    function fallAt(t) { const q = clamp(+t || 0, 0, 1), e = 1 - (1 - q) * (1 - q); return { e, size: 0.3 + 0.7 * e, drop: 1 - e }; }
    /* her next spot, as fractions of the view: inside the safe zone (clear of the top bar, Daily Quest, arrival card, dock and
       controller) and at least a third of the zone away from where she is, so she really travels. u, v: two randoms 0..1 */
    function roamSpot(u, v, from) {
        const Z = K.SAFE, w = Z.x1 - Z.x0, h = Z.y1 - Z.y0;
        let x = Z.x0 + clamp(+u || 0, 0, 1) * w, y = Z.y0 + clamp(+v || 0, 0, 1) * h;
        if (from && Math.hypot((x - from.x) / w, (y - from.y) / h) < 0.34) { x = Z.x0 + Z.x1 - x; y = Z.y0 + Z.y1 - y; }
        if (from && Math.hypot((x - from.x) / w, (y - from.y) / h) < 0.34) x = from.x < (Z.x0 + Z.x1) / 2 ? Z.x1 - 0.1 * w : Z.x0 + 0.1 * w;
        return { x, y };
    }
    /* her roaming pace on screen, px per second: calm, slower when tired, a little quicker on a big screen */
    const roamPx = (k, minSide) => (55 + 85 * clamp(+k || 0, 0, 1)) * clamp((+minSide || 390) / 390, 0.85, 1.6);
    /* world-exit (Oct 17, E-man): "When my companion is clearly trying to fly out of the world by hitting the corner of the world
       and then pressing in for three seconds, it should then obviously take us out of the world ... so it really feels like ...
       trying to fly back into a different universe." Pressing = you keep steering her outward against the edge of the world she
       is in (no new button). Three seconds of it, without letting go or turning away, flies you both out. Autopilot never does.
       s = { t, miss, fired }; i = { dt, mode, mag (stick 0..1), out (cos between the stick and "outward"), edge (her distance from
       the world's middle / its reach), busy }. A finger that slips off the edge for a moment (< GRACE) keeps the count. */
    const EXIT = { HOLD: 3, MAG: 0.35, OUT: 0.45, AWAY: 0.15, EDGE: 0.94, GRACE: 0.25, DT: 0.1 };
    function exitHold(s, i) {
        s = s || { t: 0, miss: 0, fired: false }; i = i || {};
        const dt = clamp(+i.dt || 0, 0, EXIT.DT), out = +i.out || 0;
        const pressing = i.mode === 'drive' && !i.busy && (+i.mag || 0) >= EXIT.MAG && out >= EXIT.AWAY;
        /* cloud walls (Oct 17, item 3): the cloudy wall is the way out; a dark zone (DARK, below) never is */
        const atRim = (+i.edge || 0) >= EXIT.EDGE && out >= EXIT.OUT, atEdge = atRim && !i.dark;
        let fire = false;
        if (!pressing) { s.t = 0; s.miss = 0; s.fired = false; }
        else if (atEdge) { s.miss = 0; if (!s.fired) { s.t += dt; if (s.t >= EXIT.HOLD - 1e-9) { s.t = EXIT.HOLD; s.fired = true; fire = true; } } }
        else { s.miss += dt; if (s.miss > EXIT.GRACE) { s.t = 0; s.miss = 0; } }
        return { s, p: s.fired ? 1 : clamp(s.t / EXIT.HOLD, 0, 1), fire, dark: pressing && atRim && !!i.dark };
    }
    /* mist rule (Oct 17, E-man): inside a world the mist and clouds at its edge are the forbidden edge. Pushing into them only
       lets her explore and get lost out there (out of bounds); only pushing outward into clear space (a gap with no mist, where
       the universe shows through) starts the 3-second way out. Angles are around the world's middle in the view's own plane
       (0 = right, PI/2 = up). Each world has GAPS clear gaps of GAP radians, always the same for that world; the rest is mist.
       In the mist she may drift out to LOST x her usual reach, and is eased back slowly once you stop pushing. */
    const MIST = { GAPS: 2, GAP: 0.95, LOST: 1.32 };
    const angWrap = x => { x = (+x || 0) % (2 * Math.PI); if (x > Math.PI) x -= 2 * Math.PI; if (x <= -Math.PI) x += 2 * Math.PI; return x; };
    function idHash(id) { let h = 2166136261; const s = String(id || ''); for (let j = 0; j < s.length; j++) { h ^= s.charCodeAt(j); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
    /* one gap high up (left or right of the top), the other low on the opposite side but never straight down (the controller) */
    function exitGaps(id) {
        const u = idHash(id), v = idHash(String(id || '') + '#2');
        const a1 = Math.PI * (0.18 + 0.64 * u);
        let a2 = angWrap(a1 + Math.PI + (v - 0.5) * 0.7);
        if (Math.abs(angWrap(a2 + Math.PI / 2)) < 0.45) a2 = angWrap(a2 + (a2 > -Math.PI / 2 ? 0.5 : -0.5));
        return [{ a: angWrap(a1), w: MIST.GAP }, { a: a2, w: MIST.GAP }];
    }
    function inMist(ang, gaps) { return !(gaps || []).some(g => Math.abs(angWrap(ang - g.a)) <= g.w / 2); }
    /* the clear gap closest to where she is now (autopilot heads there to get out) */
    function gapToward(ang, gaps) {
        let best = null, bd = 1e9;
        (gaps || []).forEach(g => { const d = Math.abs(angWrap(ang - g.a)); if (d < bd) { bd = d; best = g.a; } });
        return best == null ? angWrap(ang) : best;
    }
    /* dark zones (Oct 17, E-man, replacing the black holes of release 131627: "delete all the black holes"; what he and Maya were
       after is "the child feeling of going so far into the dark space that you feel like you just entered a zone that you weren't
       supposed to be in ... out of the game zone"; "it feels like you're able to fly in there, which you are supposed to ... so to
       give it an infinite type of feeling ... everything becomes so dark that Misty can't, and the human can't see anything ... and
       then for every three seconds they start glowing just for like a split second, so they know the game isn't buggy, but they
       are in the dark"). Where the cloud wall has its gaps (exitGaps: the same places in a world every time) the world opens onto
       the dark (a soft shapeless patch of darkness there, no swirl, no ring). Nothing pulls, nothing catches, there is nothing to
       escape: you just fly in, up to DEEP x the world's reach, and the deeper you go (from START to FULL x the reach, so it is
       already near black where the world's own shell is) the darker everything gets, up to MAX (Misty too). Every PULSE
       s out there she glows for FLASH s. Fly back and the light comes back (IN / OUT: how fast the dark closes in and lifts).
       The dark is never a way out: only the cloud wall is, and its glass bubble skin bulges like Home's does when she leaves for
       the spirit world (exitTent). */
    const DARK = { START: 0.8, FULL: 1.3, MAX: 0.95, DEEP: 3, PULSE: 3, FLASH: 0.32, CLEAR: 0.35, IN: 1.6, OUT: 2.4, TENT: 0.28 };
    const darkSpots = id => exitGaps(id).map(g => ({ a: g.a, w: g.w }));
    function inDark(ang, zones) { return (zones || []).some(h => Math.abs(angWrap(ang - h.a)) <= h.w / 2); }
    /* how far out she may fly: far on into the dark, the usual edge at the cloud wall (where the exit counts) */
    function darkReach(inR, dark) { return (+inR || 0) * (dark ? DARK.DEEP : 1); }
    /* 0..MAX: how dark it is with her at edge = her distance from the world's middle / its reach */
    function darkAmt(edge) { return DARK.MAX * smooth(DARK.START, DARK.FULL, +edge || 0); }
    /* 0..1: her glow t s after the dark closed in: one short flash every PULSE s, the first after PULSE s */
    function darkGlow(t) { t = +t || 0; if (t < DARK.PULSE - 1e-9) return 0; const ph = t % DARK.PULSE; return ph < DARK.FLASH ? Math.sin(Math.PI * ph / DARK.FLASH) : 0; }
    /* how far the cloud wall's bubble skin bulges out around her (world units) for p = 0..1 of the 3-second push */
    const exitTent = (p, reach) => DARK.TENT * (+reach || 0) * Math.pow(clamp(+p || 0, 0, 1), 1.3);
    /* the autopilot's way out: the nearest point of the cloud wall that keeps CLEAR radians away from every dark zone */
    function wallToward(ang, zones) {
        let x = angWrap(ang);
        for (let n = 0; n < 3; n++) (zones || []).forEach(h => {
            const half = h.w / 2 + DARK.CLEAR, d = angWrap(x - h.a);
            if (Math.abs(d) < half) x = angWrap(h.a + (d >= 0 ? half : -half));
        });
        return x;
    }
    /* world-exit: the way out, on screen (fractions of the view). A = the place shrinks away around her: she stays where she was,
       drifting a little toward the middle. B = the camera backs out of the glowing spot and glides out: she settles just beside the
       world she left (a third of the way toward the middle), the camera with her. Continuous: B starts where A ended. */
    function outAt(phase, k, from, door) {
        const e = smooth(0, 1, clamp(+k || 0, 0, 1));
        if (phase === 'A') return { x: from.x + (0.5 - from.x) * 0.45 * e, y: from.y + (0.56 - from.y) * 0.45 * e, e };
        const tx = clamp(door.x + (0.5 - door.x) * 0.3, 0.16, 0.84), ty = clamp(door.y + (0.52 - door.y) * 0.3, 0.24, 0.8);
        return { x: from.x + (tx - from.x) * e, y: from.y + (ty - from.y) * e, e };
    }
    /* orbit-in (Oct 17, E-man: autopilot "feels like cheating ... lacks the struggle"; "Interstellar-style: orbit the world,
       getting smaller and smaller ... a sense of vast distance and perspective, rather than just flying straight in").
       q = 0..1 of the approach. rad = share of her starting distance (a slow spiral that tightens), size = share of her size in
       the world (she is drawn at her true depth, so the far side of the orbit also shrinks her by perspective). spin = how fast
       she goes round at that radius (faster as she falls closer, like a real orbit). The first time she reaches the door she
       skims it and is flung back out (FLING s, back to q = BACK); on a low-energy day the world's own bounce rule can fling her
       again; she always gets in by the last try. */
    const ORBIT = { T: 7, R_END: 0.16, W: 0.62, FLING: 1.3, BACK: 0.45, TRIES: 3, MIN_FLINGS: 1 };
    function orbitAt(q) {
        q = clamp(+q || 0, 0, 1);
        return { rad: 1 - (1 - ORBIT.R_END) * Math.pow(q, 1.5), size: 0.2 + 0.8 * Math.pow(1 - q, 1.25) };
    }
    function orbitSpin(rad, sleepy) { return ORBIT.W * Math.pow(1 / Math.max(+rad || 0, ORBIT.R_END), 1.2) * (sleepy ? 0.7 : 1); }
    /* at the door: fling her back out (true) or let her in (false). tries = flings so far; refuse = the world's bounce rule said no */
    function orbitFling(tries, refuse) { return tries < ORBIT.MIN_FLINGS || (!!refuse && tries < ORBIT.TRIES - 1); }
    const core = { K, inReach, freeReach, smooth, approach, sizeK, speed, stretchOf, resist, wobble, aimAt, spritePx, joinOk, roams, autoLeave, roamSpot, roamPx, pullAt, fallAt, EXIT, exitHold, MIST, angWrap, exitGaps, inMist, gapToward, DARK, darkSpots, inDark, darkReach, darkAmt, darkGlow, exitTent, wallToward, outAt, ORBIT, orbitAt, orbitSpin, orbitFling };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!D || !D.addEventListener || W.LowiMistyFlight) return;

    /* ---------- browser ---------- */
    const H = D.documentElement;
    const S = { scr: { x: 0, y: 0 }, scrT: 0, st: 'idle', p: null, v: null, base: 0, ks: 1, hs: 1, held: false, d0: 0, dHome: 0, dolly: 0, flew: null, idle: 0,
        wob: 0, wobT: 9, wobDir: null, push: 0, pushDir: null, mem: null, patched: false, domT: 0, dom: null, warpT: 0, warpFrom: null, warpTo: null,
        inC: null, inHs: 0, fade: 1, wp: -1, wpWait: 0, t: 0, trail: 0, cell0: null, near: null, ap: 0, entered: 0, log: [] };
    let V = null; /* temp vectors, made once THREE is known */
    const w3 = () => W.LowiWorld3D || null;
    const R = () => W.LowiWorldRegions || null;
    const ADV = () => !!(W.LowiAdventure && W.LowiAdventure.on);
    function curRegion() { try { const r = R(); return r && r.current ? r.current() : 'hub'; } catch (e) { return 'hub'; } }
    function regionsBusy() { const r = R(), s = r && r.state; return !!(s && (s.busy || s.warp)); }
    const norm = id => id === 'muscles' ? 'muscle' : id === 'blood' ? 'hub' : id;
    function vecs(THREE) {
        if (V) return V;
        V = { rt: new THREE.Vector3(), up: new THREE.Vector3(), fw: new THREE.Vector3(), c: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(),
            want: new THREE.Vector3(), m4: new THREE.Matrix4(), q: new THREE.Vector3(), h: new THREE.Vector3(), h2: new THREE.Vector3() };
        S.p = new THREE.Vector3(); S.v = new THREE.Vector3(); S.wobDir = new THREE.Vector3(0, 1, 0); S.pushDir = new THREE.Vector3(0, 1, 0);
        S.warpFrom = new THREE.Vector3(); S.warpTo = new THREE.Vector3(); S.pullRel = new THREE.Vector3(); S.pullC = new THREE.Vector3(); S.fallTo = new THREE.Vector3(); S.outPos = new THREE.Vector3(); S.inC = new THREE.Vector3(); S.cell0 = { x: 0, y: 0 };
        return V;
    }
    function canvasRect(a) { const cv = a.renderer && a.renderer.domElement; const q = cv && cv.getBoundingClientRect ? cv.getBoundingClientRect() : null; return q && q.width ? q : { left: 0, top: 0, width: W.innerWidth, height: W.innerHeight }; }
    function toScreen(a, p, out) {
        const q = canvasRect(a); V.q.copy(p).project(a.camera);
        out = out || {}; out.x = q.left + (V.q.x + 1) / 2 * q.width; out.y = q.top + (1 - V.q.y) / 2 * q.height; out.z = V.q.z; return out;
    }
    function fromScreen(a, x, y, depthAt, out) {
        const q = canvasRect(a); V.q.copy(depthAt).project(a.camera);
        return out.set((x - q.left) / q.width * 2 - 1, -((y - q.top) / q.height * 2 - 1), V.q.z).unproject(a.camera);
    }
    /* on-screen pixels per world unit at p (from the live projection, view offset included) */
    function pxPerUnit(a, p) {
        const s0 = toScreen(a, p, {}); V.b.copy(p).addScaledVector(V.up, 1); const s1 = toScreen(a, V.b, {});
        return Math.max(1e-3, Math.hypot(s1.x - s0.x, s1.y - s0.y));
    }
    function basis(a) {
        const cam = a.camera; cam.updateMatrixWorld();
        V.rt.setFromMatrixColumn(cam.matrixWorld, 0).normalize(); V.up.setFromMatrixColumn(cam.matrixWorld, 1).normalize(); V.fw.setFromMatrixColumn(cam.matrixWorld, 2).normalize();
        if (a.hub) a.hub.getWorldPosition(V.c); else V.c.set(0, 0, 0);
    }
    /* the DOM Misty: where she is and how tall the sprite texture must be on screen to match her exactly */
    function domMisty() {
        const s = D.querySelector('#spBubble .tmg-plant'); if (!s || !s.getBoundingClientRect) return null;
        const q = s.getBoundingClientRect(); if (!q.width || !q.height) return null;
        const vb = s.viewBox && s.viewBox.baseVal;
        return { cx: q.left + q.width / 2, cy: q.top + q.height / 2, px: spritePx(q.width, q.height, vb && vb.width, vb && vb.height) };
    }
    /* the membrane mesh of her cell, with the stretch deform patched into its vertex shader (once) */
    function membrane(a) {
        if (S.mem && S.mem.parent) return S.mem;
        let m = null; if (!a.memU || !a.scene) return null;
        a.scene.traverse(o => { if (!m && o.isMesh && o.material && o.material.uniforms === a.memU) m = o; });
        S.mem = m; if (!m) return null;
        const u = a.memU;
        if (!u.uPushA) { u.uPushD = { value: new a.THREE.Vector3(0, 1, 0) }; u.uPushA = { value: 0 }; u.uPushK = { value: 2.4 }; }
        const vs = m.material.vertexShader || '', key = 'void main(){';
        if (!S.patched && vs.indexOf('uPushA') < 0 && vs.indexOf(key) >= 0) {
            const i = vs.indexOf(key) + key.length, j = vs.indexOf(';', i) + 1;
            /* tent the surface along uPushD around the spot she pushes, squeeze the rest a touch (volume), tilt normals with the stretch */
            const add = 'vec3 nP=normalize(position);float pw=pow(max(dot(nP,uPushD),0.0),uPushK);p+=uPushD*(uPushA*pw)-nP*(uPushA*0.1*(1.0-pw));' +
                'vec3 nW=normalize(normal-uPushD*dot(normal,uPushD)*clamp(abs(uPushA)*pw*1.4,0.0,0.85));';
            m.material.vertexShader = 'uniform vec3 uPushD;uniform float uPushA;uniform float uPushK;' + vs.slice(0, j) + add + vs.slice(j).replace('normalMatrix*normal', 'normalMatrix*nW');
            m.material.needsUpdate = true;
        }
        S.patched = true;
        return m;
    }
    function setPush(a, dirW, amt) {
        const m = membrane(a); if (!m || !a.memU.uPushA) return;
        if (Math.abs(amt) < 1e-4) { a.memU.uPushA.value = 0; return; }
        m.updateMatrixWorld(); V.m4.copy(m.matrixWorld).invert();
        a.memU.uPushD.value.copy(dirW).transformDirection(V.m4);
        const sc = m.getWorldScale ? m.getWorldScale(V.b).x || 1 : 1;
        a.memU.uPushA.value = amt / sc;
    }
    function hold(on) {
        const a = w3(); if (!a) return;
        if (on) { if (!a.hold) { a.hold = true; S.held = true; } }
        else if (S.held) { a.hold = false; S.held = false; }
    }
    function padMode(ctx, m) {
        ctx.PD.mode = m; ctx.PD.vx = ctx.PD.vy = 0; ctx.PD.idle = 0;
        try { W.dispatchEvent(new CustomEvent('lowi:pad', { detail: { mode: m } })); } catch (e) { }
    }
    function classes(on, roam, inside) {
        H.classList.toggle('mf-on', on); H.classList.toggle('mf-roam', !!roam); H.classList.toggle('mf-in', !!inside);
        if (!on) { const b = D.getElementById('spBubble'); if (b) { b.style.removeProperty('--mf-bx'); b.style.removeProperty('--mf-by'); } }
    }
    function note(s) { S.log.push(Math.round(performance.now()) + ' ' + s); if (S.log.length > 30) S.log.shift(); }

    function begin(ctx) {
        const a = ctx.a, r = ctx.r; basis(a);
        const dm = S.dom || domMisty();
        S.base = dm && dm.px > 8 ? dm.px : pxPerUnit(a, V.c) * 1.2;
        if (ctx.wand && ctx.wand.visible && ctx.wand.material.opacity > 0.2) S.p.copy(ctx.wand.position);
        else if (dm) fromScreen(a, dm.cx, dm.cy, V.c, S.p);
        else S.p.copy(V.c);
        S.v.set(0, 0, 0); S.d0 = r.dist; S.dHome = r.dist; S.dolly = 0; S.ks = 1; S.idle = 0; S.wp = S.wpNext >= 0 ? S.wpNext : -1; S.wpNext = -1; S.wpWait = 0; S.fade = 1; S.flew = null;
        S.keepAuto = false; S.tourGo = null; S.joined = 0;
        const cs = toScreen(a, V.c, {}); S.cell0.x = cs.x; S.cell0.y = cs.y;
        S.hs = S.base / pxPerUnit(a, S.p);
        S.st = S.p.distanceTo(V.c) < K.CR * 0.95 ? 'exit' : 'free';
        /* adventure: coming back out of a world she does not pop back into her cell: she rises out of the world she just
           left, small, and grows as she drifts away from it (the fall in, reversed) */
        if (S.outT && performance.now() - S.outT < 20000 && (ADV() || S.recallOut)) {
            V.b.subVectors(V.c, S.outPos); if (V.b.lengthSq() < 1e-6) V.b.copy(V.fw); V.b.normalize();
            S.p.copy(S.outPos).addScaledVector(V.b, K.ENTRY * 0.75); S.ks = 0.12; S.st = 'free'; S.emerge = K.EMERGE; S.fade = 0.45;
            S.v.copy(V.b).multiplyScalar(0.5); note('emerge');
        }
        S.outT = 0;
        hold(true); classes(true, false, false); note('begin ' + S.st + ' ' + ctx.PD.mode + ' px=' + Math.round(S.base));
    }
    function end(ctx, why) {
        const a = ctx && ctx.a, r = ctx && ctx.r;
        note('end ' + why); if (W.LowiMistyGalaxy) W.LowiMistyGalaxy.reset(ctx, S); S.huntFly = false; S.outReq = false; S.exH = null; S.exP = 0; S.exD0 = 0; S.autoX = null; S.orb = null; if (ctx && ctx.wand) dropDraw(ctx.wand);
        if (r && a && (why === 'abort' || why === 'home') && !regionsBusy() && curRegion() === 'hub') { r.target.set(0, 0, 0); if (why === 'abort' && S.dHome && S.dollyOut) r.dist = S.dHome; }
        S.st = 'idle'; S.flew = null; S.dolly = 0; S.deep = false; S.dk = 0; S.dkT = 0; veilOff(); hold(false); classes(false, false, false); H.classList.remove('mf-transit');
        /* autopilot heading out of a place keeps flying: she slips back into her cell and goes on to the next place */
        const keep = (S.keepAuto && why === 'left' && ctx && ctx.PD && ctx.PD.mode === 'auto') || (S.recallOut && why === 'left');
        if (why === 'home' || why === 'abort') { S.recallOut = false; S.recallFast = false; }
        S.keepAuto = false; S.joined = 0; S.rw = null;
        if (ctx && ctx.PD && ctx.PD.mode && !keep) padMode(ctx, '');
        if (ctx && ctx.wand) { ctx.wand.material.opacity = 0; ctx.wand.visible = false; }
    }

    /* item 3 (Oct 17): the guide is quiet during transit. While she presses through a wall, flies out, falls / orbits / warps
       into a world, or the view travels between worlds, html.mf-transit hides the guide's lines (the cell guide's bubble,
       Misty's praise, the Home hint) and misty-hints.js says nothing. They come back as soon as she has arrived. */
    function transitOn(ok) {
        if (!ok) return false;
        const st = S.st;
        return st === 'out' || st === 'warp' || st === 'pull' || st === 'orbit' || (st === 'inside' && ((S.exP || 0) > 0 || (S.fallT >= 0 && S.fallT < K.FALL))) || (st !== 'idle' && regionsBusy());
    }
    function transitSync(ok) {
        const on = transitOn(ok);
        if (H.classList.contains('mf-transit') !== on) H.classList.toggle('mf-transit', on);
        if (on && !D.getElementById('mfTransitCss') && D.head) {
            const st = D.createElement('style'); st.id = 'mfTransitCss';
            st.textContent = 'html.mf-transit #whHint,html.mf-transit .lp-praise,html.mf-transit .rp-say{opacity:0!important;visibility:hidden!important;transition:opacity .2s ease,visibility 0s linear .2s!important}';
            D.head.appendChild(st);
        }
    }
    /* ---------- ownership: is the flight (exit, free, warp, inside, home) ours this frame? ---------- */
    function wants(ctx) {
        const a = ctx.a, r = ctx.r, PD = ctx.PD; if (!a || !a.THREE || !a.camera || !r) return false;
        vecs(a.THREE);
        const homeTab = H.classList.contains('wh-home') && H.classList.contains('wh-world-live');
        const ok = r.mode === 'home' && homeTab && !ctx.A.away && !D.hidden && !D.querySelector('.bw3-full');
        transitSync(ok);
        /* the membrane settles back on its own even when nobody flies */
        if (S.st === 'idle') {
            if (a.memU && a.memU.uPushA && a.memU.uPushA.value) { S.wobT += ctx.dt; const w = wobble(S.wob, S.wobT, ctx.reduced); setPush(a, S.wobDir, Math.abs(w) < 0.003 || S.wobT > 2.5 ? 0 : w); }
            if ((S.domT -= ctx.dt) <= 0 && ok && !PD.mode) { S.domT = 0.5; const dm = domMisty(); if (dm) S.dom = dm; }
        }
        if (!ok) { if (S.st !== 'idle') end(ctx, 'abort'); S.joinT = 0; return false; }
        /* misty-roam: you are in a place without her: she comes in by herself once it has settled */
        if (S.st === 'idle' && ctx.inRegion) {
            const WH = W.LowiWorldHome, hero = !!(WH && WH.state && WH.state.heroAnim), busy = regionsBusy() || !!r.fly;
            S.joinT = busy || hero ? 0 : (S.joinT || 0) + ctx.dt;
            if (joinOk({ inRegion: true, busy, hero, reduced: ctx.reduced, settled: S.joinT }) && (a.regions || []).some(g => norm(g.id) === curRegion())) { join(ctx); return true; }
            return false;
        }
        S.joinT = 0;
        /* adventure: back on Today (or after a tap took her somewhere) the tour simply goes on */
        if (S.st === 'idle' && !PD.mode) { S.recallOut = false; S.recallFast = false; }
        if (S.st === 'idle' && ADV() && !PD.mode && !ctx.inRegion && !ctx.awayHome && !regionsBusy()) padMode(ctx, 'auto');
        if (S.st === 'idle') {
            if ((PD.mode === 'drive' || PD.mode === 'auto' || (PD.mode === 'home' && S.recallOut)) && !ctx.inRegion && !ctx.awayHome && !regionsBusy()) begin(ctx);
            else return false;
        }
        return true;
    }

    /* ---------- the flight, one frame ---------- */
    function frame(ctx) {
        const a = ctx.a, r = ctx.r, PD = ctx.PD, wand = ctx.wand, dt = ctx.dt, k = clamp(+ctx.k || 0, 0, 1), still = !!ctx.reduced;
        if (!wand) return;
        basis(a); S.t += dt;
        if (S.st !== 'inside') { mistFrame(ctx, 0, false); darkFrame(ctx, 0); }
        const cur = curRegion();
        /* world-exit: leaving the world she is in (World map, X, the autopilot heading on, a recall, or your 3-second push at its
           edge) no longer drops her back into her bubble: she flies out with the camera and stays out in the universe */
        if (S.outReq) { S.outReq = false; if (S.st === 'inside' && regionsBusy()) startOut(ctx, S.outWhy0 || 'map'); S.outWhy0 = ''; }
        if (S.st === 'out') { outFrame(ctx, k); return; }
        /* someone else took us somewhere (a tap on a place, the World map): she was not flown there, so she is not shown there */
        if (S.st !== 'warp' && S.st !== 'inside' && (cur !== 'hub' || regionsBusy())) { end(ctx, 'tapped-away'); return; }
        if ((S.st === 'inside' || S.st === 'warp') && S.entered && (cur !== S.flew && !regionsBusy())) { end(ctx, 'left'); return; }
        if (S.st === 'inside' && cur === 'hub') { end(ctx, 'left'); return; }

        /* adventure recall (adventure.js stop): straight home, a little quicker, then she settles in her cell */
        if (S.recallReq && S.st !== 'warp') {
            S.recallReq = false; S.recallFast = true;
            if (S.st === 'inside') {
                const reg = (a.regions || []).find(g => norm(g.id) === S.flew), Rg = R(); let ok = false;
                try { ok = !regionsBusy() && !r.fly && !!(Rg && Rg.travel && Rg.travel('hub')); } catch (e) { ok = false; }
                if (ok) { if (reg) S.outPos.copy(reg.pos); S.outT = performance.now(); S.recallOut = true; S.wpNext = -1; note('recall out'); }
                padMode(ctx, ok ? 'home' : 'drive');
            } else { if (S.st === 'pull' || S.st === 'orbit') { S.st = 'free'; S.orb = null; } padMode(ctx, 'home'); }
        }
        const mode = PD.mode || 'drive';
        /* misty-turn: a drag on Misty turns her; holding the controller's middle flies her straight ahead (or back), steering = turning */
        const tq = turnStep(ctx, mode, PD.vx || 0, PD.vy || 0); S.th = tq ? tq.th : 0;
        const vx = tq ? tq.vx : PD.vx || 0, vy = tq ? tq.vy : PD.vy || 0, mag = Math.min(1, Math.hypot(vx, vy)), steering = mode === 'drive' && (mag > 0.05 || !!S.th || !!(tq && tq.hands));
        if (steering && ADV()) { try { W.LowiAdventure.stop('steer'); } catch (e) { } }
        if (mode === 'drive') S.idle = steering ? 0 : S.idle + dt; else S.idle = 0;
        if (mode === 'drive' && S.idle > K.IDLE_HOME && (S.st === 'free' || S.st === 'exit')) { padMode(ctx, 'home'); note('idle home'); }
        const camFree = !r.fly;

        if (S.st === 'pull') { pullFrame(ctx, k); return; }
        if (S.st === 'orbit') { orbitFrame(ctx, k, still); return; }
        if (S.st === 'warp') { warpFrame(ctx, k); return; }
        if (S.st === 'inside') { insideFrame(ctx, k, mode, vx, vy, mag, still); return; }

        /* where she wants to go, in world space (length 0..1) */
        const homeP = homePoint(a);
        V.want.set(0, 0, 0);
        if (mode === 'drive') { V.want.addScaledVector(V.rt, vx).addScaledVector(V.up, vy); thrustWant(); }
        else if (mode === 'home') { V.a.subVectors(homeP, S.p); const d = V.a.length(); if (d > 1e-4) V.want.copy(V.a).multiplyScalar(Math.min(1, d / 0.9) / d); }
        else if (mode === 'auto') tourWant(ctx, k);

        const off = V.a.subVectors(S.p, V.c).length();
        if (S.st === 'exit') {
            /* inside her bubble: free to move a little, then the membrane tents out around her and slows her, then lets her through */
            const bodyR = S.hs * 0.34, rin = Math.max(0.05, K.CR - bodyR), smax = clamp(1.1 * bodyR, 0.45, 0.9 * K.CR);
            const dirO = off > 1e-4 ? V.b.copy(V.a).divideScalar(off) : V.b.copy(V.want).normalize();
            let s = stretchOf(off, rin, smax);
            const outward = V.want.dot(dirO) > 0.05;
            const sp = speed(k, 'exit') * (mode === 'home' ? 1.2 : 1) * (outward ? resist(s, smax) : 1);
            S.v.lerp(V.want.clone().multiplyScalar(sp), Math.min(1, dt * 6));
            S.p.addScaledVector(S.v, dt);
            /* let go mid-push: the stretched membrane pulls her back in */
            if (!outward && s > 0) S.p.addScaledVector(dirO, -Math.min(s, s * dt * 3.5));
            const off2 = V.a.subVectors(S.p, V.c).length(); s = stretchOf(off2, rin, smax);
            if (off2 > 1e-4) S.pushDir.copy(V.a).divideScalar(off2);
            if (s >= smax * 0.985 && outward && mode !== 'home') {
                S.st = 'free'; S.wob = s; S.wobT = 0; S.wobDir.copy(S.pushDir); S.v.addScaledVector(S.pushDir, 0.6);
                V.b.copy(V.c).addScaledVector(S.pushDir, K.CR + s * 0.9); ctx.burst(V.b, 6 + Math.round(10 * k), 0.3 + 0.3 * k); note('through');
                setPush(a, S.wobDir, s);
            } else setPush(a, S.pushDir, s);
            /* camera stays on her cell while she struggles out */
            if (camFree) r.target.lerp(V.c, 1 - Math.exp(-dt * 3));
            if (mode === 'home' && S.p.distanceTo(homeP) < 0.1 && r.target.distanceTo(V.c) < 0.08) { r.dist += (S.dHome - r.dist) * Math.min(1, dt * 4); end(ctx, 'home'); return; }
            if (mode === 'home') r.dist += (S.dHome - r.dist) * Math.min(1, dt * 2);
            S.ap = 0; S.near = null;
        } else {
            /* free in the world */
            S.wobT += dt; setPush(a, S.wobDir, wobble(S.wob, S.wobT, still));
            if (mode === 'drive' && mag > 0.1) magnet(a, vx, vy, mag);
            const nb = nearest(a); S.near = nb; S.ap = nb ? approach(nb.d) : 0;
            /* autopilot: done pausing at a place's door, she goes in by herself (the same warp as a tap) */
            if (S.tourGo && mode === 'auto' && !regionsBusy()) {
                const g = S.tourGo; S.tourGo = null;
                /* orbit-in: never straight in on autopilot; she spirals round the world, smaller and smaller, skims it, is flung
                   out, and falls in on the next pass */
                if (!ctx.reduced && startOrbit(ctx, g)) return;
                startWarp(ctx, { id: g.id, pos: g.pos }); return;
            }
            const adv = ADV() && mode === 'auto';
            const GX = W.LowiMistyGalaxy; /* galaxy breakout (misty-galaxy.js): out there she is faster, so on screen she keeps her pace */
            const sp = (GX ? GX.speed(ctx, S) : 1) * speed(k, 'out') * (1 - 0.55 * S.ap) * (mode === 'auto' && k < 0.4 ? 0.5 : 1) * (mode === 'home' ? 1.25 * (S.recallFast ? K.RECALL : 1) : 1) * (adv ? K.ADV_SPEED : 1);
            S.v.lerp(V.b.copy(V.want).multiplyScalar(sp), Math.min(1, dt * 3.2));
            S.p.addScaledVector(S.v, dt);
            /* galaxy breakout: push long enough on the edge of your world and it gives way (misty-galaxy.js); otherwise the edge holds */
            if (!(GX && GX.step(ctx, S, V, mode, mag, K))) { const L = S.p.length(); if (L > K.ROAM) { S.p.multiplyScalar(K.ROAM / L); const out = S.v.dot(V.b.copy(S.p).normalize()); if (out > 0) S.v.addScaledVector(V.b, -out); } }
            /* misty-bump.js: the bloodstream's cells can bump her (true 3D contact) or, on autopilot, be dodged */
            if (W.LowiMistyBump && !S.gx && !S.gxBack) { try { W.LowiMistyBump.step(ctx, S, mode, K); } catch (e) { } }
            /* back into her own cell */
            const offN = V.a.subVectors(S.p, V.c).length();
            if (offN < K.CR * 0.92 && (mode === 'home' || (V.want.dot(V.a) < 0 && !(ADV() && mode === 'auto')))) { /* adventure: no dipping back into her cell mid-tour */ S.st = 'exit'; S.wob = -0.25; S.wobT = 0; S.wobDir.copy(V.a).normalize(); note('back in'); }
            /* at a place's atmosphere: the tap's own warp takes her in */
            if (nb && nb.d < K.ENTRY && mode === 'drive' && !regionsBusy()) {
                /* misty-hunt: on a weak day the world's pull is weak, she bounces off its edge once or twice before she gets in */
                if (W.LowiMistyHunt && !W.LowiMistyHunt.gate(norm(nb.id))) { V.a.subVectors(S.p, nb.pos); if (V.a.lengthSq() < 1e-6) V.a.copy(V.fw); V.a.normalize(); S.p.copy(nb.pos).addScaledVector(V.a, K.ENTRY * 1.5); S.v.copy(V.a).multiplyScalar(1.8); S.wob = -0.35; S.wobT = 0; note('bounce ' + nb.id); return; }
                S.huntFly = true; startWarp(ctx, nb); return;
            }
            /* the camera follows her, easing in as she nears a place (and giving back your zoom when she leaves it) */
            if (camFree) {
                if (mode === 'home' && !S.gx && !S.gxBack) { r.target.lerp(V.c, 1 - Math.exp(-dt * 1.6)); r.dist += (S.dHome - r.dist) * Math.min(1, dt * 1.6); }
                else {
                    V.b.copy(S.p).addScaledVector(S.v, 0.3);
                    r.target.lerp(V.b, 1 - Math.exp(-dt * (adv ? 1.1 : 2.4))); /* adventure: the camera drifts after her, gently */
                    S.dolly += (S.ap - S.dolly) * Math.min(1, dt * 2.2);
                    if (GX && GX.cam(Object.assign(ctx, { K }), S)) { S.dolly = 0; S.dollyOut = false; } /* out in the galaxy (or pushing on its edge) the camera is the galaxy's */
                    else {
                        if (S.dolly < 0.004 && Math.abs(r.dist - S.d0) > 0.001 && !S.dollyOut) S.d0 = r.dist; /* a pinch while flying is yours */
                        S.dollyOut = S.dolly > 0.004;
                        if (S.dollyOut) r.dist = S.d0 + (Math.max(3.4, S.d0 * 0.42) - S.d0) * S.dolly;
                    }
                }
                if (mag > 0.05 || S.th || mode !== 'drive') r.idle = 0;
            }
        }
        /* her size: constant on screen; smaller only near a place */
        /* rising out of a world (adventure): she grows back slowly instead of snapping to size */
        if (S.emerge > 0) { S.emerge -= dt; S.fade = Math.min(1, S.fade + dt * 0.7); }
        S.ks += (sizeK(S.ap) - S.ks) * Math.min(1, dt * (S.emerge > 0 ? 1.2 : 5));
        S.hs = S.base * S.ks / pxPerUnit(a, S.p);
        place(ctx, k, still, S.emerge > 0 || S.fade < 1 ? (S.fade = Math.min(1, S.fade + dt * 0.7)) : 1);
        if (S.st === 'free') turnDraw(ctx, S.fade);
        if (S.st === 'free' && W.LowiMistyBump) { try { W.LowiMistyBump.draw(ctx, S, still); } catch (e) { } } /* misty-bump.js: dizzy after a bump, a flinch on a near miss */
        bubbleFollow(a);
        trail(ctx, k, mode === 'drive' ? mag : 0.6);
    }
    /* where her cell has her when she is home: the DOM Misty's spot, at the cell's depth */
    function homePoint(a) {
        const dm = S.dom; if (!dm) return V.c;
        if (!S.hp) S.hp = new a.THREE.Vector3();
        const cs = toScreen(a, V.c, {}), dx = cs.x - S.cell0.x, dy = cs.y - S.cell0.y;
        return fromScreen(a, dm.cx + dx, dm.cy + dy, V.c, S.hp);
    }
    function nearest(a) {
        let best = null;
        (a.regions || []).forEach(g => { if (!g || !g.pos) return; const d = S.p.distanceTo(g.pos); if (!best || d < best.d) best = { id: g.id, d, pos: g.pos }; });
        return best;
    }
    /* the stick points at a place you can see: bend her path toward it (depth included) */
    /* misty-turn (Oct 17, E-man): misty-turn.js owns her heading (a drag on Misty turns her, not the world) and the controller's
       middle hold (forward / back). These three are its only hooks in here. */
    function turnStep(ctx, mode, vx, vy) {
        const MT = W.LowiMistyTurn; if (!MT || !MT.steer || !S.p) return null;
        const r = ctx.r, WH = W.LowiWorldHome, busy = !!r.fly || regionsBusy() || !!(WH && WH.state && WH.state.heroAnim) || S.st === 'warp' || S.st === 'pull' || S.recallOut;
        let o = null; try { o = MT.steer({ dt: ctx.dt, mode, vx, vy, rig: r, busy }); } catch (e) { o = null; }
        if (!o || !o.f) return null;
        if (!S.hd) S.hd = new ctx.a.THREE.Vector3();
        S.hd.set(o.f[0], o.f[1], o.f[2]);
        return o;
    }
    function thrustWant() { if (!S.th || !S.hd) return; V.want.addScaledVector(S.hd, S.th); const L = V.want.length(); if (L > 1) V.want.divideScalar(L); }
    function turnDraw(ctx, alpha) {
        const MT = W.LowiMistyTurn; if (!MT || !MT.draw) return;
        let o = null; try { o = MT.draw({ a: ctx.a, rig: ctx.r, p: S.p, hs: S.hs, dt: ctx.dt, alpha, reduced: ctx.reduced }); } catch (e) { o = null; }
        if (!o) return;
        if (o.bank && ctx.wand && ctx.wand.material) ctx.wand.material.rotation += o.bank;
        if (o.sparkle) { try { V.b.copy(S.p); ctx.burst(V.b.clone(), 6, 0.18 * Math.max(0.3, S.hs)); } catch (e) { } }
    }
    function magnet(a, vx, vy, mag) {
        const me = toScreen(a, S.p, {}), cands = [];
        (a.regions || []).forEach(g => {
            const s = toScreen(a, g.pos, {}); V.b.copy(g.pos).applyMatrix4(a.camera.matrixWorldInverse);
            cands.push({ id: g.id, sx: s.x - me.x, sy: me.y - s.y, front: V.b.z < 0 && s.z < 1, pos: g.pos });
        });
        const hit = aimAt(vx, vy, cands, K.MAG_DEG); if (!hit) return;
        const g = cands.find(c => c.id === hit.id); V.b.subVectors(g.pos, S.p); const d = V.b.length(); if (d < 1e-3) return;
        V.b.divideScalar(d); const w = 0.85 * hit.w;
        V.want.multiplyScalar(1 / mag).multiplyScalar(1 - w).addScaledVector(V.b, w).normalize().multiplyScalar(mag);
    }
    /* autopilot: a slow tour from place to place, stopping in front of each one, then going in by herself (misty-roam) */
    /* adventure: on the way to the next world she drifts from corner to corner first, now and then stopping as if a bit
       lost and looking around, on curved paths (aquarium pace, never a straight hop) */
    function driftPts(ctx) {
        const a = ctx.a, n = 1 + Math.floor(Math.random() * 2), out = [];
        let sx = V.a.subVectors(S.p, V.c).dot(V.rt) > 0 ? -1 : 1;
        for (let i = 0; i < n; i++) {
            const p = new a.THREE.Vector3().copy(V.c).addScaledVector(V.rt, sx * (2.4 + 1.8 * Math.random()))
                .addScaledVector(V.up, (Math.random() < 0.5 ? -1 : 1) * (1.1 + 1.3 * Math.random())).addScaledVector(V.fw, (Math.random() - 0.5) * 1.6);
            const L = p.length(); if (L > K.ROAM * 0.85) p.multiplyScalar(K.ROAM * 0.85 / L);
            out.push(p); sx = -sx;
        }
        /* now and then (about 1 drift in 3) she wanders off to the far edge of her world and is lost there for a while */
        if (Math.random() < 0.34) {
            const far = new a.THREE.Vector3().copy(V.c).addScaledVector(V.rt, sx * K.ROAM * 0.7).addScaledVector(V.up, (Math.random() - 0.5) * 3).addScaledVector(V.fw, -1.5 - Math.random() * 2);
            const L = far.length(); if (L > K.ROAM * 0.92) far.multiplyScalar(K.ROAM * 0.92 / L);
            out.far = out.length; out.push(far);
        }
        return out;
    }
    function tourWant(ctx, k) {
        const a = ctx.a, regs = a.regions || []; if (!regs.length) return;
        if (S.wp < 0) { let bi = 0, bd = 1e9; regs.forEach((g, i) => { const d = S.p.distanceTo(g.pos); if (d < bd) { bd = d; bi = i; } }); S.wp = bi; }
        if (ADV() && !ctx.reduced) {
            if (S.driftFor !== S.wp || !S.drift) { S.driftFor = S.wp; S.drift = driftPts(ctx); S.driftI = 0; S.lostT = 0; }
            if (S.driftI < S.drift.length) {
                V.a.subVectors(S.drift[S.driftI], S.p); const d = V.a.length();
                if (S.lostT > 0 || d < 0.6) {
                    const farOff = S.drift.far === S.driftI;
                    if (S.lostT <= 0) S.lostT = farOff ? K.LOST + Math.random() * 3 : 1.2 + Math.random() * 1.6;
                    S.lostT -= ctx.dt;
                    if (S.lostT <= 0.01) { S.lostT = 0; S.driftI++; if (farOff) { note('lost, back'); try { if (W.LowiMistyHints) W.LowiMistyHints.lost(); } catch (e) { } } }
                    V.want.set(0, 0, 0).addScaledVector(V.rt, Math.cos(S.t * 1.7) * 0.1).addScaledVector(V.up, Math.sin(S.t * 2.1) * 0.08);
                    return;
                }
                V.want.copy(V.a).multiplyScalar(Math.min(1, d / 1.5) * 0.8 / d);
                V.want.addScaledVector(V.up, Math.sin(S.t * 0.7) * 0.3).addScaledVector(V.rt, Math.cos(S.t * 0.45) * 0.25);
                return;
            }
        }
        const g = regs[S.wp % regs.length]; V.b.subVectors(V.c, g.pos).normalize();
        V.a.copy(g.pos).addScaledVector(V.b, 2.9).addScaledVector(V.up, 0.4);
        V.a.sub(S.p); const d = V.a.length();
        if (d < 0.5) {
            if (S.wpWait <= 0) { S.wpWait = 2.2 + 1.5 * (1 - k); V.b.copy(S.p).addScaledVector(V.up, -0.2 * S.hs); ctx.burst(V.b, Math.round(5 + 15 * k), 0.3 + 0.4 * k); ring(ctx, k); }
            S.wpWait -= ctx.dt; if (S.wpWait <= 0.01) { S.wpNext = (S.wp + 1) % regs.length; S.wpWait = 0; S.tourGo = g; }
            return;
        }
        V.want.copy(V.a).multiplyScalar(Math.min(1, d / 1.5) * (k < 0.4 ? 0.6 : 0.85) / d);
        if (!ctx.reduced) V.want.addScaledVector(V.up, Math.sin(S.t * 1.3) * 0.15);
    }
    function ring(ctx, k) {
        const A = ctx.A; if (!A || !A.ring || ctx.reduced) return;
        A.ring.position.copy(S.p); A.ring.material.color.set(A.tier === 'weak' ? '#c98a92' : '#a8ffd8'); A.ringT = 0; A.ring.visible = true;
    }
    function trail(ctx, k, m) {
        if (m < 0.08 || S.v.lengthSq() < 0.04) return;
        if ((S.trail -= ctx.dt) > 0) return;
        S.trail = 0.14 / (0.5 + k);
        const A = ctx.A, pm = A && A.pts && A.pts.material;
        if (pm) { pm.color.set(A.tier === 'weak' || A.tier === 'tired' ? '#9aa3b2' : '#9fe3ff'); pm.opacity = 0.45 + 0.4 * k; }
        V.b.copy(S.p).addScaledVector(V.up, -0.25 * S.hs); ctx.burst(V.b, 1 + Math.round(2 * k), 0.12 * Math.max(0.3, S.hs));
    }
    /* draw her: position, size, tilt, energy tint (the face comes from the DOM Misty's art: she smiles only when full) */
    function place(ctx, k, still, alpha) {
        const wand = ctx.wand; if (!wand.material.map) alpha = 0; /* never a blank square before her art is ready */
        /* Oct 17: she is the one you see in every world; if anything parked her on a hidden layer, she comes back */
        if (ctx.a && ctx.a.camera && !wand.layers.test(ctx.a.camera.layers)) wand.layers.mask = ctx.a.camera.layers.mask;
        const bob = still ? 0 : Math.sin(S.t * 1.6) * 0.04 * S.hs, droop = (1 - k) * 0.08 * S.hs;
        wand.position.copy(S.p).addScaledVector(V.up, bob - droop);
        /* world-exit: pressing against the edge she trembles harder the longer you hold, leaning into the push */
        const xp = S.st === 'inside' ? S.exP || 0 : 0;
        if (xp > 0 && !still) wand.position.addScaledVector(V.rt, Math.sin(S.t * 47) * 0.02 * S.hs * xp).addScaledVector(V.up, Math.cos(S.t * 39) * 0.012 * S.hs * xp);
        const br = still ? 1 : 1 + Math.sin(S.t * 2.2) * 0.02;
        wand.scale.set(S.hs * 260 / 310 * br, S.hs * br, 1);
        const lean = still ? 0 : clamp(-S.v.dot(V.rt) * 0.06, -0.3, 0.3);
        wand.material.rotation = (still ? 0 : Math.sin(S.t * 0.9) * 0.08) - (1 - k) * 0.18 + lean - (xp > 0 ? (S.exVx || 0) * 0.28 * xp : 0);
        if (wand.material.color) wand.material.color.setRGB(1, 0.78 + 0.22 * k, 0.78 + 0.22 * k);
        wand.material.opacity = (0.55 + 0.43 * k) * clamp(alpha, 0, 1);
        wand.visible = wand.material.opacity > 0.01;
        /* misty-face (Oct 17, E-man: "Misty is basically just staring you down"): her round body turns in 3D, her face goes
           where she looks (along her path, her heading when you steer, glances when idle); you see her back when she flies away */
        const MFc = W.LowiMistyFace;
        if (MFc && MFc.draw) { try { MFc.draw({ a: ctx.a, wand, p: S.p, hs: S.hs, mode: ctx.PD && ctx.PD.mode, hd: S.hd, st: S.st, reduced: ctx.reduced }); } catch (e) { } }
    }
    /* the DOM parts of her cell (wall lines, name) follow the 3D cell when the camera leaves it */
    function bubbleFollow(a) {
        const b = D.getElementById('spBubble'); if (!b) return;
        const cs = toScreen(a, V.c, {}), dx = Math.round(cs.x - S.cell0.x), dy = Math.round(cs.y - S.cell0.y);
        const roam = Math.abs(dx) + Math.abs(dy) > 2;
        b.style.setProperty('--mf-bx', dx + 'px'); b.style.setProperty('--mf-by', dy + 'px');
        if (H.classList.contains('mf-roam') !== roam) H.classList.toggle('mf-roam', roam);
    }

    /* ---------- adventure: gravity pulls her in ---------- */
    /* ---------- orbit-in: autopilot's way into a world ---------- */
    function startOrbit(ctx, g) {
        const a = ctx.a, r = ctx.r; if (!g || !g.pos || !S.p) return false;
        basis(a);
        const n = S.p.clone().sub(g.pos); let r0 = n.length();
        if (r0 < 1e-3) { n.copy(V.fw); r0 = K.ENTRY * 2; }
        n.normalize(); r0 = Math.max(r0, K.ENTRY * 1.6);
        /* the orbit's plane leans away from the camera, so she swings in front of the world and round behind it */
        const up = V.up.clone().multiplyScalar(Math.cos(0.5)).addScaledVector(V.fw, Math.sin(0.5));
        const ax = up.clone().addScaledVector(n, -up.dot(n));
        if (ax.lengthSq() < 1e-6) ax.copy(V.fw).addScaledVector(n, -V.fw.dot(n));
        if (ax.lengthSq() < 1e-6) return false;
        ax.normalize();
        const tang = ax.clone().cross(n);
        S.orb = { id: norm(g.id), C: g.pos.clone(), n, r0, ax, sgn: tang.dot(S.v) < 0 ? -1 : 1, q: 0, ang: 0, fling: 0, tries: 0, hs0: S.hs, d0: r.dist, prev: S.p.clone() };
        S.st = 'orbit'; S.near = null; S.ap = 0; S.wob = 0; setPush(a, S.wobDir, 0); note('orbit ' + g.id);
        return true;
    }
    function orbitFrame(ctx, k, still) {
        const a = ctx.a, r = ctx.r, dt = ctx.dt, O = S.orb;
        basis(a);
        if (!O || ctx.PD.mode !== 'auto' || regionsBusy() || !(a.regions || []).some(g => norm(g.id) === O.id)) { S.st = 'free'; S.orb = null; note('orbit off'); return; }
        if (O.fling > 0) { O.fling -= dt; O.q = Math.max(ORBIT.BACK, O.q - dt * (1 - ORBIT.BACK) / ORBIT.FLING * 1.5); }
        else O.q = Math.min(1, O.q + dt / (ORBIT.T * (still ? 1.3 : 1)));
        const o = orbitAt(O.q);
        O.ang += dt * orbitSpin(o.rad, still) * O.sgn;
        V.a.copy(O.n).applyAxisAngle(O.ax, O.ang).multiplyScalar(O.r0 * o.rad);
        O.prev.copy(S.p); S.p.copy(O.C).add(V.a);
        S.v.subVectors(S.p, O.prev).divideScalar(Math.max(1e-3, dt));
        /* her size in the world, not on screen: far side of the orbit = smaller, and smaller still as she falls in */
        S.hs = O.hs0 * o.size; S.ks = clamp(S.hs * pxPerUnit(a, S.p) / Math.max(1, S.base), 0.05, 2);
        /* the camera holds the world, wide enough for the whole orbit, like a long lens on a planet */
        if (!r.fly) {
            r.target.lerp(O.C, 1 - Math.exp(-dt * 0.9));
            const want = Math.max(O.d0, O.r0 * 2.7);
            r.dist += (want - r.dist) * (1 - Math.exp(-dt * 0.7));
        }
        place(ctx, k, still, 1);
        trail(ctx, k, O.fling > 0 ? 1 : 0.55);
        if (O.q < 1 || O.fling > 0) return;
        /* at the door */
        let refuse = false;
        if (O.tries >= ORBIT.MIN_FLINGS) { try { const Hn = W.LowiMistyHunt; refuse = !!(Hn && Hn.gate && Hn.gate(O.id) === false); } catch (e) { refuse = false; } }
        if (orbitFling(O.tries, refuse)) {
            O.tries++; O.fling = ORBIT.FLING;
            ctx.burst(S.p, 10 + Math.round(8 * k), 0.4 + 0.3 * k); ring(ctx, k); note('orbit fling ' + O.tries);
            return;
        }
        S.orb = null; startWarp(ctx, { id: O.id, pos: O.C });
    }
    function startPull(ctx, g) {
        S.st = 'pull'; S.pullT = 0; S.pullId = g.id; S.pullC.copy(g.pos); S.pullRel.subVectors(S.p, g.pos); S.pullKs = S.ks;
        S.pullAx = (S.pullAx || new ctx.a.THREE.Vector3()).copy(V.fw); S.v.set(0, 0, 0); note('pull ' + g.id);
    }
    function pullFrame(ctx, k) {
        const a = ctx.a, r = ctx.r, dt = ctx.dt; S.pullT += dt;
        const P = pullAt(S.pullT / K.PULL);
        V.b.copy(S.pullRel).applyAxisAngle(S.pullAx, P.ang).multiplyScalar(P.rad);
        S.p.copy(S.pullC).add(V.b);
        S.ks = S.pullKs * P.size; S.hs = S.base * S.ks / pxPerUnit(a, S.p);
        if (!r.fly) r.target.lerp(S.p, 1 - Math.exp(-dt * 1.4));
        place(ctx, k, false, 1); bubbleFollow(a); trail(ctx, k, 0.4);
        if (S.pullT >= K.PULL && !regionsBusy()) startWarp(ctx, { id: S.pullId, pos: S.pullC });
        else if (S.pullT > K.PULL + 6) { S.st = 'free'; note('pull timeout'); }
    }

    /* ---------- into a place ---------- */
    function startWarp(ctx, nb) {
        const a = w3(); if (!a || !a.flyTo) return;
        S.advWarp = ADV() && !ctx.reduced;
        S.st = 'warp'; S.flew = norm(nb.id); S.warpT = 0; S.entered = 0; S.warpFrom.copy(S.p); S.warpTo.copy(nb.pos); S.v.set(0, 0, 0);
        setPush(ctx.a, S.wobDir, 0); hold(false); note('warp ' + nb.id);
        try { a.flyTo(nb.id); } catch (e) { }
        H.classList.add('mf-in');
    }
    function warpFrame(ctx, k) {
        const a = ctx.a; S.warpT += ctx.dt;
        const cur = curRegion(), busy = regionsBusy();
        if (cur === S.flew) S.entered = 1;
        /* she dives in ahead of the camera, getting smaller, and fades */
        const q = Math.min(1, S.warpT / 0.55);
        S.p.lerpVectors(S.warpFrom, S.warpTo, q * 0.8);
        S.hs = Math.max(1e-3, S.base * S.ks * (1 - 0.7 * q) / pxPerUnit(a, S.p));
        place(ctx, k, ctx.reduced, S.advWarp ? 1 - 0.55 * q : 1 - q); /* adventure: she never vanishes, she stays readable */
        if (S.entered && !busy) { enterInside(ctx); return; }
        if (S.warpT > 9) end(ctx, 'warp-timeout');
    }
    function enterInside(ctx) {
        const a = ctx.a, r = ctx.r; basis(a);
        const reg = (a.regions || []).find(g => norm(g.id) === S.flew);
        if (reg) S.inC.copy(reg.pos).multiplyScalar(0.92); else S.inC.copy(r.target);
        /* in front of you, a little below the middle, about as big as she was at the door */
        S.p.copy(r.target).addScaledVector(V.fw, Math.min(1.1, r.dist * 0.42)).addScaledVector(V.up, -0.15);
        S.inHs = S.base * K.MIN_K / pxPerUnit(a, S.p); S.hs = S.inHs; S.fade = 0; S.v.set(0, 0, 0); S.wp = -1;
        S.st = 'inside'; S.inT = 0; S.advIn = 0; /* misty-hunt: getting in by YOUR steering powers her up (once per world per day); a tap or the autopilot does not */ try { if (S.huntFly && W.LowiMistyHunt) W.LowiMistyHunt.entered(S.flew); } catch (e) { } S.huntFly = false; S.rw = null; S.rwWait = 0; S.rwN = 0; hold(false); classes(true, false, true); note('inside ' + S.flew);
        /* adventure: she falls into the world from above, small, growing as she lands (continuous with the pull) */
        S.fallT = -1; if (S.advWarp && !ctx.reduced) { S.fallT = 0; S.fallTo.copy(S.p); S.fade = 0.45; }
        S.advWarp = false;
    }
    /* misty-roam: she was not flown in (a tap, the World map): she comes in by herself, rising in from below the view */
    function join(ctx) {
        const a = ctx.a; basis(a);
        const dm = S.dom || domMisty(), q = canvasRect(a);
        S.base = dm && dm.px > 8 ? dm.px : Math.min(q.width, q.height) * 0.42;
        S.flew = curRegion(); S.entered = 1; S.joinT = 0; S.keepAuto = false; S.tourGo = null;
        enterInside(ctx);
        V.b.copy(S.p); fromScreen(a, q.left + q.width * (0.35 + 0.3 * Math.random()), q.top + q.height * 1.04, V.b, S.p);
        S.idle = 99; S.joined = 1; note('join ' + S.flew);
    }
    /* misty-roam: one frame of free roaming inside a place. Her spots are fractions of the view, turned into world points each
       frame, so whatever the camera does (your pan or pinch, its own slow drift) she stays in view and keeps travelling */
    function roamFrame(ctx, k, still) {
        const a = ctx.a, r = ctx.r, dt = ctx.dt, q = canvasRect(a), me = toScreen(a, S.p, {});
        const fx = (me.x - q.left) / q.width, fy = (me.y - q.top) / q.height;
        if (!S.rw) { const s = roamSpot(Math.random(), Math.random(), { x: fx, y: fy }); S.rw = { x: s.x, y: s.y, dz: (Math.random() - 0.5) * 0.5 }; S.rwT = 0; }
        S.rwT += dt;
        const depth = V.b.copy(r.target).addScaledVector(V.fw, Math.min(1.1, r.dist * 0.42) + S.rw.dz * Math.min(1, r.dist * 0.2));
        const tgt = fromScreen(a, q.left + S.rw.x * q.width, q.top + S.rw.y * q.height, depth, V.a);
        const ppu = pxPerUnit(a, S.p), dPx = Math.hypot(S.rw.x * q.width - (me.x - q.left), S.rw.y * q.height - (me.y - q.top));
        V.want.set(0, 0, 0);
        if (S.rwWait > 0) {
            /* a short pause at a spot: she hovers, now and then tending it with a ring of light */
            S.rwWait -= dt; if (S.rwWait <= 0) { const s = roamSpot(Math.random(), Math.random(), S.rw); S.rw = { x: s.x, y: s.y, dz: (Math.random() - 0.5) * 0.5 }; S.rwT = 0; }
        } else if (dPx < 16 || S.rwT > 14) {
            S.rwN++; S.rwWait = (still ? 2.5 : 0.9 + Math.random() * 1.6) * (k < 0.4 ? 1.5 : 1);
            if (S.rwN % 3 === 0) { V.q.copy(S.p).addScaledVector(V.up, -0.2 * S.hs); ctx.burst(V.q.clone(), Math.round(4 + 10 * k), (0.25 + 0.3 * k) * S.hs); ring(ctx, k); }
        } else {
            V.want.subVectors(tgt, S.p); const d = V.want.length();
            const v = roamPx(k, Math.min(q.width, q.height)) * (still ? 0.4 : 1) / ppu;
            if (d > 1e-5) V.want.multiplyScalar(Math.min(1, dPx / 60) * v / d);
            /* a soft meander across her path, so she curves like something alive, not a cursor */
            if (!still) V.want.addScaledVector(V.up, Math.sin(S.t * 1.1) * 0.18 * v).addScaledVector(V.rt, Math.cos(S.t * 0.7) * 0.1 * v);
        }
        S.v.lerp(V.want, Math.min(1, dt * (S.rwWait > 0 ? 2.5 : 1.6)));
        S.p.addScaledVector(S.v, dt);
    }
    function insideFrame(ctx, k, mode, vx, vy, mag, still) {
        const a = ctx.a, r = ctx.r, dt = ctx.dt, zs = clamp(r.dist / 2.6, 1, 8), inR = inReach(r.maxD), freeR = freeReach(r.maxD, curRegion());
        /* the place opens on its widest view (body-world-regions.js): her pace and reach scale with how far out you are */
        if (mode === 'home' && !S.recallOut) { padMode(ctx, 'drive'); mode = 'drive'; }
        mistFrame(ctx, freeR, true); /* item 3: the cloud wall and its dark openings sit at the edge your own flying reaches */
        if (S.fallT >= 0 && S.fallT < K.FALL) {
            S.fallT += dt; const F = fallAt(S.fallT / K.FALL);
            S.p.copy(S.fallTo).addScaledVector(V.up, F.drop * Math.min(1.1, r.dist * 0.42) * 0.8);
            S.fade = Math.min(1, S.fade + dt * 0.5);
            S.hs = S.base * K.MIN_K * F.size / pxPerUnit(a, S.p);
            place(ctx, k, still, S.fade); trail(ctx, k, 0.3);
            return;
        }
        if (ADV()) S.advIn = (S.advIn || 0) + dt; /* her cell is far away: no flying home from here (World map takes you both back) */
        S.inT = (S.inT || 0) + dt;
        /* misty-roam: on her own (not steered, or let go a while ago) she roams the whole view freely */
        const free = roams(mode, S.idle);
        if (free) {
            /* autopilot: after a while she heads back out and on to the next place (never while you touch the world).
               world-exit (Oct 17, E-man: "even on autopilot ... she's supposed to actually try to get out of that world by going
               to the corner and then pushing against it"): she flies to the nearest corner of the world, presses against its
               edge for the same 3 seconds you would, and only then flies out, the camera with her */
            const adv = ADV();
            if (S.autoX && (mode !== 'auto' || (+r.idle || 0) < 0.4 || regionsBusy() || r.fly)) { S.autoX = null; exitReset(ctx); S.inT = 0; note('auto exit cancelled'); }
            if (!S.autoX && autoLeave(mode, S.inT, +r.idle || 0, adv ? K.ADV_STAY : K.STAY_IN) && !regionsBusy() && !r.fly) {
                /* cloud walls (item 3): she heads for the nearest stretch of the cloud wall, well clear of the dark zones */
                V.a.subVectors(S.p, S.inC);
                const ga = wallToward(Math.atan2(V.a.dot(V.up), V.a.dot(V.rt)), darkSpots(S.flew));
                S.autoX = { dir: V.rt.clone().multiplyScalar(Math.cos(ga)).addScaledVector(V.up, Math.sin(ga)).normalize(), sx: Math.cos(ga) * 0.7, ph: 'seek', t: 0, ga };
                S.rw = null; note('auto exit seek wall ' + ga.toFixed(2));
            }
            if (S.autoX) {
                if (autoExitFrame(ctx, k, still, adv)) return;
            } else {
                exitReset(ctx);
                roamFrame(ctx, k, still);
            }
            /* the camera drifts after her inside the world, gently and bounded around the world's middle. Oct 17: in every
               autopilot / tap-in roam, not only adventures ("The camera needs to follow Misty everywhere") */
            const WHx = W.LowiWorldHome;
            if (!r.fly && !regionsBusy() && !(WHx && WHx.state && WHx.state.heroAnim) && (+r.idle || 0) > K.CAM_IDLE) {
                /* heading for the cloud wall (item 3: it is out at the world's edge now) the camera goes all the way with her */
                V.b.copy(S.inC).lerp(S.p, S.autoX ? 0.9 : 0.35); r.target.lerp(V.b, 1 - Math.exp(-dt * (S.autoX ? 1.4 : 0.6)));
            }
        } else {
            S.rw = null; S.rwWait = 0;
            V.want.set(0, 0, 0);
            V.want.addScaledVector(V.rt, vx).addScaledVector(V.up, vy); thrustWant(); /* misty-turn: straight ahead into the world */
            S.v.lerp(V.b.copy(V.want).multiplyScalar(speed(k, 'in') * zs * power()), Math.min(1, dt * 4));
            S.p.addScaledVector(S.v, dt);
            /* soft edge: right after she roamed far, she is eased back into reach instead of jumping.
               dark zones: the cloud wall is the way out; where the world opens onto the dark she just flies on in, as deep as
               DEEP x the reach, and once out there (S.deep) she may turn any way she likes until she is back inside the world.
               Pressing into the cloud wall, she rides the tip of its bulging bubble skin. */
            V.a.subVectors(S.p, S.inC); const L = V.a.length(), baseR = free ? inR : freeR, magX = Math.max(mag, Math.abs(S.th || 0)); /* misty-turn: free reach; holding forward counts as pushing */
            const mAng = Math.atan2(V.a.dot(V.up), V.a.dot(V.rt)), zone = inDark(mAng, darkSpots(S.flew));
            if (zone && L >= baseR * 0.98) S.deep = true; else if (L < baseR * 0.97) S.deep = false;
            const dark = zone || !!S.deep;
            const pushOut = mode === 'drive' && magX >= EXIT.MAG && L > 1e-4 && V.want.dot(V.a) > 0;
            const reach = dark ? darkReach(baseR, true) : baseR + exitTent(S.exP || 0, baseR) * 0.92;
            if (L > reach) { const L2 = Math.min(reach * 1.12, L - (L - reach) * Math.min(1, dt * (!pushOut && L > baseR * 1.05 ? 0.9 : 3))); S.p.copy(S.inC).addScaledVector(V.a, L2 / L); }
            S.inMist = !dark; S.inDark = dark; S.mistAng = mAng;
            /* world-exit: keep pushing outward at the edge for 3 s and you both fly out */
            if (exitCheck(ctx, k, mode, vx, vy, magX, baseR)) return;
        }
        /* the camera keeps her in view once the place has settled (its own hero turn first) */
        const WH = W.LowiWorldHome, heroBusy = !!(WH && WH.state && WH.state.heroAnim);
        if (!free && !r.fly && !heroBusy && !regionsBusy()) {
            V.b.subVectors(S.p, r.target); const off = V.b.length(), dz = 0.14 * r.dist;
            if (off > dz) r.target.addScaledVector(V.b, (1 - dz / off) * (1 - Math.exp(-dt * 3.5)));
            /* Oct 17 ("the camera needs to follow Misty everywhere"): a hard leash, so steering fast on a narrow iPhone never
               pushes her off the screen edge: she stays inside ~60% of the half-view (the narrower side) */
            const hv = Math.tan(((a.camera.fov || 50) * Math.PI) / 360) * Math.min(1, a.camera.aspect || 1) * 0.6 * r.dist;
            V.b.subVectors(S.p, r.target); const off2 = V.b.length(); if (off2 > hv) r.target.addScaledVector(V.b, 1 - hv / off2);
            if (mag > 0.05 || S.th) r.idle = 0;
        }
        S.fade = Math.min(1, S.fade + dt * 2.5);
        S.hs = S.base * K.MIN_K / pxPerUnit(a, S.p); /* the size she had at the door, whatever the zoom */
        place(ctx, k, still, S.fade); turnDraw(ctx, S.fade); /* deep in the dark the veil (darkFrame) swallows her, not her own fade */
        trail(ctx, k, free ? (S.rwWait > 0 ? 0 : 0.5) : mag);
        /* misty-hunt: the hidden crumbs of this world; only YOUR steering eats them (the autopilot never farms) */
        try { if (W.LowiMistyHunt) W.LowiMistyHunt.frame(ctx, S.p, !free, inR); } catch (e) { }
        toScreen(a, S.p, S.scr); S.scrT = performance.now();
        darkFrame(ctx, freeR);
    }

    /* ---------- cloud walls & dark zones (Oct 17, item 3; dark zones replace the black holes) ----------
       A ring of soft cloud sprites in Misty's own colours (blue glass, violet rim, cyan edge) at the edge her own flying reaches, in
       the view's own plane through the world's middle: the way out. Pushing into it, the wall's thin glass bubble skin shows itself
       and bulges outward around her (the same skin as Home's edge when she leaves for the spirit world), the clouds stretch and thin
       there and Home's light (a small glowing cell) shows through behind; when the 3 seconds are up it bursts open there, the skin
       rings out and the pieces fly outward and fade while you both fly out. Where the wall has a gap the world opens onto the dark
       (darkFrame). Only drawn while she is inside a world; fades away after. */
    const MS = { g: null, sp: [], dz: [], hm: null, hr: null, f: 0, N: 26, bt: -1, ba: 0 };
    const WALL_C = ['#b9d4ff', '#cdbbff', '#bff3ff'];
    function mistTex(T, soft) {
        const c = D.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
        const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255,255,255,' + (soft ? 0.9 : 0.75) + ')'); gr.addColorStop(soft ? 0.25 : 0.45, 'rgba(255,255,255,' + (soft ? 0.35 : 0.4) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = gr; x.fillRect(0, 0, 64, 64); const t = new T.CanvasTexture(c); return t;
    }
    /* a soft ring (Home's cell wall) */
    function ringTex(T) {
        const c = D.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
        const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.05)'); gr.addColorStop(0.72, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.86, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
        x.globalCompositeOperation = 'destination-out'; x.lineWidth = 5; x.strokeStyle = 'rgba(0,0,0,0.45)';
        for (let j = 0; j < 3; j++) { x.beginPath(); x.arc(32, 32, 23, j * 2.1, j * 2.1 + 0.9); x.stroke(); } /* gaps, so its turning shows */
        const t = new T.CanvasTexture(c); return t;
    }
    function mistBuild(a) {
        if (MS.g || !a || !a.THREE || !a.scene || !D || !D.createElement) return !!MS.g;
        const T = a.THREE, tm = mistTex(T, false), tg = mistTex(T, true), tr = ringTex(T);
        MS.g = new T.Group(); MS.g.name = 'mf-mist'; MS.g.visible = false; MS.g.renderOrder = 2;
        /* lwKeep: a later world must not park the wall out of sight (body-world-regions setHubVisible parks every other scene child) */
        MS.g.userData.lwKeep = true;
        for (let j = 0; j < MS.N; j++) {
            const m = new T.SpriteMaterial({ map: tm, color: new T.Color(WALL_C[j % 3]), transparent: true, opacity: 0, depthWrite: false, fog: false });
            const s = new T.Sprite(m); s.userData.r = idHash('m' + j); MS.g.add(s); MS.sp.push(s);
        }
        /* the dark openings: where the wall has a gap, a few soft overlapping patches of darkness (normal blending: they really
           darken what is behind them), so that part of the world looks black and deep, and inviting to fly into */
        for (let j = 0; j < MIST.GAPS * 3; j++) {
            const d = new T.Sprite(new T.SpriteMaterial({ map: tg, color: new T.Color(j % 3 === 1 ? '#05020c' : '#010104'), transparent: true, opacity: 0, depthWrite: false, fog: false }));
            d.userData.r = idHash('dz' + j); MS.g.add(d); MS.dz.push(d);
        }
        /* Home, showing through the stretched wall: its light and its cell wall */
        MS.hm = new T.Sprite(new T.SpriteMaterial({ map: tg, color: new T.Color('#a8e6ff'), transparent: true, opacity: 0, depthWrite: false, fog: false, blending: T.AdditiveBlending }));
        MS.hr = new T.Sprite(new T.SpriteMaterial({ map: tr, color: new T.Color('#9fd8ff'), transparent: true, opacity: 0, depthWrite: false, fog: false, blending: T.AdditiveBlending }));
        MS.g.add(MS.hm); MS.g.add(MS.hr);
        a.scene.add(MS.g); return true;
    }
    function mistFrame(ctx, inR, on) {
        const a = ctx.a, dt = ctx.dt || 0.016;
        if (!on) { if (MS.g && MS.g.visible) { MS.f = Math.max(0, MS.f - dt * (MS.bt >= 0 ? 1.1 : 1.5)); mistDraw(a, 0, dt); if (MS.f <= 0) { MS.g.visible = false; MS.bt = -1; } } return; }
        if (!inR || !mistBuild(a)) return;
        if (MS.bt >= 0 && !MS.g.visible) MS.bt = -1;
        MS.f = Math.min(1, MS.f + dt * 0.8); MS.g.visible = true; mistDraw(a, inR, dt);
    }
    /* the wall bursts open where she pressed (exitGo) */
    function wallBurst(ang) { MS.bt = 0; MS.ba = +ang || 0; }
    function mistDraw(a, inR, dt) {
        if (inR) MS.inR = inR; inR = MS.inR || inR; if (!inR) return;
        const zones = darkSpots(S.flew), t = S.t, still = !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
        V.h.subVectors(S.p, S.inC);
        const pa = Math.atan2(V.h.dot(V.up), V.h.dot(V.rt)), p = S.st === 'inside' ? S.exP || 0 : 0;
        if (MS.bt >= 0) MS.bt += dt || 0.016;
        const be = MS.bt >= 0 ? smooth(0, 1, Math.min(1, MS.bt / 0.9)) : 0;
        for (let j = 0; j < MS.sp.length; j++) {
            const s = MS.sp[j], u = s.userData.r, th = (j + 0.5) / MS.sp.length * 2 * Math.PI + (still ? 0 : Math.sin(t * 0.05 + j) * 0.04);
            if (inDark(th, zones)) { s.visible = false; continue; } /* no cloud where the world opens onto the dark */
            /* stretch: the wall tents outward and thins where she presses; burst: it tears open there and flies apart */
            const w = p > 0 ? smooth(0, 1, 1 - Math.abs(angWrap(th - pa)) / 0.9) : 0, wb = be > 0 ? smooth(0, 1, 1 - Math.abs(angWrap(th - MS.ba)) / 1.3) : 0;
            const rr = inR * (1.1 + 0.16 * u + (still ? 0 : 0.04 * Math.sin(t * 0.21 + j * 1.7))) * (1 + 0.22 * p * w) + inR * 0.9 * be * wb;
            s.position.copy(S.inC).addScaledVector(V.rt, Math.cos(th) * rr).addScaledVector(V.up, Math.sin(th) * rr).addScaledVector(V.fw, (u - 0.5) * inR * 0.3);
            const sc = inR * (0.36 + 0.22 * u); s.scale.set(sc * 1.25 * (1 - 0.35 * p * w), sc * (1 + 0.3 * p * w), 1);
            s.material.opacity = MS.f * (0.2 + 0.12 * u) * (1 - 0.55 * p * w) * (1 - be * wb);
            s.material.rotation = u * 6.28 + (still ? 0 : t * 0.02 * (u - 0.5));
            s.visible = s.material.opacity > 0.005;
        }
        for (let j = 0; j < MS.dz.length; j++) {
            const d = MS.dz[j], z = zones[Math.floor(j / 3)], u = d.userData.r; if (!z) { d.visible = false; continue; }
            const th = z.a + (j % 3 - 1) * z.w * 0.28 + (still ? 0 : Math.sin(t * 0.07 + j) * 0.03), rr = inR * (1.12 + 0.12 * u);
            d.position.copy(S.inC).addScaledVector(V.rt, Math.cos(th) * rr).addScaledVector(V.up, Math.sin(th) * rr).addScaledVector(V.fw, -inR * (0.05 + 0.1 * u));
            const sc = inR * (0.75 + 0.35 * u) * (j % 3 === 1 ? 1.15 : 0.9); d.scale.set(sc * 1.2, sc, 1);
            d.material.rotation = u * 6.28; d.material.opacity = MS.f * (0.55 + 0.2 * u);
            d.visible = d.material.opacity > 0.005;
        }
        /* Home shows through behind the wall where she presses, brighter as it stretches; it flares as the wall bursts */
        const ha = MS.bt >= 0 ? MS.ba : pa, hp = MS.bt >= 0 ? Math.max(0, 1 - MS.bt / 1.1) : p;
        if (MS.hm) {
            MS.hm.position.copy(S.inC).addScaledVector(V.rt, Math.cos(ha) * inR * 1.55).addScaledVector(V.up, Math.sin(ha) * inR * 1.55).addScaledVector(V.fw, -inR * 0.45);
            MS.hr.position.copy(MS.hm.position);
            const g = inR * (0.35 + 0.35 * hp + 0.3 * be); MS.hm.scale.set(g, g, 1); MS.hr.scale.set(g * 0.55, g * 0.55, 1);
            MS.hm.material.opacity = MS.f * 0.75 * hp * hp; MS.hr.material.opacity = MS.f * 0.6 * hp * hp;
            MS.hr.material.rotation = still ? 0 : t * 0.3;
            MS.hm.visible = MS.hm.material.opacity > 0.005; MS.hr.visible = MS.hr.material.opacity > 0.005;
        }
        skinDraw(a, inR, dt);
    }
    /* ---------- the cloud wall's bubble skin: a thin glass skin at the wall, tented out where she presses (misty-galaxy's look) ---------- */
    const XS = { m: null, u: null, dir: null, live: false, amt: 0, op: 0, ring: 0, ringT: 9 };
    function skinBuild(a) {
        if (XS.m && XS.m.parent) return XS.m;
        const T = a && a.THREE; if (!T || !a.scene) return null;
        XS.dir = new T.Vector3(0, 1, 0);
        XS.u = { uD: { value: XS.dir }, uA: { value: 0 }, uO: { value: 0 }, uR: { value: 1 } };
        const m = new T.ShaderMaterial({
            uniforms: XS.u, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, fog: false,
            vertexShader: 'uniform vec3 uD;uniform float uA;uniform float uR;varying float vF;varying float vT;' +
                'void main(){vec3 n=normalize(position);float c=max(dot(n,uD),0.0);float pw=pow(c,60.0);vec3 p=n*uR+uD*(uA*pw);' +
                'vec4 mv=modelViewMatrix*vec4(p,1.0);vec3 nv=normalize(normalMatrix*n);vF=1.0-abs(dot(nv,normalize(-mv.xyz)));vT=pow(c,16.0);gl_Position=projectionMatrix*mv;}',
            fragmentShader: 'uniform float uO;varying float vF;varying float vT;' +
                'void main(){float a=uO*(0.06+0.6*pow(vF,3.0))*vT+uO*vT*vT*0.35;vec3 c=mix(vec3(0.45,0.85,1.0),vec3(0.9,0.75,1.0),vT);gl_FragColor=vec4(c*a,a);}'
        });
        XS.m = new T.Mesh(new T.SphereGeometry(1, 64, 40), m); XS.m.name = 'mf-wall-skin'; XS.m.frustumCulled = false; XS.m.visible = false;
        XS.m.renderOrder = 5; XS.m.userData.lwKeep = true;
        a.scene.add(XS.m); return XS.m;
    }
    /* exitFx, each frame of a push: off = her offset from the world's middle (length L), p = 0..1 of the 3 seconds */
    function skinPush(off, L, p) {
        if (!XS.dir) { XS.pend = { x: off.x / L, y: off.y / L, z: off.z / L }; } else XS.dir.copy(off).multiplyScalar(1 / L);
        XS.live = true; XS.p = p; XS.ring = 0;
    }
    /* the wall burst open (exitGo): the skin rings out instead of popping */
    function skinPop() { XS.ring = Math.max(XS.amt, 0.1); XS.ringT = 0; XS.live = false; }
    /* mistDraw, each frame */
    function skinDraw(a, inR, dt) {
        if (!inR) return;
        if (XS.live) {
            if (!skinBuild(a)) return;
            if (XS.pend) { XS.dir.set(XS.pend.x, XS.pend.y, XS.pend.z); XS.pend = null; }
            XS.amt = exitTent(XS.p, inR); XS.op = 0.25 + 0.75 * XS.p; XS.live = false; XS.was = true;
        } else if (XS.was && !XS.ring) { XS.ring = Math.max(XS.amt, 0.05) * 0.6; XS.ringT = 0; XS.was = false; } /* let go: it springs back */
        else if (XS.ring) {
            XS.ringT += dt || 0.016; XS.was = false;
            XS.amt = Math.max(0, XS.ring * Math.exp(-3 * XS.ringT) * Math.cos(11 * XS.ringT)); XS.op = 0.7 * Math.exp(-1.6 * XS.ringT);
            if (XS.ringT > 2.4) { XS.ring = 0; XS.op = 0; }
        } else XS.op = 0;
        const m = XS.m; if (!m) return;
        const on = XS.op > 0.01 && MS.f > 0.01;
        if (m.visible !== on) m.visible = on;
        if (!on) return;
        m.position.copy(S.inC); XS.u.uR.value = inR * 1.04; XS.u.uA.value = XS.amt; XS.u.uO.value = XS.op * MS.f;
    }

    /* ---------- dark zones: the deeper into the dark, the darker it gets; she glows for a moment every few seconds ----------
       One full-screen veil drawn over the whole world (and over Misty: she is lost in it too), in its own group drawn last. When
       she glows, the veil opens a little round her and a soft cyan light flares where she is. The controller and the menus are
       not in the 3D world, so they stay usable; her guide and speech bubbles dim with the dark. */
    const DV = { g: null, q: null, s: null, u: null, v: null };
    function veilBuild(a) {
        if (DV.g && DV.g.parent) return true;
        const T = a && a.THREE; if (!T || !a.scene || !D || !D.createElement) return false;
        DV.u = { uA: { value: 0 }, uG: { value: 0 }, uC: { value: new T.Vector2(0.5, 0.5) }, uR: { value: 0.12 }, uAsp: { value: 1 } };
        const m = new T.ShaderMaterial({
            uniforms: DV.u, transparent: true, depthTest: false, depthWrite: false, fog: false,
            vertexShader: 'varying vec2 vUv;void main(){vUv=position.xy+0.5;gl_Position=vec4(position.xy*2.0,0.0,1.0);}',
            fragmentShader: 'uniform float uA;uniform float uG;uniform vec2 uC;uniform float uR;uniform float uAsp;varying vec2 vUv;' +
                'void main(){vec2 d=(vUv-uC)*vec2(uAsp,1.0);float h=uG*(1.0-smoothstep(uR*0.3,uR,length(d)));' +
                'float e=0.05*smoothstep(0.4,1.0,length((vUv-0.5)*2.0));gl_FragColor=vec4(0.0,0.0,0.012,clamp(uA*(1.0-h)+e*uA,0.0,1.0));}'
        });
        DV.q = new T.Mesh(new T.PlaneGeometry(1, 1), m); DV.q.frustumCulled = false; DV.q.renderOrder = 1;
        DV.s = new T.Sprite(new T.SpriteMaterial({ map: mistTex(T, true), color: new T.Color('#bff3ff'), transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false, blending: T.AdditiveBlending }));
        DV.s.frustumCulled = false; DV.s.renderOrder = 2;
        DV.v = new T.Vector3();
        /* groupOrder 99: after everything else in the world (the cloud wall's group is 2, Misty and her face 61 / 62 at group 0) */
        DV.g = new T.Group(); DV.g.name = 'mf-dark'; DV.g.renderOrder = 99; DV.g.visible = false; DV.g.userData.lwKeep = true;
        DV.g.add(DV.q); DV.g.add(DV.s); a.scene.add(DV.g); return true;
    }
    function veilOff() { if (DV.g) DV.g.visible = false; if (H.classList.contains('mf-dark')) H.classList.remove('mf-dark'); }
    function veilDraw(a, dk, glow) {
        if (dk <= 0.003) { veilOff(); return; }
        if (!veilBuild(a)) return;
        DV.g.visible = true;
        const q = canvasRect(a), cam = a.camera;
        DV.v.copy(S.p).project(cam);
        DV.u.uA.value = dk; DV.u.uG.value = glow; DV.u.uAsp.value = q.width / Math.max(1, q.height);
        DV.u.uC.value.set((DV.v.x + 1) / 2, (DV.v.y + 1) / 2);
        const px = (S.hs || 0.3) * pxPerUnit(a, S.p); DV.u.uR.value = clamp(px * 2.2 / Math.max(1, q.height), 0.06, 0.3);
        DV.s.position.copy(S.p); const g = (S.hs || 0.3) * (2.2 + 1.6 * glow); DV.s.scale.set(g, g, 1);
        DV.s.material.opacity = 0.9 * glow; DV.s.visible = glow > 0.01;
        const on = dk > 0.5; if (H.classList.contains('mf-dark') !== on) H.classList.toggle('mf-dark', on);
        if (on && !D.getElementById('mfDarkCss') && D.head) {
            const st = D.createElement('style'); st.id = 'mfDarkCss';
            st.textContent = 'html.mf-dark #rpPal,html.mf-dark #whHint,html.mf-dark .lp-praise,html.mf-dark .rp-say{opacity:.1!important;transition:opacity .9s ease!important}';
            D.head.appendChild(st);
        }
    }
    /* each frame inside a world (reach = the edge her own flying reaches), or with reach 0 anywhere else: the light comes back */
    function darkFrame(ctx, reach) {
        const a = ctx.a, r = ctx.r, dt = ctx.dt || 0.016;
        let want = 0;
        if (reach > 0 && S.st === 'inside' && S.flew && !regionsBusy() && !(r && r.fly)) {
            V.h.subVectors(S.p, S.inC); const L = V.h.length(), zone = inDark(Math.atan2(V.h.dot(V.up), V.h.dot(V.rt)), darkSpots(S.flew));
            if (zone && L >= reach * 0.98) S.deep = true; else if (L < reach * 0.97) S.deep = false;
            if (zone || S.deep) want = darkAmt(L / reach);
        } else S.deep = false;
        const was = S.dk || 0;
        S.dk = was + (want - was) * (1 - Math.exp(-dt * (want > was ? DARK.IN : DARK.OUT)));
        if (want === 0 && S.dk < 0.003) S.dk = 0;
        S.dkT = S.dk > 0.55 ? (S.dkT || 0) + dt : 0;
        S.dkG = darkGlow(S.dkT);
        if (S.dkG > 0 && !S.dkPulse) { S.dkPulse = true; note('dark glow'); } else if (S.dkG === 0) S.dkPulse = false;
        /* back out of the dark: "Oh, where am I? ... Ah, there you are." */
        if (S.dk > 0.6 && !S.wasLost) { S.wasLost = true; note('into the dark'); }
        if (S.wasLost && S.dk < 0.05) { S.wasLost = false; note('out of the dark'); if (reach > 0 && (!S.lostSaid || performance.now() - S.lostSaid > 20000)) { S.lostSaid = performance.now(); try { if (W.LowiMistyHints) W.LowiMistyHints.lost(); } catch (e) { } } }
        if (a && a.camera) veilDraw(a, S.dk, S.dkG); else veilOff();
    }

    /* ---------- world-exit: out of a world, with her ---------- */
    function exitReset(ctx) {
        const r = ctx && ctx.r;
        if (S.exD0 && r && !r.fly && !regionsBusy()) { r.dist += (S.exD0 - r.dist) * Math.min(1, (ctx.dt || 0.016) * 5); if (Math.abs(r.dist - S.exD0) < 0.01) { r.dist = S.exD0; S.exD0 = 0; } }
        else if (S.exD0 && (!r || r.fly || regionsBusy())) S.exD0 = 0;
        S.exH = null; S.exP = 0; S.exBeat = 0;
    }
    function exitCheck(ctx, k, mode, vx, vy, mag, inR) {
        const a = ctx.a, r = ctx.r, dt = ctx.dt;
        V.a.subVectors(S.p, S.inC); const L = V.a.length(), wl = V.want.length();
        const out = L > 1e-4 && wl > 1e-4 ? V.want.dot(V.a) / (L * wl) : 0;
        const busy = regionsBusy() || !!r.fly || (S.fallT >= 0 && S.fallT < K.FALL) || ctx.reduced;
        const h = exitHold(S.exH, { dt, mode, mag, out, edge: inR > 0 ? L / inR : 0, busy, dark: !!S.inDark });
        S.exDark = !!h.dark;
        S.exH = h.s; S.exVx = vx; S.exE = inR > 0 ? L / inR : 0; S.exO = out;
        if (h.p <= 0) { const keep = S.exH; exitReset(ctx); S.exH = keep; return false; }
        exitFx(ctx, k, h.p, L);
        if (!h.fire) return false;
        /* three seconds: out you go */
        if (!exitGo(ctx, k, 'hold', L)) { S.exH = null; S.exP = 0; return false; }
        S.exPx = vx; S.exPy = vy;
        return true;
    }
    /* the feel of pushing on the edge of a world (yours or her autopilot's): p = 0..1 of the 3 seconds; V.a = her offset from the middle */
    function exitFx(ctx, k, p, L) {
        const r = ctx.r, dt = ctx.dt, h = { p };
        S.exP = p;
        /* the cloud wall's glass bubble skin bulges out around her, like Home's when she leaves for the spirit world */
        if (L > 1e-4) skinPush(V.a, L, p);
        /* the camera eases back a little as you push: the way out is opening */
        if (!S.exD0) S.exD0 = r.dist;
        if (!r.fly) r.dist += (S.exD0 * (1 + 0.14 * h.p * h.p) - r.dist) * Math.min(1, dt * 6);
        /* light gathers where she presses on the edge of the world; a ring at each second, like a heartbeat */
        const A = ctx.A, pm = A && A.pts && A.pts.material;
        if ((S.exSpark = (S.exSpark || 0) - dt) <= 0 && L > 1e-4) {
            S.exSpark = 0.12 - 0.07 * h.p;
            if (pm) { pm.color.set(h.p > 0.66 ? '#ffffff' : '#bfefff'); pm.opacity = 0.5 + 0.45 * h.p; }
            V.b.copy(S.inC).addScaledVector(V.a, (L + 0.35 * S.hs) / L); ctx.burst(V.b, 1 + Math.round(4 * h.p), (0.1 + 0.25 * h.p) * Math.max(0.4, S.hs));
        }
        const beat = Math.floor(h.p * EXIT.HOLD + 1e-6);
        if (beat > (S.exBeat || 0) && beat < EXIT.HOLD) { S.exBeat = beat; ring(ctx, k); if (S.exVib !== false) try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { } }
    }
    /* out through the edge: the World map's own reversed warp (one continuous camera move out to the whole universe), and she
       flies out with it (startOut). V.a = her offset from the world's middle, L its length. */
    function exitGo(ctx, k, why, L) {
        const Rg = R(); let ok = false;
        S.outWhy0 = why;
        try { ok = !!(Rg && Rg.travel && Rg.travel('hub', false, 0, { wide: true })); } catch (e) { ok = false; }
        if (!ok) { S.outWhy0 = ''; return false; }
        if (L > 1e-4) { V.b.copy(S.inC).addScaledVector(V.a, (L + 0.3 * S.hs) / L); ctx.burst(V.b, 14 + Math.round(10 * k), 0.5 + 0.4 * k); wallBurst(Math.atan2(V.a.dot(V.up), V.a.dot(V.rt))); skinPop(); } /* item 3: the cloud wall bursts open there, its bubble skin rings out */
        ring(ctx, k); if (why === 'hold') try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) { }
        note('exit ' + why);
        if (S.outReq) { S.outReq = false; startOut(ctx, why); outFrame(ctx, k); }
        return true;
    }
    /* autopilot's way out: seek the corner, then press on the edge for EXIT.HOLD seconds, then out. true = she left this frame */
    function autoExitFrame(ctx, k, still, adv) {
        const a = ctx.a, r = ctx.r, dt = ctx.dt, X = S.autoX, inR = freeReach(r.maxD, curRegion()), q = canvasRect(a); /* item 3: the cloud wall is at the free reach */
        X.t += dt;
        const ppu = pxPerUnit(a, S.p), v = roamPx(k, Math.min(q.width, q.height)) * 1.5 / ppu;
        V.a.subVectors(S.p, S.inC); let L = V.a.length();
        if (X.ph === 'seek') {
            V.b.copy(S.inC).addScaledVector(X.dir, inR * 1.02);
            V.want.subVectors(V.b, S.p); const d = V.want.length();
            if (d > 1e-5) V.want.multiplyScalar(Math.min(v, d * 2) / d);
            if (!still) V.want.addScaledVector(V.up, Math.sin(S.t * 1.1) * 0.12 * v);
            if (L >= inR * 0.95 || X.t > 14) { X.ph = 'press'; X.t = 0; note('auto exit press'); }
        } else V.want.copy(X.dir).multiplyScalar(v * 0.7);
        S.v.lerp(V.want, Math.min(1, dt * 2.2));
        S.p.addScaledVector(S.v, dt);
        V.a.subVectors(S.p, S.inC); L = V.a.length();
        const lim = inR + exitTent(S.exP || 0, inR) * 0.92; /* she rides the tip of the bubble skin as it bulges */
        if (L > lim) { S.p.copy(S.inC).addScaledVector(V.a, (L - (L - lim) * Math.min(1, dt * 3)) / L); V.a.subVectors(S.p, S.inC); L = V.a.length(); }
        if (X.ph !== 'press') return false;
        S.exVx = X.sx; S.exVib = false;
        const p = clamp(X.t / EXIT.HOLD, 0, 1);
        exitFx(ctx, k, p, L);
        S.exVib = true;
        if (p < 1) return false;
        const regs = a.regions || [], i = regs.findIndex(g => norm(g.id) === S.flew);
        S.autoX = null;
        S.keepAuto = true; S.wpNext = i >= 0 && regs.length ? (i + 1) % regs.length : -1;
        if (!exitGo(ctx, k, 'auto', L)) { S.keepAuto = false; S.wpNext = -1; S.inT = 0; exitReset(ctx); return false; }
        note('auto out');
        if (adv) { try { W.LowiAdventure.visited(S.flew, S.advIn || 0); } catch (e) { } } /* S.flew stays set until she lands outside */
        return true;
    }
    function startOut(ctx, why) {
        const a = ctx.a, PD = ctx.PD; basis(a);
        const reg = (a.regions || []).find(g => norm(g.id) === S.flew);
        S.outPos.copy(reg ? reg.pos : S.inC);
        if (S.exD0) S.exD0 = 0; /* the warp takes the camera from here */
        S.exH = null; S.exP = 0; S.exBeat = 0; S.autoX = null;
        const q = canvasRect(a); toScreen(a, S.p, S.scr);
        S.oFrom = { x: clamp((S.scr.x - q.left) / q.width, 0.08, 0.92), y: clamp((S.scr.y - q.top) / q.height, 0.12, 0.9) };
        S.oCur = { x: S.oFrom.x, y: S.oFrom.y };
        V.b.subVectors(S.p, a.camera.position); S.oD0 = Math.max(0.6, -V.b.dot(V.fw)); S.oDcur = S.oD0;
        S.oPh = 'A'; S.oT0 = performance.now(); S.oTB = -1; S.oGame = 0; S.oWhy = why; S.oKs = S.ks = K.MIN_K; S.oPrev = (S.oPrev || S.p.clone()).copy(S.p);
        S.st = 'out'; S.fallT = -1; S.rw = null; S.huntFly = false;
        /* no second Misty: her cell stays empty while she is out (wh-padfly needs a pad mode) */
        if (!PD.mode) { padMode(ctx, 'drive'); S.idle = K.IDLE_HOME - 6; } else if (PD.mode === 'drive') S.idle = Math.min(S.idle, K.HANDBACK);
        const w = ctx.wand; if (w) { w.frustumCulled = false; w.onBeforeRender = outDraw; }
        hold(false); classes(true, false, true); note('out ' + why);
    }
    /* drawn right before the frame is rendered, after every camera move of this frame (the warp moves the camera after Home's
       frame runs), so she sits exactly where she should on screen: never a frame behind the camera */
    function outDraw() {
        const a = w3(), w = this; if (S.st !== 'out' || !a || !a.camera || !V) return;
        basis(a);
        const cam = a.camera, q = canvasRect(a), Rg = R(), wq = Rg && Rg.state && Rg.state.warp;
        /* paced by the warp's own clock (capped frame time), so on a slow phone she and the camera stay in step */
        const clk = wq && wq.rev ? wq.clock : 1e9;
        let P, depth;
        if (S.oPh === 'A') {
            P = outAt('A', wq && wq.rev ? (clk - (wq.tu || 0)) / 640 : 1, S.oFrom); depth = S.oD0;
        } else {
            toScreen(a, S.outPos, V.dS = V.dS || {});
            const door = { x: (V.dS.x - q.left) / q.width, y: (V.dS.y - q.top) / q.height };
            if (V.dS.z > 1) { door.x = 1 - door.x; door.y = 1 - door.y; } /* behind the camera at the start of the back-out */
            if (S.oTB < 0 && wq && wq.rev) S.oTB = clk;
            P = outAt('B', S.oTB >= 0 && clk < 1e9 ? (clk - S.oTB) / 1870 : 1, S.oA, door);
            V.b.subVectors(S.outPos, cam.position); const dB = -V.b.dot(V.fw);
            depth = S.oDA + (Math.max(0.8, dB * 0.9) - S.oDA) * P.e;
        }
        V.b.copy(cam.position).addScaledVector(V.fw, -depth);
        fromScreen(a, q.left + P.x * q.width, q.top + P.y * q.height, V.b, S.p);
        if (S.oPh === 'B' && P.e > 0) {
            /* never left inside the door of the world she just left (the stick would fly her straight back in) */
            V.a.subVectors(S.p, S.outPos); const d = V.a.length(), need = K.ENTRY * 1.6;
            if (d < need && d > 1e-4) S.p.copy(S.outPos).addScaledVector(V.a, (d + (need - d) * P.e) / d);
            S.ks = S.oKs + (sizeK(approach(Math.max(d, need))) - S.oKs) * P.e;
        }
        S.oCur.x = P.x; S.oCur.y = P.y; S.oDcur = depth;
        S.hs = S.base * S.ks / pxPerUnit(a, S.p);
        w.position.copy(S.p); w.scale.set(S.hs * 260 / 310, S.hs, 1); w.updateMatrixWorld();
    }
    function dropDraw(w) { if (w && w.onBeforeRender === outDraw) { w.onBeforeRender = function () { }; w.frustumCulled = true; } }
    function outFrame(ctx, k) {
        const a = ctx.a, r = ctx.r, dt = ctx.dt, cur = curRegion(), busy = regionsBusy(), now = performance.now();
        if (ctx.wand && ctx.wand.onBeforeRender !== outDraw) { ctx.wand.frustumCulled = false; ctx.wand.onBeforeRender = outDraw; }
        S.oGame = (S.oGame || 0) + dt;
        if (S.oPh === 'A' && cur === 'hub') { S.oPh = 'B'; S.oTB = -1; S.oA = { x: S.oCur.x, y: S.oCur.y }; S.oDA = S.oDcur; S.oKs = S.ks; note('out B'); }
        if (S.oPh === 'B' && !busy && !r.fly) { outLand(ctx); return; }
        /* the warp was cancelled before the place went: she is still in it */
        if (!busy && cur !== 'hub') { dropDraw(ctx.wand); S.st = 'inside'; S.fade = 1; note('out cancelled'); return; }
        if (S.oGame > 12) { dropDraw(ctx.wand); end(ctx, 'out-timeout'); return; }
        S.v.subVectors(S.p, S.oPrev).divideScalar(Math.max(1e-3, dt)); S.oPrev.copy(S.p);
        if (S.v.lengthSq() > 64) S.v.setLength(8);
        S.fade = 1; S.ap = 0; S.near = null;
        place(ctx, k, ctx.reduced, 1); /* opacity, tilt, tint; outDraw sets where and how big */
        trail(ctx, k, 0.7);
    }
    function outLand(ctx) {
        const a = ctx.a, r = ctx.r; basis(a);
        outDraw.call(ctx.wand); dropDraw(ctx.wand);
        /* she stays out in the universe, a little way from the world she left, drifting gently away from it */
        V.a.subVectors(S.p, S.outPos); if (V.a.lengthSq() < 1e-6) V.a.copy(V.fw); V.a.normalize();
        S.v.copy(V.a).multiplyScalar(0.35);
        S.st = 'free'; S.d0 = r.dist; S.dHome = r.homeRest || r.homeDist || 3.2; S.dolly = 0; S.dollyOut = false;
        S.wp = S.wpNext >= 0 ? S.wpNext : -1; S.wpNext = -1; S.wpWait = 0; S.tourGo = null; S.joined = 0; S.flew = null; S.entered = 0;
        S.fade = 1; S.emerge = 0; S.outT = 0; S.keepAuto = false; S.wob = 0; S.wobT = 9;
        const cs = toScreen(a, V.c, {}); S.cell0.x = cs.x; S.cell0.y = cs.y;
        hold(true); classes(true, false, false); note('out landed ' + S.oWhy);
    }
    W.addEventListener('lowi:world-warp', e => {
        const d = e && e.detail; if (!d) return;
        /* world-exit: any trip from the world she is in back out to the universe takes her along */
        if (d.phase === 'start' && d.id === 'hub' && S.st === 'inside' && d.from && norm(d.from) === S.flew) S.outReq = true;
    });
    W.addEventListener('lowi:world-warp', e => { const d = e && e.detail; if (d && d.phase === 'arrive' && S.st === 'warp' && norm(d.id) === S.flew) S.entered = 1; });
    W.LowiMistyFlight = {
        /* where she is on screen while inside a world (the explainer cell flies next to her, region-pals.js) */
        screen: () => (S.st === 'inside' && S.scrT && performance.now() - S.scrT < 400 ? { x: S.scr.x, y: S.scr.y } : null),
        /* misty-turn: where she is on screen right now and how tall (px), out flying or inside a world; null while she is home */
        touchSpot: () => {
            const a = w3(); if (!a || !a.camera || !V || !S.p || !(S.st === 'inside' || S.st === 'free') || !(S.hs > 0)) return null;
            if (S.st === 'inside' && S.fallT >= 0 && S.fallT < K.FALL) return null;
            const q = toScreen(a, S.p, {}); if (!(q.z < 1)) return null;
            return { x: q.x, y: q.y, h: S.hs * pxPerUnit(a, S.p) };
        },
        recall: () => { if (S.st === 'idle') { try { if (W.LowiPad) W.LowiPad.mode(''); } catch (e) { } } else S.recallReq = true; },
        wants, frame, core,
        state: () => ({ st: S.st, flew: S.flew, joined: !!S.joined, roam: !!S.rw, inT: +(S.inT || 0).toFixed(1), wpNext: S.wpNext, ap: +S.ap.toFixed(3), near: S.near ? S.near.id : null, nearD: S.near ? +S.near.d.toFixed(2) : null, px: Math.round(S.base), ks: +S.ks.toFixed(3),
            hs: +S.hs.toFixed(3), exP: +(S.exP || 0).toFixed(3), exE: +(S.exE || 0).toFixed(2), exO: +(S.exO || 0).toFixed(2), mist: !!S.inMist, dk: +(S.dk || 0).toFixed(2), deep: !!S.deep, glow: +(S.dkG || 0).toFixed(2), exDark: !!S.exDark, skin: XS.m && XS.m.visible ? +XS.u.uA.value.toFixed(2) : 0, mistAng: S.mistAng == null ? null : +S.mistAng.toFixed(2), gaps: S.flew ? exitGaps(S.flew).map(g => +g.a.toFixed(2)) : null, dark: !!S.inDark, transit: H.classList.contains('mf-transit'), autoX: S.autoX ? S.autoX.ph : null, orb: S.orb ? { q: +S.orb.q.toFixed(2), tries: S.orb.tries, fling: S.orb.fling > 0 } : null, outPh: S.st === 'out' ? S.oPh : null, push: S.mem && w3() && w3().memU && w3().memU.uPushA ? +w3().memU.uPushA.value.toFixed(3) : 0, p: S.p ? [+S.p.x.toFixed(2), +S.p.y.toFixed(2), +S.p.z.toFixed(2)] : null, log: S.log.slice(-12) })
    };
})();
