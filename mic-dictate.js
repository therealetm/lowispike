/* LOWiSPIKE mic dictation (Oct 26, 2026). Shared component, loaded once for the whole app.
   Why: Emmanuel: "So, I can click on a microphone and then I can just speak and it writes it ... have that basically everywhere
   where you're supposed to type, minimally."
   What it does: every free-text field (input type text/search, textarea) gets a small glass mic inside its right edge. Tap it,
   speak, the words land where the caret is; tap again or stop talking and it stops. Rules (pure parts in mic-dictate-core.js):
   - Opt in/out with ONE attribute: data-mic (force on, even for a narrow field) / data-mic="off" (never). Without it, plain
     free-text fields get a mic and logins, emails, numbers, codes and fields narrower than 150 px don't. data-mic-kind=
     "food" | "search" | "name" | "text" helps the transcriber with food words; it is guessed from the field when missing.
   - Engines: Chrome/Edge/Android use the browser's speech recognition. iPhone, iPad and Safari record a short clip (Web Audio,
     16 kHz mono WAV, max 30 s) only after the tap and send it to our voice-text function (Gemini key stays in Supabase
     secrets). Safari's webkitSpeechRecognition is not used on purpose: missing in Home Screen web apps (WebKit bug 225298).
     No working engine or function not deployed = no mic at all (never a broken button).
   - Microphone permission denied -> a short hint in EN/DE/ES. Nothing listens at start-up; getUserMedia only runs in start().
   - Community chat: the round mic next to Send records a voice MESSAGE (community-chat.js, unchanged). Dictation sits inside the
     text box with its own "speak to type" icon (ICON_DICTATE: mic + text lines) so the two never look like the same button.
   Fields rendered later (most screens build their HTML on the fly) are picked up by a MutationObserver (childList only,
   throttled), fields that are hidden at first by an IntersectionObserver and on focus. */
