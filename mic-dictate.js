/* LOWiSPIKE mic dictation (Oct 26, 2026). Shared component, loaded once for the whole app.
   Why: Emmanuel: "So, I can click on a microphone and then I can just speak and it writes it ... have that basically everywhere
   where you're supposed to type, minimally." And: "If the cloud speech-to-text has a fee, use the device's native OS
   speech-to-text instead." Cloud transcription is billed per use, so this uses ONLY the device's own speech recognition.
   What it does: every free-text field (input type text/search, textarea) gets a small glass mic inside its right edge. Tap it,
   speak, the words land where the caret is; tap again or stop talking and it stops. Rules (pure parts in mic-dictate-core.js):
   - Opt in/out with ONE attribute: data-mic (force on, even for a narrow field) / data-mic="off" (never). Without it, plain
     free-text fields get a mic and logins, emails, numbers, codes and fields narrower than 150 px don't.
   - Engine 'native': the browser's SpeechRecognition in the app language (Safari tabs = Apple dictation, Chrome/Android = theirs).
     Engine 'keyboard': iPhone/iPad where that is not available (Home Screen web apps, WebKit bug 225298, still open; or it
     hangs after the app played audio, WebKit bug 317741): the mic opens the keyboard and a short hint points at the keyboard's
     own dictation mic. Learned per device and mode after the first 'service-not-allowed', kept 7 days. No engine = no mic.
   - Permission denied -> short hint in EN/DE/ES. Nothing listens at start-up; recognition only starts in start(), after a tap.
   - Community chat: the round mic next to Send records a voice MESSAGE (community-chat.js, unchanged). Dictation sits inside the
     text box with its own "speak to type" icon (ICON_DICTATE: mic + text lines) so the two never look like the same button.
   Fields rendered later are picked up by a MutationObserver (childList only, throttled), hidden ones by an IntersectionObserver
   and on focus. */
