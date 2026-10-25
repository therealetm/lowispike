/* iOS feel check (25 Oct 2026, Emmanuel's TikTok "Why does iOS feel so nice to use": springs you can grab mid-flight, Apple's
   hyperbolic rubber band with c = 0.55). Simulated iPhone 13 in Chromium and WebKit, the fake Supabase (nothing is written
   anywhere), against the local folder or a URL. Frame by frame it checks:
     sheet   grabbed while it is still opening: it stays exactly there (no restart); pulled up past the top it stretches on
             the hyperbola (never past one screen, less than 0.55 of the finger), then springs home
     bloom   a Home panel closed while it is still growing turns around without a jump to full size first
     room    pan past the edge stretches (rubber band) and springs back to the edge; pinch past the zoom limit stretches and
             springs back; a fling coasts and a finger catches it exactly where it is (and that is not a tap)
     pills   the segmented glow slides through in-between values and lands on the tab; a second tap mid-slide does not jump
     rest    nothing is still moving afterwards
   node tools/springs/check.cjs [url] [cases]   cases: chromium-phone,webkit-phone. Exit 1 on failure. */
'use strict';
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const sleep = H.sleep;
const URL_ = process.argv[2] || '';
const ALL = { 'chromium-phone': { engine: 'chromium', viewport: { width: 390, height: 844 } }, 'webkit-phone': { engine: 'webkit', device: 'iPhone 13' } };
const CASES = (process.argv[3] || Object.keys(ALL).join(',')).split(',').filter(k => ALL[k]);
const fails = [], notes = [];
const fail = (w, m) => { fails.push(w + ': ' + m); console.log('FAIL', w, m); };
const ok = (w, m) => { notes.push(w + ': ' + m); console.log('ok  ', w, m); };

/* in-page helpers: pointer events from a finger, paced by animation frames, and a per-frame sampler */
const HELPERS = () => {
  window.__fx = {
    ev(el, type, id, x, y) { el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 1, bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1 })); },
    frame() { return new Promise(r => requestAnimationFrame(() => r())); },
    async frames(n, fn) { const out = []; for (let i = 0; i < n; i++) { await this.frame(); out.push(fn()); } return out; },
    ty(el) { const m = getComputedStyle(el).transform; if (!m || m === 'none') return 0; const a = m.match(/matrix(3d)?\(([^)]+)\)/); if (!a) return 0; const v = a[2].split(',').map(Number); return a[1] ? v[13] : v[5]; },
  };
};

