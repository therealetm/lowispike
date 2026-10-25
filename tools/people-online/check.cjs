/* People: Online right now, in a simulated browser (Oct 25 2026; tests/people-online.test.cjs pins the code).
   Emmanuel: "When someone is online, it says '2 here now', but when I click, I don't see who."
   Signed in against the fake Supabase of tools/sim/mock-cloud.cjs (made-up members); real presence frames seat fake members in
   the one Community room (sim.seat), nothing reaches the real project. Per language (en/de/es) x theme (dark/day) x screen:
   - the header says "N here now" (you + the seated people); tapping that line opens People (not the menu) at Online right now
   - Online right now is the very first section: You first (data-me), then the seated people by name, each with a green dot;
     the count in the header equals the rows in that section; nobody online is listed again under Everyone else
   - live: one more person sits down -> the section and the header grow without reopening
   - a seated account the app flags as a bot / test account never shows and never counts
   - inside the screen, rows >= 44px, heading + names + You tag readable (AA 4.5:1) on the sheet glass, no sideways scroll
   - tapping an online row opens that person's card
   Usage: node tools/people-online/check.cjs [base-url]   ENG=webkit|chromium   SHOT=/dir   LANGS=en,de,es  THEMES=dark,light */
'use strict';
const path = require('path'), http = require('http'), fs = require('fs');
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const cloud = require('../sim/mock-cloud.cjs');
const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const SIZES = (process.env.SIZES || 'iphone13:390x844,iphoneSE:320x568,ipad:820x1180').split(',').map(s => { const [n, d] = s.split(':'); const [w, h] = d.split('x').map(Number); return [n, w, h]; });
const WORDS = { en: { here: /(\d+) here now/, on: 'Online right now', others: 'Everyone else', you: 'You' }, de: { here: /(\d+) gerade da/, on: 'Gerade online', others: 'Alle anderen', you: 'Du' }, es: { here: /(\d+) aquí ahora/, on: 'En línea ahora', others: 'Todos los demás', you: 'Tú' } };
function rgb(s) { const m = String(s).match(/rgba?\(([^)]+)\)/); return m ? m[1].split(',').map(Number) : null; }
function lum(c) { const a = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function main() {
    let base = process.argv[2], srv = null;
    if (!base) {
        srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
        await new Promise(ok => srv.listen(0, ok));
        base = 'http://localhost:' + srv.address().port + '/';
    }
    let eng = process.env.ENG || 'webkit', browser;
    try { browser = await pw[eng].launch(); } catch (e) { console.log('(' + eng + ' not available; using chromium)'); eng = 'chromium'; browser = await pw.chromium.launch(); }
    let fails = 0, passes = 0;
    const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; else passes++; };
    const langs = (process.env.LANGS || 'en,de,es').split(','), themes = (process.env.THEMES || 'dark,light').split(',');
    for (const [size, w, h] of SIZES) for (const lang of langs) for (const theme of themes) {
        const tag = eng + ' ' + size + ' ' + lang + ' ' + theme + ':';
        const L = WORDS[lang];
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block', reducedMotion: 'reduce' });
        const host = new URL(base).host;
        await ctx.route(u => { try { const x = new URL(u); return !(x.protocol === 'data:' || x.protocol === 'blob:' || x.host === host || x.host.endsWith('.supabase.co')); } catch (e) { return true; } }, r => r.abort());
        const sim = await cloud.install(ctx, { members: 30, messages: 20, me: 'Emmanuel' });
        await ctx.addInitScript(([lang, theme]) => { try { const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.done', '1');
            localStorage.setItem('lowispike.lang', lang); localStorage.setItem('lowi.theme', theme);
            if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Emmanuel', bday: '1990-08-01' }, xp: 2400, ledger: [], logs: [], saved: [], settings: { lang } })); } catch (e) {} }, [lang, theme]);
        const page = await ctx.newPage();
        const errs = []; page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
        await page.goto(base + (base.includes('?') ? '&' : '?') + 'po=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
        await page.waitForFunction(() => window.LowiPeopleDir && window.LowiPeopleDir.here && window.LOWI_CLOUD && window.LowiCellRoom && window.LowiRooms && window.goTab, null, { timeout: 90000 }).catch(() => {});
        const hasHere = await page.evaluate(() => !!(window.LowiPeopleDir && window.LowiPeopleDir.here));
        ok(hasHere, tag + ' this build has People online (LowiPeopleDir.here)');
        if (!hasHere) { await ctx.close(); continue; }
        await page.waitForFunction(() => LOWI_CLOUD.live && LOWI_CLOUD.live() && (LOWI_CLOUD.people() || []).length > 10, null, { timeout: 60000 }).catch(() => {});
        const build = await page.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || window.LOWI_BUILD || '');
        await page.evaluate(([lang, theme]) => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {}
            try { if (window.LowiLang && LowiLang.set) LowiLang.set(lang); } catch (e) {} try { if (window.LowiR2 && LowiR2.applyTheme) LowiR2.applyTheme(theme); else document.documentElement.setAttribute('data-theme', theme); } catch (e) {} goTab('foryou'); }, [lang, theme]);
        await page.waitForFunction(() => window.LowiRooms.status() === 'in', null, { timeout: 30000 }).catch(() => {});
        sim.seat('all', 2);
        await page.waitForFunction(() => window.LowiRooms.members().length >= 3, null, { timeout: 15000 }).catch(() => {});
        await sleep(2200);
        await page.waitForFunction(() => { const t = document.getElementById('tab-foryou'); return t && getComputedStyle(t).opacity === '1'; }, null, { timeout: 45000 }).catch(() => {});
        if (process.env.NOBLUR) await page.addStyleTag({ content: '*,*::before,*::after{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}' });
        await page.waitForFunction(re => { const lv = document.querySelector('.rm-live'); return lv && new RegExp(re).test(lv.textContent) && lv.hasAttribute('data-here'); }, L.here.source, { timeout: 15000 }).catch(() => {});
        const head = await page.evaluate(() => { const lv = document.querySelector('.rm-live'); const r = lv && lv.getBoundingClientRect(); return { text: lv ? lv.textContent.replace(/\s+/g, ' ').trim() : '', here: !!(lv && lv.hasAttribute('data-here')), r: r && { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }, members: LowiRooms.members().length, count: LowiPeopleDir.here().count, lang: document.documentElement.lang, theme: document.documentElement.getAttribute('data-theme') }; });
        const m = head.text.match(L.here), n = m ? +m[1] : -1;
        ok(head.here && n === 3, tag + ' header reads "' + head.text + '" (you + 2 seated = 3; ' + head.members + ' in the room)');
        /* tap the live line like a finger */
        /* wait until the live line is what a finger would touch (WebKit here settles the Community layers later than Chromium) */
        if (head.r) await page.waitForFunction(() => { const lv = document.querySelector('.rm-live'); if (!lv) return false; const r = lv.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(e && e.closest('.rm-live')); }, null, { timeout: 20000 }).catch(() => {});
        if (head.r) Object.assign(head, await page.evaluate(() => { const r = document.querySelector('.rm-live').getBoundingClientRect(); return { r: { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height } }; }));
        const hit = head.r ? await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.closest('.rm-live') ? 'rm-live' : (e.id || '') + '.' + String(e.className || e.tagName).slice(0, 60)) : 'nothing'; }, [head.r.x, head.r.y]) : 'no rect';
        if (hit !== 'rm-live') console.log('     note: the live line is under ' + hit + ' at the tap point');
        if (head.r) await page.mouse.click(head.r.x, head.r.y);
        await page.waitForSelector('.pd-ov #pdHere', { timeout: 8000 }).catch(() => {});
        await sleep(400);
        const st = await page.evaluate(() => {
            const ov = document.querySelector('.pd-ov'), list = ov && ov.querySelector('.pd-list'), card = ov && ov.querySelector('.pd-card');
            const items = list ? [...list.children] : [];
            const lis = items.map(li => li.classList.contains('pd-sec') ? { sec: li.querySelector('h3').textContent, id: li.id } : { n: (li.querySelector('.pd-n') || {}).textContent, here: !!li.querySelector('.pd-here'), me: !!li.querySelector('[data-me]'), dot: !!li.querySelector('.pd-on'), you: (li.querySelector('.pd-you') || {}).textContent || '' });
            const r = card && card.getBoundingClientRect(), hh = ov && ov.querySelector('#pdHere .pd-sec-h');
            const firstHere = ov && ov.querySelector('.pd-here'), nm = firstHere && firstHere.querySelector('.pd-n'), you = ov && ov.querySelector('.pd-you');
            const vis = el => { if (!el) return false; const b = el.getBoundingClientRect(), lr = list.getBoundingClientRect(); return b.top >= lr.top - 1 && b.bottom <= lr.bottom + 1; };
            return { open: !!ov, menu: !!document.querySelector('.rm-menu:not([hidden])[data-open], .rm-menu.on, .rm-menu[aria-hidden="false"]'), lis, scrollTop: list ? list.scrollTop : -1,
                focus: document.activeElement === hh, headVis: vis(hh), bg: card && getComputedStyle(card).backgroundImage,
                inkH: hh && getComputedStyle(hh).color, inkN: nm && getComputedStyle(nm).color, inkY: you && getComputedStyle(you).color, youBg: you && getComputedStyle(you).backgroundColor,
                minRow: Math.min(...[...(ov ? ov.querySelectorAll('.pd-row') : [])].map(b => b.getBoundingClientRect().height)),
                card: r && { l: r.left, t: r.top, r: r.right, b: r.bottom }, sw: document.documentElement.scrollWidth, vw: innerWidth, vh: innerHeight,
                over: firstHere ? firstHere.scrollWidth > firstHere.clientWidth + 1 : true,
                dots: [...(ov ? ov.querySelectorAll('.pd-here') : [])].every(b => { const d = b.querySelector('.pd-on'), p = b.querySelector('.pd-pic'); if (!d || !p) return false; const x = d.getBoundingClientRect(), y = p.getBoundingClientRect(), z = b.getBoundingClientRect();
                    return x.width >= 10 && x.left >= z.left && x.right <= z.right && x.top >= z.top && x.bottom <= z.bottom && x.left < y.right && x.top < y.bottom && x.right > y.left + y.width / 2 && x.bottom > y.top + y.height / 2; }) };
        });
        ok(st.open, tag + ' tapping "here now" opens People');
        ok(!st.menu, tag + ' ...and not the Community menu');
        ok(st.lis[0] && st.lis[0].sec === L.on && st.lis[0].id === 'pdHere', tag + ' first section is "' + (st.lis[0] && st.lis[0].sec) + '"');
        const hereRows = st.lis.filter(x => x.here), names = hereRows.filter(x => !x.me).map(x => x.n);
        ok(st.lis[1] && st.lis[1].me && st.lis[1].dot && st.lis[1].you === L.you, tag + ' You first (' + JSON.stringify(st.lis[1]) + ')');
        ok(hereRows.length === n && hereRows.every(x => x.dot), tag + ' ' + hereRows.length + ' online rows with green dots = header count ' + n);
        ok(names.join('|') === [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).join('|'), tag + ' online people by name: ' + names.join(', '));
        const othersAt = st.lis.findIndex(x => x.sec === L.others);
        ok(othersAt === hereRows.length + 1, tag + ' "' + L.others + '" right after the online rows');
        const rest = st.lis.slice(othersAt + 1).map(x => x.n);
        ok(rest.length > 10 && !names.some(nm => rest.includes(nm)), tag + ' nobody online is listed twice (' + rest.length + ' others)');
        ok(st.scrollTop === 0 && st.headVis, tag + ' list starts at Online right now');
        ok(st.focus, tag + ' Online right now heading has the focus (screen readers start there)');
        ok(st.card && st.card.l >= 0 && st.card.t >= 0 && st.card.r <= st.vw + 0.5 && st.card.b <= st.vh + 0.5 && st.sw <= st.vw + 1, tag + ' sheet inside the screen, no sideways scroll');
        ok(st.dots, tag + ' every green dot sits on the lower right of its picture, inside the row');
        ok(st.minRow >= 44 && !st.over, tag + ' rows ' + Math.round(st.minRow) + 'px tall, the online row fits');
        const stops = (String(st.bg).match(/rgba?\([^)]+\)/g) || []).map(rgb);
        const worst = ink => stops.length && ink ? Math.min(...stops.map(s => ratio(rgb(ink), s))) : 0;
        ok(worst(st.inkH) >= 4.5 && worst(st.inkN) >= 4.5 && worst(st.inkY) >= 4.5, tag + ' contrast heading ' + worst(st.inkH).toFixed(1) + ' / name ' + worst(st.inkN).toFixed(1) + ' / You ' + worst(st.inkY).toFixed(1) + ' (:1, AA 4.5)');
        if (process.env.SHOT) await page.screenshot({ path: path.join(process.env.SHOT, 'online-' + eng + '-' + size + '-' + lang + '-' + theme + '.png') });
        /* live: one more sits down */
        sim.seat('all', 3);
        await page.waitForFunction(() => document.querySelectorAll('.pd-ov .pd-here').length === 4, null, { timeout: 8000 }).catch(() => {});
        const live = await page.evaluate(() => ({ rows: document.querySelectorAll('.pd-ov .pd-here').length, head: (document.querySelector('.rm-live') || {}).innerText || '' }));
        const m2 = String(live.head).match(L.here);
        ok(live.rows === 4 && m2 && +m2[1] === 4, tag + ' live: a third person arrives -> ' + live.rows + ' online rows, header "' + String(live.head).replace(/\s+/g, ' ').trim() + '"');
        /* the app flags one of them as a bot / test account: gone from both at once */
        const flagged = await page.evaluate(() => { const h = LowiPeopleDir.here(), victim = h.rows[0]; const B = window.LowiBotAccounts, old = B.isBot; B.isBot = p => (p && p.uid === victim.uid) || old(p); document.dispatchEvent(new CustomEvent('lowi:room')); return victim.n; });
        await sleep(1800);
        const after = await page.evaluate(v => ({ rows: [...document.querySelectorAll('.pd-ov .pd-here .pd-n')].map(e => e.textContent), head: (document.querySelector('.rm-live') || {}).innerText || '', all: [...document.querySelectorAll('.pd-ov .pd-row .pd-n')].map(e => e.textContent).filter(x => x === v).length }), flagged);
        const m3 = String(after.head).match(L.here);
        ok(!after.rows.includes(flagged) && after.rows.length === 3 && m3 && +m3[1] === 3, tag + ' a seated account flagged as bot/test (' + flagged + ') drops out of the section and the count (' + after.rows.length + ' rows, "' + String(after.head).replace(/\s+/g, ' ').trim() + '")');
        /* an online row opens that person's card */
        const second = page.locator('.pd-ov .pd-here:not([data-me])').first();
        const pn = (await second.locator('.pd-n').textContent().catch(() => '')) || '';
        const bb = await second.boundingBox();
        if (bb) await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
        await sleep(1200);
        const card = await page.evaluate(() => { const c = [...document.querySelectorAll('.cs-overlay')].pop(); const p = c && c.querySelector('.cp-card'); return p ? (p.querySelector('h2') || {}).textContent || '' : ''; });
        ok(card && pn && card.includes(pn), tag + ' tapping ' + pn + ' opens their card ("' + card + '")');
        ok(!errs.length, tag + ' no page errors ' + errs.join(' | '));
        console.log('     ' + tag + ' ' + w + 'x' + h + ' build ' + (build || '?') + ' html lang=' + head.lang + ' theme=' + head.theme);
        await ctx.close();
    }
    await browser.close();
    if (srv) srv.close();
    console.log((fails ? fails + ' FAILED, ' : 'all passed, ') + passes + ' checks (simulated ' + eng + ', not a physical device)');
    process.exit(fails ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
