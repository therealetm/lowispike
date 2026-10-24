/* Flight hunt 14:01: why does the Home controller stay hidden after autopilot (+ tab switch) on iPad landscape?
   Usage: node tools/flight-pad-hidden-probe.cjs [url|root] [--engine chromium|webkit] [--size 1180x820] [--end api|tap] [--tab 1|0]
   Simulated browser only; Supabase is faked by the harness. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const where = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'https://therealetm.github.io/lowispike/index.html';
const ENGINE = arg('engine', 'chromium'), SIZE = String(arg('size', '1180x820')).match(/^(\d+)x(\d+)$/), END = arg('end', 'api'), TAB = String(arg('tab', '1')) === '1';
(async () => {
    const o = { engine: ENGINE, device: arg('device', 'iPhone 13') };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    if (SIZE) o.viewport = { width: +SIZE[1], height: +SIZE[2] }, o.dpr = 2;
    const R = await H.open(o), P = R.page;
    if (ENGINE === 'webkit') await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'sim', 'no-media-init.js'), 'utf8') });
    const ev = (fn, a) => P.evaluate(fn, a).catch(e => ({ evalErr: String(e.message).slice(0, 160) }));
    const look = tag => ev(tag => {
        const b = document.getElementById('whPad'); if (!b) return { tag, pad: 'missing' };
        const s = getComputedStyle(b), r = b.getBoundingClientRect();
        return { tag, op: s.opacity, vis: s.visibility, disp: s.display, pe: s.pointerEvents, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width),
            padCls: b.className, padStyle: b.getAttribute('style'), html: document.documentElement.className, body: document.body.className,
            mode: window.LowiPad && window.LowiPad.state ? JSON.stringify(window.LowiPad.state()) : null, busy: window.LowiWorldRegions && window.LowiWorldRegions.state.busy };
    }, tag);
    const log = async tag => console.log(JSON.stringify(await look(tag)));
    try {
        await R.goto(); await H.sleep(7000); await log('start');
        if (arg('trip')) {
            const w = String(arg('trip')) === 'true' ? 'brain' : String(arg('trip'));
            const p = await ev(() => { const r = document.getElementById('whPad').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
            if (arg('drag', '1') === '1') { await P.mouse.move(p.x, p.y); await P.mouse.down(); for (let i = 1; i <= 5; i++) { await P.mouse.move(p.x, p.y - 45 * i / 5); await H.sleep(50); } await H.sleep(1200); await P.mouse.up(); await log('after drag'); }
            await ev(w => window.LowiWorldRegions.travel(w), w); await H.sleep(900); await log('trip started');
            if (TAB) { await ev(() => window.goTab('foryou')); await H.sleep(1500); await ev(() => window.goTab('home')); }
            await H.sleep(6000); await log('in ' + w);
            await ev(() => window.LowiWorldRegions.travel('hub', false, 0, { wide: true })); await H.sleep(7000); await log('back to hub');
            for (const t of [3000, 10000, 20000]) { await H.sleep(t); await log('hub +' + t); }
            console.log('crashed', !!R.crashed); await R.close(); return;
        }
        await ev(() => window.LowiPad.mode('auto')); await H.sleep(6000); await log('auto 6s');
        if (TAB) { await ev(() => window.goTab('move')); await H.sleep(1000); await ev(() => window.goTab('home')); await H.sleep(2000); await log('auto after tab'); }
        if (END === 'tap') { const p = await ev(() => { const r = document.getElementById('whPad').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); await P.mouse.click(p.x, p.y); }
        else await ev(() => window.LowiPad.mode(''));
        for (const t of [500, 1500, 4000, 10000]) { await H.sleep(t); await log('after end +' + t); }
    } catch (e) { console.log('ERR', e.message); }
    console.log('crashed', !!R.crashed, 'errors', JSON.stringify((R.errors || []).slice(0, 5)));
    await R.close();
})();
