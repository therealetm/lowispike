'use strict';
/* Oct 25, 2026: end-to-end check of the Room galaxy (no bots, offline companions parked + dim, online glow, names, energy gift and
   companion_rest) in a simulated phone/iPad, with the REAL profiles snapshot (/tmp/gb-all.json) served as a fake Supabase.
   Nothing reaches the live server: every Supabase call is answered here, writes are captured and printed.
   Usage: URL=http://127.0.0.1:8731/index.html [ENGINE=chromium|webkit] [W=390 H=844] [LANG=en] [SHOT=/tmp/gbo] node tools/galaxy-bots/check-local.cjs */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const fs = require('fs');
const SB = 'https://vnfwmifmsfecascwaody.supabase.co';
const SESSION = JSON.parse(fs.readFileSync(process.env.SESSION || '/tmp/gb-sess.json', 'utf8'));
const URL = process.env.URL || 'http://127.0.0.1:8731/index.html';
const ME = SESSION.user.id;
const ALL = JSON.parse(fs.readFileSync(process.env.PEOPLE || '/tmp/gb-all.json', 'utf8'));
const profiles = ALL.map(p => Object.assign({ sign: '', mbti: '', streak: 0, bio: '', bday: '', xp: p.lv * 100, xp_week: 0, wk: '', xp_month: 0, mo: '', weight: '' }, p));
profiles.push({ id: ME, name: 'Probe Visitor', lv: 2, xp: 50, bot: false, test: false, avatar: '', sign: '', mbti: '', streak: 0, bio: '', bday: '', xp_week: 0, wk: '', xp_month: 0, mo: '', weight: '' });
const ANTJE = (ALL.find(p => /^antje$/i.test(p.name) && !p.bot && !p.test) || {}).id;
const REST = process.env.REST_UID || (ALL.find(p => /^christa/i.test(p.name) && !p.bot && !p.test) || {}).id;
const writes = [];
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
      if (m === 'OPTIONS') return json(r, {});
      const p = u.replace(SB, '').split('?')[0];
      if (/\/auth\/v1\/user/.test(p)) return json(r, SESSION.user);
      if (/\/auth\/v1\/token/.test(p)) return json(r, Object.assign({}, SESSION, { expires_at: Math.floor(Date.now() / 1000) + 3000, expires_in: 3000 }));
      if (m !== 'GET' && m !== 'HEAD') { writes.push({ m, p, body: q.postData() }); return json(r, m === 'POST' ? [] : {}, m === 'POST' ? 201 : 200); }
      if (/\/rest\/v1\/profiles/.test(p)) return json(r, profiles);
      if (/\/rest\/v1\/companion_rest/.test(p)) return json(r, REST ? [{ user_id: REST, rx: 77, ry: -55, updated_at: new Date().toISOString() }] : []);
      if (/\/rest\/v1\/(chat_messages|messages|community_messages)/.test(p) && ANTJE) return json(r, [{ id: 'gb-m1', room: 'global', user_id: ANTJE, uid: ANTJE, name: 'Antje', by: 'Antje', text: 'hallo', t: 'hallo', created_at: new Date(Date.now() - 60e3).toISOString(), ts: Date.now() - 60e3 }]);
      return json(r, []);
    }
    if (/fonts\.(googleapis|gstatic)|cdn\.jsdelivr|unpkg|esm\.sh/.test(u)) return r.continue();
    return r.abort();
  });
  await ctx.addInitScript(([s, lang]) => { try {
    localStorage.setItem('lowi.auth', s); localStorage.setItem('lowi.gate', 'done');
    const dd = new Date(); localStorage.setItem('lowi.daily.seen', dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
    sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.done', '1');
    localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true, v: 99 }));
    localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 40, ledger: [], logs: [], saved: [], lang, user: { name: 'Probe Visitor', bday: '1990-01-01' }, settings: { lang } }));
  } catch (e) {} }, [JSON.stringify(Object.assign({}, SESSION, { expires_at: Math.floor(Date.now() / 1000) + 3000 })), process.env.LANG_APP || 'en']);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await page.goto(URL + (URL.includes('?') ? '&' : '?') + 'gb=' + Date.now(), { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(9000);
  await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
  await page.evaluate(() => { try { goTab('foryou'); } catch (e) { } });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { try { goTab('foryou'); cmSeg('chat'); } catch (e) { } });
  await page.waitForTimeout(3500);
  const bodies = await page.evaluate(() => [...document.querySelectorAll('#cgGalaxy .cg-body')].map(e => { const r = e.getBoundingClientRect(), n = e.querySelector('.cg-name'), i = e.querySelector('.cg-ini'), o = e.querySelector('.cg-orb'); const nv = n && getComputedStyle(n), iv = i && getComputedStyle(i), ov = o && getComputedStyle(o); return { uid: e.getAttribute('data-uid'), label: n ? n.textContent : '', cls: e.className, nameShown: !!(nv && nv.display !== 'none' && +nv.opacity > .3), iniShown: !!(iv && iv.display !== 'none'), orbOpacity: ov ? +ov.opacity : null, glow: ov ? ov.boxShadow.length > 40 : false, x: Math.round(r.x + r.width / 2), y: Math.round(r.y) }; }));
  const flag = new Map(ALL.map(p => [p.id, p]));
  const bad = bodies.filter(b => { const f = flag.get(b.uid); return /^bot:/.test(b.uid || '') || (f && (f.bot || f.test)) || / - bot$/.test(b.label); });
  const gbox = await page.evaluate(() => { const r = document.getElementById('cgGalaxy').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const inside = b => b.x > gbox.x + 40 && b.x < gbox.x + gbox.w - 40 && b.y > gbox.y + 30 && b.y < gbox.y + gbox.h - 110;
  const nameless = bodies.filter(b => !b.nameShown && !b.iniShown && !/\bme\b/.test(b.cls) && inside(b));
  const nn = b => /cg-nn/.test(b.cls);
  const away = bodies.filter(b => /cg-away/.test(b.cls)), live = bodies.filter(b => /cg-live/.test(b.cls));
  console.log(JSON.stringify({ engine: process.env.ENGINE || 'chromium', size: (process.env.W || 390) + 'x' + (process.env.H || 844), bodies: bodies.length, bots: bad.length, nameless: nameless.length, away: away.length, live: live.length, awayOpacity: away[0] && away[0].orbOpacity, liveGlow: live[0] && live[0].glow }));
  for (const b of bodies) console.log(['  ', (b.uid || '').slice(0, 10).padEnd(11), JSON.stringify(b.label).padEnd(22), b.cls.replace(/\s+/g, ' ').slice(0, 60).padEnd(60), b.nameShown ? 'name' : b.iniShown ? 'initial' : 'NO NAME', b.x + ',' + b.y].join(' '));
  console.log('galaxy box: ' + JSON.stringify(await page.evaluate(() => { const g = document.getElementById('cgGalaxy'); const r = g && g.getBoundingClientRect(); const c = document.querySelector('#cmPaneChat .cg-compose, #cgCompose'); const cr = c && c.getBoundingClientRect(); return { g: r && [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], compose: cr && Math.round(cr.y) }; })));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-galaxy.png' });
  /* companion_rest: the fake server says REST sits at room (77,-55) */
  const restInfo = await page.evaluate(uid => { const E = window.LowiEnergy; return { stats: E && E.stats ? E.stats() : null }; }, REST);
  console.log('rest load: ' + JSON.stringify({ restLoaded: restInfo.stats && restInfo.stats.restLoaded }));
  /* energy: shoot at an offline real companion */
  const tgt = away.find(b => b.uid && b.uid !== REST) || away[0];
  if (tgt) {
    const me = bodies.find(b => /\bme\b/.test(b.cls));
    const before = await page.evaluate(() => window.LowiEnergy.stats());
    await page.evaluate(([tx, ty]) => { const me = document.querySelector('#cgGalaxy .cg-body.me .cg-orb'); const r = me.getBoundingClientRect(); const ang = Math.atan2(ty - (r.y + r.height / 2), tx - (r.x + r.width / 2)); window.LowiEnergy.fire(ang, 1); }, [tgt.x, tgt.y + 20]);
    await page.waitForTimeout(+process.env.SHOT_WAIT || 9000);
    const after = await page.evaluate(() => window.LowiEnergy.stats());
    console.log('stats: ' + JSON.stringify(after) + ' state: ' + JSON.stringify(await page.evaluate(() => window.LowiEnergy.state())) + ' fps: ' + await page.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); })));
    console.log('shot at ' + JSON.stringify(tgt.label) + ' (offline): ' + JSON.stringify({ gifts: (after.gifts || 0) - (before.gifts || 0), restSent: after.restSent || 0, me: !!me }));
  }
  for (const w of writes) console.log('write: ' + w.m + ' ' + w.p + ' ' + String(w.body || '').slice(0, 220));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-after.png' });
  console.log('page errors: ' + (errs.join(' / ') || 'none'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
