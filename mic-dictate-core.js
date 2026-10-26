/* LOWiSPIKE mic dictation, pure core (Oct 26, 2026).
   Why: Emmanuel: "So, I can click on a microphone and then I can just speak and it writes it ... basically everywhere where
   you're supposed to type, minimally." mic-dictate.js puts a small glass mic in free-text fields; this file holds the parts
   that need no browser so the tests can pin them: which fields get a mic, which engine works on this device, how spoken
   words merge into what is already typed, the WAV encoder for the iPhone path, and the EN/DE/ES words.
   Engine rule: iPhone/iPad and Safari never use webkitSpeechRecognition (it is missing in Home Screen web apps, WebKit bug
   225298, and breaks after the app played audio), they record a short clip and our voice-text function writes it out.
   Chrome/Edge/Android use the browser's own speech recognition. No working engine = no mic (never a broken button). */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LowiMicCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TEXT_TYPES = { '': 1, text: 1, search: 1 };
  var NO_MODES = { numeric: 1, decimal: 1, tel: 1, email: 1, url: 1, none: 1 };
  var NO_AUTOCOMPLETE = /(^|\s)(one-time-code|email|username|current-password|new-password|tel|url|cc-|bday)/i;
  var MIN_WIDTH = 150;

  // f: plain facts about a field (so node tests need no DOM):
  // { tag, type, mic, inputmode, autocomplete, readonly, disabled, maxlength, width, hidden }
  // mic = value of data-mic: 'off' never, '' / 'on' / anything else = yes (forced, even narrow or short fields).
  function eligible(f) {
    if (!f) return false;
    var mic = f.mic == null ? null : String(f.mic).toLowerCase();
    if (mic === 'off' || mic === 'false' || mic === 'no') return false;
    var tag = String(f.tag || '').toLowerCase();
    if (tag !== 'input' && tag !== 'textarea') return false;
    if (f.readonly || f.disabled || f.hidden) return false;
    if (tag === 'input' && !TEXT_TYPES[String(f.type || '').toLowerCase()]) return false;
    if (mic != null) return true;
    if (NO_MODES[String(f.inputmode || '').toLowerCase()]) return false;
    if (NO_AUTOCOMPLETE.test(String(f.autocomplete || ''))) return false;
    var ml = Number(f.maxlength);
    if (ml > 0 && ml < 12) return false;
    if (f.width != null && Number(f.width) < MIN_WIDTH) return false;
    return true;
  }

  // env: { hasNativeSR, hasMediaRecorder, hasGetUserMedia, hasAudioContext, appleWebKit, standalone, secure, serverReady }
  function chooseEngine(env) {
    env = env || {};
    if (!env.secure || !env.hasGetUserMedia && !env.hasNativeSR) return 'none';
    var canServer = !!(env.serverReady && env.hasGetUserMedia && env.hasMediaRecorder && env.hasAudioContext);
    if (env.hasNativeSR && !env.appleWebKit) return 'native';
    if (canServer) return 'server';
    return 'none';
  }

  // iPhone, iPad (also iPadOS posing as a Mac) and desktop Safari: all Apple WebKit.
  function isAppleWebKit(ua, maxTouchPoints, vendor) {
    ua = String(ua || '');
    if (/iPhone|iPad|iPod/.test(ua)) return true;
    if (/Macintosh/.test(ua) && Number(maxTouchPoints) > 1) return true;
    var safari = /Safari\//.test(ua) && !/(Chrome|Chromium|CriOS|Edg|OPR|Android|FxiOS|Firefox)\//.test(ua);
    return safari || /Apple/.test(String(vendor || '')) && !/(Chrome|Chromium|Edg)\//.test(ua);
  }

  function langTag(lang) {
    var l = String(lang || 'en').slice(0, 2).toLowerCase();
    return l === 'de' ? 'de-DE' : l === 'es' ? 'es-ES' : 'en-US';
  }
  function lang2(lang) {
    var l = String(lang || 'en').slice(0, 2).toLowerCase();
    return l === 'de' || l === 'es' ? l : 'en';
  }

  // Put spoken words where the caret is (or replace the selection), with a space only where words would touch.
  // Respects maxlength. Returns { value, caret }.
  function merge(value, words, selStart, selEnd, maxlength) {
    value = String(value == null ? '' : value);
    words = String(words == null ? '' : words).replace(/\s+/g, ' ').trim();
    var a = selStart == null || selStart < 0 || selStart > value.length ? value.length : selStart;
    var b = selEnd == null || selEnd < a || selEnd > value.length ? a : selEnd;
    if (!words) return { value: value, caret: b };
    var before = value.slice(0, a), after = value.slice(b);
    if (before && !/[\s(\["'„«\/-]$/.test(before)) words = ' ' + words;
    if (after && !/^[\s.,!?;:)\]"'“»\/-]/.test(after)) words = words + ' ';
    var ml = Number(maxlength);
    if (ml > 0) {
      var room = ml - before.length - after.length;
      if (room <= 0) return { value: value, caret: b };
      if (words.length > room) words = words.slice(0, room);
    }
    return { value: before + words + after, caret: before.length + words.length };
  }

  // Short fields (food names, searches) read better without the full stop speech engines like to add.
  function tidy(words, multiline) {
    var s = String(words == null ? '' : words).replace(/\s+/g, ' ').trim();
    if (!multiline) s = s.replace(/[.。]+$/, '').trim();
    return s;
  }

  // Mono, resampled Float32 samples -> 16-bit PCM WAV bytes (Uint8Array).
  function encodeWav(samples, rate) {
    var n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    function str(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 2, true);
    for (var i = 0, o = 44; i < n; i++, o += 2) {
      var x = Math.max(-1, Math.min(1, samples[i] || 0));
      v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true);
    }
    return new Uint8Array(buf);
  }

  // Average channels and resample linearly to `to` Hz. channels: array of Float32Array.
  function downmix(channels, from, to) {
    if (!channels || !channels.length) return new Float32Array(0);
    var len = channels[0].length, mono = new Float32Array(len), c, i;
    for (c = 0; c < channels.length; c++) for (i = 0; i < len; i++) mono[i] += channels[c][i] / channels.length;
    if (!from || from === to) return mono;
    var outLen = Math.max(1, Math.floor(len * to / from)), out = new Float32Array(outLen), r = from / to;
    for (i = 0; i < outLen; i++) {
      var p = i * r, k = Math.floor(p), t = p - k;
      out[i] = (mono[k] || 0) * (1 - t) + (mono[Math.min(k + 1, len - 1)] || 0) * t;
    }
    return out;
  }

  function toBase64(bytes) {
    var s = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
  }

  // Silence watcher: feed it loudness (0..1) every tick; it says when to stop.
  // Stops 1.6 s after speech ends, after 8 s with no speech at all, and always at 30 s.
  function silenceGate(opts) {
    opts = opts || {};
    var THR = opts.threshold || 0.035, AFTER = opts.afterSpeechMs || 1600, NONE = opts.noSpeechMs || 8000,
      MAX = opts.maxMs || 30000, start = null, lastLoud = null, heard = false;
    return function (level, now) {
      if (start == null) start = now;
      if (level >= THR) { heard = true; lastLoud = now; }
      if (now - start >= MAX) return 'max';
      if (heard && now - lastLoud >= AFTER) return 'done';
      if (!heard && now - start >= NONE) return 'quiet';
      return null;
    };
  }

  var WORDS = {
    en: {
      speak: 'Speak to type', stop: 'Stop listening', listening: 'Listening…', writing: 'Writing it down…',
      denied: 'Microphone is off for LOWiSPIKE. Turn it on in Settings › Safari › Microphone (or your browser’s site settings).',
      nothing: 'Didn’t catch that. Tap the mic and try again.', signin: 'Sign in to speak instead of typing.',
      busy: 'Lots of talking right now. Try again in a minute.', failed: 'Couldn’t write that down. Try again or type it.',
      offline: 'You’re offline. Type it for now.', chat: 'Speak to type (your words appear as text)'
    },
    de: {
      speak: 'Sprechen statt tippen', stop: 'Zuhören beenden', listening: 'Ich höre zu…', writing: 'Schreibe es auf…',
      denied: 'Das Mikrofon ist für LOWiSPIKE aus. Schalte es unter Einstellungen › Safari › Mikrofon ein (oder in den Website-Einstellungen deines Browsers).',
      nothing: 'Nicht verstanden. Tippe aufs Mikrofon und versuch es noch mal.', signin: 'Melde dich an, um zu sprechen statt zu tippen.',
      busy: 'Gerade wird viel gesprochen. Versuch es gleich noch mal.', failed: 'Konnte es nicht aufschreiben. Versuch es noch mal oder tippe es.',
      offline: 'Du bist offline. Tippe es vorerst.', chat: 'Sprechen statt tippen (deine Worte erscheinen als Text)'
    },
    es: {
      speak: 'Habla para escribir', stop: 'Dejar de escuchar', listening: 'Escuchando…', writing: 'Escribiéndolo…',
      denied: 'El micrófono está desactivado para LOWiSPIKE. Actívalo en Ajustes › Safari › Micrófono (o en los ajustes del sitio de tu navegador).',
      nothing: 'No te he entendido. Toca el micrófono e inténtalo otra vez.', signin: 'Inicia sesión para hablar en vez de escribir.',
      busy: 'Mucha gente hablando ahora. Inténtalo en un minuto.', failed: 'No pude escribirlo. Inténtalo otra vez o escríbelo.',
      offline: 'Estás sin conexión. Escríbelo por ahora.', chat: 'Habla para escribir (tus palabras aparecen como texto)'
    }
  };
  function t(lang, key) { var w = WORDS[lang2(lang)]; return w[key] || WORDS.en[key] || key; }

  // Server error -> which hint to show.
  function errorKey(status, error) {
    if (status === 401 || error === 'sign_in') return 'signin';
    if (status === 429 || error === 'busy') return 'busy';
    if (status === 0 || error === 'offline') return 'offline';
    return 'failed';
  }

  return {
    eligible: eligible, chooseEngine: chooseEngine, isAppleWebKit: isAppleWebKit, langTag: langTag, lang2: lang2,
    merge: merge, tidy: tidy, encodeWav: encodeWav, downmix: downmix, toBase64: toBase64, silenceGate: silenceGate,
    t: t, WORDS: WORDS, errorKey: errorKey, MIN_WIDTH: MIN_WIDTH
  };
});
