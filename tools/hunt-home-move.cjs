'use strict';
/* Bug hunt (Home world, Move, Mirror mode; Oct 23 2026). On the live site like a user:
   home   : taps each Home bubble, sees what opens, closes it with back (Safari swipe / Android back), checks you stay in the app
            and Home is left clean (no open sheet, no html class left behind);
   mirror : Move bubble -> Mirror (two taps from Home), every routine -> place screen -> follow without camera -> pause / resume / voice
            -> X; then again and back in the middle; then Turn on camera with no camera (graceful sheet);
   move   : the Move page (long press on the Move bubble), every control on it; back after each closes only what opened and keeps Move.
   node tools/hunt-home-move.cjs <home|mirror|move> <device> [url] [theme] [lang] [outdir] */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const A = process.argv.slice(2), what = A[0] || 'home', device = A[1] || 'iPhone 13', url = A[2] || 'https://therealetm.github.io/lowispike/index.html';
  const theme = A[3] || 'dark', lang = A[4] || 'en', out = A[5] || '/tmp/hunt-hm';
  fs.mkdirSync(out, { recursive: true });
  const tag = what + '-' + device.replace(/\W/g, '') + '-' + theme + '-' + lang;
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url, probe: false, lang, members: 5, messages: 5 });
  await R.ctx.addInitScript(([t, l]) => { try { if (!sessionStorage.getItem('hunt.init')) { sessionStorage.setItem('hunt.init', '1'); localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } } catch (e) { } }, [theme, lang]);
  const P = R.page, F = [];
  const find = async (kind, info) => { const f = path.join(out, tag + '-' + F.length + '.png'); await R.shot(f); F.push({ kind, info, f }); console.log('FIND', kind, JSON.stringify(info)); };
  const mark = () => R.errs.length, since = n => R.errs.slice(n).map(e => e.step + ': ' + e.m);
  const st = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 40 && r.height > 40 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .1; };
    const tab = (document.querySelector('#main > .tab.active') || document.querySelector('.tab.active') || {}).id || '';
    const ovs = [...document.querySelectorAll('#sheetwrap.open,#sheetwrap.show,.r2-ov.on,.ns-ov,[role=dialog],[aria-modal=true],#mv-player.on,.mm-ov:not([hidden]),.cme-ov.on,.wm-sheet,.bloom-orb,[data-wm]')].filter(vis).map(e => e.id || String(e.className).split(' ').slice(0, 2).join('.') || e.tagName);
    return { url: location.href.split('?')[0], tab, html: document.documentElement.className.split(/\s+/).filter(c => /open|mm-|mv-|sheet|lock|sec|modal|bloom|wm/.test(c)).join(' '), ovs: [...new Set(ovs)].slice(0, 8), hist: history.length, hstate: JSON.stringify(history.state) };
  });
  const center = sel => P.evaluate(s => { const e = [...document.querySelectorAll(s)].find(x => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(x).visibility !== 'hidden'; }); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, Math.max(1, Math.min(innerHeight - 1, y))); return { x, y, ok: !!(t && (t === e || e.contains(t) || t.contains(e) && false)), by: t ? (t.id || String(t.className).slice(0, 40) || t.tagName) : 'none', txt: (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40) }; }, sel);
  const tap = async (sel, wait) => { const c = await center(sel); if (!c) return { gone: true }; if (!c.ok) return { covered: c.by, txt: c.txt }; await P.touchscreen.tap(c.x, c.y); await H.sleep(wait || 1400); return { ok: true, txt: c.txt }; };
  const back = async () => { const u0 = P.url(); await P.goBack({ timeout: 4000 }).catch(() => { }); await H.sleep(1500); return { left: P.url() !== u0, url: P.url().slice(0, 60), u0: u0.slice(0, 40) }; };
  const reload = async () => { await R.goto(); await H.sleep(6500); await P.touchscreen.tap(5, 830).catch(() => { }); await H.sleep(400); };
  const longPress = async (sel) => { const c = await center(sel); if (!c) return { gone: true }; await P.evaluate(([x, y]) => { const t = document.elementFromPoint(x, y); const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true }; t.dispatchEvent(new PointerEvent('pointerdown', o)); window.__lpT = t; window.__lpO = o; }, [c.x, c.y]); await H.sleep(900); await P.evaluate(() => { window.__lpT.dispatchEvent(new PointerEvent('pointerup', window.__lpO)); }); await H.sleep(1500); return { ok: true }; };

  await R.goto(); await H.sleep(6500);
  await P.touchscreen.tap(5, 830).catch(() => { }); await H.sleep(500);   /* a first touch, so back-swipe's guard is in */
  const home0 = await st(); console.log('START', JSON.stringify(home0));

  if (what === 'home') {
    R.step = 'home';
    const bubbles = ['[data-orbit=water]', '[data-orbit=move]', '[data-orbit=gap]', '[data-orbit=fuel]', '[data-orbit=sleep]', '[data-orbit=scan]', '[data-orbit=settings]', '#spBubble'];
    for (const b of bubbles) {
      R.step = 'home ' + b; const m = mark();
      const s0 = await st(); const t = await tap(b, 1800); const s1 = await st();
      console.log('TAP', b, JSON.stringify({ t, s1 }));
      if (!t.ok) { await find('home bubble not tappable', { b, t }); continue; }
      await R.shot(path.join(out, tag + '-' + b.replace(/\W/g, '') + '.png'));
      const k = await back(); const s2 = await st();
      console.log('BACK', b, JSON.stringify({ k, s2 }));
      if (k.left) { await find('back after a Home bubble left the app', { b, s1, k }); await reload(); continue; }
      if (s2.tab !== 'tab-home') await find('back did not return to Home', { b, s1, s2 });
      if (s2.ovs.length && s1.ovs.join() !== s0.ovs.join() && s2.ovs.join() === s1.ovs.join()) await find('back did not close what the bubble opened', { b, s1, s2 });
      if (since(m).length) await find('errors on Home bubble', { b, e: since(m) });
      await P.keyboard.press('Escape').catch(() => { }); await H.sleep(700);
      if (b === '[data-orbit=settings]' || b === '#spBubble') await reload();
    }
  }

  if (what === 'mirror') {
    R.step = 'mirror two taps'; let m = mark();
    let t = await tap('[data-orbit=move]', 1600); let s = await st(); console.log('MOVE BUBBLE', JSON.stringify({ t, s }));
    const mb = await center('[data-wm=mirror], #hb2Bloom [data-id=mirror]'); console.log('MIRROR ORB', JSON.stringify(mb));
    if (!mb) await find('no Mirror bubble in the Move bloom', { s });
    else {
      t = await tap('[data-wm=mirror], #hb2Bloom [data-id=mirror]', 1800); s = await st(); console.log('MIRROR OPEN', JSON.stringify({ t, s }));
      if (!t.ok || !/mm-open/.test(s.html)) await find('Mirror did not open from the Move bloom', { t, s });
    }
    const routines = await P.evaluate(() => [...document.querySelectorAll('[data-mm=pick]')].map(b => b.getAttribute('data-r')));
    console.log('ROUTINES', JSON.stringify(routines));
    for (const r of routines) {
      R.step = 'mirror ' + r; m = mark();
      if (!(await P.locator('[data-mm=pick][data-r="' + r + '"]').count())) { await P.evaluate(() => LowiMirror && LowiMirror.open && LowiMirror.open()); await H.sleep(1200); }
      t = await tap('[data-mm=pick][data-r="' + r + '"]'); if (!t.ok) { await find('routine not tappable', { r, t }); continue; }
      const place = await P.evaluate(() => { const s = document.querySelector('.mm-ov:not([hidden]) .mm-sheet, .mm-sheet'); return s ? s.innerText.replace(/\s+/g, ' ').slice(0, 200) : null; });
      t = await tap('[data-mm=nocam]', 2500); if (!t.ok) { await find('Follow without camera not tappable', { r, t, place }); continue; }
      const run0 = await P.evaluate(() => ({ title: (document.querySelector('.mm-title') || {}).innerText, stage: !!document.querySelector('.mm-stage:not([hidden])'), pause: (document.querySelector('[data-mm=pause]') || {}).innerText }));
      await H.sleep(3000);
      const run1 = await P.evaluate(() => ({ title: (document.querySelector('.mm-title') || {}).innerText, pause: (document.querySelector('[data-mm=pause]') || {}).innerText, cue: (document.querySelector('.mm-cue,.mm-say,.mm-step') || {}).innerText }));
      t = await tap('[data-mm=pause]', 1200); const p1 = await P.evaluate(() => (document.querySelector('[data-mm=pause]') || {}).innerText);
      await H.sleep(1500); const tt1 = await P.evaluate(() => (document.querySelector('.mm-title') || {}).innerText);
      await H.sleep(1500); const tt2 = await P.evaluate(() => (document.querySelector('.mm-title') || {}).innerText);
      const t2 = await tap('[data-mm=pause]', 1200); const p2 = await P.evaluate(() => (document.querySelector('[data-mm=pause]') || {}).innerText);
      const tv = await tap('[data-mm=voice]', 600); const v = await P.evaluate(() => (document.querySelector('[data-mm=voice]') || {}).getAttribute && document.querySelector('[data-mm=voice]').getAttribute('aria-pressed'));
      console.log('RUN', r, JSON.stringify({ place: place && place.slice(0, 100), run0, run1, pauseTap: t, p1, frozen: tt1 === tt2, tt1, tt2, resumeTap: t2, p2, voice: v }));
      await R.shot(path.join(out, tag + '-run-' + r + '.png'));
      if (!run0.stage) await find('no stage after Follow without camera', { r, run0 });
      if (t.ok && p1 && /Pause|Pausa/.test(p1) && !/Resume|Weiter|Seguir/.test(p1)) await find('Pause did not pause', { r, p1 });
      if (t.ok && tt1 !== tt2) await find('timer kept running while paused', { r, tt1, tt2 });
      const x = await tap('.mm-ov [data-mm=close]', 1000); const s2 = await st();
      if (!x.ok) await find('Mirror X not tappable', { r, x });
      if (/mm-open|mm-cam/.test(s2.html) || s2.ovs.some(o => /mm-/.test(o))) await find('Mirror left behind after X', { r, s2 });
      if (since(m).length) await find('errors in Mirror run', { r, e: since(m) });
      await P.evaluate(() => LowiMirror.open()); await H.sleep(1000);
    }
    /* back in the middle of a run */
    R.step = 'mirror back mid-run'; m = mark();
    await P.evaluate(() => { try { LowiMirror.close(); } catch (e) { } }); await H.sleep(600);
    await tap('[data-orbit=move]', 1500); await tap('[data-wm=mirror], #hb2Bloom [data-id=mirror]', 1500);
    if (await center('[data-mm=pick]')) { await tap('[data-mm=pick]'); await tap('[data-mm=nocam]', 2500); }
    const sb = await st(); const k = await back(); const sa = await st();
    console.log('MIRROR BACK', JSON.stringify({ sb, k, sa }));
    if (k.left) { await find('back during Mirror left the app', { sb, k }); await reload(); }
    else if (/mm-open/.test(sa.html)) await find('back during Mirror did not close it', { sa });
    if (since(m).length) await find('errors on back in Mirror', since(m));
    /* a second back on bare Home must still leave (unchanged) - only checked, not a bug if it stays */
    /* camera with no camera */
    R.step = 'mirror camera'; m = mark();
    await P.evaluate(() => { try { LowiMirror.close(); } catch (e) { } LowiMirror.open(); }); await H.sleep(1200);
    await tap('[data-mm=pick]'); const tc = await tap('[data-mm=cam]', 6000);
    const cs = await P.evaluate(() => { const s = document.querySelector('.mm-sheet'); return { txt: s ? s.innerText.replace(/\s+/g, ' ').slice(0, 200) : null, problem: (document.querySelector('[data-problem]') || {}).getAttribute ? document.querySelector('[data-problem]').getAttribute('data-problem') : null, html: document.documentElement.className.match(/mm-\S+/g) }; });
    console.log('CAMERA', JSON.stringify({ tc, cs }));
    await R.shot(path.join(out, tag + '-camera.png'));
    if (!cs.problem) await find('no camera: no graceful message', { cs });
    else { const tn = await tap('[data-problem] ~ .mm-acts [data-mm=nocam], .mm-acts [data-mm=nocam]', 2500); const ok = await P.evaluate(() => !!document.querySelector('.mm-stage:not([hidden])')); if (!ok) await find('Follow without camera after camera error did not start', { tn }); }
    await tap('.mm-ov [data-mm=close]'); if (since(m).length) await find('errors around camera', since(m));
  }

  if (what === 'move') {
    R.step = 'move open'; let m = mark();
    const lp = await longPress('[data-orbit=move]'); let s = await st(); console.log('LONG PRESS', JSON.stringify({ lp, s }));
    if (s.tab !== 'tab-move') { await find('long press on Move did not open the Move page', { s }); await P.evaluate(() => goTab('move')); await H.sleep(2500); }
    const ctl = await P.evaluate(() => [...document.querySelectorAll('#tab-move button, #tab-move [data-mv], #tab-move [data-mm], #tab-move [data-nm], #tab-move [data-fx], #tab-move [data-f3], #tab-move .wm-guess-row')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }).map((e, i) => { e.setAttribute('data-hunt', i); return { i, txt: (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40), a: [...e.attributes].filter(a => /^data-(mv|mm|nm|fx|f3|k|n)$/.test(a.name)).map(a => a.name + '=' + a.value).join(' ') }; }));
    console.log('CONTROLS', JSON.stringify(ctl));
    const seen = new Set();
    for (const c of ctl) {
      const key = c.a + '|' + c.txt; if (seen.has(key) || /data-mv=mins/.test(c.a) && seen.has('mins')) continue; seen.add(key); if (/data-mv=mins/.test(c.a)) seen.add('mins');
      R.step = 'move ' + key; m = mark();
      const s0 = await st(); if (s0.tab !== 'tab-move') { await P.evaluate(() => goTab('move')); await H.sleep(2000); }
      const t = await tap('[data-hunt="' + c.i + '"]', 2000); const s1 = await st();
      console.log('CTRL', key, JSON.stringify({ t, s1 }));
      await R.shot(path.join(out, tag + '-ctl-' + c.i + '.png'));
      if (t.gone) continue;
      if (!t.ok) { await find('Move control covered', { key, t }); continue; }
      const opened = s1.ovs.join() !== s0.ovs.join() || s1.html !== s0.html;
      if (opened) {
        const k = await back(); const s2 = await st(); console.log('  BACK', JSON.stringify({ k, s2 }));
        if (k.left) { await find('back left the app from Move', { key, s1 }); await reload(); await P.evaluate(() => goTab('move')); await H.sleep(2500); continue; }
        if (s2.ovs.join() === s1.ovs.join() && s2.html === s1.html) await find('back did not close what opened on Move', { key, s1, s2 });
        else if (s2.tab !== 'tab-move') await find('back closed the sheet AND left Move', { key, s1, s2 });
      } else if (s1.tab !== s0.tab) console.log('  NAV', s0.tab, '->', s1.tab);
      if (since(m).length) await find('errors on Move control', { key, e: since(m) });
      await P.keyboard.press('Escape').catch(() => { }); await H.sleep(600);
      const s3 = await st(); if (s3.ovs.length && s3.ovs.join() !== s0.ovs.join()) { console.log('  still open', s3.ovs); await reload(); await P.evaluate(() => goTab('move')); await H.sleep(2500); }
    }
    R.step = 'move X'; m = mark();
    const x = await tap('#secX', 1500); s = await st(); if (!x.ok || s.tab !== 'tab-home') await find('Move X did not return Home', { x, s });
  }
  console.log('DONE', tag, 'findings', F.length, 'errors', R.errs.length, JSON.stringify(R.errs.slice(0, 6)), 'crashed', R.crashed);
  await R.close();
})().catch(e => { console.log('TOOL ERROR', e && e.stack); process.exit(1); });
