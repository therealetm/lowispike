'use strict';
/* Bug hunt (Affiliates + read-aloud, Oct 23 2026): the standalone Affiliates page (affiliates/index.html) on a phone.
   Taps every visible control on each screen (start, script, recording, earnings), one at a time from a fresh load of that
   screen, and records page errors, dead taps, horizontal overflow, controls a finger can't reach or that sit under something,
   text cut off, and the read-aloud: Listen / pause / continue / start over / scene buttons, the voice state and the clip requests.
   node tools/hunt-affiliates.cjs <device> [base url] [lang] [outdir] */
const { webkit, chromium, devices } = require('./sim/harness.cjs').pw, fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const device = process.argv[2] || 'iPhone 13', base = process.argv[3] || 'https://therealetm.github.io/lowispike/affiliates/';
  const lang = process.argv[4] || 'en', out = process.argv[5] || '/tmp/hunt-aff';
  fs.mkdirSync(out, { recursive: true });
  const eng = /Pixel/.test(device) ? chromium : webkit;
  const browser = await eng.launch();
  const ctx = await browser.newContext(Object.assign({}, devices[device], { serviceWorkers: 'block' }));
  const host = new URL(base).host;
  await ctx.route(u => { try { return new URL(u).host !== host && !/^(data|blob):/.test(u.protocol); } catch (e) { return true; } }, r => r.abort());
  const P = await ctx.newPage();
  const errs = [], clips = { ok: 0, bad: [] };
  P.on('pageerror', e => errs.push('pageerror: ' + (e.message || '').slice(0, 200)));
  P.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::|blocked|aborted|access control/i.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  P.on('response', r => { if (/app-voice\//.test(r.url())) { if (r.status() < 400) clips.ok++; else clips.bad.push(r.status() + ' ' + r.url().split('/').slice(-2).join('/')); } });
  const tag = 'aff-' + device.replace(/\W/g, '') + '-' + lang;
  const findings = [];
  const note = async (kind, info) => { const f = path.join(out, tag + '-' + findings.length + '.png'); await P.screenshot({ path: f }).catch(() => { }); findings.push(Object.assign({ kind, shot: f }, info)); console.log('FIND', kind, JSON.stringify(info)); };
  const load = async (hash) => { await P.goto(base + '?lang=' + lang + '&h=' + Date.now() + (hash ? '#' + hash : ''), { waitUntil: 'load', timeout: 90000 }); await sleep(900); };
  const state = () => P.evaluate(() => ({ view: document.body.getAttribute('data-view'), hash: location.hash, y: Math.round(scrollY), sh: document.documentElement.scrollHeight, text: (document.querySelector('.view:not([hidden])') || document.body).innerText.length, sig: (document.querySelector('.view:not([hidden])') || document.body).innerText.slice(0, 4000), voice: window.LowiAffVoice && window.LowiAffVoice.state ? window.LowiAffVoice.state() : null, toast: (document.getElementById('toast') || {}).hidden === false ? document.getElementById('toast').textContent : '' }));
  const list = () => P.evaluate(() => {
    const o = [], seen = new Set();
    document.querySelectorAll('.view:not([hidden]) button, .view:not([hidden]) a[href], .view:not([hidden]) input, .view:not([hidden]) summary, .view:not([hidden]) [role=button]').forEach((b, i) => {
      const r = b.getBoundingClientRect(), s = getComputedStyle(b);
      if (r.width < 2 || r.height < 2 || s.visibility === 'hidden' || +s.opacity < .05 || b.closest('[hidden]')) return;
      if (b.parentElement && b.parentElement.closest('button,[role=button]')) return;
      const key = (b.id ? '#' + b.id : b.tagName + '.' + String(b.className).split(' ')[0]) + '|' + (b.getAttribute('aria-label') || b.textContent || b.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      if (seen.has(key)) return; seen.add(key); b.setAttribute('data-hunt', 'h' + i);
      o.push({ h: 'h' + i, key, tag: b.tagName, href: b.getAttribute('href') || '', w: Math.round(r.width), hh: Math.round(r.height) });
    });
    return o;
  });
  const layout = () => P.evaluate(() => {
    const bad = [];
    const ov = document.documentElement.scrollWidth - innerWidth;
    document.querySelectorAll('.view:not([hidden]) *').forEach(e => {
      const r = e.getBoundingClientRect(); if (!r.width || e.closest('[hidden]')) return;
      if (r.right > innerWidth + 2 || r.left < -2) { const s = getComputedStyle(e); if (s.position !== 'fixed' && !e.closest('.seg,.scroller,[data-scroll]')) bad.push('offscreen x ' + (e.id || e.tagName + '.' + String(e.className).split(' ')[0]) + ' ' + Math.round(r.left) + '..' + Math.round(r.right)); }
      if ((e.tagName === 'BUTTON' || e.tagName === 'A' || e.tagName === 'P' || e.tagName === 'SPAN' || /^H\d/.test(e.tagName)) && e.scrollWidth > e.clientWidth + 2) { const s = getComputedStyle(e); if (s.overflow === 'hidden' || s.textOverflow === 'ellipsis' || s.whiteSpace === 'nowrap') bad.push('cut ' + (e.id || e.tagName + '.' + String(e.className).split(' ')[0]) + ' "' + e.textContent.trim().slice(0, 30) + '"'); }
    });
    return { ov, bad: [...new Set(bad)].slice(0, 12) };
  });
  const tapOne = async (m) => {
    const loc = P.locator('[data-hunt="' + m.h + '"]').first();
    await loc.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => { }); await sleep(300);
    const pos = await loc.evaluate(e => { const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); return { x, y, w: r.width, h: r.height, ok: !!(t && (t === e || e.contains(t) || t.contains(e))), by: t ? (t.id || String(t.className).slice(0, 40) || t.tagName) : null }; }).catch(() => null);
    if (!pos) return { err: 'gone' };
    if (!pos.ok) return { covered: pos.by, pos };
    await P.touchscreen.tap(pos.x, pos.y); await sleep(900);
    return { pos };
  };
  const SCREENS = [['start', ''], ['script', 'ugc'], ['shots', 'ugc/shots'], ['earn', 'ugc/earn'], ['script-web', 'web'], ['shots-web', 'web/shots']];
  /* find the series ids from the page */
  await load('');
  const series = await P.evaluate(() => window.LowiBlueprint ? Object.keys(window.LowiBlueprint.SERIES) : []);
  console.log('series', JSON.stringify(series));
  const screens = [['start', '']]; for (const s of series) { screens.push(['script-' + s, s], ['shots-' + s, s + '/shots']); } screens.push(['earn', (series[0] || 'ugc') + '/earn']);
  for (const [name, hash] of screens) {
    await load(hash);
    const s0 = await state(), l0 = await layout(), ctl = await list();
    console.log('SCREEN', name, 'view', s0.view, 'text', s0.text, 'controls', ctl.length, JSON.stringify(ctl.map(c => c.key.split('|')[1] || c.key)));
    await P.screenshot({ path: path.join(out, tag + '-' + name + '.png'), fullPage: true }).catch(() => { });
    if (!s0.text) await note('blank', { name });
    if (l0.ov > 2) await note('overflow', { name, px: l0.ov });
    if (l0.bad.length) console.log('layout', name, JSON.stringify(l0.bad));
    for (const c of ctl) { if (c.w < 30 || c.hh < 30) console.log('small target', name, c.key, c.w + 'x' + c.hh); }
    for (const c of ctl.slice(0, 30)) {
      if (c.tag === 'A' && /^https?:|^mailto:|^tel:|wa\.me|whatsapp/i.test(c.href)) { console.log('ext link', c.key, c.href.slice(0, 80)); continue; }
      await load(hash); const again = await list(); const m = again.find(x => x.key === c.key); if (!m) { console.log('not there after reload', c.key); continue; }
      const before = await state();
      const r = await tapOne(m);
      if (r.covered) { await note('covered', { name, ctl: c.key, by: r.covered }); continue; }
      if (r.err) { console.log('err', c.key, r.err); continue; }
      const after = await state();
      const changed = before.sig !== after.sig || before.hash !== after.hash || before.view !== after.view || JSON.stringify(before.voice) !== JSON.stringify(after.voice) || before.toast !== after.toast || Math.abs(before.y - after.y) > 40;
      const focusIn = await P.evaluate(() => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); });
      console.log('tap', name, c.key, '->', after.view, after.hash, after.voice ? after.voice.status + '/' + after.voice.group : '', changed ? 'changed' : (focusIn ? 'focus' : 'NO CHANGE'));
      if (!changed && !focusIn) await note('dead tap', { name, ctl: c.key });
      if (after.view && after.view !== before.view) { const l1 = await layout(); if (l1.ov > 2) await note('overflow after', { name, ctl: c.key, px: l1.ov }); const st = await P.evaluate(() => ({ y: scrollY, sh: document.documentElement.scrollHeight, ih: innerHeight })); if (st.y > 4) await note('not at top after screen change', { name, ctl: c.key, st }); }
    }
  }
  /* read-aloud flow on the first open script */
  for (const s of series) {
    await load(s);
    const has = await P.$('#listenAll');
    if (!has) { console.log('VOICE', s, 'no listen button'); continue; }
    const lab = () => P.evaluate(() => { const b = document.querySelector('#listenAll .vlabel'); return (b ? b.textContent : '') + ' | again ' + (document.getElementById('listenAgain') || {}).hidden + ' | where ' + ((document.getElementById('listenWhere') || {}).textContent || '') + ' | saying ' + document.querySelectorAll('.saying').length; });
    const vs = () => P.evaluate(() => JSON.stringify(window.LowiAffVoice.state()));
    console.log('VOICE', s, 'idle', await lab());
    await P.tap('#listenAll'); await sleep(2500); console.log('VOICE', s, 'after Listen', await lab(), await vs());
    await P.tap('#listenAll'); await sleep(800); console.log('VOICE', s, 'after Pause', await lab(), await vs());
    await P.tap('#listenAll'); await sleep(1500); console.log('VOICE', s, 'after Continue', await lab(), await vs());
    const again = await P.$('#listenAgain:not([hidden])'); if (again) { await again.tap(); await sleep(1500); console.log('VOICE', s, 'after Start over', await lab(), await vs()); } else await note('no start over', { s });
    const sb = await P.$$('.say-btn'); console.log('VOICE', s, 'scene buttons', sb.length);
    if (sb[0]) { await sb[0].scrollIntoViewIfNeeded().catch(() => { }); await sb[0].tap(); await sleep(1500); console.log('VOICE', s, 'after scene 1', await lab(), await vs()); }
    /* screen change must stop the voice */
    const nextBtn = await P.$('#scriptView button.primary'); if (nextBtn) { await nextBtn.scrollIntoViewIfNeeded().catch(() => { }); await nextBtn.tap(); await sleep(800); console.log('VOICE', s, 'after next screen', await vs()); }
    /* reload mid-play */
    await load(s); await P.tap('#listenAll'); await sleep(1500); await P.reload({ waitUntil: 'load' }); await sleep(1200); console.log('VOICE', s, 'after reload', await lab(), await vs());
    /* hidden tab mid-play and back */
    await P.tap('#listenAll'); await sleep(1500);
    await P.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(500);
    const hid = await vs();
    await P.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(800);
    console.log('VOICE', s, 'hidden', hid, 'back', await vs());
  }
  console.log('CLIPS ok', clips.ok, 'bad', JSON.stringify(clips.bad.slice(0, 10)));
  console.log('ERRORS', errs.length, JSON.stringify([...new Set(errs)].slice(0, 15)));
  console.log('FINDINGS', findings.length, JSON.stringify(findings));
  await browser.close();
})().catch(e => { console.error('TOOL ERROR', e && e.stack || e); process.exit(2); });
