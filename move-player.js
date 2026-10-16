/* LOWiSPIKE Move: the immersive workout player (Oct 16, 2026)
   E-man (iPad screenshot of the old player): "Redesign that completely. When you click on workout on the iPad, it's not just
   this weird black bar opening, but it's immersive, still with the transparent style. Imagine someone at the gym working out
   but they still see our beautiful metabolic spirit world background ... the silhouette doing the workout with us could be our
   own companion. The only difference is now our companion has legs and arms ... as long as the person watching understands the
   body parts they're supposed to be using and moving."

   What this file adds on top of the player in index.html (the timer, blocks, sounds and saving stay there, unchanged):
   - the world: the player is transparent and full screen; on open the camera glides out into the living spirit world (the same
     world Community lives in) and glides back when the player closes. A future shared layer can take over through
     window.LowiLivingWorld.enter(owner) / .leave(owner); until it exists the existing live 3D world is used (see worldEnter).
   - the workout figure (since Oct 16 evening): a plain human silhouette in the app's liquid cell glass, NOT the companion.
     E-man: "we try to put our companion's head on the body ... that's the part that broke everything ... the same style, that
     liquid cell silhouette, but obviously just with a human body silhouette." The body is drawn at the real size of the
     kinematics the player always used (every move keeps its exact motion). The body parts the move works glow warm and pulse,
     and a small glass chip names them ("Working: Biceps"). Misty stays on Home and everywhere else.
   - quiet education: a new IN YOUR BODY step no longer pops a big card over the workout; the glass pill glows and updates and the
     QUICK FUEL card opens when you tap it.
   Reduced motion: no camera glide, no pulsing, the figure drifts gently between frames the player draws (the player itself already
   stops the trail). */
