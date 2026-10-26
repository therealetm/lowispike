'use strict';
/* Run 31 (P-OVERLAY-STACK): morning, Day card due, user logs the first meal at once -> fasting reward; does the Day card open on top of it?: it is 00:10, the last meal (and fast start) was yesterday 18:57. Open every Home bubble, the
   legacy tabs and the fasting card, and report every visible text that shows 18:57 / 06:57 with no day word next to it.
   usage: node probe-bare-time.cjs <view> <url|dir> [lang] */
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
    await ctx.clock.install({ time: new Date(bd + 'T07:30:00' + off) });
    await ctx.addInitScript(`(${(lang) => {
        try {
            const d = new Date(), key = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'), k = key(d);
            const at = (h, m, dd) => { const x = new Date(); x.setDate(x.getDate() + (dd || 0)); x.setHours(h, m, 0, 0); return +x; };
            const y = new Date(); y.setDate(y.getDate() - 1);
            localStorage.setItem('lowi.daily.seen', key(y)); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.news.tourseen', '99999');
            localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@local.test' } }));
            if (!localStorage.getItem('lowispike.v2')) {
                localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], settings: { lang },
                    logs: [{ id: 'mBH31', eventId: 'mBH31', ts: at(18, 57, -1), day: key(y), t: 'Pasta', n: 'Pasta', cat: 'meal', slot: 'meal' }], ritual: {} }));
                localStorage.setItem('lowi_fast_v1', JSON.stringify({ noGuess: 1, last: at(18, 57, -1), water: {}, hist: [] }));
            }
        } catch (e) { }
    }})(${JSON.stringify(lang)})`);
    await ctx.addInitScript(`(() => { if (window.__bh) return; const B = window.__bh = { err: [], rej: [] };
  addEventListener('error', e => B.err.push(String(e.message || e.error || e).slice(0, 200) + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  addEventListener('unhandledrejection', e => B.rej.push(String(e.reason && (e.reason.stack || e.reason.message) || e.reason).slice(0, 300))); })();`);

    const page = await ctx.newPage(); const perr = [];
    page.on('pageerror', e => perr.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 400)));
    if (process.env.NOMEAL) await ctx.addInitScript('window.__nomeal=1');
    await page.goto(url + '?do=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => window.LowiVitalsBridge && document.getElementById('spHome'), null, { timeout: 90000 }).catch(() => perr.push('no home'));
    await L.sleep(1200);
    const f = lb => page.evaluate(lb => { const v = n => { if (!n || !n.getClientRects().length) return false; const c = getComputedStyle(n); return c.visibility !== 'hidden' && +c.opacity > 0.05; };
        const top = (() => { const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2); const o = e && e.closest('[id]'); return o ? o.id : ''; })();
        const B = window.__bh; return { lb, t: new Date().toTimeString().slice(0, 8), day: v(document.getElementById('drDay')), rw: v(document.getElementById('fstRw')), top, err: B.err.splice(0), rej: B.rej.splice(0) }; }, lb);
    const out = [await f('loaded')];
    await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); if (!window.__nomeal) LowiVitalsBridge.logMeal({ id: 'bfast', t: 'Eggs', slot: 'meal' }); });
    for (let i = 0; i < 8; i++) { await L.sleep(1500); out.push(await f('+' + (1.5 * (i + 1)).toFixed(1) + 's')); }
    /* Escape once: which one closes? */
    await page.keyboard.press('Escape'); await L.sleep(800); out.push(await f('after 1 Escape'));
    await L.sleep(5000); out.push(await f('5 s after the reward closed'));
    console.log(out.map(o => JSON.stringify(o)).join('\n'));
    if (perr.length) console.log('PAGEERROR ' + JSON.stringify(perr).slice(0, 800));
    await browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(2); });
