const L = require('./lib.cjs');
(async () => {
  const srv = await L.serve('/home/sprite/wt-bughunt-202610262119'); const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const h = await L.open({ url, view: process.argv[2]||'chromium390', lang: 'en', preInit: "try{localStorage.setItem('lowi.tutorial.done','1');}catch(e){}" }); const P = h.page;
  await P.waitForFunction(() => document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(2500);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); goTab('profile'); });
  await L.sleep(1500);
  await P.evaluate(() => document.getElementById('lcProf').click()); await L.sleep(1000);
  console.log(await P.evaluate(() => { const ov = document.getElementById('lcOv'); const srcs=[...document.scripts].map(s=>s.src).filter(s=>/birth|bundle|app\./.test(s)); return { cls: ov && ov.className, act: document.activeElement && (document.activeElement.id||document.activeElement.tagName), top: (LowiBackSwipe.topLayer()||{}).id, srcs }; }));
  await P.evaluate(() => { window.__k=[]; document.addEventListener('keydown',e=>__k.push('doc-cap:'+e.key+':'+(e.target.id||e.target.tagName)),true); window.addEventListener('popstate',()=>__k.push('pop:'+JSON.stringify(history.state))); LowiBackSwipe.guard(); __k.push('st:'+JSON.stringify(history.state)); history.back(); });
  await L.sleep(800);
  console.log(await P.evaluate(() => { const ov = document.getElementById('lcOv'); return [ov && ov.className, window.__k, location.href]; }));
  const s = await L.snap(h).catch(() => ({})); console.log(JSON.stringify(s.err));
  await h.browser.close(); srv.close(); process.exit(0);
})();
