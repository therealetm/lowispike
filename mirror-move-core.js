/* LOWiSPIKE Move: Mirror mode core (Oct 16, 2026). Pure logic, no DOM, runs in the browser and in node tests.
   E-man: "I turn on the camera ... I see myself, but I also see the silhouette ... I position myself into the silhouette, then it
   starts and I just try to move with it ... we just define where the person places the phone, they get into place, fill in, and
   then the thing begins." Desk-job users first: chair, standing at the desk, seated on the floor. In bed stays camera-free.

   What lives here:
   - MOVES: front-view moves the camera can follow reliably (arms and side bends, upper body only, so a desk can hide the hips).
     A pose is {aL, eL, aR, eR, lean} in degrees, in MIRROR screen space (L = the arm on the left of the screen):
     a = upper arm angle away from hanging straight down (90 = straight out to the side, 180 = straight up),
     e = elbow bend, the forearm keeps turning the same way (a 90 / e 90 = goal post), lean = side bend, + = top towards screen right.
   - ROUTINES: chair / stand / floor, with where to put the phone.
   - ghost(): the outline's joints from an anchor (hip point, shoulder width, torso, upper arm and forearm length, up vector).
   - measure(): what the camera sees (MediaPipe pose landmarks already mapped into the mirrored view, in px).
   - Flow: get in place (framing hints) -> hold still -> 3-2-1 -> follow (routine clock) -> lost (clock pauses) -> done.
     The match number only says how close your arms are to the outline. It never says your form is correct or safe. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiMirrorCore = api;
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';
    const D2R = Math.PI / 180, R2D = 180 / Math.PI;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const add = (p, q) => [p[0] + q[0], p[1] + q[1]], sub = (p, q) => [p[0] - q[0], p[1] - q[1]], mul = (p, k) => [p[0] * k, p[1] * k];
    const dot = (p, q) => p[0] * q[0] + p[1] * q[1], len = p => Math.hypot(p[0], p[1]), mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const norm = p => { const l = len(p) || 1; return [p[0] / l, p[1] / l]; };
    /* screen coords, y down: positive angle turns the top of a vector towards screen right */
    const rot = (v, deg) => { const c = Math.cos(deg * D2R), s = Math.sin(deg * D2R); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };
    const angDiff = (a, b) => { let d = (a - b) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return Math.abs(d); };
    const wave = (t, per) => 0.5 - 0.5 * Math.cos(2 * Math.PI * t / per);           /* 0 -> 1 -> 0 over per */
    const ease = k => k * k * (3 - 2 * k);
    /* one side then the other: [left, right] each 0 -> 1 -> 0 in its own half */
    function alt(t, per) { const c = ((t % (2 * per)) + 2 * per) % (2 * per); const k = wave(c % per, per); return c < per ? [k, 0] : [0, k]; }
    /* rise, hold, lower: 0..1 over per (rise 25%, hold 50%, lower 25%) */
    function hold(t, per) { const c = ((t % per) + per) % per / per; return c < 0.25 ? ease(c / 0.25) : c < 0.75 ? 1 : ease(1 - (c - 0.75) / 0.25); }
    const REST = { aL: 12, eL: 15, aR: 12, eR: 15, lean: 0 };

    const L3 = (en, de, es) => ({ en, de, es });
    const MOVES = {
        reach: { n: L3('Reach and breathe', 'Strecken und atmen', 'Estira y respira'),
            cue: L3('Reach one arm up as you breathe in, lower it as you breathe out. Then the other side.', 'Einen Arm beim Einatmen nach oben strecken, beim Ausatmen senken. Dann die andere Seite.', 'Sube un brazo al inspirar y bájalo al espirar. Luego el otro lado.'),
            per: 5, pose: (t, per) => { const [l, r] = alt(t, per); return { aL: 12 + 158 * l, eL: 15 - 10 * l, aR: 12 + 158 * r, eR: 15 - 10 * r, lean: 0 }; } },
        lateral: { n: L3('Side arm raise', 'Seitheben', 'Elevación lateral'),
            cue: L3('Lift both arms out to the sides up to shoulder height, then lower them slowly.', 'Beide Arme seitlich bis auf Schulterhöhe heben, dann langsam senken.', 'Sube los dos brazos hacia los lados hasta la altura de los hombros y bájalos despacio.'),
            per: 3.4, pose: (t, per) => { const k = wave(t, per); return { aL: 12 + 78 * k, eL: 12 - 4 * k, aR: 12 + 78 * k, eR: 12 - 4 * k, lean: 0 }; } },
        press: { n: L3('Overhead press', 'Überkopfdrücken', 'Press por encima de la cabeza'),
            cue: L3('Hands up like a goal post, press up towards the ceiling, come back to the goal post.', 'Hände hoch wie ein Torpfosten, nach oben zur Decke drücken, zurück zum Torpfosten.', 'Manos arriba como una portería, empuja hacia el techo y vuelve a la portería.'),
            per: 3.2, pose: (t, per) => { const k = wave(t, per); return { aL: 90 + 72 * k, eL: 90 - 82 * k, aR: 90 + 72 * k, eR: 90 - 82 * k, lean: 0 }; } },
        side: { n: L3('Side stretch', 'Seitdehnung', 'Estiramiento lateral'),
            cue: L3('One arm over your head, lean gently to the other side, breathe, come back up. Then switch.', 'Einen Arm über den Kopf, sanft zur anderen Seite neigen, atmen, wieder aufrichten. Dann wechseln.', 'Un brazo por encima de la cabeza, inclínate suave hacia el otro lado, respira y vuelve. Luego cambia.'),
            per: 8, lean: true, pose: (t, per) => {
                const c = ((t % (2 * per)) + 2 * per) % (2 * per), k = hold(c % per, per), first = c < per;
                const up = { a: 12 + 138 * k, e: 15 + 20 * k }, dn = { a: 12 + 6 * k, e: 15 };
                /* first: the screen-left arm goes over, the body leans to screen right */
                return first ? { aL: up.a, eL: up.e, aR: dn.a, eR: dn.e, lean: 14 * k } : { aL: dn.a, eL: dn.e, aR: up.a, eR: up.e, lean: -14 * k };
            } },
        cactus: { n: L3('Open and cactus', 'Öffnen und Kaktus', 'Abrir y cactus'),
            cue: L3('Arms wide like a T, then bend the elbows up like a cactus and gently squeeze the shoulder blades.', 'Arme weit wie ein T, dann die Ellbogen nach oben beugen wie ein Kaktus und die Schulterblätter sanft zusammenziehen.', 'Brazos abiertos en T, luego dobla los codos hacia arriba como un cactus y junta suave los omóplatos.'),
            per: 4, pose: (t, per) => { const k = wave(t, per); return { aL: 88, eL: 4 + 86 * k, aR: 88, eR: 4 + 86 * k, lean: 0 }; } },
        breathe: { n: L3('Rest and breathe', 'Ausruhen und atmen', 'Descansa y respira'),
            cue: L3('Hands relaxed, shoulders down. Slow breath in, long breath out.', 'Hände locker, Schultern unten. Langsam ein, lang aus.', 'Manos sueltas, hombros abajo. Inspira despacio, espira largo.'),
            per: 5, rest: true, pose: (t, per) => { const k = wave(t, per); return { aL: 12 + 3 * k, eL: 15, aR: 12 + 3 * k, eR: 15, lean: 0 }; } }
    };

    /* placement guides: where the phone goes, how far, what must be in view */
    const ROUTINES = {
        chair: { id: 'chair', icon: 'chair', tempo: 1,
            n: L3('Desk chair reset', 'Bürostuhl-Pause', 'Pausa en la silla'),
            sub: L3('Seated, arms and shoulders, about 4 min', 'Im Sitzen, Arme und Schultern, etwa 4 Min.', 'Sentado, brazos y hombros, unos 4 min'),
            place: [L3('Stand the phone upright on your desk, at about chest height (lean it on a cup or a book).', 'Stell das Handy hochkant auf den Tisch, etwa auf Brusthöhe (an eine Tasse oder ein Buch gelehnt).', 'Pon el móvil de pie en la mesa, más o menos a la altura del pecho (apoyado en una taza o un libro).'),
                L3('Roll your chair back about one big step (1 m).', 'Roll den Stuhl etwa einen großen Schritt zurück (1 m).', 'Echa la silla hacia atrás un paso grande (1 m).'),
                L3('Your head, shoulders and both arms should be in view. Sturdy chair, feet flat.', 'Kopf, Schultern und beide Arme sollten zu sehen sein. Stabiler Stuhl, Füße flach.', 'Deben verse tu cabeza, hombros y los dos brazos. Silla firme, pies en el suelo.')],
            moves: [['breathe', 15], ['reach', 40], ['lateral', 36], ['press', 36], ['side', 48], ['cactus', 36], ['breathe', 20]] },
        stand: { id: 'stand', icon: 'stand', tempo: 1,
            n: L3('Standing desk stretch', 'Stehend am Schreibtisch', 'Estiramiento de pie'),
            sub: L3('Standing by your desk, about 4 min', 'Im Stehen am Schreibtisch, etwa 4 Min.', 'De pie junto a la mesa, unos 4 min'),
            place: [L3('Stand the phone upright on your desk.', 'Stell das Handy hochkant auf den Tisch.', 'Pon el móvil de pie en la mesa.'),
                L3('Step back about two big steps (1.5 to 2 m) so there is room for your arms.', 'Geh etwa zwei große Schritte zurück (1,5 bis 2 m), damit deine Arme Platz haben.', 'Da unos dos pasos grandes hacia atrás (1,5 a 2 m) para tener sitio para los brazos.'),
                L3('Your head, shoulders and both arms should be in view. Clear space around you.', 'Kopf, Schultern und beide Arme sollten zu sehen sein. Freier Platz um dich herum.', 'Deben verse tu cabeza, hombros y los dos brazos. Espacio libre a tu alrededor.')],
            moves: [['breathe', 15], ['reach', 40], ['side', 48], ['lateral', 36], ['cactus', 36], ['press', 36], ['breathe', 20]] },
        floor: { id: 'floor', icon: 'floor', tempo: 1.25,
            n: L3('Floor calm stretch', 'Ruhige Dehnung am Boden', 'Estiramiento tranquilo en el suelo'),
            sub: L3('Seated on the floor or a mat, slow, about 5 min', 'Am Boden oder auf der Matte sitzend, langsam, etwa 5 Min.', 'Sentado en el suelo o la esterilla, lento, unos 5 min'),
            place: [L3('Sit cross-legged or on a cushion. Lean the phone or iPad on something low, like a chair or a box, facing you.', 'Setz dich im Schneidersitz oder auf ein Kissen. Lehn Handy oder iPad an etwas Niedriges, wie einen Stuhl oder eine Kiste.', 'Siéntate con las piernas cruzadas o sobre un cojín. Apoya el móvil o iPad en algo bajo, como una silla o una caja.'),
                L3('About 1.5 m away, the camera at about your chest height.', 'Etwa 1,5 m entfernt, die Kamera etwa auf Brusthöhe.', 'A unos 1,5 m, con la cámara a la altura del pecho.'),
                L3('Your head, shoulders and both arms should be in view.', 'Kopf, Schultern und beide Arme sollten zu sehen sein.', 'Deben verse tu cabeza, hombros y los dos brazos.')],
            moves: [['breathe', 20], ['reach', 50], ['side', 60], ['cactus', 40], ['lateral', 40], ['breathe', 30]] }
    };
    const BED = L3('In bed? Use the In-Bed Training player, without the camera.', 'Im Bett? Nimm das In-Bed-Training, ohne Kamera.', '¿En la cama? Usa el entrenamiento en la cama, sin cámara.');

    const HINTS = {
        find: L3('Step into the outline so I can see your head, shoulders and arms.', 'Stell dich in den Umriss, damit ich Kopf, Schultern und Arme sehe.', 'Ponte dentro de la silueta para que vea tu cabeza, hombros y brazos.'),
        arms: L3('I need to see both arms. Move back a little.', 'Ich muss beide Arme sehen. Geh etwas zurück.', 'Necesito ver los dos brazos. Échate un poco atrás.'),
        head: L3('Your head is out of view. Tilt the phone up a little.', 'Dein Kopf ist nicht im Bild. Kipp das Handy etwas nach oben.', 'Tu cabeza no se ve. Inclina el móvil un poco hacia arriba.'),
        back: L3('A little too close. Move back a bit.', 'Etwas zu nah. Geh ein Stück zurück.', 'Un poco cerca. Échate algo atrás.'),
        closer: L3('A little far. Come a bit closer.', 'Etwas weit weg. Komm ein Stück näher.', 'Un poco lejos. Acércate un poco.'),
        right: L3('Move a little to your right.', 'Rück ein bisschen nach rechts.', 'Muévete un poco a tu derecha.'),
        left: L3('Move a little to your left.', 'Rück ein bisschen nach links.', 'Muévete un poco a tu izquierda.'),
        raise: L3('You sit high in the picture. Tilt the phone up a little or lift it.', 'Du bist weit oben im Bild. Kipp das Handy etwas nach oben oder stell es höher.', 'Sales muy arriba. Inclina el móvil hacia arriba o súbelo.'),
        lower: L3('You sit low in the picture. Tilt the phone down a little or lower it.', 'Du bist weit unten im Bild. Kipp das Handy etwas nach unten oder stell es tiefer.', 'Sales muy abajo. Inclina el móvil hacia abajo o bájalo.'),
        dark: L3('It is quite dark. Turn on a light in front of you.', 'Es ist recht dunkel. Mach ein Licht vor dir an.', 'Está bastante oscuro. Enciende una luz delante de ti.'),
        hold: L3('That is it. Hold still...', 'Genau so. Kurz stillhalten...', 'Así. Quédate quieto...'),
        lost: L3('I lost you. Move back into the outline, the workout waits for you.', 'Ich sehe dich nicht mehr. Geh zurück in den Umriss, das Workout wartet.', 'Te he perdido. Vuelve a la silueta, el ejercicio te espera.'),
        sync: L3('In sync with the outline', 'Im Takt mit dem Umriss', 'Al ritmo de la silueta'),
        follow: L3('Follow the outline\'s arms', 'Folge den Armen des Umrisses', 'Sigue los brazos de la silueta'),
        higher: L3('Arms a little higher, only if it feels comfortable', 'Arme etwas höher, nur wenn es sich gut anfühlt', 'Brazos un poco más arriba, solo si te resulta cómodo'),
        rest: L3('Rest. Breathe slowly.', 'Pause. Langsam atmen.', 'Descansa. Respira despacio.')
    };
    const txt = (o, lang) => o ? (o[lang] || o.en) : '';

    /* expand a routine into a timeline */
    function plan(id) {
        const R = ROUTINES[id] || ROUTINES.chair; let t = 0;
        const blocks = R.moves.map(([m, dur]) => { const b = { move: m, dur, t0: t }; t += dur; return b; });
        return { id: R.id, blocks, total: t, tempo: R.tempo || 1 };
    }
    function rawPose(P, i, tIn) { const b = P.blocks[i], M = MOVES[b.move]; return M.pose(Math.max(0, tIn), M.per * P.tempo); }
    function mix(a, b, k) { const o = {}; for (const key in REST) o[key] = a[key] + (b[key] - a[key]) * k; return o; }
    /* the outline's pose at time t of the routine; the first second of each move blends from where the last move ended */
    function poseAt(P, t) {
        t = clamp(t, 0, P.total - 1e-6);
        let i = 0; while (i < P.blocks.length - 1 && t >= P.blocks[i].t0 + P.blocks[i].dur) i++;
        const b = P.blocks[i], tIn = t - b.t0, cur = rawPose(P, i, tIn);
        const from = i > 0 ? rawPose(P, i - 1, P.blocks[i - 1].dur) : REST;
        const k = tIn < 1.2 ? ease(tIn / 1.2) : 1;
        return { i, tIn, move: b.move, left: b.dur - tIn, pose: k < 1 ? mix(from, cur, k) : cur };
    }

    /* ---------- the outline ---------- */
    function defaultAnchor(W, H) {
        const w = Math.min(0.16 * H, 0.30 * W), sh = [0.5 * W, 0.40 * H];
        return { sh, w, torso: 1.25 * w, ua: 0.78 * w, fa: 0.66 * w, up: [0, -1], hip: [sh[0], sh[1] + 1.25 * w] };
    }
    function ghost(A, P) {
        const up = norm(rot(A.up, P.lean || 0)), right = [-up[1], up[0]], down = mul(up, -1);
        const hip = A.hip, sm = add(hip, mul(up, A.torso));
        const sL = sub(sm, mul(right, A.w / 2)), sR = add(sm, mul(right, A.w / 2));
        const arm = (sh, s, a, e) => {
            const out = mul(right, s), d1 = add(mul(down, Math.cos(a * D2R)), mul(out, Math.sin(a * D2R)));
            const d2 = add(mul(down, Math.cos((a + e) * D2R)), mul(out, Math.sin((a + e) * D2R)));
            const el = add(sh, mul(d1, A.ua)), wr = add(el, mul(d2, A.fa));
            return { sh, el, wr, hand: add(wr, mul(d2, A.fa * 0.24)) };
        };
        return { up, right, hip, shMid: sm, neck: add(sm, mul(up, A.w * 0.2)), head: add(sm, mul(up, A.w * 0.62)), headR: A.w * 0.27,
            hipL: sub(hip, mul(right, A.w * 0.38)), hipR: add(hip, mul(right, A.w * 0.38)),
            L: arm(sL, -1, P.aL, P.eL), R: arm(sR, 1, P.aR, P.eR) };
    }

    /* ---------- what the camera sees ---------- */
    const IDX = { nose: 0, sh: [11, 12], el: [13, 14], wr: [15, 16], hip: [23, 24] };
    const VIS = 0.5;
    function measure(lm, W, H) {
        if (!lm || lm.length < 25) return null;
        const ok = p => !!p && (p.v == null || p.v >= VIS) && p.x >= -0.02 * W && p.x <= 1.02 * W && p.y >= -0.02 * H && p.y <= 1.02 * H;
        const P = i => lm[i] ? [lm[i].x, lm[i].y] : null;
        /* screen sides from where the shoulders really are (mirrored view), not from the model's left/right labels */
        const a = lm[11], b = lm[12]; if (!a || !b) return { seen: false };
        const first = a.x <= b.x ? 0 : 1;              /* index offset of the screen-left side */
        const side = k => ({ sh: P(IDX.sh[k]), el: P(IDX.el[k]), wr: P(IDX.wr[k]), hip: P(IDX.hip[k]),
            okSh: ok(lm[IDX.sh[k]]), okEl: ok(lm[IDX.el[k]]), okWr: ok(lm[IDX.wr[k]]), okHip: ok(lm[IDX.hip[k]]) });
        const L = side(first), R = side(1 - first);
        const m = { seen: true, L, R, okNose: ok(lm[0]), nose: P(0) };
        m.okSh = L.okSh && R.okSh; m.okArms = L.okEl && R.okEl; m.okHip = L.okHip && R.okHip;
        if (m.okSh) { m.shMid = mid(L.sh, R.sh); m.w = len(sub(R.sh, L.sh)); }
        if (m.okHip) m.hipMid = mid(L.hip, R.hip);
        return m;
    }
    /* the user's own arm angles in the same convention as the poses */
    function userPose(m, up0) {
        const up = m.okHip && m.okSh ? norm(sub(m.shMid, m.hipMid)) : up0, right = [-up[1], up[0]], down = mul(up, -1);
        const ang = (v, s) => Math.atan2(dot(v, mul(right, s)), dot(v, down)) * R2D;
        const o = {};
        for (const [k, s] of [['L', -1], ['R', 1]]) {
            const q = m[k];
            o['a' + k] = q.okSh && q.okEl ? ang(sub(q.el, q.sh), s) : null;
            o['f' + k] = q.okSh && q.okEl && q.okWr ? ang(sub(q.wr, q.el), s) : null;
        }
        if (m.okSh && m.okHip) { const v = sub(m.shMid, m.hipMid), r0 = [-up0[1], up0[0]]; o.lean = Math.atan2(dot(v, r0), dot(v, up0)) * R2D; }
        else if (m.okSh) { const v = sub(m.R.sh, m.L.sh); o.lean = Math.atan2(v[1], v[0]) * R2D; }   /* shoulder line tilt */
        else o.lean = null;
        return o;
    }
    /* 0..1, how close the arms (and the side bend) are to the outline. Within ~12 degrees counts as on it. */
    function match(u, P, withLean) {
        let e = 0, wsum = 0;
        for (const k of ['L', 'R']) {
            if (u['a' + k] != null) { e += angDiff(u['a' + k], P['a' + k]); wsum += 1; }
            if (u['f' + k] != null) { e += 0.6 * angDiff(u['f' + k], P['a' + k] + P['e' + k]); wsum += 0.6; }
        }
        if (withLean && u.lean != null) { e += 1.5 * Math.abs(u.lean - P.lean); wsum += 0.8; }
        if (!wsum) return null;
        return clamp(1 - (e / wsum - 10) / 45, 0, 1);
    }

    /* ---------- the session ---------- */
    const LAGS = [0, 0.25, 0.5, 0.75];
    function Flow(opt) {
        opt = opt || {};
        this.mode = opt.mode === 'free' ? 'free' : 'camera';
        this.lang = opt.lang || 'en';
        this.P = plan(opt.routine);
        this.routine = ROUTINES[this.P.id];
        this.phase = this.mode === 'free' ? 'count' : 'align';
        this.t = 0; this.last = null; this.phaseAt = 0; this.okSince = null; this.seenSince = null; this.missSince = null;
        this.score = 0; this.sync = false; this.lowSince = null; this.underSince = null; this.anchor = null; this.samples = [];
        this.hist = []; this.histMove = -1; this.dark = false; this.here = false; this.canHere = false; this.paused = false; this.view = { W: 390, H: 844 };
    }
    Flow.prototype.setDark = function (d) { this.dark = !!d; };
    Flow.prototype.startHere = function () { if (this.phase === 'align' && this.canHere) this.here = true; };
    Flow.prototype.pause = function (p) { this.paused = p == null ? !this.paused : !!p; this.last = null; };
    Flow.prototype.toFree = function () { this.mode = 'free'; if (this.phase === 'align' || this.phase === 'hold' || this.phase === 'lost') { this.go('count', this.now || 0); } };
    Flow.prototype.go = function (ph, now) { this.phase = ph; this.phaseAt = now; };
    Flow.prototype.target = function () { return defaultAnchor(this.view.W, this.view.H); };
    Flow.prototype.calibrate = function () {
        const T = this.target(), S = this.samples; if (!S.length) { this.anchor = T; return; }
        const med = k => { const v = S.map(s => s[k]).filter(x => x != null).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : null; };
        const w = med('w') || T.w, sx = med('sx'), sy = med('sy'), torso = med('torso'), ua = med('ua'), fa = med('fa');
        const sh = [sx == null ? T.sh[0] : sx, sy == null ? T.sh[1] : sy];
        const tr = torso && torso / w > 0.9 && torso / w < 2 ? torso : 1.25 * w;
        const A = { sh, w, torso: tr, ua: ua && ua / w > 0.5 && ua / w < 1.1 ? ua : 0.78 * w, fa: fa && fa / w > 0.4 && fa / w < 1 ? fa : 0.66 * w, up: [0, -1] };
        A.hip = [sh[0], sh[1] + tr];
        this.anchor = A;
    };
    /* framing check while getting in place: returns '' when good, else a hint key */
    Flow.prototype.framing = function (m) {
        if (!m || !m.seen) return this.dark ? 'dark' : 'find';
        if (!m.okSh) return 'find';
        if (!m.okNose) return 'head';
        if (!m.okArms) return 'arms';
        if (this.here) return '';
        const T = this.target(), r = m.w / T.w, dx = (m.shMid[0] - T.sh[0]) / T.w, dy = (m.shMid[1] - T.sh[1]) / T.w;
        if (r > 1.55) return 'back';
        if (r < 0.6) return 'closer';
        if (dx < -0.8) return 'right';     /* a mirror: your image moves the way you move */
        if (dx > 0.8) return 'left';
        if (dy < -0.9) return 'raise';
        if (dy > 0.9) return 'lower';
        return '';
    };
    Flow.prototype.update = function (now, m, view) {
        if (view) this.view = view;
        this.now = now;
        const dt = this.last == null ? 0 : clamp((now - this.last) / 1000, 0, 0.25); this.last = now;
        let hint = '';
        const live = this.mode === 'camera';
        if (this.paused || this.phase === 'done') return this.snap(hint);
        if (this.phase === 'align' || this.phase === 'hold') {
            const f = this.framing(m), basic = m && m.seen && m.okSh && m.okNose && m.okArms;
            if (basic) { if (this.seenSince == null) this.seenSince = now; if (now - this.seenSince > 8000) this.canHere = true; } else this.seenSince = null;
            if (f) { hint = f; this.okSince = null; this.samples = []; if (this.phase === 'hold') this.go('align', now); }
            else {
                if (this.okSince == null) { this.okSince = now; this.go('hold', now); }
                const s = { w: m.w, sx: m.shMid[0], sy: m.shMid[1], torso: m.okHip ? len(sub(m.shMid, m.hipMid)) : null };
                const arm = k => m[k].okEl ? len(sub(m[k].el, m[k].sh)) : null, fore = k => m[k].okEl && m[k].okWr ? len(sub(m[k].wr, m[k].el)) : null;
                const u = [arm('L'), arm('R')].filter(x => x), f2 = [fore('L'), fore('R')].filter(x => x);
                s.ua = u.length ? Math.max.apply(null, u) : null; s.fa = f2.length ? Math.max.apply(null, f2) : null;   /* the longer side is the less foreshortened one */
                this.samples.push(s); if (this.samples.length > 40) this.samples.shift();
                hint = 'hold';
                if (now - this.okSince >= 1000) { this.calibrate(); this.go('count', now); }
            }
            return this.snap(hint);
        }
        if (this.phase === 'count') {
            if (!this.anchor) this.anchor = this.target();
            if (live && !(m && m.seen && m.okSh && (m.L.okEl || m.R.okEl))) { if (this.missSince == null) this.missSince = now; if (now - this.missSince > 1200) { this.missSince = null; this.okSince = null; this.go('align', now); return this.snap('find'); } }
            else this.missSince = null;
            if (now - this.phaseAt >= 3000) this.go('follow', now);
            return this.snap(hint);
        }
        /* follow / lost */
        const vis = !live || (m && m.seen && m.okSh && (m.L.okEl || m.R.okEl));
        if (this.phase === 'follow') {
            if (!vis) { if (this.missSince == null) this.missSince = now; if (now - this.missSince > 1200) { this.go('lost', now); this.seenSince = null; return this.snap('lost'); } }
            else this.missSince = null;
            this.t += dt;
            if (this.t >= this.P.total) { this.t = this.P.total; this.go('done', now); return this.snap(''); }
            const cur = poseAt(this.P, this.t), M = MOVES[cur.move];
            if (live && vis && m && m.okSh) {
                /* the outline stays where you sit; it drifts with you slowly, but not during side bends */
                if (!M.lean && this.anchor) {
                    const k = 1 - Math.exp(-dt / 1.6), A = this.anchor, tgt = m.shMid;
                    A.sh = [A.sh[0] + (tgt[0] - A.sh[0]) * k, A.sh[1] + (tgt[1] - A.sh[1]) * k]; A.hip = [A.sh[0], A.sh[1] + A.torso];
                }
                if (!M.rest) {
                    const u = userPose(m, [0, -1]); let best = null;
                    for (const lag of LAGS) { const q = match(u, poseAt(this.P, Math.max(0, this.t - lag)).pose, !!M.lean); if (q != null && (best == null || q > best)) best = q; }
                    /* range of motion over the last rep: matching only the rest point of a raise does not count as following */
                    if (this.histMove !== cur.i) { this.hist = []; this.histMove = cur.i; }
                    const per = M.per * this.P.tempo, H2 = this.hist; H2.push([this.t, u.aL, u.aR, cur.pose.aL, cur.pose.aR]);
                    while (H2.length && H2[0][0] < this.t - per) H2.shift();
                    if (best != null && H2.length > 2 && this.t - H2[0][0] >= 0.8 * per) {
                        const rs = [];
                        for (const j of [1, 2]) {
                            const g = H2.map(h => h[j + 2]), uu = H2.map(h => h[j]).filter(x => x != null);
                            const gr = Math.max.apply(null, g) - Math.min.apply(null, g);
                            if (gr > 30 && uu.length > 2) rs.push(clamp((Math.max.apply(null, uu) - Math.min.apply(null, uu)) / gr, 0, 1));
                        }
                        if (rs.length) best *= 0.35 + 0.65 * (rs.reduce((x, y) => x + y, 0) / rs.length);
                    }
                    if (best != null) { const k = 1 - Math.exp(-dt / 0.35); this.score += (best - this.score) * k; }
                    this.sync = this.score >= 0.7;
                    /* gentle hint: arms clearly lower than the outline at the top of a raise for a while */
                    const P = cur.pose, under = ['L', 'R'].filter(s => u['a' + s] != null && P['a' + s] > 60 && u['a' + s] < P['a' + s] - 35).length > 0;
                    this.underSince = under ? (this.underSince == null ? now : this.underSince) : null;
                    this.lowSince = this.score < 0.45 ? (this.lowSince == null ? now : this.lowSince) : null;
                    hint = this.sync ? 'sync' : (this.underSince != null && now - this.underSince > 1500) ? 'higher' : (this.lowSince != null && now - this.lowSince > 2000) ? 'follow' : '';
                } else { this.sync = false; hint = 'rest'; }
            } else if (M.rest) hint = 'rest';
            return this.snap(hint);
        }
        if (this.phase === 'lost') {
            if (vis) { if (this.seenSince == null) this.seenSince = now; if (now - this.seenSince > 600) { this.missSince = null; this.go('follow', now); } }
            else this.seenSince = null;
            return this.snap('lost');
        }
        return this.snap(hint);
    };
    Flow.prototype.snap = function (hint) {
        const cur = poseAt(this.P, this.t), b = this.P.blocks[cur.i];
        const pose = this.phase === 'align' || this.phase === 'hold' ? REST : this.phase === 'count' ? poseAt(this.P, 0).pose : cur.pose;
        return { phase: this.phase, hint, hintText: txt(HINTS[hint], this.lang), mode: this.mode, paused: this.paused,
            i: cur.i, n: this.P.blocks.length, move: b.move, moveName: txt(MOVES[b.move].n, this.lang), cue: txt(MOVES[b.move].cue, this.lang),
            left: Math.max(0, Math.ceil(cur.left)), elapsed: this.t, total: this.P.total,
            count: this.phase === 'count' ? Math.max(1, 3 - Math.floor((this.now - this.phaseAt) / 1000)) : 0,
            score: this.score, sync: this.sync, canHere: this.canHere && this.phase === 'align',
            anchor: this.anchor || this.target(), pose };
    };

    /* object-fit: cover mapping of a normalized landmark into the mirrored view, px */
    function toView(p, vw, vh, W, H, mirror) {
        const s = Math.max(W / vw, H / vh), ox = (W - vw * s) / 2, oy = (H - vh * s) / 2;
        const x = (mirror ? 1 - p.x : p.x) * vw * s + ox, y = p.y * vh * s + oy;
        return { x, y, v: p.visibility == null ? (p.v == null ? 1 : p.v) : p.visibility };
    }
    /* camera mode only where tracking is reliable enough to help: not in bed, not on the treadmill */
    const cameraOk = fmt => fmt !== 'bed' && fmt !== 'walk' && fmt !== 'lift';

    return { MOVES, ROUTINES, HINTS, BED, plan, poseAt, ghost, defaultAnchor, measure, userPose, match, Flow, toView, txt, cameraOk, angDiff, alt, hold, REST };
});
