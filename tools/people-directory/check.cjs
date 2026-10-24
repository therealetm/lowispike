/* People directory check in a simulated browser (Oct 24, 2026; tests/people-directory.test.cjs pins the code).
   Opens Community, the Community menu, the People entry; checks the full list (offline people included, no presence words,
   no numbers boast), search, the person card above the list on tap, back to the list, Escape, and the layout at iPhone
   390x844 and iPad 820x1180 / 1180x820: inside the screen, 44px close button, rows at least 44px tall, readable names.
   Signed in against the fake Supabase of tools/sim/mock-cloud.cjs (45 made-up members with photos, nobody seated in a
   room, so everyone is offline); nothing reaches the real project. The directory must list exactly the Add a friend list
   (LowiCellRoom.people(): real humans, offline included), never a demo bot. Proves the app's own code, not the live
   member list.
   Usage: node tools/people-directory/check.cjs [base-url]   ENG=webkit|chromium (default webkit)  SHOT=/dir for screenshots */
'use strict';
const path = require('path'), http = require('http'), fs = require('fs');
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const cloud = require('../sim/mock-cloud.cjs');
const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const SIZES = [['iphone', 390, 844], ['ipad-portrait', 820, 1180], ['ipad-landscape', 1180, 820]];
function rgb(s) { const m = String(s).match(/rgba?\(([^)]+)\)/); return m ? m[1].split(',').map(Number) : null; }
function lum(c) { const a = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
async function main() {
    let base = process.argv[2], srv = null;
    if (!base) {
        srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
        await new Promise(ok => srv.listen(0, ok));
        base = 'http://localhost:' + srv.address().port + '/';
    }
    let eng = process.env.ENG || 'webkit', browser;
    try { browser = await pw[eng].launch(); } catch (e) { console.log('(' + eng + ' not available; using chromium)'); eng = 'chromium'; browser = await pw.chromium.launch(); }
    let fails = 0;
    const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
    for (const [name, w, h] of SIZES) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block', reducedMotion: 'reduce' });
        const host = new URL(base).host;
        await ctx.route(u => { try { const x = new URL(u); return !(x.protocol === 'data:' || x.protocol === 'blob:' || x.host === host || x.host.endsWith('.supabase.co')); } catch (e) { return true; } }, r => r.abort());
        await cloud.install(ctx, { members: 45, messages: 40, me: 'Emmanuel' });
        await ctx.addInitScript(() => { try { const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.done', '1');
            if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Emmanuel', bday: '1990-08-01' }, xp: 2400, ledger: [], logs: [], saved: [], settings: { lang: 'en' } })); } catch (e) {} });
        if (process.env.NOAUDIO) await ctx.addInitScript(() => { try { delete window.AudioContext; delete window.webkitAudioContext; window.AudioContext = undefined; window.webkitAudioContext = undefined; HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; } catch (e) {} });
        const page = await ctx.newPage();
        const errs = []; page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
        await page.goto(base + (base.includes('?') ? '&' : '?') + 'pd=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
        await page.waitForFunction(() => window.LowiPeopleDir && window.LOWI_CLOUD && window.LowiCellRoom && window.LowiCommunity && window.goTab, null, { timeout: 90000 });
        await page.waitForFunction(() => LOWI_CLOUD.live && LOWI_CLOUD.live() && (LOWI_CLOUD.people() || []).length > 10, null, { timeout: 60000 }).catch(() => {});
        const build = await page.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || window.LOWI_BUILD || '');
        await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {} goTab('foryou'); });
        await page.waitForTimeout(2500);
        await page.waitForFunction(() => { const t = document.getElementById('tab-foryou'); return t && getComputedStyle(t).opacity === '1'; }, null, { timeout: 45000 }).catch(() => {});
        if (process.env.DBG) console.log(await page.evaluate(() => { const m = document.querySelector('.rm-menu-btn'); if (!m) return 'no menu button'; const r = m.getBoundingClientRect(); let e = m, hid = ''; while (e && e !== document) { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') { hid = (e.id || e.className || e.tagName) + ' ' + cs.visibility + '/' + cs.display + '/' + cs.opacity; break; } e = e.parentNode; } const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return JSON.stringify({ r: [r.left, r.top, r.width, r.height], hid, top: t && (t.id + '.' + String(t.className).slice(0, 60)), active: (document.querySelector('.tab.active,[data-tab].on') || {}).id }); }));
        if (process.env.NOBLUR) await page.addStyleTag({ content: '*,*::before,*::after{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}' });
        const menuBtn = page.locator('.rm-menu-btn').first();
        ok(await menuBtn.count() > 0, name + ': Community menu button exists');
        /* a real tap at the button's centre (WebKit here keeps the glowing button 'not stable' for Playwright's click) */
        const tapAt = async loc => { if (process.env.JSCLICK) { const n = await loc.count(); if (!n) return false; await loc.evaluate(e => e.click()); return true; } const bb = await loc.boundingBox(); if (!bb) return false; await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); return true; };
        if (process.env.DIRECT) {
            /* WebKit in this VM crashes when the Community menu opens, also on the code before this change: open People directly */
            console.log('SKIP ' + name + ': menu tap (DIRECT mode), opening People with LowiPeopleDir.open()');
            await page.evaluate(() => LowiPeopleDir.open());
        } else {
            ok(await tapAt(menuBtn), name + ': tapped the Community menu button');
            await page.waitForTimeout(500);
            const item = page.locator('.rm-menu [data-rmm="dir"]');
            ok(await item.count() === 1, name + ': People entry in the Community menu');
            const label = (await item.textContent().catch(() => '')).trim();
            ok(/People/.test(label) && !/\d/.test(label), name + ': entry reads "' + label + '" (no member count)');
            if (await item.count()) await tapAt(item);
        }
        await page.waitForSelector('.pd-ov .pd-row', { timeout: 10000 }).catch(() => {});
        const st = await page.evaluate(() => {
            const ov = document.querySelector('.pd-ov'), card = ov && ov.querySelector('.pd-card'), x = ov && ov.querySelector('.pd-x');
            const rows = ov ? [...ov.querySelectorAll('.pd-row')] : [];
            const r = card ? card.getBoundingClientRect() : null, xr = x ? x.getBoundingClientRect() : null;
            const names = rows.map(b => b.querySelector('.pd-n').textContent);
            const n0 = rows[0] && rows[0].querySelector('.pd-n'), bg = card && getComputedStyle(card).backgroundImage;
            return { open: !!ov, role: ov && ov.getAttribute('role'), modal: ov && ov.getAttribute('aria-modal'), names, text: ov ? ov.innerText : '',
                card: r && { l: r.left, t: r.top, r: r.right, b: r.bottom }, x: xr && { w: xr.width, h: xr.height, t: xr.top },
                minRow: rows.length ? Math.min(...rows.map(b => b.getBoundingClientRect().height)) : 0, ink: n0 && getComputedStyle(n0).color, bg,
                expect: LowiCellRoom.people().filter(p => !LowiCommunity.blocked(p.uid)).length, cloud: (LOWI_CLOUD.people() || []).length, bots: (window.LOWI_BOTS || []).map(b => b.n),
                scroll: ov && ov.querySelector('.pd-list').scrollHeight > ov.querySelector('.pd-list').clientHeight, sw: document.documentElement.scrollWidth, vw: innerWidth, vh: innerHeight };
        });
        ok(st.open && st.role === 'dialog' && st.modal === 'true', name + ': directory opens as a dialog');
        ok(st.names.length > 10 && st.names.length === st.expect, name + ': lists the whole Add a friend list, offline people included (' + st.names.length + ' of ' + st.expect + ', ' + st.cloud + ' profiles in the cloud)');
        ok(!st.names.some(n => st.bots.includes(n)), name + ': no demo bot names');
        ok(st.names.join('|') === [...st.names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).join('|'), name + ': sorted by name');
        ok(!/\bonline\b|\bLevel\b|\bXP\b|\bkg\b/i.test(st.text.replace(/offline/gi, '')), name + ': no online, level, XP or weight words');
        ok(st.card && st.card.l >= 0 && st.card.t >= 0 && st.card.r <= st.vw + 0.5 && st.card.b <= st.vh + 0.5, name + ': panel inside the screen ' + JSON.stringify(st.card));
        ok(st.sw <= st.vw + 1, name + ': no sideways scroll');
        ok(st.x && st.x.w >= 44 && st.x.h >= 44, name + ': close button ' + (st.x && st.x.w) + 'x' + (st.x && st.x.h));
        ok(st.minRow >= 44, name + ': rows at least 44px tall (' + Math.round(st.minRow) + ')');
        ok(st.scroll, name + ': the list scrolls inside the panel');
        const stops = (String(st.bg).match(/rgba?\([^)]+\)/g) || []).map(rgb);
        const worst = stops.length && st.ink ? Math.min(...stops.map(s => ratio(rgb(st.ink), s))) : 0;
        ok(worst >= 4.5, name + ': name text contrast ' + worst.toFixed(1) + ':1 on the panel glass');
        if (process.env.SHOT) await page.screenshot({ path: path.join(process.env.SHOT, 'people-' + name + '.png') });
        const pick = st.names[Math.min(3, st.names.length - 1)] || 'x', qy = pick.split(' ')[0].slice(0, 3);
        await page.fill('.pd-q', qy);
        await page.waitForTimeout(200);
        const found = await page.evaluate(() => [...document.querySelectorAll('.pd-row .pd-n')].map(e => e.textContent));
        ok(found.includes(pick) && found.length < st.names.length, name + ': search "' + qy + '" finds ' + pick + ' (' + found.length + ' rows)');
        await page.fill('.pd-q', '');
        await page.waitForTimeout(200);
        await tapAt(page.locator('.pd-row').nth(2));
        await page.waitForTimeout(1200);
        const card = await page.evaluate(() => {
            const c = [...document.querySelectorAll('.cs-overlay')].pop(); if (!c) return null;
            const p = c.querySelector('.cp-card'), r = (p || c).getBoundingClientRect();
            const top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + Math.min(r.height / 2, 120)));
            return { above: !!(top && c.contains(top)), name: p ? (p.querySelector('h2') || {}).textContent : '', person: p && p.getAttribute('data-person'), sign: !!(p && /sign|Sternzeichen|Signo|Birthday|Geburtstag|Cumplea/i.test(p.innerText)) };
        });
        ok(card && card.above, name + ': person card opens above the list');
        ok(card && card.name && card.name.includes(st.names[2]) && card.person, name + ': card is the human profile of "' + (card && card.name) + '" with sign and birthday rows: ' + (card && card.sign));
        if (process.env.SHOT) await page.screenshot({ path: path.join(process.env.SHOT, 'people-card-' + name + '.png') });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(700);
        let still = await page.evaluate(() => ({ card: !!document.querySelector('.cs-overlay'), dir: !!document.querySelector('.pd-ov') }));
        if (still.card) { await page.evaluate(() => { const c = [...document.querySelectorAll('.cs-overlay')].pop(); const b = c && c.querySelector('.r2-close,[data-close],.cs-close,button[aria-label*="lose"]'); if (b) b.click(); else if (c) c.click(); }); await page.waitForTimeout(700); still = await page.evaluate(() => ({ card: !!document.querySelector('.cs-overlay'), dir: !!document.querySelector('.pd-ov') })); }
        ok(!still.card && still.dir, name + ': closing the card goes back to the list');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        ok(!(await page.evaluate(() => !!document.querySelector('.pd-ov'))), name + ': Escape closes the directory');
        ok(!errs.length, name + ': no page errors ' + errs.join(' | '));
        console.log('     ' + eng + ' ' + name + ' ' + w + 'x' + h + ' build ' + (build || '?'));
        await ctx.close();
    }
    await browser.close();
    if (srv) srv.close();
    console.log(fails ? fails + ' FAILED' : 'all passed (simulated ' + eng + ', not a physical device)');
    process.exit(fails ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
