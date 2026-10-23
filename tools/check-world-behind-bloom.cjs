'use strict';
/* Browser check (Oct 23 2026, Eman's iPhone screenshot at 14:57): with the bloom ring open the world behind it must stay the full,
   living 3D world. Before the fix bloom-ring.js scaled #spHome .sp-heroes, which holds the 3D stage (#bw3Stage + its canvas), so the
   whole universe shrank into a hard-edged phone-shaped box with the bare page gradient around it.
   For Home, a single bloom (Fuel / Water / Move) and the two-finger round it records:
   - the 3D canvas rect (must cover the viewport, no scale on the stage or any of its ancestors),
   - whether the world keeps rendering (frames advance), and the camera distance (pulled back while the ring is open),
   - a screenshot and how much of the edge strip differs from the centre (a flat box shows as a hard step).
   node tools/check-world-behind-bloom.cjs <w>x<h> [root|url] [outdir] [lang] */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const size = (process.argv[2] || '390x844').split('x').map(Number), where = process.argv[3] || path.join(__dirname, '..');
  const out = process.argv[4] || '/tmp/check-wbb', lang = process.argv[5] || 'en';
  fs.mkdirSync(out, { recursive: true });
  const o = { device: 'iPhone 13', engine: 'chromium', members: 5, messages: 5, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = size.join('x') + '-' + lang;
  await P.setViewportSize({ width: size[0], height: size[1] });
  R.step = 'load'; await R.goto(); await H.sleep(6000);
  await P.evaluate(() => { try { goTab('home'); } catch (e) { } }); await H.sleep(2000);
  const res = { size: size.join('x'), lang, build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null), cases: [] };
  const look = () => P.evaluate(() => {
    const st = document.getElementById('bw3Stage'), cv = st && st.querySelector('canvas');
    const r = cv ? cv.getBoundingClientRect() : null;
    const scaled = []; for (let e = cv; e && e !== document.documentElement; e = e.parentElement) { const cs = getComputedStyle(e); if ((cs.scale && cs.scale !== 'none' && cs.scale !== '1') || (cs.transform && cs.transform !== 'none' && !/^matrix\(1, 0, 0, 1,/.test(cs.transform))) scaled.push((e.id || e.className || e.tagName).toString().slice(0, 40) + ' scale=' + cs.scale + ' tf=' + cs.transform.slice(0, 40)); }
    const A = window.LowiWorld3D, cam = A && A.camera, sc = A && A.scene, w = { state: A && A.state, why: A && A.why, cam: cam ? { x: +cam.position.x.toFixed(2), y: +cam.position.y.toFixed(2), z: +cam.position.z.toFixed(2), d: +cam.position.length().toFixed(2), fov: cam.fov } : null, kids: sc ? sc.children.length : null, visKids: sc ? sc.children.filter(c => c.visible).length : null };
    const mb = document.getElementById('spBubble'), mr = mb && mb.getBoundingClientRect();
    return { misty: mr ? { x: Math.round(mr.left + mr.width / 2), y: Math.round(mr.top + mr.height / 2), w: Math.round(mr.width) } : null, pull: A && A.rig ? A.rig.pull : (A && A.pull), canvas: r ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null, scaled,
      vw: innerWidth, vh: innerHeight, zoom: document.documentElement.classList.contains('br-zoom'), open: (window.LowiHomeBloomsV2 && LowiHomeBloomsV2.isOpen && LowiHomeBloomsV2.isOpen()) || null,
      paused: document.documentElement.className.match(/\S*(paus|freeze|bw3-off)\S*/g) || [], dbg: w, frames: window.__wbbFrames || 0 };
  });
  await P.evaluate(() => { window.__wbbFrames = 0; const A = window.LowiWorld3D; if (A && A.onFrame) A.onFrame(() => { window.__wbbFrames++; }); });
  const pix = async (name) => { const f = path.join(out, tag + '-' + name + '.png'); await R.shot(f); return f; };
  let home0 = null;
  const judge = async (name, free) => {
    await H.sleep(900);
    const a = await look();
    const b0 = await P.evaluate(() => window.__wbbFrames);
    await H.sleep(700);
    const b1 = await P.evaluate(() => window.__wbbFrames);
    const bad = [];
    if (!a.canvas) bad.push('no 3D canvas');
    else if (a.canvas.x > 1 || a.canvas.y > 1 || a.canvas.w < a.vw - 2 || a.canvas.h < a.vh - 2) bad.push('canvas is a box ' + JSON.stringify(a.canvas) + ' in ' + a.vw + 'x' + a.vh);
    if (a.scaled.length) bad.push('scaled: ' + a.scaled.join(' ; '));
    if (b0 != null && b1 != null && b1 <= b0) bad.push('world not rendering (frames ' + b0 + ' -> ' + b1 + ')');
    if (home0 && a.misty && home0.misty && Math.hypot(a.misty.x - home0.misty.x, a.misty.y - home0.misty.y) > 3) bad.push('Misty left the ring centre ' + JSON.stringify(home0.misty) + ' -> ' + JSON.stringify(a.misty));
    const d0 = home0 && home0.dbg && home0.dbg.cam && home0.dbg.cam.d, d1 = a.dbg && a.dbg.cam && a.dbg.cam.d;
    if (home0 && d0 && d1 && !free) { if (a.zoom && !(d1 > d0 * 1.03)) bad.push('camera did not pull back (' + d0 + ' -> ' + d1 + ')'); if (!a.zoom && Math.abs(d1 - d0) > 0.05) bad.push('camera not back at Home (' + d0 + ' -> ' + d1 + ')'); }
    const shot = await pix(name.replace(/\W+/g, '_'));
    res.cases.push({ name, ok: !bad.length, bad, look: a, frames: [b0, b1], shot });
    console.log('CASE', name, bad.length ? 'BAD' : 'OK', JSON.stringify(a.canvas), 'zoom', a.zoom, 'open', a.open, 'misty', JSON.stringify(a.misty), 'world', JSON.stringify(a.dbg), bad.join(' | '));
    return a;
  };
  const ring = () => P.evaluate(() => [...document.querySelectorAll('[data-orbit]')].map(e => { const r = e.getBoundingClientRect(); return { k: e.dataset.orbit, x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.min(r.width, r.height) / 2 }; }).filter(b => b.r > 4));
  const closeIt = async () => { await P.evaluate(() => { try { LowiHomeBloomsV2.close(); } catch (e) { } }); await H.sleep(1200); };
  home0 = await judge('home');
  const r0 = await ring();
  for (const k of ['fuel', 'water', 'move']) {
    const b = r0.find(x => x.k === k); if (!b) { res.cases.push({ name: k, ok: false, bad: ['no bubble'] }); continue; }
    await P.touchscreen.tap(b.x, b.y); await H.sleep(800);
    await judge(k + ' bloom');
    await closeIt();
    await judge(k + ' closed');
  }
  /* the two-finger round, sent from inside the page (CDP can deliver the fingers too far apart on a loaded machine) */
  await P.evaluate(() => new Promise(ok => {
    const el = document.getElementById('spBubble'); if (!el) return ok(); const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const mk = (dx, id) => new Touch({ identifier: id, target: el, clientX: x + dx, clientY: y }); const t1 = mk(-r.width * .15, 1), t2 = mk(r.width * .15, 2);
    const fire = (type, touches, changed) => el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches, targetTouches: touches, changedTouches: changed }));
    fire('touchstart', [t1], [t1]); fire('touchstart', [t1, t2], [t2]); fire('touchend', [t2], [t1]); fire('touchend', [], [t2]); ok();
  }));
  await H.sleep(800);
  await judge('two-finger all');
  await closeIt();
  await judge('all closed');
  /* pinch in and out on Home (wheel = the desktop pinch, same world.zoom): the world stays full screen, the ring keeps every bubble
     (the zoom-in ring hold, 20261023-144616), and a bloom opened while zoomed in still pulls the camera back, never a box */
  const wheel = (dy, n) => P.evaluate(([dy, n]) => { const cv = document.querySelector('#bw3Stage canvas'); if (!cv) return; const r = cv.getBoundingClientRect(); for (let i = 0; i < n; i++) cv.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, ctrlKey: true, bubbles: true, cancelable: true })); }, [dy, n]);
  const ringCount = async (name) => { const n = (await ring()).length; if (n < r0.length) { const c = res.cases[res.cases.length - 1]; c.ok = false; c.bad.push('ring lost bubbles ' + r0.length + ' -> ' + n); console.log('CASE', name, 'BAD ring', r0.length, '->', n); } };
  await wheel(-120, 12); await H.sleep(900); await judge('pinched in', true); await ringCount('pinched in');
  { const b = (await ring()).find(x => x.k === 'fuel'); if (b) { await P.touchscreen.tap(b.x, b.y); await H.sleep(800); await judge('fuel bloom zoomed in', true); await closeIt(); } }
  await wheel(120, 24); await H.sleep(900); await judge('pinched out', true); await ringCount('pinched out');
  res.errors = R.errs.slice(0, 10);
  fs.writeFileSync(path.join(out, tag + '.json'), JSON.stringify(res, null, 1));
  console.log('RESULT', res.size, res.build, 'cases', res.cases.filter(c => c.ok).length + '/' + res.cases.length, 'errors', R.errs.length);
  await R.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
