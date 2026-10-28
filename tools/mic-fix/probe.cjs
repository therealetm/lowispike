#!/usr/bin/env node
'use strict';
/* Oct 28 2026 mic fix check (owner: "wieso funktioniert das Mikrofon nicht?"). Local copy (or LIVE=1 the live files), German,
   Community > Chat. Browser sim, not a real iPhone.
   An iOS model stands in for WebKit's microphone: navigator.audioSession whose type 'ambient' makes getUserMedia and the speech
   recognition fail at once with no prompt (what iPhone / iPad do while the app's 'ambient' sound session is set), plus a
   permission state: granted, denied, or prompt (first request asks, then allowed).
   Checks per state: one mic in the composer; tap = dictation writes words into the field; hold = voice-message bar; denied =
   short "Mikrofon ist aus" card that nothing covers (the bottom X is not on top of it); granted / prompt never show the card;
   no page errors. Screenshots to $SHOTS (default /home/sprite/micfix-shots).
   node tools/mic-fix/probe.cjs <dark|light> <WxH> <granted|denied|prompt> [webkit|chromium] */
const { launch, openApp, sleep, existingSeed } = require('../interface-audit/lib.cjs');
const fs = require('fs');
const theme = process.argv[2] || 'dark', vp = (process.argv[3] || '390x844').split('x').map(Number), perm = process.argv[4] || 'granted';
const engine = process.argv[5] || 'webkit', SHOT = process.env.SHOTS || '/home/sprite/micfix-shots', real = process.env.REAL === '1';
try { fs.mkdirSync(SHOT, { recursive: true }); } catch (e) { }
const IOS = `(() => {
  const P = window.__perm = { state: '${perm}', asked: 0, gum: 0, gumErr: [], srErr: [] };
  const sess = { _t: 'auto' }; Object.defineProperty(sess, 'type', { get() { return this._t; }, set(v) { this._t = v; (window.__typeLog = window.__typeLog || []).push(v); } });
  Object.defineProperty(navigator, 'audioSession', { value: sess, configurable: true });
  const err = (n) => { const e = new Error(n); e.name = n; return e; };
  const fakeStream = () => { const AC = window.AudioContext || window.webkitAudioContext; const ac = new AC(); const o = ac.createOscillator(); const d = ac.createMediaStreamDestination(); o.connect(d); o.start(); return d.stream; };
  if (!${real}) {
    if (navigator.permissions) navigator.permissions.query = (d) => Promise.resolve({ state: P.state === 'granted' ? 'granted' : P.state === 'denied' ? 'denied' : 'prompt' });
    const gum = function () {
      P.gum++;
      if (sess._t === 'ambient') { P.gumErr.push('ambient'); return Promise.reject(err('NotAllowedError')); }
      if (P.state === 'denied') { P.gumErr.push('denied'); return Promise.reject(err('NotAllowedError')); }
      if (P.state === 'prompt') { P.asked++; return new Promise(r => setTimeout(() => { P.state = 'granted'; r(fakeStream()); }, 700)); }
      return Promise.resolve(fakeStream());
    };
    try { Object.defineProperty(MediaDevices.prototype, 'getUserMedia', { value: gum, configurable: true, writable: true }); } catch (e) { }
    if (!navigator.mediaDevices) Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: gum, enumerateDevices: () => Promise.resolve([]) }, configurable: true });
    else try { navigator.mediaDevices.getUserMedia = gum; } catch (e) { }
    window.__gumStub = navigator.mediaDevices.getUserMedia === gum;
  }
  if (!window.MediaRecorder) { window.MediaRecorder = function (st, o) { this.stream = st; this.state = 'inactive'; this.mimeType = 'audio/mp4'; };
    MediaRecorder.isTypeSupported = (t) => /mp4|webm/.test(t);
    MediaRecorder.prototype.start = function () { this.state = 'recording'; const s = this; s._i = setInterval(() => s.ondataavailable && s.ondataavailable({ data: new Blob([new Uint8Array(800)], { type: 'audio/mp4' }) }), 250); };
    MediaRecorder.prototype.stop = function () { clearInterval(this._i); this.state = 'inactive'; const s = this; setTimeout(() => { s.ondataavailable && s.ondataavailable({ data: new Blob([new Uint8Array(800)], { type: 'audio/mp4' }) }); s.onstop && s.onstop(); }, 30); };
    MediaRecorder.prototype.requestData = function () { }; window.__fakeMR = true; }
  function SR() { this.lang = ''; }
  SR.prototype.start = function () { const self = this; window.__srStarts = (window.__srStarts || 0) + 1;
    setTimeout(() => {
      if (sess._t === 'ambient') { P.srErr.push('ambient'); self.onerror && self.onerror({ error: 'audio-capture' }); self.onend && self.onend(); return; }
      if (P.state === 'denied') { P.srErr.push('denied'); self.onerror && self.onerror({ error: 'not-allowed' }); self.onend && self.onend(); return; }
      self.onstart && self.onstart();
      const mk = (t, fin) => { const r = [{ transcript: t }]; r.isFinal = fin; return r; };
      setTimeout(() => self.onresult && self.onresult({ resultIndex: 0, results: [mk('zwei Eier', false)] }), 150);
      self._t = setTimeout(() => { self.onresult && self.onresult({ resultIndex: 0, results: [mk('zwei Eier und Toast', true)] }); self.onend && self.onend(); }, 900);
    }, 60); };
  SR.prototype.stop = function () { clearTimeout(this._t); this.onend && this.onend(); };
  SR.prototype.abort = function () { clearTimeout(this._t); this.onerror && this.onerror({ error: 'aborted' }); this.onend && this.onend(); };
  window.webkitSpeechRecognition = SR;
})();`;

