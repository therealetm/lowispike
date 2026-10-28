/* Oct 28 2026: frame timing of the Billardtisch on its own (the table code, its CSS, 40 balls with companion-like SVG art), so the
   number is the table's own cost and not the rest of the app (the full app in this VM's software-rendered headless browser runs
   at about 2 fps even before the table draws anything).
   node tools/room-table-perf.cjs [chromium|webkit] [balls] [cpuSlowdown]   (cpuSlowdown: Chromium only, e.g. 4 = a 4x slower CPU) */
const fs = require('fs'), path = require('path'), os = require('os');
let pw; for (const p of [process.env.PW, path.join(os.homedir(), '.pw/node_modules/playwright'), 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const engine = process.argv[2] || 'chromium', N = +process.argv[3] || 40, slow = +process.argv[4] || 1, shotsDir = process.argv[5] || '';
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const art = i => `<svg viewBox="0 0 100 100"><defs><radialGradient id="g${i}" cx=".4" cy=".35"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="hsl(${i * 37 % 360},70%,60%)"/></radialGradient></defs><circle cx="50" cy="54" r="34" fill="url(#g${i})"/><ellipse cx="38" cy="50" rx="5" ry="7" fill="#123"/><ellipse cx="62" cy="50" rx="5" ry="7" fill="#123"/><path d="M38 66 Q50 76 62 66" stroke="#123" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M30 26 Q50 4 70 26" stroke="hsl(${i * 53 % 360},80%,70%)" stroke-width="6" fill="none"/></svg>`;
const names = ['Merve', 'Antje', 'Luise', 'Liesl', 'B', 'Jasmine', 'Christabel', 'Joseph C', 'Sani', 'Eleonora', 'Emmy', 'Mayfall', 'Lena', 'Kai', 'Noor', 'Ida', 'Tom', 'Ava', 'Mia', 'Ben'];
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#050b1c;font-family:system-ui}#cgGalaxy{position:absolute;left:19px;top:153px;width:352px;height:513px;overflow:hidden}${read("room-table.css")}${process.env.EXTRA_CSS||""}</style></head>
<body><div id="cgGalaxy"></div><script>
const N=${N},ART=${JSON.stringify(Array.from({ length: N }, (_, i) => art(i)))},NAMES=${JSON.stringify(names)};
const uid=i=>(i===0?'00000001':String(100+i).padStart(8,'0'))+'-0000-4000-8000-'+String(i).padStart(12,'0');
window.LowiCgMap={people:()=>Array.from({length:N},(_,i)=>({uid:uid(i),me:i===0,n:i?NAMES[i%NAMES.length]+(i>=NAMES.length?' '+i:''):'Emmanuel',label:i?NAMES[i%NAMES.length]+(i>=NAMES.length?' '+i:''):'Du',c:'hsl('+(i*47%360)+',60%,62%)'})),
  art:(u,k)=>ART[Math.max(0,Array.from({length:N},(_,i)=>uid(i)).indexOf(u))]||'',pick(){},selected:()=> '',me:()=>uid(0)};
</script><script>${read('room-table-core.js')}</script><script>${read('room-table.js')}</script></body></html>`;
(async () => {
  const browser = await pw[engine].launch();
  const ctx = await browser.newContext(engine === 'webkit' ? pw.devices['iPhone 13'] : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  if (engine === 'chromium' && slow > 1) { const s = await ctx.newCDPSession(page); await s.send('Emulation.setCPUThrottlingRate', { rate: slow }); }
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.setContent(html); await page.waitForTimeout(300);
  await page.evaluate(() => LowiTable.mount(document.getElementById('cgGalaxy')));
  await page.waitForTimeout(300);
  const runs = [];
  for (const [dx, dy, p] of [[0.15, -1, 1], [-0.8, 0.6, 1], [1, 0.35, .9]]) {
    if (shotsDir && !runs.length) { fs.mkdirSync(shotsDir, { recursive: true }); }
    const r = await page.evaluate(([dx, dy, p]) => new Promise(res => { const st0 = LowiTable.stats(); const S = LowiTable.state(), m = S.balls.find(b => b.uid === S.me); const others = S.balls.filter(b => b.uid !== S.me).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y)); const tg = others[Math.min(others.length - 1, Math.abs(Math.round(dx * 3)))]; const shot = LowiTable.fire(tg.x - m.x, tg.y - m.y, p); const t0 = performance.now(); let n = 0, last = t0, worst = 0, over = 0, maxMoving = 0; const gaps = [];
      function f(t) { n++; const g = t - last; last = t; gaps.push(g); if (g > worst) worst = g; if (g > 20) over++; maxMoving = Math.max(maxMoving, LowiTable.state().moving); if (LowiTable.state().play && t - t0 < 20000) requestAnimationFrame(f); else { gaps.sort((a, b) => a - b); res({ hit: !!(shot && shot.hit), moved: shot && shot.moved.length, steps: shot && shot.steps, ms: Math.round(t - t0), frames: n, fps: Math.round(n / ((t - t0) / 1000)), p95: Math.round(gaps[Math.floor(gaps.length * .95)] || 0), worst: Math.round(worst), framesOver20ms: over, maxMoving, jsMsPerFrame: Math.round((LowiTable.stats().jsMs - st0.jsMs) / n * 10) / 10 }); } }
      requestAnimationFrame(f); }), [dx, dy, p]);
    runs.push(r);
    if (shotsDir && runs.length === 1) { }
    await page.waitForTimeout(700);
  }
  if (shotsDir) {
    await page.evaluate(() => { const S = LowiTable.state(), m = S.balls.find(b => b.uid === S.me); const tg = S.balls.filter(b => b.uid !== S.me).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0]; LowiTable.fire(tg.x - m.x, tg.y - m.y, 1); });
    for (const ms of [120, 250, 450, 800, 1400]) { await page.waitForTimeout(ms === 120 ? 120 : ms - [120, 250, 450, 800, 1400][[120, 250, 450, 800, 1400].indexOf(ms) - 1]); await page.screenshot({ path: path.join(shotsDir, `roll-${engine}-${String(ms).padStart(4, '0')}ms.png`), clip: { x: 0, y: 140, width: 390, height: 540 } }); }
  }
  console.log(JSON.stringify({ engine, balls: N, cpuSlowdown: slow, runs, errs }));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
