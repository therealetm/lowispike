'use strict';
/* Run 29 (pmc-fin): after the 4th after-meal move the final card while Gap (and then the end-fast sheet) is open. Seeds a meal at 18:57 and an older fast that
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
    const start = new Date(bd + 'T13:00:00' + off);
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

    const st = async lb => page.evaluate(lb => { const c = document.getElementById('pmcCard'); const r = c && c.getBoundingClientRect();
        const top = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
        const sheet = [...document.querySelectorAll('.r2-ov.on,.gv-ov,[aria-modal=true]')].filter(e => e.getBoundingClientRect().width > 0 && e !== c).map(e => e.id || e.className).slice(0, 3);
        return { lb, card: c ? { cls: c.className, hidden: c.hidden, txt: (c.innerText || '').replace(/\n+/g, ' | ').slice(0, 160), rect: [r.top | 0, r.bottom | 0], onTop: !!(top && c.contains(top)) } : null, sheet, tab: document.documentElement.getAttribute('data-lg-tab'), err: window.__bh.err.splice(0) }; }, lb);
    const out = [];
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('lowi:meal-logged', { detail: { id: 'mPMC' + Date.now(), ts: Date.now(), t: 'Soup' } })));
    await L.sleep(2500); out.push(await st('card up'));
    for (const it of ['walk', 'muscle', 'stairs', 'upright']) { await page.evaluate(i => LowiAfterMeal.tick(i), it); await L.sleep(200); }
    await page.clock.fastForward('30:15'); await L.sleep(1500);
    for (const it of ['walk', 'muscle', 'stairs']) { await page.evaluate(i => LowiAfterMeal.tick(i), it); await L.sleep(300); }
    out.push(await st('3 confirmed ' + JSON.stringify(await page.evaluate(() => LowiAfterMeal.state().done))));
    await page.evaluate(() => LowiAfterMeal.tick('upright')); await L.sleep(1200);
    out.push(await st('4th confirmed: final card'));
    const MODE = process.env.MODE || 'gap';
    if (MODE === 'gap') await page.evaluate(() => LowiGapView.open()); else await page.evaluate(m => (window.lowiOpen || goTab)(m), MODE);
    await L.sleep(1500); out.push(await st('opened ' + MODE + ' 1.5 s later'));
    await L.sleep(4000); out.push(await st(MODE + ' +5.5 s'));
    await page.screenshot({ path: __dirname + '/out/pmc-fin-' + view + '-' + MODE + '.png' });
    console.log(JSON.stringify(out, null, 1)); if (perr.length) console.log('PAGEERROR ' + JSON.stringify(perr).slice(0, 800));
    await browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(2); });