/* Oct 28 (owner: "no lag"): every painted frame, record any moment the visible bottom X overlaps the mic card, the chat field,
   the composer row or a hint. Reported as out.frameOverlaps (empty = nothing overlapped at any moment). */
const MON = `(() => {
  const F = window.__frames = { n: 0, bad: [] };
  const ov = (a, b) => !(a.right <= b.left + 1 || a.left >= b.right - 1 || a.bottom <= b.top + 1 || a.top >= b.bottom - 1);
  /* the check runs after every requestAnimationFrame callback of the frame (ResizeObserver delivery), i.e. on what gets painted */
  let pin = null, flip = false;
  function tick() {
    requestAnimationFrame(tick);
    if (!pin) { if (!document.body) return; pin = document.createElement('div'); pin.style.cssText = 'position:fixed;left:0;top:0;height:1px;width:1px;pointer-events:none;opacity:0'; document.body.appendChild(pin); new ResizeObserver(check).observe(pin); }
    if (!pin.isConnected) document.body.appendChild(pin);
    F.n++; flip = !flip; pin.style.width = flip ? '2px' : '1px';
  }
  function check() {
    try {
      const bx = document.getElementById('lwBX');
      if (bx && bx.classList.contains('on')) {
        const cs = getComputedStyle(bx);
        if (cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05) {
          const b = bx.getBoundingClientRect();
          const list = [['card', document.querySelector('#csMic .cs-mic-card')], ['input', document.getElementById('cmInput')], ['mic', document.getElementById('cmMic')], ['photo', document.getElementById('cmPhoto')], ['send', document.getElementById('cmSend')], ['notice', document.getElementById('csNotice')], ['hint', document.querySelector('.mic-hint.on')], ['rec', document.querySelector('#csRec .cs-rec')], ['rechint', document.querySelector('.cs-rec-hint')]];
          for (const [k, e] of list) { if (!e) continue; const r = e.getBoundingClientRect(); const s = getComputedStyle(e); if (r.width < 2 || r.height < 2 || s.visibility === 'hidden' || +s.opacity < 0.05) continue; if (ov(b, r)) { if (F.bad.length < 40) F.bad.push(k + '@f' + F.n + ' t' + Math.round(performance.now()) + ' bx' + Math.round(b.top) + '-' + Math.round(b.bottom) + ' el' + Math.round(r.top) + '-' + Math.round(r.bottom) + ' op' + (+cs.opacity).toFixed(2) + ' ' + bx.className + ' HIT:' + (() => { bx.style.pointerEvents='none'; const e = document.elementFromPoint(innerWidth/2, b.top + 4); bx.style.pointerEvents=''; const p = []; for (let a = e; a && p.length < 7; a = a.parentElement) p.push(a.id || a.tagName + '.' + String(a.className).slice(0, 24)); return p.join('<'); })() + ' ' + JSON.stringify(window.LowiBottomClose && LowiBottomClose.lifted)); } }
        }
      }
    } catch (e) { }
  }
  requestAnimationFrame(tick);
})();`;

