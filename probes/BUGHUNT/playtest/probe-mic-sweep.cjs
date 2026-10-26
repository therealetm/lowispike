'use strict';
/* Run 46 (mic dictation, live since 20261026-173248): walk the app with a fake SpeechRecognition. After each step, every
   visible .mic-btn is checked: sits inside its field's right edge, is the top element at its centre, does not cover another
   control, field text does not run under it (padding-right). Then sessions: start on a field, leave the screen, switch fields,
   double tap, background the tab -> no session left listening, no stale placeholder, no errors.
   usage: node probe-mic-sweep.cjs <url|dir> [view] [lang] */
const L = require('./lib.cjs');
const FAKE = `(() => { const all = window.__sr = [];
  class FakeSR { constructor() { this.st = 'new'; all.push(this); }
    start() { if (this.st !== 'new') throw new Error('InvalidStateError'); this.st = 'on'; setTimeout(() => { this.onstart && this.onstart(); this.onaudiostart && this.onaudiostart(); }, 30); }
    _say(t, fin) { const r = [{ transcript: t, confidence: .9 }]; r.isFinal = !!fin; const ev = { resultIndex: 0, results: [r] }; this.onresult && this.onresult(ev); }
    stop() { if (this.st !== 'on') return; this.st = 'stopping'; setTimeout(() => { this.st = 'end'; this.onend && this.onend(); }, 60); }
    abort() { if (this.st !== 'on' && this.st !== 'stopping') return; this.st = 'aborting'; setTimeout(() => { this.onerror && this.onerror({ error: 'aborted' }); this.st = 'end'; this.onend && this.onend(); }, 40); } }
  window.SpeechRecognition = window.webkitSpeechRecognition = FakeSR; })();`;
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'chromium390', lang = process.argv[4] || 'en';
  const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
  const pre = "try{localStorage.setItem('lowi.tutorial.done','1');}catch(e){}" + FAKE;
  const h = await L.open({ url, view, lang, preInit: pre, ctxHook: async ctx => require(WT + '/tools/sim/mock-cloud.cjs').install(ctx, { members: 20, messages: 10, me: 'Fixture' }) });
  const P = h.page;
  await P.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(3000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
  console.log('mic state', JSON.stringify(await P.evaluate(() => window.LowiMic && LowiMic.state())));
  const check = () => P.evaluate(() => {
    const out = [], ok = [];
    const vis = e => { for (let x = e; x && x.nodeType === 1; x = x.parentElement) { if (x.hidden) return false; const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } return true; };
    const id = e => e ? (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) : 'null';
    document.querySelectorAll('.mic-btn').forEach(b => {
      const f = b.previousElementSibling; if (!vis(b)) return; const br = b.getBoundingClientRect(); if (!br.width) return;
      if (br.bottom < 0 || br.top > innerHeight || br.right < 0 || br.left > innerWidth) return;
      const fr = f && f.getBoundingClientRect(); const nm = id(f);
      if (!f || !/INPUT|TEXTAREA/.test(f.tagName)) { out.push('orphan mic after ' + nm); return; }
      if (!vis(f) || !fr.width) { out.push('mic visible, field hidden: ' + nm); return; }
      if (br.left < fr.left - 1 || br.right > fr.right + 1 || br.top < fr.top - 2 || br.bottom > fr.bottom + 2) out.push('mic outside field ' + nm + ' mic=' + [br.left, br.top, br.width, br.height].map(Math.round) + ' field=' + [fr.left, fr.top, fr.width, fr.height].map(Math.round));
      const cx = br.left + br.width / 2, cy = br.top + br.height / 2, top = document.elementFromPoint(cx, cy);
      if (top && !b.contains(top)) out.push('mic covered at centre ' + nm + ' by ' + id(top));
      const pr = parseFloat(getComputedStyle(f).paddingRight) || 0; if (fr.right - pr > br.left + 4 && f.value !== undefined) out.push('text runs under mic ' + nm + ' padR=' + pr + ' (needs ' + Math.round(fr.right - br.left) + ')');
      document.querySelectorAll('button,a[href],[role=button],input,select,textarea').forEach(o => { if (o === b || o === f || b.contains(o) || o.contains(b) || !vis(o)) return; const r = o.getBoundingClientRect(); if (!r.width) return; const ix = Math.min(r.right, br.right) - Math.max(r.left, br.left), iy = Math.min(r.bottom, br.bottom) - Math.max(r.top, br.top); if (ix > 6 && iy > 6) out.push('mic overlaps ' + id(o) + ' (' + Math.round(ix) + 'x' + Math.round(iy) + ') on field ' + nm); });
      ok.push(nm);
    });
    return { out, ok };
  });
  const ORB = o => "(function(){const b=document.querySelector('[data-orbit=" + o + "]');if(b)b.click();})()";
  const CLOSE = "(function(){document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));try{LowiStorePicks.isOpen()&&LowiStorePicks.close()}catch(e){}try{LowiKitchenGame.close&&LowiKitchenGame.close()}catch(e){}goTab('home')})()";
  const steps = [
    ['fuel bubble', ORB('fuel')], ['close', CLOSE], ['scan bubble', ORB('scan')], ['close', CLOSE],
    ['scan tab', "goTab('scan')"], ['close', CLOSE], ['water bubble', ORB('water')], ['close', CLOSE],
    ['move bubble', ORB('move')], ['close', CLOSE], ['sleep bubble', ORB('sleep')], ['close', CLOSE],
    ['store picks', "LowiStorePicks.open('probe')"], ['sp shop tab', "LowiStorePicks.setTab&&LowiStorePicks.setTab('shop')"], ['sp snacks', "LowiStorePicks.snacks&&LowiStorePicks.snacks()"], ['close', CLOSE],
    ['kitchen buy', "LowiKitchenGame.open('buy')"], ['close', CLOSE],
    ['community', ORB('settings')], ['chat', "try{LowiCommunityRooms.openOn('chat')}catch(e){}"], ['close', CLOSE],
    ['profile', "goTab('profile')"], ['close', CLOSE], ['today', "goTab('today')"], ['close', CLOSE], ['shelf', "goTab('shelf')"], ['close', CLOSE]
  ];
  const seen = new Map(); let fields = new Set();
  for (const [lbl, code] of (process.env.NOSWEEP ? [] : steps)) {
    const err = await P.evaluate(code => { try { (0, eval)(code); return ''; } catch (e) { return e.message; } }, code);
    await L.sleep(1800);
    const r = await check(); r.ok.forEach(x => fields.add(x));
    const fresh = r.out.filter(x => !seen.has(x)); fresh.forEach(x => seen.set(x, lbl));
    console.log('STEP', lbl, err ? 'ERR ' + err : '', 'mics:' + r.ok.length, fresh.length ? '\n  ' + fresh.join('\n  ') : '');
  }
  console.log('fields with mic seen:', [...fields].join(' '));
  // ---- sessions ----
  const sess = await P.evaluate(async () => {
    const S = ms => new Promise(r => setTimeout(r, ms)), res = [];
    const vis = e => { for (let x = e; x && x.nodeType === 1; x = x.parentElement) { if (x.hidden) return false; const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } const r = e.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
    const closeAll = async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); try { LowiStorePicks.isOpen() && LowiStorePicks.close(); } catch (e) { } try { LowiKitchenGame.close && LowiKitchenGame.close(); } catch (e) { } goTab('home'); await S(1500); };
    const scenarios = [['scan', () => document.querySelector('[data-orbit=scan]').click()], ['store', () => LowiStorePicks.open('probe')], ['kitchen', () => LowiKitchenGame.open('buy')], ['chat', () => { document.querySelector('[data-orbit=settings]').click(); setTimeout(() => { try { LowiCommunityRooms.openOn('chat'); } catch (e) { } }, 800); }]];
    for (const [nm, openIt] of scenarios) {
      await closeAll(); openIt(); await S(2200);
      const b = [...document.querySelectorAll('.mic-btn')].find(x => vis(x) && vis(x.previousElementSibling));
      if (!b) { res.push(nm + ': no visible mic'); continue; }
      const fl = b.previousElementSibling, ph = fl.getAttribute('placeholder'); fl.value = '';
      await S(500); b.click(); await S(200); const r = window.__sr[window.__sr.length - 1]; r && r._say('two eggs', false);
      await closeAll();
      res.push(nm + ' [' + (fl.id || fl.className) + '] after closing: fieldVisible=' + vis(fl) + ' connected=' + fl.isConnected + ' listening=' + LowiMic.listening() + ' sr=' + (r && r.st) + ' value=' + JSON.stringify(fl.value) + ' ph=' + JSON.stringify(fl.getAttribute('placeholder')));
      LowiMic.stop(); await S(300);
      res.push('   after stop: value=' + JSON.stringify(fl.value) + ' ph=' + JSON.stringify(fl.getAttribute('placeholder')) + ' was ' + JSON.stringify(ph));
    }
    await closeAll(); document.querySelector('[data-orbit=scan]').click(); await S(2200);
    const f = [...document.querySelectorAll('.mic-btn')].find(x => vis(x) && vis(x.previousElementSibling));
    if (!f) return res.concat(['no visible mic on scan']);
    const fld = f.previousElementSibling, ph0 = fld.getAttribute('placeholder');
    // B: background
    goTab('scan'); await S(1500);
    await S(500); f.click(); await S(200);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); await S(300);
    delete document.hidden;
    res.push('B after hide: listening=' + LowiMic.listening() + ' btnOn=' + f.classList.contains('mic-on') + ' srs=' + window.__sr.map(x => x.st).join(','));
    // C: final result then tap stop
    { const b = fld.getBoundingClientRect(); res.push('Cdbg hidden=' + document.hidden + ' own=' + Object.getOwnPropertyNames(document).includes('hidden') + ' rect=' + [b.width, b.height] + ' cv=' + (fld.checkVisibility && fld.checkVisibility({ visibilityProperty: true, opacityProperty: true })) + ' conn=' + fld.isConnected); }
    await S(500); f.click(); await S(200); const s3 = window.__sr[window.__sr.length - 1]; s3._say('oats with milk', true); await S(50); await S(500); f.click(); await S(300);
    res.push('C value=' + JSON.stringify(fld.value) + ' listening=' + LowiMic.listening() + ' srs=' + window.__sr.map(x => x.st).join(','));
    // D: double tap
    fld.value = ''; await S(600); f.click(); await S(80); f.click(); await S(300);
    res.push('D dbl: listening=' + LowiMic.listening() + ' srs=' + window.__sr.length);
    LowiMic.stop(); await S(300);
    res.push('D end listening=' + LowiMic.listening() + ' ph=' + JSON.stringify(fld.getAttribute('placeholder')));
    return res;
  });
  console.log('SESSIONS\n  ' + sess.join('\n  '));
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror, ce: h.log.console.filter(x => !/Failed to load|ERR_FAILED|net::/.test(x)).slice(0, 8) }));
  console.log(seen.size ? 'FAIL ' + seen.size + ' mic issues' : 'PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
