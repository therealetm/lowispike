/* LOWiSPIKE calm sound core (Oct 16, 2026; handoff task 9). Pure helpers, no DOM and no audio (node tests load it).
   E-man: the old tones felt harsh, like a microwave (thin sine beeps at 740-1568 Hz with a 15 ms click attack in the Move
   and guided-session timers, a constant noise band and a 58 Hz pulse in the world sound). Everything here is calmer:
   - bowl(f): a soft singing-bowl strike. Inharmonic partials (1, 2.71, 5.1) as detuned pairs that beat slowly, a felt-mallet
     attack, a long ring-out. Nothing above MAX_HZ.
   - chime(f, d): the timer cue that replaces the old beeps. Same pitch order as before (so a countdown still reads as one),
     squeezed into a warm range, soft attack, short bowl ring.
   - STRINGS: the Sound touchpad on Home (sound-strings.js): glowing strings on one pentatonic scale, so any swipe sounds good.
     Touch or swipe across plays a string; how high you touch sets the loudness; sliding along a held string bends it a little.
   No health, sleep, tinnitus or anxiety claims in the copy. */
(function (root) {
    'use strict';
    const MAX_HZ = 3000;
    const BOWL = { ratios: [1, 2.71, 5.1], amps: [1, 0.42, 0.16], beat: [0.9, 1.6, 2.4], attack: 0.07, decay: 9, gain: 0.05 };
    /* one bowl strike plan: [{hz, amp, detune(Hz), decay(s)}], partials above MAX_HZ are dropped, higher ones ring shorter */
    function bowl(f, o) {
        o = o || {};
        const base = Math.max(60, +f || 392), decay = +o.decay || BOWL.decay, out = [];
        BOWL.ratios.forEach((r, i) => {
            const hz = +(base * r).toFixed(2); if (hz > MAX_HZ) return;
            out.push({ hz, amp: BOWL.amps[i], beat: BOWL.beat[i], decay: +(decay / (1 + i * 0.9)).toFixed(2) });
        });
        return out;
    }
    /* timer cue: squeeze the old beep pitch (100-2000 Hz) into 330-880 Hz on a log scale, so higher stays higher and a
       countdown still reads the same, just warmer */
    const CHIME = { lo: 330, hi: 880, from: [100, 2000], attack: 0.03, peak: 0.12, minRing: 0.9, maxRing: 2.2, lp: 2200 };
    function fold(f) {
        f = Math.abs(+f) || 660; const a = CHIME.from[0], b = CHIME.from[1];
        const k = Math.max(0, Math.min(1, Math.log(Math.max(a, Math.min(b, f)) / a) / Math.log(b / a)));
        return +(CHIME.lo * Math.pow(CHIME.hi / CHIME.lo, k)).toFixed(2);
    }
    function chime(f, d) {
        const hz = fold(f), ring = Math.max(CHIME.minRing, Math.min(CHIME.maxRing, (+d || 0.2) * 5));
        return { hz, attack: CHIME.attack, peak: CHIME.peak, ring: +ring.toFixed(2), lp: CHIME.lp, partials: bowl(hz, { decay: ring }).slice(0, 2) };
    }

    /* ---------- the string touchpad ---------- */
    /* D major pentatonic, low to high (left to right): nothing below 290 Hz, nothing shrill */
    const STRINGS = { notes: [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25], maxVoices: 8, bend: 100, attack: 0.025, hold: 0.35, decay: 2.4, release: 1.6, lp: 2400, gain: 0.32 };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    /* the string under x on a pad w wide (strings sit at the centre of n equal lanes) */
    function stringAt(x, w, n) { n = n || STRINGS.notes.length; w = +w || 1; return clamp(Math.floor((+x || 0) / w * n), 0, n - 1); }
    function stringX(i, w, n) { n = n || STRINGS.notes.length; return (i + 0.5) * (+w || 1) / n; }
    /* strings crossed by a swipe from x0 to x1 (in order of crossing): a string counts once its centre line is passed */
    function crossed(x0, x1, w, n) {
        n = n || STRINGS.notes.length; const out = [];
        if (!isFinite(x0) || !isFinite(x1) || x0 === x1) return out;
        for (let i = 0; i < n; i++) { const c = stringX(i, w, n); if ((x0 < c && x1 >= c) || (x0 > c && x1 <= c)) out.push(i); }
        return x1 < x0 ? out.reverse() : out;
    }
    /* loudness from height: top of the pad is fuller, the bottom whispers (never silent, never loud) */
    function level(y, h) { const k = 1 - clamp((+y || 0) / (+h || 1), 0, 1); return +(0.25 + 0.75 * k).toFixed(3); }
    /* bend in cents from sliding sideways along a held string: up to one semitone either way, a lane wide */
    function bend(dx, w, n) { n = n || STRINGS.notes.length; const lane = (+w || 1) / n; return Math.round(clamp((+dx || 0) / lane, -1, 1) * STRINGS.bend); }
    function noteHz(i, cents) { const f = STRINGS.notes[clamp(i | 0, 0, STRINGS.notes.length - 1)]; return +(f * Math.pow(2, (+cents || 0) / 1200)).toFixed(2); }
    /* voice stealing: the oldest voice goes when the pad is full */
    function steal(voices, max) { max = max || STRINGS.maxVoices; const v = (voices || []).slice().sort((a, b) => a.t - b.t); return v.length >= max ? v[0] : null; }
    /* vibration of a touched string drawn on screen: amplitude decays, reduced motion draws a still glow */
    function wobble(age, amp, reduced) { if (reduced) return 0; const a = Math.max(0, +age || 0); return +((+amp || 0) * Math.exp(-a * 2.4) * Math.sin(a * 38)).toFixed(3); }
    function allHz() {
        const hz = [CHIME.lo, CHIME.hi, CHIME.lp, STRINGS.lp].concat(STRINGS.notes, STRINGS.notes.map(f => noteHz(STRINGS.notes.indexOf(f), STRINGS.bend)));
        STRINGS.notes.forEach(f => bowl(f).forEach(p => hz.push(p.hz)));
        return hz;
    }
    const STR = {
        title: ['Play the strings', 'Spiel die Saiten', 'Toca las cuerdas'],
        hint: ['Touch a string to set the key of the background sound. Higher is brighter and fuller, slide along a string to shift the pitch. It stays when you let go.', 'Tippe eine Saite an, um die Tonart des Hintergrundklangs zu w\u00e4hlen. Weiter oben klingt heller und voller, entlang der Saite gleiten verschiebt die Tonh\u00f6he. Es bleibt, wenn du losl\u00e4sst.', 'Toca una cuerda para elegir el tono del sonido de fondo. M\u00e1s arriba suena m\u00e1s brillante y lleno; desliza por la cuerda para cambiar la afinaci\u00f3n. Se queda al soltar.'],
        aria: ['String pad, seven glowing strings', 'Saiten-Pad, sieben leuchtende Saiten', 'Panel de cuerdas, siete cuerdas brillantes'],
        muted: ['App sounds are off. Turn them on in Profile to hear the strings.', 'App-Kl\u00e4nge sind aus. Schalte sie im Profil ein, um die Saiten zu h\u00f6ren.', 'Los sonidos de la app est\u00e1n apagados. Act\u00edvalos en el Perfil para o\u00edr las cuerdas.'],
        silent: ['Volume is at 0.', 'Lautst\u00e4rke ist auf 0.', 'El volumen est\u00e1 en 0.'],
        /* Oct 16 (string pad control): the readout of what the background sound is set to, and the reset */
        key: ['Key', 'Tonart', 'Tono'],
        level: ['Level', 'F\u00fclle', 'Nivel'],
        shift: ['Pitch', 'Tonh\u00f6he', 'Afinaci\u00f3n'],
        reset: ['Reset sound', 'Klang zur\u00fccksetzen', 'Restablecer sonido'],
        resetAria: ['Reset the background sound to its default key, brightness and pitch', 'Hintergrundklang auf Standard-Tonart, -Helligkeit und -Tonh\u00f6he zur\u00fccksetzen', 'Restablecer el tono, el brillo y la afinaci\u00f3n del sonido de fondo'],
        bgOff: ['Background sound is off. Your setting is saved for when you turn it on.', 'Hintergrundklang ist aus. Deine Einstellung bleibt gespeichert, bis du ihn einschaltest.', 'El sonido de fondo est\u00e1 apagado. Tu ajuste se guarda para cuando lo actives.']
    };
    function t(key, lang) { const a = STR[key]; if (!a) return ''; const i = { en: 0, de: 1, es: 2 }[String(lang || 'de').slice(0, 2)]; return a[i == null ? 1 : i]; }
    const api = { MAX_HZ, BOWL, CHIME, STRINGS, bowl, fold, chime, stringAt, stringX, crossed, level, bend, noteHz, steal, wobble, allHz, STR, t };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiCalmSoundCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
