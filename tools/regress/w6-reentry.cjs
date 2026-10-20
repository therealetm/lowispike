#!/usr/bin/env node
/* W6 focused repro for two W1 leads (task 29188430):
   A. second visit to Community in the same page life: is the chat box still reachable, and do keystrokes land in it?
      (W1 rounds 3 and 5: the box was covered by #cmTrack and 45 typed characters went nowhere)
   B. the box keeps the text after a send until the server answers: does a second Enter in that window post twice?
   Each step is tried with and without the keyboard (viewport shrink), via the player's path (Settings > Community).
   Usage: node tools/regress/w6-reentry.cjs [--engine webkit|chromium] [--visits 4] */
'use strict';
const { open } = require('./harness.cjs');
const N = require('./nav.cjs');
const fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ENGINE = arg('engine', 'webkit'), VISITS = +arg('visits', 4);
const log = N.logger('w6-' + ENGINE);
const state = R => R.page.evaluate(() => {
    const t = document.getElementById('cmTrack'), i = document.getElementById('cmInput'), pane = i && i.closest('.ls-pane');
    return { trackTransform: t && t.style.transform, seg: document.querySelector('#cmSeg [aria-selected="true"], #cmSeg .on') && (document.querySelector('#cmSeg [aria-selected="true"], #cmSeg .on').dataset.v || ''), paneInert: pane ? pane.hasAttribute('inert') : null, paneId: pane && pane.id, active: document.activeElement && (document.activeElement.id || document.activeElement.tagName), solo: !!document.querySelector('#tab-foryou.nm-solo'), pe: i && getComputedStyle(i).pointerEvents, panePE: pane && getComputedStyle(pane).pointerEvents };
}).catch(e => ({ err: e.message }));
(async () => {
    const R = await open({ engine: ENGINE, url: arg('url', '') });
    const res = { engine: ENGINE, visits: [], double: [] };
    await R.goto(); await N.sleep(2500);
    for (let v = 1; v <= VISITS; v++) {
        const kb = v % 2 === 0;
        const row = { v, keyboard: kb };
        await N.openCommunity(R, log); await N.sleep(900);
        if (kb) { await R.page.setViewportSize({ width: 390, height: 508 }); await N.sleep(400); }
        row.hit = await N.hitTest(R, '#cmInput'); row.state = await state(R);
        const inp = R.page.locator('#cmInput');
        await inp.click({ force: true, timeout: 4000 }).catch(e => { row.clickErr = String(e.message).split('\n')[0]; });
        row.focusAfterTap = await R.page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName)).catch(() => '?');
        await inp.fill('').catch(() => { });
        await R.page.keyboard.type('visit ' + v, { delay: 20 });
        row.value = await inp.inputValue().catch(() => '?'); row.landed = row.value === 'visit ' + v;
        await inp.fill('').catch(() => { });
        if (kb) await R.page.setViewportSize({ width: 390, height: ENGINE === 'webkit' ? 664 : 844 });
        row.errs = R.errs.length;
        res.visits.push(row); log('visit', row);
        await N.goHome(R, log); await N.sleep(800);
    }
    /* B: Enter twice quickly, with a slow server (2.5 s) */
    await N.openCommunity(R, log);
    await R.ctx.route(u => { try { return new URL(u).host.endsWith('.supabase.co'); } catch (e) { return false; } }, async route => { const q = route.request(); if (q.method() === 'POST' && /\/rest\/v1\/messages/.test(new URL(q.url()).pathname)) await N.sleep(2500); return route.fallback(); });
    for (const gap of [150, 600]) {
        const p0 = R.sim.writes.filter(w => w.t === 'messages' && w.m === 'POST').length;
        const inp = R.page.locator('#cmInput'); await inp.click({ force: true }).catch(() => { }); await inp.fill('double ' + gap);
        await R.page.keyboard.press('Enter'); await N.sleep(gap);
        const boxBetween = await inp.inputValue().catch(() => '?');
        await R.page.keyboard.press('Enter'); await N.sleep(5000);
        const posted = R.sim.writes.filter(w => w.t === 'messages' && w.m === 'POST').slice(p0);
        const ids = posted.map(w => w.body && w.body.id);
        const r = { gapMs: gap, boxBetween, posts: posted.length, distinctIds: new Set(ids).size, shownTimes: await R.page.evaluate(t => (document.getElementById('tab-foryou').textContent || '').split(t).length - 1, 'double ' + gap).catch(() => -1), boxAfter: await inp.inputValue().catch(() => '?') };
        res.double.push(r); log('double', r);
    }
    res.errs = R.errs; res.crashed = R.crashed;
    await R.shot(path.join(__dirname, 'out', 'w6-' + ENGINE + '-end.png'));
    fs.writeFileSync(path.join(__dirname, 'out', 'w6-' + ENGINE + '.json'), JSON.stringify(res, null, 1));
    log('DONE errs=' + R.errs.length); await R.close(); process.exit(0);
})().catch(e => { log('FATAL ' + (e.stack || e)); process.exit(1); });
