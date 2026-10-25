'use strict';
/* Oct 25, 2026: Room galaxy opens fitted to everyone, rows by join date (newest on top), every full name readable, no test accounts,
   a zoom you choose is kept, and the background behind the Room is clean. Simulated phone/iPad; the REAL profiles snapshot
   (PEOPLE, default /tmp/rf/all.json: id,name,lv,xp,bot,test,avatar,joined_at) is served as a fake Supabase, so nothing reaches
   the live server (writes are captured and printed). You are seated as Emmanuel's eman account (his join date).
   Usage: URL=http://127.0.0.1:8732/index.html [ENGINE=chromium|webkit] [W=390 H=844] [LANG_APP=de] [SHOT=/tmp/rf/x] node tools/room-fit/check-room.cjs */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const fs = require('fs');
const SB = 'https://vnfwmifmsfecascwaody.supabase.co';
const SESSION = JSON.parse(fs.readFileSync(process.env.SESSION || '/tmp/gb-sess.json', 'utf8'));
const URL = process.env.URL || 'http://127.0.0.1:8732/index.html';
const ME = SESSION.user.id, EMAN = '83077af7-8475-4628-9328-25bd335db240';
const ALL = JSON.parse(fs.readFileSync(process.env.PEOPLE || '/tmp/rf/all.json', 'utf8'));
const eman = ALL.find(p => p.id === EMAN) || {};
const base = { sign: '', mbti: '', streak: 0, bio: '', bday: '', xp_week: 0, wk: '', xp_month: 0, mo: '', weight: '' };
const profiles = ALL.filter(p => p.id !== EMAN).map(p => Object.assign({}, base, p));
profiles.push(Object.assign({}, base, { id: ME, name: 'eman', lv: eman.lv || 6, xp: eman.xp || 2000, bot: false, test: false, avatar: '', joined_at: eman.joined_at || '2026-10-09T21:05:30Z' }));
const writes = [];
(async () => {
  const eng = pw[process.env.ENGINE || 'chromium'], W = +process.env.W || 390, H = +process.env.H || 844;
  const browser = await eng.launch(process.env.ENGINE === 'webkit' ? {} : { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: process.env.ENGINE !== 'webkit' ? true : undefined, hasTouch: true, serviceWorkers: 'block' });
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
      if (/\/rest\/v1\/companion_rest/.test(p)) return json(r, [{ user_id: profiles[0].id, rx: 9999, ry: 9999, updated_at: '2026-10-25T10:00:00Z' }]); /* an old-layout spot: must be ignored */
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
    localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 2000, ledger: [], logs: [], saved: [], lang, user: { name: 'eman', bday: '1990-03-01' }, settings: { lang } }));
  } catch (e) {} }, [JSON.stringify(Object.assign({}, SESSION, { expires_at: Math.floor(Date.now() / 1000) + 3000 })), process.env.LANG_APP || 'de']);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await page.goto(URL + (URL.includes('?') ? '&' : '?') + 'rf=' + Date.now(), { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(9000);
  await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
  const openRoom = async () => { await page.evaluate(() => { try { goTab('foryou'); } catch (e) { } }); await page.waitForTimeout(2500); await page.evaluate(() => { try { goTab('foryou'); cmSeg('chat'); } catch (e) { } }); await page.waitForTimeout(3500); };
  await openRoom();
  const measure = () => page.evaluate(() => {
    const g = document.getElementById('cgGalaxy'), gr = g.getBoundingClientRect();
    const bodies = [...g.querySelectorAll('.cg-body')].map(e => { const o = e.querySelector('.cg-orb'), n = e.querySelector('.cg-name'), i = e.querySelector('.cg-ini'); const or = o.getBoundingClientRect(), nr = n && n.getBoundingClientRect(); const nv = n && getComputedStyle(n), iv = i && getComputedStyle(i);
      const nameShown = !!(nv && nv.display !== 'none' && nv.visibility !== 'hidden' && +nv.opacity > .3 && nr.width > 4);
      return { uid: e.getAttribute('data-uid'), label: n ? n.textContent : '', me: e.classList.contains('me'), nameShown, ini: !!(iv && iv.display !== 'none' && iv.visibility !== 'hidden'), cut: !!(n && n.scrollWidth > n.clientWidth + 1), at: e.getAttribute('data-at') || '', cls: e.className, ox: Math.round(or.x + or.width / 2), oy: Math.round(or.y + or.height / 2), os: Math.round(or.width), n: nr ? [Math.round(nr.x), Math.round(nr.y), Math.round(nr.width), Math.round(nr.height)] : null }; });
    const M = window.LowiCgMap; return { g: [Math.round(gr.x), Math.round(gr.y), Math.round(gr.width), Math.round(gr.height)], cam: M && M.cam(), fit: M && M.fit && M.fit(), user: M && M.user && M.user(), bodies };
  });
  const r1 = await measure();
  const [gx, gy, gw, gh] = r1.g;
  const off = r1.bodies.filter(b => b.ox < gx || b.ox > gx + gw || b.oy < gy || b.oy > gy + gh);
  const noName = r1.bodies.filter(b => !b.me && !b.nameShown);
  const ovl = []; for (const a of r1.bodies) for (const b of r1.bodies) if (a !== b && a.n && b.n && a.nameShown && b.nameShown && a.uid < b.uid) { const [x1, y1, w1, h1] = a.n, [x2, y2, w2, h2] = b.n; if (x1 < x2 + w2 && x2 < x1 + w1 && y1 < y2 + h2 && y2 < y1 + h1) ovl.push(a.label + '/' + b.label); }
  const flag = new Map(ALL.map(p => [p.id, p]));
  const tests = r1.bodies.filter(b => { const f = flag.get(b.uid); return f && (f.test || f.bot); });
  /* rows: newest join on top */
  const withJ = r1.bodies.filter(b => !b.me && flag.get(b.uid)).map(b => ({ l: b.label, y: b.oy, j: Date.parse(flag.get(b.uid).joined_at) }));
  let inversions = 0; for (const a of withJ) for (const b of withJ) if (a.j > b.j && a.y > b.y + 40) inversions++;
  console.log(JSON.stringify({ engine: process.env.ENGINE || 'chromium', size: W + 'x' + H, galaxy: r1.g, cam: r1.cam, fit: r1.fit, bodies: r1.bodies.length, offscreen: off.map(b => b.label), withoutName: noName.map(b => b.label || b.uid), cutNames: r1.bodies.filter(b => b.cut).map(b => b.label), nameOverlaps: ovl, testOrBot: tests.map(b => b.label), rowInversions: inversions }));
  for (const b of r1.bodies.slice().sort((a, b) => a.oy - b.oy || a.ox - b.ox)) console.log('   ' + JSON.stringify(b.label).padEnd(26) + (b.me ? 'YOU ' : '    ') + (b.nameShown ? 'name' : b.ini ? 'INITIAL' : 'NO NAME') + (b.cut ? ' (cut)' : '') + '  orb ' + b.ox + ',' + b.oy + '  joined ' + ((flag.get(b.uid) || {}).joined_at || '').slice(0, 10));
  for (const b of r1.bodies) if (!b.nameShown && !b.me) console.log('   no-name detail: ' + JSON.stringify(b));
  console.log('energy pad keep-out (galaxy px): ' + JSON.stringify(await page.evaluate(() => { const g = document.getElementById('cgGalaxy'); return window.LowiEnergy && LowiEnergy.keepOut ? LowiEnergy.keepOut(g) : null; })));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-open.png' });
  /* background behind the Room: what else is painted under the galaxy? */
  const bg = await page.evaluate(() => { const out = []; const g = document.getElementById('cgGalaxy'); const r = g.getBoundingClientRect(); const pts = [[.15, .2], [.85, .25], [.5, .5], [.2, .8], [.8, .85]];
    for (const [fx, fy] of pts) { const els = document.elementsFromPoint(r.x + r.width * fx, r.y + r.height * fy).slice(0, 14).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + (getComputedStyle(e).opacity !== '1' ? '[o=' + getComputedStyle(e).opacity + ']' : '')); out.push(els.join(' > ')); } return out; });
  console.log('stack under the Room:'); for (const s of bg) console.log('   ' + s);
  /* every painted layer that covers the Room area and is not part of the galaxy itself */
  const layers = await page.evaluate(() => { const g = document.getElementById('cgGalaxy'), r = g.getBoundingClientRect(), out = [];
    for (const e of document.querySelectorAll('body *')) { if (g.contains(e) || e.contains(g)) continue; const b = e.getBoundingClientRect(); if (b.width < 40 || b.height < 40) continue;
      if (b.right < r.x || b.x > r.right || b.bottom < r.y || b.y > r.bottom) continue; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      let p = e, hid = false; while (p && p !== document.body) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) { hid = true; break; } p = p.parentElement; } if (hid) continue;
      const paints = e.tagName === 'CANVAS' || e.tagName === 'IMG' || e.tagName === 'svg' || (cs.backgroundImage && cs.backgroundImage !== 'none') || (cs.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) || (cs.boxShadow && cs.boxShadow !== 'none') || (cs.borderTopWidth !== '0px' && cs.borderTopStyle !== 'none');
      if (!paints) continue; out.push((e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '')) + ' z=' + cs.zIndex + ' pos=' + cs.position + ' o=' + cs.opacity + ' ' + [b.x, b.y, b.width, b.height].map(Math.round).join(',') + (cs.backgroundImage !== 'none' ? ' bg=' + cs.backgroundImage.slice(0, 90) : '') + (cs.backgroundColor ? ' col=' + cs.backgroundColor : '')); }
    return out; });
  console.log('layers over the Room area:'); for (const l of layers) console.log('   ' + l);
  const anc = await page.evaluate(() => { const out = []; const desc = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
    const g = document.getElementById('cgGalaxy'); const show = (e, tag) => { for (const ps of [null, '::before', '::after']) { const cs = getComputedStyle(e, ps); if (ps && (cs.content === 'none' || cs.display === 'none')) continue; const bi = cs.backgroundImage, bc = cs.backgroundColor; if ((bi && bi !== 'none') || (bc && !/rgba\(0, 0, 0, 0\)/.test(bc)) || (ps && cs.content !== 'none')) out.push(tag + desc(e) + (ps || '') + ' o=' + cs.opacity + ' z=' + cs.zIndex + ' bg=' + String(bi).slice(0, 160) + ' col=' + bc + ' anim=' + cs.animationName); } };
    for (let p = g; p && p !== document.documentElement; p = p.parentElement) show(p, 'ANC ');
    for (const e of g.querySelectorAll('*')) { if (e.closest('.cg-body')) continue; const b = e.getBoundingClientRect(); if (b.width < 30) continue; show(e, 'IN  '); if (e.tagName === 'CANVAS' || e.tagName === 'svg') out.push('IN  ' + desc(e) + ' ' + [b.x, b.y, b.width, b.height].map(Math.round).join(',')); }
    return out; });
  console.log('room ancestors / inside:'); for (const l of anc) console.log('   ' + l);
  /* a zoom you choose is kept when you leave Community and come back */
  /* Oct 25: a mouse wheel is not delivered in mobile emulation, so pinch with two touch pointers through the Room's own
     pointer handlers (the same code path a finger uses): fingers 60 px apart spread to 160 px around the middle */
  const z0 = (await measure()).cam;
  await page.evaluate(() => { const g = document.getElementById('cgGalaxy'), r = g.getBoundingClientRect(), cx = r.x + r.width / 2, cy = r.y + r.height * .45;
    const ev = (type, id, x) => g.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 1, bubbles: true, cancelable: true, clientX: x, clientY: cy, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    ev('pointerdown', 1, cx - 30); ev('pointerdown', 2, cx + 30);
    for (let k = 1; k <= 10; k++) { ev('pointermove', 1, cx - 30 - 5 * k); ev('pointermove', 2, cx + 30 + 5 * k); }
    ev('pointerup', 1, cx - 80); ev('pointerup', 2, cx + 80); });
  await page.waitForTimeout(700);
  const zm = await measure(), z1 = zm.cam;
  console.log('pinch: ' + JSON.stringify({ before: z0, after: z1, user: zm.user, zoomedIn: !!(z0 && z1 && z1.z > z0.z * 1.3) }));
  await page.evaluate(() => { try { goTab('home'); } catch (e) { } }); await page.waitForTimeout(2500);
  await openRoom();
  const r2 = await measure();
  console.log('names after pinch, back in Room: ' + JSON.stringify({ withoutName: r2.bodies.filter(b => !b.me && !b.nameShown && b.ox > r2.g[0] && b.ox < r2.g[0] + r2.g[2] && b.oy > r2.g[1] && b.oy < r2.g[1] + r2.g[3]).map(b => b.label) }));
  console.log('manual zoom kept: ' + JSON.stringify({ zoomed: z1, back: r2.cam, user: r2.user, kept: !!(z1 && r2.cam && zm.user && z0 && z1.z > z0.z * 1.3 && Math.abs(z1.z - r2.cam.z) < .02) }));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-zoomed.png' });
  if (process.env.IDLE) {
    /* Oct 25 heat: Room draws ~30/s while touched, ~20/s after 3 s idle, bobbing held and stepped; a touch brings full speed back */
    await page.evaluate(() => { const c = document.getElementById('cgSky').getContext('2d'), o = c.clearRect.bind(c); window.__skyN = 0; c.clearRect = (...a) => { window.__skyN++; return o(...a); }; });
    const count = async ms => { await page.evaluate(() => { window.__skyN = 0; }); await page.waitForTimeout(ms); return page.evaluate(() => window.__skyN); };
    const bobs = () => page.evaluate(() => { const g = document.getElementById('cgGalaxy'); const a = g.getAnimations({ subtree: true }).filter(x => x.animationName === 'cgBob'); return { n: a.length, running: a.filter(x => x.playState === 'running').length, t: a[0] ? Math.round(a[0].currentTime) : null }; });
    const touch = () => page.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' })));
    await touch(); const act = await count(2000); const bA = await bobs();
    await page.waitForTimeout(2000); const calm = await count(4000); const bC1 = await bobs(); await page.waitForTimeout(1000); const bC2 = await bobs();
    await touch(); await page.waitForTimeout(50); const bT = await bobs(); const back = (await count(2000)) / 2;
    console.log('idle pace: ' + JSON.stringify({ touchedPerS: act / 2, calmPerS: calm / 4, afterTouchPerS: back, bobTouched: bA, bobCalm: bC1, bobCalm1sLater: bC2, bobAfterTouch: bT }));
  }
  for (const w of writes) console.log('write: ' + w.m + ' ' + w.p + ' ' + String(w.body || '').slice(0, 160));
  console.log('page errors: ' + (errs.join(' / ') || 'none'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
