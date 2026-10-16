/* LOWiSPIKE world sound core (Oct 15, 2026). Pure helpers for world-audio.js: prefs, volume curve, the comfortable mix,
   warp sound plans and duplicate guard, strings. No DOM, no audio here (node tests load it).
   Comfort rules (user: calm background for an iPad, meditation, falling asleep, gym display; some listeners have tinnitus or
   anxiety): opt-in only, never autoplay, nothing stored that turns sound on by itself (only the volume and the warp switch),
   slow fades, everything low-passed at 3 kHz (light, but no piercing tones), no beeps, no noise hum, no pulse, a limiter on the output, and a capped master.
   No health, sleep, tinnitus or anxiety claims anywhere in the copy. */
(function (root) {
    'use strict';
    const KEY = 'lowi.worldAudio';
    const DEFAULTS = { vol: 40, warp: true };
    const MAX_MASTER = 0.5;          /* master gain at 100 % (before the limiter) */
    const MAX_HZ = 3000;             /* no layer, filter, partial or sweep goes above this */
    const FADE_IN = 3.5, FADE_OUT = 0.6, CLOSE_FADE = 0.5;
    function clampVol(v) { v = Math.round(Number(v)); return isFinite(v) ? Math.max(0, Math.min(100, v)) : DEFAULTS.vol; }
    /* perceptual curve: quiet end stays usable, 100 % is still restrained */
    function masterGain(vol) { const x = clampVol(vol) / 100; return +(MAX_MASTER * Math.pow(x, 1.7)).toFixed(4); }
    function loadPrefs(raw) {
        let o = null; try { o = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { o = null; }
        if (!o || typeof o !== 'object') o = {};
        return { vol: o.vol == null ? DEFAULTS.vol : clampVol(o.vol), warp: o.warp !== false };
    }
    /* the on/off state is never written: a reload always starts silent */
    function savePrefs(p) { const q = loadPrefs(p || {}); return JSON.stringify({ vol: q.vol, warp: q.warp }); }

    /* the ambient mix. Oct 16 (E-man, handoff task 9: "replace the harsh microwave tone with calm meditation pads and singing
       bowls"): the steady noise band (it hummed like a microwave fan) and the low 58 Hz pulse are gone. Nothing is noise any more.
       LIGHT is the normal sound: a soft pad (sine + soft triangle pairs, low-passed, breathing slowly) that glides through four
       open chords of one D-major pentatonic, plus a singing bowl now and then (bowl() in calm-sound-core.js: slow beating
       partials, felt-mallet attack, long ring). UNEASY (the stormy-world cue) is a deeper, darker pad and a slow low bowl:
       still a clear change of mood, but no rumble and no pulse. rates in Hz (LFO), gains relative to the master */
    const MIX = {
        bus: 0.9, limiter: { threshold: -20, knee: 8, ratio: 10, attack: 0.01, release: 0.4 }, tone: 3000,
        /* Oct 16 (string pad control): the pad no longer walks through a chord list on its own (that walk is what pulled the
           sound away from what Eman played). It holds one open voicing (root, fifth, ninth) on the root he picks with the strings */
        pad: { gain: 0.045, voicing: [1, 1.5, 2.245], glide: 1.6, lp: 1100, lfo: 0.05, depth: 0.35, detune: 6, soft: 0.25 },
        bowl: { gain: 0.06, notes: [293.66, 329.63, 440, 493.88, 587.33], gap: [12, 24], attack: 0.07, decay: 10, lp: 2600 },
        lightDuck: 0.75                                                               /* light layer a little lower while uneasy */
    };
    const UNEASY = {
        gain: 1, tc: 1.6,                                                             /* fade time constant: about 5 s in or out */
        pad: { gain: 0.05, notes: [110, 130.81, 164.81], lp: 480, lfo: 0.03, depth: 0.3 },
        bowl: { gain: 0.07, notes: [146.83, 130.81], gap: [16, 26], attack: 0.12, decay: 12, lp: 900 },
        pulse: { every: 1.3 }                                                         /* the visual beat world-mood.js keeps; no audible pulse */
    };
    /* when the low layer joins is decided by the shared game-world mood (world-mood-core.js, LowiWorldMood): level 0..1 */
    /* sparse bowl strikes in [after, to): deterministic gaps and notes, never the same note twice in a row */
    function noteSeq(notes, i) { const n = notes.length, r = j => Math.floor(Math.abs(Math.sin((j + 1) * 12.9898) * 23421.631) % n); let prev = -1, cur = 0; for (let j = 0; j <= i; j++) { cur = r(j); if (cur === prev) cur = (cur + 1) % n; prev = cur; } return cur; }
    function bowls(after, to, n0, B) {
        B = B || MIX.bowl; const out = []; let t = after, i = n0 || 0;
        while (true) {
            const h = Math.abs(Math.sin((i + 1) * 78.233) * 43758.5453) % 1, gap = +(B.gap[0] + h * (B.gap[1] - B.gap[0])).toFixed(3);
            t += gap; if (t >= to) break;
            out.push({ t: +t.toFixed(3), gap, hz: B.notes[noteSeq(B.notes, i)], pan: +((h - 0.5) * 0.7).toFixed(2) }); i++;
        }
        return out;
    }
    /* ---------- the listener's tune (Oct 16, Eman: "I'm playing with the strings ... it seems like I'm not actually controlling
       what the background sound is going to be ... and then it automatically just resets it") ----------
       The string pad now shapes the ongoing soundscape, and what he sets stays:
       - root: which string he last touched (0..6, left = low) sets the key of the pads and the singing bowls;
       - bright: how high he touched (0 = bottom, 1 = top) opens the pad's filter and makes it fuller;
       - bend: sliding along a held string shifts the whole soundscape by up to a semitone either way (cents).
       Stored in localStorage (TUNE_KEY), so it survives closing the pad and reloading. Nothing in the engine changes it on its
       own: no chord walk, no timers, no mood or time-of-day retune (the stormy layer only fades in on top). Reset restores
       TUNE_DEFAULTS, which are exactly the old default sound (D, filter about 1 kHz, level 1). */
    const TUNE_KEY = 'lowi.soundTune';
    const TUNE_DEFAULTS = { root: 5, bright: 0.5, bend: 0 };
    const TUNE = {
        roots: [146.83, 164.81, 185, 220, 246.94, 293.66, 329.63],   /* the seven strings (D pentatonic) one octave down */
        names: ['D', 'E', 'F\u266f', 'A', 'B', 'D', 'E'], octaves: [3, 3, 3, 3, 3, 4, 4],
        ref: 293.66,                     /* the old default root: bowls and the stormy pad are written in this key */
        lp: [380, 2500],                 /* pad filter from the bottom to the top of the pad */
        level: [0.55, 1.45],             /* pad level from the bottom to the top of the pad */
        bend: 100,                       /* cents either way */
        glide: 0.35, filterGlide: 0.25   /* time constants for his changes: smooth, but you hear them follow your finger */
    };
    const clamp01 = v => { v = +v; return isFinite(v) ? Math.max(0, Math.min(1, v)) : null; };
    function tuneFrom(base, patch) {
        const b = base && typeof base === 'object' ? base : TUNE_DEFAULTS, p = patch && typeof patch === 'object' ? patch : {}, o = {};
        const r = p.root != null ? Math.round(+p.root) : Math.round(+b.root);
        o.root = isFinite(r) ? Math.max(0, Math.min(TUNE.roots.length - 1, r)) : TUNE_DEFAULTS.root;
        const br = clamp01(p.bright != null ? p.bright : b.bright);
        o.bright = br == null ? TUNE_DEFAULTS.bright : +br.toFixed(3);
        const bd = Math.round(+(p.bend != null ? p.bend : b.bend));
        o.bend = isFinite(bd) ? Math.max(-TUNE.bend, Math.min(TUNE.bend, bd)) : TUNE_DEFAULTS.bend;
        return o;
    }
    function loadTune(raw) {
        let o = null; try { o = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { o = null; }
        return tuneFrom(TUNE_DEFAULTS, o && typeof o === 'object' ? o : {});
    }
    function saveTune(t) { const q = tuneFrom(TUNE_DEFAULTS, t || {}); return JSON.stringify({ root: q.root, bright: q.bright, bend: q.bend }); }
    function isDefaultTune(t) { const q = tuneFrom(TUNE_DEFAULTS, t || {}); return q.root === TUNE_DEFAULTS.root && Math.abs(q.bright - TUNE_DEFAULTS.bright) < 0.005 && q.bend === 0; }
    const cents = c => Math.pow(2, (+c || 0) / 1200);
    /* the root in Hz (with the bend) and the factor everything else is moved by */
    function tuneRoot(t) { const q = tuneFrom(TUNE_DEFAULTS, t || {}); return +(TUNE.roots[q.root] * cents(q.bend)).toFixed(2); }
    function tuneRatio(t) { return tuneRoot(t) / TUNE.ref; }
    function padChord(t) { const r = tuneRoot(t); return MIX.pad.voicing.map(v => +(r * v).toFixed(2)); }
    function padLp(t) { const q = tuneFrom(TUNE_DEFAULTS, t || {}); return Math.round(TUNE.lp[0] * Math.pow(TUNE.lp[1] / TUNE.lp[0], q.bright)); }
    function padLevel(t) { const q = tuneFrom(TUNE_DEFAULTS, t || {}); return +(TUNE.level[0] + (TUNE.level[1] - TUNE.level[0]) * q.bright).toFixed(3); }
    function bowlNotes(t) { const k = tuneRatio(t); return MIX.bowl.notes.map(f => +(f * k).toFixed(2)); }
    /* the stormy pad follows his key too (so it never clashes), folded up an octave when it would sink into a rumble */
    function uneasyNotes(t) { let k = tuneRatio(t); if (k < 0.75) k *= 2; return UNEASY.pad.notes.map(f => +(f * k).toFixed(2)); }
    function lowBowlNotes(t) { let k = tuneRatio(t); if (k < 0.75) k *= 2; return UNEASY.bowl.notes.map(f => +(f * k).toFixed(2)); }
    /* what the pad shows: note name + octave, Hz, level in %, bend in cents */
    function tuneLabel(t) { const q = tuneFrom(TUNE_DEFAULTS, t || {}); return { note: TUNE.names[q.root], octave: TUNE.octaves[q.root], hz: Math.round(tuneRoot(q)), level: Math.round(q.bright * 100), bend: q.bend }; }
    /* warp: real phases from body-world-regions.js ('lowi:world-warp'): start (glide), dive (into the glow), arrive, cancel */
    const WARP = {
        gain: 0.42,
        start: { from: 170, to: 900, rise: 1.3, peak: 0.55, sub: [62, 96], max: 6 },
        dive: { up: 1300, down: 260, t: 0.75, peak: 1, sub: [96, 42] },
        arrive: { notes: [196, 293.66, 392], attack: 0.5, release: 2.4, gain: 0.05, lp: 900 },
        home: { notes: [174.61, 261.63], attack: 0.4, release: 1.8, gain: 0.035, lp: 800 },
        cancel: 0.18, minGap: 0.25
    };
    /* duplicate guard: the same phase for the same place inside minGap seconds plays once */
    function guard(last, phase, id, t) {
        if (last && last.phase === phase && last.id === id && t - last.t < WARP.minGap) return { play: false, last };
        return { play: true, last: { phase, id, t } };
    }
    /* should anything sound right now? */
    function audible(s) { return !!(s && s.on && s.open && !s.hidden); }
    function warpAudible(s) { return audible(s) && s.warp !== false && !!s.running; }
    const BOWL_RATIOS = [1, 2.71, 5.1];   /* same strike as calm-sound-core.js bowl() */
    function allHz() {
        const U = UNEASY, hz = [MIX.tone, MIX.pad.lp, MIX.bowl.lp, U.pad.lp, U.bowl.lp];
        tuneExtremes().forEach(t => { hz.push.apply(hz, padChord(t)); hz.push(padLp(t)); hz.push.apply(hz, uneasyNotes(t));
            bowlNotes(t).concat(lowBowlNotes(t)).forEach(f => BOWL_RATIOS.forEach(r => { if (f * r <= MAX_HZ) hz.push(f * r); })); });
        MIX.bowl.notes.concat(U.bowl.notes).forEach(f => BOWL_RATIOS.forEach(r => { if (f * r <= MAX_HZ) hz.push(f * r); }));
        return hz.concat(U.pad.notes, WARP.start.from, WARP.start.to, WARP.start.sub, WARP.dive.up, WARP.dive.down, WARP.dive.sub, WARP.arrive.notes, WARP.arrive.lp, WARP.home.notes, WARP.home.lp);
    }
    /* the normal (light) layer only: no low rumble */
    function lightHz() { const hz = []; tuneExtremes().forEach(t => { hz.push.apply(hz, padChord(t)); hz.push.apply(hz, bowlNotes(t)); }); return hz; }
    /* every root at both bend ends and both brightness ends (the range the strings can reach) */
    function tuneExtremes() { const out = []; TUNE.roots.forEach((f, root) => [-TUNE.bend, 0, TUNE.bend].forEach(bend => [0, 1].forEach(bright => out.push({ root, bend, bright })))); return out; }
    const STR = {
        btn: ['Sound', 'Klang', 'Sonido'],
        aria: ['Body world sound', 'Klang der K\u00f6rperwelt', 'Sonido del mundo del cuerpo'],
        title: ['Body sound', 'K\u00f6rperklang', 'Sonido del cuerpo'],
        on: ['On', 'An', 'S\u00ed'], off: ['Off', 'Aus', 'No'],
        vol: ['Volume', 'Lautst\u00e4rke', 'Volumen'],
        warp: ['Warp sounds', 'Warp-Kl\u00e4nge', 'Sonidos del warp'],
        note: ['Soft pads and singing bowls while the world is open. The strings set their key, brightness and pitch, and it stays that way until you reset it. Spiky logs today add a deeper layer on top. Starts only when you turn it on or play the strings.',
            'Sanfte Kl\u00e4nge und Klangschalen, solange die Welt offen ist. Die Saiten bestimmen Tonart, Helligkeit und Tonh\u00f6he, und so bleibt es, bis du es zur\u00fccksetzt. Zeigen deine Eintr\u00e4ge von heute Spikes, kommt eine tiefere Schicht dazu. Startet nur, wenn du es einschaltest oder die Saiten spielst.',
            'Pads suaves y cuencos sonoros mientras el mundo est\u00e1 abierto. Las cuerdas fijan su tono, brillo y afinaci\u00f3n, y as\u00ed se queda hasta que lo restableces. Si tus registros de hoy muestran picos, se suma una capa m\u00e1s grave. Solo empieza si lo activas o tocas las cuerdas.'],
        ambient: ['Background sound', 'Hintergrundklang', 'Sonido de fondo'],
        quiet: ['Nothing to hear? Check your device volume and silent switch.', 'Nichts zu h\u00f6ren? Pr\u00fcf die Lautst\u00e4rke und den Stumm-Schalter deines Ger\u00e4ts.', '\u00bfNo oyes nada? Revisa el volumen y el modo silencio de tu dispositivo.'],
        close: ['Close', 'Schlie\u00dfen', 'Cerrar']
    };
    function t(key, lang) { const a = STR[key]; if (!a) return ''; const i = { en: 0, de: 1, es: 2 }[String(lang || 'de').slice(0, 2)]; return a[i == null ? 1 : i]; }
    const api = { KEY, DEFAULTS, MAX_MASTER, MAX_HZ, FADE_IN, FADE_OUT, CLOSE_FADE, MIX, UNEASY, WARP, bowls, BOWL_RATIOS, TUNE_KEY, TUNE_DEFAULTS, TUNE, tuneFrom, loadTune, saveTune, isDefaultTune, tuneRoot, tuneRatio, padChord, padLp, padLevel, bowlNotes, uneasyNotes, lowBowlNotes, tuneLabel, tuneExtremes, lightHz, STR, clampVol, masterGain, loadPrefs, savePrefs, guard, audible, warpAudible, allHz, t };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiWorldAudioCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
