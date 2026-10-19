'use strict';
/* Run 7 probe: clock jumps. Start at 23:58 local, log water + a meal, cross midnight, then jump hours ahead (like a phone left
   in a pocket overnight, tab hidden then shown). Every step: ring texts and aria, any visible NaN / undefined / Infinity / negative
   time, JS errors, rejections. usage: node probe-clock.cjs <view> <url|dir> [lang] */
const L = require('./lib.cjs');
(async () => {
    const view = process.argv[2] || 'chromium390', target = process.argv[3] || 'https://therealetm.github.io/lowispike/', lang = process.argv[4] || 'en';
    let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const [eng, dd] = L.VIEWS[view];
    const browser = await L.pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
    const dev = Object.assign({}, typeof dd === 'string' ? L.pw.devices[dd] : dd);
    const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block', timezoneId: 'Europe/Berlin' }));
    const host = new URL(url).host;
    await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
    const bd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date()); const start = new Date(bd + 'T23:57:30+02:00');
    // fixture init uses Date at init, so install the clock first
    await ctx.clock.install({ time: start });
    const fx = require('fs').readFileSync(__dirname + '/lib.cjs', 'utf8');
    await ctx.addInitScript(`(${(lang) => {
        try {
            const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
            localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@local.test' } }));
            if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], settings: { lang } }));
        } catch (e) { }
    }})(${JSON.stringify(lang)})`);
    await ctx.addInitScript(`(() => { if (window.__bh) return; const B = window.__bh = { err: [], rej: [] };
  addEventListener('error', e => B.err.push(String(e.message || e.error || e).slice(0, 200) + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  addEventListener('unhandledrejection', e => B.rej.push(String(e.reason && (e.reason.stack || e.reason.message) || e.reason).slice(0, 300))); })();`);
    const page = await ctx.newPage(); const perr = [];
    page.on('pageerror', e => perr.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 400)));
    await page.goto(url + '?tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 }).catch(() => perr.push('goTab never defined'));
    await L.sleep(8000);
    const h = { page, touch: !!dev.hasTouch };
    const state = async label => page.evaluate(lb => {
        const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
        const ring = {}; document.querySelectorAll('[data-orbit]').forEach(e => { ring[e.dataset.orbit] = { tx: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60), aria: (e.getAttribute('aria-label') || '').slice(0, 90) }; });
        const texts = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const v = n.nodeValue.trim(); if (v && n.parentElement && vis(n.parentElement)) texts.push(v); }
        const arias = [...document.querySelectorAll('[aria-label]')].filter(vis).map(e => e.getAttribute('aria-label'));
        const badRe = /\bNaN\b|undefined|Infinity|null\b|-\d+\s*(h|min|m\b|Std)|\b\d{3,}\s*h\b/;
        const bad = texts.concat(arias).filter(v => badRe.test(v)).slice(0, 10);
        const B = window.__bh || { err: [], rej: [] };
        return { label: lb, clock: new Date().toString().slice(0, 24), ring, bad, err: B.err.splice(0), rej: B.rej.splice(0) };
    }, label);
    const out = [], fails = [];
    const rec = async lb => { const s = await state(lb); out.push(s); if (s.bad.length) fails.push(lb + ': bad text ' + JSON.stringify(s.bad)); if (s.err.length || s.rej.length) fails.push(lb + ': errors ' + JSON.stringify(s.err.concat(s.rej)).slice(0, 400)); return s; };
    await rec('23:58 start');
    // log a water through the Water bloom (first choice)
    const tapSel = async sel => { const c = await L.center(h, sel); if (!c) return false; await L.tap(h, c.x, c.y); return true; };
    await tapSel('[data-orbit="water"]'); await L.sleep(1500);
    const choice = await page.evaluate(() => { const b = document.querySelector('#hb2Bloom button, .hb2-orb'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: (b.textContent || '').trim().slice(0, 30) }; });
    if (choice) { await L.tap(h, choice.x, choice.y); await L.sleep(1500); }
    await page.keyboard.press('Escape').catch(() => { }); await L.sleep(800);
    await page.evaluate(() => { try { LowiSpirit.water(); LowiSpirit.water(); } catch (e) { window.__bh.err.push('water() threw ' + e.message); } }); await L.sleep(2500);
    const s1 = await rec('after water ' + (choice ? choice.t : 'no choice'));
    // cross midnight while visible
    await page.clock.fastForward('03:00'); await L.sleep(4000);
    const s2 = await rec('00:01 visible');
    // hide tab, jump 7 hours (night), show
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.clock.fastForward('07:00:00'); await L.sleep(1000);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('pageshow')); });
    await L.sleep(5000);
    const s3 = await rec('07:01 after hidden night');
    // open each bubble once in the new day
    for (const k of ['gap', 'water', 'fuel', 'move', 'sleep']) { if (await tapSel('[data-orbit="' + k + '"]')) { await L.sleep(1800); await rec('07:xx open ' + k); await page.keyboard.press('Escape').catch(() => { }); await L.sleep(900); } }
    // jump 26 hours more (a day skipped entirely)
    await page.clock.fastForward('26:00:00'); await L.sleep(5000);
    await rec('next-next day 09:xx');
    // water count: must have reset at midnight
    const wtx = o => (o.ring.water && (o.ring.water.tx + ' | ' + o.ring.water.aria)) || '';
    console.log(JSON.stringify(out.map(o => ({ label: o.label, clock: o.clock, water: wtx(o), gap: o.ring.gap && (o.ring.gap.tx + ' | ' + o.ring.gap.aria), move: o.ring.move && o.ring.move.tx, sleep: o.ring.sleep && (o.ring.sleep.tx + ' | ' + o.ring.sleep.aria), fuel: o.ring.fuel && (o.ring.fuel.tx + ' | ' + o.ring.fuel.aria), bad: o.bad })), null, 1));
    if (perr.length) fails.push('pageerror ' + JSON.stringify(perr).slice(0, 400));
    await page.screenshot({ path: __dirname + '/out/clock-' + view + '.png' });
    console.log(fails.length ? 'FAIL ' + fails.join(' ; ') : 'PASS (check water reset by eye)');
    await browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(2); });
