/* LOWiSPIKE world sound core (Oct 15, 2026). Pure helpers for world-audio.js: prefs, volume curve, the comfortable mix,
   warp sound plans and duplicate guard, strings. No DOM, no audio here (node tests load it).
   Comfort rules (user: calm background for an iPad, meditation, falling asleep, gym display; some listeners have tinnitus or
   anxiety): opt-in only, never autoplay, nothing stored that turns sound on by itself (only the volume and the warp switch),
   slow fades, everything low-passed at 3 kHz (light, but no piercing tones), no beeps, a limiter on the output, and a capped master.
   No health, sleep, tinnitus or anxiety claims anywhere in the copy. */
(function (root) {
    'use strict';
    const KEY = 'lowi.worldAudio';
    const DEFAULTS = { vol: 40, warp: true };
    const MAX_MASTER = 0.5;          /* master gain at 100 % (before the limiter) */
    const MAX_HZ = 3000;             /* no layer, filter or sweep goes above this (glints top out at ~1.5 kHz, sine) */
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

    /* the ambient mix (Oct 15 rework, user: the old low rumble/pulse felt like construction / something bad coming).
       LIGHT is the normal sound: soft airy noise (high-passed, nothing rumbling), a quiet open pad an octave higher and
       sparse soft glints from one pentatonic scale (sine only, slow attack, long decay, nothing shrill or beeping).
       UNEASY is the old low layer (deep rumble, low pulse, low drone). It is silent by default and only fades in, slowly,
       as a cue when the shared game-world mood turns stormy (world-mood-core.js). rates in Hz (LFO), gains relative to the master */
    const MIX = {
        bus: 0.9, limiter: { threshold: -20, knee: 8, ratio: 10, attack: 0.01, release: 0.4 }, tone: 3000,
        air: { gain: 0.34, hp: 260, lp: 2400, lfo: [0.045, 0.071], depth: 0.4 },     /* soft airy breeze, left/right drift */
        pad: { gain: 0.03, notes: [440, 554.37, 659.25], lp: 1500, lfo: 0.035 },     /* open, quiet, light */
        glint: { gain: 0.05, notes: [880, 987.77, 1108.73, 1318.51, 1479.98], gap: [3.5, 7.5], attack: 0.35, decay: 2.8, lp: 2600 },
        lightDuck: 0.75                                                               /* light layer a little lower while uneasy */
    };
    const UNEASY = {
        gain: 1, tc: 1.6,                                                             /* fade time constant: about 5 s in or out */
        flow: { gain: 0.5, lp: 360, lfo: [0.05, 0.083], depth: 0.35 },
        swish: { gain: 0.07, bp: 640, q: 0.7, sweep: 220, lfo: 0.06 },
        pulse: { gain: 0.22, hz: 58, harm: 116, every: 1.3, jitter: 0.06, attack: 0.09, decay: 0.7 },
        pad: { gain: 0.035, notes: [110, 164.81, 220], lp: 520, lfo: 0.04 }
    };
    /* when the low layer joins is decided by the shared game-world mood (world-mood-core.js, LowiWorldMood): level 0..1 */
    /* sparse glints in [after, to): deterministic gaps and notes, never the same note twice in a row */
    const rawNote = i => Math.floor(Math.abs(Math.sin((i + 1) * 12.9898) * 23421.631) % MIX.glint.notes.length);
    const noteMemo = [];
    function noteAt(i) { const n = MIX.glint.notes.length; for (let j = noteMemo.length; j <= i; j++) { const r = rawNote(j); noteMemo[j] = j && r === noteMemo[j - 1] ? (r + 1 + (j % (n - 1))) % n : r; } return noteMemo[i]; }
    function glints(after, to, n0) {
        const G = MIX.glint, out = []; let t = after, i = n0 || 0;
        while (true) {
            const h = Math.abs(Math.sin((i + 1) * 78.233) * 43758.5453) % 1, gap = +(G.gap[0] + h * (G.gap[1] - G.gap[0])).toFixed(3);
            t += gap; if (t >= to) break;
            out.push({ t: +t.toFixed(3), gap, hz: G.notes[noteAt(i)], pan: +((h - 0.5) * 0.8).toFixed(2) }); i++;
        }
        return out;
    }
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
    /* next pulse times in [from, to) after `after` (deterministic jitter by index) */
    function pulses(after, to, n0) {
        const out = []; let t = after, i = n0 || 0;
        while (true) { const j = Math.sin((i + 1) * 12.9898) * 0.5; t += UNEASY.pulse.every + j * UNEASY.pulse.jitter * 2; if (t >= to) break; out.push(+t.toFixed(3)); i++; }
        return out;
    }
    function allHz() {
        const U = UNEASY;
        return [MIX.tone, MIX.air.hp, MIX.air.lp, MIX.pad.lp, MIX.glint.lp].concat(MIX.pad.notes, MIX.glint.notes, U.flow.lp, U.swish.bp + U.swish.sweep, U.pulse.hz, U.pulse.harm, U.pad.lp, U.pad.notes, WARP.start.from, WARP.start.to, WARP.start.sub, WARP.dive.up, WARP.dive.down, WARP.dive.sub, WARP.arrive.notes, WARP.arrive.lp, WARP.home.notes, WARP.home.lp);
    }
    /* the normal (light) layer only: nothing below the air's high-pass */
    function lightHz() { return [MIX.air.hp].concat(MIX.pad.notes, MIX.glint.notes); }
    const STR = {
        btn: ['Sound', 'Klang', 'Sonido'],
        aria: ['Body world sound', 'Klang der K\u00f6rperwelt', 'Sonido del mundo del cuerpo'],
        title: ['Body sound', 'K\u00f6rperklang', 'Sonido del cuerpo'],
        on: ['On', 'An', 'S\u00ed'], off: ['Off', 'Aus', 'No'],
        vol: ['Volume', 'Lautst\u00e4rke', 'Volumen'],
        warp: ['Warp sounds', 'Warp-Kl\u00e4nge', 'Sonidos del warp'],
        note: ['Light, airy sound while the body world is open. A low rumble joins in when today\u2019s logs show spikes. Starts only when you turn it on.',
            'Leichter, luftiger Klang, solange die K\u00f6rperwelt offen ist. Ein tiefes Grollen kommt dazu, wenn deine Eintr\u00e4ge von heute Spikes zeigen. Startet nur, wenn du es einschaltest.',
            'Sonido ligero y a\u00e9reo mientras el mundo del cuerpo est\u00e1 abierto. Un retumbo grave se suma cuando tus registros de hoy muestran picos. Solo empieza si lo activas.'],
        quiet: ['Nothing to hear? Check your device volume and silent switch.', 'Nichts zu h\u00f6ren? Pr\u00fcf die Lautst\u00e4rke und den Stumm-Schalter deines Ger\u00e4ts.', '\u00bfNo oyes nada? Revisa el volumen y el modo silencio de tu dispositivo.'],
        close: ['Close', 'Schlie\u00dfen', 'Cerrar']
    };
    function t(key, lang) { const a = STR[key]; if (!a) return ''; const i = { en: 0, de: 1, es: 2 }[String(lang || 'de').slice(0, 2)]; return a[i == null ? 1 : i]; }
    const api = { KEY, DEFAULTS, MAX_MASTER, MAX_HZ, FADE_IN, FADE_OUT, CLOSE_FADE, MIX, UNEASY, WARP, glints, lightHz, STR, clampVol, masterGain, loadPrefs, savePrefs, guard, audible, warpAudible, pulses, allHz, t };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiWorldAudioCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
