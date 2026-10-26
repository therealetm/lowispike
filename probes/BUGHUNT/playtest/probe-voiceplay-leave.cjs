'use strict';
/* Run 46 (P-SESSION-OUTLIVES-SCREEN): Community chat voice message. Tap the round mic once (tap mode = keeps recording),
   then leave the chat (room back / Community closes / Home). Is the microphone still recording? Does it send itself at the
   2 minute cap? Date.now is pushed 125 s ahead after leaving so the cap is reached without waiting. Chromium fake mic.
   usage: node probe-voiceplay-leave.cjs <url|dir> [how=home|back] */
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const how = process.argv[3] || 'home';
  const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
  const reqs = [];
  const pre = "try{localStorage.setItem('lowi.tutorial.done','1');}catch(e){} (function(){window.__auds=[];window.__ev=[];const op=HTMLMediaElement.prototype.play,opa=HTMLMediaElement.prototype.pause;HTMLMediaElement.prototype.play=function(){if(!window.__auds.includes(this))window.__auds.push(this);window.__ev.push('play '+String(this.currentSrc||this.src).slice(0,20));return op.call(this);};HTMLMediaElement.prototype.pause=function(){window.__ev.push('pause '+(new Error().stack||'').split(String.fromCharCode(10)).slice(2,5).join(' | ').replace(/https?:[^ ]*\\//g,'').slice(0,260));return opa.call(this);};})();";
  const h = await L.open({ url, view: 'chromium390', lang: 'en', preInit: pre, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'], ctxHook: async ctx => { await ctx.grantPermissions(['microphone']); ctx.on('request', q => { const u = q.url(); if (q.method() !== 'GET' && !/127\.0\.0\.1|github\.io/.test(u)) reqs.push(q.method() + ' ' + u.replace(/\?.*/, '').slice(0, 140)); }); return require(WT + '/tools/sim/mock-cloud.cjs').install(ctx, { members: 20, messages: 10, me: 'Fixture' }); } });
  const P = h.page;
  await P.waitForFunction(() => document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(3000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
  await P.evaluate(() => document.querySelector('[data-orbit=settings]').click()); await L.sleep(1500);
  await P.evaluate(() => { try { LowiCommunityRooms.openOn('chat'); } catch (e) { } }); await L.sleep(2500);
  const wav = (() => { const sr = 8000, n = sr * 20, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(3000 * Math.sin(i / 8)), 44 + i * 2); return 'data:audio/wav;base64,' + b.toString('base64'); })();
  /* a voice bubble button like the room renders (data-chat="voice" data-src), clicked for real so the room's own player runs */
  const VURL = 'https://abcdefgh12.supabase.co/storage/v1/object/public/media/user1234/voice-test1.webm';
  await P.context().route(VURL + '*', r => r.fulfill({ status: 200, contentType: 'audio/wav', body: Buffer.from(wav.split(',')[1], 'base64') }));
  const has = await P.evaluate(w => { const p = document.querySelector('#cmPaneChat .cs-list, #cmPaneChat [role=log], #cmPaneChat'); if (!p) return false; const b = document.createElement('button'); b.type = 'button'; b.className = 'cs-voice'; b.setAttribute('data-chat', 'voice'); b.setAttribute('data-src', w); b.setAttribute('data-dur', '20'); b.textContent = 'voice'; b.style.cssText = 'position:relative;z-index:5;min-width:80px;min-height:40px'; p.appendChild(b); window.__vb = b; return true; }, VURL);
  if (!has) { console.log('FAIL no chat pane'); await h.browser.close(); process.exit(0); }
  await P.evaluate(() => window.__vb.click()); await L.sleep(2500);
  const st = () => P.evaluate(() => ({ playing: (window.__auds || []).filter(a => !a.paused && !a.ended).length, t: (window.__auds || []).map(a => +a.currentTime.toFixed(1)), tab: (document.querySelector('.tab.active') || {}).id || '', ev: window.__ev }));
  const s0 = await st(); console.log('playing in chat', JSON.stringify(s0));
  if (!s0.playing) { console.log('FAIL voice did not start'); await h.browser.close(); process.exit(0); }
  if (how === 'back') { const b = await L.center(h, '#cgClose'); if (b) await L.tap(h, b.x, b.y); await L.sleep(1500); }
  await P.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); goTab('home'); }); await L.sleep(2500);
  const left = await st(); console.log('after leaving (' + how + ')', JSON.stringify(left));
  const bad = left.playing > 0;
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }));
  console.log(bad ? 'FAIL chat voice message kept playing after leaving the chat, with no control on screen' : 'PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
