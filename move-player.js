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
   - Misty's workout body: Misty's own Home artwork (cloned live, so her face, colours, form and mood are exactly hers) rides on
     a temporary body of light. The limbs are the same kinematics the player always used (every move keeps its exact motion),
     drawn as glowing glass tubes with a bright core. The body parts the move works glow warm and pulse, and a small glass chip
     names them ("Working: Biceps").
   - quiet education: a new IN YOUR BODY step no longer pops a big card over the workout; the glass pill glows and updates and the
     QUICK FUEL card opens when you tap it.
   Reduced motion: no camera glide, no pulsing, Misty stands still between frames the player draws (the player itself already
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

    /* ---------- Misty's head: her own live Home artwork ---------- */
    let artSeq = 0;
    function liveArt() {
        const live = D.querySelector('#spBubble .sp-home-herb svg.tmg-plant') || D.querySelector('#spBubble svg.tmg-plant') || D.querySelector('svg.tmg-plant.cw-cell');
        if (live) return live.cloneNode(true);
        try {
            const H2 = W.LowiHerbTamagotchi, c = H2 && H2.current && H2.current();
            if (c && H2.plantHTML) { const box = D.createElement('div'); box.innerHTML = H2.plantHTML(c.m, 'preview', c.p, { label: 'Misty' }); const s = box.querySelector('svg'); if (s) return s; }
        } catch (e) { }
        return null;
    }
    /* ids are renamed (and every url(#id) / href with them) so the copy never fights the original for its gradients */
    function uniq(svg) {
        const pre = 'mpm' + (++artSeq) + '-', map = {};
        svg.querySelectorAll('[id]').forEach(n => { map[n.id] = pre + n.id; n.id = pre + n.id; });
        const fix = v => v.replace(/url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)/g, (a, id) => map[id] ? 'url(#' + map[id] + ')' : a);
        svg.querySelectorAll('*').forEach(n => {
            for (const a of Array.from(n.attributes)) {
                if (a.value.indexOf('url(') >= 0) n.setAttribute(a.name, fix(a.value));
                else if ((a.name === 'href' || a.name === 'xlink:href') && a.value[0] === '#' && map[a.value.slice(1)]) n.setAttribute(a.name, '#' + map[a.value.slice(1)]);
            }
        });
        return svg;
    }
    function fallbackArt() {
        /* only if Misty's artwork is not on the page at all: a plain bubble in her membrane colours with her two eyes and a smile */
        const s = D.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '50 78 160 160');
        s.innerHTML = '<circle cx="130" cy="158" r="62" fill="rgba(28,247,249,.16)" stroke="#1cf7f9" stroke-width="4"/><circle cx="130" cy="150" r="30" fill="rgba(197,13,221,.35)"/>' +
            '<circle cx="112" cy="160" r="7" fill="#0b1d3f"/><circle cx="148" cy="160" r="7" fill="#0b1d3f"/><path d="M116 182 q14 12 28 0" fill="none" stroke="#0b1d3f" stroke-width="5" stroke-linecap="round"/>';
        return s;
    }
    function mistyHead() {
        let s = liveArt(), own = true;
        if (!s) { s = fallbackArt(); own = false; }
        if (own) uniq(s);
        s.removeAttribute('role'); s.removeAttribute('aria-label'); s.setAttribute('aria-hidden', 'true');
        s.querySelectorAll('.cw-stars, .lh-reflection, .lh-pot, .cw-dock, .lh-care-fx, .lh-acc, .lh-pot-fx, .cw-pill, title').forEach(n => n.remove());
        /* her cell sits at 130,158 (r 64) in her own drawing; frame just the cell so the face reads at workout size */
        s.setAttribute('viewBox', '58 86 144 144');
        s.setAttribute('x', '-21'); s.setAttribute('y', '-21'); s.setAttribute('width', '42'); s.setAttribute('height', '42');
        s.setAttribute('overflow', 'visible');
        s.style.cssText = 'width:42px;height:42px;overflow:visible';
        s.classList.add('mp-misty');
        return { svg: s, own };
    }
    function mistyColours() {
        const live = D.querySelector('#spBubble svg.tmg-plant');
        let a = '', b = '';
        if (live) { const cs = live.style; a = cs.getPropertyValue('--tmg-a').trim(); b = cs.getPropertyValue('--tmg-b').trim(); }
        return { a: a || '#9ff7ff', b: b || '#c9a6ff' };
    }

    /* ---------- Misty with limbs (Oct 16) ----------
       Her own bubble is the body. Short, glossy jelly arms and legs in her own glass, mitten hands and little sneakers
       are rigged at shoulder/elbow and hip/knee. They read the joints the workout's move clock already solves, so every
       rep stays in time with the exercise; we only re-root them on her bubble and shorten them to her proportions.
       Everything is drawn in code: no picture assets. */
    const POSE = {
        soleus: 'heel-raise', march_slow: 'march', march: 'march', toeraise: 'toe-lift', legext: 'leg-extension',
        punch: 'punch', curl: 'bicep-curl', press: 'overhead-press', frontraise: 'front-raise', reach_slow: 'reach', rest_seat: 'rest',
        walk_easy: 'walk', walk_brisk: 'brisk-walk', walk_cool: 'walk', walk_curl: 'walk-curl', walk_punch: 'walk-punch', walk_raise: 'walk-raise',
        ankle_pump: 'ankle-pump', bridge: 'glute-bridge', heel_slide: 'heel-slide', leg_raise: 'leg-raise', bed_march: 'lying-march',
        chest_press: 'chest-press', pullover: 'overhead-reach', bed_reach: 'reach', bed_breath: 'breathing', rest_bed: 'rest',
        knee_hug: 'knee-hug', lying_twist: 'twist', pelvic_tilt: 'glute-bridge', dead_bug: 'dead-bug', clam: 'clam', side_leg: 'side-leg-raise',
        cat_cow: 'cat-cow', child_pose: 'stretch', neck_roll: 'stretch', shoulder_roll: 'shoulder-roll', sit_stand: 'squat', seat_twist: 'twist'
    };
    /* where she does it: a glass platform (standing), a glass pouf (seated), a glass bed (lying), a mat (hands and knees) */
    const STAGE = { walk: 'stand', seat: 'seat', bedsit: 'seat', bed: 'bed', quad: 'mat' };
    function poseOf(id, m) { return POSE[id] || (m && m.base === 'walk' ? 'walk' : m && m.base === 'bed' ? 'lying-march' : 'generic'); }
    function stageOf(m) { return STAGE[m && m.base] || 'stand'; }
    const R = 30;              /* her bubble radius in figure units (the old torso was 48 long) */
    const ARM = 0.62, LEG = 0.48, FOOT = 0.8;   /* jelly limbs: short and chunky, like the rest of her */
    const AW = 9.5, LW = 11.5;  /* limb thickness */
    const v2 = (x, y) => [x, y], add2 = (a, b) => [a[0] + b[0], a[1] + b[1]], sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
    const mul2 = (a, k) => [a[0] * k, a[1] * k], len2 = a => Math.hypot(a[0], a[1]) || 1, dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
    const f1 = n => (Math.round(n * 10) / 10).toString();
    /* 2-joint IK (squats keep the sneakers planted while the bubble rises) */
    function ik2(root, target, l1, l2, fwd) {
        const d = sub2(target, root), dl = Math.min(len2(d), l1 + l2 - 0.01);
        const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dl * dl - l2 * l2) / (2 * l1 * dl))));
        const base = Math.atan2(d[1], d[0]), s = fwd ? -1 : 1;
        return add2(root, [Math.cos(base + s * a) * l1, Math.sin(base + s * a) * l1]);
    }
    /* if a move has no drawn pose at all: a gentle standing march in time with the clock */
    function genericJoints(t) {
        const ph = Math.sin(t * Math.PI * 2 / 1.2), up = Math.max(0, ph), dn = Math.max(0, -ph);
        const leg = (k, o) => { const knee = add2([96 + o[0], 102 + o[1]], [Math.sin(k * 1.1) * 40, Math.cos(k * 1.1) * 40]); return { knee, ank: add2(knee, [0, 40]), heel: add2(knee, [-4, 40]), toe: add2(knee, [15, 40]) }; };
        const arm = (k, o) => { const elb = add2([96 + o[0], 54 + o[1]], [Math.sin(k) * 26, Math.cos(k) * 26]); return { elb, wr: add2(elb, [Math.sin(k + 0.9) * 24, Math.cos(k + 0.9) * 24]) }; };
        const n = Object.assign(leg(up, [0, 0]), arm(dn * 0.7, [0, 0])), f = Object.assign(leg(dn, [-5, -1.5]), arm(up * 0.7, [-5, -1.5]));
        return { hip: [96, 102], sh: [96, 54], n, f, base: 'walk' };
    }
    const num = (el, a) => +el.getAttribute(a) || 0;
    function readJoints(svg) {
        const t = svg.querySelector('.mv-body .torso') || svg.querySelector('line.torso');
        if (!t || !t.getAttribute('x1') || !t.getAttribute('y2')) return null;
        const P = (el, a, b) => el ? [num(el, a), num(el, b)] : null;
        const J = { hip: P(t, 'x1', 'y1'), sh: P(t, 'x2', 'y2') };
        for (const s of ['f', 'n']) {
            const g = svg.querySelector('.mv-side.mv-' + s); if (!g) return null;
            const L = k => g.querySelector('line.' + k), th = L('thigh'), sn = L('shin'), ft = L('foot'), ua = L('ua'), fa = L('fa'), db = g.querySelector('.db');
            if (!th || !sn || !ft || !ua || !fa || !th.getAttribute('x2')) return null;
            J[s] = { hp: P(th, 'x1', 'y1'), knee: P(th, 'x2', 'y2'), ank: P(sn, 'x2', 'y2'), heel: P(ft, 'x1', 'y1'), toe: P(ft, 'x2', 'y2'),
                sp: P(ua, 'x1', 'y1'), elb: P(ua, 'x2', 'y2'), wr: P(fa, 'x2', 'y2'), db: !!(db && db.getAttribute('visibility') === 'visible') };
        }
        return J;
    }
    /* re-root the solved skeleton on her bubble: arms on her sides, legs under her, everything at her size */
    function rig(J, stage, pose) {
        const a = mul2(sub2(J.sh, J.hip), 1 / len2(sub2(J.sh, J.hip)));   /* up her body */
        const p = [-a[1], a[0]];                                          /* her front (forward when upright, up when lying) */
        let C = add2(J.hip, mul2(a, 26));
        const upright = stage === 'stand' || stage === 'seat';
        const out = { C, a, p, tilt: Math.max(-45, Math.min(45, Math.atan2(J.sh[0] - J.hip[0], J.hip[1] - J.sh[1]) * 90 / Math.PI)) };
        for (const s of ['n', 'f']) {
            const q = J[s], near = s === 'n';
            /* arm roots: on her two sides when upright (the far arm mirrors so both read), on her front when lying */
            let ar, hr;
            if (upright) {
                ar = add2(C, add2(mul2(p, (near ? 1 : -1) * R * 0.86), mul2(a, R * 0.12)));
                hr = add2(C, add2(mul2(a, -R * 0.72), mul2(p, near ? R * 0.2 : -R * 0.24)));
            } else if (stage === 'bed') {
                ar = add2(C, add2(mul2(a, R * (near ? 0.3 : 0.42)), mul2(p, -R * (near ? 0.72 : 0.6))));   /* low on her side, clear of her face */
                hr = add2(C, add2(mul2(a, -R * (near ? 0.5 : 0.42)), mul2(p, -R * (near ? 0.62 : 0.52))));
            } else {
                ar = add2(C, add2(mul2(a, R * 0.52), mul2(p, -R * (near ? 0.5 : 0.4))));
                hr = add2(C, add2(mul2(a, -R * 0.55), mul2(p, -R * (near ? 0.5 : 0.42))));
            }
            const mir = upright && !near ? -1 : 1;
            const T = (v, k, m) => add2(mul2(a, dot2(v, a) * k), mul2(p, dot2(v, p) * k * (m || 1)));
            const elb = add2(ar, T(sub2(q.elb, q.sp), ARM, mir)), wr = add2(elb, T(sub2(q.wr, q.elb), ARM, mir));
            let knee = add2(hr, T(sub2(q.knee, q.hp), LEG)), ank = add2(knee, T(sub2(q.ank, q.knee), LEG));
            const fdir = sub2(q.toe, q.heel), fl = len2(fdir), fu = mul2(fdir, 1 / fl);
            out[s] = { ar, elb, wr, hr, knee, ank, fu, fl: fl * FOOT, db: q.db };
        }
        return out;
    }
    function jellyLimb(g, pts, w) {
        const d = 'M' + pts.map(q => f1(q[0]) + ' ' + f1(q[1])).join('L');
        g.querySelectorAll('.mpj-glow, .mpj-rim, .mpj-fill, .mpj-core').forEach(n => n.setAttribute('d', d));
        /* a soft highlight along the top-left of each segment, like her glass */
        let sh = '';
        for (let i = 0; i < pts.length - 1; i++) {
            const A = pts[i], B = pts[i + 1], dv = sub2(B, A), l = len2(dv); if (l < 3) continue;
            let nrm = [-dv[1] / l, dv[0] / l]; if (dot2(nrm, [-0.6, -0.8]) < 0) nrm = mul2(nrm, -1);
            const o = mul2(nrm, w * 0.24), s0 = add2(add2(A, mul2(dv, 0.18)), o), s1 = add2(add2(A, mul2(dv, 0.72)), o);
            sh += 'M' + f1(s0[0]) + ' ' + f1(s0[1]) + 'L' + f1(s1[0]) + ' ' + f1(s1[1]);
        }
        const s = g.querySelector('.mpj-shine'); if (s) s.setAttribute('d', sh || 'M0 0');
    }
    const LIMB_HTML = '<path class="mpj-glow"/><path class="mpj-rim"/><path class="mpj-fill"/><path class="mpj-core"/><path class="mpj-shine"/>';
    const HAND_HTML = '<g class="mpj-db"><path class="mpj-db-bar" d="M0 -9.5V9.5"/><rect class="mpj-db-plate" x="-3.6" y="-13.5" width="7.2" height="5" rx="1.8"/><rect class="mpj-db-plate" x="-3.6" y="8.5" width="7.2" height="5" rx="1.8"/></g>' +
        '<circle class="mpj-mit" r="5.6"/><ellipse class="mpj-thumb" cx="-0.6" cy="-5" rx="2.3" ry="2.7"/><path class="mpj-mshine" d="M-3 -2.2 q1.6 -2.2 4 -2"/>';
    /* a little glass sneaker, toe along +x, sole along +y */
    const SHOE_HTML = '<path class="mpj-shoe-up" d="M-4.6 -3.8 C-6 0 -5.4 3.2 -3 3.4 L10.4 3.4 C13.2 3.4 13.4 0.4 11.6 -1 C9.6 -2.6 7 -3 5.2 -4.4 C3.4 -5.8 -2.6 -6.4 -4.6 -3.8 Z"/>' +
        '<path class="mpj-shoe-sole" d="M-4.4 3.4 L11 3.4"/><path class="mpj-shoe-lace" d="M1.2 -4.6 l1.6 2.2 M3.6 -4 l1.4 2"/><path class="mpj-shoe-shine" d="M-3.2 -2.6 q2 -2 5 -1.8"/>';
    let S = null;   /* the current player's figure state */
    const CUR = { stage: 'stand', pose: 'generic', id: '' };   /* the block being played, kept across rebuilds */
    function build(svg) {
        if (!svg || svg.querySelector('.mpj')) return;
        svg.classList.add('mp-fig', 'mpj-on');
        const g = D.createElementNS(NS, 'g'); g.setAttribute('class', 'mpj'); g.setAttribute('aria-hidden', 'true');
        g.innerHTML = '<defs>' +
            '<radialGradient id="mpHalo"><stop offset="0" style="stop-color:var(--mp-a,#9ff7ff);stop-opacity:.32"/><stop offset=".6" style="stop-color:#5ab8ff;stop-opacity:.1"/><stop offset="1" style="stop-color:#5ab8ff;stop-opacity:0"/></radialGradient>' +
            '<radialGradient id="mpjPlat" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#bdf3ff" stop-opacity=".55"/><stop offset=".55" stop-color="#4fb4ff" stop-opacity=".22"/><stop offset="1" stop-color="#1a5fc0" stop-opacity=".06"/></radialGradient>' +
            '<linearGradient id="mpjGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8e9ff" stop-opacity=".34"/><stop offset="1" stop-color="#2a6fd0" stop-opacity=".16"/></linearGradient>' +
            '<filter id="mpHotF" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.2"/></filter>' +
            '</defs>' +
            '<g class="mpj-prop"></g>' +
            '<ellipse class="mpj-shadow" rx="26" ry="4"/>' +
            '<ellipse class="mp-halo" rx="62" ry="62" fill="url(#mpHalo)"/>' +
            '<g class="mpj-limb mpj-leg mpj-f" data-p="leg">' + LIMB_HTML + '</g><g class="mpj-shoe mpj-f" data-p="foot">' + SHOE_HTML + '</g>' +
            '<g class="mpj-limb mpj-arm mpj-f" data-p="arm">' + LIMB_HTML + '</g><g class="mpj-hand mpj-f" data-p="arm">' + HAND_HTML + '</g>' +
            '<g class="mpj-body"><circle class="mpj-aura" r="' + (R + 3) + '"/><g class="mpj-squash"><g class="mp-tilt"></g></g>' +
            '<path class="mpj-sweat" d="M0 -5 C2.6 -1 3 1.4 0 2.6 C-3 1.4 -2.6 -1 0 -5 Z"/></g>' +
            '<g class="mpj-limb mpj-leg mpj-n" data-p="leg">' + LIMB_HTML + '</g><g class="mpj-shoe mpj-n" data-p="foot">' + SHOE_HTML + '</g>' +
            '<g class="mpj-limb mpj-arm mpj-n" data-p="arm">' + LIMB_HTML + '</g><g class="mpj-hand mpj-n" data-p="arm">' + HAND_HTML + '</g>';
        svg.appendChild(g);
        const q = sel => g.querySelector(sel);
        S = { svg, g, prop: q('.mpj-prop'), shadow: q('.mpj-shadow'), halo: q('.mp-halo'), body: q('.mpj-body'), squash: q('.mpj-squash'), tilt: q('.mp-tilt'), sweat: q('.mpj-sweat'),
            leg: { n: q('.mpj-leg.mpj-n'), f: q('.mpj-leg.mpj-f') }, arm: { n: q('.mpj-arm.mpj-n'), f: q('.mpj-arm.mpj-f') },
            shoe: { n: q('.mpj-shoe.mpj-n'), f: q('.mpj-shoe.mpj-f') }, hand: { n: q('.mpj-hand.mpj-n'), f: q('.mpj-hand.mpj-f') },
            zone: '', floor: 188, box: null, vb: null, last: 0, smooth: null, t0: performance.now(), colours: mistyColours() };
        art();
        const pl = svg.closest('#mv-player'); if (pl) { pl.style.setProperty('--mp-a', S.colours.a); pl.style.setProperty('--mp-b', S.colours.b); }
    }
    /* her face, colours and mood come from her live Home artwork, re-read every block so her expression follows her energy */
    function art() {
        if (!S) return;
        const h = mistyHead(), s = h.svg, sz = R * 2.25;
        s.setAttribute('x', f1(-sz / 2)); s.setAttribute('y', f1(-sz / 2)); s.setAttribute('width', f1(sz)); s.setAttribute('height', f1(sz));
        s.style.cssText = 'width:' + f1(sz) + 'px;height:' + f1(sz) + 'px;overflow:visible';
        S.tilt.textContent = ''; S.tilt.appendChild(s); S.own = h.own;
        /* her limbs are made of her own glass: the colour of her membrane wall over her dark cytoplasm */
        const wall = s.querySelector('.cw-wall, .lh-body'), wc = hexOf((wall && wall.getAttribute('stroke')) || S.colours.a) || [28, 247, 249];
        const mix = (k, b) => '#' + wc.map((c, i) => Math.round(c * k + b[i] * (1 - k)).toString(16).padStart(2, '0')).join('');
        S.g.style.setProperty('--mpj-rim', mix(1, [0, 0, 0]));
        S.g.style.setProperty('--mpj-in', mix(0.34, [12, 42, 78]));
        S.g.style.setProperty('--mpj-core', mix(0.75, [255, 255, 255]));
    }
    function hexOf(c) {
        const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c || '').trim()); if (!m) return null;
        const h = m[1].length === 3 ? m[1].replace(/./g, x => x + x) : m[1];
        return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    }
    function energyNow() {
        try { const e = W.LowiSun && W.LowiSun.energyNow && W.LowiSun.energyNow(); if (e) return { v: Math.max(0, Math.min(1, +e.value || 0)), tier: String(e.tier || '') }; } catch (e) { }
        return { v: 0.6, tier: 'ok' };
    }
    function props(stage, J0) {
        /* the glass she stands, sits or lies on; positions come from the block's first frame so they never wobble */
        let h = '';
        if (stage === 'stand') {
            S.floor = 188;
            h = '<ellipse class="mpj-plat" cx="96" cy="190" rx="50" ry="9"/><ellipse class="mpj-plat-rim" cx="96" cy="188.6" rx="50" ry="8"/>' +
                '<ellipse class="mpj-belt" cx="96" cy="188.6" rx="38" ry="5.6"/><ellipse class="mpj-plat-core" cx="96" cy="188.6" rx="22" ry="3.2"/>';
        } else if (stage === 'seat') {
            const top = J0.C[1] + R * 0.9, fl = J0.hrY + LEG * 40 * 1.02 + 4.2, x = J0.C[0];
            S.floor = fl; S.seatTop = top;
            h = '<ellipse class="mpj-plat" cx="' + f1(x + 8) + '" cy="' + f1(fl + 2) + '" rx="52" ry="8.5"/><ellipse class="mpj-plat-rim" cx="' + f1(x + 8) + '" cy="' + f1(fl + 0.6) + '" rx="52" ry="7.6"/>' +
                '<rect class="mpj-pouf" x="' + f1(x - 22) + '" y="' + f1(top) + '" width="44" height="' + f1(Math.max(8, fl - top + 1)) + '" rx="9"/>' +
                '<path class="mpj-pouf-shine" d="M' + f1(x - 16) + ' ' + f1(top + 3.4) + 'h26"/>';
        } else if (stage === 'bed') {
            S.floor = 158;
            h = '<rect class="mpj-bed" x="28" y="158" width="156" height="13" rx="6.5"/><path class="mpj-pouf-shine" d="M36 161.4h138"/>' +
                '<ellipse class="mpj-plat" cx="106" cy="176" rx="82" ry="7"/><rect class="mpj-pillow" x="34" y="150" width="34" height="10" rx="5"/>';
        } else {
            S.floor = 152;
            h = '<rect class="mpj-mat" x="40" y="152" width="150" height="6" rx="3"/><ellipse class="mpj-plat" cx="114" cy="160" rx="78" ry="6"/>';
        }
        S.prop.innerHTML = h;
    }
    function frame(P) {
        if (!S || !S.svg.isConnected) { const svg = D.getElementById('mv-fig'); if (!svg) return; S = null; build(svg); if (!S) return; }
        const now = performance.now(), dt = Math.min(0.1, (now - (S.last || now)) / 1000); S.last = now;
        const tSec = (now - S.t0) / 1000, rm = reduced();
        let J = readJoints(S.svg), stage = CUR.stage || 'stand';
        if (!J) { J = genericJoints(tSec); if (stage !== 'stand') { stage = 'stand'; S.stageSet = false; } }
        /* sit to stand: her legs are short, so the bubble rises half as far and the sneakers stay planted */
        if (stage === 'seat' && CUR.pose === 'squat') { const d = mul2(sub2(J.hip, [96, 128]), -0.5); J = Object.assign({}, J, { hip: add2(J.hip, d), sh: add2(J.sh, d) }); }
        /* reduced motion: the limbs drift gently towards each pose instead of pumping */
        if (rm) {
            const k = 1 - Math.exp(-dt / 0.9), sm = S.smooth;
            if (sm && sm.stage === stage) {
                const mix = (x, y) => [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k];
                const out = { hip: mix(sm.hip, J.hip), sh: mix(sm.sh, J.sh) };
                for (const s of ['n', 'f']) { out[s] = {}; for (const key in J[s]) out[s][key] = Array.isArray(J[s][key]) ? mix(sm[s][key], J[s][key]) : J[s][key]; }
                J = out;
            }
            J.stage = stage; S.smooth = J;
        } else S.smooth = null;
        const r = rig(J, stage, CUR.pose);
        if (!S.stageSet && (S.warm || 0) >= 2) {
            const hrY = Math.max(r.n.hr[1], r.f.hr[1]);
            props(stage, { C: r.C, hrY }); S.stageSet = true;
        }
        /* weight on the ground: the planted sneaker stays on the platform, the bubble rests on the pouf, bed or mat */
        let dy = 0;
        const sole = s => r[s].ank[1] + Math.max(0, r[s].fu[1]) * r[s].fl + 4.2;
        if (stage === 'stand') dy = S.floor - Math.max(sole('n'), sole('f'));
        else if (stage === 'bed') dy = S.floor + 3 - (J.sh[1] + R);
        else if (stage === 'mat') dy = Math.min(S.floor - Math.max(r.n.wr[1] + 5.6, r.n.knee[1] + LW / 2, r.f.knee[1] + LW / 2), S.floor + 4 - (r.C[1] + R));
        else if (stage === 'seat' && CUR.pose === 'squat') {
            S.feet = S.feet || {};
            for (const k of ['n', 'f']) {
                if (!S.feet[k]) S.feet[k] = r[k].ank.slice();
                r[k].knee = ik2(r[k].hr, S.feet[k], LEG * 40, LEG * 40, true); r[k].ank = S.feet[k].slice();
            }
        }
        const sh = pt => [pt[0], pt[1] + dy];
        const C = sh(r.C);
        /* soft squash and stretch, slower and smaller when she is tired, none with reduced motion */
        const en = S.en || (S.en = energyNow()), tired = en.v < 0.3 || /low|empty|tired|sleep/i.test(en.tier);
        const wob = rm ? 0 : Math.sin(tSec * Math.PI * 2 / (tired ? 2.4 : 1.3)) * (tired ? 0.018 : 0.028);
        S.body.setAttribute('transform', 'translate(' + f1(C[0]) + ' ' + f1(C[1]) + ')');
        S.squash.setAttribute('transform', 'scale(' + (1 + wob).toFixed(3) + ' ' + (1 - wob).toFixed(3) + ')');
        S.tilt.setAttribute('transform', 'rotate(' + f1(r.tilt) + ')');
        S.sweat.setAttribute('transform', 'translate(' + f1(R * 0.72) + ' ' + f1(-R * 0.62) + ')');
        S.halo.setAttribute('cx', f1(C[0])); S.halo.setAttribute('cy', f1(C[1] + 6));
        S.svg.classList.toggle('mpj-tired', tired);
        for (const s of ['n', 'f']) {
            const q = r[s];
            jellyLimb(S.leg[s], [sh(q.hr), sh(q.knee), sh(q.ank)], LW);
            jellyLimb(S.arm[s], [sh(q.ar), sh(q.elb), sh(q.wr)], AW);
            const ank = sh(q.ank), ang = Math.atan2(q.fu[1], q.fu[0]) * 180 / Math.PI;
            S.shoe[s].setAttribute('transform', 'translate(' + f1(ank[0]) + ' ' + f1(ank[1]) + ') rotate(' + f1(ang) + ') scale(' + (q.fl / 15 * 0.82).toFixed(2) + ')');
            const wr = sh(q.wr), fa = sub2(q.wr, q.elb), fang = Math.atan2(fa[1], fa[0]) * 180 / Math.PI;
            S.hand[s].setAttribute('transform', 'translate(' + f1(wr[0]) + ' ' + f1(wr[1]) + ') rotate(' + f1(fang) + ')');
            S.hand[s].classList.toggle('mpj-has-db', !!q.db);
        }
        if (stage === 'stand' || stage === 'seat') {
            S.shadow.setAttribute('cx', f1(C[0] + (stage === 'seat' ? 6 : 0))); S.shadow.setAttribute('cy', f1(S.floor + 0.6)); S.shadow.removeAttribute('visibility');
        } else S.shadow.setAttribute('visibility', 'hidden');
        /* frame her big in the stage: the camera fits the space this move uses, then holds still */
        const xs = [C[0] - R - 4, C[0] + R + 4], ys = [C[1] - R - 6, C[1] + R];
        for (const s of ['n', 'f']) for (const k of ['knee', 'ank', 'elb', 'wr']) { const p2 = sh(r[s][k]); xs.push(p2[0] - 8, p2[0] + 8); ys.push(p2[1] - 8, p2[1] + 8); }
        ys.push(S.floor + 8);
        if (stage === 'stand') xs.push(48, 144);
        if ((S.warm = (S.warm || 0) + 1) < 3) return;   /* the first frames of a block still show the last move */
        const bx = [Math.min.apply(0, xs), Math.min.apply(0, ys), Math.max.apply(0, xs), Math.max.apply(0, ys)];
        S.box = S.box ? [Math.min(S.box[0], bx[0]), Math.min(S.box[1], bx[1]), Math.max(S.box[2], bx[2]), Math.max(S.box[3], bx[3])] : bx;
        fit(dt, rm);
    }
    function fit(dt, rm) {
        const b = S.box; if (!b) return;
        const rect = S.svg.getBoundingClientRect(), asp = rect.width > 10 && rect.height > 10 ? rect.width / rect.height : 1;
        let w = b[2] - b[0] + 8, h = b[3] - b[1] + 6, cx = (b[0] + b[2]) / 2;
        h = Math.max(h, 112); w = Math.max(w, 112);
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
        CUR.stage = stage; CUR.pose = pose; CUR.id = id || '';
        if (!S) { const svg = D.getElementById('mv-fig'); if (svg) build(svg); }
        if (S) { S.stageSet = false; S.box = null; S.warm = 0; S.floor = ({ stand: 188, bed: 158, mat: 152 })[stage] || S.floor || 147; S.feet = null; S.en = null; S.smooth = null; art(); S.svg.dataset.pose = pose; S.svg.dataset.stage = stage; }
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
    W.LowiMovePlayer = { open, close, frame, block, peek, quiet, zoneOf, zoneLabel, ZONE, MOVE_ZONE, POSE, poseOf, stageOf, rig, state: () => ({ via, saved, zone: S ? S.zone : '', own: S ? S.own : null, pose: CUR.pose, stage: CUR.stage }) };
})();
