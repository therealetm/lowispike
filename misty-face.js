/* LOWiSPIKE misty-face (Oct 17, 2026, E-man: "Misty is basically just staring you down" ... she should look where she flies,
   so sometimes you see her back or her top, not eyes locked on you all the time).
   Out in the world Misty is a camera-facing sprite (misty-flight.js, the "wand"), so her face used to stare at you whatever she
   did. Now she is treated as a round, cloudy body that turns in 3D:
   - her art is split in two: the body (the same living cloud, leaves, glow) and her face (eyes, blush, mouth, as the DOM Misty
     shows them right now). The body stays the sprite; the face is a small plane laid on the surface of her round body.
   - she has a look direction L in the world. The face sits where L meets her body as you see it, tilted to the surface there, so
     it turns to a 3/4 profile at her edge, slides to her top when she climbs, and fades out behind her when she faces away:
     then you see her back. L turns smoothly (eased, with a top turning speed, never a snap; a full turn-around swings sideways).
   - where she looks: flying = along her path (autopilot tours, circling a world before she goes in, roaming inside a world, the
     flight home); your steering = her heading (the same way the facing dots point; backing up she keeps facing forward); idle =
     she looks around: slow glances left / right / up / down around where she was heading, and only now and then a short look
     at you. Reduced motion: no looking around.
   - one extra draw (a 2-triangle plane), two small textures made only when her art changes, no own animation loop: misty-flight
     calls draw() from its place(), the plane positions itself in onBeforeRender from the wand as it is really drawn.
   If anything is missing (no art yet, old browser) she simply stays the old front-facing sprite.
   Pure helpers at the top are tested in tests/misty-face.test.cjs. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : null, D = W && W.document;
    const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
    const K = {
        TURN: 4.2,        /* how quickly she turns to where she wants to look (1/s, eased) ... */
        TURN_MAX: 4.5,    /* ... never faster than this (rad/s): a whip-round would read as a glitch */
        LOOK: 2.0,        /* idle glances are slower ... */
        LOOK_MAX: 2.2,
        MOVE_ON: 0.45,    /* she is "flying" above this speed, in body heights per second ... */
        MOVE_OFF: 0.25,   /* ... and "still" again below this (no flicker at the threshold) */
        AUTO_MOVE: 0.4,   /* on autopilot a slow drift already counts as flying (thresholds x this: 0.18 on, 0.1 off) */
        VEL: 5,           /* smoothing of her measured velocity (1/s) */
        HEAD_MS: 1500,    /* after you turned / held her, she keeps facing her heading this long */
        FACE_K: 0.66,     /* at her edge the middle of her face sits this far out (of her radius): eyes stay on her body */
        SOFT: 0.35,       /* her face is round: the face plane turns this much less than her look (no edge-on line) */
        CROP: { x: -34, y: -16, w: 68, h: 38 }, /* the face's box in the art (units round the face's own origin) */
        FACE_PX: 3,       /* face texture resolution (px per art unit): crisp on a retina phone, still tiny */
        STALE_MS: 250,    /* not placed for this long = she is not drawn by misty-flight: hide the face */
        /* Oct 17 (E-man, on autopilot: "she shouldn't be showing us her back all the time. That becomes boring ... sometimes ... a
           little look"): flying away from you on her own for a while, she glances back over her shoulder at you, then flies on */
        PEEK_AFTER: [3.5, 7],   /* seconds of flying away from you before she looks back ... */
        PEEK_GAP: [6, 11],      /* ... and between looks after that */
        PEEK_HOLD: [1.1, 1.7],  /* how long the look back lasts (s) */
        PEEK_MIX: 0.7,          /* the look: this far from her path toward you (1 = straight at you) */
        PEEK_AWAY: -0.2         /* her path counts as "away from you" below this (dot of path and toward-you) */
        /* Oct 18 evening (E-man: "That doesn't make sense that she changes when she's out of the bubble. All I wanted is to keep her
           eyes basically the same"): no extra layer under her body any more; out of Home she is her own glass self, only her face
           (eyes, cheeks, mouth) is drawn solid on top whenever any of it points at you. */
    };
    /* ---------- tiny vector helpers (plain arrays, so node can test them) ---------- */
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const len = a => Math.hypot(a[0], a[1], a[2]);
    const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
    const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const unit = a => { const L = len(a); return L > 1e-9 ? scale(a, 1 / L) : null; };
    /* Rodrigues: v turned by ang round the unit axis ax */
    function rot(v, ax, ang) {
        const c = Math.cos(ang), s = Math.sin(ang), k = dot(ax, v), x = cross(ax, v);
        return [v[0] * c + x[0] * s + ax[0] * k * (1 - c), v[1] * c + x[1] * s + ax[1] * k * (1 - c), v[2] * c + x[2] * s + ax[2] * k * (1 - c)];
    }
    function smooth(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
    /* an axis at right angles to v, preferring the world's up (so a turn-around swings her sideways, like a fish) */
    function sideAxis(v, up) {
        up = up || [0, 1, 0];
        let a = unit(add(up, scale(v, -dot(up, v))));
        if (!a) a = unit(add([1, 0, 0], scale(v, -v[0])));
        return a || [0, 0, 1];
    }
    /* one frame of turning: L eases toward D (rate 1/s), at most maxW rad/s. Unit vectors in, unit vector out. */
    function turnToward(L, D, dt, rate, maxW, up) {
        L = unit(L || [0, 0, 1]) || [0, 0, 1]; D = unit(D || L) || L;
        dt = clamp(+dt || 0, 0, 0.1);
        const ang = Math.acos(clamp(dot(L, D), -1, 1));
        if (ang < 1e-4) return D.slice();
        let ax = cross(L, D);
        ax = len(ax) > 1e-6 ? unit(ax) : sideAxis(L, up);
        const step = Math.min(ang, ang * (1 - Math.exp(-(rate || K.TURN) * dt)), (maxW || K.TURN_MAX) * dt);
        return unit(rot(L, ax, step)) || L;
    }
    /* how much of her face you see: all of it facing you, still most of it as a profile at her edge, nothing once she has turned
       past her edge (then you see her back; the face never shows through her from behind) */
    const faceVis = d => smooth(-0.3, 0.1, d);
    /* where her face is for a look direction L, seen by a camera with right cr, up cu and toward-the-viewer cf (unit vectors),
       on a sprite rolled by roll (radians, counter-clockwise, as SpriteMaterial.rotation). Returns the face plane's axes x, y, z,
       its offset on screen in her own (rolled) right / up as fractions of her radius (sx, sy), and how visible it is.
       The face turns with her body: the turn that brings "facing you" to L also turns the face's up (sideways = a yaw, climbing =
       a pitch, so you see her top). Her face is round with her body, not a flat card: a flat plane would go edge-on (a line) at her
       edge, so the plane turns only part of the way (K.SOFT short of L, toward you): at her edge you see a 3/4 profile. */
    function faceFrame(L, cr, cu, cf, roll) {
        const c = Math.cos(+roll || 0), s = Math.sin(+roll || 0);
        const rp = add(scale(cr, c), scale(cu, s)), up = add(scale(cr, -s), scale(cu, c));
        L = unit(L) || cf.slice();
        const d = clamp(dot(cf, L), -1, 1);
        const P = unit(add(scale(L, 1 - K.SOFT), scale(cf, K.SOFT))) || L;
        const dp = clamp(dot(cf, P), -1, 1);
        let ax = cross(cf, P), x = rp, y = up;
        if (len(ax) > 1e-6) { ax = unit(ax); const ang = Math.acos(dp); x = rot(rp, ax, ang); y = rot(up, ax, ang); }
        else if (dp < 0) { x = scale(rp, -1); }
        return { x, y, z: P, sx: dot(L, rp), sy: dot(L, up), vis: faceVis(d), d };
    }
    /* what she wants to look at this frame (unit vector or null = keep looking where she looks) */
    function pickDir(o) {
        o = o || {};
        if (o.drive && o.hd && (o.th || o.turning || o.recentHd)) return { d: o.hd, why: 'heading' };
        if (o.moving && o.vdir) return { d: o.vdir, why: 'move' };
        if (o.idleDir) return { d: o.idleDir, why: 'look' };
        return { d: o.base || null, why: 'hold' };
    }
    /* her next idle glance round base (unit): mostly left / right / up / down of it, sometimes straight back to it, now and then a
       short look at you (cf). rnd() = 0..1. Returns { dir, hold (s), at ('base' | 'side' | 'you') } */
    function glance(base, cf, rnd, up) {
        rnd = rnd || Math.random; up = up || [0, 1, 0];
        base = unit(base || cf) || cf;
        const r = rnd();
        if (r < 0.16) {
            const side = sideAxis(cf, up), j = (rnd() - 0.5) * 0.4;
            return { dir: unit(rot(cf, side, j)) || cf, hold: 1.1 + rnd() * 1.0, at: 'you' };
        }
        if (r < 0.38) return { dir: base.slice(), hold: 2.2 + rnd() * 2.2, at: 'base' };
        const yaw = (rnd() < 0.5 ? -1 : 1) * (0.35 + rnd() * 0.85), pitch = (rnd() - 0.45) * 0.7;
        let v = rot(base, unit(up), yaw);
        const right = unit(cross(v, up));
        if (right) v = rot(v, right, pitch);
        return { dir: unit(v) || base, hold: 2.0 + rnd() * 2.8, at: 'side' };
    }
    /* the look back over her shoulder: her path v turned PEEK_MIX of the way toward you (cf). Unit vectors in and out. */
    function peekDir(v, cf, mix) {
        cf = unit(cf) || [0, 0, 1]; v = unit(v || cf) || cf;
        const m = clamp(mix == null ? K.PEEK_MIX : +mix, 0, 1);
        return unit(add(scale(v, 1 - m), scale(cf, m))) || cf.slice();
    }
    /* the clock of those looks back. P = { away, wait, left } (kept between frames); away = her path leads away from you this
       frame. Time flying away adds up (and drains slowly when she flies across or toward you); once it reaches wait she looks back
       for PEEK_HOLD seconds, then the clock starts over with a PEEK_GAP wait. Returns true while she is looking back. */
    function peekStep(P, away, dt, rnd) {
        rnd = rnd || Math.random; dt = clamp(+dt || 0, 0, 0.1);
        const pick = R => R[0] + rnd() * (R[1] - R[0]);
        if (!(P.wait > 0)) P.wait = pick(K.PEEK_AFTER);
        P.away = +P.away || 0; P.left = +P.left || 0;
        if (P.left > 0) { P.left -= dt; if (P.left > 0) return true; P.left = 0; P.away = 0; P.wait = pick(K.PEEK_GAP); return false; }
        P.away = away ? P.away + dt : Math.max(0, P.away - dt * 0.5);
        if (P.away >= P.wait) { P.left = pick(K.PEEK_HOLD); return true; }
        return false;
    }
    /* moving or not, with a gap between the two thresholds; speed in world units/s, hs = her height in world units */
    /* Oct 17 (E-man: "busy like a fish in an aquarium the whole time"): on autopilot she drifts slowly (a sleepy, low-energy
       adventure is slower still), and that slow drift is still her flying somewhere: she looks along it instead of standing
       still and glancing at you. The speed that counts as flying is lower on autopilot (this scales her size in movingNow). */
    function slowFlight(mode) { return mode === 'auto' ? K.AUTO_MOVE : 1; }
    function movingNow(was, speed, hs) {
        const h = Math.max(1e-3, +hs || 1), q = (+speed || 0) / h;
        return was ? q > K.MOVE_OFF : q > K.MOVE_ON;
    }
    /* the body / face split of the art string (as world-home's mistySvg() makes it): the face group out of the body, the face on its
       own in a small cropped svg. Plain string work (balanced <g> scan), no DOM. null if there is no face group. */
    function splitArt(svg) {
        if (typeof svg !== 'string') return null;
        const m = /<g\b[^>]*\bclass="[^"]*\blh-face\b[^"]*"[^>]*>/.exec(svg); if (!m) return null;
        const start = m.index, open = m[0];
        let depth = 1, i = start + open.length;
        const re = /<g\b[^>]*?(\/?)>|<\/g\s*>/g; re.lastIndex = i;
        let t, end = -1;
        while ((t = re.exec(svg))) {
            if (t[0][1] === '/') { if (--depth === 0) { end = t.index + t[0].length; break; } }
            else if (t[1] !== '/') depth++;
        }
        if (end < 0) return null;
        const inner = svg.slice(start + open.length, end - '</g>'.length).replace(/<\/g\s*$/, '');
        const tm = /translate\(\s*([-\d.]+)[\s,]+([-\d.]+)\s*\)/.exec(open);
        const fx = tm ? +tm[1] : 130, fy = tm ? +tm[2] : 155;
        const bm = /<ellipse\b[^>]*\bclass="[^"]*\blh-body\b[^"]*"[^>]*>/.exec(svg), rm = bm && /\brx="([\d.]+)"/.exec(bm[0]), rym = bm && /\bry="([\d.]+)"/.exec(bm[0]);
        const rx = rm ? +rm[1] : 40, ry = rym ? +rym[1] : rx + 9;
        const C = K.CROP, px = K.FACE_PX;
        const face = '<svg xmlns="http://www.w3.org/2000/svg" width="' + C.w * px + '" height="' + C.h * px + '" viewBox="' + C.x + ' ' + C.y + ' ' + C.w + ' ' + C.h + '">' + inner + '</svg>';
        /* her body exactly as her own art draws it, minus the face: nothing added under or over it */
        const body = svg.slice(0, start) + svg.slice(end);
        return { body, face, fx, fy, rx, ry, back: false };
    }
    /* how her face is drawn this frame, from d (her look toward you) and presence (her body's own fade in / out: 1 once she is
       there; NOT her body's opacity, which her energy lowers: a tired Misty's glass body is ~70% opaque, her face stays solid). op: solid (= presence) whenever any of her face points at you, 0 when you only see her back; never a ghost in between.
       k: past her edge the face shrinks into the rim (instead of fading), so turning away still has no pop. */
    function faceLook(d, presence) {
        const v = faceVis(d), p = clamp(presence == null ? 1 : +presence || 0, 0, 1);
        return v > 0 ? { op: p, k: v } : { op: 0, k: 0 };
    }
    const core = { K, dot, cross, unit, rot, turnToward, faceFrame, faceVis, faceLook, pickDir, glance, movingNow, slowFlight, splitArt, sideAxis, peekDir, peekStep };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!D || !W || W.LowiMistyFace) return;

    /* ---------- live ---------- */
    const now = () => (W.performance ? performance.now() : Date.now());
    const S = { L: null, vel: [0, 0, 0], pp: null, moving: false, hdT: -1e9, base: null, look: null, lookT: 0, at: 'base',
        art: null, src: null, pending: false, backA: null, fd: null, body: null, faceTex: null, mesh: null, wand: null, a: null, drawnT: -1e9, lastT: 0, why: 'hold', pk: { away: 0, wait: 0, left: 0 } };
    function srcMap() { const WH = W.LowiWorldHome, m = WH && WH.state && WH.state.misty; return m && m.material ? m.material.map : null; }
    /* her art changed (mood, stage, look): split it and make the two textures, once */
    function ensureArt(THREE) {
        const src = srcMap(); if (!src || src === S.src || S.pending) return;
        const WH = W.LowiWorldHome; let art = null;
        try { art = WH && WH.mistyFaceArt ? WH.mistyFaceArt() : null; } catch (e) { art = null; }
        S.src = src; if (!art || !art.svg) return;
        const sp = splitArt(art.svg); if (!sp) return;
        S.pending = true; let left = 2; const out = {};
        const done = () => {
            if (--left) return; S.pending = false;
            if (!out.body || !out.face) return;
            const ob = S.body, of = S.faceTex;
            S.body = out.body; S.faceTex = out.face; S.art = sp;
            if (S.mesh) { S.mesh.material.map = S.faceTex; S.mesh.material.needsUpdate = true; }
            if (S.wand && S.wand.material.map === ob) { S.wand.material.map = S.body; S.wand.material.needsUpdate = true; }
            setTimeout(() => { try { if (ob) ob.dispose(); if (of) of.dispose(); } catch (e) { } }, 0);
        };
        const load = (txt, w, h, paint, key) => {
            const img = new Image();
            img.onload = () => { try { const cv = D.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); paint(x, img); out[key] = new THREE.CanvasTexture(cv); } catch (e) { } done(); };
            img.onerror = () => done();
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt);
        };
        /* the body exactly as world-home paints the whole Misty (her aura glow behind, then the art), minus the face */
        load(sp.body, 260, 310, (x, img) => {
            if (art.aura) { const g = x.createRadialGradient(130, 150, 10, 130, 150, 128); g.addColorStop(0, art.aura + '55'); g.addColorStop(1, art.aura + '00'); x.fillStyle = g; x.fillRect(0, 0, 260, 310); }
            x.drawImage(img, 0, 0, 260, 310);
            /* how solid her body is right behind her face (read once per art change, never per frame) */
            try { S.backA = +(x.getImageData(Math.round(sp.fx), Math.round(sp.fy), 1, 1).data[3] / 255).toFixed(3); } catch (e) { S.backA = null; }
        }, 'body');
        const C = K.CROP;
        load(sp.face, C.w * K.FACE_PX, C.h * K.FACE_PX, (x, img) => x.drawImage(img, 0, 0, C.w * K.FACE_PX, C.h * K.FACE_PX), 'face');
    }
    const T = {};
    function buildMesh(a) {
        const THREE = a.THREE;
        const mat = new THREE.MeshBasicMaterial({ map: S.faceTex, transparent: true, depthWrite: false, depthTest: false, fog: false, opacity: 0, side: THREE.DoubleSide });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        m.name = 'mf-misty-face'; m.userData.lwKeep = true; m.renderOrder = 62; m.frustumCulled = false;
        m.matrixAutoUpdate = false; m.matrixWorldAutoUpdate = false; m.visible = false;
        T.p = new THREE.Vector3(); T.cr = new THREE.Vector3(); T.cu = new THREE.Vector3(); T.cf = new THREE.Vector3();
        m.onBeforeRender = faceRender;
        a.scene.add(m);
        return m;
    }
    /* placed at the very moment it is drawn, from the wand as three.js draws it (position, size, roll) and the camera in use */
    function faceRender(renderer, scene, camera) {
        const m = S.mesh, w = S.wand, art = S.art;
        if (!m || !w || !art || !camera || now() - S.drawnT > K.STALE_MS || !w.visible || w.material.map !== S.body || !S.L) {
            if (m) { m.material.opacity = 0; m.visible = false; } return;
        }
        const e = camera.matrixWorld.elements, n = v => unit(v) || v;
        let cr = n([e[0], e[1], e[2]]), cu = n([e[4], e[5], e[6]]), cf = n([e[8], e[9], e[10]]);
        T.p.setFromMatrixPosition(w.matrixWorld);
        /* "toward you" = along the ray from her to the camera (she may be off the middle of the screen); screen right / up stay
           square to it, so the sprite's own roll and the face offsets still line up with the body as drawn */
        if (!camera.isOrthographicCamera) {
            const ray = unit([e[12] - T.p.x, e[13] - T.p.y, e[14] - T.p.z]), r2 = ray && unit(cross(cu, ray));
            if (ray && r2) { cf = ray; cr = r2; cu = cross(ray, r2); }
        }
        const F = faceFrame(S.L, cr, cu, cf, w.material.rotation || 0);
        /* solid whenever any of her face points at you (only her own fade in / out lowers it), gone when you see her back */
        const pr = w.userData && w.userData.mfPresence, look = faceLook(F.d, pr == null ? (w.material.opacity || 0) : pr), op = look.op < 0.01 ? 0 : look.op, k = look.k;
        S.fd = F.d; /* her look toward you as really drawn (state().faceD; checks compare the face's opacity with this) */
        if (m.material.opacity !== op) m.material.opacity = op;
        if (w.material.color && m.material.color && !m.material.color.equals(w.material.color)) m.material.color.copy(w.material.color);
        if (w.layers && m.layers.mask !== w.layers.mask) m.layers.mask = w.layers.mask;
        if (op === 0) return;
        const u = Math.abs(w.scale.y) / 310, C = K.CROP;
        /* rolled screen right / up of the sprite */
        const c = Math.cos(w.material.rotation || 0), s = Math.sin(w.material.rotation || 0);
        const rp = add(scale(cr, c), scale(cu, s)), up = add(scale(cr, -s), scale(cu, c));
        const cx = (w.center ? 0.5 - w.center.x : 0) * 260 * u, cy = (w.center ? 0.5 - w.center.y : 0) * 310 * u;
        /* the middle of her round body in the art (130, fy), as the sprite draws it */
        let p = [T.p.x, T.p.y, T.p.z];
        p = add(p, add(scale(rp, (art.fx - 130) * u + cx), scale(up, -(art.fy - 155) * u + cy)));
        /* out to where her look meets her body, as you see it */
        p = add(p, add(scale(rp, F.sx * art.rx * u * K.FACE_K), scale(up, F.sy * art.ry * u * K.FACE_K)));
        /* the face box's own middle is a little below the face origin (art y down) */
        const mx = C.x + C.w / 2, my = C.y + C.h / 2;
        p = add(p, add(scale(F.x, mx * u * k), scale(F.y, -my * u * k)));
        const sw = C.w * u * k, sh = C.h * u * k, me = m.matrixWorld.elements;
        me[0] = F.x[0] * sw; me[1] = F.x[1] * sw; me[2] = F.x[2] * sw; me[3] = 0;
        me[4] = F.y[0] * sh; me[5] = F.y[1] * sh; me[6] = F.y[2] * sh; me[7] = 0;
        me[8] = F.z[0]; me[9] = F.z[1]; me[10] = F.z[2]; me[11] = 0;
        me[12] = p[0]; me[13] = p[1]; me[14] = p[2]; me[15] = 1;
    }
    function camBasis(a) {
        const cam = a && a.camera; if (!cam || !cam.matrixWorld) return null;
        const e = cam.matrixWorld.elements;
        return { cr: unit([e[0], e[1], e[2]]), cu: unit([e[4], e[5], e[6]]), cf: unit([e[8], e[9], e[10]]) };
    }
    /* misty-flight.js, from place(), every frame she is drawn out in the world */
    function draw(i) {
        const a = i && i.a, w = i && i.wand; if (!a || !a.THREE || !a.scene || !w || !w.material) return null;
        const t = now(); if (t - S.lastT < 2) return S.why; /* placed twice in one frame: count the time once */
        const dt = clamp(S.lastT ? (t - S.lastT) / 1000 : 0.016, 0, 0.1); S.lastT = t;
        S.a = a; S.wand = w;
        ensureArt(a.THREE);
        const cb = camBasis(a); if (!cb || !cb.cf) return null;
        const p = i.p ? [i.p.x, i.p.y, i.p.z] : [w.position.x, w.position.y, w.position.z], hs = Math.max(1e-3, +i.hs || 1);
        /* her velocity, measured from where she really is (every state alike: tours, orbit, pull, warp, roam) */
        if (S.pp && t - S.drawnT < 300) {
            const dv = add(p, scale(S.pp, -1)), jump = len(dv) > Math.max(1.5, hs * 4);
            if (!jump && dt > 0) { const v = scale(dv, 1 / dt), q = 1 - Math.exp(-K.VEL * dt); S.vel = add(S.vel, scale(add(v, scale(S.vel, -1)), q)); }
        } else S.vel = [0, 0, 0];
        S.pp = p;
        /* Oct 17 (E-man, out of a world on autopilot: "for like three seconds she just stares at us"): while the camera carries her
           (the flight out of a world) her measured motion is the camera's, straight at you; misty-flight hands over her own heading
           (path) and that is the way she flies and looks. Her speed carries on along it, so nothing resets to you when she lands. */
        const path = i.path && isFinite(i.path.x) ? unit([i.path.x, i.path.y, i.path.z]) : null;
        if (path) S.vel = scale(path, hs * K.MOVE_ON * 1.6);
        const sp = len(S.vel); S.moving = movingNow(S.moving, sp, hs * slowFlight(i.mode));
        const vdir = S.moving ? unit(S.vel) : null;
        const drive = i.mode === 'drive', MT = W.LowiMistyTurn;
        let th = 0, turning = false; try { th = MT && MT.thrust ? MT.thrust() : 0; turning = !!(MT && MT.turning && MT.turning()); } catch (e) { }
        const hd = drive && i.hd ? unit([i.hd.x, i.hd.y, i.hd.z]) : null;
        if (drive && hd && (th || turning)) S.hdT = t;
        const recentHd = t - S.hdT < K.HEAD_MS;
        if (!S.L) S.L = cb.cf.slice(); /* she comes out facing you, then turns */
        /* what she was last heading for: the idle glances go round it */
        if (drive && hd && (th || turning || recentHd)) S.base = hd; else if (vdir) S.base = vdir;
        if (!S.base) S.base = S.L.slice();
        let idleDir = null;
        if (!S.moving && !(drive && hd && (th || turning || recentHd))) {
            if (i.reduced) idleDir = S.base;
            else {
                S.lookT -= dt;
                if (!S.look || S.lookT <= 0) { const g = glance(S.base, cb.cf, Math.random, [0, 1, 0]); S.look = g.dir; S.lookT = g.hold; S.at = g.at; }
                idleDir = S.look;
            }
        } else { S.look = null; S.lookT = 0; }
        let pk = pickDir({ drive, hd, th, turning, recentHd, moving: S.moving, vdir, idleDir, base: S.base });
        /* flying on her own (never while you steer), away from you for a while: a short look back over her shoulder at you. Her
           path is in the world, so whether it leads away from you depends on where you turned the world to. */
        if (pk.why === 'move' && !drive && !i.reduced && vdir) { if (peekStep(S.pk, dot(vdir, cb.cf) < K.PEEK_AWAY, dt)) pk = { d: peekDir(vdir, cb.cf), why: 'peek' }; }
        else if (S.pk.left > 0) { S.pk.left = 0; S.pk.away = 0; S.pk.wait = 0; }
        S.why = pk.why;
        let want = pk.d || S.L;
        /* flying, she is alive: a slow little sway of the look, never in reduced motion */
        if (pk.why === 'move' && !i.reduced) { const ax = sideAxis(want, [0, 1, 0]); want = rot(want, [0, 1, 0], Math.sin(t / 1000 * 0.7) * 0.12); want = rot(want, ax, Math.sin(t / 1000 * 0.53) * 0.06); }
        const idle = pk.why === 'look' || pk.why === 'hold';
        S.L = turnToward(S.L, want, dt, idle ? K.LOOK : K.TURN, idle ? K.LOOK_MAX : K.TURN_MAX, [0, 1, 0]);
        S.drawnT = t;
        if (!S.body || !S.faceTex || !S.art) return S.why; /* art not split yet: the old front-facing Misty */
        if (w.material.map !== S.body) { w.material.map = S.body; w.material.needsUpdate = true; }
        w.userData.mfFaceT = t; /* world-home: do not put the whole (face-baked) art back on her while this is fresh */
        if (!S.mesh || !S.mesh.parent) S.mesh = buildMesh(a);
        if (S.mesh.material.map !== S.faceTex) { S.mesh.material.map = S.faceTex; S.mesh.material.needsUpdate = true; }
        S.mesh.visible = true;
        return S.why;
    }
    W.LowiMistyFace = {
        core, draw,
        state: () => {
            const cb = camBasis(S.a), d = S.L && cb && cb.cf ? dot(S.L, cb.cf) : null;
            return { on: !!(S.mesh && S.mesh.visible && now() - S.drawnT < K.STALE_MS), why: S.why, moving: S.moving, glance: S.at,
                towardYou: d == null ? null : +d.toFixed(2), faceSeen: d == null ? null : +faceVis(d).toFixed(2), art: !!S.art,
                faceOp: S.mesh ? +S.mesh.material.opacity.toFixed(3) : null, bodyOp: S.wand ? +S.wand.material.opacity.toFixed(3) : null,
                back: !!(S.art && S.art.back), backA: S.backA, presence: S.wand && S.wand.userData.mfPresence != null ? +S.wand.userData.mfPresence.toFixed(3) : null, faceD: S.fd == null ? null : +S.fd.toFixed(3) };
        }
    };
})();
