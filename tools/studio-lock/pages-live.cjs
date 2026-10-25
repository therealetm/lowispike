#!/usr/bin/env node
/* Studio is private (25 Oct 2026): the standalone Affiliates and Creation pages and Community > Studio, in a simulated iPhone 13.
   node tools/studio-lock/pages-live.cjs [--engine chromium|webkit] [--lang de|en|es] [--url https://therealetm.github.io/lowispike/] [--part pages|app|all]
   pages: logged out, then a normal (test) account: affiliates/, create/ and an affiliate invite link (?ref=) show only the lock
          (no page content, no page script fetched); a wrong PIN is refused; the PIN opens the page with the "Private · only you"
          badge; the other page then opens on this device; Lock locks this device again (both pages); an admin account goes
          straight in, and after Lock even the admin's device stays locked until the PIN.
   app:   Community > Studio unlocked shows the badge + Lock; Lock shows the locked panel, drops the pages and stays locked after
          a reload until the PIN.
   Local (no --url): this folder, studio_access / studio_unlock answered here (PIN 4321, admin = a session token "admin").
   Live (--url): the real server. The PIN comes from STUDIO_PIN (never in this file). The normal account is a fresh anonymous
   test account (lowi_test) made here and deleted at the end through the delete-my-account function. The live server has no
   test admin (no database access from this machine), so the admin step answers studio_access in the browser for that
   account only: it proves the page's admin path, the server's admin check was proven live by the first Studio lock task.
   WebKit on this VM: SIM_WK_VIEWPORT=1 SIM_REDUCED_MOTION=1 SIM_WK_NOSHOT=1, one WebKit run at a time. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const H = require('../sim/harness.cjs'), pw = H.pw;
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const engine = arg('engine', 'chromium'), lang = arg('lang', 'de'), live = arg('url', ''), part = arg('part', 'all'), out = arg('out', '/tmp/studio-pages-check');
fs.mkdirSync(out, { recursive: true });
const ROOT = path.join(__dirname, '..', '..');
const LOCAL_PIN = '4321', LOCAL_PASS = 'c0ffee'.repeat(8);
const PIN = live ? (process.env.STUDIO_PIN || '') : LOCAL_PIN, WRONG = PIN === '0000' ? '1111' : '0000';
const CFG = { url: 'https://vnfwmifmsfecascwaody.supabase.co', key: 'sb_publishable_iVA3wCYxzfWu2q8SSgieWw_adXbx4Qd' };
const REF = '0f8c2a52-1d3e-4b6f-9a7c-2e5d8b1c4f60';
const wk = engine === 'webkit';
const res = []; const ok = (name, pass, info) => { res.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + (typeof info === 'string' ? info : JSON.stringify(info)).slice(0, 400) : '')); };
const T = require('../../studio-lock-core.js').text(lang);

function serve() {
    const TY = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.txt': 'text/plain' };
    return new Promise(r => { const s = http.createServer((q, rs) => { let u = decodeURIComponent(q.url.split('?')[0]).replace(/^\/lowispike/, ''); if (u.endsWith('/')) u += 'index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { rs.writeHead(403); rs.end(); return; } fs.readFile(f, (e, b) => { if (e) { rs.writeHead(404); rs.end(); return; } rs.writeHead(200, { 'Content-Type': TY[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); rs.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); });
}
async function api(p, body, token) {
    const r = await fetch(CFG.url + p, { method: 'POST', headers: { apikey: CFG.key, Authorization: 'Bearer ' + (token || CFG.key), 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    let d = null; try { d = await r.json(); } catch (e) { } return { status: r.status, data: d };
}

async function pages(base) {
    const browser = await pw[engine].launch({});
    const dev = wk ? Object.assign({}, pw.devices['iPhone 13']) : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true };
    if (wk && process.env.SIM_WK_VIEWPORT === '1') dev.viewport = { width: 390, height: 844 };
    if (process.env.SIM_REDUCED_MOTION === '1') dev.reducedMotion = 'reduce';
    let session = null;
    for (const who of ['logged-out', 'account']) {
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block', locale: lang }));
        const P = await ctx.newPage(); const errs = [], pageReq = [], rpcAuth = [];
        let adminStub = false;
        P.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
        P.on('request', q => { const u = q.url(); if (/\/(affiliates|create)\/(?!index\.html|\?|$)[\w.-]+\.(js|css)/.test(u) || /app-voice\.js/.test(u)) pageReq.push(u.replace(/^.*\/lowispike/, '')); if (/rpc\/studio_/.test(u)) rpcAuth.push((q.headers().authorization || '').slice(7, 27)); });
        await ctx.route(u => /\/rest\/v1\/rpc\/studio_(access|unlock)/.test(String(u)), async route => {
            const q = route.request(), b = (() => { try { return JSON.parse(q.postData() || '{}'); } catch (e) { return {}; } })(), auth = q.headers().authorization || '';
            const userTok = session && auth === 'Bearer ' + session.access_token;
            if (adminStub && userTok && /studio_access/.test(q.url())) return route.fulfill({ status: 200, contentType: 'application/json', body: 'true' });
            if (live) return route.continue();
            const data = /studio_access/.test(q.url()) ? b.pass === LOCAL_PASS : b.pin === LOCAL_PIN ? { ok: true, pass: LOCAL_PASS } : { ok: false, reason: 'wrong' };
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
        });
        await P.goto(base + 'robots.txt');
        await P.evaluate(l => { localStorage.setItem('lowispike.lang', l); }, lang);
        if (who === 'account') {
            if (live) {
                const r = await api('/auth/v1/signup', { data: { lowi_test: 'true' } });
                ok('account: fresh anonymous test account made', r.status === 200 && r.data && r.data.access_token, r.status);
                session = r.data; if (session && !session.expires_at) session.expires_at = Math.floor(Date.now() / 1000) + (session.expires_in || 3600);
            } else session = { access_token: 'user-token-' + Date.now(), refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: '11111111-2222-4333-8444-555555555555' } };
            await P.evaluate(s => localStorage.setItem('lowi.auth', JSON.stringify(s)), session);
        }
        const tag = who;
        const wait = () => P.waitForFunction(() => window.LowiStudioGate && LowiStudioGate.state() !== 'checking', null, { timeout: 60000 }).catch(() => { });
        const look = () => P.evaluate(() => {
            const l = document.querySelector('.sl-lock.sl-page'), r = l && l.getBoundingClientRect(), b = document.querySelector('.sl-open.sl-top'), br = b && b.getBoundingClientRect();
            return { state: window.LowiStudioGate && LowiStudioGate.state(), lock: !!(l && r.width >= 380 && r.height >= 600), title: l && (l.querySelector('.sl-t') || {}).textContent,
                key: !!document.querySelector('.sl-lock .sl-key:not([hidden])'), app: !!document.getElementById('app'), main: !!document.querySelector('main'), start: (document.getElementById('startTitle') || {}).textContent || '',
                tpl: !!document.getElementById('studioPage'), badge: b ? b.textContent : '', badgeIn: !!(br && br.top >= 0 && br.bottom <= innerHeight && br.left >= 0 && br.right <= innerWidth && [[0.2, 0.5], [0.5, 0.5], [0.9, 0.5]].every(([x, y]) => { const e = document.elementFromPoint(br.left + br.width * x, br.top + br.height * y); return e && b.contains(e); })), msg: (document.querySelector('.sl-msg') || {}).textContent || '',
                pass: (localStorage.getItem('lowi.studio.pass') || '').length, locked: localStorage.getItem('lowi.studio.locked'), ref: localStorage.getItem('lowi.aff.ref'), title2: document.title };
        });
        const go = async (p) => { await P.goto(base + p, { waitUntil: 'load', timeout: 120000 }); await wait(); await H.sleep(wk ? 2500 : 900); return look(); };
        const shot = n => (wk && process.env.SIM_WK_NOSHOT === '1') ? 0 : P.screenshot({ path: out + '/' + engine + '-' + lang + '-' + tag + '-' + n + '.png' }).catch(() => { });
        const lockedOk = (s) => s.state === 'locked' && s.lock && s.title === T.title && s.key && !s.app && !s.main && s.tpl && !s.badge;

        let s = await go('affiliates/');
        ok(tag + ': affiliates/ shows only the lock ("' + T.title + '"), no page content, no page script', lockedOk(s) && pageReq.length === 0, { s, pageReq });
        await shot('aff-locked');
        s = await go('create/');
        ok(tag + ': create/ shows only the lock, no page content', lockedOk(s) && pageReq.length === 0, s);
        s = await go('affiliates/?ref=' + REF);
        ok(tag + ': an affiliate invite link shows the same lock, only the ref is remembered', lockedOk(s) && s.ref === REF && pageReq.length === 0, s);
        if (who === 'account') ok('account: the check went out with the account, not the public key', rpcAuth.some(a => a && session && a === session.access_token.slice(0, 20)), rpcAuth.slice(-3));

        const typePin = async v => {
            if (!(await P.$('.sl-pin:not([hidden])'))) { await P.tap('.sl-key'); await H.sleep(500); }
            await P.fill('.sl-pin input', ''); await P.type('.sl-pin input', v, { delay: 30 }); await P.tap('.sl-go');
        };
        if (who === 'logged-out' || !live) {   /* live: one wrong try per engine is enough (the server limits wrong tries for everyone) */
            await typePin(WRONG);
            await P.waitForFunction(m => (document.querySelector('.sl-msg') || {}).textContent === m, T.wrong, { timeout: 30000 }).catch(() => { });
            s = await look();
            ok(tag + ': wrong PIN refused ("' + T.wrong + '"), still locked, nothing loaded', s.msg === T.wrong && s.state === 'locked' && s.lock && !s.app && !s.main && s.tpl && !s.badge && pageReq.length === 0, { msg: s.msg, state: s.state });
            await shot('wrong');
        }
        await typePin(PIN);
        await P.waitForFunction(() => window.LowiStudioGate && LowiStudioGate.state() === 'open', null, { timeout: 30000 }).catch(() => { });
        await P.waitForFunction(() => (document.getElementById('startTitle') || {}).textContent, null, { timeout: 30000 }).catch(() => { });
        await H.sleep(wk ? 2500 : 1000);
        s = await look();
        ok(tag + ': the PIN opens Affiliates, with "🔒 ' + T.badge + '" and "' + T.lockNow + '" on screen', s.state === 'open' && !s.lock && s.app && s.start.length > 3 && s.badge.indexOf(T.badge) >= 0 && s.badge.indexOf(T.lockNow) >= 0 && s.badgeIn && s.pass === 48, s);
        ok(tag + ': the page scripts loaded only now', pageReq.some(u => /blueprint\.js/.test(u)), pageReq.length);
        await shot('aff-open');
        s = await go('create/');
        ok(tag + ': create/ then opens on this device, badge shown', s.state === 'open' && s.main && s.badge.indexOf(T.badge) >= 0, s);
        await shot('create-open');
        await P.tap('.sl-lockbtn');
        await P.waitForLoadState('load'); await wait(); await H.sleep(wk ? 2500 : 900);
        s = await look();
        ok(tag + ': Lock locks this device again', lockedOk(s) && s.locked === '1' && s.pass === 0, s);
        s = await go('affiliates/');
        ok(tag + ': affiliates/ is locked again too', lockedOk(s), s.state);
        await shot('relocked');

        if (who === 'account') {
            adminStub = true;   /* live: the server's admin answer for this account only (see the header) */
            s = await go('affiliates/');
            ok('admin: after Lock, even the admin\'s device stays locked until the PIN', lockedOk(s), s.state);
            await P.evaluate(() => localStorage.removeItem('lowi.studio.locked'));
            s = await go('affiliates/');
            ok('admin: straight in, no PIN typed', s.state === 'open' && s.app && s.pass === 0 && s.badge.indexOf(T.badge) >= 0, s);
            s = await go('create/');
            ok('admin: create/ straight in', s.state === 'open' && s.main, s.state);
            await shot('admin-open');
            adminStub = false;
            if (live && session) {
                const d = await api('/functions/v1/delete-my-account', {}, session.access_token);
                ok('account: test account deleted', d.status === 200, { status: d.status, data: d.data });
            }
        }
        ok(tag + ': no page errors', errs.length === 0, errs.slice(0, 3));
        await ctx.close();
    }
    await browser.close();
}

