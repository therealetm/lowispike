#!/usr/bin/env node
/* ship task probe: after Community -> Home, does tapping the Settings bubble open Settings? What is in the way? */
'use strict';
const { open } = require('./harness.cjs');
const N = require('./nav.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const log = N.logger('pset');
const state = R => R.page.evaluate(() => {
    const b = document.querySelector('.o8-settings'); if (!b) return { noBubble: true };
    const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const stack = document.elementsFromPoint(x, y).slice(0, 6).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : ''));
    const H = document.documentElement.className.split(/\s+/).filter(c => /cm|cs-|cg|wh|o8|tab|fly|busy|zoom|galaxy|visit/i.test(c));
    const panel = document.querySelector('.ss2-panel, #ss2, .ss2');
    return { x: Math.round(x), y: Math.round(y), stack, htmlCls: H, bodyCls: document.body.className.slice(0, 200), tab: (document.querySelector('.tab.on, .tab.active') || {}).id, panel: panel ? { cls: panel.className, w: panel.getBoundingClientRect().width } : null, ss2rows: document.querySelectorAll('[data-ss2]').length, inert: [...document.querySelectorAll('[inert]')].map(e => e.id || e.className).slice(0, 8) };
});
const cam = R => R.page.evaluate(() => { try { const W = window.LowiWorldHome, r = W.rig(), st = W.state; return { d: +r.dist.toFixed(2), maxD: r.maxD, rest: r.homeRest, mode: r.mode, outer: r.outer, pull: st.pull, za: st.zoomAnim ? { to: +(+st.zoomAnim.to).toFixed(2), t: +(+st.zoomAnim.t).toFixed(2) } : null, tab: (document.querySelector('.tab.active') || {}).id, gx: document.documentElement.className.split(' ').filter(c => /^gx-|cosmos|mapview/.test(c)).join(','), me: !!document.querySelector('#cgField .cg-body.me'), wrapped: !!(window.goTab && window.goTab.__gx), frames: window.__fc || 0, raf: window.__raf, vis: (function(){ try { return LowiWorld3D.debugVis ? LowiWorld3D.debugVis() : null; } catch (e) { return null; } })(), inBack: window.LowiWorld3D.inBack && LowiWorld3D.inBack(), back: !!(document.getElementById('bw3Back') && document.getElementById('bw3Back').isConnected), stage: !!(document.getElementById('bw3Stage')), canvasIn: (document.querySelector('canvas.bw3-canvas') || {}).parentElement ? document.querySelector('canvas.bw3-canvas').parentElement.id : null, spHomeOP: !!(document.getElementById('spHome') && document.getElementById('spHome').offsetParent), cover: [...document.querySelectorAll('.sp-world.on, .ht-world.on')].map(e => e.className).join('|'), mm: /mm-open|stp-open/.test(document.documentElement.className), hidden: document.hidden, st3: window.LowiWorld3D.state }; } catch (e) { return 'ERR ' + e.message; } });
(async () => {
    const R = await open({ engine: arg('engine', 'webkit'), url: arg('url', '') });
    const P = R.page;
    await P.exposeFunction('__plog', m => log('PAGE ' + m));
    await P.addInitScript(() => { document.addEventListener('click', e => { try { window.__plog && __plog('click ' + (e.target.className || e.target.tagName) + ' def=' + e.defaultPrevented); } catch (x) {} }, true); });
    await R.goto(); await N.sleep(5000);
    await P.evaluate(() => { window.__fc = 0; window.__raf = 0; (function L() { window.__raf++; requestAnimationFrame(L); })(); try { LowiWorld3D.onFrame(() => { window.__fc++; }); } catch (e) {} });
    log('fresh cam', await cam(R));
    log('fresh', await state(R));
    for (let v = 1; v <= 3; v++) {
        await N.openCommunity(R, log); await N.sleep(2000);
        log('before home', await cam(R));
        const via = await N.goHome(R, log);
        for (let i = 0; i < 8; i++) { await N.sleep(400); log('cam ' + i, await cam(R)); }
        log('home after community ' + v + ' via ' + via, await state(R));
        const s = await state(R);
        await P.mouse.click(s.x, s.y); await N.sleep(1500);
        log('after tap ' + v, await state(R));
    }
    log('errs', R.errs.map(e => e.m.slice(0, 200)));
    await R.close(); process.exit(0);
})().catch(e => { log('FATAL ' + (e.stack || e)); process.exit(1); });
