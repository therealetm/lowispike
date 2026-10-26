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
  const bd = await page.evaluate(() => { const c = s => { const e = document.querySelector(s); return e ? e.querySelectorAll('svg *').length : -1; }; const l = document.getElementById('cmList'); const kids = l ? [...l.children] : []; const sizes = kids.map(k => k.outerHTML.length).sort((a, b) => b - a);
    const b1 = document.querySelector('#cgField .cg-body'); return { field: c('#cgField'), list: c('#cmList'), perBody: b1 ? b1.querySelectorAll('*').length : 0, filters: document.querySelectorAll('#cgField filter').length, listKids: kids.length, top5KB: sizes.slice(0, 5).map(x => Math.round(x / 1024)), medKB: Math.round((sizes[Math.floor(sizes.length / 2)] || 0) / 1024), msgSvg: l && l.querySelector('[data-id] svg') ? l.querySelector('[data-id] svg').querySelectorAll('*').length : 0, anim: document.getAnimations().length }; });
  log('breakdown', JSON.stringify(bd));
  await page.evaluate(() => { window.__fh = []; const f = document.getElementById('cgField'); new MutationObserver(() => { window.__fh.push(f.__html); }).observe(f, { childList: true }); window.__lh = []; const l = document.getElementById('cmList'); new MutationObserver(() => { window.__lh.push(l.__html); }).observe(l, { childList: true }); });
  await sleep(SECS * 1000);
  const diffs = await page.evaluate(() => { const d = (a, b) => { if (!a || !b) return 'n/a'; let i = 0; while (i < a.length && a[i] === b[i]) i++; return a.slice(Math.max(0, i - 80), i + 60) + '  ||  ' + b.slice(Math.max(0, i - 80), i + 60); }; const o = []; for (let i = 1; i < window.__fh.length; i++) o.push('F ' + d(window.__fh[i - 1], window.__fh[i])); for (let i = 1; i < window.__lh.length; i++) o.push('L ' + d(window.__lh[i - 1], window.__lh[i])); return [window.__fh.length, window.__lh.length, o.slice(0, 10)]; });
  log('rebuilds', diffs[0], diffs[1]); diffs[2].forEach(x => console.log('   ', x.replace(/\s+/g, ' ').slice(0, 330)));
  await browser.close();
})().catch(e => { console.log('FATAL', e); process.exit(1); });
