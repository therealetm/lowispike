'use strict';
/* Run 48: dictation vs words the user types while the mic listens (mic-dictate.js). Fake SpeechRecognition.
   A: focus field, type "milk", tap mic, interim "two eggs", user types " and butter", final "two eggs", end -> typed words kept?
   B: tap mic, user types "salt" before any result, end with no result -> "salt" kept?
   C: tap mic, interim "bread", the app clears the field (like Send), final "bread", end -> field stays empty (no resurrection)?
   usage: node probe-mic-typed.cjs <url|dir> [view] */
const L = require('./lib.cjs');
const FAKE = `(() => { const all = window.__sr = [];
  class FakeSR { constructor() { this.st = 'new'; all.push(this); }
    start() { if (this.st !== 'new') throw new Error('InvalidStateError'); this.st = 'on'; setTimeout(() => { this.onstart && this.onstart(); this.onaudiostart && this.onaudiostart(); }, 30); }
    _say(t, fin) { const r = [{ transcript: t, confidence: .9 }]; r.isFinal = !!fin; const ev = { resultIndex: 0, results: [r] }; this.onresult && this.onresult(ev); }
    _end() { this.st = 'end'; this.onend && this.onend(); }
    stop() { if (this.st !== 'on') return; this.st = 'stopping'; setTimeout(() => { this.st = 'end'; this.onend && this.onend(); }, 60); }
    abort() { if (this.st !== 'on' && this.st !== 'stopping') return; this.st = 'aborting'; setTimeout(() => { this.onerror && this.onerror({ error: 'aborted' }); this.st = 'end'; this.onend && this.onend(); }, 40); } }
  window.SpeechRecognition = window.webkitSpeechRecognition = FakeSR; })();`;
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'chromium390';
  const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
  const pre = "try{localStorage.setItem('lowi.tutorial.done','1');}catch(e){}" + FAKE;
  const h = await L.open({ url, view, lang: 'en', preInit: pre, ctxHook: async ctx => require(WT + '/tools/sim/mock-cloud.cjs').install(ctx, { members: 20, messages: 10, me: 'Fixture' }) });
  const P = h.page, errs = [];
  P.on('pageerror', e => errs.push(String(e)));
  await P.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(3000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
  const FIELD = process.env.FIELD || '#kgQ';
  const openIt = async () => { await P.evaluate(() => { try { LowiKitchenGame.open('buy'); } catch (e) { } }); await L.sleep(2000); };
  await openIt();
  const S = ms => L.sleep(ms);
  const mic = async () => { await P.evaluate(f => { const el = document.querySelector(f); el.nextElementSibling.click(); }, FIELD); await S(600); };
  const say = (t, fin) => P.evaluate(([t, fin]) => window.__sr[window.__sr.length - 1]._say(t, fin), [t, fin]);
  const end = () => P.evaluate(() => window.__sr[window.__sr.length - 1]._end());
  const val = () => P.evaluate(f => document.querySelector(f).value, FIELD);
  const reset = async () => { await P.evaluate(f => { const el = document.querySelector(f); el.value = ''; el.focus(); }, FIELD); await S(200); };
  let fail = 0; const res = (nm, ok, v) => { if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + nm + ' value=' + JSON.stringify(v)); };
  if (!(await P.evaluate(f => !!document.querySelector(f) && !!document.querySelector(f).nextElementSibling && document.querySelector(f).nextElementSibling.classList.contains('mic-btn'), FIELD))) { console.log('no mic on ' + FIELD); process.exit(2); }
  // A
  await reset(); await P.keyboard.type('milk'); await mic(); await say('two eggs', false); await S(100);
  await P.keyboard.type(' and butter'); await S(100); await say('two eggs', true); await S(100); await end(); await S(300);
  let v = await val(); res('A typed while listening is kept', /butter/.test(v) && /milk/.test(v) && /two eggs/.test(v), v);
  // B
  await reset(); await mic(); await P.keyboard.type('salt'); await S(100); await end(); await S(300);
  v = await val(); res('B typed before any words is kept', v === 'salt', v);
  // C
  await reset(); await mic(); await say('bread', false); await S(100);
  await P.evaluate(f => { const el = document.querySelector(f); el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }, FIELD); await S(100);
  await say('bread', true); await S(100); await end(); await S(300);
  v = await val(); res('C field cleared by the app stays cleared', v === '', v);
  // D control: plain dictation still works
  await reset(); await P.keyboard.type('milk'); await mic(); await say('two eggs', false); await S(80); await say('two eggs', true); await end(); await S(300);
  v = await val(); res('D plain dictation after typed text', v === 'milk two eggs', v);
  console.log('errors', errs.length, errs.slice(0, 3).join(' | '));
  console.log(fail ? 'RESULT FAIL ' + fail : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
