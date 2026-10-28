/* LOWiSPIKE mic dictation, pure core (Oct 26, 2026).
   Why: Emmanuel: "So, I can click on a microphone and then I can just speak and it writes it ... basically everywhere where
   you're supposed to type, minimally." Then: "If the cloud speech-to-text has a fee, use the device's native OS speech-to-text
   instead." Cloud transcription (Gemini audio) is billed per use past a capped free tier, so LOWiSPIKE uses ONLY the device's
   own speech recognition: free, nothing extra stored by us.
   mic-dictate.js puts a small glass mic in free-text fields; this file holds the parts that need no browser so the tests can pin
   them: which fields get a mic, which engine works on this device, how spoken words merge into what is already typed, and the
   EN/DE/ES words.
   Engines: 'native' = the browser's SpeechRecognition (Safari tabs on iPhone/Mac use Apple's own dictation, Chrome/Edge/Android
   use theirs). 'keyboard' = iPhone/iPad where it is not available (Home Screen web apps: WebKit bug 225298, still open): the mic
   opens the keyboard and points at the keyboard's own dictation mic (also the OS's speech-to-text, also free). 'none' = no mic
   at all (never a broken button). */
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

  // env: { secure, hasNativeSR, nativeBroken, appleTouch }
  function chooseEngine(env) {
    env = env || {};
    if (!env.secure) return 'none';
    if (env.hasNativeSR && !env.nativeBroken) return 'native';
    if (env.appleTouch) return 'keyboard';
    return 'none';
  }

  // iPhone / iPad (iPadOS also poses as a Mac with a touch screen): their keyboard has a dictation mic.
  function isAppleTouch(ua, maxTouchPoints) {
    ua = String(ua || '');
    return /iPhone|iPad|iPod/.test(ua) || /Macintosh/.test(ua) && Number(maxTouchPoints) > 1;
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

  var WORDS = {
    en: {
      speak: 'Speak to type', stop: 'Stop listening', listening: 'Listening\u2026',
      denied: 'Mic is off. Allow it in Settings \u203a Apps \u203a Safari \u203a Microphone, then try again.',
      nothing: 'Didn\u2019t catch that. Tap the mic and try again.',
      keyboard: 'Tap the mic on your keyboard and speak. No mic there? Turn on Dictation in Settings \u203a General \u203a Keyboard.',
      failed: 'Couldn\u2019t listen just now. Try again or type it.',
      offline: 'You\u2019re offline. Use the mic on your keyboard or type it.', chat: 'Speak to type (your words appear as text)'
    },
    de: {
      speak: 'Sprechen statt tippen', stop: 'Zuh\u00f6ren beenden', listening: 'Ich h\u00f6re zu\u2026',
      denied: 'Mikrofon ist aus. Erlaube es unter Einstellungen \u203a Apps \u203a Safari \u203a Mikrofon, dann nochmal.',
      nothing: 'Nicht verstanden. Tippe aufs Mikrofon und versuch es noch mal.',
      keyboard: 'Tippe auf das Mikrofon deiner Tastatur und sprich. Kein Mikrofon da? Schalte Diktieren ein unter Einstellungen \u203a Allgemein \u203a Tastatur.',
      failed: 'Zuh\u00f6ren ging gerade nicht. Versuch es noch mal oder tippe es.',
      offline: 'Du bist offline. Nutze das Mikrofon deiner Tastatur oder tippe es.', chat: 'Sprechen statt tippen (deine Worte erscheinen als Text)'
    },
    es: {
      speak: 'Habla para escribir', stop: 'Dejar de escuchar', listening: 'Escuchando\u2026',
      denied: 'El micr\u00f3fono est\u00e1 desactivado. Perm\u00edtelo en Ajustes \u203a Apps \u203a Safari \u203a Micr\u00f3fono y vuelve a probar.',
      nothing: 'No te he entendido. Toca el micr\u00f3fono e int\u00e9ntalo otra vez.',
      keyboard: 'Toca el micr\u00f3fono de tu teclado y habla. \u00bfNo hay micr\u00f3fono? Activa el Dictado en Ajustes \u203a General \u203a Teclado.',
      failed: 'No pude escuchar ahora. Int\u00e9ntalo otra vez o escr\u00edbelo.',
      offline: 'Est\u00e1s sin conexi\u00f3n. Usa el micr\u00f3fono de tu teclado o escr\u00edbelo.', chat: 'Habla para escribir (tus palabras aparecen como texto)'
    }
  };
  function t(lang, key) { var w = WORDS[lang2(lang)]; return w[key] || WORDS.en[key] || key; }

  // SpeechRecognition error -> what to do: 'denied' hint, 'keyboard' (service not available here, e.g. Home Screen web app
  // on iPhone, or dictation off), 'nothing', 'offline', 'failed', or '' (ignore: aborted by us).
  function errorAction(err, appleTouch, online) {
    if (err === 'not-allowed') return 'denied';
    if (err === 'service-not-allowed' || err === 'language-not-supported' || err === 'audio-capture') return appleTouch ? 'keyboard' : 'failed';
    if (err === 'network') return online === false ? (appleTouch ? 'keyboard' : 'offline') : appleTouch ? 'keyboard' : 'failed';
    if (err === 'no-speech') return 'nothing';
    if (err === 'aborted') return '';
    return appleTouch ? 'keyboard' : 'failed';
  }

  return {
    eligible: eligible, chooseEngine: chooseEngine, isAppleTouch: isAppleTouch, langTag: langTag, lang2: lang2,
    merge: merge, tidy: tidy, t: t, WORDS: WORDS, errorAction: errorAction, MIN_WIDTH: MIN_WIDTH
  };
});
