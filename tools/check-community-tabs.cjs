#!/usr/bin/env node
/* 24 Oct 2026: Community tab bar with For You + Studio (Affiliates | Creation). One browser, one page at a time.
   node tools/check-community-tabs.cjs [url] [sizes] [langs]
   url defaults to http://127.0.0.1:8765/ ; sizes: iphone,small,se,ipad,ipadside ; langs: de,en,es */
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const URL0 = process.argv[2] || 'http://127.0.0.1:8765/';
const ALL = { iphone: [390, 844, true], small: [375, 667, true], se: [320, 568, true], ipad: [820, 1180, true], ipadside: [1180, 820, true] };
const SIZES = (process.argv[3] || 'iphone,small,se,ipad,ipadside').split(',');
const LANGS = (process.argv[4] || 'de,en,es').split(',');
const LAB = { de: ['Rangliste', 'Chat', 'Raum', 'Für dich', 'Studio'], en: ['Ranking', 'Chat', 'Room', 'For You', 'Studio'], es: ['Ranking', 'Chat', 'Sala', 'Para ti', 'Estudio'] };
const SW = { de: ['Affiliates', 'Erstellen'], en: ['Affiliates', 'Creation'], es: ['Afiliados', 'Crear'] };
let pass = 0, fail = 0; const bad = [];
const ok = (c, m) => { if (c) pass++; else { fail++; bad.push(m); console.log('  FAIL ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--disable-gpu', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=512'] });
  for (const lang of LANGS) for (const sz of SIZES) {
    const [w, h, touch] = ALL[sz]; const name = lang + '/' + sz;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: touch, isMobile: w < 700, locale: lang });
    if (/127\.0\.0\.1|localhost/.test(URL0)) await ctx.route(u => !/^http:\/\/(127\.0\.0\.1|localhost):/.test(String(u)), r => r.abort());
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 160)));
    await page.addInitScript(([lang]) => {
      try {
        if (sessionStorage.getItem('cct-seeded')) return; sessionStorage.setItem('cct-seeded', '1');
        localStorage.setItem('lowispike.lang', lang); localStorage.setItem('lowi.lang', lang);
        localStorage.setItem('lowispike.community.tabs', '["rank","chat","room","aff","create"]');   /* Emmanuel's order from before */
        localStorage.setItem('lowi.gate', 'done'); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999');
        const dd = new Date(); localStorage.setItem('lowi.daily.seen', dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
        localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } }));
        localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true }));
        if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ setupDone: true, onboarded: true, xp: 2311, ledger: [], user: { name: 'eman', bday: '1990-01-01' } }));
      } catch (e) {}
    }, [lang]);
    const tap = async sel => { try { await page.click(sel, { timeout: 8000 }); } catch (e) {
        const who = await page.evaluate(sel => { const b = document.querySelector(sel); if (!b) return 'missing'; const q = b.getBoundingClientRect(); const t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return JSON.stringify([q.left, q.top, q.width, q.height]) + ' covered by ' + (t ? t.tagName + '#' + t.id + '.' + String(t.className).slice(0, 80) + ' in ' + (t.closest('[id]') || {}).id : 'nothing'); }, sel);
        throw new Error('tap ' + sel + ': ' + who); } };
    try {
      await page.goto(URL0, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiRoomsUI, null, { timeout: 45000 });
      await sleep(5000);
      await page.evaluate(() => { document.querySelectorAll('.tut-skip,[data-tut="skip"]').forEach(b => b.click()); });
      await page.evaluate(() => window.goTab('foryou'));
      await page.waitForSelector('#tab-foryou.active .rm-tabs .rm-tab', { timeout: 20000 });
      await sleep(1600);
      let r = await page.evaluate(() => {
        const tabs = [...document.querySelectorAll('#tab-foryou .rm-tabs .rm-tab')];
        return { ids: tabs.map(t => t.dataset.rm), labels: tabs.map(t => t.textContent.trim()), cut: tabs.filter(t => t.scrollWidth > t.clientWidth + 1 || t.getBoundingClientRect().right > innerWidth + 0.5).map(t => t.textContent), view: LowiRoomsUI.view(), saved: localStorage.getItem('lowispike.community.tabs'), bar: (() => { const b = document.querySelector('#tab-foryou .rm-tabs').getBoundingClientRect(); return [b.left, b.right]; })() };
      });
      ok(r.ids.join() === 'rank,chat,room,fy,studio', name + ': order kept, For You before Studio: ' + r.ids.join());
      ok(r.labels.join('|') === LAB[lang].join('|'), name + ': labels ' + r.labels.join('|'));
      ok(r.cut.length === 0, name + ': nothing cut off ' + r.cut.join());
      ok(r.bar[0] >= 0 && r.bar[1] <= w + 0.5, name + ': bar on screen ' + r.bar);
      ok(r.view === 'rank', name + ': opens on the first tab (Ranking) ' + r.view);
      /* For You */
      await tap('#tab-foryou .rm-tab[data-rm="fy"]'); await sleep(1400);
      r = await page.evaluate(() => {
        const box = document.querySelector('#tab-foryou .rm-view > .rm-fy'), bb = box && box.getBoundingClientRect();
        const feed = document.getElementById('fyFeed'), sl = feed ? [...feed.querySelectorAll('.fy-slide')] : [];
        const s0 = sl[0] && sl[0].getBoundingClientRect();
        const sel = document.querySelector('#tab-foryou .rm-tab[aria-selected=true]');
        const sw = document.querySelector('#tab-foryou .rm-sw');
        return { view: LowiRoomsUI.view(), box: bb && [bb.top, bb.bottom, bb.left, bb.right, bb.height], hidden: !box || box.hidden || getComputedStyle(box).display === 'none', n: sl.length, s0: s0 && [s0.top, s0.bottom, s0.height, s0.width], sel: sel && sel.dataset.rm, sw: !!sw && !sw.hidden, inCook: !!document.querySelector('#tab-shelf #cmPaneFeed, #tab-shelf .nm-layer-fy'), panes: document.querySelectorAll('#cmPaneFeed').length, out: sl[0] ? [...sl[0].querySelectorAll('.fy-rail,.fy-meta,.fyv-fab,.fy-rail button')].filter(e => { const q = e.getBoundingClientRect(); return q.width && (q.top < bb.top - 1 || q.bottom > bb.bottom + 1 || q.left < bb.left - 1 || q.right > bb.right + 1); }).map(e => e.className) : [], tabsBottom: document.querySelector('#tab-foryou .rm-tabs').getBoundingClientRect().bottom, onFeed: !!(document.getElementById('cmPaneFeed') && document.getElementById('cmPaneFeed').closest('.rm-fy')) };
      });
      ok(r.view === 'fy' && r.sel === 'fy', name + ': For You tab selected ' + r.view + '/' + r.sel);
      ok(!r.hidden && r.box && r.box[4] > 250, name + ': For You panel visible ' + JSON.stringify(r.box));
      ok(r.n >= 1 && r.s0 && Math.abs(r.s0[2] - r.box[4]) < 4 && r.s0[0] >= r.box[0] - 2, name + ': posts fill the panel ' + r.n + ' ' + JSON.stringify(r.s0));
      ok(r.box && r.box[3] <= w + 0.5 && r.box[1] <= h + 0.5, name + ': panel on screen');
      ok(!r.sw, name + ': no Studio switch on For You');
      ok(r.out.length === 0, name + ': post buttons inside the panel ' + r.out.join());
      ok(r.box && r.box[0] >= r.tabsBottom - 1, name + ': panel below the tab bar');
      ok(!r.inCook && r.panes === 1 && r.onFeed, name + ': one feed, in Community, not in Cook');
      /* swipe the feed */
      if (r.n >= 2) { const y0 = await page.evaluate(() => { const f = document.getElementById('fyFeed'); f.scrollTop = f.clientHeight; return f.scrollTop; }); await sleep(500); ok(y0 > 0, name + ': feed scrolls to the next post'); }
      /* Studio */
      await tap('#tab-foryou .rm-tab[data-rm="studio"]'); await sleep(1400);
      r = await page.evaluate(() => { const sw = document.querySelector('#tab-foryou .rm-sw'), b = [...(sw ? sw.querySelectorAll('.rm-swb') : [])]; const fr = document.querySelector('#tab-foryou .rm-view > iframe.rm-frame:not([hidden])') || [...document.querySelectorAll('#tab-foryou .rm-view > .rm-frame')].find(f => !f.hidden && f.tagName === 'IFRAME'); const sel = document.querySelector('#tab-foryou .rm-tab[aria-selected=true]'); return { view: LowiRoomsUI.view(), sw: !!sw && !sw.hidden, lab: b.map(x => x.textContent), on: b.filter(x => x.getAttribute('aria-selected') === 'true').map(x => x.dataset.rmsw), cut: b.filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.textContent), src: fr ? fr.getAttribute('src') || fr.src : '', fyHidden: (() => { const x = document.querySelector('#tab-foryou .rm-fy'); return !x || x.hidden; })(), sel: sel && sel.dataset.rm, swb: sw && (() => { const q = sw.getBoundingClientRect(); return [q.left, q.right, q.height]; })(), playing: [...document.querySelectorAll('#cmPaneFeed video')].filter(v => !v.paused).length, gap: (() => { const q = sw && sw.getBoundingClientRect(), t = document.querySelector('#tab-foryou .rm-tabs').getBoundingClientRect(), f = fr && fr.getBoundingClientRect(); return q && f ? [q.top - t.bottom, f.top - q.bottom, f.bottom <= innerHeight + 1] : null; })() }; });
      ok(r.gap && r.gap[0] >= 0 && r.gap[1] >= 0 && r.gap[2], name + ': switch between tab bar and page, page on screen ' + JSON.stringify(r.gap));
      ok(r.view === 'aff' && r.sel === 'studio', name + ': Studio opens on Affiliates ' + r.view + '/' + r.sel);
      ok(r.sw && r.lab.join('|') === SW[lang].join('|') && r.on.join() === 'aff', name + ': switch ' + r.lab.join('|') + ' on ' + r.on);
      ok(r.cut.length === 0 && r.swb && r.swb[0] >= 0 && r.swb[1] <= w, name + ': switch fits ' + JSON.stringify(r.swb));
      ok(/affiliates\//.test(r.src), name + ': Affiliates page in the panel ' + r.src);
      ok(r.fyHidden && r.playing === 0, name + ': For You hidden and silent');
      await tap('#tab-foryou .rm-sw [data-rmsw="create"]'); await sleep(1200);
      r = await page.evaluate(() => { const fr = [...document.querySelectorAll('#tab-foryou .rm-view > iframe.rm-frame')].find(f => !f.hidden); const sel = document.querySelector('#tab-foryou .rm-tab[aria-selected=true]'); return { view: LowiRoomsUI.view(), src: fr ? fr.getAttribute('src') : '', sel: sel && sel.dataset.rm, mem: localStorage.getItem('lowispike.community.studio') }; });
      ok(r.view === 'create' && r.sel === 'studio' && /create\//.test(r.src) && r.mem === 'create', name + ': Creation half ' + JSON.stringify(r));
      await tap('#tab-foryou .rm-tab[data-rm="room"]'); await sleep(900);
      await tap('#tab-foryou .rm-tab[data-rm="studio"]'); await sleep(900);
      ok(await page.evaluate(() => LowiRoomsUI.view()) === 'create', name + ': Studio remembers Creation');
      /* back from Community goes Home and the app stays */
      await tap('#tab-foryou .rm-tab[data-rm="fy"]'); await sleep(800);
      await page.evaluate(() => history.back()); await sleep(1400);
      r = await page.evaluate(() => ({ home: !document.querySelector('#tab-foryou.active'), url: location.href, playing: [...document.querySelectorAll('#cmPaneFeed video')].filter(v => !v.paused).length }));
      ok(r.home && r.url.startsWith(URL0.replace(/\/$/, '')), name + ': back leaves Community, app still open ' + JSON.stringify(r));
      ok(r.playing === 0, name + ': no video plays after leaving');
      /* the post path / Settings > For You: nav-moves open('fy') lands on the Community tab even though Ranking is first */
      await page.evaluate(() => window.LowiNavMoves.open('fy')); await sleep(2200);
      r = await page.evaluate(() => ({ act: !!document.querySelector('#tab-foryou.active'), view: LowiRoomsUI.view(), sel: (document.querySelector('#tab-foryou .rm-tab[aria-selected=true]') || {}).dataset?.rm, feed: !!document.querySelector('#tab-foryou .rm-fy #fyFeed') }));
      ok(r.act && r.view === 'fy' && r.sel === 'fy' && r.feed, name + ': open(fy) lands on For You ' + JSON.stringify(r));
      /* Cook has Shuffle | Swipe and no For You */
      await page.evaluate(() => window.goTab('shelf')); await sleep(1500);
      r = await page.evaluate(() => ({ fy: !!document.querySelector('#tab-shelf .ck-fy, #tab-shelf .nm-pill-fy, #tab-shelf .nm-layer-fy'), segs: [...document.querySelectorAll('#tab-shelf .ck-view .ck-b')].map(b => b.textContent.trim()) }));
      ok(!r.fy, name + ': no For You in Cook ' + r.segs.join('|'));
      /* deep link */
      await page.evaluate(() => { location.hash = '#community/foryou'; location.reload(); }); await sleep(1000);
      await page.waitForFunction(() => window.LowiRoomsUI && document.readyState === 'complete', null, { timeout: 45000 }); await sleep(6000);
      ok(await page.evaluate(() => !!document.querySelector('#tab-foryou.active') && LowiRoomsUI.view() === 'fy'), name + ': #community/foryou opens For You');
      if (lang === 'de') await page.screenshot({ path: '/tmp/cct-' + name.replace('/', '-') + '.png' });
      ok(errs.length === 0, name + ': no page errors ' + errs.join(' | '));
    } catch (e) { ok(false, name + ': ' + String(e.message || e).slice(0, 200)); }
    await ctx.close(); console.log(name + ' done (' + pass + ' ok, ' + fail + ' failed so far)');
  }
  await browser.close();
  console.log((fail ? 'FAILED ' : 'ALL OK ') + pass + '/' + (pass + fail)); if (fail) console.log(bad.join('\n'));
  process.exit(fail ? 1 : 0);
})();
