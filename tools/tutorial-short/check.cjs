/* tools/tutorial-short/check.cjs: the short base tour in real browsers (Oct 25 2026).
   node tools/tutorial-short/check.cjs [--live URL] [--engines chromium,webkit] [--langs en,de] [--devices "iPhone 13,iPad (gen 7)"] [--flight]
   For every device x engine x language: starts the tour with the speaker off, lets it run hands-free and records per card the
   finger, the page the demo opened, whether that page is visible, whether the card overlaps it, and the real entries (meals, water,
   sleep, moves) before and after. Then pause/back/skip, and (with --flight) her first flight after the finished tour: phases, how far
   out she got (misty-galaxy far vs GAL.R) and that a touch hands control back. Screens go to /tmp/tutorial-short/. Exit 1 on a fail. */
const H = require('./harness.cjs');
const fs = require('fs');
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const LIVE = arg('--live', ''), ENGINES = arg('--engines', 'chromium,webkit').split(','), LANGS = arg('--langs', 'en,de').split(',');
const DEVICES = arg('--devices', 'iPhone 13,iPad (gen 7)').split(','), FLIGHT = args.includes('--flight'), OUT = '/tmp/tutorial-short';
fs.mkdirSync(OUT, { recursive: true });
const ENTRY = /meal|water|sleep|move|steps|fuel|log|journal|weight|cycle|fast|gap/i, NOT_ENTRY = /hint|tutorial|seen|news|tour|first-flight|ui|theme|lang|voice|zoom|cam|pad|tip|ack|nudge/i;
let fails = 0; const fail = (k, m) => { fails++; console.log('  FAIL', k, m); };
(async () => {
    const srv = LIVE ? null : await H.serve(); const url = LIVE || srv.url;
    for (const eng of ENGINES) {
        const br = await H.pw[eng].launch();
        for (const dev of DEVICES) for (const lang of LANGS) {
            const key = eng + '/' + dev + '/' + lang;
            const { ctx, page } = await H.newPage(br, dev, lang);
            const errs = []; page.on('pageerror', e => errs.push(e.message));
            await H.boot(page, url);
            const entries = () => page.evaluate(([a, b]) => { const re = new RegExp(a, 'i'), no = new RegExp(b, 'i'), o = {}; for (const k of Object.keys(localStorage)) if (re.test(k) && !no.test(k)) o[k] = localStorage.getItem(k); return o; }, [ENTRY.source, NOT_ENTRY.source]);
            const before = await entries();
            await page.evaluate(() => { try { localStorage.removeItem('lowispike.first-flight.v1'); } catch (e) { } document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); window.LowiTutorial.start({ from: 'check' }); });
            const n = await page.evaluate(() => window.LowiTutorialSteps.plan({}).length);
            if (n > 12) fail(key, 'base tour has ' + n + ' cards');
            const seen = {}; const t0 = Date.now();
            while (Date.now() - t0 < 150000) {
                const st = await page.evaluate(() => {
                    const T = window.LowiTutorial, id = T.step(), card = document.querySelector('#ltTour .lt-card'), hand = document.querySelector('#ltTour .ltd-hand');
                    const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 4 && r.height > 4 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
                    const route = T.opened(), stageSel = { 'misty-card': '.wh-ms-ov .r2-sh, .wh-ms-ov', 'gap-view': '#gvSheet .gv-card, #gvSheet', 'settings-sheet': '.cme-ov .r2-sh, .cme-ov', 'scan-demo': '.lt-scan .lts-frame', 'fuel-bloom': '#hb2Bloom button', 'water-bloom': '#hb2Bloom button', 'move-bloom': '#hb2Bloom button', 'sleep-bloom': '#hb2Bloom button', 'community-tab': '#tab-foryou, .cm-open' }[route];
                    let page = null, overlap = 0;
                    if (stageSel) { const els = [...document.querySelectorAll(stageSel)].filter(vis); if (els.length) { const el = els[0], r = el.getBoundingClientRect(); page = { top: Math.round(r.top), bottom: Math.round(r.bottom), n: els.length }; if (card && route !== 'community-tab') { const c = card.getBoundingClientRect(); for (const e2 of els) { const q = e2.getBoundingClientRect(); const ox = Math.max(0, Math.min(c.right, q.right) - Math.max(c.left, q.left)), oy = Math.max(0, Math.min(c.bottom, q.bottom) - Math.max(c.top, q.top)); overlap = Math.max(overlap, Math.round(ox * oy / Math.max(1, q.width * q.height) * 100)); } } } }
                    const verdict = document.querySelector('.lt-scan.lts-done .lts-verdict');
                    return { on: T.isOn(), id, held: T.held(), card: vis(card), room: card && card.getAttribute('data-room'), hand: vis(hand) ? hand.dataset.g : '', route, page, overlap, demo: T.demo(), verdict: verdict ? verdict.innerText.replace(/\s+/g, ' ') : '', cam: !!window.__camAsked };
                });
                if (!st.on) break;
                const s = seen[st.id] || (seen[st.id] = { card: 0, held: 0, hand: '', route: '', page: false, overlap: 0, verdict: '', shots: 0, room: '' });
                if (st.card) s.card++; if (st.held) s.held++; if (st.hand) s.hand = st.hand; if (st.route) s.route = st.route; if (st.page) s.page = true;
                if (st.page) s.overlap = Math.max(s.overlap, st.overlap); if (st.verdict) s.verdict = st.verdict; if (st.room) s.room = st.room; if (st.cam) fail(key, 'camera asked');
                if (st.page && s.shots < 1) { s.shots++; await page.screenshot({ path: OUT + '/' + key.replace(/[^a-z0-9]+/gi, '_') + '_' + st.id + '.png' }); }
                await H.sleep(250);
            }
            const after = await entries();
            const changed = Object.keys(Object.assign({}, before, after)).filter(k => before[k] !== after[k]);
            const ids = Object.keys(seen), ms = Date.now() - t0;
            console.log(key, ids.length + ' cards in ' + Math.round(ms / 1000) + 's:', ids.map(id => id + (seen[id].hand ? '[' + seen[id].hand + ']' : '') + (seen[id].route ? '>' + seen[id].route + (seen[id].page ? '+' : '-') + (seen[id].overlap ? '!' + seen[id].overlap + '%' : '') + '@' + seen[id].room : '') + (seen[id].held ? ' HELD' + seen[id].held : '')).join(' '));
            if (seen.scan) console.log('  scan verdict:', seen.scan.verdict || '(none)');
            if (ids.length !== n) fail(key, 'saw ' + ids.length + ' of ' + n + ' cards (did not auto-advance to the end?)');
            for (const id of ids) { const s = seen[id]; if (s.route && !s.page) fail(key, id + ': page ' + s.route + ' never visible'); if (s.overlap > 8) fail(key, id + ': card covers ' + s.overlap + '% of the page'); if (s.held > 2) fail(key, id + ': tour hidden ' + s.held + ' polls'); if (id !== 'done' && !s.hand) fail(key, id + ': no finger'); }
            if (!seen.scan || !/9\/10/.test(seen.scan.verdict) || !/demo/i.test(seen.scan.verdict)) fail(key, 'no demo verdict on Scan');
            if (changed.length) fail(key, 'entries changed: ' + changed.join(', '));
            if (errs.length) fail(key, 'page errors: ' + errs.slice(0, 3).join(' | '));
            /* Pause / Back / Skip stop cleanly */
            const ctl = await page.evaluate(async () => {
                const T = window.LowiTutorial, wait = ms => new Promise(r => setTimeout(r, ms)), out = {};
                document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); T.start({ from: 'check' });
                await wait(5500); const at = T.step();
                document.querySelector('#ltTour [data-lt="pause"]').click(); await wait(9000);
                out.pauseHeld = T.step() === at; out.handGone = !document.querySelector('#ltTour .ltd-hand:not(.ltd-hide)');
                document.querySelector('#ltTour [data-lt="pause"]').click(); await wait(400);
                document.querySelector('#ltTour [data-lt="next"]').click(); await wait(400);
                document.querySelector('#ltTour [data-lt="back"]').click(); await wait(500); out.back = T.step() === at;
                document.querySelector('#ltTour [data-lt="skipall"]').click(); await wait(900);
                out.skipOff = !T.isOn(); out.pagesClosed = !document.querySelector('.lt-scan') && !(document.querySelector('#hb2Bloom') && getComputedStyle(document.querySelector('#hb2Bloom')).display !== 'none' && document.querySelector('#hb2Bloom').childElementCount && document.documentElement.classList.contains('hb2-open'));
                out.handAfter = !document.querySelector('#ltTour');
                return out;
            });
            console.log('  controls', JSON.stringify(ctl));
            if (!ctl.pauseHeld) fail(key, 'Pause did not hold the card'); if (!ctl.back) fail(key, 'Back did not return'); if (!ctl.skipOff) fail(key, 'Skip tour did not end the tour');
            await ctx.close();
        }
        await br.close();
    }
    if (FLIGHT) {
        const br = await H.pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
        const { ctx, page } = await H.newPage(br, 'iPhone 13', 'en');
        await H.boot(page, url);
        const before = await page.evaluate(() => Object.keys(localStorage).sort().map(k => k + '=' + localStorage.getItem(k).length).join('|'));
        await page.evaluate(() => { localStorage.removeItem('lowispike.first-flight.v1'); window.dispatchEvent(new CustomEvent('lowi:tutorial', { detail: { reason: 'finished', news: false } })); });
        const t0 = Date.now(); let last = '', maxFar = 0, galR = 230;
        while (Date.now() - t0 < 460000) {
            const st = await page.evaluate(() => ({ ff: window.LowiFirstFlight.state(), fl: (window.LowiMistyFlight.state() || {}).st, g: window.LowiMistyGalaxy ? window.LowiMistyGalaxy.state() : {}, R: window.LowiMistyGalaxy && window.LowiMistyGalaxy.GAL ? window.LowiMistyGalaxy.GAL.R : 230 }));
            galR = st.R || galR; maxFar = Math.max(maxFar, +(st.g && st.g.far) || 0);
            const line = (st.ff.on ? 'on' : 'off') + ' fl=' + st.fl + ' ph=' + ((st.ff.ph || []).join('>')) + ' inside=' + st.ff.inside;
            if (line !== last) { console.log('  flight', Math.round((Date.now() - t0) / 1000) + 's', line, 'far=' + Math.round(maxFar)); last = line; }
            if (!st.ff.on && Date.now() - t0 > 4000) { console.log('  flight record', JSON.stringify(st.ff.rec)); break; }
            await H.sleep(1000);
        }
        console.log('  flight max distance', Math.round(maxFar), 'of the soft edge', galR);
        const after = await page.evaluate(() => Object.keys(localStorage).sort().map(k => k + '=' + localStorage.getItem(k).length).join('|'));
        const b = new Set(before.split('|')), changed = after.split('|').filter(x => !b.has(x));
        console.log('  flight storage changes:', changed.join(', ') || 'none');
        await ctx.close(); await br.close();
    }
    if (srv) srv.s.close();
    console.log(fails ? 'FAILS: ' + fails : 'ALL PASS');
    process.exit(fails ? 1 : 0);
})();
