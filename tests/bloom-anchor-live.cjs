'use strict';
/* Oct 18 browser check (E-man, iPad: "Move keeps moving into the middle ... and Meals also").
   On Home, tapping Move must fan Quick / Medium / Long / Epic out of the Move bubble AWAY from Misty: every orb on
   screen, none on Misty, none on each other, and the Move bubble itself must not jump while the choices open and close.
   On iPad and desktop sizes the Meals panel must open beside Misty, not over her in the middle.
   Runs the app from a local folder (or --base URL) with a local fixture account: every request that is not a GET to that
   host is aborted, so no Supabase, no writes, no real account.
     node tests/bloom-anchor-live.cjs [--root DIR | --base URL] [--engine chromium|webkit] [--sizes 390x844,1180x820] [--reduced]
   Needs Playwright at /tmp/pw (npm i playwright in /tmp/pw). Exit 0 = pass, 1 = a check failed. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const flag = k => process.argv.includes('--' + k);
const ROOT = path.resolve(arg('root', path.join(__dirname, '..')));
const BASE = arg('base', '');
const ENGINE = arg('engine', 'chromium');
const SIZES = arg('sizes', '390x844,820x1180,1180x820,1440x900').split(',').map(s => s.split('x').map(Number));
const SHOTS = arg('shots', '');
const pw = require('/tmp/pw/node_modules/playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() {
    return new Promise(r => {
        const s = http.createServer((q, res) => {
            let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
            const f = path.join(ROOT, u);
            if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
            fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
        });
        s.listen(0, '127.0.0.1', () => r(s));
    });
}
const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] }));
} catch (e) { }`;
/* Home's bubbles float gently, so tap the centre where it is now instead of waiting for it to hold still */
async function tap(page, sel) { const b = await page.locator(sel).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
const fails = [];
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };

