'use strict';
/* Run 29: the clock passes midnight while Gap (and then the end-fast sheet) is open. Seeds a meal at 18:57 and an older fast that
   ended at 12:30 today, opens Gap at 23:58:30, lets it repaint across midnight, then hides the tab overnight and comes back.
   Records the sheet's text at each step (time since, last meal, recent fasts day labels) + errors.
   usage: node probe-gap-midnight.cjs <view> <url|dir> [lang] */
const L = require('./lib.cjs');
(async () => {
    const view = process.argv[2] || 'chromium390', target = process.argv[3] || 'https://therealetm.github.io/lowispike/', lang = process.argv[4] || 'en';
    let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const [eng, dd] = L.VIEWS[view];
    const browser = await L.pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
    const dev = Object.assign({}, typeof dd === 'string' ? L.pw.devices[dd] : dd);
    const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block', timezoneId: 'Europe/Berlin', locale: lang === 'en' ? 'en-GB' : lang }));
    const host = new URL(url).host;
    await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
    const bd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date());
    const off = (() => { const n = new Date(bd + 'T12:00:00Z'); const t = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23' }).format(n); const h = +t - 12; return (h >= 0 ? '+' : '-') + String(Math.abs(h)).padStart(2, '0') + ':00'; })();
    const start = new Date(bd + 'T23:58:00' + off);
    await ctx.clock.install({ time: start });
    await ctx.addInitScript(`(${(lang) => {
        try {
            const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const at = (h, m, dd) => { const x = new Date(); x.setDate(x.getDate() + (dd || 0)); x.setHours(h, m, 0, 0); return +x; };
            localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.news.tourseen', '99999');
            localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@local.test' } }));
            if (!localStorage.getItem('lowispike.v2')) {
                localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], settings: { lang },
                    logs: [{ id: 'mBH29', eventId: 'mBH29', ts: at(18, 57), t: 'Pasta', n: 'Pasta', cat: 'meal' }] }));
                localStorage.setItem('lowi_fast_v1', JSON.stringify({ noGuess: 1, last: at(12, 30), water: {}, hist: [{ s: at(21, 0, -1), e: at(12, 30) }, { s: at(20, 0, -3), e: at(11, 0, -2) }] }));
            }
        } catch (e) { }
    }})(${JSON.stringify(lang)})`);
    await ctx.addInitScript(`(() => { if (window.__bh) return; const B = window.__bh = { err: [], rej: [] };
  addEventListener('error', e => B.err.push(String(e.message || e.error || e).slice(0, 200) + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  addEventListener('unhandledrejection', e => B.rej.push(String(e.reason && (e.reason.stack || e.reason.message) || e.reason).slice(0, 300))); })();`);
    const page = await ctx.newPage(); const perr = [];
    page.on('pageerror', e => perr.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 400)));
    await page.goto(url + '?gm=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => window.LowiGapView && typeof window.goTab === 'function', null, { timeout: 90000 }).catch(() => perr.push('Gap never defined'));
    await L.sleep(6000);
    await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); try { LowiR2.closeAll(); } catch (e) {} });
    const grab = async lb => page.evaluate(lb => {
        const sh = document.getElementById('gvSheet'), fs = document.querySelector('.fst-ov,.r2-ov.on,#sheetwrap.open');
        const txt = e => e ? (e.innerText || '').replace(/\n+/g, ' | ').slice(-420) : '';
        const B = window.__bh || { err: [], rej: [] };
        return { lb, clock: new Date().toString().slice(0, 24), last: txt(sh && sh.querySelector('.gv-last')), gap: txt(sh && sh.querySelector('.gv-body')), other: sh ? '' : txt(fs), ring: (document.querySelector('[data-orbit="gap"]') || {}).innerText, aria: (document.getElementById('spFast') || { getAttribute() { return null; } }).getAttribute('aria-label'), err: B.err.splice(0), rej: B.rej.splice(0) };
    }, lb);
    const out = [];
    await page.evaluate(() => LowiGapView.open()); await L.sleep(1500);
    out.push(await grab('23:58 Gap open'));
    await page.clock.fastForward('01:00'); await L.sleep(1500); out.push(await grab('23:59'));
    await page.clock.fastForward('01:30'); await L.sleep(1500); out.push(await grab('00:00:30 visible, after repaint'));
    await page.clock.fastForward('02:00'); await L.sleep(1500); out.push(await grab('00:02:30'));
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.clock.fastForward('07:30:00'); await L.sleep(800);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    await L.sleep(2500); out.push(await grab('07:32 back from night, Gap still open'));
    /* the end-fast sheet opened from Gap's world after midnight */
    await page.evaluate(() => { try { LowiGapView.close(true); } catch (e) {} try { LowiFastStop.open(); } catch (e) { window.__bh.err.push('FastStop.open ' + e.message); } }); await L.sleep(2000);
    const fsx = await page.evaluate(() => { const ov = [...document.querySelectorAll('body *')].filter(e => /End your fast|When did you last eat/.test(e.innerText || '') && e.children.length > 2 && e.getBoundingClientRect().height > 200).slice(-1).filter(e => e.getBoundingClientRect().width > 0); return ov.map(e => (e.innerText || '').replace(/\n+/g, ' | ').slice(0, 900)); });
    out.push({ lb: '07:32 end-fast sheet', sheets: fsx, err: (await page.evaluate(() => window.__bh.err.splice(0))) });
    console.log(JSON.stringify(out, null, 1));
    if (perr.length) console.log('PAGEERROR ' + JSON.stringify(perr).slice(0, 800));
    await page.screenshot({ path: __dirname + '/out/gap-midnight-' + view + '-' + lang + '.png' });
    await browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(2); });