/* Community > Studio in the app: local only (the fake cloud; an admin on this device, as Emmanuel's phone is) */
async function app() {
    const R = await H.open({ engine, lang, url: '', device: 'iPhone 13', probe: false, fresh: false, viewport: { width: 390, height: 844 } });
    const P = R.page; let admin = true;
    await R.ctx.route(u => /\/rest\/v1\/rpc\/studio_(access|unlock)/.test(String(u)), route => {
        const q = route.request(), b = (() => { try { return JSON.parse(q.postData() || '{}'); } catch (e) { return {}; } })();
        const data = /studio_access/.test(q.url()) ? (admin || b.pass === LOCAL_PASS) : b.pin === LOCAL_PIN ? { ok: true, pass: LOCAL_PASS } : { ok: false, reason: 'wrong' };
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    const boot = async () => { await R.goto(); await H.sleep(wk ? 12000 : 7000); await P.evaluate(l => { try { LowiLang.set(l); } catch (e) { } try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot', 'gate-up'); try { LowiTutorial.stop(); } catch (e) { } }, lang); await H.sleep(1200); };
    const openStudio = async () => {
        for (let i = 0; i < 4; i++) { await P.evaluate(() => window.goTab('foryou')); if (await P.waitForSelector('#tab-foryou .rm-tab[data-rm="studio"]', { state: 'attached', timeout: 30000 }).then(() => true, () => false)) break; }
        await H.sleep(800); await R.tap('#tab-foryou .rm-tab[data-rm="studio"]'); await H.sleep(wk ? 6000 : 3000);
    };
    const st = () => P.evaluate(() => {
        const v = document.querySelector('#tab-foryou .rm-view'), l = v && v.querySelector(':scope>.sl-lock'), b = v && v.querySelector(':scope>.sl-open'), br = b && !b.hidden && b.getBoundingClientRect();
        const sw = v && v.querySelector(':scope>.rm-sw'), sr = sw && sw.getBoundingClientRect(), fr = v ? [...v.querySelectorAll(':scope>iframe')] : [];
        const f = fr.find(x => !x.hidden), frr = f && f.getBoundingClientRect();
        return { open: LowiStudioLock.isOpen(), lock: !!(l && !l.hidden), badge: br && br.height ? b.textContent : '', badgeBox: br && [Math.round(br.left), Math.round(br.top), Math.round(br.right), Math.round(br.bottom)],
            belowSwitch: !!(br && sr && br.top >= sr.bottom - 0.5), aboveFrame: !!(br && frr && br.bottom <= frr.top + 0.5), frames: fr.length, locked: localStorage.getItem('lowi.studio.locked'), pass: (localStorage.getItem('lowi.studio.pass') || '').length };
    });
    try {
        R.step = 'boot'; await boot(); await openStudio();
        let s = await st();
        ok('app: the owner\'s Studio opens with "🔒 ' + T.badge + '" and "' + T.lockNow + '" between the switch and the page', s.open && !s.lock && s.badge.indexOf(T.badge) >= 0 && s.badge.indexOf(T.lockNow) >= 0 && s.belowSwitch && s.aboveFrame && s.frames > 0, s);
        await R.shot(out + '/' + engine + '-' + lang + '-app-open.png');
        await R.tap('#tab-foryou .sl-lockbtn'); await H.sleep(wk ? 4000 : 1500);
        s = await st();
        ok('app: Lock shows the locked panel, the pages go, the badge goes', !s.open && s.lock && !s.badge && s.frames === 0 && s.locked === '1', s);
        await R.shot(out + '/' + engine + '-' + lang + '-app-locked.png');
        R.step = 'reload'; await boot(); await openStudio();
        s = await st();
        ok('app: after a reload this device stays locked although the account is the owner', !s.open && s.lock && s.frames === 0, s);
        await R.tap('#tab-foryou .sl-key'); await H.sleep(700);
        await P.fill('#tab-foryou .sl-pin input', ''); await P.type('#tab-foryou .sl-pin input', LOCAL_PIN, { delay: 30 }); await R.tap('#tab-foryou .sl-go');
        await P.waitForFunction(() => LowiStudioLock.isOpen() && document.querySelector('#tab-foryou .rm-view>iframe'), null, { timeout: 30000 }).catch(() => { });
        await H.sleep(wk ? 4000 : 1500);
        s = await st();
        ok('app: the PIN opens it again and clears the device lock', s.open && !s.lock && s.frames > 0 && !s.locked && s.badge.indexOf(T.badge) >= 0, s);
        ok('app: no page errors', R.errs.length === 0, R.errs.slice(0, 3));
    } catch (e) { ok('app run finished (step ' + R.step + ')', false, String(e && e.message || e).slice(0, 300)); }
    await R.close();
}

(async () => {
    if (live && !PIN) { console.log('STUDIO_PIN is not set'); process.exit(2); }
    let srv = null, base = live ? live.replace(/\/?$/, '/') : '';
    if (!base) { srv = await serve(); base = 'http://127.0.0.1:' + srv.address().port + '/lowispike/'; }
    try { if (part !== 'app') await pages(base); } catch (e) { ok('pages run finished', false, String(e && e.message || e).slice(0, 300)); }
    if (srv) srv.close();
    if (part !== 'pages' && !live) await app();
    const f = res.filter(r => !r.pass).length;
    console.log((f ? 'FAILED ' : 'ALL PASS ') + (res.length - f) + '/' + res.length + ' ' + engine + ' ' + lang + (live ? ' live' : ' local'));
    process.exit(f ? 1 : 0);
})();
