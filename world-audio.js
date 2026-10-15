/* LOWiSPIKE world sound (Oct 15, 2026). An optional, calm soundscape for the 3D body world plus warp sounds on the real fly-to.
   - A "Klang" pill sits in the world's top bar next to the X. It opens a small panel: on/off switch, volume, warp sounds.
   - Sound is opt-in: the AudioContext is created and resumed only inside a tap (iOS rule). Nothing turns sound on by itself;
     only the volume and the warp switch are stored (lowi.worldAudio), so a reload is always silent.
   - Ambient: low-passed noise that breathes slowly (fluid movement), a soft current, a gentle low pulse and a quiet warm pad,
     through a capped master and a limiter. Slow fade in, short fade out, no beeps, nothing bright.
   - Warp: window 'lowi:world-warp' {phase:'start'|'dive'|'arrive'|'cancel'} from body-world-regions.js (the real glide/dive/
     settle), plus the cell ride's 'lowi:ride-start'/'lowi:ride-arrive'. One warp voice at a time, duplicate phases ignored.
   - Lifecycle: world closes -> fade out, sources stopped, context suspended. App hidden -> suspended. Reopening the world with a
     tap brings it back while the app stays open. Page hide -> context closed. It plays only while the world is open and the app
     is in front; it never promises playback with the screen locked. */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement;
    if (W.LowiWorldAudio) return;
    const C = W.LowiWorldAudioCore;
    if (!C) { console.warn('world-audio-core missing'); return; }
    const me = D.currentScript || D.querySelector('script[src*="world-audio.js"]');
    if (!D.getElementById('waCss')) {
        const l = D.createElement('link'); l.id = 'waCss'; l.rel = 'stylesheet';
        l.href = me && me.getAttribute('src') ? me.getAttribute('src').replace('world-audio.js', 'world-audio.css') : 'world-audio.css';
        D.head.appendChild(l);
    }
    const lang = () => { try { return (W.LowiLang.get() || H.lang || 'de').slice(0, 2); } catch (e) { return (H.lang || 'de').slice(0, 2); } };
    const tr = k => C.t(k, lang());
    let prefs = C.loadPrefs((() => { try { return localStorage.getItem(C.KEY); } catch (e) { return null; } })());
    function save() { try { localStorage.setItem(C.KEY, C.savePrefs(prefs)); } catch (e) { } }

    /* ---------- audio engine ---------- */
    const st = { on: false, idleT: 0, ctx: null, master: null, ambBus: null, fxBus: null, amb: null, warp: null, last: null, plays: { start: 0, dive: 0, arrive: 0, ride: 0 }, pulseT: 0, pulseN: 0, timer: 0, stopT: 0 };
    const isOpen = () => H.classList.contains('bw3-full-open') && !!D.querySelector('.bw3-full');
    const running = () => !!(st.ctx && st.ctx.state === 'running');
    let noiseBuf = null;
    function noise(ctx) {
        if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
        const len = Math.floor(ctx.sampleRate * 6), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
        let s = 1234567; for (let i = 0; i < len; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = (s / 0x3fffffff) - 1; }
        noiseBuf = b; return b;
    }
    function ensureCtx() {
        if (st.ctx && st.ctx.state !== 'closed') return st.ctx;
        const AC = W.AudioContext || W.webkitAudioContext; if (!AC) return null;
        let ctx; try { ctx = new AC({ latencyHint: 'playback' }); } catch (e) { try { ctx = new AC(); } catch (x) { return null; } }
        const lim = ctx.createDynamicsCompressor(), L = C.MIX.limiter;
        lim.threshold.value = L.threshold; lim.knee.value = L.knee; lim.ratio.value = L.ratio; lim.attack.value = L.attack; lim.release.value = L.release;
        const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = C.MIX.tone; tone.Q.value = 0.5;
        const master = ctx.createGain(); master.gain.value = 0;
        const ambBus = ctx.createGain(); ambBus.gain.value = C.MIX.bus;
        const fxBus = ctx.createGain(); fxBus.gain.value = C.WARP.gain;
        ambBus.connect(master); fxBus.connect(master); master.connect(tone); tone.connect(lim); lim.connect(ctx.destination);
        Object.assign(st, { ctx, master, ambBus, fxBus });
        ctx.onstatechange = () => paint();
        return ctx;
    }
    function ramp(param, v, tc) { const ctx = st.ctx; if (!ctx) return; const n = ctx.currentTime; try { param.cancelScheduledValues(n); param.setValueAtTime(param.value, n); param.setTargetAtTime(v, n, tc); } catch (e) { param.value = v; } }
    function lfo(ctx, rate, depth, target, phase) {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = rate;
        const g = ctx.createGain(); g.gain.value = depth; o.connect(g); g.connect(target);
        try { o.start(ctx.currentTime + (phase || 0)); } catch (e) { o.start(); }
        return [o, g];
    }
    function startAmbient() {
        const ctx = st.ctx; if (!ctx || st.amb) return;
        const M = C.MIX, nodes = [], srcs = [], now = ctx.currentTime;
        /* flow: two deep noise streams drifting left/right, each breathing on its own slow cycle */
        M.flow.lfo.forEach((rate, i) => {
            const s = ctx.createBufferSource(); s.buffer = noise(ctx); s.loop = true; s.loopStart = 0; s.loopEnd = s.buffer.duration;
            const f1 = ctx.createBiquadFilter(); f1.type = 'lowpass'; f1.frequency.value = M.flow.lp; f1.Q.value = 0.3;
            const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = M.flow.lp * 1.4; f2.Q.value = 0.2;
            const g = ctx.createGain(); g.gain.value = M.flow.gain;
            const lf = lfo(ctx, rate, M.flow.gain * M.flow.depth, g.gain, i * 3);
            let out = g;
            if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = i ? 0.35 : -0.35; const pl = lfo(ctx, rate * 0.6, 0.25, p.pan, i * 5); g.connect(p); out = p; nodes.push(p, pl[1]); srcs.push(pl[0]); }
            s.connect(f1); f1.connect(f2); f2.connect(g); out.connect(st.ambBus);
            s.start(now, (i * 2.7) % 6); srcs.push(s, lf[0]); nodes.push(f1, f2, g, lf[1]);
        });
        /* swish: a soft current moving past (band-passed noise, centre slowly wandering) */
        {
            const s = ctx.createBufferSource(); s.buffer = noise(ctx); s.loop = true;
            const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = M.swish.bp; bp.Q.value = M.swish.q;
            const g = ctx.createGain(); g.gain.value = M.swish.gain;
            const lf = lfo(ctx, M.swish.lfo, M.swish.sweep, bp.frequency, 1), lg = lfo(ctx, M.swish.lfo * 1.7, M.swish.gain * 0.6, g.gain, 2);
            s.connect(bp); bp.connect(g); g.connect(st.ambBus); s.start(now, 3.1);
            srcs.push(s, lf[0], lg[0]); nodes.push(bp, g, lf[1], lg[1]);
        }
        /* pad: warm quiet drone, slowly breathing, low-passed */
        {
            const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = M.pad.lp; lp.Q.value = 0.4;
            const g = ctx.createGain(); g.gain.value = M.pad.gain; lp.connect(g); g.connect(st.ambBus);
            const lg = lfo(ctx, M.pad.lfo, M.pad.gain * 0.5, g.gain, 0);
            M.pad.notes.forEach((hz, i) => { const o = ctx.createOscillator(); o.type = i === 1 ? 'triangle' : 'sine'; o.frequency.value = hz; o.detune.value = (i - 1) * 4; o.connect(lp); o.start(now); srcs.push(o); });
            srcs.push(lg[0]); nodes.push(lp, g, lg[1]);
        }
        const pulseBus = ctx.createGain(); pulseBus.gain.value = M.pulse.gain;
        const plp = ctx.createBiquadFilter(); plp.type = 'lowpass'; plp.frequency.value = 220; pulseBus.connect(plp); plp.connect(st.ambBus); nodes.push(pulseBus, plp);
        st.amb = { srcs, nodes, pulseBus };
        st.pulseT = now + 1.2; st.pulseN = 0;
        clearInterval(st.timer); st.timer = setInterval(schedulePulses, 250); schedulePulses();
    }
    /* gentle low pulse: soft attack, long decay, two low sines; scheduled a little ahead */
    function schedulePulses() {
        const ctx = st.ctx, a = st.amb; if (!ctx || !a || ctx.state !== 'running') return;
        const P = C.MIX.pulse, until = ctx.currentTime + 0.8;
        if (st.pulseT < ctx.currentTime) st.pulseT = ctx.currentTime + 0.1;
        const times = [st.pulseT].concat(C.pulses(st.pulseT, until, st.pulseN)).filter(t => t < until);
        times.forEach(t => {
            [[P.hz, 1], [P.harm, 0.35]].forEach(([hz, amt]) => {
                const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(hz * 1.04, t); o.frequency.exponentialRampToValueAtTime(hz, t + 0.25);
                const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(amt, t + P.attack); g.gain.setTargetAtTime(0.0001, t + P.attack, P.decay / 3);
                o.connect(g); g.connect(a.pulseBus); o.start(t); o.stop(t + P.attack + P.decay * 1.6);
                o.onended = () => { try { g.disconnect(); } catch (e) { } };
            });
            st.pulseN++;
        });
        if (times.length) { const lastT = times[times.length - 1]; const nx = C.pulses(lastT, lastT + 3, st.pulseN); st.pulseT = nx.length ? nx[0] : lastT + P.every; }
    }
    function stopAmbient(fade) {
        clearInterval(st.timer); st.timer = 0;
        const a = st.amb; if (!a) return; st.amb = null;
        const ctx = st.ctx, end = ctx ? ctx.currentTime + (fade || 0) + 0.05 : 0;
        a.srcs.forEach(s => { try { s.stop(end); } catch (e) { } });
        setTimeout(() => { a.srcs.concat(a.nodes).forEach(n => { try { n.disconnect(); } catch (e) { } }); }, ((fade || 0) + 0.2) * 1000);
    }
    function fadeIn() { if (st.master) ramp(st.master.gain, C.masterGain(prefs.vol), C.FADE_IN / 3); }
    function fadeOut(s) { if (st.master) ramp(st.master.gain, 0, (s || C.FADE_OUT) / 4); }
    /* begin (or continue) sound: must run inside a tap the first time (iOS) */
    function begin() {
        const ctx = ensureCtx(); if (!ctx) return false;
        clearTimeout(st.stopT);
        try { const p = ctx.resume(); if (p && p.catch) p.catch(() => { }); } catch (e) { }
        if (!st.amb) startAmbient();
        fadeIn(); paint();
        return true;
    }
    /* pause: fade out, stop the sources, suspend the context (resources freed, context kept for the next tap) */
    function pause(fade) {
        killWarp(0.15);
        if (!st.ctx) return;
        fadeOut(fade); stopAmbient(fade);
        clearTimeout(st.stopT);
        st.stopT = setTimeout(() => { if (st.ctx && st.ctx.state === 'running' && !(st.on && isOpen() && !D.hidden)) st.ctx.suspend().catch(() => { }); paint(); }, ((fade || C.FADE_OUT) + 0.25) * 1000);
        paint();
    }
    function setOn(on) {
        st.on = !!on;
        if (st.on) { if (!begin()) st.on = false; } else pause(C.FADE_OUT);
        paint();
        try { W.dispatchEvent(new CustomEvent('lowi:world-audio', { detail: { on: st.on, vol: prefs.vol } })); } catch (e) { }
    }

    /* ---------- warp sounds ---------- */
    function killWarp(fade) {
        const v = st.warp; if (!v) return; st.warp = null;
        const ctx = st.ctx; if (!ctx) return;
        const n = ctx.currentTime, f = Math.max(0.05, fade || C.WARP.cancel);
        try { v.g.gain.cancelScheduledValues(n); v.g.gain.setValueAtTime(v.g.gain.value, n); v.g.gain.linearRampToValueAtTime(0, n + f); } catch (e) { }
        v.srcs.forEach(s => { try { s.stop(n + f + 0.05); } catch (e) { } });
        clearTimeout(v.t);
        setTimeout(() => { v.nodes.forEach(x => { try { x.disconnect(); } catch (e) { } }); }, (f + 0.3) * 1000);
    }
    function warpOk() { return C.warpAudible({ on: st.on, open: isOpen(), hidden: D.hidden, warp: prefs.warp, running: running() }) && !!st.fxBus; }
    function warpStart(id, quiet) {
        killWarp(0.12);
        const ctx = st.ctx, S = C.WARP.start, n = ctx.currentTime;
        const s = ctx.createBufferSource(); s.buffer = noise(ctx); s.loop = true;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1; bp.frequency.setValueAtTime(S.from, n); bp.frequency.exponentialRampToValueAtTime(S.to, n + S.rise);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = C.MAX_HZ * 0.8;
        const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.setValueAtTime(S.sub[0], n); sub.frequency.exponentialRampToValueAtTime(S.sub[1], n + S.rise);
        const sg = ctx.createGain(); sg.gain.value = 0.5;
        const g = ctx.createGain(); g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(S.peak, n + S.rise);
        s.connect(bp); bp.connect(lp); lp.connect(g); sub.connect(sg); sg.connect(g); g.connect(st.fxBus);
        s.start(n, Math.random() * 4); sub.start(n);
        const v = { id, g, bp, sub, srcs: [s, sub], nodes: [bp, lp, sg, g], phase: 'start' };
        v.t = setTimeout(() => { if (st.warp === v && v.phase === 'start') killWarp(0.8); }, S.max * 1000);
        st.warp = v; if (!quiet) st.plays.start++;
    }
    function warpDive(id) {
        const v = st.warp, ctx = st.ctx, Dv = C.WARP.dive, n = ctx.currentTime;
        if (!v || v.id !== id) { warpStart(id, true); return warpDive(id); }
        v.phase = 'dive'; clearTimeout(v.t);
        try {
            v.bp.frequency.cancelScheduledValues(n); v.bp.frequency.setValueAtTime(v.bp.frequency.value, n);
            v.bp.frequency.exponentialRampToValueAtTime(Dv.up, n + Dv.t * 0.3); v.bp.frequency.exponentialRampToValueAtTime(Dv.down, n + Dv.t * 1.6);
            v.sub.frequency.cancelScheduledValues(n); v.sub.frequency.setValueAtTime(v.sub.frequency.value, n); v.sub.frequency.exponentialRampToValueAtTime(Dv.sub[1], n + Dv.t);
            v.g.gain.cancelScheduledValues(n); v.g.gain.setValueAtTime(v.g.gain.value, n); v.g.gain.linearRampToValueAtTime(Dv.peak, n + Dv.t * 0.3); v.g.gain.setTargetAtTime(0.08, n + Dv.t * 0.3, 0.35);
        } catch (e) { }
        v.t = setTimeout(() => { if (st.warp === v) killWarp(1.2); }, 3000);
        st.plays.dive++;
    }
    function bloom(kind) {
        const ctx = st.ctx, B = C.WARP[kind], n = ctx.currentTime;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = B.lp;
        const g = ctx.createGain(); g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(B.gain * 3, n + B.attack); g.gain.setTargetAtTime(0, n + B.attack, B.release / 3);
        lp.connect(g); g.connect(st.fxBus);
        const end = n + B.attack + B.release * 1.4;
        B.notes.forEach((hz, i) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz; o.detune.value = (i - 1) * 3; o.connect(lp); o.start(n + i * 0.06); o.stop(end); });
        setTimeout(() => { try { lp.disconnect(); g.disconnect(); } catch (e) { } }, (end - n + 0.3) * 1000);
        st.plays.arrive++;
    }
    function onWarp(phase, id) {
        if (!st.ctx) return;
        const gd = C.guard(st.last, phase, id, st.ctx.currentTime); if (!gd.play) return; st.last = gd.last;
        if (phase === 'cancel') { killWarp(C.WARP.cancel); return; }
        if (!warpOk()) { killWarp(0.1); return; }
        if (phase === 'start') warpStart(id);
        else if (phase === 'dive') warpDive(id);
        else if (phase === 'arrive') { if (st.warp && st.warp.phase === 'start') killWarp(0.5); bloom(id === 'hub' ? 'home' : 'arrive'); }
    }
    W.addEventListener('lowi:world-warp', e => { const d = e && e.detail || {}; onWarp(d.phase, d.id); });
    W.addEventListener('lowi:ride-start', e => { if (!st.ctx || !warpOk()) return; const id = 'ride:' + ((e.detail && e.detail.place) || ''); onWarp('start', id); st.plays.ride++; const v = st.warp; if (v) { clearTimeout(v.t); v.t = setTimeout(() => { if (st.warp === v) killWarp(1.2); }, 1600); } });
    W.addEventListener('lowi:ride-arrive', e => { if (!st.ctx || !warpOk()) return; onWarp('arrive', 'ride:' + ((e.detail && e.detail.place) || '')); });

    /* ---------- UI: pill in the world's top bar + small panel ---------- */
    const ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" stroke="none"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
    const ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" stroke="none"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
    const stop = el => ['pointerdown', 'touchstart', 'wheel', 'mousedown'].forEach(n => el.addEventListener(n, e => e.stopPropagation(), { passive: true }));
    function ensureUi() {
        const host = D.querySelector('.bw3-full'); if (!host) return null;
        let btn = host.querySelector('.wa-btn'); if (btn) return btn;
        btn = D.createElement('button'); btn.type = 'button'; btn.className = 'wa-btn'; btn.id = 'waBtn';
        btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
        btn.addEventListener('click', e => { e.stopPropagation(); togglePanel(); });
        stop(btn);
        const top = host.querySelector('.bw3-top'), x = top && top.querySelector('.bw3-x');
        if (x) top.insertBefore(btn, x); else { btn.classList.add('wa-float'); host.appendChild(btn); }
        paint(); return btn;
    }
    function panelHtml() {
        return '<div class="wa-hd"><b>' + tr('title') + '</b><button type="button" class="wa-sw" role="switch" data-wa="on"><i></i><span></span></button></div>' +
            '<label class="wa-row wa-vol"><span>' + tr('vol') + '</span><input type="range" min="0" max="100" step="1" data-wa="vol" aria-label="' + tr('vol') + '"><output></output></label>' +
            '<div class="wa-row"><span>' + tr('warp') + '</span><button type="button" class="wa-sw wa-sm" role="switch" data-wa="warp" aria-label="' + tr('warp') + '"><i></i><span></span></button></div>' +
            '<p>' + tr('note') + '</p><p class="wa-quiet">' + tr('quiet') + '</p>';
    }
    function togglePanel(force) {
        const host = D.querySelector('.bw3-full'); if (!host) return;
        let p = host.querySelector('.wa-panel'); const want = force == null ? !p : !!force;
        if (!want) { if (p) p.remove(); paint(); return; }
        if (p) return;
        p = D.createElement('div'); p.className = 'wa-panel'; p.id = 'waPanel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', tr('aria'));
        p.innerHTML = panelHtml(); stop(p);
        p.addEventListener('click', e => {
            e.stopPropagation();
            const b = e.target.closest('[data-wa]'); if (!b || b.tagName === 'INPUT') return;
            if (b.dataset.wa === 'on') setOn(!st.on);
            else if (b.dataset.wa === 'warp') { prefs.warp = !prefs.warp; save(); if (!prefs.warp) killWarp(0.2); paint(); }
        });
        const r = p.querySelector('input[data-wa=vol]');
        r.addEventListener('input', () => { prefs.vol = C.clampVol(r.value); if (st.on && st.master && running()) ramp(st.master.gain, C.masterGain(prefs.vol), 0.06); paint(); });
        r.addEventListener('change', save);
        host.appendChild(p); paint();
        const sw = p.querySelector('[data-wa=on]'); sw && sw.focus && sw.focus({ preventScroll: true });
    }
    function paint() {
        const host = D.querySelector('.bw3-full'); if (!host) return;
        const btn = host.querySelector('.wa-btn'), p = host.querySelector('.wa-panel'), on = st.on;
        if (btn) {
            const sig = (on ? 1 : 0) + lang() + (p ? 1 : 0);
            if (btn.dataset.sig !== sig) { btn.innerHTML = (on ? ICON_ON : ICON_OFF) + '<span>' + tr('btn') + '</span>'; btn.dataset.sig = sig; }
            btn.dataset.on = on ? '1' : '0';
            btn.setAttribute('aria-label', tr('aria') + ': ' + (on ? tr('on') : tr('off')));
            btn.setAttribute('aria-expanded', p ? 'true' : 'false');
        }
        if (p) {
            const sw = p.querySelector('[data-wa=on]'); sw.setAttribute('aria-checked', String(on)); sw.querySelector('span').textContent = on ? tr('on') : tr('off'); sw.setAttribute('aria-label', tr('title'));
            const ws = p.querySelector('[data-wa=warp]'); ws.setAttribute('aria-checked', String(prefs.warp)); ws.querySelector('span').textContent = prefs.warp ? tr('on') : tr('off');
            const r = p.querySelector('input[data-wa=vol]'); if (String(r.value) !== String(prefs.vol) && D.activeElement !== r) r.value = prefs.vol; p.querySelector('output').textContent = prefs.vol + ' %';
            r.style.setProperty('--v', prefs.vol + '%');
            p.classList.toggle('wa-is-on', on);
        }
    }
    /* outside tap closes the panel (the world keeps its drag) */
    D.addEventListener('pointerdown', e => { const p = D.querySelector('.wa-panel'); if (p && !p.contains(e.target) && !(e.target.closest && e.target.closest('.wa-btn'))) togglePanel(false); }, true);

    /* ---------- lifecycle ---------- */
    let wasOpen = false;
    function sync() {
        const open = isOpen();
        if (open) ensureUi();
        if (open !== wasOpen) {
            wasOpen = open;
            if (!open) { pause(C.CLOSE_FADE); const p = D.getElementById('waPanel'); if (p) p.remove(); }
            else if (st.on && st.ctx && !D.hidden) begin();   /* woken by the tap that opened it; otherwise the next tap in the world wakes it */
        }
    }
    new MutationObserver(sync).observe(H, { attributes: true, attributeFilter: ['class'] });
    /* reopening the world with a tap while sound was on in this visit: resume inside that same tap (iOS) */
    function tapResume(e) {
        if (!st.on || D.hidden || !st.ctx) return;
        if (isOpen()) { if (!running() || !st.amb) begin(); return; }
        /* the world may open a moment after this tap (Home 3D button, cell ride): wake the context inside the tap, and put it
           back to sleep if the world does not open */
        const t = e && e.target; if (t && t.closest && t.closest('.bw3-full')) return;   /* the tap that closed the world */
        try { const p = st.ctx.resume(); if (p && p.catch) p.catch(() => { }); } catch (x) { }
        clearTimeout(st.idleT); st.idleT = setTimeout(() => { if (!isOpen() && running()) st.ctx.suspend().catch(() => { }); }, 3000);
    }
    D.addEventListener('click', tapResume, true);              /* capture: open buttons may stop the click from bubbling */
    D.addEventListener('touchend', tapResume, { passive: true, capture: true });
    D.addEventListener('visibilitychange', () => {
        if (!st.ctx) return;
        if (D.hidden) { killWarp(0.05); stopAmbient(0); try { st.master.gain.cancelScheduledValues(0); st.master.gain.value = 0; } catch (e) { } st.ctx.suspend().catch(() => { }); }
        else if (st.on && isOpen()) begin();   /* may need the next tap on iOS: tapResume handles that */
        paint();
    });
    W.addEventListener('pagehide', () => { if (st.ctx) { stopAmbient(0); try { st.ctx.close(); } catch (e) { } st.ctx = null; st.master = st.ambBus = st.fxBus = null; } });
    W.addEventListener('lowi:lang', () => { const p = D.getElementById('waPanel'); if (p) { p.remove(); togglePanel(true); } paint(); });
    setInterval(() => { if (!D.hidden) sync(); }, 1500);
    sync();

    W.LowiWorldAudio = {
        get on() { return st.on; }, get state() { return st.ctx ? st.ctx.state : 'none'; }, get ambient() { return !!st.amb; }, get warp() { return st.warp ? st.warp.phase : null; },
        get plays() { return Object.assign({}, st.plays); }, get gain() { return st.master ? st.master.gain.value : 0; }, prefs: () => Object.assign({}, prefs),
        setOn, open: () => togglePanel(true), close: () => togglePanel(false)
    };
})();
