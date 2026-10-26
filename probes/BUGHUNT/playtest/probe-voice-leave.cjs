'use strict';
/* Run 46 (P-SESSION-OUTLIVES-SCREEN): Community chat voice message. Tap the round mic once (tap mode = keeps recording),
   then leave the chat (room back / Community closes / Home). Is the microphone still recording? Does it send itself at the
   2 minute cap? Date.now is pushed 125 s ahead after leaving so the cap is reached without waiting. Chromium fake mic.
   usage: node probe-voice-leave.cjs <url|dir> [how=home|back] */
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const how = process.argv[3] || 'home';
  const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
  const reqs = [];
  const pre = "try{localStorage.setItem('lowi.tutorial.done','1');}catch(e){} (function(){const D0=Date.now.bind(Date);window.__skew=0;Date.now=()=>D0()+window.__skew;const md=navigator.mediaDevices;if(md){const g=md.getUserMedia&&md.getUserMedia.bind(md);window.__tracks=[];md.getUserMedia=c=>g(c).then(s=>{s.getTracks().forEach(t=>window.__tracks.push(t));return s;});}})();";
  const h = await L.open({ url, view: 'chromium390', lang: 'en', preInit: pre, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'], ctxHook: async ctx => { await ctx.grantPermissions(['microphone']); ctx.on('request', q => { const u = q.url(); if (q.method() !== 'GET' && !/127\.0\.0\.1|github\.io/.test(u)) reqs.push(q.method() + ' ' + u.replace(/\?.*/, '').slice(0, 140)); }); return require(WT + '/tools/sim/mock-cloud.cjs').install(ctx, { members: 20, messages: 10, me: 'Fixture' }); } });
  const P = h.page;
  await P.waitForFunction(() => document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(3000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
  await P.evaluate(() => document.querySelector('[data-orbit=settings]').click()); await L.sleep(1500);
  await P.evaluate(() => { try { LowiCommunityRooms.openOn('chat'); } catch (e) { } }); await L.sleep(2500);
  const c = await L.center(h, '#cmMic'); console.log('mic btn', JSON.stringify(c));
  if (!c) { console.log('FAIL no #cmMic visible'); await h.browser.close(); process.exit(0); }
  await L.tap(h, c.x, c.y); await L.sleep(2500);
  const st = () => P.evaluate(() => ({ live: (window.__tracks || []).filter(t => t.readyState === 'live').length, recBar: !!document.querySelector('#csRec .cs-rec'), micVis: (() => { const m = document.getElementById('cmMic'); return !!(m && m.getBoundingClientRect().width && m.checkVisibility && m.checkVisibility({ visibilityProperty: true, opacityProperty: true })); })(), notice: (document.getElementById('csNotice') || {}).textContent || '' }));
  console.log('recording', JSON.stringify(await st()));
  if (how === 'back') { const b = await L.center(h, '#cgClose'); if (b) await L.tap(h, b.x, b.y); await L.sleep(1500); }
  await P.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); goTab('home'); }); await L.sleep(2000);
  const left = await st(); console.log('after leaving (' + how + ')', JSON.stringify(left));
  const n0 = reqs.length;
  await P.evaluate(() => { window.__skew = 125000; }); await L.sleep(3000);
  const cap = await st(); console.log('after 2 min cap', JSON.stringify(cap), 'new non-GET requests:', JSON.stringify(reqs.slice(n0)));
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }));
  const bad = left.live > 0 || reqs.slice(n0).some(r => /storage\/v1|voice|message/.test(r));
  console.log(bad ? 'FAIL mic kept recording after leaving the chat' + (reqs.length > n0 ? ' and it sent at the cap' : '') : 'PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