async function run(browser, url, W, H) {
    const tag = ENGINE + ' ' + W + 'x' + H + (flag('reduced') ? ' reduced-motion' : '');
    const phone = W < 700;
    const UA = phone
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
        : W >= 1400 ? undefined : 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    const touch = W < 1400;
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, screen: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: touch, isMobile: touch && ENGINE !== 'firefox', userAgent: UA, serviceWorkers: 'block', reducedMotion: flag('reduced') ? 'reduce' : 'no-preference' });
    const host = new URL(url).host;
    let blocked = 0;
    await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); blocked++; return r.abort(); });
    await ctx.addInitScript(INIT);
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(url, { waitUntil: 'load', timeout: 120000 });
    const live = await page.waitForFunction(() => document.documentElement.classList.contains('wh-home') && document.querySelector('#whHud .wh-move') && document.querySelector('#whHud .wh-meals') && document.getElementById('spBubble'), null, { timeout: 90000 }).then(() => true, () => false);
    check(live, tag + ': Home with Misty, Move and Meals is up');
    if (!live) { await ctx.close(); return; }
    /* let the camera settle: Misty's glass stops resizing */
    /* the 3D world takes over from the plain Home a few seconds in; Misty then eases to her size */
    await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live'), null, { timeout: 30000 }).catch(() => { });
    /* (headless browsers draw the 3D world at a few frames a second, so this can take half a minute) */
    const ws = [];
    for (let i = 0; i < 70; i++) {
        ws.push(await page.evaluate(() => document.getElementById('spBubble').getBoundingClientRect().width));
        if (ws.length >= 5 && Math.max(...ws.slice(-5)) - Math.min(...ws.slice(-5)) <= 1) break;
        await sleep(700);
    }
    await sleep(1500);
    const geo = () => page.evaluate(() => {
        const R = e => { const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom, w: q.width, h: q.height }; };
        const m = R(document.getElementById('spBubble'));
        const orbs = [...document.querySelectorAll('.wm-bloom .wm-orb')].map(o => ({ x: parseFloat(o.style.left), y: parseFloat(o.style.top), d: o.offsetWidth }));
        return { misty: { x: m.l + m.w / 2, y: m.t + m.h / 2, r: Math.min(m.w, m.h) / 2 }, move: R(document.querySelector('#whHud .wh-move')), orbs, vw: innerWidth, vh: innerHeight, open: !!document.querySelector('.wm-bloom'), focus: document.activeElement && document.activeElement.className };
    });
    const g0 = await geo();
    /* ---- Move ---- */
    await tap(page, '#whHud .wh-move');
    await page.waitForSelector('.wm-bloom.on .wm-orb', { timeout: 5000 }).catch(() => { });
    await sleep(150);
    const g1 = await geo();
    check(g1.orbs.length === 4, tag + ': Move opens four choices');
    /* the bubbles bob a few px and drift slowly on the ring, so a jump is anything over 10px */
    const near = (a, b) => Math.abs(a.l - b.l) <= 10 && Math.abs(a.t - b.t) <= 10;
    check(near(g0.move, g1.move), tag + ': Move bubble stays where it was while the choices open (' + Math.round(g0.move.l) + ',' + Math.round(g0.move.t) + ' -> ' + Math.round(g1.move.l) + ',' + Math.round(g1.move.t) + ')');
    const onMisty = g1.orbs.filter(o => Math.hypot(o.x - g1.misty.x, o.y - g1.misty.y) < g1.misty.r + o.d / 2);
    check(onMisty.length === 0, tag + ': no Move choice sits on Misty (' + onMisty.length + ' of 4 do; Misty centre ' + Math.round(g1.misty.x) + ',' + Math.round(g1.misty.y) + ' r' + Math.round(g1.misty.r) + '; orbs ' + g1.orbs.map(o => Math.round(o.x) + ',' + Math.round(o.y)).join(' ') + ')');
    const off = g1.orbs.filter(o => o.x - o.d / 2 < 0 || o.y - o.d / 2 < 0 || o.x + o.d / 2 > g1.vw || o.y + o.d / 2 > g1.vh);
    check(off.length === 0, tag + ': every Move choice is fully on screen');
    let overlap = 0; for (let i = 0; i < g1.orbs.length; i++) for (let j = i + 1; j < g1.orbs.length; j++) if (Math.hypot(g1.orbs[i].x - g1.orbs[j].x, g1.orbs[i].y - g1.orbs[j].y) < g1.orbs[i].d - 1) overlap++;
    check(overlap === 0, tag + ': the choices do not sit on each other');
    /* away from Misty: the middle of the four is farther from her than the Move bubble is */
    const cx = g1.move.l + g1.move.w / 2, cy = g1.move.t + g1.move.h / 2;
    const mid = g1.orbs.reduce((s, o) => ({ x: s.x + o.x / 4, y: s.y + o.y / 4 }), { x: 0, y: 0 });
    check(Math.hypot(mid.x - g1.misty.x, mid.y - g1.misty.y) > Math.hypot(cx - g1.misty.x, cy - g1.misty.y), tag + ': the choices fan out away from Misty, not toward her');
    check(/wm-orb/.test(g1.focus || ''), tag + ': keyboard focus moves onto the first choice');
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, ENGINE + '-' + W + 'x' + H + '-move.png') });
    const note = await page.evaluate(() => { const n = document.querySelector('.wm-bloom .wm-note'); if (!n) return null; return { l: parseFloat(n.style.left), t: parseFloat(n.style.top), w: n.offsetWidth, h: n.offsetHeight }; });
    if (note) {
        const nx = Math.max(note.l, Math.min(g1.misty.x, note.l + note.w)), ny = Math.max(note.t, Math.min(g1.misty.y, note.t + note.h));
        check(Math.hypot(nx - g1.misty.x, ny - g1.misty.y) >= g1.misty.r - 1, tag + ': the line under the choices stays off Misty');
    }
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.wm-bloom'), null, { timeout: 4000 }).catch(() => { });
    const g2 = await geo();
    check(!g2.open, tag + ': Escape closes the choices');
    check(near(g0.move, g2.move), tag + ': Move bubble is still in its place after closing');
    /* tap a choice: it closes and is taken (local fixture only) */
    await tap(page, '#whHud .wh-move');
    await page.waitForSelector('.wm-bloom.on .wm-orb', { timeout: 5000 }).catch(() => { });
    /* wait for the orbs to finish popping out, like a person would */
    await page.waitForFunction(() => [...document.querySelectorAll('.wm-bloom .wm-orb')].every(o => !o.getAnimations().some(a => a.playState === 'running')), null, { timeout: 8000 }).catch(() => { });
    await sleep(100);
    console.log('info ' + tag + ': reopened ' + await page.evaluate(() => { const b = document.querySelector('.wm-bloom'); if (!b) return 'none'; const o = b.querySelector('.wm-quick'), q = o.getBoundingClientRect(), e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return b.className + ' quick at ' + Math.round(q.left + q.width / 2) + ',' + Math.round(q.top + q.height / 2) + ' top=' + (e ? e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 40) + ' in orb ' + o.contains(e) : 'null'); }));
    await page.locator('.wm-bloom .wm-orb.wm-quick').click({ force: true });
    const closed = await page.waitForFunction(() => !document.querySelector('.wm-bloom'), null, { timeout: 5000 }).then(() => true, () => false);
    if (!closed) console.log('info ' + tag + ': after Quick ' + await page.evaluate(() => { const b = document.querySelector('.wm-bloom'); return b ? b.className + ' orbs=' + b.querySelectorAll('.wm-orb').length + ' chosen=' + !!b.querySelector('.wm-chosen') : 'none'; }));
    check(closed, tag + ': tapping Quick takes it and closes the choices');
    await sleep(600);
    /* ---- Meals ---- */
    await tap(page, '#whHud .wh-meals');
    const sheet = await page.waitForSelector('.r2-ov .r2-sh', { timeout: 6000 }).then(() => true, () => false);
    check(sheet, tag + ': Meals opens its panel');
    if (sheet) {
        await page.waitForFunction(() => { const s = document.querySelector('.r2-ov .r2-sh'); return s && s.getAnimations().filter(a => a.playState === 'running').length === 0; }, null, { timeout: 8000 }).catch(() => { });
        await sleep(200);
        const s = await page.evaluate(() => { const e = document.querySelector('.r2-ov .r2-sh'), q = e.getBoundingClientRect(), m = document.getElementById('spBubble').getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom, side: e.dataset.mbSide || '', misty: { x: m.left + m.width / 2, y: m.top + m.height / 2, r: Math.min(m.width, m.height) / 2 }, vw: innerWidth, vh: innerHeight }; });
        const nx = Math.max(s.l, Math.min(s.misty.x, s.r)), ny = Math.max(s.t, Math.min(s.misty.y, s.b));
        const clear = Math.hypot(nx - s.misty.x, ny - s.misty.y) >= s.misty.r - 1;
        if (SHOTS) await page.screenshot({ path: path.join(SHOTS, ENGINE + '-' + W + 'x' + H + '-meals.png') });
        if (!phone) {
            check(clear, tag + ': the Meals panel opens beside Misty, not over her (panel ' + [s.l, s.t, s.r, s.b].map(Math.round).join(',') + ', side ' + (s.side || 'none') + ')');
            check(s.l >= 0 && s.t >= 0 && s.r <= s.vw + 0.5 && s.b <= s.vh + 0.5, tag + ': the Meals panel is fully on screen');
        } else console.log('info ' + tag + ': phone keeps the floating Meals sheet (' + (clear ? 'clear of' : 'over part of') + ' Misty)');
        await page.keyboard.press('Escape');
        const gone = await page.waitForFunction(() => !document.querySelector('.r2-ov .r2-sh'), null, { timeout: 5000 }).then(() => true, () => false);
        check(gone, tag + ': Escape closes the Meals panel');
        const g3 = await geo();
        console.log('info ' + tag + ': Move after Meals at ' + Math.round(g3.move.l) + ',' + Math.round(g3.move.t));
    }
    check(errs.length === 0, tag + ': no page errors' + (errs.length ? ' (' + errs.slice(0, 2).join(' | ') + ')' : ''));
    console.log('info ' + tag + ': ' + blocked + ' requests to other hosts or writes were blocked');
    await ctx.close();
}

(async () => {
    let srv = null, url = BASE;
    if (!url) { srv = await serve(); url = 'http://127.0.0.1:' + srv.address().port + '/index.html'; }
    const browser = await pw[ENGINE].launch();
    try { for (const [W, H] of SIZES) await run(browser, url, W, H); }
    finally { await browser.close(); if (srv) srv.close(); }
    console.log(fails.length ? '\n' + fails.length + ' check(s) failed' : '\nall checks passed');
    process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