(function (W, D) {
  'use strict';
  if (!W || !D || W.LowiMic) return;
  var C = W.LowiMicCore;
  if (!C) return;

  // fields other files render, opted in here so their files stay untouched (one line per field)
  // Food logging, search and names come first (Emmanuel: "when I don't always want to type what food I wrote"): these keep their
  // mic even when a screen squeezes them narrower than the 150 px rule.
  var OPT_IN = ['#cmInput', '#b3Nm', '#b3Name', '#b3MName', '#b3Dq', '#scanText', '#scanType', '#f2In', '#kgQ', '#k9Q', '#gb-item',
    '.stp-snack-add input[name="snack"]', 'input[data-mr-drink]', '#fyvCap', '#trCap', 'input[name="herbName"]', '.lc-in', '#hqGoalText'];
  // typed confirmations and codes never get one
  var OPT_OUT = ['.oa-type', 'input[name="code"]', '#trUrl', '#gb-link', '#gb-total'];
  var CHAT = { '#cmInput': 1 };
  var SIZE = 34, INSET = 6, HINT_MS = 4200, SCAN_MS = 250;

  var ICON_MIC = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>';
  var ICON_DICTATE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="13" y="3" width="5" height="9.5" rx="2.5"/><path d="M10.5 10a5 5 0 0 0 10 0M15.5 15v3"/><path d="M3 7h6M3 11h4.5M3 15h7.5M3 19h9"/></svg>';
  var ICON_STOP = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="7.5" y="7.5" width="9" height="9" rx="2.2" class="mic-fill"/></svg>';

  var lang = function () { try { return C.lang2((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || D.documentElement.lang || 'en'); } catch (e) { return 'en'; } };
  var tr = function (k) { return C.t(lang(), k); };

  // ---------- engine ----------
  var SR = W.SpeechRecognition || W.webkitSpeechRecognition || null;
  var appleTouch = C.isAppleTouch(navigator.userAgent, navigator.maxTouchPoints);
  var standalone = !!(navigator.standalone || W.matchMedia && W.matchMedia('(display-mode: standalone)').matches);
  var OFF_KEY = 'lowi_mic_native_off_' + (standalone ? 'app' : 'tab'), OFF_MS = 7 * 24 * 3600 * 1000;
  var nativeBroken = false;
  try { var off = Number(localStorage.getItem(OFF_KEY)); nativeBroken = off > 0 && Date.now() - off < OFF_MS; } catch (e) { }
  function markBroken() { nativeBroken = true; try { localStorage.setItem(OFF_KEY, String(Date.now())); } catch (e) { } }
  function env() { return { secure: !!W.isSecureContext, hasNativeSR: !!SR, nativeBroken: nativeBroken, appleTouch: appleTouch }; }
  function engine() { return C.chooseEngine(env()); }

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
  function optedOut(el) {
    for (var i = 0; i < OPT_OUT.length; i++) { try { if (el.matches(OPT_OUT[i])) return true; } catch (e) { } }
    return false;
  }
  function consider(el) {
    if (!el || el.nodeType !== 1 || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;
    if (done.has(el) || !el.isConnected) return;
    if (optedOut(el) && !el.hasAttribute('data-mic')) { done.set(el, 'no'); return; }
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
    if (!key) return;
    if (!hintEl) {
      hintEl = D.createElement('div');
      hintEl.className = 'mic-hint';
      hintEl.setAttribute('role', 'status');
      hintEl.setAttribute('aria-live', 'polite');
      D.body.appendChild(hintEl);
    }
    hintEl.textContent = tr(key);
    hintEl.setAttribute('data-key', key);
    var vv = W.visualViewport; // stay above the keyboard
    hintEl.style.bottom = vv ? Math.max(16, W.innerHeight - (vv.offsetTop + vv.height) + 16) + 'px' : '';
    hintEl.classList.add('on');
    clearTimeout(hintT);
    hintT = setTimeout(function () { hintEl.classList.remove('on'); }, key === 'keyboard' || key === 'denied' ? 6500 : HINT_MS);
  }

  // ---------- sessions ----------
  var session = null;
  function setState(rec, st) {
    var b = rec.b, el = rec.el;
    b.classList.toggle('mic-on', st === 'listen');
    b.setAttribute('aria-pressed', st === 'listen' ? 'true' : 'false');
    b.setAttribute('aria-label', st === 'listen' ? tr('stop') : tr(rec.chat ? 'chat' : 'speak'));
    b.innerHTML = '<span class="mic-ring" aria-hidden="true"></span>' + (st === 'listen' ? ICON_STOP : iconFor(rec));
    if (st === 'listen') {
      if (!('ph' in rec)) rec.ph = el.getAttribute('placeholder');
      if (!el.value) el.setAttribute('placeholder', tr('listening'));
    } else if ('ph' in rec) {
      if (rec.ph == null) el.removeAttribute('placeholder'); else el.setAttribute('placeholder', rec.ph);
      delete rec.ph;
    }
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

  function shownField(el) {
    if (!el || !el.isConnected || D.hidden) return false;
    var b = el.getBoundingClientRect();
    if (!b.width || !b.height) return false;
    if (el.checkVisibility) return el.checkVisibility({ visibilityProperty: true, opacityProperty: true });
    for (var x = el; x && x.nodeType === 1; x = x.parentElement) { var cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; }
    return true;
  }
  function start(rec) {
    if (session) stop('switch');
    var eng = engine();
    if (eng === 'native') startNative(rec);
    else if (eng === 'keyboard') useKeyboard(rec);
  }
  function stop(why) {
    if (!session) return;
    try { session.stop(why); } catch (e) { }
  }

  // iPhone/iPad without in-page recognition: the keyboard's own dictation mic does it (Apple's speech-to-text, free)
  function useKeyboard(rec) {
    var el = rec.el;
    try { el.focus({ preventScroll: true }); var n = el.value.length; el.setSelectionRange(n, n); } catch (e) { try { el.focus(); } catch (e2) { } }
    hint(navigator.onLine === false ? 'offline' : 'keyboard');
  }

  // The device's own speech recognition, words appear while speaking
  function startNative(rec) {
    var r;
    try { r = new SR(); } catch (e) { markBroken(); refreshAll(); if (appleTouch) useKeyboard(rec); return; }
    var el = rec.el, base = caret(el), finalText = '', action = '', started = false, ended = false, s, dog;
    r.lang = C.langTag(lang());
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    s = { rec: rec, stop: function (why) { if (why === 'switch' || why === 'gone') action = ''; try { why === 'tap' ? r.stop() : r.abort(); } catch (e) { } } };
    session = s;
    setState(rec, 'listen');
    // BH-046 P-SESSION-OUTLIVES-SCREEN: closing Kitchen or the chat hides the field but keeps it in the page, so the old
    // "field removed" check never fired and the microphone kept listening into a hidden box. Hidden field = stop.
    var miss = 0, watch = setInterval(function () {
      if (session !== s || ended) { clearInterval(watch); return; }
      if (shownField(el)) miss = 0; else if (++miss >= 2) s.stop('gone');
    }, 200);
    // WebKit bug 317741: after the app played audio, recognition can hang without starting
    dog = setTimeout(function () { if (!started && !ended) { action = appleTouch ? 'keyboard' : 'failed'; try { r.abort(); } catch (e) { } setTimeout(function () { if (!ended) r.onend(); }, 400); } }, 3000);
    r.onstart = r.onaudiostart = function () { started = true; };
    r.onresult = function (ev) {
      started = true;
      var interim = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) finalText += ev.results[i][0].transcript; else interim += ev.results[i][0].transcript;
      }
      el.value = C.merge(base.value, C.tidy(finalText + ' ' + interim, true), base.s, base.e, el.maxLength > 0 ? el.maxLength : null).value;
    };
    r.onerror = function (ev) {
      var err = ev && ev.error;
      action = C.errorAction(err, appleTouch, navigator.onLine);
      if (err === 'service-not-allowed' && !started) markBroken();
    };
    r.onend = function () {
      if (ended) return;
      ended = true;
      clearTimeout(dog);
      clearInterval(watch);
      if (session === s) session = null;
      el.value = base.value;
      var got = insert(rec, finalText, base);
      setState(rec, 'idle');
      if (nativeBroken) refreshAll();
      if (got) return;
      if (action === 'keyboard') useKeyboard(rec); else hint(action);
    };
    try { r.start(); } catch (e) { action = appleTouch ? 'keyboard' : 'failed'; r.onend(); }
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
    state: function () { return { appleTouch: appleTouch, standalone: standalone, nativeBroken: nativeBroken, attached: attached.length, engine: engine() }; }
  };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
