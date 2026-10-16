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
        pad: { gain: 0.045, chords: [[293.66, 440, 659.25], [246.94, 369.99, 587.33], [329.63, 493.88, 587.33], [220, 329.63, 493.88]],
            hold: 22, glide: 1.6, lp: 1100, lfo: 0.05, depth: 0.35, detune: 6, soft: 0.25 },
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
    /* which pad chord plays at time t (seconds since the sound started) */
    function chordAt(t) { const C = MIX.pad.chords; return C[Math.floor(Math.max(0, +t || 0) / MIX.pad.hold) % C.length]; }
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
        MIX.pad.chords.forEach(c => hz.push.apply(hz, c));
        MIX.bowl.notes.concat(U.bowl.notes).forEach(f => BOWL_RATIOS.forEach(r => { if (f * r <= MAX_HZ) hz.push(f * r); }));
        return hz.concat(U.pad.notes, WARP.start.from, WARP.start.to, WARP.start.sub, WARP.dive.up, WARP.dive.down, WARP.dive.sub, WARP.arrive.notes, WARP.arrive.lp, WARP.home.notes, WARP.home.lp);
    }
    /* the normal (light) layer only: no low rumble */
    function lightHz() { const hz = []; MIX.pad.chords.forEach(c => hz.push.apply(hz, c)); return hz.concat(MIX.bowl.notes); }
    const STR = {
        btn: ['Sound', 'Klang', 'Sonido'],
        aria: ['Body world sound', 'Klang der K\u00f6rperwelt', 'Sonido del mundo del cuerpo'],
        title: ['Body sound', 'K\u00f6rperklang', 'Sonido del cuerpo'],
        on: ['On', 'An', 'S\u00ed'], off: ['Off', 'Aus', 'No'],
        vol: ['Volume', 'Lautst\u00e4rke', 'Volumen'],
        warp: ['Warp sounds', 'Warp-Kl\u00e4nge', 'Sonidos del warp'],
        note: ['Soft pads and singing bowls while the world is open. The sound turns deeper and slower when today\u2019s logs show spikes. Starts only when you turn it on.',
            'Sanfte Kl\u00e4nge und Klangschalen, solange die Welt offen ist. Zeigen deine Eintr\u00e4ge von heute Spikes, wird der Klang tiefer und langsamer. Startet nur, wenn du es einschaltest.',
            'Pads suaves y cuencos sonoros mientras el mundo est\u00e1 abierto. El sonido se vuelve m\u00e1s grave y lento cuando tus registros de hoy muestran picos. Solo empieza si lo activas.'],
        ambient: ['Background sound', 'Hintergrundklang', 'Sonido de fondo'],
        quiet: ['Nothing to hear? Check your device volume and silent switch.', 'Nichts zu h\u00f6ren? Pr\u00fcf die Lautst\u00e4rke und den Stumm-Schalter deines Ger\u00e4ts.', '\u00bfNo oyes nada? Revisa el volumen y el modo silencio de tu dispositivo.'],
        close: ['Close', 'Schlie\u00dfen', 'Cerrar']
    };
    function t(key, lang) { const a = STR[key]; if (!a) return ''; const i = { en: 0, de: 1, es: 2 }[String(lang || 'de').slice(0, 2)]; return a[i == null ? 1 : i]; }
    const api = { KEY, DEFAULTS, MAX_MASTER, MAX_HZ, FADE_IN, FADE_OUT, CLOSE_FADE, MIX, UNEASY, WARP, bowls, chordAt, BOWL_RATIOS, lightHz, STR, clampVol, masterGain, loadPrefs, savePrefs, guard, audible, warpAudible, allHz, t };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiWorldAudioCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
