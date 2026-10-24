'use strict';
/* Browser simulation (not a real phone) for the Oct 24 2026 Circles nuke (Emmanuel: "nuke Circle ... so that we just have one
   chat ... Nuke everything that has to do with being able to open multiple rooms"). Real cloud, one marked test account:
   Community opens, every tab (Raum, Chat, Fuer dich, Studio, Rangliste) opens from its own tab button, the Chat shows the one
   shared chat with its messages and the composer, the Raum draws, this phone is in the one room 'all', the menu has People
   and no Circles / rooms / find, no text anywhere says Circle(s), and back closes Community without leaving the app.
   Sends nothing to the chat. node tools/one-chat/check.cjs [--url LIVE] [--views i13,ipad,ipadl] [--langs en,de] */
const path = require('path'), fs = require('fs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TA = require('../test-account.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL0 = arg('url', 'https://therealetm.github.io/lowispike/'), OUT = arg('out', '/tmp/one-chat-shots');
const ENG = process.env.ENGINE || 'chromium';
const VIEWS = { i13: ['iPhone 13'], se: ['iPhone SE'], ipad: ['iPad (gen 7)'], ipadl: ['iPad (gen 7) landscape'] };
const CIRCLE = /\bCircles?\b|Círculos?\b|\bKreise\b|Room \d|Raum \d|Sala \d|Chat rooms & people|Find someone|Jemanden finden|Buscar a alguien/;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let fail = 0;
  for (const v of arg('views', 'i13,ipad,ipadl').split(',')) for (const lang of arg('langs', 'en').split(',')) {
    const tag = v + ' ' + lang, fails = [];
    const browser = await pw[ENG].launch(ENG === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
    const dev = Object.assign({}, pw.devices[VIEWS[v][0]]); if (ENG !== 'webkit') { delete dev.defaultBrowserType; }
    const ctx = await browser.newContext(Object.assign(dev, { serviceWorkers: 'block' }));
    await ctx.addInitScript(l => { try { localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true, v: 99 })); localStorage.setItem('lowi.lang', l); localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 0, ledger: [], logs: [], saved: [], lang: l, user: { name: 'One Chat Test', bday: '1990-01-01', tags: [] } })); } catch (e) {} }, lang);
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    const ev = (fn, a) => page.evaluate(fn, a);
    try {
      await page.goto(URL0 + (URL0.includes('?') ? '&' : '?') + 'oc=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
      await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 150000 });
      const build = await ev(() => { try { return (document.querySelector('meta[name=lowi-build]') || {}).content || window.LOWI_BUILD || ''; } catch (e) { return ''; } });
      let uid = ''; for (let i = 0; i < 120 && !uid; i++) { uid = await ev(() => { try { return LOWI_CLOUD_X.state().uid || ''; } catch (e) { return ''; } }); if (!uid) await sleep(500); }
      if (!uid) fails.push('no cloud sign-in'); else if (!(await TA.markTest(page))) fails.push('could not mark the test account');
      /* the sign-in gate is not what this checks: close it the way the other sweeps do */
      await ev(l => { try { LowiR2.closeAll(); } catch (e) {} const g = document.getElementById('r2gate'); if (g) g.remove(); try { LowiLang.set(l); } catch (e) {} try { goTab('foryou'); } catch (e) {} }, lang);
      const tabsOk = await page.waitForFunction(() => { const t = document.querySelector('.rm-tabs'); return t && t.getBoundingClientRect().width > 0; }, null, { timeout: 30000 }).then(() => 1).catch(() => 0);
      if (!tabsOk) fails.push('Community tabs did not show');
      await sleep(1500);
      const cover = await ev(() => { const t = document.querySelector('.rm-tab[data-rm=chat]'); if (!t) return 'no tab'; const b = t.getBoundingClientRect(), e = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return e && !t.contains(e) ? (e.id || '') + '.' + String(e.className).slice(0, 60) + ' < ' + (e.closest('[id]') || {}).id : ''; });
      if (cover) { console.log('  ' + tag + ' first open, on top of the tabs: ' + cover); await page.screenshot({ path: path.join(OUT, `${v}-${lang}-first.png`) }); }
      /* a new account sees the Community welcome once: close it the way a person does (its X) */
      await ev(() => { const x = document.querySelector('.rm-ob .rm-x, .rm-ob [data-ob=close], .rm-ob button[aria-label]'); if (x && x.getBoundingClientRect().width) x.click(); }); await sleep(900);
      const tabs = await ev(() => [...document.querySelectorAll('.rm-tab[data-rm]')].filter(b => b.getBoundingClientRect().width > 0).map(b => b.dataset.rm));
      for (const k of ['room', 'chat', 'fy', 'studio', 'rank']) if (!tabs.includes(k)) fails.push('tab ' + k + ' missing (' + tabs.join(',') + ')');
      for (const k of tabs) {
        await page.click('.rm-tab[data-rm="' + k + '"]', { timeout: 10000 }).catch(e => fails.push('tap tab ' + k + ': ' + e.message.slice(0, 80)));
        await sleep(k === 'chat' || k === 'room' ? 2600 : 1400);
        const r = await ev(k => {
          const vis = el => { if (!el) return false; const b = el.getBoundingClientRect(); return b.width > 20 && b.height > 20 && getComputedStyle(el).visibility !== 'hidden'; };
          const on = (document.querySelector('.rm-tab[aria-selected=true], .rm-tab.on, .rm-tab[data-on]') || {}).dataset || {};
          const o = { active: on.rm || '', tab: (window.LowiRoomsUI && LowiRoomsUI.tab()) || '' };
          if (k === 'chat') { const l = document.getElementById('cmList'); o.list = vis(l); o.msgs = l ? l.children.length : 0; o.input = vis(document.getElementById('cmInput')); }
          if (k === 'room') { const g = document.getElementById('cgGalaxy'); o.galaxy = vis(g); o.canvas = !!(g && [...g.querySelectorAll('canvas')].some(c => c.width > 0 && c.height > 0)); }
          o.sw = document.documentElement.scrollWidth; o.w = innerWidth; return o;
        }, k);
        if (r.tab !== k) fails.push('tab ' + k + ' did not open (' + r.tab + ')');
        if (k === 'chat' && (!r.list || !r.msgs || !r.input)) fails.push('chat: list ' + r.list + ', messages ' + r.msgs + ', composer ' + r.input);
        if (k === 'room' && (!r.galaxy || !r.canvas)) fails.push('Raum: shown ' + r.galaxy + ', drawn ' + r.canvas);
        if (r.sw > r.w + 1) fails.push(k + ': sideways scroll');
        await page.screenshot({ path: path.join(OUT, `${v}-${lang}-${k}.png`) });
        console.log('  ' + tag + ' ' + k + ': ' + JSON.stringify(r));
      }
      const room = await ev(u => { const R = window.LowiRooms; return R ? { status: R.status(), room: R.room(), num: R.num(), me: R.has(u), here: R.members().length, multi: ['joinPerson', 'joinRoom', 'knocks', 'rooms', 'letIn'].filter(k => typeof R[k] === 'function') } : null; }, uid);
      console.log('  ' + tag + ' room: ' + JSON.stringify(room));
      if (!room || room.status !== 'in' || room.room !== 'all' || !room.me) fails.push('not in the one room: ' + JSON.stringify(room));
      if (room && room.multi.length) fails.push('multi-room API still there: ' + room.multi.join(','));
      await ev(() => { const m = document.querySelector('.rm-menu'); if (!m || m.hidden || !m.innerHTML) document.querySelector('.rm-menu-btn').click(); }); await sleep(700);
      const menu = await ev(() => [...document.querySelectorAll('.rm-menu [data-rmm]')].filter(b => b.getBoundingClientRect().height > 0).map(b => [b.dataset.rmm, b.textContent.trim()]));
      console.log('  ' + tag + ' menu: ' + menu.map(x => x[0]).join(','));
      if (!menu.length || menu[0][0] !== 'dir') fails.push('menu: People not first (' + menu.map(x => x[0]).join(',') + ')');
      if (menu.some(x => /urooms|people|find/.test(x[0]))) fails.push('menu: Circles / rooms / find still there');
      await page.screenshot({ path: path.join(OUT, `${v}-${lang}-menu.png`) });
      await ev(() => { const m = document.querySelector('.rm-menu'); if (m && !m.hidden && m.innerHTML) document.querySelector('.rm-menu-btn').click(); }); await sleep(400);
      const words = await ev(re => { const t = document.body.innerText || ''; const m = t.match(new RegExp(re)); return { hit: m ? t.slice(Math.max(0, m.index - 40), m.index + 40) : '', ur: document.querySelectorAll('.ur, [data-ur]').length, api: typeof window.LowiUserRooms }; }, CIRCLE.source);
      if (words.hit) fails.push('screen text still says: ' + JSON.stringify(words.hit));
      if (words.ur || words.api !== 'undefined') fails.push('Circles code still on the page');
      await page.goBack().catch(() => {}); await sleep(1500);
      const after = await ev(() => ({ url: location.href, comm: !!document.querySelector('.rm-tabs') && document.querySelector('.rm-tabs').getBoundingClientRect().width > 0 }));
      if (!/therealetm|127\.0\.0\.1|localhost/.test(after.url)) fails.push('back left the app: ' + after.url);
      else if (after.comm) fails.push('back did not close Community');
      if (errs.length) fails.push('page errors ' + errs.join(' | '));
      console.log('  ' + tag + ' build ' + build + ', back -> ' + (after.comm ? 'Community still open' : 'closed, app open'));
    } catch (e) { fails.push(e.message.slice(0, 200)); }
    try { await TA.cleanup(page); } catch (e) {}
    await browser.close();
    console.log((fails.length ? 'FAIL ' : 'PASS ') + tag + (fails.length ? '\n  ' + fails.join('\n  ') : ''));
    fail += fails.length;
  }
  process.exit(fail ? 1 : 0);
})();
