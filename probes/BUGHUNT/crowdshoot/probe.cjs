'use strict';
/* Community crash round 2 probe: the LIVE site signed in as a crowd member (real roster, real messages, real realtime),
   with every write blocked (REST/functions/storage non-GET aborted; realtime broadcast/presence sends dropped).
   Phases: chat scroll stress, galaxy zoom-out + aim/fire, remote shooters + taps on the shooter. Usage: node probe.cjs <chromium390|iphone13> [url] [secs] */
const fs = require('fs'), path = require('path');
const pw = require('/tmp/pw/node_modules/playwright');
const view = process.argv[2] || 'chromium390', URL0 = process.argv[3] || 'https://therealetm.github.io/lowispike/', SECS = +(process.argv[4] || 40);
const sess = JSON.parse(fs.readFileSync(path.join(__dirname, 's29.json'), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const INIT = `try{const d=new Date(),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
localStorage.setItem('lowi.daily.seen',k);sessionStorage.setItem('lowi.a2hs.x','1');localStorage.setItem('lowi.gate','done');localStorage.setItem('lowi.news.seen','99999');
if(!localStorage.getItem('lowi.auth'))localStorage.setItem('lowi.auth',${JSON.stringify(JSON.stringify(sess))});
localStorage.setItem('lowispike.claimprompt.v1','{"at":1,"from":"probe"}');localStorage.setItem('lowispike.tutorial.v1','{"done":1}');
if(!localStorage.getItem('lowispike.v2'))localStorage.setItem('lowispike.v2',JSON.stringify({v:2,setupDone:true,onboarded:true,user:{name:'Serainaq87',bday:'1990-01-01'},xp:900,ledger:[],logs:[],settings:{lang:'en'}}));}catch(e){}
(()=>{const S=WebSocket.prototype.send;WebSocket.prototype.send=function(d){try{const m=JSON.parse(d),ev=Array.isArray(m)?m[3]:m.event;if(ev==='broadcast'||ev==='presence'){(window.__wsDrop=(window.__wsDrop||0)+1);return;}}catch(e){}return S.call(this,d);};})();
(()=>{const B=window.__bh={err:[],rej:[],stalls:[],gap:0,frames:0,last:0};addEventListener('error',e=>B.err.push(String(e.message).slice(0,200)+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));addEventListener('unhandledrejection',e=>B.rej.push(String(e.reason&&(e.reason.stack||e.reason.message)||e.reason).slice(0,300)));
const f=t=>{if(B.last){const g=t-B.last;if(g>B.gap)B.gap=g;if(g>700&&document.visibilityState==='visible')B.stalls.push(Math.round(g));}B.last=t;B.frames++;requestAnimationFrame(f);};requestAnimationFrame(f);})();`;
(async () => {
  const eng = view === 'iphone13' ? 'webkit' : 'chromium';
  const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
  const dev = view === 'iphone13' ? pw.devices['iPhone 13'] : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };
  const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
  const blocked = [];
  await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (q.method() !== 'GET' && q.method() !== 'HEAD' && q.method() !== 'OPTIONS' && u.host.endsWith('supabase.co') && !u.pathname.startsWith('/auth/v1/token')) { blocked.push(q.method() + ' ' + u.pathname); return r.abort(); } return r.continue(); });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage(); const L = { pageerror: [], console: [] }; let crashed = false;
  page.on('pageerror', e => L.pageerror.push((e.stack || e.message).split('\n').slice(0, 2).join(' | ').slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') L.console.push(m.text().slice(0, 200)); });
  page.on('crash', () => { crashed = true; console.log('!!! PAGE CRASH'); });
  const cdp = eng === 'chromium' ? await ctx.newCDPSession(page) : null; if (cdp) await cdp.send('Performance.enable');
  const met = async () => { if (!cdp) return {}; const m = (await cdp.send('Performance.getMetrics')).metrics, g = n => (m.find(x => x.name === n) || {}).value; return { heapMB: Math.round(g('JSHeapUsedSize') / 1e6), nodes: g('Nodes'), listeners: g('JSEventListeners'), layouts: g('LayoutCount'), styles: g('RecalcStyleCount') }; };
  const T0 = Date.now(); const log = (...a) => console.log(((Date.now() - T0) / 1000).toFixed(1).padStart(6) + 's', ...a);
  await page.goto(URL0 + '?tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 }).catch(() => log('goTab never defined'));
  await sleep(6000);
  await page.evaluate(() => window.goTab('foryou')); await sleep(1500);
  await page.evaluate(() => window.cmSeg && window.cmSeg('chat')); await sleep(6000);
  const st = async tag => { if (crashed) return; const s = await page.evaluate(() => { const B = window.__bh, f = document.getElementById('cgField'), l = document.getElementById('cmList'), g = window.LowiCgMap && window.LowiCgMap.geom();
    const o = { bodies: f ? f.querySelectorAll('svg').length : -1, spots: g ? g.spots.length : -1, z: g ? +g.cam.z.toFixed(2) : null, msgs: l ? l.querySelectorAll('[data-id]').length : -1, imgs: l ? l.querySelectorAll('img').length : -1, dom: document.getElementsByTagName('*').length, svgEls: document.querySelectorAll('svg *').length,
      fieldRebuilds: window.__mo ? window.__mo.f : 0, listRebuilds: window.__mo ? window.__mo.l : 0, gap: Math.round(B.gap), frames: B.frames, stalls: B.stalls.splice(0), err: B.err.splice(0), rej: B.rej.splice(0), ws: window.__wsDrop || 0, canv: document.querySelectorAll('canvas').length,
      canvPx: [...document.querySelectorAll('canvas')].reduce((a, c) => a + c.width * c.height, 0) };
    B.gap = 0; if (window.__mo) { window.__mo.f = 0; window.__mo.l = 0; } return o; }).catch(e => ({ evalErr: String(e).slice(0, 100) })); log(tag, JSON.stringify(Object.assign(s, await met().catch(() => ({}))))); };
  await page.evaluate(() => { const M = window.__mo = { f: 0, l: 0 }; const f = document.getElementById('cgField'), l = document.getElementById('cmList');
    if (f) new MutationObserver(r => { for (const x of r) if (x.target === f && x.addedNodes.length) { M.f++; break; } }).observe(f, { childList: true });
    if (l) new MutationObserver(r => { for (const x of r) if (x.target === l && x.addedNodes.length) { M.l++; break; } }).observe(l, { childList: true }); });
  await st('ready');
  // message sizes, image sizes
  const info = await page.evaluate(() => { const l = document.getElementById('cmList'); const imgs = [...(l ? l.querySelectorAll('img') : [])]; return { htmlKB: l ? Math.round(l.innerHTML.length / 1024) : 0, imgSrc: imgs.slice(0, 5).map(i => (i.currentSrc || i.src).slice(0, 90) + ' ' + i.naturalWidth + 'x' + i.naturalHeight), dataImgs: imgs.filter(i => i.src.startsWith('data:')).length, dataKB: Math.round(imgs.filter(i => i.src.startsWith('data:')).reduce((a, i) => a + i.src.length, 0) / 1024), lazy: imgs.filter(i => i.loading === 'lazy').length }; });
  log('chat', JSON.stringify(info));
  // Phase A: open the room list (thread) and scroll up/down hard
  const openThread = await page.evaluate(() => { const b = document.querySelector('[data-chat="thread"],[data-chat="room"],#cgThreadOpen'); if (b) { b.click(); return b.dataset.chat || b.id; } return null; });
  log('thread opener', openThread); await sleep(1500); await st('thread-open');
  const box = await page.evaluate(() => { const l = document.getElementById('cmList'); if (!l) return null; const r = l.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height, vis: r.height > 0 }; });
  log('list box', JSON.stringify(box));
  const tEnd = Date.now() + SECS * 1000 / 2;
  while (Date.now() < tEnd && !crashed) { await page.evaluate(() => { const l = document.getElementById('cmList'); if (l) l.scrollTop = Math.random() < .5 ? 0 : l.scrollHeight * Math.random(); }).catch(() => { }); if (box && box.vis && eng === 'chromium') await page.mouse.wheel(0, Math.random() < .5 ? -1500 : 1500).catch(() => { }); await sleep(120); }
  await st('after-scroll');
  await page.evaluate(() => { const c = document.querySelector('#cgClose'); if (c) c.click(); }).catch(() => { }); await sleep(1200);
  // Phase B: zoom out to the widest view
  const gbox = await page.evaluate(() => { const g = document.getElementById('cgGalaxy'); const r = g.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; });
  await page.mouse.move(gbox.x, gbox.y); for (let i = 0; i < 25; i++) { await page.evaluate(b => { const g = document.getElementById('cgGalaxy'); g.dispatchEvent(new WheelEvent('wheel', { deltaY: 400, clientX: b.x, clientY: b.y, bubbles: true, cancelable: true })); }, gbox); await sleep(60); } await sleep(1500);
  await st('zoomed-out');
  // Phase C: aim + fire with the joystick, while remote shooters fire at me; tap shooters
  await page.evaluate(() => { window.__rem = 0; window.__remIv = setInterval(() => { const g = window.LowiCgMap.geom(); if (!g || !window.LowiEnergy) return; const me = g.spots.find(s => s.me), others = g.spots.filter(s => !s.me); for (let k = 0; k < 3; k++) { const o = others[Math.floor(Math.random() * others.length)]; if (!o || !me) continue; try { window.LowiEnergy.remote && window.LowiEnergy.remote({ uid: o.uid, a: Math.atan2(me.y - o.y, me.x - o.x), pw: 1, at: Date.now() }); window.__rem++; } catch (e) { window.__remErr = String(e); } } }, 700); });
  const tEnd2 = Date.now() + SECS * 1000 / 2; let shots = 0, taps = 0;
  while (Date.now() < tEnd2 && !crashed) {
    const j = await page.evaluate(() => { const b = document.getElementById('ceJoy'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }).catch(() => null);
    if (j) { await page.mouse.move(j.x, j.y); await page.mouse.down(); for (let k = 0; k < 8; k++) { await page.mouse.move(j.x + Math.cos(k) * 60, j.y - 50 - k * 6); await sleep(40); } await page.mouse.up(); shots++; }
    if (Math.random() < .5) { const p = await page.evaluate(() => { const bs = [...document.querySelectorAll('#cgField [data-chat="person"]')]; const b = bs[Math.floor(Math.random() * bs.length)]; if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }).catch(() => null); if (p) { await page.mouse.click(p.x, p.y).catch(() => { }); taps++; } }
    await sleep(150);
  }
  await st('after-shoot shots=' + shots + ' taps=' + taps);
  log('remote', await page.evaluate(() => [window.__rem, window.__remErr, Object.keys(window.LowiEnergy || {}).join(',')]).catch(() => 'n/a'));
  log('blocked writes', blocked.length, [...new Set(blocked)].slice(0, 8).join(' ; '));
  log('pageerror', L.pageerror.slice(0, 6), 'console', L.console.slice(0, 6));
  await browser.close();
})().catch(e => { console.log('FATAL', e); process.exit(1); });