(() => {
    'use strict';
    const W = window, D = document, H = D.documentElement;
    if (W.LowiMovePlayer) return;
    const lang = () => { try { return ((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || H.lang || 'en').slice(0, 2); } catch (e) { return 'en'; } };
    const T = (en, de, es) => ({ de, es })[lang()] || en;
    const reduced = () => !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const NS = 'http://www.w3.org/2000/svg';

    /* ---------- which body parts each move works ---------- */
    /* zone -> label and the limb segments that glow (thigh, shin, foot, ua = upper arm, fa = forearm, torso, heart) */
    const ZONE = {
        calves: { l: ['Calves', 'Waden', 'Gemelos'], p: ['shin', 'foot'] },
        legs: { l: ['Legs', 'Beine', 'Piernas'], p: ['thigh', 'shin'] },
        thighs: { l: ['Thighs and hips', 'Oberschenkel und H\u00fcfte', 'Muslos y cadera'], p: ['thigh'] },
        glutes: { l: ['Glutes and hips', 'Po und H\u00fcfte', 'Gl\u00fateos y cadera'], p: ['thigh', 'torso'] },
        squat: { l: ['Thighs and glutes', 'Oberschenkel und Po', 'Muslos y gl\u00fateos'], p: ['thigh', 'shin'] },
        biceps: { l: ['Biceps', 'Bizeps', 'B\u00edceps'], p: ['ua', 'fa'] },
        shoulders: { l: ['Shoulders', 'Schultern', 'Hombros'], p: ['ua'] },
        punch: { l: ['Shoulders and arms', 'Schultern und Arme', 'Hombros y brazos'], p: ['ua', 'fa'] },
        chest: { l: ['Chest and arms', 'Brust und Arme', 'Pecho y brazos'], p: ['ua', 'fa', 'torso'] },
        core: { l: ['Core', 'Rumpf', 'Abdomen'], p: ['torso'] },
        corelimbs: { l: ['Core, arms and legs', 'Rumpf, Arme und Beine', 'Abdomen, brazos y piernas'], p: ['torso', 'thigh', 'ua'] },
        walk: { l: ['Legs and heart', 'Beine und Herz', 'Piernas y coraz\u00f3n'], p: ['thigh', 'shin', 'heart'] },
        walkarms: { l: ['Legs, heart and arms', 'Beine, Herz und Arme', 'Piernas, coraz\u00f3n y brazos'], p: ['thigh', 'shin', 'ua', 'fa', 'heart'] },
        breath: { l: ['Breathing', 'Atmung', 'Respiraci\u00f3n'], p: ['torso'] },
        neck: { l: ['Neck and shoulders', 'Nacken und Schultern', 'Cuello y hombros'], p: ['ua', 'torso'] },
        rest: { l: ['Breathe and recover', 'Atmen und erholen', 'Respira y recup\u00e9rate'], p: [] },
        all: { l: ['Whole body', 'Ganzer K\u00f6rper', 'Todo el cuerpo'], p: ['thigh', 'shin', 'ua', 'fa', 'torso'] }
    };
    const MOVE_ZONE = {
        soleus: 'calves', toeraise: 'calves', ankle_pump: 'calves', heel_slide: 'legs',
        march_slow: 'thighs', march: 'thighs', legext: 'thighs', leg_raise: 'thighs', bed_march: 'thighs', knee_hug: 'thighs',
        bridge: 'glutes', clam: 'glutes', side_leg: 'glutes', pelvic_tilt: 'core', sit_stand: 'squat',
        curl: 'biceps', walk_curl: 'walkarms', punch: 'punch', walk_punch: 'walkarms', press: 'shoulders', frontraise: 'shoulders',
        walk_raise: 'walkarms', shoulder_roll: 'shoulders', pullover: 'shoulders', reach_slow: 'shoulders', bed_reach: 'shoulders',
        chest_press: 'chest', dead_bug: 'corelimbs', lying_twist: 'core', seat_twist: 'core', cat_cow: 'core',
        bed_breath: 'breath', child_pose: 'breath', neck_roll: 'neck', rest_seat: 'rest', rest_bed: 'rest',
        walk_easy: 'walk', walk_brisk: 'walk', walk_cool: 'walk'
    };
    function zoneOf(id, m, type) {
        if (type === 'rest') return (m && m.base === 'walk') ? 'walk' : 'rest';
        if (MOVE_ZONE[id]) return MOVE_ZONE[id];
        if (!m) return 'all';
        if (/^walk/.test(id) || m.base === 'walk') return m.arms ? 'walkarms' : 'walk';
        if (m.arms && m.legs) return 'all';
        if (m.arms) return 'shoulders';
        if (m.legs) return 'legs';
        return 'all';
    }
    const zoneLabel = z => { const e = ZONE[z] || ZONE.all, i = ({ de: 1, es: 2 })[lang()] || 0; return e.l[i] || e.l[0]; };

    /* ---------- the workout figure: a human silhouette in liquid cell glass (Oct 16, evening) ----------
       E-man: putting the companion's head on a body "broke everything". He likes the liquid cell / bubble glass, but wants a
       plain human body silhouette doing the moves. So: a naturally proportioned person (head, neck, torso, full-length arms
       and legs, hands and feet), drawn at the real size of the skeleton the move clock already solves, so every rep stays in
       time and shape. Each part is the same glass as before: a membrane rim, a dark translucent fill, a soft bright core and a
       white shine; the parts of one body merge into one liquid outline (all rims first, then all fills). Misty is not here:
       she stays on Home and everywhere else. Everything is drawn in code, no picture assets, no companion artwork. */
    const POSE = {
        soleus: 'heel-raise', march_slow: 'march', march: 'march', toeraise: 'toe-lift', legext: 'leg-extension',
        punch: 'punch', curl: 'bicep-curl', press: 'overhead-press', frontraise: 'front-raise', reach_slow: 'reach', rest_seat: 'rest',
        walk_easy: 'walk', walk_brisk: 'brisk-walk', walk_cool: 'walk', walk_curl: 'walk-curl', walk_punch: 'walk-punch', walk_raise: 'walk-raise',
        ankle_pump: 'ankle-pump', bridge: 'glute-bridge', heel_slide: 'heel-slide', leg_raise: 'leg-raise', bed_march: 'lying-march',
        chest_press: 'chest-press', pullover: 'overhead-reach', bed_reach: 'reach', bed_breath: 'breathing', rest_bed: 'rest',
        knee_hug: 'knee-hug', lying_twist: 'twist', pelvic_tilt: 'glute-bridge', dead_bug: 'dead-bug', clam: 'clam', side_leg: 'side-leg-raise',
        cat_cow: 'cat-cow', child_pose: 'stretch', neck_roll: 'stretch', shoulder_roll: 'shoulder-roll', sit_stand: 'squat', seat_twist: 'twist'
    };
    /* where the move happens: a glass platform (standing), a glass pouf (seated), a glass bed (lying or sitting up in bed),
       a glass mat (hands and knees) */
    const STAGE = { walk: 'stand', seat: 'seat', bedsit: 'bed', bed: 'bed', quad: 'mat' };
    function poseOf(id, m) { return POSE[id] || (m && m.base === 'walk' ? 'walk' : m && m.base === 'bed' ? 'lying-march' : 'generic'); }
    function stageOf(m) { return STAGE[m && m.base] || 'stand'; }
    /* human proportions on the solver's skeleton: torso 48, thigh 40, shin 40, upper arm 26, forearm 24, head ~23 tall */
    const WD = { thigh: 14.5, shin: 10.5, ua: 8.6, fa: 7.2, neck: 8.4 };   /* rim widths; fills and cores are set in move-player.css */
    const HEAD_U = 10.9, HEAD_V = 8.7;
    const v2 = (x, y) => [x, y], add2 = (a, b) => [a[0] + b[0], a[1] + b[1]], sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
    const mul2 = (a, k) => [a[0] * k, a[1] * k], len2 = a => Math.hypot(a[0], a[1]) || 1, dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
    const unit2 = a => mul2(a, 1 / len2(a));
    const f1 = n => (Math.round(n * 10) / 10).toString();
    /* if a move has no drawn pose at all: a gentle standing march in time with the clock */
    function genericJoints(t) {
        const ph = Math.sin(t * Math.PI * 2 / 1.2), up = Math.max(0, ph), dn = Math.max(0, -ph);
        const leg = (k, o) => { const hp = [96 + o[0], 102 + o[1]], knee = add2(hp, [Math.sin(k * 1.1) * 40, Math.cos(k * 1.1) * 40]), ank = add2(knee, [0, 40]); return { hp, knee, ank, heel: add2(ank, [-4, 0]), toe: add2(ank, [15, 0]) }; };
        const arm = (k, o) => { const sp = [96 + o[0], 54 + o[1]], elb = add2(sp, [Math.sin(k) * 26, Math.cos(k) * 26]); return { sp, elb, wr: add2(elb, [Math.sin(k + 0.9) * 24, Math.cos(k + 0.9) * 24]), db: false }; };
        const n = Object.assign(leg(up, [0, 0]), arm(dn * 0.7, [0, 0])), f = Object.assign(leg(dn, [-5, -1.5]), arm(up * 0.7, [-5, -1.5]));
        return { hip: [96, 102], sh: [96, 54], hd: [99, 37], n, f };
    }
    const num = (el, a) => +el.getAttribute(a) || 0;
    function readJoints(svg) {
        const t = svg.querySelector('.mv-body .torso') || svg.querySelector('line.torso');
        if (!t || !t.getAttribute('x1') || !t.getAttribute('y2')) return null;
        const P = (el, a, b) => el ? [num(el, a), num(el, b)] : null;
        const J = { hip: P(t, 'x1', 'y1'), sh: P(t, 'x2', 'y2') };
        const hc = svg.querySelector('.mv-body .head');
        J.hd = hc && hc.getAttribute('cx') ? P(hc, 'cx', 'cy') : add2(J.sh, mul2(unit2(sub2(J.sh, J.hip)), 17));
        for (const s of ['f', 'n']) {
            const g = svg.querySelector('.mv-side.mv-' + s); if (!g) return null;
            const L = k => g.querySelector('line.' + k), th = L('thigh'), sn = L('shin'), ft = L('foot'), ua = L('ua'), fa = L('fa'), db = g.querySelector('.db');
            if (!th || !sn || !ft || !ua || !fa || !th.getAttribute('x2')) return null;
            J[s] = { hp: P(th, 'x1', 'y1'), knee: P(th, 'x2', 'y2'), ank: P(sn, 'x2', 'y2'), heel: P(ft, 'x1', 'y1'), toe: P(ft, 'x2', 'y2'),
                sp: P(ua, 'x1', 'y1'), elb: P(ua, 'x2', 'y2'), wr: P(fa, 'x2', 'y2'), db: !!(db && db.getAttribute('visibility') === 'visible') };
        }
        return J;
    }
    /* a closed Catmull-Rom curve through the points, as smooth cubic segments */
    function blob(pts) {
        const n = pts.length, P = i => pts[(i + n) % n];
        let d = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
        for (let i = 0; i < n; i++) {
            const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
            const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
            d += 'C' + f1(c1[0]) + ' ' + f1(c1[1]) + ' ' + f1(c2[0]) + ' ' + f1(c2[1]) + ' ' + f1(p2[0]) + ' ' + f1(p2[1]);
        }
        return d + 'Z';
    }
    /* side profile of a person, facing +v; u runs from the hip joint (0) to the shoulder joint (1) */
    const TORSO = [[8, -0.1], [9.6, 0.15], [8.4, 0.4], [10.4, 0.58], [12, 0.74], [10.2, 0.9], [4.6, 1.04], [-3, 1.08], [-9.8, 0.95],
        [-11, 0.76], [-8.6, 0.52], [-8.2, 0.32], [-12, 0.1], [-10.4, -0.1], [-4.6, -0.22], [3, -0.2]];
    /* the head in profile (units, u up from its centre, v forward): crown, brow, a soft nose, chin, jaw, back of the head */
    const HEAD = [[0, 1], [0.68, 0.74], [0.93, 0.28], [1.05, -0.06], [0.92, -0.3], [0.86, -0.56], [0.55, -0.88], [0.05, -0.83], [-0.55, -0.7],
        [-0.96, -0.12], [-0.8, 0.55]];
    /* the body's axes: a = up the spine, fr = the way the chest faces (down on hands and knees) */
    function frameOf(J, stage) {
        const a = unit2(sub2(J.sh, J.hip));
        let fr = [-a[1], a[0]];
        if (stage === 'mat') fr = mul2(fr, -1);
        return { a, fr };
    }
    function torsoPts(J, F) {
        const L = len2(sub2(J.sh, J.hip));
        return TORSO.map(q => add2(J.hip, add2(mul2(F.a, q[1] * L), mul2(F.fr, q[0]))));
    }
    function headPts(J, F) {
        const up = unit2(sub2(J.hd, J.sh)), fw = dot2([-up[1], up[0]], F.fr) >= 0 ? [-up[1], up[0]] : [up[1], -up[0]];
        return { up, fw, pts: HEAD.map(q => add2(J.hd, add2(mul2(up, q[1] * HEAD_U), mul2(fw, q[0] * HEAD_V)))) };
    }
    /* a foot in profile: heel, sole, toes, the top of the foot up to the ankle (toes along heel->toe, sole away from the shin) */
    function footPts(q) {
        const dir = unit2(sub2(q.toe, q.heel));
        let sole = [-dir[1], dir[0]];
        if (dot2(sole, sub2(q.ank, q.knee)) < 0) sole = mul2(sole, -1);
        const P = (x, y) => add2(q.ank, add2(mul2(dir, x), mul2(sole, y)));
        return [P(-4.6, 2.9), P(4, 3.6), P(13.6, 3.2), P(15.4, 1.6), P(14, -0.4), P(7, -2.4), P(2.4, -4.4), P(-3.4, -3.6), P(-5.6, -0.2)];
    }
    const pathOf = pts => 'M' + pts.map(q => f1(q[0]) + ' ' + f1(q[1])).join('L');
    /* a soft highlight along the upper-left side of a segment, like light on glass */
    function shineOf(A, B, w) {
        const dv = sub2(B, A), l = len2(dv); if (l < 3) return '';
        let nrm = [-dv[1] / l, dv[0] / l]; if (dot2(nrm, [-0.6, -0.8]) < 0) nrm = mul2(nrm, -1);
        const o = mul2(nrm, w * 0.24), s0 = add2(add2(A, mul2(dv, 0.16)), o), s1 = add2(add2(A, mul2(dv, 0.7)), o);
        return 'M' + f1(s0[0]) + ' ' + f1(s0[1]) + 'L' + f1(s1[0]) + ' ' + f1(s1[1]);
    }
    /* one limb: glow (only drawn for the working part), rims, then fills, then one core line and the shine */
    const LEG_HTML = '<path class="mph-glow mph-thigh"/><path class="mph-glow mph-shin"/><path class="mph-glow mph-footg"/>' +
        '<path class="mph-rim mph-thigh"/><path class="mph-rim mph-shin"/><path class="mph-frim mph-foot"/>' +
        '<path class="mph-fill mph-thigh"/><path class="mph-fill mph-shin"/><path class="mph-ffill mph-foot"/>' +
        '<path class="mph-core mph-leg-core"/><path class="mph-shine"/>';
    const ARM_HTML = '<path class="mph-glow mph-ua"/><path class="mph-glow mph-fa"/>' +
        '<path class="mph-rim mph-ua"/><path class="mph-rim mph-fa"/><ellipse class="mph-frim mph-hand" cx="2.4" rx="4.8" ry="3.7"/>' +
        '<path class="mph-fill mph-ua"/><path class="mph-fill mph-fa"/><ellipse class="mph-ffill mph-hand" cx="2.4" rx="4.8" ry="3.7"/>' +
        '<path class="mph-core mph-arm-core"/><path class="mph-shine"/>' +
        '<g class="mph-db"><path class="mph-db-bar" d="M2.4 -9.5V9.5"/><rect class="mph-db-plate" x="-1.2" y="-13.5" width="7.2" height="5" rx="1.8"/><rect class="mph-db-plate" x="-1.2" y="8.5" width="7.2" height="5" rx="1.8"/></g>';
    const BODY_HTML = '<path class="mph-glow mph-torso"/>' +
        '<path class="mph-rim mph-torso"/><path class="mph-rim mph-neck"/><path class="mph-rim mph-head"/>' +
        '<path class="mph-fill mph-torso"/><path class="mph-fill mph-neck"/><path class="mph-fill mph-head"/>' +
        '<path class="mph-core mph-torso-core"/><path class="mph-core mph-head-core"/><circle class="mph-heart" r="5.4"/>' +
        '<path class="mph-shine mph-body-shine"/>';
    let S = null;   /* the current player's figure state */
    const CUR = { stage: 'stand', pose: 'generic', id: '', base: '' };   /* the block being played, kept across rebuilds */
    function build(svg) {
        if (!svg || svg.querySelector('.mph')) return;
        svg.classList.add('mp-fig', 'mph-on');
        const g = D.createElementNS(NS, 'g'); g.setAttribute('class', 'mph'); g.setAttribute('aria-hidden', 'true');
        g.innerHTML = '<defs>' +
            '<radialGradient id="mpHalo"><stop offset="0" style="stop-color:var(--mp-a,#9ff7ff);stop-opacity:.3"/><stop offset=".6" style="stop-color:#5ab8ff;stop-opacity:.1"/><stop offset="1" style="stop-color:#5ab8ff;stop-opacity:0"/></radialGradient>' +
            '<radialGradient id="mphPlat" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#bdf3ff" stop-opacity=".55"/><stop offset=".55" stop-color="#4fb4ff" stop-opacity=".22"/><stop offset="1" stop-color="#1a5fc0" stop-opacity=".06"/></radialGradient>' +
            '<radialGradient id="mphNuc"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".35" stop-color="#bff4ff" stop-opacity=".6"/><stop offset="1" stop-color="#5fd2ff" stop-opacity="0"/></radialGradient>' +
            '<linearGradient id="mphGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8e9ff" stop-opacity=".34"/><stop offset="1" stop-color="#2a6fd0" stop-opacity=".16"/></linearGradient>' +
            '<filter id="mpHotF" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.2"/></filter>' +
            '</defs>' +
            '<g class="mph-prop"></g>' +
            '<ellipse class="mph-shadow" rx="30" ry="4"/>' +
            '<ellipse class="mp-halo" rx="64" ry="64" fill="url(#mpHalo)"/>' +
            '<g class="mph-limb mph-leg mph-f" data-p="leg">' + LEG_HTML + '</g>' +
            '<g class="mph-limb mph-arm mph-f" data-p="arm">' + ARM_HTML + '</g>' +
            '<g class="mph-body">' + BODY_HTML + '</g>' +
            '<g class="mph-limb mph-leg mph-n" data-p="leg">' + LEG_HTML + '</g>' +
            '<g class="mph-limb mph-arm mph-n" data-p="arm">' + ARM_HTML + '</g>';
        svg.appendChild(g);
        const q = sel => g.querySelector(sel);
        const parts = el => { const o = {}; el.querySelectorAll('path, ellipse, g.mph-db').forEach(n => { const k = n.getAttribute('class').replace(/^mph-/, '').replace(/ mph-/g, '.'); o[k] = n; }); return o; };
        S = { svg, g, prop: q('.mph-prop'), shadow: q('.mph-shadow'), halo: q('.mp-halo'), body: parts(q('.mph-body')), heart: q('.mph-heart'),
            leg: { n: parts(q('.mph-leg.mph-n')), f: parts(q('.mph-leg.mph-f')) }, arm: { n: parts(q('.mph-arm.mph-n')), f: parts(q('.mph-arm.mph-f')) },
            armG: { n: q('.mph-arm.mph-n'), f: q('.mph-arm.mph-f') },
            zone: '', floor: 188, box: null, vb: null, last: 0, smooth: null, t0: performance.now(), colours: mistyColours() };
        const pl = svg.closest('#mv-player'); if (pl) { pl.style.setProperty('--mp-a', S.colours.a); pl.style.setProperty('--mp-b', S.colours.b); }
    }
    /* the player's accent colours (halo, chips) stay as they were; the figure itself is always the app's blue liquid glass */
    function mistyColours() {
        const live = D.querySelector('#spBubble svg.tmg-plant');
        let a = '', b = '';
        if (live) { const cs = live.style; a = cs.getPropertyValue('--tmg-a').trim(); b = cs.getPropertyValue('--tmg-b').trim(); }
        return { a: a || '#9ff7ff', b: b || '#c9a6ff' };
    }
    function props(stage, J0) {
        /* the glass under the person; positions come from the block's first frames so they never wobble */
        let h = '';
        if (stage === 'stand') {
            S.floor = 188;
            h = '<ellipse class="mph-plat" cx="98" cy="190" rx="52" ry="9"/><ellipse class="mph-plat-rim" cx="98" cy="188.6" rx="52" ry="8"/>' +
                '<ellipse class="mph-belt" cx="98" cy="188.6" rx="40" ry="5.6"/><ellipse class="mph-plat-core" cx="98" cy="188.6" rx="22" ry="3.2"/>';
        } else if (stage === 'seat') {
            const top = 137.6, fl = 172, x = 93;   /* the seated hip of every chair move sits at y 128 (see Figure.draw) */
            S.floor = fl;
            h = '<ellipse class="mph-plat" cx="' + f1(x + 14) + '" cy="' + f1(fl + 2) + '" rx="56" ry="8.5"/><ellipse class="mph-plat-rim" cx="' + f1(x + 14) + '" cy="' + f1(fl + 0.6) + '" rx="56" ry="7.6"/>' +
                '<rect class="mph-pouf" x="' + f1(x - 23) + '" y="' + f1(top) + '" width="46" height="' + f1(Math.max(8, fl - top + 1)) + '" rx="9"/>' +
                '<path class="mph-pouf-shine" d="M' + f1(x - 17) + ' ' + f1(top + 3.4) + 'h28"/>';
        } else if (stage === 'bed') {
            const fl = CUR.base === 'bedsit' ? Math.max(J0.low - 2.4, J0.legLow) : J0.low - 0.6;
            S.floor = fl;
            h = '<rect class="mph-bed" x="16" y="' + f1(fl) + '" width="182" height="13" rx="6.5"/><path class="mph-pouf-shine" d="M24 ' + f1(fl + 3.4) + 'h166"/>' +
                '<ellipse class="mph-plat" cx="106" cy="' + f1(fl + 18) + '" rx="92" ry="7"/>' +
                (CUR.base === 'bedsit' ? '' : '<rect class="mph-pillow" x="22" y="' + f1(fl - 7.5) + '" width="40" height="9" rx="4.5"/>');
        } else {
            const fl = J0.contact;
            S.floor = fl;
            h = '<rect class="mph-mat" x="30" y="' + f1(fl) + '" width="166" height="6" rx="3"/><ellipse class="mph-plat" cx="112" cy="' + f1(fl + 8) + '" rx="84" ry="6"/>';
        }
        S.prop.innerHTML = h;
    }
    const SET = (el, k, v) => { if (el && el.__v !== v) { el.__v = v; el.setAttribute(k, v); } };
    function frame(P) {
        if (!S || !S.svg.isConnected) { const svg = D.getElementById('mv-fig'); if (!svg) return; S = null; build(svg); if (!S) return; }
        const now = performance.now(), dt = Math.min(0.1, (now - (S.last || now)) / 1000); S.last = now;
        const tSec = (now - S.t0) / 1000, rm = reduced();
        let J = readJoints(S.svg), stage = CUR.stage || 'stand';
        if (!J) { J = genericJoints(tSec); if (stage !== 'stand') { stage = 'stand'; S.stageSet = false; } }
        /* reduced motion: the body drifts gently towards each pose instead of pumping */
        if (rm) {
            const k = 1 - Math.exp(-dt / 0.9), sm = S.smooth;
            if (sm && sm.stage === stage) {
                const mix = (x, y) => [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k];
                const out = { hip: mix(sm.hip, J.hip), sh: mix(sm.sh, J.sh), hd: mix(sm.hd, J.hd) };
                for (const s of ['n', 'f']) { out[s] = {}; for (const key in J[s]) out[s][key] = Array.isArray(J[s][key]) ? mix(sm[s][key], J[s][key]) : J[s][key]; }
                J = out;
            }
            J.stage = stage; S.smooth = J;
        } else S.smooth = null;
        const F = frameOf(J, stage);
        const sole = q => Math.max(q.heel[1], q.toe[1]) + 3.4;
        if (!S.stageSet && (S.warm || 0) >= 2) {
            const tl = torsoPts(J, F);
            props(stage, { hip: J.hip, sh: J.sh, sole: Math.max(sole(J.n), sole(J.f)), low: Math.max.apply(0, tl.map(q => q[1])),
                legLow: Math.max(J.n.knee[1] + WD.thigh / 2, J.n.ank[1] + WD.shin / 2),
                contact: Math.max(J.n.knee[1] + WD.thigh / 2, J.n.wr[1] + 3.8, J.f.knee[1] + WD.thigh / 2) });
            S.stageSet = true;
        }
        /* weight on the ground: on the platform the planted foot stays on the glass */
        const dy = stage === 'stand' ? S.floor - Math.max(sole(J.n), sole(J.f)) : 0;
        const sh = pt => [pt[0], pt[1] + dy];
        const Jd = { hip: sh(J.hip), sh: sh(J.sh), hd: sh(J.hd) };
        /* torso, neck, head */
        const B = S.body, tp = torsoPts(Jd, F), torsoD = blob(tp), hp = headPts(Jd, F), headD = blob(hp.pts);
        const neckA = add2(Jd.sh, mul2(F.a, 2)), neckB = add2(Jd.hd, add2(mul2(hp.up, -HEAD_U * 0.62), mul2(hp.fw, -HEAD_V * 0.18)));
        const neckD = pathOf([neckA, neckB]);
        for (const k of ['glow.torso', 'rim.torso', 'fill.torso']) SET(B[k], 'd', torsoD);
        SET(B['rim.neck'], 'd', neckD); SET(B['fill.neck'], 'd', neckD);
        SET(B['rim.head'], 'd', headD); SET(B['fill.head'], 'd', headD);
        const L = len2(sub2(Jd.sh, Jd.hip)), AT = (u, v) => add2(Jd.hip, add2(mul2(F.a, u * L), mul2(F.fr, v)));
        SET(B['core.torso-core'], 'd', blob([AT(0.1, 0.6), AT(0.42, 2.2), AT(0.74, 3.6), AT(0.9, 0.6), AT(0.74, -3.2), AT(0.42, -2.4)]));
        SET(B['core.head-core'], 'd', blob([0, 1, 2, 3, 4, 5].map(i => { const an = i * Math.PI / 3; return add2(Jd.hd, add2(mul2(hp.up, Math.cos(an) * HEAD_U * 0.5 + 1), mul2(hp.fw, Math.sin(an) * HEAD_V * 0.45))); })));
        const heart = AT(0.7, 2.6);
        SET(S.heart, 'cx', f1(heart[0])); SET(S.heart, 'cy', f1(heart[1]));
        /* light on the glass: the back of the head and the upper back */
        const hs = i => hp.pts[i], bs0 = AT(0.95, -6.2), bs1 = AT(0.55, -6.4);
        SET(B['shine.body-shine'], 'd', 'M' + f1(hs(10)[0] * 0.8 + Jd.hd[0] * 0.2) + ' ' + f1(hs(10)[1] * 0.8 + Jd.hd[1] * 0.2) + 'Q' + f1(hs(0)[0] * 0.82 + Jd.hd[0] * 0.18) + ' ' + f1(hs(0)[1] * 0.82 + Jd.hd[1] * 0.18) + ' ' + f1(hs(1)[0] * 0.8 + Jd.hd[0] * 0.2) + ' ' + f1(hs(1)[1] * 0.8 + Jd.hd[1] * 0.2) +
            'M' + f1(bs0[0]) + ' ' + f1(bs0[1]) + 'L' + f1(bs1[0]) + ' ' + f1(bs1[1]));
        /* arms and legs at full length, straight from the solved joints */
        for (const s of ['n', 'f']) {
            const q0 = J[s], q = {}; for (const k in q0) q[k] = Array.isArray(q0[k]) ? sh(q0[k]) : q0[k];
            const G = S.leg[s], A = S.arm[s];
            const th = pathOf([q.hp, q.knee]), sn = pathOf([q.knee, q.ank]), ft = blob(footPts(q));
            for (const k of ['glow', 'rim', 'fill']) { SET(G[k + '.thigh'], 'd', th); SET(G[k + '.shin'], 'd', sn); }
            SET(G['glow.footg'], 'd', ft); SET(G['frim.foot'], 'd', ft); SET(G['ffill.foot'], 'd', ft);
            SET(G['core.leg-core'], 'd', pathOf([q.hp, q.knee, q.ank]));
            SET(G['shine'], 'd', shineOf(q.hp, q.knee, WD.thigh) + shineOf(q.knee, q.ank, WD.shin) || 'M0 0');
            const ua = pathOf([q.sp, q.elb]), fa = pathOf([q.elb, q.wr]);
            for (const k of ['glow', 'rim', 'fill']) { SET(A[k + '.ua'], 'd', ua); SET(A[k + '.fa'], 'd', fa); }
            SET(A['core.arm-core'], 'd', pathOf([q.sp, q.elb, q.wr]));
            SET(A['shine'], 'd', shineOf(q.sp, q.elb, WD.ua) + shineOf(q.elb, q.wr, WD.fa) || 'M0 0');
            const fv = sub2(q.wr, q.elb), fang = Math.atan2(fv[1], fv[0]) * 180 / Math.PI;
            const ht = 'translate(' + f1(q.wr[0]) + ' ' + f1(q.wr[1]) + ') rotate(' + f1(fang) + ')';
            SET(A['frim.hand'], 'transform', ht); SET(A['ffill.hand'], 'transform', ht); SET(A['db'], 'transform', ht);
            S.armG[s].classList.toggle('mph-has-db', !!q.db);
        }
        const chest = AT(0.55, 0);
        SET(S.halo, 'cx', f1(chest[0])); SET(S.halo, 'cy', f1(chest[1] + 4));
        if (stage === 'stand' || stage === 'seat') {
            SET(S.shadow, 'cx', f1(Jd.hip[0] + (stage === 'seat' ? 12 : 2))); SET(S.shadow, 'cy', f1(S.floor + 0.6)); S.shadow.removeAttribute('visibility');
        } else SET(S.shadow, 'visibility', 'hidden');
        /* frame the whole person big in the stage: the camera fits the space this move uses, then holds still */
        const xs = [], ys = [];
        const pt = p2 => { xs.push(p2[0]); ys.push(p2[1]); };
        tp.forEach(pt); hp.pts.forEach(pt);
        for (const s of ['n', 'f']) for (const k of ['knee', 'ank', 'toe', 'heel', 'elb', 'wr']) { const p2 = sh(J[s][k]); xs.push(p2[0] - 7, p2[0] + 7); ys.push(p2[1] - 7, p2[1] + 7); }
        ys.push(S.floor + 8);
        if (stage === 'stand') xs.push(48, 148);
        if ((S.warm = (S.warm || 0) + 1) < 3) return;   /* the first frames of a block still show the last move */
        const bx = [Math.min.apply(0, xs) - 3, Math.min.apply(0, ys) - 3, Math.max.apply(0, xs) + 3, Math.max.apply(0, ys)];
        S.box = S.box ? [Math.min(S.box[0], bx[0]), Math.min(S.box[1], bx[1]), Math.max(S.box[2], bx[2]), Math.max(S.box[3], bx[3])] : bx;
        fit(dt, rm);
    }
    function fit(dt, rm) {
        const b = S.box; if (!b) return;
        const rect = S.svg.getBoundingClientRect(), asp = rect.width > 10 && rect.height > 10 ? rect.width / rect.height : 1;
        let w = b[2] - b[0] + 8, h = b[3] - b[1] + 6, cx = (b[0] + b[2]) / 2;
        h = Math.max(h, 120); w = Math.max(w, 120);
        if (w / h > asp) h = w / asp; else w = h * asp;
        const tgt = [cx - w / 2, b[3] + 3 - h, w, h];
        if (!S.vb || rm) S.vb = tgt.slice();
        else { const k = 1 - Math.exp(-dt / 0.45); for (let i = 0; i < 4; i++) S.vb[i] += (tgt[i] - S.vb[i]) * k; }
        const v = S.vb.map(n => n.toFixed(1)).join(' ');
        if (v !== S.vbs) { S.vbs = v; S.svg.setAttribute('viewBox', v); }
    }
    function setZone(z) {
        if (!S) { const svg = D.getElementById('mv-fig'); if (svg) build(svg); }
        if (S) {
            if (S.zone) S.svg.classList.remove('mp-z-' + S.zone);
            S.zone = z; S.svg.classList.add('mp-z-' + z);
            const parts = (ZONE[z] || ZONE.all).p;
            ['thigh', 'shin', 'foot', 'ua', 'fa', 'torso', 'heart'].forEach(p => S.svg.classList.toggle('mp-g-' + p, parts.indexOf(p) >= 0));
        }
        const chip = D.getElementById('mp-zone');
        if (chip) {
            const b = chip.querySelector('b'); const txt = zoneLabel(z);
            if (b && b.textContent !== txt) { b.textContent = txt; chip.classList.remove('mp-pop'); void chip.offsetWidth; chip.classList.add('mp-pop'); }
            chip.dataset.zone = z; chip.hidden = z === 'rest';
        }
    }
    function block(P, b, m, isRest) {
        const id = b && b.move, stage = stageOf(m), pose = isRest && stage !== 'stand' ? 'rest' : poseOf(id, m);
        CUR.stage = stage; CUR.pose = pose; CUR.id = id || ''; CUR.base = (m && m.base) || '';
        if (!S) { const svg = D.getElementById('mv-fig'); if (svg) build(svg); }
        if (S) { S.stageSet = false; S.box = null; S.warm = 0; S.floor = ({ stand: 188, bed: 151, mat: 154 })[stage] || S.floor || 172; S.smooth = null; S.svg.dataset.pose = pose; S.svg.dataset.stage = stage; }
        setZone(zoneOf(id, m, isRest ? 'rest' : (b && b.type)));
        const pl = D.getElementById('mv-player'); if (pl && b) { pl.dataset.mpType = b.type || ''; pl.dataset.mpStage = stage; pl.dataset.mpPose = pose; }
    }

    /* ---------- IN YOUR BODY: glow the pill instead of covering the workout ---------- */
    function peek() {
        const w = D.getElementById('mv-bodywrap'); if (!w) return;
        w.classList.remove('mp-new'); void w.offsetWidth; w.classList.add('mp-new');
        clearTimeout(peek.t); peek.t = setTimeout(() => { const x = D.getElementById('mv-bodywrap'); if (x) x.classList.remove('mp-new'); }, 12000);
    }
    const quiet = () => !!D.querySelector('#mv-player.mp');

    /* ---------- the world behind the player ---------- */
    let via = '', saved = null, glideRaf = 0;
    function rigNow() { try { const WH = W.LowiWorldHome; return WH && WH.rig ? WH.rig() : null; } catch (e) { return null; } }
    function glide(to, pitch, ms) {
        const r = rigNow(); if (!r) return;
        if (glideRaf) cancelAnimationFrame(glideRaf);
        try { const st = W.LowiWorldHome.state; if (st && st.zoomAnim) st.zoomAnim = null; } catch (e) { }
        if (!ms || reduced()) { r.dist = to; if (pitch != null) r.pitch = pitch; glideRaf = 0; return; }
        const d0 = Math.log(Math.max(0.01, r.dist)), d1 = Math.log(Math.max(0.01, to)), p0 = r.pitch, t0 = performance.now();
        const step = now => {
            const k = Math.min(1, (now - t0) / ms), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
            const rr = rigNow(); if (!rr || rr.mode !== 'home') { glideRaf = 0; return; }
            rr.dist = Math.exp(d0 + (d1 - d0) * e); if (pitch != null) rr.pitch = p0 + (pitch - p0) * e; rr.idle = 0;
            glideRaf = k < 1 ? requestAnimationFrame(step) : 0;
        };
        glideRaf = requestAnimationFrame(step);
    }
    function worldEnter() {
        via = ''; saved = null;
        /* the shared living-world layer, once it exists, owns this */
        try { if (W.LowiLivingWorld && W.LowiLivingWorld.enter && W.LowiLivingWorld.enter('move-player') !== false) { via = 'layer'; H.classList.add('mp-world'); return via; } } catch (e) { }
        /* until then: the live 3D world that already sits behind every page (#bw3Back) flies out into the spirit world */
        const r = rigNow();
        if (r && r.mode === 'home' && (H.classList.contains('wb-on') || D.querySelector('#bw3Stage canvas'))) {
            saved = { dist: r.dist, pitch: r.pitch };
            const far = Math.max(r.maxD || 20, (r.outerD || 300) * 0.45);   /* the Community view: her world bubble and its neighbours */
            glide(far, 0.3, 2100);
            via = 'camera'; H.classList.add('mp-world');
            return via;
        }
        via = 'css'; H.classList.add('mp-world', 'mp-noworld');   /* no live world (no WebGL): a soft drawn spirit-world glow */
        return via;
    }
    function worldLeave() {
        H.classList.remove('mp-world', 'mp-noworld');
        if (via === 'layer') { try { W.LowiLivingWorld.leave && W.LowiLivingWorld.leave('move-player'); } catch (e) { } }
        else if (via === 'camera' && saved) {
            const t = D.querySelector('.tab.active');
            /* if the player was closed onto Community the world is meant to stay out there */
            if (!(t && t.id === 'tab-foryou')) glide(saved.dist, saved.pitch, 1500);
        }
        via = ''; saved = null;
    }

    /* ---------- open / close ---------- */
    let outT = 0;
    function open(el) {
        if (!el) return;
        clearTimeout(outT);
        el.classList.add('mp'); el.classList.remove('mp-out');
        el.classList.toggle('mp-rm', reduced());
        S = null; build(D.getElementById('mv-fig'));
        H.classList.add('mp-on');
        worldEnter();
        /* next frame: start the warp-in */
        el.classList.remove('mp-in'); void el.offsetWidth;
        requestAnimationFrame(() => el.classList.add('mp-in'));
    }
    function close(el) {
        el = el || D.getElementById('mv-player');
        const was = H.classList.contains('mp-on');
        H.classList.remove('mp-on');
        if (was) { H.classList.add('mp-back'); clearTimeout(close.t); close.t = setTimeout(() => H.classList.remove('mp-back'), 700); }
        if (el && el.classList.contains('mp')) {
            el.classList.add('mp-out'); el.classList.remove('mp-in');
            clearTimeout(outT); outT = setTimeout(() => { el.classList.remove('mp-out'); }, 700);
        }
        worldLeave();
        S = null;
    }
    W.LowiMovePlayer = { open, close, frame, block, peek, quiet, zoneOf, zoneLabel, ZONE, MOVE_ZONE, POSE, poseOf, stageOf, readJoints, figure: { frameOf, torsoPts, headPts, footPts, blob, genericJoints }, state: () => ({ via, saved, zone: S ? S.zone : '', figure: S ? 'human' : '', pose: CUR.pose, stage: CUR.stage }) };
})();
