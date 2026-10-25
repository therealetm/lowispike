#!/usr/bin/env node
/* Studio lock, end to end in a simulated iPhone 13 (25 Oct 2026).
   node tools/studio-lock/check.cjs [--engine chromium|webkit] [--lang de|en|es] [--mode pin|admin] [--url https://therealetm.github.io/lowispike/index.html]
   pin mode:   a normal account opens Community > Studio and sees only the locked panel (no Affiliates / Creation frame, no
               switch, no request for those pages); a wrong PIN is refused and it stays locked; the PIN opens it; after a
               reload it opens straight away on this device.
   admin mode: an admin account opens Studio straight away, no PIN; taking admin away locks it again.
   Local (no --url): the app from this folder with the fake Supabase, studio_access / studio_unlock answered here (PIN 4321).
   Live (--url): the real server. pin mode needs the PIN in STUDIO_PIN (never in this file). admin mode needs
   STUDIO_ADMIN_ON / STUDIO_ADMIN_OFF: shell commands with {uid}, run to make this run's own test account admin and back.
   WebKit on this VM: SIM_WK_VIEWPORT=1 SIM_REDUCED_MOTION=1 SIM_WK_NOSHOT=1, one WebKit run at a time. */
const H = require('../sim/harness.cjs');
const { execSync } = require('child_process');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const engine = arg('engine', 'chromium'), lang = arg('lang', 'de'), url = arg('url', ''), mode = arg('mode', 'pin'), out = arg('out', '/tmp/studio-lock-check');
require('fs').mkdirSync(out, { recursive: true });
const LOCAL_PIN = '4321', LOCAL_PASS = 'c0ffee'.repeat(8);
const PIN = url ? (process.env.STUDIO_PIN || '') : LOCAL_PIN;
const WRONG = PIN === '0000' ? '1111' : '0000';
const res = []; const ok = (name, pass, info) => { res.push({ name, pass: !!pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); };

(async () => {
    if (url && mode === 'pin' && !PIN) { console.log('STUDIO_PIN is not set'); process.exit(2); }
    if (url && mode === 'admin' && !(process.env.STUDIO_ADMIN_ON && process.env.STUDIO_ADMIN_OFF)) { console.log('STUDIO_ADMIN_ON / STUDIO_ADMIN_OFF are not set'); process.exit(2); }
    const R = await H.open({ engine, lang, url, probe: false, fresh: false, viewport: { width: 390, height: 844 }, cloud: url ? false : undefined });
    const P = R.page;
    const studioReq = [];
    P.on('request', q => { if (/\/(affiliates|create)\//.test(q.url())) studioReq.push(q.url()); });
    let admin = false;
    if (!url) {   /* the server's answers, as the SQL gives them (tools/studio-lock/test-sql.sh checks the real SQL) */
        await R.ctx.route(u => /\/rest\/v1\/rpc\/studio_(access|unlock)/.test(String(u)), route => {
            const q = route.request(), body = (() => { try { return JSON.parse(q.postData() || '{}'); } catch (e) { return {}; } })();
            const data = /studio_access/.test(q.url()) ? (admin || body.pass === LOCAL_PASS)
                : body.pin === LOCAL_PIN ? { ok: true, pass: LOCAL_PASS } : { ok: false, reason: 'wrong' };
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
        });
    }
    let uid = '';
    try {
        if (mode === 'admin' && !url) admin = true;
        R.step = 'boot'; await R.goto(); await H.sleep(engine === 'webkit' ? 12000 : 7000);
        const tidy = () => P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); try { if (window.LowiTutorial && LowiTutorial.stop) LowiTutorial.stop(); } catch (e) { } document.querySelectorAll('.tut-skip,[data-tut="skip"]').forEach(b => b.click()); });
        await P.evaluate(l => { try { window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) { } }, lang); await H.sleep(1200);
        await tidy(); await H.sleep(800);
        const build = await P.evaluate(() => { const s = [...document.scripts].map(x => x.src).find(x => /studio-lock\.js\?v=/.test(x)); return s ? s.split('v=')[1] : 'missing'; });
        ok('studio-lock.js loaded', build !== 'missing', build);
        await P.waitForFunction(() => { try { const s = LOWI_CLOUD_X.state(); return s && s.uid && s.live; } catch (e) { return false; } }, null, { timeout: 60000 }).catch(() => { });
        uid = await P.evaluate(() => { try { return LOWI_CLOUD_X.state().uid || ''; } catch (e) { return ''; } });
        console.log('UID ' + uid);
        if (mode === 'admin' && url) {
            execSync(process.env.STUDIO_ADMIN_ON.replace(/\{uid\}/g, uid), { stdio: 'inherit' });
            await R.goto(); await H.sleep(engine === 'webkit' ? 12000 : 7000); await tidy(); await H.sleep(800);
        }
        const T = await P.evaluate(l => LowiStudioLockCore.text(l), lang);
        const openStudio = async () => {
            for (let i = 0; i < 4; i++) {   /* WebKit on this VM paints slowly: ask again until the tab bar is there */
                await P.evaluate(() => window.goTab('foryou'));
                if (await P.waitForSelector('#tab-foryou .rm-tab[data-rm="studio"]', { state: 'attached', timeout: 30000 }).then(() => true, () => false)) break;
                await tidy();
                if (i === 3) throw new Error('no Studio tab: ' + await P.evaluate(() => { const t = document.getElementById('tab-foryou'); return (t ? t.className + ' ' + t.innerText.slice(0, 120) : 'no #tab-foryou') + ' | ' + (document.querySelector('.tab.active,[id^=tab-].active') || {}).id; }));
            }
            await H.sleep(800);
            await R.tap('#tab-foryou .rm-tab[data-rm="studio"]');
            await H.sleep(engine === 'webkit' ? 6000 : 3000);
        };
        const state = () => P.evaluate(() => {
            const v = document.querySelector('#tab-foryou .rm-view'), l = v && v.querySelector(':scope>.sl-lock');
            const r = l && l.getBoundingClientRect(), vis = !!(l && !l.hidden && r.width > 200 && r.height > 200);
            const fr = v ? [...v.querySelectorAll(':scope>iframe')] : [];
            const sw = document.querySelector('#tab-foryou .rm-sw'), swOn = !!(sw && !sw.hidden && sw.getBoundingClientRect().height > 0);
            const sel = document.querySelector('#tab-foryou .rm-tab[aria-selected=true]');
            return { lock: vis, rect: r && [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], title: l && (l.querySelector('.sl-t') || {}).textContent,
                pill: l && (l.querySelector('.sl-pill') || {}).textContent, key: !!(l && l.querySelector('.sl-key:not([hidden])')),
                frames: fr.map(f => (f.getAttribute('src') || '') + (f.hidden ? ' (hidden)' : '')), sw: swOn, sel: sel && sel.dataset.rm,
                msg: l && (l.querySelector('.sl-msg') || {}).textContent, form: !!(l && l.querySelector('.sl-pin:not([hidden])')),
                open: window.LowiStudioLock && LowiStudioLock.isOpen(), pass: (localStorage.getItem('lowi.studio.pass') || '').length };
        });
        R.step = 'studio'; await openStudio();
        let s = await state();
        if (mode === 'admin') {
            ok('admin: Studio opens straight away, no lock panel, no PIN typed', !s.lock && s.open && s.pass === 0, s);
            ok('admin: the Affiliates page loads inside Studio', s.frames.some(f => /affiliates\/\?embed=1/.test(f) && !/hidden/.test(f)), s.frames);
            ok('admin: the Affiliates | Creation switch shows', s.sw);
            await R.shot(out + '/' + engine + '-' + lang + '-admin.png');
            if (url) execSync(process.env.STUDIO_ADMIN_OFF.replace(/\{uid\}/g, uid), { stdio: 'inherit' }); else admin = false;
            await P.evaluate(() => LowiStudioLock.check(true)); await H.sleep(engine === 'webkit' ? 5000 : 2500);
            s = await state();
            ok('admin taken away: locked again, the page is gone', s.lock && !s.open && s.frames.length === 0 && !s.sw, s);
        } else {
            ok('normal account: the locked panel fills Studio', s.lock && s.sel === 'studio' && s.rect && s.rect[0] >= 0 && s.rect[2] <= 390.5 && s.rect[3] <= 844.5, s.rect);
            ok('normal account: "' + T.title + '" in ' + lang, s.title === T.title && (s.pill || '').indexOf(T.pill) >= 0, s.title + ' / ' + s.pill);
            ok('normal account: nothing inside loads (no frame, no switch, no request for the pages)', s.frames.length === 0 && !s.sw && studioReq.length === 0, { frames: s.frames, sw: s.sw, req: studioReq });
            ok('normal account: the small lock button is there', s.key);
            await R.shot(out + '/' + engine + '-' + lang + '-locked.png');
            R.step = 'wrong'; await R.tap('#tab-foryou .sl-key'); await H.sleep(800);
            s = await state(); ok('lock button opens the PIN field', s.form, s.form);
            const typePin = async v => { await P.fill('#tab-foryou .sl-pin input', ''); await P.type('#tab-foryou .sl-pin input', v, { delay: 40 }); await H.sleep(300); await R.tap('#tab-foryou .sl-go'); };
            await typePin(WRONG);
            await P.waitForFunction(m => { const e = document.querySelector('#tab-foryou .sl-msg'); return e && e.textContent === m; }, T.wrong, { timeout: 30000 }).catch(() => { });
            s = await state();
            ok('wrong PIN refused: "' + T.wrong + '", still locked, nothing loaded', s.msg === T.wrong && s.lock && !s.open && s.frames.length === 0 && studioReq.length === 0, { msg: s.msg, open: s.open, frames: s.frames });
            await R.shot(out + '/' + engine + '-' + lang + '-wrong.png');
            R.step = 'right'; await typePin(PIN);
            await P.waitForFunction(() => window.LowiStudioLock && LowiStudioLock.isOpen() && document.querySelector('#tab-foryou .rm-view>iframe'), null, { timeout: 30000 }).catch(() => { });
            await H.sleep(engine === 'webkit' ? 4000 : 2000);
            s = await state();
            ok('the PIN opens Studio: panel gone, the Affiliates page loads, the switch shows', !s.lock && s.open && s.frames.some(f => /affiliates\/\?embed=1/.test(f)) && s.sw, s);
            ok('the pass is kept on this device', s.pass === 48, s.pass);
            await R.shot(out + '/' + engine + '-' + lang + '-open.png');
            R.step = 'reload'; await R.goto(); await H.sleep(engine === 'webkit' ? 12000 : 7000); await tidy(); await H.sleep(800);
            await openStudio();
            s = await state();
            ok('after a reload Studio opens straight away on this device', !s.lock && s.open && s.frames.some(f => /affiliates\/\?embed=1/.test(f)), s);
        }
        ok('no page errors', R.errs.length === 0, R.errs.slice(0, 3));
    } catch (e) {
        ok('run finished (step ' + R.step + ')', false, String(e && e.message || e).slice(0, 300));
        if (url && mode === 'admin' && uid) try { execSync(process.env.STUDIO_ADMIN_OFF.replace(/\{uid\}/g, uid), { stdio: 'inherit' }); } catch (er) { }
    }
    await R.close();
    const f = res.filter(r => !r.pass).length;
    console.log((f ? 'FAILED ' : 'ALL PASS ') + (res.length - f) + '/' + res.length + ' ' + engine + ' ' + lang + ' ' + mode + (url ? ' live' : ' local') + (uid ? ' uid ' + uid : ''));
    process.exit(f ? 1 : 0);
})();
