#!/usr/bin/env node
/* W7 focused repro for a W3 lead (task 29188430): after a visit to Community, are Home's bubbles still tappable, or does
   the 3D world canvas (#bw3Stage) sit on top of them? Checked two ways: elementFromPoint at each bubble's centre, and a
   real finger tap at the Settings bubble's centre (mouse at x,y, no element targeting) that must open the Settings panel.
   Fresh page per size, so no runtime resize is involved.
   Usage: node tools/regress/w7-home-after-community.cjs [--engine chromium|webkit] */
'use strict';
const { open } = require('./harness.cjs');
const N = require('./nav.cjs');
const fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ENGINE = arg('engine', 'chromium');
const log = N.logger('w7-' + ENGINE);
const BUBBLES = ['.o8-settings', '.wh-water', '.wh-move', '.o8-scan', '.o8-sleep', '.wh-meals', '#spBubble'];
const homeCheck = async (R, label) => {
    const hits = []; for (const s of BUBBLES) hits.push(await N.hitTest(R, s));
    const stage = await R.page.evaluate(() => { const s = document.getElementById('bw3Stage'); if (!s) return null; const c = getComputedStyle(s), r = s.getBoundingClientRect(); return { cls: s.className, z: c.zIndex, pe: c.pointerEvents, pos: c.position, parent: s.parentElement && (s.parentElement.id || s.parentElement.className), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] }; }).catch(() => null);
    /* a real tap at the Settings bubble centre */
    const st = hits[0]; let tapOpened = null;
    if (st && st.x) {
        await R.page.mouse.click(st.x, st.y); await N.sleep(1200);
        tapOpened = await R.page.evaluate(() => { const p = document.querySelector('[data-ss2="community"]'); return !!p && p.getBoundingClientRect().width > 0; }).catch(() => null);
        await R.page.keyboard.press('Escape').catch(() => { }); await N.sleep(500);
        if (tapOpened) await R.page.evaluate(() => { const x = document.querySelector('.ss2-x,[data-ss2="close"],.ss2-close'); if (x) x.click(); }).catch(() => { });
        await N.sleep(500);
    }
    const covered = hits.filter(h => h.x && !h.ok).map(h => h.sel + ' under ' + h.top);
    const row = { label, tab: await N.tab(R), covered, settingsTapOpenedPanel: tapOpened, stage };
    log(label, row); return row;
};
(async () => {
    const res = { engine: ENGINE, runs: [] };
    for (const [w, h] of [[390, 664], [375, 667]]) {
        const R = await open({ engine: ENGINE, url: arg('url', '') });
        if (ENGINE === 'chromium') await R.page.setViewportSize({ width: w, height: h });
        await R.goto(); await N.sleep(3500);
        const run = { size: w + 'x' + h, steps: [] };
        run.steps.push(await homeCheck(R, w + 'x' + h + ' fresh Home'));
        await N.openCommunity(R, log); await N.sleep(1500);
        const via = await N.goHome(R, log); await N.sleep(2000);
        run.steps.push(await homeCheck(R, w + 'x' + h + ' Home after Community (via ' + via + ')'));
        await N.openCommunity(R, log); await N.sleep(1500);
        await R.page.evaluate(() => { try { goTab('home'); } catch (e) { } }); await N.sleep(2000);
        run.steps.push(await homeCheck(R, w + 'x' + h + ' Home after Community (via goTab)'));
        await N.sleep(4000);
        run.steps.push(await homeCheck(R, w + 'x' + h + ' same, 4 s later'));
        await R.shot(path.join(__dirname, 'out', 'w7-' + ENGINE + '-' + w + 'x' + h + '-home-after-community.png'));
        run.errs = R.errs.map(e => e.m.slice(0, 160)); res.runs.push(run);
        await R.close();
        if (ENGINE !== 'chromium') break;
    }
    fs.writeFileSync(path.join(__dirname, 'out', 'w7-' + ENGINE + '.json'), JSON.stringify(res, null, 1));
    log('DONE'); process.exit(0);
})().catch(e => { log('FATAL ' + (e.stack || e)); process.exit(1); });
