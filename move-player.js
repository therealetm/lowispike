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

    /* ---------- the body of light ---------- */
    const LIMBS = ['thigh', 'shin', 'foot', 'ua', 'fa'];
    let S = null;   /* the current player's figure state */
    function build(svg) {
        if (!svg || svg.querySelector('.mp-head')) return;
        const mk = (tag, cls, parent, before) => { const n = D.createElementNS(NS, tag); if (cls) n.setAttribute('class', cls); if (before) parent.insertBefore(n, before); else parent.appendChild(n); return n; };
        svg.classList.add('mp-fig');
        /* soft energy pool under her and a halo behind her */
        const defs = mk('defs', '', svg, svg.firstChild);
        defs.innerHTML = '<radialGradient id="mpHalo"><stop offset="0" style="stop-color:var(--mp-a,#9ff7ff);stop-opacity:.34"/><stop offset=".55" style="stop-color:var(--mp-b,#c9a6ff);stop-opacity:.12"/><stop offset="1" style="stop-color:var(--mp-b,#c9a6ff);stop-opacity:0"/></radialGradient>' +
            '<filter id="mpGlowF" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
            '<filter id="mpHotF" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
        const halo = mk('ellipse', 'mp-halo', svg, defs.nextSibling); halo.setAttribute('rx', '72'); halo.setAttribute('ry', '82'); halo.setAttribute('fill', 'url(#mpHalo)');
        const cores = {};
        ['f', 'n'].forEach(s => {
            const side = svg.querySelector('.mv-side.mv-' + s); if (!side) return;
            const g = mk('g', 'mp-core mp-core-' + s, svg, side.nextSibling);
            cores[s] = {};
            LIMBS.forEach(k => { cores[s][k] = mk('line', 'mpc ' + k, g); });
            cores[s].hand = mk('circle', 'mpc-hand', g); cores[s].hand.setAttribute('r', '2.6');
            cores[s].src = {}; LIMBS.forEach(k => { cores[s].src[k] = side.querySelector('line.' + k); }); cores[s].src.hand = side.querySelector('.hand');
        });
        const body = svg.querySelector('.mv-body');
        const torsoCore = mk('line', 'mpc torso-core', body || svg);
        const heart = mk('circle', 'mp-heart', body || svg); heart.setAttribute('r', '4.2');
        const neck = mk('line', 'mp-neck', body || svg);
        const head = mk('g', 'mp-head', svg);
        const tilt = mk('g', 'mp-tilt', head);
        const art = mistyHead(); tilt.appendChild(art.svg);
        const c = mistyColours();
        S = { svg, cores, torso: svg.querySelector('.torso'), head0: svg.querySelector('.head'), torsoCore, heart, neck, head, tilt, halo, zone: '', own: art.own, colours: c, t0: performance.now() };
        const pl = svg.closest('#mv-player'); if (pl) { pl.style.setProperty('--mp-a', c.a); pl.style.setProperty('--mp-b', c.b); }
    }
    const num = (el, a) => +el.getAttribute(a) || 0;
    function frame(P) {
        if (!S || !S.svg.isConnected) { const svg = D.getElementById('mv-fig'); if (!svg) return; build(svg); if (!S) return; }
        const { cores } = S;
        ['f', 'n'].forEach(s => {
            const c = cores[s]; if (!c) return;
            LIMBS.forEach(k => {
                const a = c.src[k], b = c[k]; if (!a) return;
                b.setAttribute('x1', a.getAttribute('x1')); b.setAttribute('y1', a.getAttribute('y1')); b.setAttribute('x2', a.getAttribute('x2')); b.setAttribute('y2', a.getAttribute('y2'));
                const hi = a.classList.contains('hi'); if (b.classList.contains('hi') !== hi) b.classList.toggle('hi', hi);
            });
            const h = c.src.hand; if (h) { c.hand.setAttribute('cx', h.getAttribute('cx')); c.hand.setAttribute('cy', h.getAttribute('cy')); }
        });
        /* torso core, heart, neck and Misty riding on the shoulders */
        const t = S.torso; if (!t) return;
        const hx = num(t, 'x1'), hy = num(t, 'y1'), sx = num(t, 'x2'), sy = num(t, 'y2');
        S.torsoCore.setAttribute('x1', hx); S.torsoCore.setAttribute('y1', hy); S.torsoCore.setAttribute('x2', sx); S.torsoCore.setAttribute('y2', sy);
        S.heart.setAttribute('cx', (sx + (hx - sx) * 0.32).toFixed(1)); S.heart.setAttribute('cy', (sy + (hy - sy) * 0.32).toFixed(1));
        let cx = num(S.head0, 'cx'), cy = num(S.head0, 'cy');
        let dx = cx - sx, dy = cy - sy; const dl = Math.hypot(dx, dy) || 1;
        /* her bubble is bigger than the old head: push it out along the neck so it never swallows the shoulders */
        cx = sx + dx / dl * (dl + 9); cy = sy + dy / dl * (dl + 9);
        S.neck.setAttribute('x1', sx.toFixed(1)); S.neck.setAttribute('y1', sy.toFixed(1)); S.neck.setAttribute('x2', (sx + dx / dl * (dl - 4)).toFixed(1)); S.neck.setAttribute('y2', (sy + dy / dl * (dl - 4)).toFixed(1));
        /* lying or on all fours: she tilts with the body (half way, so her face stays readable) */
        const ang = Math.atan2(sx - hx, hy - sy) * 180 / Math.PI;
        const tilt = Math.max(-50, Math.min(50, ang * 0.5));
        S.head.setAttribute('transform', 'translate(' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')');
        S.tilt.setAttribute('transform', 'rotate(' + tilt.toFixed(1) + ')');
        S.halo.setAttribute('cx', ((hx + sx) / 2).toFixed(1)); S.halo.setAttribute('cy', ((hy + sy) / 2 + 10).toFixed(1));
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
        setZone(zoneOf(b && b.move, m, isRest ? 'rest' : (b && b.type)));
        const pl = D.getElementById('mv-player'); if (pl && b) pl.dataset.mpType = b.type || '';
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
    W.LowiMovePlayer = { open, close, frame, block, peek, quiet, zoneOf, zoneLabel, ZONE, MOVE_ZONE, state: () => ({ via, saved, zone: S ? S.zone : '', own: S ? S.own : null }) };
})();
