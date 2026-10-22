'use strict';
/* cell-world-names.cjs (Oct 22 2026): entering a cell world shows its name on a short entry banner, and a small pill keeps
   it named while you are inside. Per device x theme: fly into Insulin Island from Home, check the banner (visible, inside
   the screen, not over the World map button, never takes a tap), then that it fades and the pill stays; then back out.
   node tools/sim/cell-world-names.cjs [--devices "iPhone SE,iPhone 13,iPhone 15,Pixel 7"] [--out DIR] [--root DIR]
   Exit 1 on any FAIL. Not a physical phone. */
const path = require('path'), fs = require('fs');
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
if (arg('root')) process.env.IA_ROOT = path.resolve(arg('root'));
const L = require('../interface-audit/lib.cjs');
const OUT = path.resolve(arg('out', '/home/sprite/cell-world-shots')); fs.mkdirSync(OUT, { recursive: true });
const DEVICES = arg('devices', 'iPhone SE,iPhone 13,iPhone 15,Pixel 7').split(',');
const REGION = arg('region', 'pancreas');

const look = () => {
    const vis = e => { if (!e || !e.isConnected) return false; const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.5; };
    const b = document.getElementById('bwrEnter'), p = document.getElementById('bwrWhere'), m = document.getElementById('bwrMapBtn');
    const box = e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
    const out = { theme: document.documentElement.dataset.theme || '', cur: window.LowiWorldRegions && window.LowiWorldRegions.current && window.LowiWorldRegions.current(), W: innerWidth, H: innerHeight };
    if (b) { out.banner = { on: b.classList.contains('on'), vis: vis(b), text: b.innerText.replace(/\s+/g, ' ').trim(), box: box(b), pe: getComputedStyle(b).pointerEvents, color: getComputedStyle(b.querySelector('b')).color, bg: getComputedStyle(b).backgroundColor };
        const r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); out.banner.tapThrough = !!hit && !b.contains(hit); }
    if (p) out.pill = { vis: vis(p) && p.getBoundingClientRect().width > 20, text: p.innerText.trim(), box: box(p) };
    if (m) out.map = box(m);
    return out;
};
const overlap = (a, c) => a && c && a[0] < c[2] && c[0] < a[2] && a[1] < c[3] && c[1] < a[3];

async function run(device, theme) {
    const engine = /Pixel/.test(device) ? 'chromium' : 'webkit';
    const h = await L.launch({ device, engine });
    const { page } = h;
    try {
        await h.ctx.addInitScript(t => { try { localStorage.setItem('lowi.theme', t); } catch (e) { } }, theme);
        await L.openApp(h, { settle: 4500 });
        const go = await page.evaluate(id => window.LowiWorldRegions && window.LowiWorldRegions.travel ? String(window.LowiWorldRegions.travel(id)) : 'no api', REGION);
        let r = {};
        for (let t = 0; t < 80; t++) { await L.sleep(150); r = await page.evaluate(look); if (r.banner && r.banner.on && r.banner.vis) break; }
        const shot = path.join(OUT, device.replace(/\s+/g, '') + '-' + theme + '.png'); await page.screenshot({ path: shot });
        await L.sleep(3600);
        const later = await page.evaluate(look); await page.screenshot({ path: shot.replace('.png', '-inside.png') });
        await page.evaluate(() => window.LowiWorldRegions.travel('hub'));
        let back = {}; for (let t = 0; t < 60; t++) { await L.sleep(150); back = await page.evaluate(look); if (back.cur === 'hub' && back.banner && back.banner.on) break; }
        const B = r.banner || {}, fails = [];
        if (!B.on || !B.vis) fails.push('no banner');
        if (!/insulin/i.test(B.text || '')) fails.push('banner text');
        if (B.pe !== 'none' || !B.tapThrough) fails.push('banner takes taps');
        if (B.box && (B.box[0] < 0 || B.box[2] > r.W || B.box[1] < 0 || B.box[3] > r.H)) fails.push('banner off screen');
        if (overlap(B.box, r.map)) fails.push('banner over World map');
        if (later.banner && later.banner.vis) fails.push('banner did not fade');
        if (!later.pill || !later.pill.vis || !/insulin/i.test(later.pill.text)) fails.push('no where-pill inside');
        if (later.pill && overlap(later.pill.box, later.map)) fails.push('pill over World map');
        if (back.cur !== 'hub' || !/ruby/i.test((back.banner || {}).text || '')) fails.push('no banner back in the bloodstream');
        if (back.pill && back.pill.vis) fails.push('pill still shown in the bloodstream');
        if (theme === 'light' && r.theme !== 'light') fails.push('theme not light');
        if (h.errors.length) fails.push('page errors');
        return { device, theme, ok: !fails.length, fails, go, r: { theme: r.theme, banner: B, pillLater: later.pill, map: r.map, back: (back.banner || {}).text }, shot, errors: h.errors };
    } finally { await h.browser.close(); }
}

(async () => {
    let bad = 0, n = 0;
    for (const d of DEVICES) for (const th of ['dark', 'light']) {
        let res; try { res = await run(d, th); } catch (e) { res = { device: d, theme: th, ok: false, error: String(e).slice(0, 200) }; }
        n++; if (!res.ok) bad++;
        console.log((res.ok ? 'PASS ' : 'FAIL ') + d + ' ' + th + ' ' + JSON.stringify(res.fails || res.error) + ' ' + JSON.stringify(res.r || {}) + (res.errors && res.errors.length ? ' errors=' + JSON.stringify(res.errors) : ''));
    }
    console.log(bad + ' FAIL of ' + n);
    process.exit(bad ? 1 : 0);
})();
