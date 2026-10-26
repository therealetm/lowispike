#!/usr/bin/env node
'use strict';
/* Oct 26, 2026 mic dictation check in WebKit (iPhone 13), local copy with the simulated cloud (no real profiles or posts).
   Playwright's WebKit has no speech engine, so a fake webkitSpeechRecognition stands in (window.__srMode: 'ok' says "two eggs
   and toast", 'svc' = service-not-allowed like a Home Screen web app on iPhone, 'deny' = permission off).
   Checks: mics appear in free-text fields on the screens visited and nowhere they shouldn't (email, numbers); a tap writes the
   words into the field and fires input; tap again stops; the Community chat keeps its voice-message mic and gets the separate
   speak-to-type icon inside the text box; service-not-allowed switches to the keyboard hint; permission off shows its hint;
   the mic is the top element at its own spot (nothing covers it, it covers no other button); no page errors.
   Usage: SIM_REDUCED_MOTION=1 node tools/mic-dictate/probe.cjs [en|de|es]   (LIVE=1 runs against the live site, read-only) */
const H = require('../sim/harness.cjs');
const lang = process.argv[2] || 'en';
const FAKE = `(() => {
  window.__srMode = 'ok'; window.__srStarts = 0; window.__srLang = '';
  function SR() { this.lang = ''; this.interimResults = false; }
  SR.prototype.start = function () {
    const self = this; window.__srStarts++; window.__srLang = this.lang;
    const mode = window.__srMode;
    setTimeout(() => {
      if (mode === 'svc') { self.onerror && self.onerror({ error: 'service-not-allowed' }); self.onend && self.onend(); return; }
      if (mode === 'deny') { self.onerror && self.onerror({ error: 'not-allowed' }); self.onend && self.onend(); return; }
      if (mode === 'hang') return;
      self.onstart && self.onstart();
      const mk = (t, fin) => { const r = [{ transcript: t }]; r.isFinal = fin; return r; };
      setTimeout(() => self.onresult && self.onresult({ resultIndex: 0, results: [mk('two eggs', false)] }), 150);
      self._t = setTimeout(() => { self.onresult && self.onresult({ resultIndex: 0, results: [mk('two eggs and toast', true)] }); self.onend && self.onend(); }, 500);
    }, 50);
  };
  SR.prototype.stop = function () { clearTimeout(this._t); this.onend && this.onend(); };
  SR.prototype.abort = function () { clearTimeout(this._t); this.onerror && this.onerror({ error: 'aborted' }); this.onend && this.onend(); };
  window.webkitSpeechRecognition = SR;
})();`;

