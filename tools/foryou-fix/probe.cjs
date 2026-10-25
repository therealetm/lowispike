'use strict';
/* Oct 25, 2026 (For You keeps losing posts): opens the app signed in as a given account with a snapshot of the REAL posts and
   profiles served by a stand-in Supabase (nothing reaches the live server; writes are captured). Reports what For You shows.
   Usage: URL=http://127.0.0.1:8741/index.html SESSION=/tmp/fyfix/eman-sess.json POSTS=/tmp/fyfix/posts.json PEOPLE=/tmp/fyfix/profs.json
          [ENGINE=chromium|webkit] [W=390 H=844] [LOCAL=empty|keep] [STEPS=open,post,reload,leave] node tools/foryou-fix/probe.cjs */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const fs = require('fs');
const SB = 'https://vnfwmifmsfecascwaody.supabase.co';
const SESSION = JSON.parse(fs.readFileSync(process.env.SESSION, 'utf8'));
const URL = process.env.URL || 'http://127.0.0.1:8741/index.html';
const ME = SESSION.user.id;
const POSTS = JSON.parse(fs.readFileSync(process.env.POSTS, 'utf8'));
const PEOPLE = JSON.parse(fs.readFileSync(process.env.PEOPLE, 'utf8'));
const STEPS = (process.env.STEPS || 'open').split(',');
const writes = []; let OFF = false;
const log = (...a) => console.log(...a);
(async () => {
  const eng = pw[process.env.ENGINE || 'chromium'];
  const browser = await eng.launch(process.env.ENGINE === 'webkit' ? {} : { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: +process.env.W || 390, height: +process.env.H || 844 }, deviceScaleFactor: 2, isMobile: process.env.ENGINE !== 'webkit' ? true : undefined, hasTouch: true, serviceWorkers: 'block' });
  await ctx.routeWebSocket(/.*/, ws => ws.close());
  const json = (r, body, status) => r.fulfill({ status: status || 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-range': '0-0/*' }, body: JSON.stringify(body) });
  await ctx.route('**/*', async r => {
    const q = r.request(), u = q.url(), m = q.method();
    if (u.startsWith(URL.replace(/\/[^/]*$/, '/'))) return r.continue();
    if (u.startsWith(SB)) {
      if (OFF && !/\/auth\//.test(u)) return r.abort();
      if (m === 'OPTIONS') return json(r, {});
      const p = u.replace(SB, '').split('?')[0];
      if (/\/auth\/v1\/user/.test(p)) return json(r, SESSION.user);
      if (/\/auth\/v1\/token/.test(p)) return json(r, Object.assign({}, SESSION, { expires_at: Math.floor(Date.now() / 1000) + 3000, expires_in: 3000 }));
      if (m !== 'GET' && m !== 'HEAD') {
        writes.push({ m, p, body: (q.postData() || '').slice(0, 400) });
        if (/\/rest\/v1\/posts/.test(p) && m === 'POST') { try { let b = JSON.parse(q.postData() || '{}'); (Array.isArray(b) ? b : [b]).forEach(x => { const i = POSTS.findIndex(y => y.id === x.id); const row = Object.assign({ user_id: ME, created_at: new Date().toISOString(), photo_url: '', video_url: '', poster: '', w: 0, h: 0, dur: 0, rec: '', mine: false, lv: 1, meta: null, art: null, url: '', plat: '', cap: '', who: 'Member' }, x); if (i >= 0) POSTS[i] = row; else POSTS.unshift(row); }); } catch (e) { } }
        if (/\/storage\/v1\/object/.test(p)) return json(r, { Key: p });
        return json(r, m === 'POST' ? [] : {}, m === 'POST' ? 201 : 200);
      }
      if (/\/rest\/v1\/posts/.test(p)) return json(r, POSTS.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))));
      if (/\/rest\/v1\/profiles/.test(p)) { if (process.env.DBG) log('profiles GET', u.slice(0, 200)); return json(r, PEOPLE); }
      return json(r, []);
    }
    if (/fonts\.(googleapis|gstatic)|cdn\.jsdelivr|unpkg|esm\.sh/.test(u)) return r.continue();
    return r.abort();
  });
  await ctx.addInitScript(([s, lang, local]) => { try {
    if (sessionStorage.getItem('fyprobe.init')) return; sessionStorage.setItem('fyprobe.init', '1');
    if (localStorage.getItem('fyprobe.done')) return; localStorage.setItem('fyprobe.done', '1');
    localStorage.setItem('lowi.auth', s); localStorage.setItem('lowi.gate', 'done');
    const dd = new Date(); localStorage.setItem('lowi.daily.seen', dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
    sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.done', '1');
    localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true, v: 99 }));
    localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 40, ledger: [], logs: [], saved: [], lang, user: { name: 'eman', bday: '1990-03-01' }, settings: { lang } }));
    if (local && local !== 'empty') localStorage.setItem('lowispike.foryou.v1', local);
  } catch (e) {} }, [JSON.stringify(Object.assign({}, SESSION, { expires_at: Math.floor(Date.now() / 1000) + 3000 })), process.env.LANG_APP || 'en', process.env.LOCAL_JSON || 'empty']);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  page.on('console', m => { if (/foryou|For You|TRIBE|publish/i.test(m.text())) log('[console]', m.text().slice(0, 200)); });
  const ungate = () => page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot', 'gate-up'); const a = document.getElementById('app'); if (a) a.removeAttribute('inert'); });
  const boot = async () => { await page.goto(URL + (URL.includes('?') ? '&' : '?') + 'fy=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await page.waitForTimeout(9000); await ungate(); };
  const openFy = async () => { await page.evaluate(() => { try { goTab('foryou'); } catch (e) { } }); await page.waitForTimeout(1500); await page.evaluate(() => { try { LowiRoomsUI.showView('fy'); } catch (e) { } }); await page.waitForTimeout(2000); };
  const state = (tag) => page.evaluate(([ME, tag]) => {
    const slides = [...document.querySelectorAll('#fyFeed .fy-slide[data-id]')].map(s => s.dataset.id);
    const cl = window.LOWI_CLOUD; const cloudMine = cl ? cl.posts().filter(p => p.uid === ME || p.me).map(p => p.id) : [];
    const box = document.querySelector('.rm-fy'); const r = box && box.getBoundingClientRect();
    let local = []; try { local = (JSON.parse(localStorage.getItem('lowispike.foryou.v1') || '{}').posts || []).map(p => p.id + ':' + p.vis + (p.pub ? ':pub' : '') + (p.fail ? ':fail' : '') + (p.pend ? ':pend' : '')); } catch (e) { }
    const B = window.LowiBotAccounts, botSlides = cl ? slides.filter(id => { const p = cl.post(id); return p && B && B.isBot(p); }) : [];
    const myIdx = cl ? slides.map((id, i) => [id, i]).filter(([id]) => { const p = cl.post(id); return p && p.uid === ME; }).map(x => x[1]) : [];
    return { tag, botIds: B ? B.size() : -1, botSlides: botSlides.length, myIdx, live: !!(cl && cl.live()), tab: (window.LowiRoomsUI && LowiRoomsUI.view()) || '', activeTab: (document.querySelector('.tab.active') || {}).id, fyBoxVisible: !!(r && r.width > 50 && r.height > 50 && !box.hidden), feedParent: (document.getElementById('cmPaneFeed') || {}).parentElement ? document.getElementById('cmPaneFeed').parentElement.className : 'none', slides: slides.length, firstSlides: slides.slice(0, 5), cloudMine, local };
  }, [ME, tag]);
  await boot();
  await openFy();
  if (process.env.DBG) log("DBG", await page.evaluate(async () => { const B = window.LowiBotAccounts; const r = {before: B.size()}; try { const ls = localStorage.getItem(B.KEY); r.ls = (ls || "").slice(0, 120); } catch (e) {} return JSON.stringify(r); }));
  let s = await state("open"); log(JSON.stringify(s));
  const mine = POSTS.filter(p => p.user_id === ME).map(p => p.id);
  const shown = new Set(await page.evaluate(() => [...document.querySelectorAll('#fyFeed .fy-slide[data-id]')].map(s => s.dataset.id)));
  log('his posts in DB:', mine.length, 'shown in For You:', mine.filter(i => shown.has(i)).length, 'missing:', mine.filter(i => !shown.has(i)).join(','));
  if (STEPS.includes('post')) {
    await page.evaluate(() => { LowiR3F.postSheet('', 'Probe text post ' + Date.now()); });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const b = document.getElementById('trPost'); if (b) { b.disabled = false; b.click(); } });
    await page.waitForTimeout(4000);
    s = await state('after-post'); log(JSON.stringify(s));
  }
  if (STEPS.includes('leave')) {
    await page.evaluate(() => { try { goTab('today'); } catch (e) { } }); await page.waitForTimeout(1500);
    await page.evaluate(() => { try { goTab('foryou'); } catch (e) { } }); await page.waitForTimeout(2500);
    s = await state('after-leave-return'); log(JSON.stringify(s));
  }
  if (STEPS.includes('reload')) {
    await boot(); await page.evaluate(() => { try { goTab('foryou'); } catch (e) { } }); await page.waitForTimeout(2500);
    s = await state('after-reload-no-tap'); log(JSON.stringify(s));
    await openFy(); s = await state('after-reload-open'); log(JSON.stringify(s));
  }
  if (STEPS.includes('resume')) {
    await openFy();
    await page.evaluate(() => { const f = document.getElementById('fyFeed'); const sl = f && f.querySelectorAll('.fy-slide[data-id]'); if (sl && sl[3]) f.scrollTop = sl[3].offsetTop; });
    await page.waitForTimeout(5000);
    const want = await page.evaluate(() => { const f = document.getElementById('fyFeed'); const sl = f.querySelectorAll('.fy-slide[data-id]'); return sl[3] && sl[3].dataset.id; });
    await page.evaluate(() => { try { goTab('today'); } catch (e) { } }); await page.waitForTimeout(2000);
    await page.evaluate(() => { try { goTab('foryou'); } catch (e) { } }); await page.waitForTimeout(2500);
    s = await state('in-session-back'); log(JSON.stringify({ tag: s.tag, tab: s.tab, fyBoxVisible: s.fyBoxVisible }));
    await page.waitForTimeout(5000);
    await boot(); await page.waitForTimeout(3000);
    const top = await page.evaluate(() => (window.LowiForYouStay && document.getElementById('fyFeed')) ? (() => { const f = document.getElementById('fyFeed'); for (const x of f.querySelectorAll('.fy-slide[data-id]')) if (x.offsetTop + x.offsetHeight / 2 > f.scrollTop) return x.dataset.id; return ''; })() : 'none');
    s = await state('after-ios-reload'); log(JSON.stringify({ tag: s.tag, tab: s.tab, activeTab: s.activeTab, fyBoxVisible: s.fyBoxVisible, want, top, same: want === top }));
  }
  if (STEPS.includes('offline')) {
    OFF = true; await boot(); await page.evaluate(() => { try { goTab('foryou'); LowiRoomsUI.showView('fy'); } catch (e) { } }); await page.waitForTimeout(2500);
    s = await state('offline-reload'); const ids = new Set(await page.evaluate(() => [...document.querySelectorAll('#fyFeed .fy-slide[data-id]')].map(x => x.dataset.id)));
    const demo = await page.evaluate(() => [...document.querySelectorAll('#fyFeed .fy-slide[data-id]')].filter(x => /^d\d|^demo/.test(x.dataset.id)).length);
    log(JSON.stringify({ tag: s.tag, live: s.live, slides: s.slides, hisShown: mine.filter(i => ids.has(i)).length + '/' + mine.length, demo, states: await page.evaluate(() => document.querySelectorAll('.fy-state').length) }));
    OFF = false;
  }
  log('writes:', JSON.stringify(writes.filter(w => /posts|storage/.test(w.p)).slice(0, 6)));
  log('errors:', JSON.stringify(errs.slice(0, 8)));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
