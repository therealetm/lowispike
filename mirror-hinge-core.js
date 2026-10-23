/* LOWiSPIKE Move: Mirror mode, deadlift / hip hinge (Oct 23, 2026). Pure logic, no DOM, runs in the browser and in node tests.
   Emmanuel: "Was ist eig aus dead lifting mirror geworden?" The other Mirror routines are front-view arm moves; a hinge has to be
   seen from the side. So this is its own flow with the same phases as mirror-move-core.js: get in place (framing hints) -> hold
   still (calibrate your own leg, torso and arm lengths) -> 3-2-1 -> follow (rep counting, form cues) -> rest between sets -> done.
   - The outline is a side-view human that hinges at the hips: hips back, long flat back, hands hanging close to the legs, tall at
     the top. It leads by at most one rep and waits for you at the top.
   - Reps come from YOUR hip hinge (torso lean measured shoulder -> hip), not from the clock: down past 40 degrees, back up to
     standing tall. A half rep does not count. Bodyweight, dumbbells or a bar: it watches form, not load.
   - Form cues (one at a time, short): back rounding (head and shoulders curl down off the torso line), knees too far forward
     (knee past the toes or a squat instead of a hinge), hands drifting away from the legs, not tall at the top, leaning back.
   - Camera estimate only: it cannot see the spine itself and never says a rep was safe. The UI says so.
   Landmarks are MediaPipe pose landmarks already mapped into the mirrored view, in px (same as mirror-move-core.js). */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiHingeCore = api;
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';
    const D2R = Math.PI / 180, R2D = 180 / Math.PI;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const sub = (p, q) => [p[0] - q[0], p[1] - q[1]], len = p => Math.hypot(p[0], p[1]);
    const ease = k => k * k * (3 - 2 * k);
    const L3 = (en, de, es) => ({ en, de, es });
    const txt = (o, lang) => o ? (o[lang] || o.en) : '';

    const ID = 'hinge';
    /* 3 sets of 8, 40 s rest. Guide tempo per rep: stand tall, 2 s down, short pause, up, (4.5 s) */
    const PLAN = { sets: 3, reps: 8, rest: 40, tempo: { top: 0.8, down: 2.0, bottom: 0.3, up: 1.4 } };
    const PER = PLAN.tempo.top + PLAN.tempo.down + PLAN.tempo.bottom + PLAN.tempo.up;
    /* rep thresholds (torso lean from vertical, degrees) */
    const T = { down: 32, deep: 40, top: 14, tallHip: 160, minRep: 0.7, back: 40, knee: 0.03, kneeAng: 118, hands: 0.32, leanBack: -12, hold: 0.25 };

    const ROUTINE = { id: ID, icon: 'hinge',
        n: L3('Deadlift (hip hinge)', 'Kreuzheben (Hüftbeuge)', 'Peso muerto (bisagra de cadera)'),
        short: L3('Deadlift', 'Kreuzheben', 'Peso muerto'),
        sub: L3('Standing, side-on, 3 × 8 reps. Bodyweight, dumbbells or a bar', 'Im Stehen, seitlich, 3 × 8 Wdh. Ohne Gewicht, Kurzhanteln oder Stange', 'De pie, de lado, 3 × 8 rep. Sin peso, mancuernas o barra'),
        place: [L3('Put the phone or iPad upright on the floor or a low chair, at about knee to hip height.', 'Stell Handy oder iPad hochkant auf den Boden oder einen niedrigen Stuhl, etwa auf Knie- bis Hüfthöhe.', 'Pon el móvil o iPad de pie en el suelo o en una silla baja, más o menos a la altura de la rodilla o la cadera.'),
            L3('Step back about 2.5 m and turn sideways, so the camera sees you from the side.', 'Geh etwa 2,5 m zurück und dreh dich seitlich, damit die Kamera dich von der Seite sieht.', 'Aléjate unos 2,5 m y ponte de lado, para que la cámara te vea de perfil.'),
            L3('Your whole body, head to feet, should be in view. Start light: form first, weight later.', 'Dein ganzer Körper, Kopf bis Füße, sollte zu sehen sein. Fang leicht an: erst die Haltung, dann das Gewicht.', 'Debe verse todo tu cuerpo, de la cabeza a los pies. Empieza ligero: primero la técnica, luego el peso.')],
        cue: L3('Hips back, back long and flat, hands close to your legs. Stand tall at the top.', 'Hüfte nach hinten, Rücken lang und flach, Hände nah an den Beinen. Oben ganz aufrichten.', 'Cadera atrás, espalda larga y plana, manos cerca de las piernas. Arriba, bien erguido.'),
        fine: L3('The camera only estimates your posture from the side and cannot see your spine. Go light and stop if anything hurts.', 'Die Kamera schätzt deine Haltung nur grob von der Seite und sieht deine Wirbelsäule nicht. Nimm wenig Gewicht und hör auf, wenn etwas weh tut.', 'La cámara solo estima tu postura de lado y no ve tu columna. Usa poco peso y para si algo duele.') };

    const HINTS = {
        find: L3('Step into the picture, side-on to the phone', 'Stell dich ins Bild, seitlich zum Handy', 'Ponte en la imagen, de lado al móvil'),
        body: L3('Head to feet in view: step back a little', 'Kopf bis Füße ins Bild: geh ein Stück zurück', 'De la cabeza a los pies: aléjate un poco'),
        turn: L3('Turn sideways to the phone', 'Dreh dich seitlich zum Handy', 'Ponte de lado al móvil'),
        back: L3('A little too close. Step back a bit.', 'Etwas zu nah. Geh ein Stück zurück.', 'Un poco cerca. Échate algo atrás.'),
        closer: L3('A little far. Come a bit closer.', 'Etwas weit weg. Komm ein Stück näher.', 'Un poco lejos. Acércate un poco.'),
        right: L3('Move a little to your right.', 'Rück ein bisschen nach rechts.', 'Muévete un poco a tu derecha.'),
        left: L3('Move a little to your left.', 'Rück ein bisschen nach links.', 'Muévete un poco a tu izquierda.'),
        stand: L3('Stand tall to start', 'Steh gerade, dann geht es los', 'Ponte recto para empezar'),
        dark: L3('It is quite dark. Turn on a light in front of you.', 'Es ist recht dunkel. Mach ein Licht vor dir an.', 'Está bastante oscuro. Enciende una luz delante de ti.'),
        hold: L3('That is it. Hold still...', 'Genau so. Kurz stillhalten...', 'Así. Quédate quieto...'),
        lost: L3('I lost you. Step back into the picture, side-on.', 'Ich sehe dich nicht mehr. Stell dich wieder seitlich ins Bild.', 'Te he perdido. Vuelve a la imagen, de lado.'),
        good: L3('Clean rep', 'Saubere Wiederholung', 'Repetición limpia'),
        rest: L3('Rest. Shake out your arms, breathe.', 'Pause. Arme ausschütteln, atmen.', 'Descansa. Suelta los brazos, respira.'),
        /* form cues */
        backr: L3('Keep your back long and flat, chest proud', 'Rücken lang und flach, Brust raus', 'Espalda larga y plana, pecho fuera'),
        knees: L3('Knees softer: push your hips back, not your knees forward', 'Knie ruhiger: Hüfte nach hinten, nicht die Knie nach vorn', 'Rodillas quietas: cadera atrás, no las rodillas adelante'),
        hands: L3('Keep the hands close to your legs', 'Hände nah an den Beinen halten', 'Manos cerca de las piernas'),
        tall: L3('Stand all the way tall at the top', 'Oben ganz aufrichten', 'Arriba, ponte bien recto'),
        leanb: L3('At the top, stand straight, do not lean back', 'Oben gerade stehen, nicht nach hinten lehnen', 'Arriba, recto, sin echarte atrás'),
        deeper: L3('Push your hips further back to count the rep', 'Hüfte weiter nach hinten, dann zählt die Wiederholung', 'Lleva la cadera más atrás para que cuente')
    };
    const FORM = ['backr', 'knees', 'hands', 'tall', 'leanb', 'deeper'];

    /* ---------- the guide's rep cycle ---------- */
    /* hinge depth 0 (tall) .. 1 (bottom) at time tIn of one rep */
    function depthAt(tIn) {
        const p = PLAN.tempo, c = ((tIn % PER) + PER) % PER;
        if (c < p.top) return 0;
        if (c < p.top + p.down) return ease((c - p.top) / p.down);
        if (c < p.top + p.down + p.bottom) return 1;
        return ease(1 - (c - p.top - p.down - p.bottom) / p.up);
    }
    /* the outline's joint angles for a depth: tau = torso lean forward, phi = thigh tilt back (hips back), s = shin tilt forward */
    function pose(d) { d = clamp(d, 0, 1); return { d, tau: 70 * d, phi: 4 + 24 * d, s: 3 + 9 * d }; }

    /* ---------- the outline (side view) ---------- */
    /* A: { ankle:[x,y], dir: +1 facing screen right / -1 left, shin, thigh, torso, neck, headR, ua, fa, foot } */
    function defaultAnchor(W, H, dir) {
        const h = Math.min(0.7 * H, 1.45 * W);
        /* stand a bit behind the middle: at the bottom of the hinge the head goes far forward, so the whole hinge stays on screen */
        const dr = dir === -1 ? -1 : 1;
        return { ankle: [0.5 * W - dr * 0.16 * h, Math.min(H - 0.06 * H, 0.5 * H + 0.5 * h)], dir: dr, h,
            shin: 0.25 * h, thigh: 0.245 * h, torso: 0.3 * h, neck: 0.12 * h, headR: 0.062 * h, ua: 0.17 * h, fa: 0.16 * h, foot: 0.13 * h };
    }
    function ghost(A, P) {
        const dir = A.dir, at = (p, ang, l, fwd) => [p[0] + dir * Math.sin(ang * D2R) * l * fwd, p[1] - Math.cos(ang * D2R) * l];
        const ankle = A.ankle, knee = at(ankle, P.s, A.shin, 1), hip = at(knee, P.phi, A.thigh, -1), sh = at(hip, P.tau, A.torso, 1);
        const neck = at(sh, P.tau, A.neck * 0.45, 1), head = at(sh, P.tau, A.neck, 1);
        /* straight arms, the hands (and the weight) travel just in front of the legs: the arm swings back towards the legs as
           far as it needs, like the lats pulling the bar in */
        const L = A.ua + A.fa, gap = 0.1 * A.torso;
        const legX = y => y <= hip[1] ? hip[0] : y <= knee[1] ? hip[0] + (knee[0] - hip[0]) * (y - hip[1]) / ((knee[1] - hip[1]) || 1) : knee[0] + (ankle[0] - knee[0]) * clamp((y - knee[1]) / ((ankle[1] - knee[1]) || 1), 0, 1);
        let best = 0, bd = 1e9;
        for (let a = -6; a <= 48; a += 1.5) { const wy = sh[1] + Math.cos(a * D2R) * L, wx = sh[0] - dir * Math.sin(a * D2R) * L, e = Math.abs(dir * (wx - legX(wy)) - gap); if (e < bd) { bd = e; best = a; } }
        const ax = -dir * Math.sin(best * D2R), ay = Math.cos(best * D2R);
        const el = [sh[0] + ax * A.ua, sh[1] + ay * A.ua], wr = [sh[0] + ax * L, sh[1] + ay * L], hand = [wr[0] + ax * A.fa * 0.22, wr[1] + ay * A.fa * 0.22];
        const toe = [ankle[0] + dir * A.foot, ankle[1] + A.foot * 0.08], heel = [ankle[0] - dir * A.foot * 0.28, ankle[1] + A.foot * 0.08];
        return { dir, ankle, knee, hip, sh, neck, head, headR: A.headR, el, wr, hand, toe, heel, w: A.torso * 0.42 };
    }

    /* ---------- what the camera sees ---------- */
    /* left / right landmark sets: shoulder, elbow, wrist, hip, knee, ankle, heel, toe, ear */
    const SIDES = [{ sh: 11, el: 13, wr: 15, hip: 23, knee: 25, ankle: 27, heel: 29, toe: 31, ear: 7 }, { sh: 12, el: 14, wr: 16, hip: 24, knee: 26, ankle: 28, heel: 30, toe: 32, ear: 8 }];
    const VIS = 0.5;
    function measure(lm, W, H) {
        if (!lm || lm.length < 29) return null;
        const vis = p => !p ? 0 : (p.v == null ? 1 : p.v);
        const inView = p => !!p && p.x >= -0.03 * W && p.x <= 1.03 * W && p.y >= -0.03 * H && p.y <= 1.03 * H;
        const ok = i => vis(lm[i]) >= VIS && inView(lm[i]);
        const P = i => lm[i] ? [lm[i].x, lm[i].y] : null;
        /* the side nearer the camera is the better seen one */
        const score = S => ['sh', 'hip', 'knee', 'ankle', 'wr', 'ear'].reduce((a, k) => a + vis(lm[S[k]]), 0);
        const k = score(SIDES[1]) > score(SIDES[0]) ? 1 : 0, S = SIDES[k], O = SIDES[1 - k];
        const m = { seen: ok(S.sh) || ok(O.sh) || ok(S.hip), side: k };
        if (!m.seen) return m;
        for (const key of ['sh', 'el', 'wr', 'hip', 'knee', 'ankle', 'heel', 'toe', 'ear']) { m[key] = P(S[key]); m['ok' + key[0].toUpperCase() + key.slice(1)] = ok(S[key]); }
        m.nose = P(0); m.okNose = ok(0);
        if (!m.okEar && m.okNose) { m.ear = m.nose; m.okEar = true; m.earIsNose = true; }
        m.okUpper = m.okSh && m.okHip;
        m.okLegs = m.okKnee && m.okAnkle;
        m.okFull = m.okUpper && m.okLegs && (m.okEar || m.okNose);
        /* facing: toes point where you look; else the nose is in front of the ear */
        let dir = 0;
        if (m.okToe && m.okHeel && Math.abs(m.toe[0] - m.heel[0]) > 4) dir = Math.sign(m.toe[0] - m.heel[0]);
        else if (m.okNose && ok(S.ear) && Math.abs(m.nose[0] - lm[S.ear].x) > 2) dir = Math.sign(m.nose[0] - lm[S.ear].x);
        m.dir = dir || 1; m.dirSure = !!dir;
        /* side-on check: from the side both shoulders (and both hips) nearly overlap */
        const os = P(O.sh), oh = P(O.hip);
        m.torsoLen = m.okUpper ? len(sub(m.sh, m.hip)) : null;
        m.shSpread = os && ok(O.sh) && m.okSh ? Math.abs(os[0] - m.sh[0]) : 0;
        m.hipSpread = oh && ok(O.hip) && m.okHip ? Math.abs(oh[0] - m.hip[0]) : 0;
        if (m.okFull) { const top = Math.min(m.ear[1], m.nose && m.okNose ? m.nose[1] : m.ear[1]) - (m.torsoLen || 0) * 0.22; m.top = top; m.height = m.ankle[1] - top; m.cx = (m.sh[0] + m.ankle[0]) / 2; }
        return m;
    }
    /* signed angle from vector a to b in screen space, degrees; + = clockwise on screen */
    const sang = (a, b) => Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]) * R2D;
    const angAt = (a, o, b) => Math.abs(sang(sub(a, o), sub(b, o)));
    /* your hinge, measured: torso lean, hip and knee angles, knee past the toes, hands away from the legs, upper back curl */
    function angles(m, dirIn) {
        if (!m || !m.okUpper) return null;
        const dir = dirIn || m.dir || 1, ts = sub(m.sh, m.hip), tl = len(ts) || 1;
        const o = { dir, tau: Math.atan2(dir * ts[0], -ts[1]) * R2D };
        if (m.okKnee) o.hipA = angAt(m.sh, m.hip, m.knee);
        if (m.okKnee && m.okAnkle) {
            o.kneeA = angAt(m.hip, m.knee, m.ankle);
            const leg = len(sub(m.hip, m.knee)) + len(sub(m.knee, m.ankle)) || 1;
            const toeX = m.okToe ? m.toe[0] : m.ankle[0] + dir * 0.45 * len(sub(m.knee, m.ankle)) * 0.5;
            o.kneeFwd = dir * (m.knee[0] - toeX) / leg;
        }
        if (m.okWr && m.okKnee) {
            const w = m.wr; let lx;
            if (w[1] <= m.hip[1]) lx = m.hip[0];
            else if (w[1] <= m.knee[1] || !m.okAnkle) { const k = clamp((w[1] - m.hip[1]) / ((m.knee[1] - m.hip[1]) || 1), 0, 1); lx = m.hip[0] + (m.knee[0] - m.hip[0]) * k; }
            else { const k = clamp((w[1] - m.knee[1]) / ((m.ankle[1] - m.knee[1]) || 1), 0, 1); lx = m.knee[0] + (m.ankle[0] - m.knee[0]) * k; }
            o.hands = dir * (w[0] - lx) / tl;
        }
        /* curl: head and shoulders turning down off the torso line (+ = towards the floor in front of you) */
        if (m.okEar) o.curl = dir * sang(ts, sub(m.ear, m.sh)) - (m.earIsNose ? 8 : 0);
        return o;
    }

    /* ---------- rep counter ---------- */
    function Reps() { this.state = 'up'; this.n = 0; this.clean = 0; this.since = {}; this.faults = {}; this.t0 = 0; this.maxTau = 0; this.nearTop = null; this.last = null; this.flag = null; }
    /* feed one measurement; returns an event or null: {type:'rep', n, clean, faults[], depth} | {type:'cue', cue} */
    Reps.prototype.feed = function (t, a) {
        if (!a) return null;
        const held = (key, on) => { if (on) { if (this.since[key] == null) this.since[key] = t; return t - this.since[key] >= T.hold; } this.since[key] = null; return false; };
        if (this.state === 'up') {
            if (held('leanb', a.tau < T.leanBack)) { this.since.leanb = null; return { type: 'cue', cue: 'leanb' }; }
            if (a.tau > T.down && (a.hipA == null || a.hipA < 155)) { this.state = 'down'; this.t0 = t; this.maxTau = a.tau; this.faults = {}; this.nearTop = null; this.since = {}; }
            return null;
        }
        /* down: watch form until you are back up */
        this.maxTau = Math.max(this.maxTau, a.tau);
        if (a.tau > 28) {
            if (held('backr', a.curl != null && a.curl > T.back)) this.faults.backr = 1;
            const squat = a.kneeA != null && a.kneeA < T.kneeAng && a.tau < 55;
            if (held('knees', (a.kneeFwd != null && a.kneeFwd > T.knee) || squat)) this.faults.knees = 1;
            if (held('hands', a.hands != null && Math.abs(a.hands) > T.hands)) this.faults.hands = 1;
        }
        if (a.tau < T.top) {
            const tall = a.hipA == null || a.hipA >= T.tallHip;
            if (this.maxTau < T.deep) { this.state = 'up'; this.since = {}; return { type: 'cue', cue: 'deeper' }; }
            if (tall) {
                this.state = 'up'; this.since = {};
                if (t - this.t0 < T.minRep) return null;          /* a jolt, not a rep */
                this.n++; const f = Object.keys(this.faults), clean = !f.length; if (clean) this.clean++;
                this.last = { type: 'rep', n: this.n, clean, faults: f, depth: Math.round(this.maxTau), at: t };
                return this.last;
            }
            if (this.nearTop == null) this.nearTop = t;
            if (t - this.nearTop > 1.2 && !this.faults.tall) { this.faults.tall = 1; return { type: 'cue', cue: 'tall' }; }
        } else this.nearTop = null;
        return null;
    };

    /* ---------- the session ---------- */
    function Flow(opt) {
        opt = opt || {};
        this.kind = ID;
        this.mode = opt.mode === 'free' ? 'free' : 'camera';
        this.lang = opt.lang || 'en';
        this.plan = Object.assign({}, PLAN, opt.plan || {});
        this.phase = this.mode === 'free' ? 'count' : 'align';
        this.phaseAt = 0; this.last = null; this.now = 0; this.okSince = null; this.seenSince = null; this.missSince = null;
        this.set = 1; this.reps = new Reps(); this.setStartN = 0; this.setClean = 0; this.sets = []; this.gt = 0; this.restLeft = 0;
        this.anchor = null; this.samples = []; this.dir = 1; this.dark = false; this.here = false; this.canHere = false; this.paused = false;
        this.view = { W: 390, H: 844 }; this.events = []; this.cue = ''; this.cueAt = -1e9; this.cueLast = {}; this.a = null; this.hint = '';
    }
    Flow.prototype.setDark = function (d) { this.dark = !!d; };
    Flow.prototype.startHere = function () { if (this.phase === 'align' && this.canHere) this.here = true; };
    Flow.prototype.pause = function (p) { this.paused = p == null ? !this.paused : !!p; this.last = null; };
    Flow.prototype.go = function (ph, now) { this.phase = ph; this.phaseAt = now; };
    Flow.prototype.toFree = function () { this.mode = 'free'; if (this.phase === 'align' || this.phase === 'hold' || this.phase === 'lost') this.go('count', this.now || 0); };
    Flow.prototype.skipRest = function () { if (this.phase === 'rest') this.restLeft = 0; };
    Flow.prototype.target = function () { return defaultAnchor(this.view.W, this.view.H, this.dir); };
    Flow.prototype.repsInSet = function () { return this.reps.n - this.setStartN; };
    Flow.prototype.totalReps = function () { return this.plan.sets * this.plan.reps; };
    Flow.prototype.framing = function (m) {
        if (!m || !m.seen) return this.dark ? 'dark' : 'find';
        if (!m.okUpper) return 'find';
        if (!m.okFull) return 'body';
        if (this.here) return '';
        /* front-on: shoulders far apart compared with the torso */
        if (m.torsoLen && m.shSpread > 0.42 * m.torsoLen) return 'turn';
        const V = this.view;
        if (m.height > 0.94 * V.H || m.top < 0.01 * V.H || m.ankle[1] > 0.995 * V.H) return 'back';
        if (m.height < 0.42 * V.H) return 'closer';
        const dx = (m.ankle[0] - defaultAnchor(V.W, V.H, m.dir).ankle[0]) / V.W;
        if (dx < -0.2) return 'right';
        if (dx > 0.2) return 'left';
        const a = angles(m);
        if (a && Math.abs(a.tau) > 15) return 'stand';
        return '';
    };
    Flow.prototype.calibrate = function () {
        const S = this.samples, T0 = this.target();
        const med = k => { const v = S.map(s => s[k]).filter(x => x != null).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : null; };
        const torso = med('torso') || T0.torso, r = (v, lo, hi, def) => v && v / torso > lo && v / torso < hi ? v : def * torso / 0.3;
        const dirs = S.map(s => s.dir).filter(Boolean), dir = dirs.length ? (dirs.reduce((a, b) => a + b, 0) >= 0 ? 1 : -1) : this.dir;
        this.dir = dir;
        const A = { ankle: [med('ax') == null ? T0.ankle[0] : med('ax'), med('ay') == null ? T0.ankle[1] : med('ay')], dir, torso,
            shin: r(med('shin'), 0.55, 1.35, 0.25), thigh: r(med('thigh'), 0.55, 1.35, 0.245), neck: r(med('neck'), 0.2, 0.75, 0.12),
            ua: r(med('ua'), 0.35, 0.9, 0.17), fa: r(med('fa'), 0.3, 0.85, 0.16) };
        A.headR = 0.21 * torso; A.foot = 0.43 * torso; A.h = torso / 0.3;
        this.anchor = A;
    };
    Flow.prototype.say = function (cue, now) {
        /* one form cue at a time, the same one at most every 6 s */
        if (this.cueLast[cue] != null && now - this.cueLast[cue] < 6000) return;
        this.cueLast[cue] = now; this.cue = cue; this.cueAt = now; this.events.push({ type: 'cue', cue, text: txt(HINTS[cue], this.lang) });
    };
    Flow.prototype.rep = function (ev, now) {
        this.events.push(Object.assign({}, ev, { set: this.set, inSet: this.repsInSet(), text: ev.clean ? txt(HINTS.good, this.lang) : txt(HINTS[ev.faults[0]], this.lang) }));
        if (ev.clean) this.setClean++;
        else if (ev.faults && ev.faults[0]) this.say(ev.faults[0], now);
        if (this.repsInSet() >= this.plan.reps) {
            const rec = { set: this.set, reps: this.repsInSet(), clean: this.setClean };
            this.sets.push(rec); this.events.push(Object.assign({ type: 'set', last: this.set >= this.plan.sets }, rec));
            if (this.set >= this.plan.sets) { this.go('done', now); return; }
            this.restLeft = this.plan.rest; this.go('rest', now);
        }
    };
    Flow.prototype.drain = function () { const e = this.events; this.events = []; return e; };
    Flow.prototype.update = function (now, m, view) {
        if (view) this.view = view;
        this.now = now;
        const dt = this.last == null ? 0 : clamp((now - this.last) / 1000, 0, 0.25); this.last = now;
        let hint = '';
        const live = this.mode === 'camera';
        if (this.paused || this.phase === 'done') return this.snap('');
        if (this.phase === 'align' || this.phase === 'hold') {
            if (m && m.seen && m.dirSure) this.dir = m.dir;
            const f = this.framing(m), basic = m && m.okFull;
            if (basic) { if (this.seenSince == null) this.seenSince = now; if (now - this.seenSince > 8000) this.canHere = true; } else this.seenSince = null;
            if (f) { hint = f; this.okSince = null; this.samples = []; if (this.phase === 'hold') this.go('align', now); }
            else {
                if (this.okSince == null) { this.okSince = now; this.go('hold', now); }
                const d = (a, b) => a && b ? len(sub(a, b)) : null;
                this.samples.push({ ax: m.ankle[0], ay: m.ankle[1], dir: m.dirSure ? m.dir : 0, torso: d(m.sh, m.hip), thigh: m.okKnee ? d(m.hip, m.knee) : null,
                    shin: m.okLegs ? d(m.knee, m.ankle) : null, neck: m.okEar && !m.earIsNose ? d(m.ear, m.sh) : null,
                    ua: m.okEl ? d(m.sh, m.el) : null, fa: m.okEl && m.okWr ? d(m.el, m.wr) : null });
                if (this.samples.length > 40) this.samples.shift();
                hint = 'hold';
                if (now - this.okSince >= 1000) { this.calibrate(); this.go('count', now); }
            }
            return this.snap(hint);
        }
        const vis = !live || (m && m.seen && m.okUpper);
        if (this.phase === 'count') {
            if (!this.anchor) this.anchor = this.target();
            if (live && !vis) { if (this.missSince == null) this.missSince = now; if (now - this.missSince > 1200) { this.missSince = null; this.okSince = null; this.go('align', now); return this.snap('find'); } }
            else this.missSince = null;
            if (now - this.phaseAt >= 3000) { this.go('follow', now); this.gt = 0; }
            return this.snap('');
        }
        if (this.phase === 'rest') {
            this.restLeft = Math.max(0, this.restLeft - dt);
            if (this.restLeft <= 0) { this.set++; this.setStartN = this.reps.n; this.setClean = 0; this.gt = 0; this.go('follow', now); this.events.push({ type: 'setstart', set: this.set }); }
            return this.snap('rest');
        }
        if (this.phase === 'lost') {
            if (vis) { if (this.seenSince == null) this.seenSince = now; if (now - this.seenSince > 600) { this.missSince = null; this.go('follow', now); } }
            else this.seenSince = null;
            return this.snap('lost');
        }
        /* follow */
        if (!vis) { if (this.missSince == null) this.missSince = now; if (now - this.missSince > 1200) { this.go('lost', now); this.seenSince = null; return this.snap('lost'); } }
        else this.missSince = null;
        const inSet = this.repsInSet();
        if (!live) {
            /* without the camera the guide counts: one rep per cycle */
            this.gt += dt;
            const done = Math.floor(this.gt / PER);
            if (done > inSet) this.rep({ type: 'rep', n: ++this.reps.n, clean: true, faults: [], depth: 70, guided: true }, now);
        } else {
            /* the guide leads by at most one rep: it waits for you tall at the top */
            this.gt = Math.min(this.gt + dt, (inSet + 1) * PER - 1e-3);
            if (m && m.okUpper) {
                /* the outline stays where you stand; it drifts with your feet slowly */
                if (this.anchor && m.okAnkle) { const k = 1 - Math.exp(-dt / 2), A = this.anchor; A.ankle = [A.ankle[0] + (m.ankle[0] - A.ankle[0]) * k, A.ankle[1] + (m.ankle[1] - A.ankle[1]) * k]; }
                const a = angles(m, this.dir);
                if (a) {
                    if (this.a) for (const k of ['tau', 'hipA', 'kneeA', 'kneeFwd', 'hands', 'curl']) if (a[k] != null && this.a[k] != null) a[k] = this.a[k] + (a[k] - this.a[k]) * 0.6;
                    this.a = a;
                    const ev = this.reps.feed(now / 1000, a);
                    if (ev && ev.type === 'rep') { this.gt = Math.max(this.gt, this.repsInSet() * PER); this.rep(ev, now); }
                    else if (ev && ev.type === 'cue') this.say(ev.cue, now);
                }
            }
        }
        if (this.phase === 'follow' && this.cue && now - this.cueAt < 2600) hint = this.cue;
        else if (this.phase === 'follow' && this.reps.last && this.reps.last.clean && now - this.reps.last.at * 1000 < 1200) hint = 'good';
        return this.snap(hint);
    };
    Flow.prototype.snap = function (hint) {
        const inSet = this.repsInSet(), total = this.totalReps();
        const d = this.phase === 'follow' || this.phase === 'lost' ? depthAt(this.gt) : 0;
        const A = this.phase === 'align' || this.phase === 'hold' || !this.anchor ? this.target() : this.anchor;
        const done = this.reps.n;
        return { kind: ID, phase: this.phase, hint, hintText: txt(HINTS[hint], this.lang), mode: this.mode, paused: this.paused,
            i: this.set - 1, n: this.plan.sets, set: this.set, sets: this.plan.sets, rep: inSet, reps: this.plan.reps, done, totalReps: total,
            clean: this.reps.clean + 0, setClean: this.setClean, restLeft: Math.ceil(this.restLeft), restTotal: this.plan.rest,
            moveName: txt(ROUTINE.short, this.lang), cue: txt(ROUTINE.cue, this.lang), form: FORM.indexOf(hint) >= 0,
            count: this.phase === 'count' ? Math.max(1, 3 - Math.floor((this.now - this.phaseAt) / 1000)) : 0,
            elapsed: done, total, canHere: this.canHere && this.phase === 'align', anchor: A, pose: pose(d), depth: d, a: this.a, dir: A.dir, history: this.sets.slice() };
    };

    return { ID, ROUTINE, PLAN, PER, T, HINTS, FORM, depthAt, pose, defaultAnchor, ghost, measure, angles, Reps, Flow, txt };
});
