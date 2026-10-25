'use strict';
/* Oct 25, 2026 (TikTok thumbnails / open in the TikTok app / "Show the creator some love"), built on tools/foryou-fix/probe.cjs.
   Stand-in Supabase for posts/profiles/auth (nothing is written to the live tables); the stored pictures (storage GET) and the
   tiktok-meta function (only already-stored posts, so it answers from what is there) go to the real server and are logged.
   STANDALONE=1 pretends the iOS Home Screen app. Old header: (For You keeps losing posts): opens the app signed in as a given account with a snapshot of the REAL posts and
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
const fnCalls = [];
const writes = []; let OFF = false;
const log = (...a) => console.log(...a);
(async () => {
  const eng = pw[process.env.ENGINE || 'chromium'];
  const browser = await eng.launch(process.env.ENGINE === 'webkit' ? {} : { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', viewport: { width: +process.env.W || 390, height: +process.env.H || 844 }, deviceScaleFactor: 2, isMobile: process.env.ENGINE !== 'webkit' ? true : undefined, hasTouch: true, serviceWorkers: 'block' });
  await ctx.routeWebSocket(/.*/, ws => ws.close());
  const json = (r, body, status) => r.fulfill({ status: status || 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-range': '0-0/*' }, body: JSON.stringify(body) });
  await ctx.route('**/*', async r => {
    const q = r.request(), u = q.url(), m = q.method();
    if (u.startsWith(URL.replace(/\/[^/]*$/, '/'))) return r.continue();
    if (u.startsWith(SB) && (/\/storage\/v1\/(render\/image|object)\/public\/media\/tiktok\//.test(u)) && (m === 'GET' || m === 'HEAD')) return r.continue();
    if (u.startsWith(SB) && /\/functions\/v1\/tiktok-meta/.test(u)) { if (m === 'POST') fnCalls.push((q.postData() || '').slice(0, 120)); return r.continue(); }
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
  if (process.env.STANDALONE === '1') await ctx.addInitScript(() => { try {
    Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
    const mm = window.matchMedia.bind(window); window.matchMedia = q => /display-mode:\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q);
  } catch (e) {} });
  await ctx.addInitScript(([s, lang, local]) => { try {
    if (sessionStorage.getItem('fyprobe.init')) return; sessionStorage.setItem('fyprobe.init', '1');
    if (localStorage.getItem('fyprobe.done')) return; localStorage.setItem('fyprobe.done', '1');
    localStorage.setItem('lowi.auth', s); localStorage.setItem('lowi.lang', lang); localStorage.setItem('lowispike.lang', lang); localStorage.setItem('lowi.gate', 'done');
    const dd = new Date(); localStorage.setItem('lowi.daily.seen', dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
    sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.done', '1');
    localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true, v: 99 }));
    localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 40, ledger: [], logs: [], saved: [], lang, user: { name: 'eman', bday: '1990-03-01' }, settings: { lang } }));
    if (local && local !== 'empty') localStorage.setItem('lowispike.foryou.v1', local);
  } catch (e) {} }, [JSON.stringify(Object.assign({}, SESSION, { expires_at: Math.floor(Date.now() / 1000) + 3000 })), process.env.LANG_APP || 'en', process.env.LOCAL_JSON || 'empty']);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  const ungate = () => page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot', 'gate-up'); const a = document.getElementById('app'); if (a) a.removeAttribute('inert'); });
  await page.goto(URL + (URL.includes('?') ? '&' : '?') + 'fy=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await page.waitForTimeout(9000); await ungate();
  await page.evaluate(() => { try { goTab('foryou'); } catch (e) { } }); await page.waitForTimeout(1500);
  await page.evaluate(() => { try { LowiRoomsUI.showView('fy'); } catch (e) { } }); await page.waitForTimeout(2500);
  const ids = await page.evaluate(() => [...document.querySelectorAll('#fyFeed .fy-slide[data-id]')].filter(s => s.querySelector('.fy-art-ext')).map(s => s.dataset.id));
  const tt = POSTS.filter(p => /tiktok\.com/.test(p.url || '')).map(p => p.id);
  log('external slides:', ids.length, 'TikTok posts in DB:', tt.length, 'shown:', tt.filter(i => ids.includes(i)).length);
  for (const id of ids) { await page.evaluate(id => { const f = document.getElementById('fyFeed'), s = f.querySelector('.fy-slide[data-id="' + id + '"]'); if (s) f.scrollTop = s.offsetTop; }, id); await page.waitForTimeout(900); }
  await page.waitForTimeout(3000);
  const rows = await page.evaluate(() => [...document.querySelectorAll('#fyFeed .fy-slide[data-id]')].filter(s => s.querySelector('.fy-art-ext')).map(s => {
    const box = s.querySelector('.fy-art-ext'), img = box.querySelector('img'), br = box.getBoundingClientRect(), ir = img && img.getBoundingClientRect();
    return { id: s.dataset.id, img: !!img, loaded: !!(img && img.complete && img.naturalWidth > 0), nat: img ? img.naturalWidth + 'x' + img.naturalHeight : '', sized: !!(img && /render\/image\/public\/media\/tiktok\//.test(img.currentSrc || img.src)),
      fit: img ? getComputedStyle(img).objectFit : '', fills: !!(ir && Math.abs(ir.width - br.width) < 2 && Math.abs(ir.height - br.height) < 2), lazy: img ? img.getAttribute('loading') : '',
      btn: (s.querySelector('.fy-out b') || {}).textContent || '', by: (s.querySelector('.fy-out small') || {}).textContent || '', sub: (s.querySelector('.fy-love') || {}).textContent || '',
      heart: !!(s.querySelector('.fy-love svg, .fy-love .sp-ui-copy')), vis: (() => { const o = s.querySelector('.fy-out'), l = s.querySelector('.fy-love'), r = s.querySelector('.fy-rail'), sr = s.getBoundingClientRect(); if (!o) return ''; const a = o.getBoundingClientRect(), b = l ? l.getBoundingClientRect() : a, c = r ? r.getBoundingClientRect() : null, hit = (x, y) => x && y && x.left < y.right && y.left < x.right && x.top < y.bottom && y.top < x.bottom; const top = document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2); return [Math.round(a.width) + 'x' + Math.round(a.height), 'inSlide:' + (a.top >= sr.top && b.bottom <= sr.bottom), 'railOverlap:' + (hit(a, c) || hit(b, c)), 'tappable:' + !!(top && top.closest('.fy-out'))].join(' '); })(), rail: [...s.querySelectorAll('.fy-rail .fy-act')].map(b => b.dataset.tr || b.className.replace(/\s+/g, '.')), aria: (s.querySelector('.fy-art-ext [data-tr="open"], .fy-art-ext[data-tr="open"], [data-tr="open"][aria-label]') || { getAttribute: () => '' }).getAttribute('aria-label') };
  }));
  rows.forEach(r => log(JSON.stringify(r)));
  const other = await page.evaluate(() => { const s = [...document.querySelectorAll('#fyFeed .fy-slide[data-id]')].find(s => !s.querySelector('.fy-art-ext')); return s ? { id: s.dataset.id, rail: [...s.querySelectorAll('.fy-rail .fy-act')].map(b => b.dataset.tr || b.className) } : null; });
  log('non-creator slide rail:', JSON.stringify(other));
  if (STEPS.includes('tap')) {
    const target = process.env.TAP || 'tmvnlfx69jobzd';
    await page.evaluate(() => { window.__nav = []; window.__open = []; LowiTikTok._go = u => window.__nav.push(u); const o = window.open; window.open = (u, t, f) => { window.__open.push(String(u)); return null; }; });
    await page.evaluate(id => { const f = document.getElementById('fyFeed'), s = f.querySelector('.fy-slide[data-id="' + id + '"]'); f.scrollTop = s.offsetTop; }, target); await page.waitForTimeout(1200);
    const playSel = '#fyFeed .fy-slide[data-id="' + target + '"] [data-tr="open"]';
    const n = await page.locator(playSel).count();
    await page.locator(playSel).first().tap({ timeout: 8000 }); await page.waitForTimeout(400);
    const a1 = await page.evaluate(() => ({ nav: window.__nav.slice(), open: window.__open.slice() }));
    await page.waitForTimeout(2600);
    const hint = await page.evaluate(id => (document.querySelector('#fyFeed .fy-slide[data-id="' + id + '"] .fy-out small') || { textContent: '(none)' }).textContent, target);
    await page.locator('#fyFeed .fy-slide[data-id="' + target + '"] .fy-out').first().tap({ timeout: 8000 }); await page.waitForTimeout(400);
    const a2 = await page.evaluate(() => ({ nav: window.__nav.slice(), open: window.__open.slice() }));
    const after = await page.evaluate(id => (document.querySelector('#fyFeed .fy-slide[data-id="' + id + '"] .fy-out small') || { textContent: '(none)' }).textContent, target);
    log('tap', JSON.stringify({ openControls: n, first: a1, hintAfter2_5s: hint, second: a2, labelAfterSecond: after, lang: await page.evaluate(() => document.documentElement.lang) }));
  }
  if (STEPS.includes('composer')) log('composer meta', JSON.stringify(await page.evaluate(() => LowiTikTok.meta('https://www.tiktok.com/@glowwithshiva/video/7696524020799327520'))));
  log('tiktok-meta calls:', fnCalls.length, JSON.stringify(fnCalls.slice(0, 4)));
  log('writes:', JSON.stringify(writes.filter(w => /posts|storage/.test(w.p)).slice(0, 6)));
  log('local copy stored picture:', await page.evaluate(() => { try { const ps = JSON.parse(localStorage.getItem('lowispike.foryou.v1') || '{}').posts || []; const t = ps.filter(p => /tiktok/.test(p.url || '')); return t.filter(p => LowiTikTok.stable(p.meta && p.meta.thumb)).length + '/' + t.length; } catch (e) { return 'err ' + e.message; } }));
  log('errors:', JSON.stringify(errs.slice(0, 8)));
  if (process.env.SHOT) { await page.evaluate(id => { const f = document.getElementById('fyFeed'), s = f.querySelector('.fy-slide[data-id="' + id + '"]'); if (s) f.scrollTop = s.offsetTop; }, process.env.TAP || 'tmvnlfx69jobzd'); await page.waitForTimeout(1500); await page.screenshot({ path: process.env.SHOT }); }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
