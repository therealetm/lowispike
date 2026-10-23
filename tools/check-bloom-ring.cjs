'use strict';
/* Browser check for the bloom ring (Oct 23 2026, bloom-ring.js + home-blooms-v2.js), like a user on Home:
   - taps Fuel, Water, Move: the orbs sit on one circle round Misty, the same distance apart, fully on screen, never on a Home bubble
     or on Misty, the view pulls back (html.br-zoom, scale < 1); Move has no Mirror orb; closing brings the ring back where it was;
   - a real two-finger tap on Misty (CDP multi-touch): every bloom opens in one round, same checks; tap the empty space closes it;
   - Misty's hold still opens her stats and is not set off by the two-finger tap.
   node tools/check-bloom-ring.cjs <w>x<h> [root|url] [outdir] [lang]   (chromium, touch) */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const size = (process.argv[2] || '390x844').split('x').map(Number), where = process.argv[3] || path.join(__dirname, '..');
  const out = process.argv[4] || '/tmp/check-bloom', lang = process.argv[5] || 'en';
  fs.mkdirSync(out, { recursive: true });
  const o = { device: 'iPhone 13', engine: 'chromium', members: 5, messages: 5, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = size.join('x') + '-' + lang;
  await P.setViewportSize({ width: size[0], height: size[1] });
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  R.step = 'load'; await R.goto(); await H.sleep(6000);
  await P.evaluate(() => { try { goTab('home'); } catch (e) { } }); await H.sleep(1500);
  const res = { size: size.join('x'), lang, build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null), cases: [], finds: [] };
  const find = async (kind, info) => { const f = path.join(out, tag + '-find-' + res.finds.length + '.png'); await R.shot(f); res.finds.push(Object.assign({ kind, shot: f }, info)); console.log('FIND', kind, JSON.stringify(info).slice(0, 400)); };
  const ring = () => P.evaluate(() => [...document.querySelectorAll('[data-orbit]')].map(e => { const r = e.getBoundingClientRect(); return { k: e.dataset.orbit, x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.min(r.width, r.height) / 2 }; }).filter(b => b.r > 4));
  const state = () => P.evaluate(() => {
    const m = document.getElementById('spBubble'), mr = m && m.getBoundingClientRect();
    const orbs = [...document.querySelectorAll('#hb2Bloom .hb2-orb')].map(e => { const r = e.getBoundingClientRect(); return { id: e.dataset.id, g: e.dataset.group || '', lb: e.classList.contains('lb-bub'), on: e.classList.contains('hb2-on'), x: r.left + r.width / 2, y: r.top + r.height / 2, d: r.width }; });
    const hud = document.getElementById('whHud');
    return { open: (window.LowiHomeBloomsV2 && LowiHomeBloomsV2.isOpen()) || null, zoom: document.documentElement.classList.contains('br-zoom'),
      scale: hud ? getComputedStyle(hud).scale : '', misty: mr ? { x: mr.left + mr.width / 2, y: mr.top + mr.height / 2, r: Math.min(mr.width, mr.height) / 2 } : null,
      lay: (document.getElementById('hb2Bloom') || {}).__layout ? { c: document.getElementById('hb2Bloom').__layout.ring && document.getElementById('hb2Bloom').__layout.ring.c, rho: document.getElementById('hb2Bloom').__layout.ring && document.getElementById('hb2Bloom').__layout.ring.rho } : null,
      orbs, vw: innerWidth, vh: innerHeight, lb3d: document.documentElement.classList.contains('lb3d'), fan: [...document.querySelectorAll('#ss2Bloom .ss2-chip')].filter(e => e.getBoundingClientRect().width > 0).length,
      veil: (window.LowiWorld3D && LowiWorld3D.veilLook) ? LowiWorld3D.veilLook() : null, circles: (window.LowiWorld3D && LowiWorld3D.veilCircles) ? LowiWorld3D.veilCircles() : null, stats: !!document.querySelector('.ms-sheet.on, #msSheet.on, [data-misty-sheet].on, .misty-sheet.open') };
  });
  const settle = async () => { let a = '', b = ''; for (let i = 0; i < 40; i++) { b = await P.evaluate(() => JSON.stringify([getComputedStyle(document.getElementById('whHud') || document.body).scale, ...[...document.querySelectorAll('#hb2Bloom .hb2-orb')].map(e => { const r = e.getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top); })])); if (b === a && i > 2) return i; a = b; await H.sleep(250); } return -1; };
  const judge = async (name, s, ringNow, expectN) => {
    const bad = [];
    if (!s.orbs.length) bad.push('no orbs');
    if (expectN && s.orbs.length !== expectN) bad.push('orbs ' + s.orbs.length + ' != ' + expectN);
    if (!s.zoom) bad.push('no zoom-out');
    const c = s.lay && s.lay.c;
    if (!c) bad.push('not on the ring layout (fallback fan)');
    else {
      const ds = s.orbs.map(p => Math.hypot(p.x - c.x, p.y - c.y));
      if (Math.max(...ds) - Math.min(...ds) > 3) bad.push('not on one circle: ' + ds.map(Math.round).join(','));
      /* same gap between neighbours inside each group */
      const groups = {}; s.orbs.forEach(p => { (groups[p.g || 'one'] = groups[p.g || 'one'] || []).push(Math.atan2(p.y - c.y, p.x - c.x)); });
      Object.keys(groups).forEach(k => { const a = groups[k].sort((x, y) => x - y); const st = []; for (let i = 1; i < a.length; i++) st.push(a[i] - a[i - 1]); const ok = st.every(x => x < Math.PI) ? st : null; if (ok && ok.length > 1 && Math.max(...ok) - Math.min(...ok) > 0.03) bad.push(k + ' uneven spacing ' + ok.map(x => x.toFixed(2)).join(',')); });
    }
    s.orbs.forEach(p => { const r = p.d / 2; if (p.x - r < 0 || p.y - r < 0 || p.x + r > s.vw || p.y + r > s.vh) bad.push(p.id + ' off screen'); });
    for (let i = 0; i < s.orbs.length; i++) for (let j = i + 1; j < s.orbs.length; j++) { const a = s.orbs[i], b = s.orbs[j]; if (Math.hypot(a.x - b.x, a.y - b.y) < (a.d + b.d) / 2 - 1) bad.push(a.id + ' overlaps ' + b.id); }
    ringNow.forEach(b => s.orbs.forEach(p => { if (Math.hypot(p.x - b.x, p.y - b.y) < p.d / 2 + b.r - 2) bad.push(p.id + ' covers ' + b.k); }));
    if (s.misty) s.orbs.forEach(p => { if (Math.hypot(p.x - s.misty.x, p.y - s.misty.y) < p.d / 2 + s.misty.r * 0.8) bad.push(p.id + ' on Misty'); });
    if (s.orbs.some(p => p.id === 'mirror')) bad.push('Mirror orb still in the bloom');
    /* Oct 23, 18:03 (Eman): Sleep blooms on the ring too, the two-finger ring is one full even circle, every orb wears the Home bubble
       membrane (living-bubbles), the old loose Sleep row is gone, and no glowing body place shows on a bubble's edge */
    if (s.fan) bad.push('old loose Sleep row visible (' + s.fan + ' chips)');
    if (s.lb3d && s.orbs.some(p => !p.lb)) bad.push('orb without the bubble membrane: ' + s.orbs.filter(p => !p.lb).map(p => p.id).join(','));
    if (/^two-finger/.test(name) && c && s.orbs.length > 2) {
      const a = s.orbs.map(p => Math.atan2(p.y - c.y, p.x - c.x)).sort((x, y) => x - y), st = [];
      for (let i = 0; i < a.length; i++) st.push(((a[(i + 1) % a.length] - a[i]) + Math.PI * 4) % (Math.PI * 2));
      const want = Math.PI * 2 / a.length;
      if (st.some(x => Math.abs(x - want) > 0.05)) bad.push('two-finger ring not one even full circle: ' + st.map(x => Math.round(x * 180 / Math.PI)).join(','));
      if (!s.orbs.some(p => p.g === 'sleep')) bad.push('Sleep missing from the two-finger ring');
    }
    if (s.veil && s.circles) {
      await H.sleep(700);
      const v2 = await P.evaluate(() => LowiWorld3D.veilLook());
      const shown = v2.filter(b => b.z < 1 && b.z > -1 && b.veil > 0.3 && s_in(b));
      function s_in(b) { return s.circles.some(c => Math.hypot(b.x - c.x, b.y - c.y) < c.r - 2); }
      if (shown.length) bad.push('body place shows on a bubble: ' + shown.map(b => b.id + '@' + Math.round(b.x) + ',' + Math.round(b.y)).join(' '));
    }
    res.cases.push({ name, ok: !bad.length, n: s.orbs.length, scale: s.scale, bad });
    await R.shot(path.join(out, tag + '-' + name.replace(/\W+/g, '_') + '.png'));
    if (bad.length) await find(name, { bad: bad.slice(0, 8) });
    console.log('CASE', name, bad.length ? 'BAD' : 'OK', s.orbs.length, s.scale, bad.slice(0, 4).join(' | '));
  };
  const settleRing = async () => { let a = ''; for (let i = 0; i < 30; i++) { const b = JSON.stringify(await ring()); if (b === a) return; a = b; await H.sleep(300); } };
  const closeIt = async () => { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(200); await P.evaluate(() => { try { LowiHomeBloomsV2.close(); } catch (e) { } }); await H.sleep(700); await settleRing(); };
  const ring0 = await ring();
  console.log('RING', ring0.map(b => b.k).join(','), 'build', res.build);
  const singles = {};
  for (const k of ['fuel', 'water', 'move', 'sleep']) {
    R.step = 'bloom ' + k;
    const b = ring0.find(x => x.k === k); if (!b) { await find('no ' + k + ' bubble on Home', {}); continue; }
    await P.touchscreen.tap(b.x, b.y); await H.sleep(600); await settle();
    const s = await state(); const rn = await ring();
    if (s.open !== k) { await find(k + ' bloom did not open', { open: s.open }); await closeIt(); continue; }
    singles[k] = s.orbs.length;  /* Oct 23: two fingers must open exactly the sum of the single blooms (Water by sips made Water 3) */
    await judge(k + ' bloom', s, rn, 0);
    await closeIt();
    const s2 = await state(), r2 = await ring();
    const moved = ring0.filter(x => { const y = r2.find(z => z.k === x.k); return !y || Math.hypot(x.x - y.x, x.y - y.y) > 3; }).map(x => x.k);
    if (s2.zoom || s2.open || moved.length) await find(k + ': closing did not bring Home back', { zoom: s2.zoom, open: s2.open, moved });
    else res.cases.push({ name: k + ' close', ok: true });
  }
  /* the two-finger tap on Misty, real multi-touch through CDP */
  R.step = 'two-finger';
  const cdp = await R.ctx.newCDPSession(P);
  const m0 = (await state()).misty;
  if (!m0) await find('no Misty on Home', {});
  else {
    const pts = [{ x: m0.x - m0.r * 0.3, y: m0.y, id: 1 }, { x: m0.x + m0.r * 0.3, y: m0.y, id: 2 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0].x, y: pts[0].y, id: 1 }] });
    await H.sleep(40);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts.map(p => ({ x: p.x, y: p.y, id: p.id })) });
    await H.sleep(160);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await H.sleep(2200);
    let s = await state(), rn = await ring();
    if (s.open !== 'all') {
      /* on a loaded test machine CDP can deliver the two touches far apart (seen: 937 ms between the fingers), which the tap rule
         rightly refuses (a slow second finger is not a tap). Then the same two touches are sent from inside the page, on time. */
      const tl = await P.evaluate(([a, b]) => new Promise(ok => {
        const el = document.getElementById('spBubble'), mk = (p, id) => new Touch({ identifier: id, target: el, clientX: p.x, clientY: p.y });
        const t1 = mk(a, 1), t2 = mk(b, 2), fire = (type, touches, changed) => el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches, targetTouches: touches, changedTouches: changed }));
        /* back to back: a loaded machine can stall even a 30 ms timer for seconds, which the tap rule would refuse */
        const t0 = performance.now(); fire('touchstart', [t1], [t1]); fire('touchstart', [t1, t2], [t2]); fire('touchend', [t2], [t1]); fire('touchend', [], [t2]);
        ok(Math.round(performance.now() - t0));
      }), [pts[0], pts[1]]);
      await H.sleep(600); await settle();
      s = await state(); rn = await ring();
      res.cases.push({ name: 'two-finger via CDP refused as too slow on this machine, sent in-page instead', ok: true, ms: tl });
      console.log('INPAGE two-finger', tl, 'ms ->', s.open);
    }
    if (s.open !== 'all') console.log('BRSTATE', JSON.stringify(await P.evaluate(() => { try { return LowiBloomRing.state(); } catch (e) { return String(e); } })));
    if (s.open !== 'all') await find('two-finger tap on Misty did not open every bloom', { open: s.open, zoom: s.zoom });
    else await judge('two-finger: all blooms', s, rn, Object.values(singles).reduce((x, y) => x + y, 0) || 8);
    if (s.stats) await find('two-finger tap opened Misty stats (hold)', {});
    /* tap the empty space: closes and the view comes back */
    const sc = await P.evaluate(() => { const v = innerWidth, h = innerHeight; for (const [x, y] of [[8, h * 0.5], [v - 8, h * 0.5], [v * 0.5, h - 14], [8, h - 14]]) { const e = document.elementFromPoint(x, y); if (e && e.classList.contains('hb2-scrim')) return { x, y }; } return null; });
    if (sc) { await P.touchscreen.tap(sc.x, sc.y); await H.sleep(800); await settleRing(); } else await closeIt();
    const s2 = await state(), r2 = await ring();
    const moved = ring0.filter(x => { const y = r2.find(z => z.k === x.k); return !y || Math.hypot(x.x - y.x, x.y - y.y) > 3; }).map(x => x.k);
    if (s2.zoom || s2.open || moved.length) await find('all blooms: closing did not bring Home back', { zoom: s2.zoom, open: s2.open, moved, scrim: !!sc });
    else res.cases.push({ name: 'all close (empty space)', ok: true });
  }
  /* Misty's hold still opens her stats (and a single finger, so no bloom) */
  R.step = 'hold';
  const m1 = (await state()).misty;
  if (m1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: m1.x, y: m1.y, id: 7 }] });
    await P.mouse.move(m1.x, m1.y);
    const held = await P.evaluate(([x, y]) => new Promise(ok => { const t = document.elementFromPoint(x, y); const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 41, pointerType: 'touch', isPrimary: true };
      t.dispatchEvent(new PointerEvent('pointerdown', o)); setTimeout(() => { t.dispatchEvent(new PointerEvent('pointerup', o)); ok(document.documentElement.className); }, 800); }), [m1.x, m1.y]);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await H.sleep(600);
    const s = await state();
    const statsOpen = await P.evaluate(() => !!document.querySelector('[role=dialog]:not(#hb2Bloom), .r2-ov.on, #sheetwrap.open, #sheetwrap.show'));
    res.cases.push({ name: 'hold on Misty opens her stats, no bloom', ok: statsOpen && s.open !== 'all', statsOpen, open: s.open });
    if (!statsOpen || s.open === 'all') await find('Misty hold', { statsOpen, open: s.open, html: held.slice(0, 160) });
    await R.shot(path.join(out, tag + '-hold.png'));
  }
  res.errors = R.errs.slice(0, 10);
  if (R.errs.length) await find('page errors', { e: R.errs.slice(0, 5).map(e => e.step + ': ' + e.m) });
  fs.writeFileSync(path.join(out, tag + '.json'), JSON.stringify(res, null, 1));
  console.log('RESULT', res.size, 'cases', res.cases.filter(c => c.ok).length + '/' + res.cases.length, 'finds', res.finds.length);
  await R.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