(async () => {
  const seed = existingSeed({ lang: 'de', kv: { 'lowispike.lang': 'de', 'lowi.lang': 'de', 'lowispike.theme': theme, 'lowi.theme': theme } });
  const h = await launch({ engine, seed, lang: 'de', locale: 'de-DE', viewport: { width: vp[0], height: vp[1] } });
  if (real && engine === 'chromium' && perm === 'granted') await h.ctx.grantPermissions(['microphone']);
  await h.ctx.addInitScript({ content: IOS }); await h.ctx.addInitScript({ content: MON }); h.page.on('console', m => { if (/DBG/.test(m.text())) console.error(m.text()); });
  if (process.env.OFFLINE) await h.ctx.route(/supabase\.co/, r => r.abort());
  await openApp(h, { query: '?dc=' + Date.now() });
  const P = h.page, tag = [perm, theme, vp.join('x'), engine].join('-'), out = { tag, steps: {} };
  const step = (k, v) => { out.steps[k] = v; };
  const esc = async (n = 3) => { for (let i = 0; i < n; i++) { await P.keyboard.press('Escape'); await sleep(200); } };
  await sleep(1500); await esc();
  /* a first tap anywhere: the app's sound unlock sets the 'ambient' session, exactly like on the phone */
  await P.mouse.click(5, Math.round(vp[1] / 2)); await sleep(300);
  step('afterFirstTap', await P.evaluate(() => navigator.audioSession.type));
  await P.evaluate(async () => { for (let i = 0; i < 4 && !document.documentElement.classList.contains('cm-open'); i++) { try { LowiHost.go('foryou'); } catch (e) { } await new Promise(r => setTimeout(r, 2500)); } const t = [...document.querySelectorAll('#tab-foryou button,#tab-foryou [role="tab"]')].find(b => /^\s*chat\s*$/i.test(b.textContent)); if (t) t.click(); });
  await sleep(2500);
  /* wait (max 2.5 s) until the bottom X has stopped moving, then measure: a real person sees the settled layout */
  const settle = () => P.evaluate(async () => { const bx = document.getElementById('lwBX'); let last = '', same = 0; const t0 = Date.now(); while (Date.now() - t0 < 2500) { const q = bx ? bx.getBoundingClientRect() : { top: 0, bottom: 0 }; const k = Math.round(q.top) + ',' + Math.round(q.bottom) + ',' + (bx && bx.className); if (k === last) { if (++same >= 3) break; } else { same = 0; last = k; } await new Promise(r => setTimeout(r, 120)); } return Date.now() - t0; });
  const look = async () => { const waited = await settle(); const o = await look0(); o.waited = waited; return o; };
  const look0 = () => P.evaluate(() => {
    const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none'; };
    const row = document.querySelector('#cmPaneChat .cm-inrow');
    const mics = row ? [...row.parentElement.querySelectorAll('.mic-btn,.cs-mic-btn,[data-chat="mic"]')].filter(vis).map(e => e.id || e.className) : [];
    const card = document.querySelector('#csMic .cs-mic-card');
    const bx = document.getElementById('lwBX'), bxOn = !!(bx && bx.classList.contains('on') && vis(bx));
    let overlap = null, cardText = null, cardCovered = [];
    if (card && vis(card)) {
      cardText = card.innerText.replace(/\s+/g, ' ').trim();
      const c = card.getBoundingClientRect();
      if (bxOn) { const b = bx.getBoundingClientRect(); overlap = !(b.right <= c.left || b.left >= c.right || b.bottom <= c.top || b.top >= c.bottom); }
      /* every text / button spot of the card must be the card itself on top */
      card.querySelectorAll('b,small,button').forEach(el => { const r = el.getBoundingClientRect(); for (const fx of [.1, .5, .9]) { const t = document.elementFromPoint(r.left + r.width * fx, r.top + r.height / 2); if (t && !card.contains(t)) cardCovered.push((el.tagName) + '<' + (t.id || t.className)); } });
    }
    /* the bottom X must not sit on any visible text / control of the chat */
    let bxOver = [];
    if (bxOn) { const b = bx.getBoundingClientRect(); bx.style.pointerEvents = 'none'; for (const dx of [8, 28, 48]) for (const dy of [8, 28, 48]) { const t = document.elementFromPoint(b.left + dx, b.top + dy); if (t && t !== document.body && t !== document.documentElement) { const tx = [...t.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim()); const ctl = t.closest('button,input,textarea,[role="button"],.cs-mic-card,.mic-hint'); if (tx || ctl) bxOver.push((ctl ? (ctl.id || ctl.className) : t.tagName + ':' + t.textContent.trim().slice(0, 20))); } } bx.style.pointerEvents = ''; }
    const inp = document.getElementById('cmInput'), mic = document.getElementById('cmMic');
    return { mics, micLabel: mic && mic.getAttribute('aria-label'), micDictating: !!(mic && mic.classList.contains('cs-dictating')), input: inp && inp.value, placeholder: inp && inp.getAttribute('placeholder'),
      card: cardText, overlap, cardCovered: [...new Set(cardCovered)], bxOn, bxOver: [...new Set(bxOver)], geo: (() => { const r = e => { if (!e) return null; const q = e.getBoundingClientRect(); return Math.round(q.left)+','+Math.round(q.top)+'-'+Math.round(q.right)+','+Math.round(q.bottom); }; return { bx: r(bx), me: r(document.querySelector('.cg-body.me')), rec: r(document.querySelector('#csRec .cs-rec')), input: r(document.getElementById('cmInput')), row: r(document.querySelector('#cmPaneChat .cm-inrow')), lifted: window.LowiBottomClose && LowiBottomClose.lifted }; })(), rec: !!document.querySelector('#csRec .cs-rec'), recHint: (document.getElementById('csRecHint') || {}).textContent || '',
      notice: (document.getElementById('csStatus') || {}).textContent || '', session: navigator.audioSession.type, perm: window.__perm, hint: (document.querySelector('.mic-hint.on') || {}).textContent || '' };
  });

  /* Oct 28: pixel check of what lies under the X: the same frame with the X and without it (PNG), plus the X's box */
  const fsx = require('fs');
  async function shotPair(name) {
    await P.screenshot({ path: SHOT + '/' + name + '.jpg', type: 'jpeg', quality: 60 });
    const box = await P.evaluate(() => { const b = document.getElementById('lwBX'); if (!b || !b.classList.contains('on')) return null; const cs = getComputedStyle(b); if (cs.visibility === 'hidden' || +cs.opacity < 0.05) return null; const r = b.getBoundingClientRect(); b.style.setProperty('visibility', 'hidden', 'important'); return { l: r.left, t: r.top, r: r.right, b: r.bottom, dpr: devicePixelRatio }; });
    if (!box) { fsx.writeFileSync(SHOT + '/' + name + '.box.json', 'null'); return; }
    await P.screenshot({ path: SHOT + '/' + name + '.nox.png', type: 'png' });
    await P.evaluate(() => { const b = document.getElementById('lwBX'); if (b) b.style.removeProperty('visibility'); });
    await P.screenshot({ path: SHOT + '/' + name + '.x.png', type: 'png' });
    fsx.writeFileSync(SHOT + '/' + name + '.box.json', JSON.stringify(box));
  }
  step('chat', await look());
  if (process.env.DUMP) step('dump', await P.evaluate(() => { const r = e => { const q = e.getBoundingClientRect(); return Math.round(q.left)+','+Math.round(q.top)+'-'+Math.round(q.right)+','+Math.round(q.bottom); }; const row = document.querySelector('#cmPaneChat .cm-inrow'); return { bx: r(document.getElementById('lwBX')), lifted: LowiBottomClose.lifted, row: r(row), kids: [...row.children].map(k => (k.id||k.className)+':'+r(k)+':'+getComputedStyle(k).display), compose: r(document.querySelector('#cmPaneChat .cm-compose')), vh: innerHeight, pts: (() => { const bx = document.getElementById('lwBX'); bx.style.pointerEvents='none'; const o = []; for (const y of [innerHeight - 66, innerHeight - 62, innerHeight - 42]) { const e = document.elementFromPoint(innerWidth/2, y); const path = []; for (let a = e; a && path.length < 6; a = a.parentElement) path.push(a.id || a.tagName+'.'+String(a.className).slice(0,30)); o.push(y + ':' + path.join(' < ')); } bx.style.pointerEvents=''; return o; })(), typing: document.activeElement && (document.activeElement.id||document.activeElement.tagName) }; }));
  await shotPair('mic-0-chat-' + tag);
  const mic = P.locator('#cmMic');
  const box = await mic.boundingBox().catch(() => null);
  if (!box) { out.err = 'no #cmMic'; out.errors = h.errors; console.log(JSON.stringify(out, null, 1)); await h.browser.close(); return; }
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  /* 1. tap = dictation */
  await P.mouse.move(cx, cy); await P.mouse.down(); await sleep(90); await P.mouse.up();
  await sleep(450); step('tapListening', await look());
  await shotPair('mic-1-dictate-' + tag);
  await sleep(1400); step('tapDone', await look());
  await shotPair('mic-2-dictated-' + tag);
  await P.evaluate(() => { const i = document.getElementById('cmInput'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); i.blur(); });
  await sleep(500);
  step('sessionBeforeHold', await P.evaluate(() => navigator.audioSession.type));
  /* 2. hold = voice message */
  const b2 = await mic.boundingBox(); const hx = b2.x + b2.width / 2, hy = b2.y + b2.height / 2;
  await P.mouse.move(hx, hy); await P.mouse.down(); await sleep(perm === 'prompt' ? 1400 : 900);
  step('holding', await look());
  await sleep(700); step('holdingSettled', await look());
  if (process.env.DBGX2) step('dbg2', await P.evaluate(() => { const bx = document.getElementById('lwBX'); const b = bx.getBoundingClientRect(); bx.style.pointerEvents = 'none'; const t = document.elementFromPoint(b.left + 28, b.top + 28); bx.style.pointerEvents = ''; const ch = []; for (let a = t; a && a !== document.body; a = a.parentElement) { const r = a.getBoundingClientRect(), s = getComputedStyle(a); ch.push([a.tagName, a.id, String(a.className).slice(0, 40), a.getAttribute('role'), s.position, s.overflowY, Math.round(r.top), Math.round(r.bottom), Math.round(r.height), a.scrollHeight > a.clientHeight + 2]); } const cx = innerWidth / 2, y0 = b.top; bx.style.pointerEvents = 'none'; const hits = []; for (const dx of [-26, 0, 26]) for (const y of [y0 + 4, y0 + 28, y0 + 52]) { const e = document.elementFromPoint(cx + dx, y); const r = e && e.getBoundingClientRect(); hits.push([dx, Math.round(y), e && e.tagName, e && e.id, e && String(e.className).slice(0, 30), e && e.textContent.trim().slice(0, 20), r && Math.round(r.top), r && Math.round(r.bottom), e && (e.closest('button,[role=button],input,textarea,form,.cmp') || {}).className]); } bx.style.pointerEvents = ''; return { hits, bx: [b.left, b.top, b.right, b.bottom].map(Math.round), chain: ch.slice(0, 9), rec: (() => { const r = document.querySelector('#csRec'); return r && [r.getBoundingClientRect().top, r.getBoundingClientRect().bottom]; })() }; }));
  if (process.env.DBGX) step('dbgX', await P.evaluate(() => { const r = e => { if (!e) return null; const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)]; }; const bx = document.getElementById('lwBX'); const o = { bx: r(bx), lift: bx && bx.style.getPropertyValue('--bx-lift'), card: r(document.querySelector('.cs-mic-card')), lifted: (LowiBottomClose.lifted || []).map(e => e.id || e.className), target: LowiBottomClose.target && (LowiBottomClose.target.id || LowiBottomClose.target.className), tr: getComputedStyle(bx).transition }; LowiBottomClose.update(); o.after = r(bx); o.cs = (() => { const c = getComputedStyle(bx); return [c.bottom, c.transform, c.translate, c.top, c.position, c.transition.slice(0,80)]; })(); o.parent = bx.parentElement && (bx.parentElement.id || bx.parentElement.tagName); o.vv = [innerHeight, visualViewport && visualViewport.height, visualViewport && visualViewport.offsetTop]; o.lift2 = bx.style.getPropertyValue('--bx-lift'); o.lifted2 = (LowiBottomClose.lifted || []).map(e => e.id || e.className); return o; }));
  await shotPair('mic-3-hold-' + tag);
  await P.mouse.up(); await sleep(900);
  step('released', await look());
  if (process.env.DBGX4) { await settle(); } if (process.env.DBGX4) step('dbg4', await P.evaluate(() => { const r = e => { if (!e) return null; const q = e.getBoundingClientRect(); return [Math.round(q.top), Math.round(q.bottom), Math.round(q.left), Math.round(q.right)]; }; const bx = document.getElementById('lwBX'); const o = { bx: r(bx), lift: bx.style.cssText, lifted: LowiBottomClose.lifted, inp: r(document.getElementById('cmInput')), row: r(document.querySelector('#cmPaneChat .cm-inrow')), meta: r(document.querySelector('.cs-compose-meta')), rec: r(document.querySelector('#csRec')), compose: r(document.querySelector('#cmPaneChat .cm-compose')), act: document.activeElement && (document.activeElement.id || document.activeElement.tagName), kb: document.documentElement.className.slice(0, 200) }; LowiBottomClose.update(); o.after = r(bx); o.cs = (() => { const c = getComputedStyle(bx); return [c.bottom, c.transform, c.translate, c.top, c.position, c.transition.slice(0,80)]; })(); o.parent = bx.parentElement && (bx.parentElement.id || bx.parentElement.tagName); o.vv = [innerHeight, visualViewport && visualViewport.height, visualViewport && visualViewport.offsetTop]; o.lift2 = bx.style.cssText; o.lifted2 = LowiBottomClose.lifted; return o; }));
  await sleep(700); step('releasedSettled', await look());
  await shotPair('mic-4-after-' + tag);
  /* clean up a tap-mode recording (prompt state) so nothing is left open */
  await P.evaluate(() => { const x = document.querySelector('#csRec [data-chat="rec-cancel"]'); if (x) x.click(); });
  await sleep(700);
  await sleep(1500); step('end', await look());
  out.frameOverlaps = await P.evaluate(() => window.__frames);
  step('typeLog', await P.evaluate(() => window.__typeLog));
  out.errors = h.errors.slice(0, 6); out.consoleErr = h.consoleErr.filter(t => !/Failed to load resource|net::|ERR_/.test(t)).slice(0, 6);
  console.log(JSON.stringify(out, null, 1));
  await h.browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
