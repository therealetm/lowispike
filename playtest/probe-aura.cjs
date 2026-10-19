'use strict';
/* Probe (aura-rename task, Oct 19): pick an aura in Misty's Glow sheet, close it, and check what on Home changed.
   node playtest/probe-aura.cjs <view> [url]   (serves this worktree when no url) */
const path = require('path');
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
(async () => {
    const view = process.argv[2] || 'iphone13';
    let url = process.argv[3], srv = null;
    if (!url) { srv = await L.serve(path.resolve(__dirname, '..')); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const out = path.join('/tmp', 'aura-' + view);
    require('fs').mkdirSync(out, { recursive: true });
    const h = await L.open({ view, url, settle: 7000 });
    const p = h.page;
    const look = () => p.evaluate(() => {
        const H = document.documentElement, cs = getComputedStyle(H);
        const plant = document.querySelector('#spBubble svg.tmg-plant');
        const pcs = plant ? getComputedStyle(plant) : null;
        const WH = window.LowiWorldHome, m = WH && WH.state && WH.state.misty;
        return { aura: H.dataset.whAura, va: cs.getPropertyValue('--wh-aura-a').trim(), plantFilter: pcs && pcs.filter, plantStyle: plant && plant.getAttribute('style'), spriteVisible: !!(m && m.visible), mistyKey: WH && WH.state && WH.state.mistyKey, ls: localStorage.getItem('lowi.aura'), name: document.querySelector('.wh-name b, .wh-name-txt, #whName') ? document.querySelector('.wh-name b, .wh-name-txt, #whName').textContent : null };
    });
    const r = { before: await look() };
    await p.screenshot({ path: out + '/1-before.png' });
    await p.evaluate(() => window.LowiWorldHome.openDetails('aura'));
    await L.sleep(1200);
    await p.screenshot({ path: out + '/2-sheet.png' });
    r.buttons = await p.evaluate(() => [...document.querySelectorAll('[data-wh="aura"]')].map(b => b.dataset.id + ':' + b.className.split(' ').pop()));
    await p.evaluate(() => { const b = document.querySelector('[data-wh="aura"][data-id="coral"]'); b && b.scrollIntoView({ block: 'center' }); });
    await L.sleep(500);
    const c = await L.center(h, '[data-wh="aura"][data-id="coral"]');
    if (c) await L.tap(h, c.x, c.y);
    await L.sleep(900);
    r.afterPick = await look();
    await p.screenshot({ path: out + '/3-picked.png' });
    await p.keyboard.press('Escape'); await L.sleep(400);
    await p.evaluate(() => { try { window.LowiWorldHome.closeTop && window.LowiWorldHome.closeTop(); } catch (e) { } });
    await L.sleep(1500);
    r.afterClose = await look();
    await p.screenshot({ path: out + '/4-home.png' });
    await p.reload({ waitUntil: 'load' }); await L.sleep(8000);
    r.afterReload = await look();
    await p.screenshot({ path: out + '/5-reload.png' });
    r.errors = (await L.snap(h)); r.log = h.log;
    console.log(JSON.stringify(r, null, 1));
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(1); });