(function (W, D) {
  'use strict';
  if (!W || !D || W.LowiMic) return;
  var C = W.LowiMicCore;
  if (!C) return;

  // fields other files render, opted in here so their files stay untouched (one line per field)
  var OPT_IN = ['#cmInput'];
  var CHAT = { '#cmInput': 1 };
  var SIZE = 34, INSET = 6, HINT_MS = 4200, SCAN_MS = 250;

  var ICON_MIC = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>';
  var ICON_DICTATE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="13" y="3" width="5" height="9.5" rx="2.5"/><path d="M10.5 10a5 5 0 0 0 10 0M15.5 15v3"/><path d="M3 7h6M3 11h4.5M3 15h7.5M3 19h9"/></svg>';
  var ICON_STOP = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="7.5" y="7.5" width="9" height="9" rx="2.2" class="mic-fill"/></svg>';

  var lang = function () { try { return C.lang2((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || D.documentElement.lang || 'en'); } catch (e) { return 'en'; } };
  var tr = function (k) { return C.t(lang(), k); };

  // ---------- engine ----------
  var SR = W.SpeechRecognition || W.webkitSpeechRecognition || null;
  var AC = W.AudioContext || W.webkitAudioContext || null;
  var apple = C.isAppleWebKit(navigator.userAgent, navigator.maxTouchPoints, navigator.vendor);
  var serverState = 'unknown'; // unknown | ready | off
  var nativeBroken = false;
  function endpoint() {
    if (W.LOWI_VOICE_TEXT_URL) return String(W.LOWI_VOICE_TEXT_URL);
    var cfg = W.LOWI_CFG || {};
    return cfg.url ? String(cfg.url).replace(/\/$/, '') + '/functions/v1/voice-text' : '';
  }
  function env() {
    return {
      secure: !!W.isSecureContext, hasNativeSR: !!SR && !nativeBroken, appleWebKit: apple,
      hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      hasMediaRecorder: !!(AC && AC.prototype && AC.prototype.createScriptProcessor),
      hasAudioContext: !!AC, serverReady: serverState !== 'off' && !!endpoint()
    };
  }
  function engine() { return C.chooseEngine(env()); }

  var probing = null;
  function probeServer() {
    if (probing || serverState !== 'unknown' || !endpoint() || typeof fetch !== 'function') return;
    var cfg = W.LOWI_CFG || {}, h = {};
    if (cfg.key) { h.apikey = cfg.key; h.Authorization = 'Bearer ' + cfg.key; }
    probing = fetch(endpoint(), { method: 'GET', headers: h, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { serverState = j && j.ok && j.configured ? 'ready' : 'off'; })
      .catch(function () { /* offline: keep the mics, the tap says so */ })
      .then(function () { probing = null; if (serverState === 'off') refreshAll(); });
  }

  // ---------- fields ----------
  var done = new WeakMap();
  var attached = [];
  function matchesOptIn(el) {
    for (var i = 0; i < OPT_IN.length; i++) { try { if (el.matches(OPT_IN[i])) return OPT_IN[i]; } catch (e) { } }
    return '';
  }
  function facts(el) {
    return {
      tag: el.tagName, type: el.tagName === 'INPUT' ? (el.getAttribute('type') || '') : '',
      mic: el.hasAttribute('data-mic') ? el.getAttribute('data-mic') : (matchesOptIn(el) ? '' : null),
      inputmode: el.getAttribute('inputmode'), autocomplete: el.getAttribute('autocomplete'),
      readonly: el.readOnly, disabled: el.disabled, maxlength: el.maxLength > 0 ? el.maxLength : null,
      width: el.offsetWidth, hidden: el.type === 'hidden'
    };
  }
  function kindOf(el) {
    var k = el.getAttribute('data-mic-kind');
    if (k) return k;
    var s = [el.id, el.name, el.className, el.getAttribute('placeholder'), el.getAttribute('aria-label')].join(' ');
    if (el.type === 'search' || /search|such|busca|find|filter/i.test(s)) return 'search';
    if (/food|meal|dish|snack|recipe|ingredient|essen|mahlzeit|gericht|comida|plato|item|product|produkt|grocery|shop|kitchen|cart/i.test(s)) return 'food';
    if (/name/i.test(s)) return 'name';
    return 'text';
  }

  var io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (ents) {
    ents.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); consider(en.target); } });
  }) : null;
  function consider(el) {
    if (!el || el.nodeType !== 1 || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;
    if (done.has(el) || !el.isConnected) return;
    if (!el.offsetWidth) { if (io) io.observe(el); return; }
    if (!C.eligible(facts(el))) { done.set(el, 'no'); return; }
    attach(el);
  }

  function iconFor(rec) { return rec.chat ? ICON_DICTATE : ICON_MIC; }
  function attach(el) {
    var chat = !!CHAT[matchesOptIn(el)];
    var b = D.createElement('button');
    var rec = { el: el, b: b, chat: chat, ro: null, ta: el.tagName === 'TEXTAREA' };
    b.type = 'button';
    b.className = 'mic-btn' + (chat ? ' mic-chat' : '') + (rec.ta ? ' mic-ta' : '');
    b.setAttribute('data-mic-btn', '');
    b.setAttribute('aria-label', tr(chat ? 'chat' : 'speak'));
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<span class="mic-ring" aria-hidden="true"></span>' + iconFor(rec);
    el.insertAdjacentElement('afterend', b);
    el.classList.add('mic-has');
    done.set(el, rec);
    attached.push(rec);
    b.addEventListener('mousedown', function (e) { e.preventDefault(); }); // keep the keyboard and focus where they are
    b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var now = Date.now();
      if (now - (rec.tapAt || 0) < 450) return; // one quick double tap must not start and stop at once
      rec.tapAt = now;
      if (session && session.rec === rec) stop('tap'); else start(rec);
    });
    if (typeof ResizeObserver === 'function') {
      rec.ro = new ResizeObserver(function () { place(rec); });
      rec.ro.observe(el);
      if (el.parentElement) rec.ro.observe(el.parentElement);
    }
    if (apple || !SR) probeServer();
    anchor(rec);
    place(rec);
  }

  // If a scrolling box sits between the field and the mic's positioning box, the mic would not scroll with the field. Then the
  // field's own row becomes the positioning box (only when nothing else there is absolutely placed); otherwise follow scrolls.
  function anchor(rec) {
    var el = rec.el, cb = rec.b.offsetParent, p = el.parentElement, n = p, scrolls = false;
    while (n && n !== cb && n !== D.body) {
      var cs = getComputedStyle(n);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { scrolls = true; break; }
      n = n.parentElement;
    }
    if (!scrolls || !p) return;
    if (getComputedStyle(p).position === 'static') {
      var others = false;
      for (var i = 0; i < p.children.length; i++) {
        var k = p.children[i];
        if (k !== rec.b && k !== el && /absolute|fixed/.test(getComputedStyle(k).position)) { others = true; break; }
      }
      if (!others) { p.style.position = 'relative'; return; }
    }
    rec.follow = true;
  }
  var scrollRaf = 0;
  function onScroll() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(function () { scrollRaf = 0; attached.forEach(function (r) { if (r.follow) place(r); }); });
  }

  // The mic is the field's next sibling, placed over its right edge; measured and corrected so it sits right whatever the
  // field's container looks like.
  function place(rec) {
    var el = rec.el, b = rec.b;
    if (!el.isConnected || !b.isConnected) return;
    var show = engine() !== 'none' && el.offsetWidth > 0 && !el.disabled && !el.readOnly;
    if (b.hidden === show) b.hidden = !show;
    if (el.classList.contains('mic-has') !== show) el.classList.toggle('mic-has', show);
    if (!show) return;
    var er = el.getBoundingClientRect(), br = b.getBoundingClientRect();
    var wantL = er.right - SIZE - INSET, wantT = rec.ta ? er.bottom - SIZE - INSET : er.top + (er.height - SIZE) / 2;
    var dx = wantL - br.left, dy = wantT - br.top;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      b.style.left = ((parseFloat(b.style.left) || 0) + dx) + 'px';
      b.style.top = ((parseFloat(b.style.top) || 0) + dy) + 'px';
    }
  }
  function refreshAll() {
    attached = attached.filter(function (r) {
      if (!r.el.isConnected) { if (r.ro) r.ro.disconnect(); if (r.b.isConnected) r.b.remove(); if (session && session.rec === r) stop('gone'); return false; }
      if (!r.b.isConnected || r.el.nextElementSibling !== r.b) r.el.insertAdjacentElement('afterend', r.b);
      if (!(session && session.rec === r)) r.b.setAttribute('aria-label', tr(r.chat ? 'chat' : 'speak'));
      place(r);
      return true;
    });
  }

  var scanT = 0, lastScan = 0;
  function scanSoon() {
    if (scanT) return;
    var wait = Math.max(60, SCAN_MS - (Date.now() - lastScan));
    scanT = setTimeout(function () {
      scanT = 0; lastScan = Date.now();
      var list = D.querySelectorAll('input, textarea');
      for (var i = 0; i < list.length; i++) consider(list[i]);
      refreshAll();
    }, wait);
  }

  // ---------- hint ----------
  var hintEl = null, hintT = 0;
  function hint(key) {
    if (!hintEl) {
      hintEl = D.createElement('div');
      hintEl.className = 'mic-hint';
      hintEl.setAttribute('role', 'status');
      hintEl.setAttribute('aria-live', 'polite');
      D.body.appendChild(hintEl);
    }
    hintEl.textContent = tr(key);
    hintEl.setAttribute('data-key', key);
    hintEl.classList.add('on');
    clearTimeout(hintT);
    hintT = setTimeout(function () { hintEl.classList.remove('on'); }, HINT_MS);
  }

  // ---------- sessions ----------
  var session = null;
  function setState(rec, st) {
    var b = rec.b, el = rec.el;
    b.classList.toggle('mic-on', st === 'listen');
    b.classList.toggle('mic-busy', st === 'busy');
    b.setAttribute('aria-pressed', st === 'listen' ? 'true' : 'false');
    b.setAttribute('aria-label', st === 'listen' ? tr('stop') : tr(rec.chat ? 'chat' : 'speak'));
    b.innerHTML = '<span class="mic-ring" aria-hidden="true"></span>' + (st === 'listen' ? ICON_STOP : iconFor(rec));
    if (st === 'listen' || st === 'busy') {
      if (!('ph' in rec)) rec.ph = el.getAttribute('placeholder');
      if (!el.value) el.setAttribute('placeholder', tr(st === 'listen' ? 'listening' : 'writing'));
    } else if ('ph' in rec) {
      if (rec.ph == null) el.removeAttribute('placeholder'); else el.setAttribute('placeholder', rec.ph);
      delete rec.ph;
    }
    b.style.removeProperty('--mic-lvl');
  }

  function insert(rec, words, base) {
    var el = rec.el;
    words = C.tidy(words, rec.ta);
    if (!words) return false;
    var m = C.merge(base.value, words, base.s, base.e, el.maxLength > 0 ? el.maxLength : null);
    el.value = m.value;
    try { if (D.activeElement === el) el.setSelectionRange(m.caret, m.caret); } catch (e) { }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  function caret(el) {
    var focused = D.activeElement === el;
    return { value: el.value, s: focused ? el.selectionStart : null, e: focused ? el.selectionEnd : null };
  }

  function start(rec) {
    if (session) stop('switch');
    var eng = engine();
    if (eng === 'native') startNative(rec);
    else if (eng === 'server') startServer(rec);
  }
  function stop(why) {
    if (!session) return;
    try { session.stop(why); } catch (e) { }
  }

  // Chrome / Edge / Android: the browser's own recognition, words appear while speaking
  function startNative(rec) {
    var r;
    try { r = new SR(); } catch (e) { nativeBroken = true; refreshAll(); if (engine() === 'server') startServer(rec); return; }
    var el = rec.el, base = caret(el), finalText = '', fellBack = false, s;
    r.lang = C.langTag(lang());
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    s = { rec: rec, stop: function () { try { r.stop(); } catch (e) { } } };
    session = s;
    setState(rec, 'listen');
    r.onresult = function (ev) {
      var interim = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) finalText += ev.results[i][0].transcript; else interim += ev.results[i][0].transcript;
      }
      el.value = C.merge(base.value, C.tidy(finalText + ' ' + interim, true), base.s, base.e, el.maxLength > 0 ? el.maxLength : null).value;
    };
    r.onerror = function (ev) {
      var err = ev && ev.error;
      if (err === 'not-allowed') { hint('denied'); return; }
      if (err === 'service-not-allowed' || err === 'network' || err === 'audio-capture' || err === 'language-not-supported') {
        nativeBroken = true;
        if (engine() === 'server') { fellBack = true; return; }
        hint(navigator.onLine === false ? 'offline' : 'failed');
        return;
      }
      if (err === 'no-speech') hint('nothing');
    };
    r.onend = function () {
      if (session === s) session = null;
      el.value = base.value;
      insert(rec, finalText, base);
      setState(rec, 'idle');
      if (fellBack) { refreshAll(); startServer(rec); }
    };
    try { r.start(); } catch (e) { session = null; setState(rec, 'idle'); nativeBroken = true; refreshAll(); if (engine() === 'server') startServer(rec); }
  }

  // iPhone / iPad / Safari / Firefox: record only after the tap, our voice-text function writes it out
  function startServer(rec) {
    if (navigator.onLine === false) { hint('offline'); return; }
    var ctx;
    try { ctx = new AC(); } catch (e) { hint('failed'); return; }
    try { if (ctx.resume) ctx.resume(); } catch (e) { }
    var chunks = [], stream = null, src = null, proc = null, mute = null, an = null, buf = null, timer = 0, stopped = false;
    var gate = C.silenceGate(), t0 = Date.now();
    var s = { rec: rec, stop: function (why) { finish(why); } };
    session = s;
    setState(rec, 'listen');
    function closeCtx() { try { if (ctx && ctx.close && ctx.state !== 'closed') ctx.close(); } catch (e) { } }
    function cleanup() {
      clearInterval(timer);
      try { if (proc) { proc.onaudioprocess = null; proc.disconnect(); } } catch (e) { }
      try { if (src) src.disconnect(); } catch (e) { }
      try { if (mute) mute.disconnect(); } catch (e) { }
      if (stream) stream.getTracks().forEach(function (tk) { try { tk.stop(); } catch (e) { } }); // mic light goes off now
      stream = null;
    }
    function finish(why) {
      if (stopped) return;
      stopped = true;
      var rate = ctx.sampleRate;
      cleanup();
      closeCtx();
      if (session === s) session = null;
      if (why === 'switch' || why === 'gone' || why === 'denied' || why === 'error') { chunks = []; setState(rec, 'idle'); return; }
      var n = 0; chunks.forEach(function (c) { n += c.length; });
      var all = new Float32Array(n), o = 0;
      chunks.forEach(function (c) { all.set(c, o); o += c.length; });
      chunks = [];
      var peak = 0; for (var i = 0; i < all.length; i += 16) peak = Math.max(peak, Math.abs(all[i]));
      if (why === 'quiet' || all.length < rate * 0.35 || peak < 0.02) { setState(rec, 'idle'); hint('nothing'); return; }
      var mono = C.downmix([all], rate, 16000);
      if (mono.length > 16000 * 30) mono = mono.subarray(0, 16000 * 30);
      send(rec, C.toBase64(C.encodeWav(mono, 16000)));
    }
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (st) {
      if (stopped) { st.getTracks().forEach(function (tk) { tk.stop(); }); return; }
      stream = st;
      src = ctx.createMediaStreamSource(st);
      an = ctx.createAnalyser(); an.fftSize = 1024;
      buf = new Float32Array(an.fftSize);
      proc = ctx.createScriptProcessor(4096, 1, 1);
      mute = ctx.createGain(); mute.gain.value = 0;
      proc.onaudioprocess = function (ev) { if (!stopped) chunks.push(new Float32Array(ev.inputBuffer.getChannelData(0))); };
      src.connect(an); src.connect(proc); proc.connect(mute); mute.connect(ctx.destination);
      t0 = Date.now();
      timer = setInterval(function () {
        if (!rec.el.isConnected) return finish('gone');
        an.getFloatTimeDomainData(buf);
        var sum = 0; for (var i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        var lvl = Math.sqrt(sum / buf.length);
        rec.b.style.setProperty('--mic-lvl', Math.min(1, lvl * 8).toFixed(2));
        var g = gate(lvl, Date.now() - t0);
        if (g) finish(g);
      }, 100);
    }).catch(function (e) {
      var denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      finish(denied ? 'denied' : 'error');
      hint(denied ? 'denied' : 'failed');
    });
  }

  function tokenNow() {
    try {
      var cx = W.LOWI_CLOUD_X;
      if (!cx || !cx.client) return Promise.resolve('');
      return Promise.resolve(cx.client()).then(function (sb) {
        return sb.auth.getSession().then(function (r) {
          var se = r && r.data && r.data.session;
          if (se || !sb.auth.signInAnonymously) return se;
          return sb.auth.signInAnonymously(W.lowiAnonOpts ? W.lowiAnonOpts() : undefined).then(function (x) { return x && x.data && x.data.session; }); // test browsers sign in as test accounts
        });
      }).then(function (se) { return (se && se.access_token) || ''; }).catch(function () { return ''; });
    } catch (e) { return Promise.resolve(''); }
  }
  function token() { return Promise.race([tokenNow(), new Promise(function (ok) { setTimeout(function () { ok(''); }, 8000); })]); }

  function send(rec, b64) {
    setState(rec, 'busy');
    token().then(function (tok) {
      if (!tok) { var er = new Error('sign_in'); er.status = 401; throw er; }
      var cfg = W.LOWI_CFG || {}, h = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok };
      if (cfg.key) h.apikey = cfg.key;
      var c = typeof AbortController === 'function' ? new AbortController() : null;
      var to = setTimeout(function () { if (c) c.abort(); }, 30000);
      return fetch(endpoint(), { method: 'POST', headers: h, body: JSON.stringify({ audio: b64, lang: lang(), field: kindOf(rec.el) }), signal: c ? c.signal : undefined, cache: 'no-store' })
        .then(function (r) {
          clearTimeout(to);
          return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e2 = new Error(j.error || 'failed'); e2.status = r.status; throw e2; } return j; });
        }, function () { clearTimeout(to); var e3 = new Error('offline'); e3.status = navigator.onLine === false ? 0 : 502; throw e3; });
    }).then(function (j) {
      setState(rec, 'idle');
      if (!rec.el.isConnected) return;
      if (!insert(rec, j && j.text, caret(rec.el))) hint('nothing');
    }).catch(function (e) {
      setState(rec, 'idle');
      if (e && e.status === 503) { serverState = 'off'; refreshAll(); }
      hint(C.errorKey(e && e.status, e && e.message));
    });
  }

  // ---------- boot ----------
  function boot() {
    scanSoon();
    if (typeof MutationObserver === 'function') {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === 'attributes') { if (m.target !== m.target.ownerDocument && !(m.target.classList && m.target.classList.contains('mic-btn'))) { scanSoon(); return; } continue; }
          var k;
          for (k = 0; k < m.addedNodes.length; k++) { var a = m.addedNodes[k]; if (a.nodeType === 1 && !a.classList.contains('mic-btn') && !a.classList.contains('mic-hint')) { scanSoon(); return; } }
          for (k = 0; k < m.removedNodes.length; k++) { var rn = m.removedNodes[k]; if (rn.nodeType === 1 && !rn.classList.contains('mic-btn')) { scanSoon(); return; } }
        }
      }).observe(D.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-mic', 'disabled', 'readonly'] });
    }
    D.addEventListener('focusin', function (e) { consider(e.target); var r = done.get(e.target); if (r && r !== 'no') place(r); }, true);
    W.addEventListener('resize', refreshAll);
    D.addEventListener('scroll', onScroll, true);
    D.addEventListener('visibilitychange', function () { if (D.hidden) stop('gone'); });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();

  W.LowiMic = {
    engine: engine, refresh: scanSoon, stop: function () { stop('gone'); },
    listening: function () { return !!session; },
    state: function () { return { serverState: serverState, apple: apple, attached: attached.length, engine: engine() }; }
  };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
