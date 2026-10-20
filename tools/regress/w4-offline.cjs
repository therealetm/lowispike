#!/usr/bin/env node
/* W4 error and offline recovery (task 29188430). The flaky network of a phone on the move, against the fake cloud:
   S1 phone offline (navigator.onLine false) while typing and sending, then back online
   S2 online but the server fails the send (503), then recovers: retry, and no message twice
   S3 a slow send (6 s) and the player leaves Community and comes back before it lands
   S4 the live connection drops: does a new message from someone else still arrive?
   S5 the app opens while every cloud call fails: does it still boot, and does Community still open?
   Usage: node tools/regress/w4-offline.cjs [--engine webkit|chromium] */
'use strict';
const { open } = require('./harness.cjs');
const N = require('./nav.cjs');
const fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ENGINE = arg('engine', 'webkit');
const log = N.logger('w4-' + ENGINE);
(async () => {
    const R = await open({ engine: ENGINE });
    const F = { mode: '', failed: [] };
    await R.ctx.route(u => { try { return new URL(u).host.endsWith('.supabase.co'); } catch (e) { return false; } }, async route => {
        const q = route.request(), p = new URL(q.url()).pathname, m = q.method();
        if (F.mode === 'all' && m !== 'OPTIONS') { F.failed.push(m + ' ' + p); return route.fulfill({ status: 503, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"message":"sim: down"}' }); }
        if (F.mode === 'send503' && m === 'POST' && /\/rest\/v1\/messages/.test(p)) { F.failed.push(m + ' ' + p); return route.fulfill({ status: 503, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"message":"sim: down"}' }); }
        if (F.mode === 'slow' && m === 'POST' && /\/rest\/v1\/messages/.test(p)) { await N.sleep(6000); }
        return route.fallback();
    });
    const res = { engine: ENGINE, s: {} };
    const posts = () => R.sim.writes.filter(w => w.t === 'messages' && w.m === 'POST');
    const box = () => R.page.evaluate(() => (document.getElementById('cmInput') || {}).value || '').catch(() => '?');
    const seen = tok => R.page.evaluate(tok => { const t = document.body.innerText || ''; return t.split(tok).length - 1; }, tok).catch(() => -1);
    const notice = () => R.page.evaluate(() => { const n = document.getElementById('csNotice'); return n ? (n.innerText || '').trim().slice(0, 160) : ''; }).catch(() => '');
    const statusMarks = () => R.page.evaluate(() => [...document.querySelectorAll('[data-chat="retry"],.cs-failed,.cs-sending,[data-status]')].map(e => (e.getAttribute('data-chat') || e.getAttribute('data-status') || e.className) + ':' + (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 40)).slice(0, 8)).catch(() => []);
    const typeSend = async t => { const i = R.page.locator('#cmInput'); await i.click({ timeout: 5000 }).catch(() => { }); await i.fill(''); await i.pressSequentially(t, { delay: 15 }); await R.page.keyboard.press('Enter'); await N.sleep(1200); };

    await R.goto(); await N.sleep(2500); await N.openCommunity(R, log);

    /* S1 */
    R.step = 'S1';
    { const s = {}; const tok = 'S1tok' + Date.now() % 100000; const p0 = posts().length;
        await R.ctx.setOffline(true); await R.page.evaluate(() => window.dispatchEvent(new Event('offline'))).catch(() => { }); await N.sleep(600);
        await typeSend('offline hello ' + tok);
        s.noticeOffline = await notice(); s.boxKept = (await box()).includes(tok); s.postedWhileOffline = posts().length - p0;
        await R.ctx.setOffline(false); await R.page.evaluate(() => window.dispatchEvent(new Event('online'))).catch(() => { }); await N.sleep(2500);
        s.noticeAfterOnline = await notice(); s.boxAfterOnline = (await box()).includes(tok);
        await R.page.keyboard.press('Enter').catch(() => { }); await N.sleep(1800);
        s.postedAfterOnline = posts().length - p0; s.shownTimes = await seen(tok);
        res.s.S1 = s; log('S1', s); }

    /* S2 */
    R.step = 'S2';
    { const s = {}; const tok = 'S2tok' + Date.now() % 100000; const p0 = posts().length;
        F.mode = 'send503'; F.failed = [];
        await typeSend('flaky hello ' + tok); await N.sleep(2500);
        s.failedTries = F.failed.length; s.notice = await notice(); s.marks = await statusMarks(); s.shownWhileFailed = await seen(tok); s.box = (await box()).includes(tok);
        F.mode = '';
        const r = R.page.locator('[data-chat="retry"]').first();
        s.retryVisible = await r.isVisible().catch(() => false);
        if (s.retryVisible) { await r.click({ timeout: 4000 }).catch(e => { s.retryErr = String(e.message).split('\n')[0]; }); await N.sleep(2500); }
        else { await N.sleep(8000); }
        s.postedOk = posts().length - p0; s.shownAfter = await seen(tok); s.marksAfter = await statusMarks(); s.noticeAfter = await notice();
        /* tap retry twice fast: no double message */
        res.s.S2 = s; log('S2', s); }

    /* S3 */
    R.step = 'S3';
    { const s = {}; const tok = 'S3tok' + Date.now() % 100000; const p0 = posts().length;
        F.mode = 'slow';
        const i = R.page.locator('#cmInput'); await i.click().catch(() => { }); await i.fill(''); await i.pressSequentially('slow hello ' + tok, { delay: 10 }); await R.page.keyboard.press('Enter');
        await N.sleep(800); s.marksSending = await statusMarks(); s.boxDuring = await box();
        await N.goHome(R, log); await N.sleep(1500); await N.openCommunity(R, log); await N.sleep(6000);
        F.mode = '';
        s.posted = posts().length - p0; s.shownTimes = await seen(tok); s.box = await box(); s.marks = await statusMarks();
        res.s.S3 = s; log('S3', s); }

    /* S4 */
    R.step = 'S4';
    { const s = {}; const ws0 = R.sim.counts.ws;
        for (const w of [...R.sim.sockets]) { try { await w.close({ code: 1006, reason: 'sim drop' }); } catch (e) { s.closeErr = String(e.message).slice(0, 100); } }
        await N.sleep(500); const tok = 'S4tok' + Date.now() % 100000;
        let shown = 0, t = 0; const t0 = Date.now();
        while (t < 25000) { R.sim.say('live after drop ' + tok); await N.sleep(2500); t = Date.now() - t0; shown = await seen(tok); if (shown > 0) break; }
        s.reconnects = R.sim.counts.ws - ws0; s.arrivedAfterMs = shown > 0 ? t : null; s.topics = R.sim.topics.size;
        res.s.S4 = s; log('S4', s); }

    /* S5 */
    R.step = 'S5';
    { const s = {}; F.mode = 'all'; F.failed = []; const e0 = R.errs.length;
        await R.goto(); await N.sleep(3500);
        s.ready = await R.page.evaluate(() => !!(window.goTab && document.getElementById('whPad'))).catch(() => false);
        await N.openCommunity(R, log);
        s.composer = await N.hitTest(R, '#cmInput'); s.notice = await notice(); s.failedCalls = F.failed.length; s.newErrs = R.errs.slice(e0);
        s.text = await R.page.evaluate(() => { const c = document.getElementById('tab-foryou'); return c ? (c.innerText || '').replace(/\s+/g, ' ').slice(0, 400) : ''; }).catch(() => '');
        await R.shot(path.join(__dirname, 'out', 'w4-' + ENGINE + '-S5-clouddown.png'));
        F.mode = '';
        res.s.S5 = s; log('S5', { ready: s.ready, composer: s.composer, notice: s.notice, failedCalls: s.failedCalls, newErrs: s.newErrs.length }); }

    res.crashed = R.crashed; res.loads = R.loads; res.errs = R.errs;
    fs.writeFileSync(path.join(__dirname, 'out', 'w4-' + ENGINE + '.json'), JSON.stringify(res, null, 1));
    log('DONE crashed=' + R.crashed + ' errs=' + R.errs.length);
    await R.close(); process.exit(0);
})().catch(e => { log('FATAL ' + (e.stack || e)); process.exit(1); });