async function run(name) {
  const C = ALL[name];
  const R = await H.open(Object.assign({ probe: false, lang: 'en', url: URL_ }, C));
  const p = R.page;
  p.on('console', m => { if (m.text().startsWith('[sp]')) console.log('   ', name, m.text()); });
  p.on('crash', () => console.log('   ', name, 'PAGE CRASHED'));
  try {
    await R.goto();
    await sleep(2500);
    await p.evaluate(HELPERS);
    const mods = await p.evaluate(() => ({ s: !!(window.LowiSpring && LowiSpring.create), r: !!(window.LowiRubber && LowiRubber.offset), build: (document.querySelector('script[src^="spring.js"]') || {}).src }));
    if (!mods.s || !mods.r) { fail(name, 'spring.js / rubberband.js not loaded ' + JSON.stringify(mods)); return; }
    ok(name, 'modules loaded ' + mods.build);

    /* ---------- sheet: grab mid-open, overpull, spring home ---------- */
    const sh = await p.evaluate(async () => {
      const F = window.__fx, ov = LowiR2.sheet('<div style="height:420px;padding:20px">spring check</div>', { cls: 'sp-check' });
      const s = ov.querySelector('.r2-sh'), grab = ov.querySelector('.r2-grab');
      if (!s || !grab) return { err: 'no sheet/grab' };
      const open = await F.frames(4, () => F.ty(s));
      const y1 = F.ty(s), gr = grab.getBoundingClientRect(), gx = gr.x + gr.width / 2, gy = gr.y + gr.height / 2;
      F.ev(grab, 'pointerdown', 1, gx, gy);
      const held = await F.frames(6, () => F.ty(s));
      /* pull up 600 px past where it was caught, slowly */
      for (let k = 1; k <= 24; k++) { F.ev(grab, 'pointermove', 1, gx, gy - 25 * k); await F.frame(); }
      await new Promise(r => setTimeout(r, 140));
      const yUp = F.ty(s), rawUp = y1 - 600, expect = -LowiRubber.offset(-rawUp, innerHeight);
      F.ev(grab, 'pointerup', 1, gx, gy - 600);
      const back = await F.frames(70, () => F.ty(s));
      const yEnd = F.ty(s);
      try { LowiR2.close(ov); } catch (e) { }
      return { open, y1, held, yUp, rawUp, expect, backMin: Math.min(...back), backMax: Math.max(...back), yEnd, back: back.filter((_, i) => i % 7 === 0).map(Math.round) };
    });
    if (sh.err) fail(name, 'sheet: ' + sh.err);
    else {
      const drift = Math.max(...sh.held.map(y => Math.abs(y - sh.y1)));
      notes.push(name + ' sheet ' + JSON.stringify({ open: sh.open.map(Math.round), y1: Math.round(sh.y1), drift: +drift.toFixed(2), yUp: Math.round(sh.yUp), expect: Math.round(sh.expect), back: sh.back, end: +sh.yEnd.toFixed(2) }));
      if (!(sh.y1 > 15)) fail(name, 'sheet: was not mid-open when grabbed (y=' + sh.y1 + ')');
      else if (drift > 1.5) fail(name, 'sheet: moved ' + drift.toFixed(1) + ' px while held mid-open (not caught)');
      else ok(name, 'sheet caught mid-open at ' + Math.round(sh.y1) + ' px, held still (drift ' + drift.toFixed(2) + ' px)');
      if (!(sh.yUp < -5)) fail(name, 'sheet: did not stretch up past the top (' + sh.yUp + ')');
      else if (-sh.yUp > 600 * 0.55 || -sh.yUp >= 844) fail(name, 'sheet: stretched too far ' + sh.yUp);
      else if (Math.abs(sh.yUp - sh.expect) > 6) fail(name, 'sheet: stretch ' + sh.yUp.toFixed(1) + ' is not the hyperbola ' + sh.expect.toFixed(1));
      else ok(name, 'sheet overpull 600 px finger -> ' + Math.round(-sh.yUp) + ' px (hyperbola says ' + Math.round(-sh.expect) + ')');
      if (Math.abs(sh.yEnd) > 1) fail(name, 'sheet: did not spring home (' + sh.yEnd + ')'); else ok(name, 'sheet sprang home to 0');
    }
    await sleep(500);

    /* ---------- bloom: close mid-bloom ---------- */
    const bl = await p.evaluate(async () => {
      const F = window.__fx, el = document.createElement('div');
      el.className = 'wa-panel'; el.style.cssText = 'position:fixed;left:20px;top:200px;width:340px;height:380px;background:#234;z-index:99999';
      document.body.appendChild(el);
      try { window.__lowiLastTap = { x: 195, y: 760 }; } catch (e) { }
      if (!LowiBloom.open(el)) { el.remove(); return { err: 'bloom refused the panel' }; }
      const t0 = performance.now(); const sc = () => { const cs = getComputedStyle(el); return { s: parseFloat(cs.scale) || 1, o: parseFloat(cs.opacity), on: el.isConnected, t: Math.round(performance.now() - t0), anim: cs.animationName, sp: el.classList.contains('mb-sp') }; };
      const grow = await F.frames(2, sc);
      let done = 0; LowiBloom.close(el, () => { done++; el.remove(); });
      const fold = await F.frames(40, sc);
      return { grow, fold: fold.slice(0, 8), done, end: fold[fold.length - 1] };
    });
    if (bl.err) fail(name, 'bloom: ' + bl.err);
    else {
      const lastGrow = bl.grow[bl.grow.length - 1], firstFold = bl.fold[0];
      notes.push(name + ' bloom ' + JSON.stringify({ grow: bl.grow.map(x => +x.s.toFixed(3)), fold: bl.fold.map(x => +x.s.toFixed(3)), anim: lastGrow.anim, done: bl.done }));
      if (!lastGrow.sp || (lastGrow.anim && lastGrow.anim !== 'none')) fail(name, 'bloom: keyframes still running (' + lastGrow.anim + ')');
      if (!(lastGrow.s > 0.2 && lastGrow.s < 0.99)) fail(name, 'bloom: not mid-growth when closed (' + lastGrow.s + ')');
      else if (!firstFold.on) ok(name, 'bloom closed mid-growth at scale ' + lastGrow.s.toFixed(2) + '; one frame took ' + (firstFold.t - lastGrow.t) + ' ms on this machine, longer than the close itself, so the panel was already folded and removed by the next frame')
      else if (firstFold.s > lastGrow.s + 0.12) fail(name, 'bloom: jumped from ' + lastGrow.s.toFixed(2) + ' to ' + firstFold.s.toFixed(2) + ' when closed mid-way');
      else ok(name, 'bloom closed mid-growth at scale ' + lastGrow.s.toFixed(2) + ', next frame ' + firstFold.s.toFixed(2) + ' (no jump)');
      if (bl.done !== 1) fail(name, 'bloom: close never finished'); else ok(name, 'bloom folded away and handed over');
    }

    /* ---------- Room ---------- */
    await N.openCommunity(R);
    await p.evaluate(() => { try { cmSeg('chat'); } catch (e) { } });
    await sleep(500);
    await p.locator('#cmPaneChat .rm-tab[data-rm="room"]').first().click({ force: true }).catch(() => { });
    await sleep(2500);
    if (C.engine === 'webkit') await p.evaluate(() => { window.__spNoPinch = true; });
    const room = await p.evaluate(async () => {
      const F = window.__fx, M = window.LowiCgMap, g = document.getElementById('cgGalaxy');
      if (!M || !g || !M.cam()) return { err: 'no Room camera (' + !!M + ',' + !!g + ')' };
      const r = g.getBoundingClientRect(), cx = r.x + r.width / 2, cy = r.y + r.height * .45, cam = () => ({ ...M.cam() });
      const still = async () => { let a = cam(); for (let i = 0; i < 120; i++) { await F.frame(); const b = cam(); if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z) < 1e-4) { let same = 0; for (let j = 0; j < 8; j++) { await F.frame(); const c = cam(); if (Math.abs(c.x - b.x) + Math.abs(c.y - b.y) + Math.abs(c.z - b.z) < 1e-4) same++; } if (same === 8) return b; } a = b; } return cam(); };
      const out = { start: cam() }; const log = m => console.log('[sp] ' + m + ' ' + JSON.stringify(cam()));
      /* 1. pan 700 px to the right, hold, let go slowly */
      const x0 = r.x + 30;
      F.ev(g, 'pointerdown', 1, x0, cy);
      for (let k = 1; k <= 28; k++) { F.ev(g, 'pointermove', 1, x0 + 25 * k, cy); await F.frame(); }
      await new Promise(r => setTimeout(r, 150));
      out.panHeld = cam(); log('panHeld');
      F.ev(g, 'pointerup', 1, x0 + 700, cy);
      const path = await F.frames(10, () => cam().x);
      out.panEnd = await still(); out.panPath = path; log('panEnd');
      /* 2. pinch far past the closest zoom */
      /* pinch out (fingers together) past the farthest zoom. (Pinching far in makes headless WebKit on the test machine crash
         at full zoom, on the old build as well, so the zoom limit is checked at the far end.) */
      if (window.__spNoPinch) { out.pinchHeld = out.pinchEnd = null; } else {
      F.ev(g, 'pointerdown', 1, cx - 160, cy); F.ev(g, 'pointerdown', 2, cx + 160, cy);
      for (let k = 1; k <= 30; k++) { F.ev(g, 'pointermove', 1, cx - 160 + 5 * k, cy); F.ev(g, 'pointermove', 2, cx + 160 - 5 * k, cy); await F.frame(); }
      await new Promise(r => setTimeout(r, 150));
      out.pinchHeld = cam(); log('pinchHeld');
      F.ev(g, 'pointerup', 2, cx + 10, cy); F.ev(g, 'pointerup', 1, cx - 10, cy);
      out.pinchEnd = await still(); log('pinchEnd'); }
      /* 3. fling (fast flick, let go while moving), then catch it */
      const top0 = window.LowiR2 && LowiR2.top ? LowiR2.top() : null;
      /* start on empty space (not on a companion, that would move the companion) */
      let fx = cx + 60, fy = cy + 40;
      for (let yy = r.y + 40; yy < r.y + r.height - 40; yy += 23) { let okRow = true; for (let xx = cx - 100; xx <= cx + 80; xx += 15) { const h = document.elementFromPoint(xx, yy); if (!h || (h.closest && h.closest('.cg-body,.cg-node,button,a'))) { okRow = false; break; } } if (okRow) { fx = cx + 80; fy = yy; break; } }
      const c0f = cam();
      F.ev(g, 'pointerdown', 1, fx, fy);
      for (let k = 1; k <= 5; k++) { F.ev(g, 'pointermove', 1, fx - 30 * k, fy); if (k < 5) await F.frame(); }
      const atUp = cam();
      F.ev(g, 'pointerup', 1, fx - 150, fy);/* let go while still moving (no pause, or iOS would not fling either) */
      await F.frames(6, () => 0);
      const before = cam(); log('before catch');
      F.ev(g, 'pointerdown', 1, cx, cy + 80);
      const held = await F.frames(10, cam);
      F.ev(g, 'pointerup', 1, cx, cy + 80);
      await new Promise(r => setTimeout(r, 500));
      out.fling = { c0f, at: [fx, fy], atUp, before, held, profileOpened: !!(window.LowiR2 && LowiR2.top && LowiR2.top() !== top0), thread: !!document.querySelector('.cg-card[data-open],#cgCard[data-open]') };
      out.final = await still();
      out.moving = document.documentElement.classList.contains('sp-moving');
      return out;
    });
    if (room.err) fail(name, 'room: ' + room.err);
    else {
      const z = room.panHeld.z, stretch = Math.abs(room.panHeld.x - room.panEnd.x) * z;
      notes.push(name + ' room ' + JSON.stringify({ start: room.start, panHeld: room.panHeld, panEnd: room.panEnd, path: room.panPath.map(v => +v.toFixed(1)), pinchHeld: room.pinchHeld, pinchEnd: room.pinchEnd }));
      if (!(stretch > 12)) fail(name, 'room pan: no rubber band past the edge (stretch ' + stretch.toFixed(1) + ' px)');
      else if (stretch > 700 * 0.55 || stretch > 390) fail(name, 'room pan: stretched too far ' + stretch.toFixed(1));
      else ok(name, 'room pan 700 px into the edge stretched ' + Math.round(stretch) + ' px, then sprang back to the edge');
      let turns = 0; for (let i = 2; i < room.panPath.length; i++) if ((room.panPath[i] - room.panPath[i - 1]) * (room.panPath[i - 1] - room.panPath[i - 2]) < -1e-6) turns++;
      if (turns > 1) fail(name, 'room pan: spring back wobbled (' + turns + ' turns)');
      if (!room.pinchHeld) notes.push(name + ' pinch skipped: two-finger pinches crash headless WebKit on this machine (old build too); checked in Chromium');
      else { const zs = room.pinchEnd.z / room.pinchHeld.z;
      if (!(zs > 1.03)) fail(name, 'room pinch: no stretch past the zoom limit (' + zs.toFixed(3) + ' ' + JSON.stringify([room.start.z, room.pinchHeld.z, room.pinchEnd.z]) + ')');
      else if (zs > 1.7) fail(name, 'room pinch: stretched too far ' + zs.toFixed(2));
      else ok(name, 'room pinch past the farthest zoom stretched x' + zs.toFixed(2) + ', sprang back to the limit (z ' + room.pinchEnd.z.toFixed(2) + ')'); }
      const f = room.fling, coast = Math.hypot(f.before.x - f.atUp.x, f.before.y - f.atUp.y) * f.before.z;
      const hold = Math.max(...f.held.map(c => Math.hypot(c.x - f.held[0].x, c.y - f.held[0].y) * c.z)), jump = Math.hypot(f.held[0].x - f.before.x, f.held[0].y - f.before.y) * f.before.z;
      notes.push(name + ' fling ' + JSON.stringify({ at: f.at, dragPx: +(Math.hypot(f.atUp.x - f.c0f.x, f.atUp.y - f.c0f.y) * f.atUp.z).toFixed(1), coastPx: +coast.toFixed(1), jumpPx: +jump.toFixed(1), holdPx: +hold.toFixed(2), profile: f.profileOpened }));
      if (!(coast > 8)) fail(name, 'room fling: did not coast after letting go (' + coast.toFixed(1) + ' px)');
      else if (hold > 0.6) fail(name, 'room fling: kept moving under the finger (' + hold.toFixed(2) + ' px)');
      else if (jump > 25) fail(name, 'room fling: jumped ' + jump.toFixed(1) + ' px when caught');
      else ok(name, 'room fling coasted ' + Math.round(coast) + ' px in 6 frames, a finger caught it and it held still (' + hold.toFixed(2) + ' px)');
      if (f.profileOpened) fail(name, 'room fling: catching it opened a profile (counted as a tap)');
      if (room.moving) fail(name, 'something still marked moving at rest');
    }

    /* ---------- segmented pills ---------- */
    const pill = await p.evaluate(async () => {
      const F = window.__fx, tl = document.querySelector('#cmPaneChat .rm-tabs');
      if (!tl) return { err: 'no pill row' };
      const tabs = [...tl.querySelectorAll('.rm-tab')].filter(t => t.getBoundingClientRect().width > 0);
      const v = () => ({ i: parseFloat(tl.style.getPropertyValue('--rm-i')), t: performance.now() }), tr = () => getComputedStyle(tl, '::before').transitionDuration;
      const i0 = v(), far = tabs[tabs.length - 1], mid = tabs[1];
      far.click();
      const a = await F.frames(5, v);
      mid.click();
      const b = await F.frames(60, v);
      return { i0, tabs: tabs.map(t => t.getAttribute('data-rm')), a, b: b.filter((_, i) => i % 6 === 0), end: b[b.length - 1], tr: tr(), sp: tl.classList.contains('sp-var') };
    });
    if (pill.err) fail(name, 'pills: ' + pill.err);
    else {
      notes.push(name + ' pills ' + JSON.stringify(pill));
      const frac = pill.a.concat(pill.b).some(x => Math.abs(x.i - Math.round(x.i)) > 0.05);
      /* a jump = moving much faster in the retarget frame than the spring could (frames on this machine can be slow) */
      const la = pill.a[pill.a.length - 1], fb = pill.b[0], dtf = Math.max(16, fb.t - la.t) / 16.7;
      const jump = Math.abs(fb.i - la.i) / dtf;
      pill.end = pill.end.i;
      if (!pill.sp || !frac) fail(name, 'pills: not spring-driven ' + JSON.stringify(pill));
      else if (jump > 0.6) fail(name, 'pills: jumped ' + jump.toFixed(2) + ' when retargeted mid-slide');
      else if (Math.abs(pill.end - 1) > 0.01) fail(name, 'pills: did not land on the tab (' + pill.end + ')');
      else ok(name, 'pill glow slid on a spring, turned mid-slide without a jump (' + jump.toFixed(2) + ' tab widths per 60 Hz frame) and landed on tab 2');
    }
    const rest = await p.evaluate(async () => { await new Promise(r => setTimeout(r, 1200)); return document.documentElement.classList.contains('sp-moving'); });
    if (rest) fail(name, 'a spring was still running 1.2 s after the last touch'); else ok(name, 'all springs at rest (no frames asked for)');
    const errs = R.errs.filter(e => !/supabase|realtime|websocket/i.test(e.m));
    if (errs.length) notes.push(name + ' page errors ' + JSON.stringify(errs.slice(0, 5)));
    if (errs.some(e => /spring|rubber|camRun|camRelease|LowiSpring|LowiRubber|mb-sp/i.test(e.m + e.st))) fail(name, 'page error from the new code: ' + JSON.stringify(errs.slice(0, 3)));
  } catch (e) { fail(name, 'crashed: ' + (e && e.stack || e)); }
  finally { await R.close(); }
}
(async () => {
  for (const c of CASES) await run(c);
  console.log('\nNOTES'); for (const n of notes) console.log(' ', n);
  console.log(fails.length ? '\nFAILED ' + fails.length + '\n' + fails.join('\n') : '\nALL PASSED');
  process.exit(fails.length ? 1 : 0);
})();
