/* PROMO6: capture the REAL companion from the live app (WebKit iPhone 13, DPR 3) with a transparent background.
   Everything except .sp-creature is hidden; all of its real CSS animations (breathing, blink, sway, sparkles) are stepped at 30 fps.
   Per frame, 3 face variants using the app's own face parts: rest (eyes + smile), talk (eyes + the app's 'ooh' mouth), surprised (the app's touch face). */
const H = require('/home/sprite/lowispike/tools/sim/harness.cjs');
const fs = require('fs');
const OUT = '/home/sprite/PROMO6/comp/'; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const SEED = fs.readFileSync('/home/sprite/PROMO6/seed.js', 'utf8');
const STEP = fs.readFileSync('/home/sprite/PROMO6/step.js', 'utf8');
const N = +(process.argv[2] || 110), DT = 1000 / 30;
(async () => {
  const R = await H.open({ engine: 'webkit', device: 'iPhone 13', url: 'https://therealetm.github.io/lowispike/index.html', lang: 'en', name: 'Connie', members: 4, messages: 4, probe: false });
  const P = R.page;
  await P.clock.install({ time: new Date('2026-10-27T18:10:00+01:00') }); await P.clock.resume();
  await R.ctx.addInitScript({ content: SEED });
  await R.goto(); await H.sleep(10000);
  const now = await P.evaluate(() => Date.now()); await P.clock.pauseAt(now + 300);
  const info = await P.evaluate(() => {
    const c = document.querySelector('.sp-creature'); const s = c.querySelector('svg.tmg-plant');
    const st = document.createElement('style'); st.id = 'p6iso';
    st.textContent = 'html,body{background:transparent!important;background-image:none!important} *{visibility:hidden!important} .sp-creature,.sp-creature *{visibility:visible!important} canvas{display:none!important}';
    document.head.appendChild(st);
    const r = c.getBoundingClientRect(); return { cls: s.getAttribute('class'), label: s.getAttribute('aria-label'), r: [r.x, r.y, r.width, r.height], dpr: devicePixelRatio };
  });
  console.log('companion', JSON.stringify(info));
  await P.evaluate(STEP);
  const pad = 34; const [x, y, w, h] = info.r; const clip = { x: Math.max(0, x - pad), y: Math.max(0, y - pad), width: w + pad * 2, height: h + pad * 2 };
  const face = (v) => P.evaluate((v) => {
    const s = document.querySelector('.sp-creature svg.tmg-plant'); const q = (k) => [...s.querySelectorAll(k)];
    const set = (els, prop, val) => els.forEach(e => val == null ? e.style.removeProperty(prop) : e.style.setProperty(prop, val, 'important'));
    set(q('.lh-ooh'), 'display', v === 'rest' ? null : 'block'); set(q('.lh-smile'), 'display', v === 'rest' ? null : 'none');
    set(q('.lh-eyes'), 'transform', v === 'surprised' ? 'scale(1.14)' : null);
  }, v);
  const boxes = []; const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    await P.clock.runFor(DT); await P.evaluate((d) => window.__p6step(d), DT);
    for (const v of ['rest', 'talk', 'surprised']) { await face(v); await P.screenshot({ path: OUT + v + '-' + String(i).padStart(4, '0') + '.png', clip, omitBackground: true, timeout: 90000 }); }
    await face('rest');
    boxes.push(await P.evaluate(() => { const r = document.querySelector('.sp-creature svg.tmg-plant').getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(n => +n.toFixed(1)); }));
    if (i % 10 === 0) console.log('frame', i, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  fs.writeFileSync(OUT + 'meta.json', JSON.stringify({ info, clip, boxes, fakeCloudWrites: R.sim ? R.sim.writes.length : null }, null, 1));
  console.log('done');
  await R.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e && e.stack); process.exit(1); });
