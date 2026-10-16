/* LOWiSPIKE world sound (Oct 15, 2026). An optional, calm soundscape for the 3D body world plus warp sounds on the real fly-to.
   - A "Klang" pill sits in the world's top bar next to the X. It opens a small panel: on/off switch, volume, warp sounds.
   - Sound is opt-in: the AudioContext is created and resumed only inside a tap (iOS rule). Nothing turns sound on by itself;
     only the volume and the warp switch are stored (lowi.worldAudio), so a reload is always silent.
   - Ambient (Oct 16 rework, handoff task 9): calm meditation sound. LIGHT: a soft breathing pad gliding through open chords
     and a singing bowl now and then. No noise band (it hummed like a microwave) and no pulse. UNEASY: a deeper, darker pad
     and a slow low bowl, silent until the shared game-world mood (world-mood.js, LowiWorldMood.level) turns stormy, then it
     fades in slowly and the light layer dips. Capped master, limiter at 3 kHz low-pass, no beeps, nothing piercing.
   - The panel (Sound on Home, Klang in the world) opens with the glass string pad (sound-strings.js) on top.
   - Oct 16 (Eman: "I'm playing with the strings ... I'm not actually controlling what the background sound is going to be ...
     and then it automatically just resets it"): the strings now set the TUNE of the ongoing soundscape (world-audio-core.js:
     key from the string, brightness/level from the height, pitch shift from sliding along a string). setTune() glides the
     running pads, filter and level to it, and the bowls strike in that key. It is stored in localStorage (lowi.soundTune) and
     nothing resets it: the old 22-second chord walk is gone, start/stop/visibility rebuild the sound from the stored tune, and
     the stormy-world layer only fades in on top (it never touches the tune). "Reset sound" in the pad is the only way back.
   - Warp: window 'lowi:world-warp' {phase:'start'|'dive'|'arrive'|'cancel'} from body-world-regions.js (the real glide/dive/
     settle), plus the cell ride's 'lowi:ride-start'/'lowi:ride-arrive'. One warp voice at a time, duplicate phases ignored.
   - Lifecycle: world closes -> fade out, sources stopped, context suspended. App hidden -> suspended. Reopening the world with a
     tap brings it back while the app stays open. Page hide -> context closed. Oct 16: once on, it plays on every tab while the app
     is in front, stepping aside for videos, voice notes, the workout player and the ride; never with the screen locked. */
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
    /* the listener's tune (set by the strings, kept until Reset sound) */
    let tune = C.loadTune((() => { try { return localStorage.getItem(C.TUNE_KEY); } catch (e) { return null; } })());
    let tuneSaveT = 0;
    function saveTune() { clearTimeout(tuneSaveT); tuneSaveT = 0; try { localStorage.setItem(C.TUNE_KEY, C.saveTune(tune)); } catch (e) { } }

    /* ---------- audio engine ---------- */
    const st = { on: false, idleT: 0, ctx: null, master: null, out: null, ambBus: null, fxBus: null, amb: null, warp: null, last: null, plays: { start: 0, dive: 0, arrive: 0, ride: 0 }, bowlT: 0, bowlN: 0, lowT: 0, lowN: 0, timer: 0, stopT: 0, playing: false };
    /* the world is "open" as the full window, or as the living Home background (Home is the world now) */
    const homeLive = () => H.classList.contains('wh-world-live') && H.classList.contains('wh-home') && !H.classList.contains('bw3-full-open') && !!D.getElementById('whHud');
    const isOpen = () => (H.classList.contains('bw3-full-open') && !!D.querySelector('.bw3-full')) || homeLive();
    /* Oct 16 (E-man: "the sound disappears when I go into Community, Cook or Move. It should only stop for a voice note, a video
       or the game"): once he turns sound on it keeps playing on every tab while the app is in front. It steps aside only while
       real media plays (a video or audio with sound, a For You embed, the workout player, the cell ride) or another part of the
       app says so with window 'lowi:media' {on:true|false}, and comes back when that ends. */
    const mediaHold = new Set();
    const busy = () => mediaHold.size > 0 || H.classList.contains('mp-on') || H.classList.contains('br-open') || !!D.querySelector('.fye-on .fye-in, .fye-on .fye-ready') ||
        Array.prototype.some.call(D.querySelectorAll('video,audio'), m => !m.paused && !m.ended && !m.muted && m.volume > 0);
    const audible = () => st.on && !D.hidden && !busy();
    const uiHost = () => D.querySelector('.bw3-full') || (homeLive() ? D.getElementById('whHud') : null);
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
        Object.assign(st, { ctx, master, ambBus, fxBus, out: tone });
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
    const moodLevel = () => { try { return W.LowiWorldMood ? +W.LowiWorldMood.level || 0 : 0; } catch (e) { return 0; } };
    /* a soft pad: per note a sine and a quiet, low-passed triangle a few cents apart (warm, no buzz), breathing slowly */
    function padVoices(ctx, P, notes, bus, now, srcs, nodes) {
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = P.lp; lp.Q.value = 0.4;
        const g = ctx.createGain(); g.gain.value = P.gain; lp.connect(g); g.connect(bus);
        const lg = lfo(ctx, P.lfo, P.gain * (P.depth || 0.3), g.gain, 0);
        const voices = notes.map((hz, i) => {
            const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz; o.detune.value = (i - 1) * (P.detune || 4);
            const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = hz; o2.detune.value = -(i - 1) * (P.detune || 4) - 5;
            const sg = ctx.createGain(); sg.gain.value = P.soft == null ? 0.25 : P.soft;
            o.connect(lp); o2.connect(sg); sg.connect(lp); o.start(now); o2.start(now); srcs.push(o, o2); nodes.push(sg);
            return [o, o2];
        });
        srcs.push(lg[0]); nodes.push(lp, g, lg[1]);
        voices.lp = lp;
        return voices;
    }
    /* one singing-bowl strike (calm-sound-core.js bowl(): partials in detuned pairs that beat slowly, long ring) */
    function strike(ctx, B, hz, t, pan, bus) {
        const CS = W.LowiCalmSoundCore, parts = CS ? CS.bowl(hz, { decay: B.decay }) : [{ hz, amp: 1, beat: 1, decay: B.decay }];
        const g = ctx.createGain(); g.gain.value = 1; let out = g;
        if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan || 0; g.connect(p); out = p; }
        out.connect(bus);
        let end = t;
        parts.forEach(pt => [-0.5, 0.5].forEach(side => {
            const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = pt.hz + side * pt.beat;
            const e = ctx.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(pt.amp * 0.5, t + B.attack); e.gain.setTargetAtTime(0.0001, t + B.attack, pt.decay / 4);
            o.connect(e); e.connect(g); const stopAt = t + B.attack + pt.decay * 1.3; o.start(t); o.stop(stopAt); end = Math.max(end, stopAt);
            o.onended = () => { try { e.disconnect(); } catch (x) { } };
        }));
        setTimeout(() => { try { g.disconnect(); out.disconnect(); } catch (x) { } }, (end - ctx.currentTime + 0.5) * 1000);
    }
    function startAmbient() {
        const ctx = st.ctx; if (!ctx || st.amb) return;
        const M = C.MIX, U = C.UNEASY, nodes = [], srcs = [], now = ctx.currentTime;
        const lightBus = ctx.createGain(); lightBus.gain.value = 1; lightBus.connect(st.ambBus);
        const uneasyBus = ctx.createGain(); uneasyBus.gain.value = 0; uneasyBus.connect(st.ambBus);
        nodes.push(lightBus, uneasyBus);
        /* LIGHT: the soft pad, holding the open chord of the listener's key (only setTune() moves it) */
        const padLvl = ctx.createGain(); padLvl.gain.value = C.padLevel(tune); padLvl.connect(lightBus); nodes.push(padLvl);
        const pad = padVoices(ctx, Object.assign({}, M.pad, { lp: C.padLp(tune) }), C.padChord(tune), padLvl, now, srcs, nodes);
        const bowlBus = ctx.createGain(); bowlBus.gain.value = M.bowl.gain;
        const blp = ctx.createBiquadFilter(); blp.type = 'lowpass'; blp.frequency.value = M.bowl.lp; bowlBus.connect(blp); blp.connect(lightBus); nodes.push(bowlBus, blp);
        /* UNEASY: a deeper, darker pad and a slow low bowl. Silent until the game world turns stormy */
        const deep = padVoices(ctx, U.pad, C.uneasyNotes(tune), uneasyBus, now, srcs, nodes);
        const lowBus = ctx.createGain(); lowBus.gain.value = U.bowl.gain;
        const llp = ctx.createBiquadFilter(); llp.type = 'lowpass'; llp.frequency.value = U.bowl.lp; lowBus.connect(llp); llp.connect(uneasyBus); nodes.push(lowBus, llp);
        st.amb = { srcs, nodes, pad, deep, padLvl, t0: now, bowlBus, lowBus, lightBus, uneasyBus, level: -1 };
        st.bowlT = now + 2.5; st.bowlN = 0; st.lowT = now + 6; st.lowN = 0;
        setMood(true);
        clearInterval(st.timer); st.timer = setInterval(schedule, 250); schedule();
    }
    /* follow the shared game-world mood: the deep layer fades in/out slowly (about 5 s), the light layer dips a little */
    function setMood(now) {
        const a = st.amb, ctx = st.ctx; if (!a || !ctx) return;
        const lv = moodLevel(); if (lv === a.level) return; a.level = lv;
        const tc = now ? 0.05 : C.UNEASY.tc;
        ramp(a.uneasyBus.gain, lv * C.UNEASY.gain, tc);
        ramp(a.lightBus.gain, 1 - (1 - C.MIX.lightDuck) * lv, tc);
    }
    /* glide the running sound to the tune (his changes follow the finger smoothly and then hold) */
    function applyTune(tc) {
        const a = st.amb, ctx = st.ctx; if (!a || !ctx) return;
        const T = C.TUNE, g = tc == null ? T.glide : tc, ch = C.padChord(tune), dn = C.uneasyNotes(tune);
        a.pad.forEach((v, i) => v.forEach(o => ramp(o.frequency, ch[i] || ch[0], g)));
        a.deep.forEach((v, i) => v.forEach(o => ramp(o.frequency, dn[i] || dn[0], g)));
        ramp(a.pad.lp.frequency, C.padLp(tune), tc == null ? T.filterGlide : tc);
        ramp(a.padLvl.gain, C.padLevel(tune), tc == null ? T.filterGlide : tc);
    }
    function emitTune() { try { W.dispatchEvent(new CustomEvent('lowi:sound-tune', { detail: Object.assign({}, tune) })); } catch (e) { } }
    /* the string pad calls this while you play: the change is heard at once and stored (debounced while the finger moves) */
    function setTune(patch, commit) {
        tune = C.tuneFrom(tune, patch || {});
        applyTune();
        if (commit) saveTune(); else { clearTimeout(tuneSaveT); tuneSaveT = setTimeout(saveTune, 300); }
        emitTune();
        return Object.assign({}, tune);
    }
    function resetTune() {
        tune = C.tuneFrom(C.TUNE_DEFAULTS, {});
        applyTune(0.6); saveTune(); emitTune();
        return Object.assign({}, tune);
    }
    /* the first string touch starts the background sound (inside that touch, iOS), unless he switched it off himself */
    function wake() { if (!st.on && !st.userOff && !sfxMuted() && isOpen()) setOn(true); }
    function bowlsDue(B, key, bus, until) {
        const ctx = st.ctx;
        if (st[key + 'T'] < ctx.currentTime) st[key + 'T'] = ctx.currentTime + 0.3;
        while (st[key + 'T'] < until) {
            const t = st[key + 'T'], n = C.bowls(0, B.gap[1] + 1, st[key + 'N'], B)[0] || { hz: B.notes[0], pan: 0, gap: B.gap[1] };
            strike(ctx, B, n.hz, t, n.pan, bus);
            st[key + 'N']++; st[key + 'T'] = t + (n.gap || B.gap[1]);
        }
    }
    function schedule() {
        const ctx = st.ctx, a = st.amb; if (!ctx || !a || ctx.state !== 'running') return;
        setMood(false);
        const until = ctx.currentTime + 0.8;
        /* the pad holds the listener's chord: nothing here retunes it. The bowls strike in his key */
        bowlsDue(Object.assign({}, C.MIX.bowl, { notes: C.bowlNotes(tune) }), 'bowl', a.bowlBus, until);
        /* the low bowl only while the deep layer is audible */
        if ((a.level || 0) <= 0.01) { st.lowT = until; return; }
        bowlsDue(Object.assign({}, C.UNEASY.bowl, { notes: C.lowBowlNotes(tune) }), 'low', a.lowBus, until);
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
        st.stopT = setTimeout(() => { if (st.ctx && st.ctx.state === 'running' && !audible()) st.ctx.suspend().catch(() => { }); paint(); }, ((fade || C.FADE_OUT) + 0.25) * 1000);
        paint();
    }
    function setOn(on) {
        st.on = !!on;
        if (st.on) { if (!begin()) st.on = false; } else pause(C.FADE_OUT);
        wasPlay = st.on && audible();
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
    W.addEventListener('lowi:world-mood', () => setMood(false));
    W.addEventListener('lowi:world-warp', e => { const d = e && e.detail || {}; onWarp(d.phase, d.id); });
    W.addEventListener('lowi:ride-start', e => { if (!st.ctx || !warpOk()) return; const id = 'ride:' + ((e.detail && e.detail.place) || ''); onWarp('start', id); st.plays.ride++; const v = st.warp; if (v) { clearTimeout(v.t); v.t = setTimeout(() => { if (st.warp === v) killWarp(1.2); }, 1600); } });
    W.addEventListener('lowi:ride-arrive', e => { if (!st.ctx || !warpOk()) return; onWarp('arrive', 'ride:' + ((e.detail && e.detail.place) || '')); });

    /* ---------- UI: pill in the world's top bar + small panel ---------- */
    const ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" stroke="none"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
    const ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" stroke="none"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
    const stop = el => ['pointerdown', 'touchstart', 'wheel', 'mousedown'].forEach(n => el.addEventListener(n, e => e.stopPropagation(), { passive: true }));
    function ensureUi() {
        const host = uiHost(); if (!host) return null;
        let btn = host.querySelector('.wa-btn'); if (btn) return btn;
        btn = D.createElement('button'); btn.type = 'button'; btn.className = 'wa-btn'; btn.id = 'waBtn';
        btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
        btn.addEventListener('click', e => { e.stopPropagation(); togglePanel(); });
        stop(btn);
        const top = host.querySelector('.bw3-top'), x = top && top.querySelector('.bw3-x');
        if (x) top.insertBefore(btn, x); else { btn.classList.add('wa-float'); if (host.id === 'whHud') btn.classList.add('wa-home'); host.appendChild(btn); }
        paint(); return btn;
    }
    /* Oct 16 (handoff task 9): Sound on Home opens the glass string pad first (sound-strings.js mounts into .wa-strings);
       the background sound switch, its volume and the warp sounds sit below it */
    function panelHtml() {
        return '<div class="wa-hd"><b>' + tr('title') + '</b><button type="button" class="wa-x" data-wa="x" aria-label="' + tr('close') + '">\u00d7</button></div>' +
            '<div class="wa-strings" data-wa-strings></div>' +
            '<div class="wa-row wa-amb"><span>' + tr('ambient') + '</span><button type="button" class="wa-sw" role="switch" data-wa="on"><i></i><span></span></button></div>' +
            '<label class="wa-row wa-vol"><span>' + tr('vol') + '</span><input type="range" min="0" max="100" step="1" data-wa="vol" aria-label="' + tr('vol') + '"><output></output></label>' +
            '<div class="wa-row wa-warp"><span>' + tr('warp') + '</span><button type="button" class="wa-sw wa-sm" role="switch" data-wa="warp" aria-label="' + tr('warp') + '"><i></i><span></span></button></div>' +
            '<p>' + tr('note') + '</p><p class="wa-quiet">' + tr('quiet') + '</p>';
    }
    /* the string pad plays through this world's audio graph, bypassing the ambient master (so it works with the background
       sound off) but following the same volume slider and the app-wide sound switch. Call only inside a user gesture. */
    function sfxMuted() { try { return !!(W.LowiSFX && typeof W.LowiSFX.on === 'function' && W.LowiSFX.on() === false); } catch (e) { return false; } }
    function instrument() {
        if (sfxMuted()) return { muted: true, vol: prefs.vol };
        const ctx = ensureCtx(); if (!ctx) return null;
        clearTimeout(st.stopT); clearTimeout(st.idleT);
        if (ctx.state !== 'running') { try { const pr = ctx.resume(); if (pr && pr.catch) pr.catch(() => { }); } catch (e) { } }
        return { ctx, out: st.out, gain: +(C.masterGain(prefs.vol) * 3).toFixed(4), vol: prefs.vol, muted: false };
    }
    /* the pad closed: if the background sound is off, let the strings ring out, then put the context back to sleep */
    function instrumentIdle() {
        clearTimeout(st.idleT);
        st.idleT = setTimeout(() => { if (st.ctx && !audible() && running()) st.ctx.suspend().catch(() => { }); }, 2200);
    }
    function removePanel(p) {
        if (!p) return;
        try { W.LowiSoundStrings && W.LowiSoundStrings.unmount(p.querySelector('[data-wa-strings]')); } catch (e) { }
        p.remove(); instrumentIdle();
    }
    function togglePanel(force) {
        const host = uiHost(); if (!host) return;
        let p = host.querySelector('.wa-panel'); const want = force == null ? !p : !!force;
        if (!want) { if (p) removePanel(p); paint(); return; }
        if (p) return;
        p = D.createElement('div'); p.className = 'wa-panel'; p.id = 'waPanel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', tr('aria'));
        p.innerHTML = panelHtml(); stop(p);
        p.addEventListener('click', e => {
            e.stopPropagation();
            const b = e.target.closest('[data-wa]'); if (!b || b.tagName === 'INPUT') return;
            if (b.dataset.wa === 'on') { st.userOff = st.on; setOn(!st.on); }
            else if (b.dataset.wa === 'x') { togglePanel(false); const bt = host.querySelector('.wa-btn'); bt && bt.focus && bt.focus({ preventScroll: true }); }
            else if (b.dataset.wa === 'warp') { prefs.warp = !prefs.warp; save(); if (!prefs.warp) killWarp(0.2); paint(); }
        });
        const r = p.querySelector('input[data-wa=vol]');
        r.addEventListener('input', () => { prefs.vol = C.clampVol(r.value); if (st.on && st.master && running()) ramp(st.master.gain, C.masterGain(prefs.vol), 0.06); paint(); });
        r.addEventListener('change', save);
        host.appendChild(p); paint();
        const sp = p.querySelector('[data-wa-strings]');
        if (W.LowiSoundStrings && sp) { try { W.LowiSoundStrings.mount(sp, { instrument, idle: instrumentIdle, lang, tune: () => Object.assign({}, tune), setTune, resetTune, wake, ambientOn: () => st.on }); } catch (e) { sp.remove(); } }
        else if (sp) sp.remove();
        const sw = p.querySelector('[data-wa=x]') || p.querySelector('[data-wa=on]'); sw && sw.focus && sw.focus({ preventScroll: true });
    }
    function paint() {
        const host = uiHost(); if (!host) return;
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
    D.addEventListener('keydown', e => { if (e.key === 'Escape' && D.getElementById('waPanel')) togglePanel(false); });

    /* ---------- lifecycle ---------- */
    let wasOpen = false, wasPlay = false;
    function sync() {
        const open = isOpen();
        if (open) ensureUi();
        if (open !== wasOpen) { wasOpen = open; if (!open) removePanel(D.getElementById('waPanel')); }
        const want = audible();
        if (want !== wasPlay) {
            wasPlay = want;
            if (!want) { if (st.ctx && (st.amb || running())) pause(C.CLOSE_FADE); }
            else if (st.ctx) begin();   /* iOS may want a tap to resume: tapResume wakes it on the next one */
        }
    }
    new MutationObserver(sync).observe(H, { attributes: true, attributeFilter: ['class'] });
    /* reopening the world with a tap while sound was on in this visit: resume inside that same tap (iOS) */
    function tapResume(e) {
        if (!st.on || D.hidden || !st.ctx) return;
        /* sound is on: any tap on any tab brings it back if iOS put it to sleep (unless a video, voice note or the game is playing) */
        if (audible()) { if (!running() || !st.amb) begin(); return; }
        try { const p = st.ctx.resume(); if (p && p.catch) p.catch(() => { }); } catch (x) { }
        clearTimeout(st.idleT); st.idleT = setTimeout(() => { if (!audible() && running()) st.ctx.suspend().catch(() => { }); }, 3000);
    }
    D.addEventListener('click', tapResume, true);              /* capture: open buttons may stop the click from bubbling */
    D.addEventListener('touchend', tapResume, { passive: true, capture: true });
    D.addEventListener('visibilitychange', () => {
        if (!st.ctx) return;
        if (D.hidden) { killWarp(0.05); stopAmbient(0); try { st.master.gain.cancelScheduledValues(0); st.master.gain.value = 0; } catch (e) { } st.ctx.suspend().catch(() => { }); }
        else if (audible()) begin();   /* may need the next tap on iOS: tapResume handles that */
        wasPlay = audible() && !!st.amb;
        paint();
    });
    W.addEventListener('pagehide', () => { if (tuneSaveT) saveTune(); if (st.ctx) { stopAmbient(0); try { st.ctx.close(); } catch (e) { } st.ctx = null; st.master = st.ambBus = st.fxBus = null; } });
    W.addEventListener('lowi:lang', () => { const p = D.getElementById('waPanel'); if (p) { removePanel(p); togglePanel(true); } paint(); });
    ['play', 'playing', 'pause', 'ended', 'volumechange'].forEach(k => D.addEventListener(k, () => setTimeout(sync, 30), true));
    W.addEventListener('lowi:media', e => { const d = e.detail || {}, id = d.id || 'media'; if (d.on) mediaHold.add(id); else mediaHold.delete(id); sync(); });
    setInterval(() => { if (!D.hidden) sync(); }, 1500);
    sync();

    W.LowiWorldAudio = {
        get on() { return st.on; }, get state() { return st.ctx ? st.ctx.state : 'none'; }, get ambient() { return !!st.amb; }, get uneasy() { return st.amb ? +st.amb.uneasyBus.gain.value.toFixed(4) : 0; }, get light() { return st.amb ? +st.amb.lightBus.gain.value.toFixed(4) : 0; }, get mood() { return st.amb ? st.amb.level : null; }, get warp() { return st.warp ? st.warp.phase : null; },
        get plays() { return Object.assign({}, st.plays); }, get gain() { return st.master ? st.master.gain.value : 0; }, prefs: () => Object.assign({}, prefs),
        setOn, open: () => togglePanel(true), close: () => togglePanel(false), instrument, get bowls() { return st.bowlN; },
        tune: () => Object.assign({}, tune), setTune, resetTune,
        /* what is really playing (for checks): pad frequencies, filter and level read back from the audio graph */
        get playing() { const a = st.amb; return a ? { chord: a.pad.map(v => +v[0].frequency.value.toFixed(2)), lp: Math.round(a.pad.lp.frequency.value), level: +a.padLvl.gain.value.toFixed(3) } : null; }
    };
})();
