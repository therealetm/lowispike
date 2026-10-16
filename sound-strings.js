/* LOWiSPIKE Sound string pad + calm timer chime (Oct 16, 2026; handoff task 9). Needs calm-sound-core.js.
   - LowiSoundStrings.mount(el, api): seven glowing glass strings inside the Sound panel (world-audio.js mounts it on Home and
     in the world). Touch a string to play it, swipe across to strum, touch higher for a fuller note, slide along a held string
     to bend it up to a semitone. The touched string glows and vibrates where the finger is (reduced motion: it only glows).
     Sound goes through world-audio's context (api.instrument(), called inside the touch, so iOS allows it), follows the
     Sound volume slider and stays silent when app sounds are off (LowiSFX). Canvas 2D, drawn only while something moves.
   - LowiCalmChime(ac, f, d): the soft bowl chime that replaces the old Move and guided-session timer beeps. */
(function () {
    'use strict';
    const W = window, D = document;
    const CS = W.LowiCalmSoundCore;
    if (!CS || W.LowiSoundStrings) return;
    const me = D.currentScript || D.querySelector('script[src*="sound-strings.js"]');
    if (!D.getElementById('lowiSoundStringsCss')) {
        const l = D.createElement('link'); l.id = 'lowiSoundStringsCss'; l.rel = 'stylesheet';
        l.href = me && me.getAttribute('src') ? me.getAttribute('src').replace('sound-strings.js', 'sound-strings.css') : 'sound-strings.css';
        D.head.appendChild(l);
    }
    const S = CS.STRINGS, N = S.notes.length;
    const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const lang = () => { try { return (W.LowiI18n && W.LowiI18n.lang && W.LowiI18n.lang()) || D.documentElement.lang || 'de'; } catch (e) { return 'de'; } };

    /* ---------- calm chime for timers (index.html Move and guided players call this with their own context) ---------- */
    function chime(ac, f, d) {
        if (!ac) return false;
        const plan = CS.chime(f, d), t = ac.currentTime + 0.01;
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = plan.lp; lp.connect(ac.destination);
        const g = ac.createGain(); g.gain.value = plan.peak; g.connect(lp);
        plan.partials.forEach(p => [-0.5, 0.5].forEach(side => {
            const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = p.hz + side * p.beat;
            const e = ac.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(p.amp * 0.5, t + plan.attack); e.gain.setTargetAtTime(0.0001, t + plan.attack, p.decay / 4);
            o.connect(e); e.connect(g); o.start(t); o.stop(t + plan.attack + p.decay * 1.3);
            o.onended = () => { try { e.disconnect(); } catch (x) { } };
        }));
        setTimeout(() => { try { g.disconnect(); lp.disconnect(); } catch (x) { } }, (plan.ring * 1.3 + 0.6) * 1000);
        return true;
    }
    W.LowiCalmChime = chime;

    /* ---------- the string pad ---------- */
    let pad = null;   /* one mounted pad at a time */
    const busFor = new WeakMap();
    function bus(ins) {
        let b = busFor.get(ins.ctx);
        if (!b) { b = ins.ctx.createGain(); b.gain.value = ins.gain; b.connect(ins.out); busFor.set(ins.ctx, b); }
        else { try { b.gain.setTargetAtTime(ins.gain, ins.ctx.currentTime, 0.03); } catch (e) { b.gain.value = ins.gain; } }
        return b;
    }
    function voiceOn(P, i, lv, cents) {
        const ins = P.ins; if (!ins || ins.muted || !ins.ctx || !ins.gain) return null;
        const ctx = ins.ctx, t = ctx.currentTime, hz = CS.noteHz(i, cents || 0), peak = S.gain * lv;
        const old = CS.steal(P.voices); if (old) voiceOff(P, old, 0.25);
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz;
        const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = hz * 2;
        const g2 = ctx.createGain(); g2.gain.value = 0.12;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(S.lp, t); lp.frequency.setTargetAtTime(900, t + 0.05, 0.6);
        const env = ctx.createGain(); env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(peak, t + S.attack); env.gain.setTargetAtTime(peak * S.hold, t + S.attack, S.decay / 3);
        o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(env); env.connect(bus(ins));
        o.start(t); o2.start(t);
        const v = { i, t: t, o, o2, env, nodes: [g2, lp, env], peak, hz, cap: setTimeout(() => voiceOff(P, v), 8000) };
        P.voices.push(v);
        return v;
    }
    function voiceOff(P, v, rel) {
        if (!v || v.off) return; v.off = true; clearTimeout(v.cap);
        const ctx = v.o.context, t = ctx.currentTime, r = rel == null ? S.release : rel;
        try { v.env.gain.cancelScheduledValues(t); v.env.gain.setValueAtTime(Math.max(0.0001, v.env.gain.value), t); v.env.gain.setTargetAtTime(0.0001, t, r / 4); } catch (e) { }
        try { v.o.stop(t + r + 0.1); v.o2.stop(t + r + 0.1); } catch (e) { }
        v.o.onended = () => { [v.o, v.o2].concat(v.nodes).forEach(n => { try { n.disconnect(); } catch (e) { } }); };
        P.voices = P.voices.filter(x => x !== v);
    }
    function bendVoice(v, cents) { if (!v || v.off) return; try { v.o.frequency.setTargetAtTime(CS.noteHz(v.i, cents), v.o.context.currentTime, 0.03); v.o2.frequency.setTargetAtTime(CS.noteHz(v.i, cents) * 2, v.o.context.currentTime, 0.03); } catch (e) { } }
    function levelVoice(v, lv) { if (!v || v.off) return; const ctx = v.o.context; if (ctx.currentTime - v.t < 0.15) return; try { v.env.gain.setTargetAtTime(S.gain * lv * S.hold * 1.3, ctx.currentTime, 0.08); } catch (e) { } }

    function size(P) {
        const r = P.cv.getBoundingClientRect(), dpr = Math.min(2, W.devicePixelRatio || 1);
        P.w = Math.max(1, r.width); P.h = Math.max(1, r.height); P.left = r.left; P.top = r.top;
        const cw = Math.round(P.w * dpr), ch = Math.round(P.h * dpr);
        if (P.cv.width !== cw || P.cv.height !== ch) { P.cv.width = cw; P.cv.height = ch; }
        P.dpr = dpr;
    }
    function excite(P, i, y, amt) {
        const s = P.str[i]; s.e = Math.min(1, Math.max(s.e, amt)); s.y = y; s.t0 = performance.now(); s.amp = Math.min(P.w / N * 0.32, 14) * amt;
        P.plays++; kick(P);
    }
    function draw(P) {
        const g = P.g, dpr = P.dpr, w = P.w, h = P.h, now = performance.now(), red = reduced(); let busy = P.ptr.size > 0;
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
        for (let i = 0; i < N; i++) {
            const s = P.str[i], x = CS.stringX(i, w, N), age = (now - s.t0) / 1000, held = [...P.ptr.values()].some(p => p.i === i);
            if (!held) s.e *= 0.94; if (s.e < 0.004) s.e = 0; if (s.e > 0) busy = true;
            const e = s.e, off = CS.wobble(age, s.amp, red) * (held ? 0.5 : 1);
            g.save();
            g.strokeStyle = 'rgba(' + P.col[i] + ',' + (0.42 + e * 0.58).toFixed(3) + ')';
            g.lineWidth = 1.4 + e * 1.8; g.shadowColor = 'rgba(' + P.col[i] + ',.9)'; g.shadowBlur = 6 + e * 18;
            g.beginPath(); g.moveTo(x, 6);
            if (Math.abs(off) > 0.05) g.quadraticCurveTo(x + off * 2, s.y, x, h - 6); else g.lineTo(x, h - 6);
            g.stroke(); g.restore();
            if (e > 0.02) {
                const rg = g.createRadialGradient(x + off, s.y, 0, x + off, s.y, 18 + e * 16);
                rg.addColorStop(0, 'rgba(255,255,255,' + (0.85 * e).toFixed(3) + ')'); rg.addColorStop(0.35, 'rgba(' + P.col[i] + ',' + (0.5 * e).toFixed(3) + ')'); rg.addColorStop(1, 'rgba(' + P.col[i] + ',0)');
                g.fillStyle = rg; g.beginPath(); g.arc(x + off, s.y, 18 + e * 16, 0, Math.PI * 2); g.fill();
            }
        }
        return busy;
    }
    function kick(P) { if (P.raf || P.dead) return; P.raf = requestAnimationFrame(function loop() { P.raf = 0; if (P.dead) return; if (draw(P) && !D.hidden) P.raf = requestAnimationFrame(loop); }); }
    function hint(P) {
        const ins = P.ins; let k = 'hint';
        if (ins && ins.muted) k = 'muted'; else if (ins && !ins.vol) k = 'silent';
        if (P.hintKey !== k) { P.hintKey = k; P.hint.textContent = CS.t(k, P.lang()); P.el.classList.toggle('ss-muted', k !== 'hint'); }
    }
    function pos(P, e) { return { x: e.clientX - P.left, y: Math.max(0, Math.min(P.h, e.clientY - P.top)) }; }
    function down(P, e) {
        e.preventDefault(); e.stopPropagation();
        size(P);
        P.ins = P.api.instrument ? P.api.instrument() : null; hint(P);
        try { P.cv.setPointerCapture(e.pointerId); } catch (x) { }
        const p = pos(P, e), i = CS.stringAt(p.x, P.w, N), lv = CS.level(p.y, P.h);
        const v = voiceOn(P, i, lv, 0);
        P.ptr.set(e.pointerId, { i, x: p.x, y: p.y, v });
        excite(P, i, p.y, 0.55 + lv * 0.45);
    }
    function move(P, e) {
        const q = P.ptr.get(e.pointerId); if (!q) return;
        e.preventDefault();
        const p = pos(P, e), lv = CS.level(p.y, P.h), hit = CS.crossed(q.x, p.x, P.w, N).filter(i => i !== q.i);
        if (hit.length) {
            /* strum: every string the finger crosses plays once; the last one is held */
            hit.forEach((i, k) => {
                if (q.v) voiceOff(P, q.v, k < hit.length - 1 ? 0.9 : S.release);
                q.v = voiceOn(P, i, lv, 0); q.i = i; excite(P, i, p.y, 0.5 + lv * 0.5);
            });
        } else {
            /* along the held string: sideways bends, height sets the loudness */
            bendVoice(q.v, CS.bend(p.x - CS.stringX(q.i, P.w, N), P.w, N)); levelVoice(q.v, lv);
            const s = P.str[q.i]; s.y = p.y; s.e = Math.max(s.e, 0.4 + lv * 0.4); kick(P);
        }
        q.x = p.x; q.y = p.y;
    }
    function up(P, e) { const q = P.ptr.get(e.pointerId); if (!q) return; P.ptr.delete(e.pointerId); if (q.v) voiceOff(P, q.v); kick(P); }
    function key(P, e) {
        let i = -1;
        if (/^[1-7]$/.test(e.key)) i = +e.key - 1;
        else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') i = P.cursor = Math.min(N - 1, P.cursor + 1);
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') i = P.cursor = Math.max(0, P.cursor - 1);
        else if (e.key === 'Enter' || e.key === ' ') i = P.cursor;
        if (i < 0) return;
        e.preventDefault(); e.stopPropagation(); P.cursor = i;
        size(P); P.ins = P.api.instrument ? P.api.instrument() : null; hint(P);
        const v = voiceOn(P, i, 0.7, 0); excite(P, i, P.h * 0.4, 0.8); setTimeout(() => voiceOff(P, v), 450);
    }
    function releaseAll(P) { P.ptr.clear(); P.voices.slice().forEach(v => voiceOff(P, v, 0.3)); }
    function mount(el, api) {
        if (!el) return null;
        if (pad) unmount();
        const L = api && api.lang ? api.lang : lang;
        el.innerHTML = '<div class="ss-hd">' + CS.t('title', L()) + '</div><div class="ss-pad" tabindex="0" role="group"><canvas aria-hidden="true"></canvas></div><p class="ss-hint" aria-live="polite"></p>';
        const box = el.querySelector('.ss-pad'), cv = el.querySelector('canvas');
        box.setAttribute('aria-label', CS.t('aria', L()) + '. ' + CS.t('hint', L()));
        const P = { el, box, cv, g: cv.getContext('2d'), api: api || {}, lang: L, ptr: new Map(), voices: [], plays: 0, cursor: 3, ins: null, hintKey: '', dead: false, raf: 0,
            str: S.notes.map(() => ({ e: 0, y: 0, t0: 0, amp: 0 })),
            col: ['120,200,255', '110,215,255', '120,230,250', '150,225,255', '110,190,255', '140,210,255', '170,235,255'] };
        P.hint = el.querySelector('.ss-hint'); hint(P);
        if (!P.g) { el.innerHTML = ''; return null; }
        cv.addEventListener('pointerdown', e => down(P, e));
        cv.addEventListener('pointermove', e => move(P, e));
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => cv.addEventListener(t, e => up(P, e)));
        box.addEventListener('keydown', e => key(P, e));
        /* keep the world from dragging under the pad (the panel already stops clicks) */
        ['touchstart', 'touchmove'].forEach(t => box.addEventListener(t, e => e.stopPropagation(), { passive: true }));
        P.onVis = () => { if (D.hidden) releaseAll(P); };
        D.addEventListener('visibilitychange', P.onVis);
        P.ro = W.ResizeObserver ? new ResizeObserver(() => { size(P); draw(P); }) : null; P.ro && P.ro.observe(cv);
        requestAnimationFrame(() => { if (!P.dead) { size(P); draw(P); } });
        pad = P; return P;
    }
    function unmount() {
        const P = pad; if (!P) return; pad = null; P.dead = true;
        releaseAll(P); cancelAnimationFrame(P.raf); P.ro && P.ro.disconnect(); D.removeEventListener('visibilitychange', P.onVis);
        try { P.el.innerHTML = ''; } catch (e) { }
        if (P.api.idle) P.api.idle();
    }
    W.LowiSoundStrings = {
        mount, unmount, chime,
        get mounted() { return !!pad; }, get voices() { return pad ? pad.voices.length : 0; }, get plays() { return pad ? pad.plays : 0; },
        glow: () => pad ? pad.str.map(s => +s.e.toFixed(3)) : []
    };
})();
