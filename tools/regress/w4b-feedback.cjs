#!/usr/bin/env node
/* W4b what the player SEES when a send cannot go out (task 29188430, follow-up to W4). W4 showed the text stays in the box
   and nothing is lost; this checks the words on screen (#csNotice), whether they are actually visible where the player is
   looking (the galaxy composer, not only inside the Chat history), and whether a failed send can be retried there.
   Usage: node tools/regress/w4b-feedback.cjs [--engine webkit|chromium] */
'use strict';
const { open } = require('./harness.cjs');
const N = require('./nav.cjs');
const fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ENGINE = arg('engine', 'webkit');
const log = N.logger('w4b-' + ENGINE);
const seeNotice = R => R.page.evaluate(() => {
    const n = document.getElementById('csNotice'); if (!n) return { missing: true };
    const r = n.getBoundingClientRect(), s = getComputedStyle(n);
    const top = r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
    return { text: (n.textContent || '').trim().slice(0, 160), visible: r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > .1 && r.bottom > 0 && r.top < innerHeight, onTop: !!top && (top === n || n.contains(top)), y: Math.round(r.top), h: Math.round(r.height), vh: innerHeight };
}).catch(e => ({ err: e.message }));
const retryUI = R => R.page.evaluate(() => [...document.querySelectorAll('[data-chat="retry"]')].map(b => { const r = b.getBoundingClientRect(); return { label: (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 30), visible: r.width > 0 && r.top < innerHeight && r.bottom > 0 }; })).catch(() => []);
(async () => {
    const R = await open({ engine: ENGINE });
    const F = { mode: '' };
    await R.ctx.route(u => { try { return new URL(u).host.endsWith('.supabase.co'); } catch (e) { return false; } }, async route => {
        const q = route.request();
        if (F.mode === 'send503' && q.method() === 'POST' && /\/rest\/v1\/messages/.test(new URL(q.url()).pathname)) return route.fulfill({ status: 503, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"message":"sim: down"}' });
        return route.fallback();
    });
    const posts = () => R.sim.writes.filter(w => w.t === 'messages' && w.m === 'POST').length;
    const res = { engine: ENGINE };
    await R.goto(); await N.sleep(2500); await N.openCommunity(R, log);
    const inp = R.page.locator('#cmInput');
    /* offline */
    await R.ctx.setOffline(true); await R.page.evaluate(() => window.dispatchEvent(new Event('offline'))).catch(() => { }); await N.sleep(500);
    await inp.click({ force: true }).catch(() => { }); await inp.fill('offline words'); await R.page.keyboard.press('Enter'); await N.sleep(1000);
    res.offline = { notice: await seeNotice(R), box: await inp.inputValue().catch(() => '?') };
    await R.shot(path.join(__dirname, 'out', 'w4b-' + ENGINE + '-offline-send.png'));
    await R.ctx.setOffline(false); await R.page.evaluate(() => window.dispatchEvent(new Event('online'))).catch(() => { }); await N.sleep(3000);
    res.offline.afterOnline = { notice: await seeNotice(R), box: await inp.inputValue().catch(() => '?'), autoSent: posts() > 0 };
    log('offline', res.offline);
    /* server error */
    await inp.fill(''); F.mode = 'send503'; const p0 = posts();
    await inp.click({ force: true }).catch(() => { }); await inp.fill('server error words'); await R.page.keyboard.press('Enter'); await N.sleep(2500);
    res.err503 = { notice: await seeNotice(R), box: await inp.inputValue().catch(() => '?'), retryInComposer: await retryUI(R) };
    await R.shot(path.join(__dirname, 'out', 'w4b-' + ENGINE + '-503-send.png'));
    await R.page.locator('.cg-hist').first().click({ timeout: 4000, force: true }).catch(() => { }); await N.sleep(900);
    res.err503.retryInHistory = await retryUI(R); res.err503.noticeInHistory = await seeNotice(R);
    await R.shot(path.join(__dirname, 'out', 'w4b-' + ENGINE + '-503-history.png'));
    F.mode = '';
    await N.sleep(6000); res.err503.autoRetried = posts() - p0;
    const r = R.page.locator('[data-chat="retry"]').first();
    if (await r.isVisible().catch(() => false)) { await r.click({ force: true }).catch(() => { }); await r.click({ force: true }).catch(() => { }); await N.sleep(2500); res.err503.afterDoubleRetryTap = posts() - p0; }
    log('503', res.err503);
    res.errs = R.errs; res.crashed = R.crashed;
    fs.writeFileSync(path.join(__dirname, 'out', 'w4b-' + ENGINE + '.json'), JSON.stringify(res, null, 1));
    log('DONE'); await R.close(); process.exit(0);
})().catch(e => { log('FATAL ' + (e.stack || e)); process.exit(1); });