(async () => {
  const R = await H.open({ lang, url: process.env.LIVE ? 'https://therealetm.github.io/lowispike/index.html' : '' });
  const P = R.page, out = {};
  const log = (k, v) => { out[k] = v; console.log('STEP', k, JSON.stringify(v)); };
  await R.ctx.addInitScript({ content: FAKE });
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  const audit = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(e).visibility !== 'hidden'; };
    const fields = [...document.querySelectorAll('input, textarea')].filter(vis).map(e => {
      const b = e.nextElementSibling && e.nextElementSibling.classList.contains('mic-btn') ? e.nextElementSibling : null;
      let covered = null, inside = null;
      if (b && !b.hidden) {
        const r = b.getBoundingClientRect(), er = e.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        covered = top && (top === b || b.contains(top)) ? 'ok' : (top ? (top.id || top.className || top.tagName) : 'none');
        inside = r.left >= er.left - 1 && r.right <= er.right + 1 && r.top >= er.top - 1 && r.bottom <= er.bottom + 1;
      }
      return { id: e.id || e.name || e.className.slice(0, 30), type: e.type, mic: !!(b && !b.hidden), covered, inside };
    });
    return { engine: window.LowiMic && window.LowiMic.engine(), state: window.LowiMic && window.LowiMic.state(), fields };
  });
  log('home', await audit());

  // a field on the main screen: tap the mic, words arrive
  const tapMic = async (sel) => { const loc = P.locator(sel + ' + .mic-btn').first(); if (!(await loc.count())) return 'no mic'; await R.tapEl(loc); return 'tapped'; };
  const firstWithMic = await P.evaluate(() => { const b = [...document.querySelectorAll('.mic-btn')].find(b => !b.hidden && b.getBoundingClientRect().width > 2); if (!b) return null; const f = b.previousElementSibling; f.setAttribute('data-probe', '1'); return f.id || f.className; });
  log('first field with mic', firstWithMic);

  // Community chat composer
  await P.evaluate(() => goTab('foryou')); await H.sleep(900);
  await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]').catch(() => {}); await H.sleep(1500);
  log('chat', await P.evaluate(() => {
    const i = document.getElementById('cmInput'), b = i && i.nextElementSibling, vm = document.getElementById('cmMic');
    const r = b && b.getBoundingClientRect(), ir = i && i.getBoundingClientRect(), vr = vm && vm.getBoundingClientRect();
    return { input: !!i, dictate: !!(b && b.classList.contains('mic-chat') && !b.hidden), label: b && b.getAttribute('aria-label'),
      voiceMic: !!(vr && vr.width > 2), overlap: !!(r && vr && r.right > vr.left && r.left < vr.right && r.bottom > vr.top && r.top < vr.bottom),
      insideBox: !!(r && ir && r.right <= ir.right + 1 && r.left >= ir.left), icon: b && b.querySelectorAll('path').length,
      micRect: r && [r.left, r.right, r.top, r.bottom].map(Math.round), boxRect: ir && [ir.left, ir.right, ir.top, ir.bottom].map(Math.round) };
  }));
  await P.evaluate(() => { const i = document.getElementById('cmInput'); if (i) { i.value = 'Hi'; i.dispatchEvent(new Event('input', { bubbles: true })); } });
  log('chat tap', await tapMic('#cmInput')); await H.sleep(1300);
  log('chat result (not sent)', await P.evaluate(() => ({ value: (document.getElementById('cmInput') || {}).value })));
  await P.evaluate(() => { const i = document.getElementById('cmInput'); if (i) { i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); } });

  // permission off
  await P.evaluate(() => { window.__srMode = 'deny'; });
  await tapMic('#cmInput'); await H.sleep(600);
  log('denied hint', await P.evaluate(() => { const h = document.querySelector('.mic-hint'); return h && { on: h.classList.contains('on'), key: h.getAttribute('data-key'), text: h.textContent }; }));

  // Home Screen web app on iPhone: service-not-allowed -> keyboard dictation from then on
  await P.evaluate(() => { window.__srMode = 'svc'; window.__srStarts = 0; });
  await H.sleep(600);
  await tapMic('#cmInput'); await H.sleep(700);
  log('svc hint', await P.evaluate(() => { const h = document.querySelector('.mic-hint'); return { key: h && h.getAttribute('data-key'), text: h && h.textContent, focused: document.activeElement && document.activeElement.id, engine: window.LowiMic.engine(), starts: window.__srStarts }; }));
  await H.sleep(600);
  await tapMic('#cmInput'); await H.sleep(500);
  log('svc second tap goes straight to keyboard', await P.evaluate(() => ({ starts: window.__srStarts, key: document.querySelector('.mic-hint').getAttribute('data-key') })));

  // Scan tab, fresh start (forget the 'no in-page speech' learned above), food name with 'Toast' already typed
  await P.evaluate(() => { Object.keys(localStorage).filter(k => /^lowi_mic_native_off_/.test(k)).forEach(k => localStorage.removeItem(k)); });
  await R.goto(); await H.sleep(5000);
  await P.evaluate(() => goTab('scan')); await H.sleep(1500);
  log('scan', await audit());
  await P.evaluate(() => { const f = document.getElementById('b3Nm'); f.value = 'Toast'; window.__inputs = 0; f.addEventListener('input', () => window.__inputs++); });
  log('scan tap', await tapMic('#b3Nm'));
  await H.sleep(300);
  log('scan listening', await P.evaluate(() => { const b = document.querySelector('#b3Nm + .mic-btn'); return { on: b.classList.contains('mic-on'), pressed: b.getAttribute('aria-pressed'), label: b.getAttribute('aria-label'), srLang: window.__srLang, live: document.getElementById('b3Nm').value }; }));
  await H.sleep(900);
  log('scan result', await P.evaluate(() => ({ value: document.getElementById('b3Nm').value, inputs: window.__inputs, on: document.querySelector('#b3Nm + .mic-btn').classList.contains('mic-on') })));
  // tap again stops
  await P.evaluate(() => { window.__srMode = 'hang'; });
  await tapMic('#b3Nm'); await H.sleep(600); await tapMic('#b3Nm'); await H.sleep(400);
  log('tap again stops', await P.evaluate(() => ({ on: document.querySelector('#b3Nm + .mic-btn').classList.contains('mic-on'), listening: window.LowiMic.listening() })));
  await P.screenshot({ path: '/tmp/mic-scan.png' });
  log('errors', R.errs.filter(e => !/supabase|fetch|network/i.test(e.m)).slice(0, 8));
  await R.close();
  process.exit(0);
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
