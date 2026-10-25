'use strict';
/* Oct 25, 2026 (readability + fit): shared Playwright harness. Opens LOWiSPIKE signed in, with a fake Supabase that serves a
   profiles snapshot (PEOPLE, default /tmp/rf/all.json, else a small built-in list) and swallows every write, so nothing reaches
   the live server. Optional safe-area insets are applied through the Chrome DevTools protocol when the engine supports it.
   Used by tools/readfit/audit.cjs and tools/readfit/room-shot.cjs. */
const fs = require('fs');
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const SB = 'https://vnfwmifmsfecascwaody.supabase.co';
const SESSION_FILE = process.env.SESSION || '/tmp/gb-sess.json';
const EMAN = '83077af7-8475-4628-9328-25bd335db240';

function people(meId) {
  let all = [];
  try { all = JSON.parse(fs.readFileSync(process.env.PEOPLE || '/tmp/rf/all.json', 'utf8')); } catch (e) {
    const names = ['Luise', 'Natalie', 'Marleys Puello yeneris', 'Mayfall', 'Jasmine', 'Bernice', 'Liesl', 'Sani', 'Antje', 'Christabel', 'Eleonora', 'Q', 'Emmy', 'Joseph Castellar'];
    all = names.map((n, i) => ({ id: '00000000-0000-4000-8000-' + String(i + 1).padStart(12, '0'), name: n, lv: 1 + (i % 6), xp: 50 * i, bot: false, test: false, avatar: '', joined_at: new Date(Date.UTC(2026, 9, 25 - i)).toISOString() }));
  }
  const eman = all.find(p => p.id === EMAN) || {};
  const base = { sign: '', mbti: '', streak: 0, bio: '', bday: '', xp_week: 0, wk: '', xp_month: 0, mo: '', weight: '' };
  const list = all.filter(p => p.id !== EMAN).map(p => Object.assign({}, base, p));
  list.push(Object.assign({}, base, { id: meId, name: 'eman', lv: eman.lv || 6, xp: eman.xp || 2000, bot: false, test: false, avatar: '', joined_at: eman.joined_at || '2026-10-09T21:05:30Z' }));
  return list;
}

/* opts: {engine, w, h, lang, theme:'dark'|'light', zoom (1.25 = larger text), inset:{top,bottom,left,right}, url} */
async function open(opts) {
  const engineName = opts.engine || 'chromium';
  const SESSION = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  const ME = SESSION.user.id;
  const profiles = people(ME);
  const URL = opts.url || process.env.URL || 'http://127.0.0.1:8733/index.html';
  const browser = opts.browser || await pw[engineName].launch(engineName === 'webkit' ? {} : { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: opts.w, height: opts.h }, deviceScaleFactor: opts.dpr || 2, isMobile: engineName !== 'webkit' ? true : undefined, hasTouch: true, serviceWorkers: 'block', colorScheme: opts.theme === 'light' ? 'light' : 'dark', reducedMotion: 'reduce' });
  await ctx.routeWebSocket(/.*/, ws => ws.close());
  const writes = [];
  const json = (r, body, status) => r.fulfill({ status: status || 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-range': '0-0/*' }, body: JSON.stringify(body) });
  const origin = URL.replace(/\/[^/]*(\?.*)?$/, '/');
  await ctx.route('**/*', async r => {
    const q = r.request(), u = q.url(), m = q.method();
    if (u.startsWith(origin)) return r.continue();
    if (u.startsWith(SB)) {
      if (m === 'OPTIONS') return json(r, {});
      const p = u.replace(SB, '').split('?')[0];
      if (/\/auth\/v1\/user/.test(p)) return json(r, SESSION.user);
      if (/\/auth\/v1\/token/.test(p)) return json(r, Object.assign({}, SESSION, { expires_at: Math.floor(Date.now() / 1000) + 3000, expires_in: 3000 }));
      if (m !== 'GET' && m !== 'HEAD') { writes.push({ m, p }); return json(r, m === 'POST' ? [] : {}, m === 'POST' ? 201 : 200); }
      if (/\/rest\/v1\/profiles/.test(p)) return json(r, profiles);
      return json(r, []);
    }
    if (/fonts\.(googleapis|gstatic)|cdn\.jsdelivr|unpkg|esm\.sh/.test(u)) return r.continue();
    return r.abort();
  });
  const lang = opts.lang || 'en';
  await ctx.addInitScript(([s, lang, theme]) => { try {
    localStorage.setItem('lowi.auth', s); localStorage.setItem('lowi.gate', 'done');
    const dd = new Date(); localStorage.setItem('lowi.daily.seen', dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
    sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.done', '1');
    localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true, v: 99 }));
    localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 2000, ledger: [], logs: [], saved: [], lang, theme, user: { name: 'eman', bday: '1990-03-01' }, settings: { lang, theme } }));
    if (theme) { localStorage.setItem('lowi.theme', theme); localStorage.setItem('lowi.appearance', theme); }
  } catch (e) {} }, [JSON.stringify(Object.assign({}, SESSION, { expires_at: Math.floor(Date.now() / 1000) + 3000 })), lang, opts.theme || 'dark']);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  let insetApplied = false;
  if (opts.inset && engineName === 'chromium') {
    try {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: opts.inset.top || 0, topMax: opts.inset.top || 0, bottom: opts.inset.bottom || 0, bottomMax: opts.inset.bottom || 0, left: opts.inset.left || 0, leftMax: opts.inset.left || 0, right: opts.inset.right || 0, rightMax: opts.inset.right || 0 } });
      insetApplied = true;
    } catch (e) { insetApplied = false; }
  }
  await page.goto(URL + (URL.includes('?') ? '&' : '?') + 'rf=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(+process.env.BOOT_MS || 9000);
  await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
  if (opts.zoom && opts.zoom !== 1) await page.evaluate(z => { document.documentElement.style.setProperty('-webkit-text-size-adjust', Math.round(z * 100) + '%'); document.documentElement.style.fontSize = Math.round(z * 100) + '%'; document.documentElement.classList.add('rf-bigtext'); }, opts.zoom);
  return { browser, ctx, page, errs, writes, insetApplied, ME };
}

async function openRoom(page) {
  await page.evaluate(() => { try { goTab('foryou'); } catch (e) { } }); await page.waitForTimeout(2500);
  await page.evaluate(() => { try { goTab('foryou'); cmSeg('chat'); } catch (e) { } }); await page.waitForTimeout(3500);
}

module.exports = { open, openRoom, people, SB, EMAN };
