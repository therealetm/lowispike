'use strict';
/* Run 31 (from run 29 base): the clock passes midnight while Gap (and then the end-fast sheet) is open. Seeds a meal at 18:57 and an older fast that
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
    const start = new Date(bd + 'T23:52:00' + off);
    await ctx.clock.install({ time: start });
    await ctx.addInitScript(`(${(lang) => {
        try {
            const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const at = (h, m, dd) => { const x = new Date(); x.setDate(x.getDate() + (dd || 0)); x.setHours(h, m, 0, 0); return +x; };
            localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.news.tourseen', '99999');
            localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@local.test' } }));
            if (!localStorage.getItem('lowispike.v2')) {
                localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], settings: { lang },
                    logs: [] }));
                localStorage.setItem('lowi_fast_v1', JSON.stringify({ noGuess: 1, last: at(12, 30), water: {}, hist: [{ s: at(21, 0, -1), e: at(12, 30) }, { s: at(20, 0, -3), e: at(11, 0, -2) }] }));
            }
        } catch (e) { }
    }})(${JSON.stringify(lang)})`);
    await ctx.addInitScript(`(() => { if (window.__bh) return; const B = window.__bh = { err: [], rej: [] };
  addEventListener('error', e => B.err.push(String(e.message || e.error || e).slice(0, 200) + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  addEventListener('unhandledrejection', e => B.rej.push(String(e.reason && (e.reason.stack || e.reason.message) || e.reason).slice(0, 300))); })();`);

    const page = await ctx.newPage(); const perr = [];
    page.on('pageerror', e => perr.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 400)));
    await page.goto(url + '?pm=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => window.LowiAfterMeal && window.LowiVitalsBridge, null, { timeout: 90000 }).catch(() => perr.push('no LowiAfterMeal'));
    await L.sleep(5000);
    await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); try { LowiR2.closeAll(); } catch (e) {} });
    const g = lb => page.evaluate(lb => { const el = document.querySelector('.pmc,#pmc,[class*="pmc-"]'); const card = document.querySelector('.pmc-it') ? document.querySelector('.pmc-it').closest('[class*=pmc]:not(.pmc-grid):not(.pmc-it)') : null; const S = LowiVitalsBridge.state ? LowiVitalsBridge.state() : {}; const led = (S.ledger || []).filter(e => /^pmc:/.test(e.eventId || '')).map(e => e.eventId.split(':').pop() + '@' + e.day);
        const B = window.__bh; const cardEl = document.querySelector('.pmc-it') && document.querySelector('.pmc-it').closest('[id]'); const vis = n => { if (!n || !n.getClientRects().length) return false; const cs = getComputedStyle(n); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; }; const blk = [...document.querySelectorAll('.r2-ov.on, .gv-ov, .lt-tour, [aria-modal="true"], [role="dialog"].on, [role="dialog"].open')].filter(n => vis(n) && !(cardEl && cardEl.contains(n))).map(n => (n.id || '') + '.' + String(n.className).slice(0, 40)); return { lb, cardId: cardEl && cardEl.id, cardHidden: cardEl && cardEl.hidden, blk, tab: document.documentElement.getAttribute('data-lg-tab'), clock: new Date().toString().slice(16, 24), state: JSON.stringify(LowiAfterMeal.state()).slice(0, 260), tiles: [...document.querySelectorAll('.pmc-it')].map(b => b.className.replace('pmc-it', '').trim() + ':' + (b.querySelector('small') || {}).textContent).join(' | '), sub: (document.querySelector('.pmc-ht small') || {}).textContent, xp: S.xp, led, err: B.err.splice(0), rej: B.rej.splice(0) }; }, lb);
    const out = [];
    await page.evaluate(() => LowiVitalsBridge.logMeal({ id: 'pmcMid', t: 'Pasta', slot: 'meal' })); await L.sleep(3000);
    out.push(await g('23:52 logged'));
    await page.evaluate(() => { LowiAfterMeal.tick('muscle'); LowiAfterMeal.tick('upright'); LowiAfterMeal.tick('walk'); }); await L.sleep(1500);
    out.push(await g('started muscle, upright, walk'));
    await page.clock.fastForward('01:05'); await L.sleep(1500);
    await page.evaluate(() => LowiAfterMeal.tick('muscle')); await L.sleep(1000); out.push(await g('23:53 muscle confirmed'));
    await page.evaluate(() => LowiAfterMeal.tick('stairs')); await L.sleep(800);
    await page.clock.fastForward('09:30'); await L.sleep(1500); out.push(await g('~00:03 past midnight'));
    await page.evaluate(() => { LowiAfterMeal.tick('walk'); LowiAfterMeal.tick('stairs'); }); await L.sleep(1200); out.push(await g('00:03 walk+stairs confirmed'));
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.clock.fastForward('21:00'); await L.sleep(500);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
    await L.sleep(2500); out.push(await g('00:24 back from hidden'));
    await page.evaluate(() => LowiAfterMeal.tick('upright')); await L.sleep(1500); out.push(await g('00:24 upright confirmed'));
    await page.reload({ waitUntil: 'load' }); await L.sleep(8000); out.push(await g('after reload'));
    console.log(JSON.stringify(out, null, 1));
    if (perr.length) console.log('PAGEERROR ' + JSON.stringify(perr).slice(0, 800));
    await browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(2); });
