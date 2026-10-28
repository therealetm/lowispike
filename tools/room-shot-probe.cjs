'use strict';
/* Oct 28 (Emmanuel, Room screenshot: "look at where the blast is ... it's not coming out of my companion"): where the energy aim and
   the first frame of a shot are drawn compared with your own companion on screen, before and after your companion was knocked off
   its seat, plus whether everyone fits in the Room on opening. Fake cloud: nothing is sent.
   node tools/room-shot-probe.cjs [chromium|webkit] [WxH|device] [url|root] */
const H = require('./sim/harness.cjs');
const engine = process.argv[2] || 'chromium', dev = process.argv[3] || '390x844';
const target = process.argv[4] || require('path').join(__dirname, '..');
const sleep = H.sleep;
/* bright pixels on the energy canvas, in Room px: their centre and box (the aim form or the ball) */
const FX = () => {
  const gal = document.getElementById('cgGalaxy'), c = gal && gal.querySelector('canvas.ce-fx'); if (!c || !c.width) return null;
  const k = c.width / gal.clientWidth, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0, sx = 0, sy = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) { const i = (y * c.width + x) * 4; if (d[i + 3] > 200 && d[i] + d[i + 1] + d[i + 2] > 600) { n++; sx += x; sy += y; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }
  return n ? { x: Math.round(sx / n / k), y: Math.round(sy / n / k), box: [x0, y0, x1, y1].map(v => Math.round(v / k)), n } : { n: 0 };
};
const ME = () => {
  const gal = document.getElementById('cgGalaxy'), o = document.querySelector('#cgField .cg-body.me .cg-orb'); if (!gal || !o) return null;
  const a = o.getBoundingClientRect(), g = gal.getBoundingClientRect();
  return { x: Math.round(a.left - g.left + a.width / 2), y: Math.round(a.top - g.top + a.height / 2), s: Math.round(a.width) };
};
const FITS = () => {
  const gal = document.getElementById('cgGalaxy'), g = gal.getBoundingClientRect(), out = [];
  for (const b of document.querySelectorAll('#cgField .cg-body')) { const o = b.querySelector('.cg-orb') || b, a = o.getBoundingClientRect(); if (!a.width) continue; if (a.left < g.left - 1 || a.right > g.right + 1 || a.top < g.top - 1 || a.bottom > g.bottom + 1) out.push((b.dataset.name || b.dataset.uid || '?').slice(0, 14) + (b.classList.contains('me') ? '(you)' : '')); }
  return { bodies: document.querySelectorAll('#cgField .cg-body').length, outside: out, z: (window.LowiCgMap && LowiCgMap.cam && LowiCgMap.cam()) ? +LowiCgMap.cam().z.toFixed(3) : null };
};
const dist = (a, b) => a && b && a.x != null && b.x != null ? Math.round(Math.hypot(a.x - b.x, a.y - b.y)) : null;
(async () => {
  const o = { engine, members: 12, messages: 30, probe: false, lang: 'de' };
  if (/^https?:/.test(target)) o.url = target; else o.root = target;
  if (engine === 'webkit') o.device = dev; else { const [w, h] = dev.split('x').map(Number); o.viewport = { width: w, height: h }; }
  const R = await H.open(o); const P = R.page;
  await R.goto(); await sleep(9000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  await P.evaluate(() => goTab('foryou')); await sleep(2500);
  await P.evaluate(() => { try { LowiRoomsUI.setTab(false); } catch (e) { } }); await sleep(3000);
  console.log('open: fits', JSON.stringify(await P.evaluate(FITS)));
  const joy = async () => P.evaluate(() => { const j = document.querySelector('#cgGalaxy .ce-joy') || document.querySelector('.ce-joy'); if (!j) return null; const r = j.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, vis: r.width > 0 && getComputedStyle(j).opacity > .1 }; });
  const aim = async (label) => {
    const j = await joy(); if (!j || !j.vis) { console.log(label, 'no pad', JSON.stringify(j)); return; }
    await P.mouse.move(j.x, j.y); await P.mouse.down(); for (let i = 1; i <= 8; i++) { await P.mouse.move(j.x - 4 * i, j.y - 5 * i); await sleep(40); }
    await sleep(400);
    const me = await P.evaluate(ME), fx = await P.evaluate(FX);
    console.log(label, 'aim: you', JSON.stringify(me), 'aim form', JSON.stringify(fx), 'gap px', dist(me, fx));
    await P.mouse.up(); await sleep(60);
    const me2 = await P.evaluate(ME), fx2 = await P.evaluate(FX), balls = await P.evaluate(() => LowiEnergy.balls());
    console.log(label, 'shot first frame: you', JSON.stringify(me2), 'ball', JSON.stringify(fx2), 'gap px', dist(me2, fx2), 'balls', balls.length);
    await sleep(4500);
  };
  await aim('seat');
  /* someone else's shot knocks you far off your seat (the remote path every phone uses) */
  const knocked = await P.evaluate(async () => {
    const me = document.querySelector('#cgField .cg-body.me'), others = [...document.querySelectorAll('#cgField .cg-body:not(.me)')].map(b => b.dataset.uid).filter(u => u && !/^bot/.test(u));
    const myUid = me && me.dataset.uid, by = others[0] || [...document.querySelectorAll('#cgField .cg-body:not(.me)')].map(b => b.dataset.uid)[0];
    let cloudUid = ''; try { const st = LOWI_CLOUD_X.state(); cloudUid = st && st.uid || ''; } catch (e) { }
    const sent = LowiEnergy.remote({ v: 1, id: 'probe' + Date.now().toString(36), by, a: Math.PI / 2, p: 1, to: cloudUid || myUid, ht: 0, t: Date.now(), f: [0, -60], g: [0, 0] });
    await new Promise(r => setTimeout(r, 5000));
    return { by, myUid, cloudUid: cloudUid ? 'yes' : 'no', sent, state: LowiEnergy.state() };
  });
  console.log('knock', JSON.stringify(knocked).slice(0, 500));
  console.log('after knock: fits', JSON.stringify(await P.evaluate(FITS)));
  await aim('knocked');
  /* the shot itself, fired straight through LowiEnergy.fire, caught on the next frames */
  const direct = await P.evaluate(async ([FXs, MEs]) => { const FX = eval(FXs), ME = eval(MEs); const me = ME(); const before = LowiEnergy.stats().sent; LowiEnergy.fire(-Math.PI / 2, .7);
    const out = []; for (let i = 0; i < 4; i++) { await new Promise(r => requestAnimationFrame(r)); out.push({ fx: FX(), balls: LowiEnergy.balls().length }); }
    return { me, sentBefore: before, sentAfter: LowiEnergy.stats().sent, frames: out }; }, ['(' + FX.toString() + ')', '(' + ME.toString() + ')']);
  console.log('direct fire', JSON.stringify(direct), 'gap first frame', direct.frames[0] && direct.frames[0].fx ? dist(direct.me, direct.frames[0].fx) : null);
  await sleep(4000);
  await P.evaluate(() => goTab('home')); await sleep(2500); await P.evaluate(() => goTab('foryou')); await sleep(2500);
  await P.evaluate(() => { try { LowiRoomsUI.setTab(false); } catch (e) { } }); await sleep(3000);
  for (let i = 0; i < 30 && await P.evaluate(() => LowiEnergy.busy()); i++) await sleep(500);
  console.log('reopen: fits', JSON.stringify(await P.evaluate(FITS)));
  if (process.env.DEBUG) console.log('reopen debug', JSON.stringify(await P.evaluate(() => { const gal = document.getElementById('cgGalaxy'), g = gal.getBoundingClientRect(); return { cam: LowiCgMap.cam && LowiCgMap.cam(), gal: [g.width, g.height], st: LowiEnergy.state(), peek: [...document.querySelectorAll('#cgField .cg-body')].map(b => { const r = b.getBoundingClientRect(); return [b.dataset.name, JSON.stringify(LowiEnergy.peek(b.dataset.uid)), Math.round(r.left - g.left), Math.round(r.top - g.top)]; }), zoom: gal.getAttribute('data-zoom') }; })).slice(0, 2500));
  const hint = await P.evaluate(() => { const e = document.getElementById('csDraft'), m = e && e.parentNode; if (!e) return null; const r = e.getBoundingClientRect(), mr = m.getBoundingClientRect(); let clip = null; for (let a = e.parentNode; a && a !== document.body; a = a.parentNode) { const cs = getComputedStyle(a); if (/hidden|clip/.test(cs.overflow + cs.overflowY)) { const b = a.getBoundingClientRect(); if (b.bottom < r.bottom - 0.5) { clip = { el: (a.id || String(a.className)).slice(0, 40), bottom: Math.round(b.bottom) }; break; } } } const c = document.getElementById('csCount'); return { text: e.textContent, top: Math.round(r.top), bottom: Math.round(r.bottom), metaShown: getComputedStyle(m).display !== 'none' && mr.height > 0, count: c ? c.textContent : null, vh: innerHeight, clip }; });
  console.log('hint', JSON.stringify(hint));
  if (process.env.SHOT) await P.screenshot({ path: process.env.SHOT });
  console.log('page loads', R.loads, 'renderer crashed', R.crashed, 'rss MB', (() => { try { return R.rss(); } catch (e) { return null; } })());
  console.log('errors', JSON.stringify(R.errs.map(e => e.m)).slice(0, 800));
  await R.close();
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
