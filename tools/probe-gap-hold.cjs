/* Probe (Oct 24 2026, cycle on Home): what a tap and a long press on the Home Gap bubble (#spFast) open, with and without
   cycle tracking. Local folder by default, or URL=https://therealetm.github.io/lowispike/. ENGINE=webkit|chromium, DEVICE=... */
const H = require('./sim/harness.cjs');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/gap-hold';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
    const engine = process.env.ENGINE || 'webkit';
    const o = { engine, url: process.env.URL || '', probe: false, device: process.env.DEVICE || 'iPhone 13' };
    if (engine === 'chromium' && process.env.VW) o.viewport = { width: +process.env.VW, height: +process.env.VH }, o.dpr = +(process.env.DPR || 2);
    const R = await H.open(o);
    const p = R.page;
    const out = {};
    try {
        await R.goto(); await H.sleep(8000);
        out.build = await p.evaluate(() => (document.querySelector('meta[name=lowi-build]') || {}).content);
        const setCycle = async on => p.evaluate(on => {
            const s = LowiR2.S(); s.user.gender = on ? 'f' : 'm'; s.health = s.health || {}; delete s.health.cyc;
            if (on) { LowiCycle.setShow(true); const d = new Date(); d.setDate(d.getDate() - 7); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); LowiCycle.markStart(k); }
            /* a gap running: last meal 3 h ago */
            try { const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); f.last = Date.now() - 3 * 36e5; localStorage.setItem('lowi_fast_v1', JSON.stringify(f)); } catch (e) { }
            try { window.LowiFast && LowiFast.refresh && LowiFast.refresh(); } catch (e) { }
            return { on: LowiCycle.enabled(), m: LowiCycle.model() && { day: LowiCycle.model().day, ph: LowiCycle.model().ph } };
        }, on);
        const state = () => p.evaluate(() => ({
            gap: !!(window.LowiGapView && LowiGapView.isOpen()), cycle: !!(window.LowiCycleWorld && LowiCycleWorld.isOpen()),
            fastEdit: !!(window.LowiFastEdit && LowiFastEdit.isOpen && LowiFastEdit.isOpen()),
            ring: (() => { const b = document.querySelector('#spBubble'); const r = b && b.querySelector('.cyh-ring'); return r ? { ph: r.getAttribute('data-ph'), vis: getComputedStyle(r).display !== 'none' && getComputedStyle(r).opacity !== '0', box: (() => { const q = r.getBoundingClientRect(), o = b.getBoundingClientRect(); return [Math.round(q.width), Math.round(o.width), getComputedStyle(r).borderTopColor]; })() } : null; })(),
            dbg: { cw: typeof (window.LowiCycleWorld || {}).paintRing, en: !!(window.LowiCycle && LowiCycle.enabled()), bub: !!document.getElementById('spBubble'), homeAct: !!(document.getElementById('tab-home') || {}).classList && document.getElementById('tab-home').classList.contains('active'), cyh: (document.getElementById('spBubble') || {dataset:{}}).dataset.cyh, lb: !!document.querySelector('#spFast.lb-bub, #spFast[data-lb]'), fastAria: (document.getElementById('spFast') || {getAttribute(){}}).getAttribute('aria-description') },
            label: (document.getElementById('spBubble') || {}).getAttribute ? document.getElementById('spBubble').getAttribute('aria-description') : null
        }));
        const closeAll = () => p.evaluate(() => { try { LowiGapView.close(); } catch (e) { } try { LowiCycleWorld.close(); } catch (e) { } try { LowiFastEdit.close(); } catch (e) { } document.querySelectorAll('.r2-ov').forEach(o => { try { LowiR2.close(o); } catch (e) { } }); });
        const box = async () => p.evaluate(() => { const e = document.getElementById('spFast'); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; });
        const press = async ms => { const b = await box(); await p.mouse.move(b.x, b.y); await p.mouse.down(); await H.sleep(ms); await p.mouse.up(); await H.sleep(1400); };
        const holdMisty = async () => { const b = await p.evaluate(() => { const r = document.getElementById('spBubble').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height * 0.62 }; }); await p.mouse.move(b.x, b.y); await p.mouse.down(); await H.sleep(900); await p.mouse.up(); await H.sleep(1500); };
        const hub = () => p.evaluate(() => { const h = Array.from(document.querySelectorAll('#mistyHub')).find(e => !e.closest('.r2-ov.off')); const c = h && h.querySelector('.cyh-hub-b'); const n = h && h.querySelector('.mh-doors');
            return { hub: !!h, sec: c ? { txt: c.textContent.trim(), aria: c.getAttribute('aria-label'), ph: c.getAttribute('data-ph'), underDoors: !!(n && n.nextElementSibling && n.nextElementSibling.classList.contains('cyh-hub')), h: Math.round(c.getBoundingClientRect().height), inView: c.getBoundingClientRect().bottom <= innerHeight } : null }; });
        for (const on of [false, true]) {
            const tag = on ? 'on' : 'off';
            out[tag + '.setup'] = await setCycle(on); await H.sleep(2500);
            await closeAll(); await H.sleep(600);
            out[tag + '.home'] = await state();
            await R.shot(OUT + '/' + tag + '-home.png');
            await press(80); out[tag + '.tap'] = await state(); await R.shot(OUT + '/' + tag + '-tap.png'); await closeAll(); await H.sleep(900);
            await press(900); out[tag + '.hold'] = await state(); await R.shot(OUT + '/' + tag + '-hold.png'); await closeAll(); await H.sleep(900);
            await holdMisty(); out[tag + '.mistyHold'] = await hub(); await R.shot(OUT + '/' + tag + '-hub.png');
            if (on) { await p.evaluate(() => { const c = Array.from(document.querySelectorAll('#mistyHub .cyh-hub-b')).pop(); c && c.click(); }); await H.sleep(1500); out[tag + '.sectionTap'] = Object.assign(await state(), await hub()); await R.shot(OUT + '/' + tag + '-cycle.png'); }
            await closeAll(); await p.evaluate(() => { try { LowiMistyHub.close(); } catch (e) { } }); await H.sleep(900);
        }
        out.errs = R.errs.slice(0, 8);
    } catch (e) { out.err = String(e && e.stack || e).slice(0, 600); }
    console.log(JSON.stringify(out, null, 1));
    await R.close();
})();
