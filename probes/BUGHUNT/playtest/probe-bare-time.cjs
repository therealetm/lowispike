'use strict';
/* Run 31 (P-CLOCK-NO-DAY sweep): it is 00:10, the last meal (and fast start) was yesterday 18:57. Open every Home bubble, the
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
    await ctx.clock.install({ time: new Date(bd + 'T00:10:00' + off) });
    await ctx.addInitScript(`(${(lang) => {
        try {
            const d = new Date(), key = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'), k = key(d);
            const at = (h, m, dd) => { const x = new Date(); x.setDate(x.getDate() + (dd || 0)); x.setHours(h, m, 0, 0); return +x; };
            const y = new Date(); y.setDate(y.getDate() - 1);
            localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.news.tourseen', '99999');
            localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@local.test' } }));
            if (!localStorage.getItem('lowispike.v2')) {
                localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], settings: { lang },
                    logs: [{ id: 'mBH31', eventId: 'mBH31', ts: at(18, 57, -1), day: key(y), t: 'Pasta', n: 'Pasta', cat: 'meal', slot: 'meal' }] }));
                localStorage.setItem('lowi_fast_v1', JSON.stringify({ noGuess: 1, last: at(18, 57, -1), water: {}, hist: [] }));
            }
        } catch (e) { }
    }})(${JSON.stringify(lang)})`);
    await ctx.addInitScript(`(() => { if (window.__bh) return; const B = window.__bh = { err: [], rej: [] };
  addEventListener('error', e => B.err.push(String(e.message || e.error || e).slice(0, 200) + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  addEventListener('unhandledrejection', e => B.rej.push(String(e.reason && (e.reason.stack || e.reason.message) || e.reason).slice(0, 300))); })();`);
    const page = await ctx.newPage(); const perr = [];
    page.on('pageerror', e => perr.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 400)));
    await page.goto(url + '?bt=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof window.goTab === 'function' && document.querySelector('[data-orbit]'), null, { timeout: 90000 }).catch(() => perr.push('no orbit'));
    await L.sleep(6000);
    await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); try { LowiR2.closeAll(); } catch (e) {} });
    /* every visible text node containing 18:57 / 06:57 with no day word right after it */
    const scan = lb => page.evaluate(lb => {
        const hits = [], re = /(18:57|0?6:57)(\s*(PM|AM|p\.\s?m\.|a\.\s?m\.))?/i, day = /^\s*(PM|AM)?\s*(yesterday|gestern|ayer|Sun|Mon|Tue|Wed|Thu|Fri|Sat|So|Mo|Di|Mi|Do|Fr|Sa|dom|lun|mar|mi[eé]|jue|vie|s[aá]b)/i;
        const vis = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
        const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n; (n = tw.nextNode());) { const t = n.nodeValue; const m = re.exec(t); if (!m) continue; const el = n.parentElement; if (!el || !vis(el)) continue;
            const ctxt = (el.closest('button,li,p,div') || el).innerText.replace(/\s+/g, ' ');
            const after = ctxt.slice(ctxt.indexOf(m[1]) + m[0].length);
            if (!day.test(after) && !/yesterday|gestern|ayer/i.test(ctxt)) hits.push({ txt: ctxt.slice(0, 160), sel: (el.id ? '#' + el.id : '') + '.' + String(el.className || '').split(' ')[0] }); }
        document.querySelectorAll('[aria-label]').forEach(e => { const a = e.getAttribute('aria-label'); const m = re.exec(a || ''); if (m && vis(e) && !/yesterday|gestern|ayer/i.test(a)) hits.push({ aria: a.slice(0, 160), sel: (e.id ? '#' + e.id : '') + '.' + String(e.className || '').split(' ')[0] }); });
        const B = window.__bh || { err: [], rej: [] };
        return { lb, hits, err: B.err.splice(0), rej: B.rej.splice(0) };
    }, lb);
    const out = [];
    out.push(await scan('home'));
    const orbits = await page.evaluate(() => [...document.querySelectorAll('[data-orbit]')].map(e => e.dataset.orbit));
    for (const o of orbits) {
        await page.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} try { LowiGapView.close(true); } catch (e) {} });
        await L.sleep(700);
        const c = await L.center({ page }, '[data-orbit="' + o + '"]');
        if (!c) { out.push({ lb: o, skip: 'no rect' }); continue; }
        await page.mouse.click(c.x, c.y); await L.sleep(1800);
        out.push(await scan('bubble ' + o));
        /* a bloom may need a 2nd tap on an orb; tap every visible orb/button that names a panel once */
    }
    for (const tab of ['home', 'fuel', 'move', 'sleep', 'me', 'stats']) {
        await page.evaluate(t => { try { LowiR2.closeAll(); } catch (e) {} try { goTab(t); } catch (e) {} }, tab); await L.sleep(1500);
        out.push(await scan('tab ' + tab));
    }
    out.push(await page.evaluate(() => { const c = document.getElementById('fsCard'); return { lb: 'fsCard', exists: !!c, link: c && (c.querySelector('.fs-link') || {}).innerText }; }));
    for (const fn of ['LowiFastStop.open()', 'LowiSpirit.logMeal && LowiSpirit.logMeal()', 'LowiSpirit.open && LowiSpirit.open("meal")']) {
        await page.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} });
        await L.sleep(500);
        await page.evaluate(f => { try { (0, eval)(f); } catch (e) { window.__bh.err.push('call ' + f + ' ' + e.message); } }, fn); await L.sleep(1500);
        out.push(await scan('call ' + fn));
    }
    console.log(JSON.stringify(out.filter(o => !o.hits || o.hits.length || (o.err && o.err.length) || (o.rej && o.rej.length) || o.exists !== undefined || o.skip), null, 1));
    console.log('scanned', out.map(o => o.lb).join(', '));
    if (perr.length) console.log('PAGEERROR ' + JSON.stringify(perr).slice(0, 800));
    await browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(2); });
