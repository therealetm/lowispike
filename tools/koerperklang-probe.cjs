'use strict';
/* Koerperklang / VR probe (Nov 5 2026): opens the Body sound (Koerperklang) panel from the Home HUD and from the Settings row, and
   screenshots Home, the panel and the Settings VR row in a phone-sized browser. Local fixture user, never writes anywhere.
   node tools/koerperklang-probe.cjs <dark|night|light> <WxH> [chromium|webkit] [tag] -> JSON + /home/sprite/kk-shots/*.png. Not a real phone. */
const fs = require('fs');
const { launch, openApp, sleep, existingSeed } = require('./interface-audit/lib.cjs');
const look = process.argv[2] || 'dark', vp = (process.argv[3] || '390x844').split('x').map(Number), engine = process.argv[4] || 'chromium', tagx = process.argv[5] || 'now';
const OUT = '/home/sprite/kk-shots'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
    const lang = 'de', theme = look === 'light' ? 'light' : 'dark';
    const kv = { 'lowispike.lang': lang, 'lowi.lang': lang, 'lowispike.theme': theme, 'lowi.theme': theme };
    if (look === 'night') { kv['lowi.theme.dark'] = 'night'; kv['lowi.theme.dark.picked'] = '1'; } if (look === 'dark') kv['lowi.theme.dark'] = 'black';
    const seed = existingSeed({ lang, kv });
    const h = await launch({ engine, seed, lang, locale: 'de-DE', viewport: { width: vp[0], height: vp[1] } });
    if (process.env.KK_FAKE_GYRO) await h.page.addInitScript(() => { /* an iPhone-like motion sensor: asks permission (granted), then streams readings */
        try { Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 }); } catch (e) { }
        window.ontouchstart = null;
        if (window.DeviceOrientationEvent) { window.DeviceOrientationEvent.requestPermission = async () => (window.__askCount = (window.__askCount || 0) + 1, 'granted'); }
        let t = 0; setInterval(() => { t++; let ev; try { ev = new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: 40 + Math.sin(t / 5) * 5, gamma: Math.cos(t / 5) * 5 }); } catch (e) { } if (!ev || ev.beta == null) { ev = new Event('deviceorientation'); Object.assign(ev, { alpha: 0, beta: 40 + Math.sin(t / 5) * 5, gamma: Math.cos(t / 5) * 5 }); } window.__orient = (window.__orient || 0) + 1; window.dispatchEvent(ev); }, 100); });
    await openApp(h, { query: '?dc=' + Date.now() });
    const P = h.page, tag = tagx + '-' + look + '-' + vp.join('x'), out = { look, vp: vp.join('x'), engine };
    await sleep(2500);
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await sleep(200); }
    await P.screenshot({ path: OUT + '/' + tag + '-home.png' });
    const box = sel => P.evaluate(s => [...document.querySelectorAll(s)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).display !== 'none'; }).map(e => { const r = e.getBoundingClientRect(); return { cls: String(e.className).slice(0, 80), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), txt: (e.innerText || '').replace(/\s+/g, ' ').slice(0, 80) }; }), sel);
    out.hudBtns = await box('#whHud .wa-btn, #whHud .wh-vr');
    /* 1. Home HUD sound button */
    out.hudTap = await P.evaluate(async () => { const b = document.querySelector('#whHud .wa-btn'); if (!b) return 'no hud btn'; b.click(); await new Promise(r => setTimeout(r, 1500)); return 'ok'; });
    out.panelFromHud = await box('.wa-panel, .ssp, [class*="sstr"], [class*="sound-str"]');
    out.panelInfo = await P.evaluate(() => { const p = document.querySelector('.wa-panel'); if (!p) return null; const cs = getComputedStyle(p); return { parent: p.parentElement && (p.parentElement.id || p.parentElement.className), bg: cs.backgroundImage.slice(0, 120), bgc: cs.backgroundColor, sh: p.scrollHeight, ch: p.clientHeight, fs: cs.fontSize, html: p.innerHTML.length, kids: [...p.children].map(c => c.className + ':' + Math.round(c.getBoundingClientRect().height)) }; });
    await P.screenshot({ path: OUT + '/' + tag + '-panel-hud.png' });
    await P.evaluate(async () => { const x = document.querySelector('.wa-panel .wa-x'); if (x) x.click(); await new Promise(r => setTimeout(r, 600)); });
    for (let i = 0; i < 2; i++) { await P.keyboard.press('Escape'); await sleep(200); }
    /* 2. Settings: rows for Koerperklang and VR */
    await P.evaluate(async () => { try { LowiCommunityMe.open(); } catch (e) { } await new Promise(r => setTimeout(r, 1400)); const b = document.querySelector('[data-cme="vr"]'); if (b) b.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 400)); });
    out.settingsRows = await box('[data-cme="worldSound"], [data-cme="vr"], [data-cme="vrSw"]');
    await P.screenshot({ path: OUT + '/' + tag + '-settings.png' });
    out.soundRow = await P.evaluate(async () => { const b = document.querySelector('[data-cme="worldSound"]'); if (!b) return 'no row'; b.click(); await new Promise(r => setTimeout(r, 2200)); return 'ok'; });
    out.panelFromSettings = await box('.wa-panel:not(.mb-ghost)');
    out.sheet = await P.evaluate(() => { const p = document.querySelector('.wa-panel:not(.mb-ghost)'); if (!p) return null; const r = p.getBoundingClientRect(), cs = getComputedStyle(p), sc = document.querySelector('.wa-scrim');
        const kids = [...p.querySelectorAll('.wa-hd,.wa-strings,.ss-top,.ss-pad,.ss-now,.ss-hint,.wa-group,.wa-row,.wa-more,.wa-x')].map(c => { const q = c.getBoundingClientRect(); return c.className.split(' ')[0] + ' ' + Math.round(q.x) + ',' + Math.round(q.y) + ' ' + Math.round(q.width) + 'x' + Math.round(q.height) + (getComputedStyle(c).display === 'none' ? ' HIDDEN' : ''); });
        const hit = [[195, 100], [195, 300], [195, r.top + 30], [195, 830]].map(([x, y]) => { const e = document.elementFromPoint(x, y); return y + ':' + (e ? (e.className && String(e.className).slice(0, 30) || e.tagName) : '-'); });
        const bx = document.getElementById('lwBX'); const bxr = bx && getComputedStyle(bx).display !== 'none' ? bx.getBoundingClientRect() : null;
        return { r: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], bg: cs.backgroundColor, color: cs.color, scrim: sc && getComputedStyle(sc).backgroundColor + ' op ' + getComputedStyle(sc).opacity, kids, hit, bottomX: bxr && [Math.round(bxr.x), Math.round(bxr.y), Math.round(bxr.width)], xHidden: (() => { const x = p.querySelector('.wa-x'); return x && (x.classList.contains('lw-bx-src') + ' op ' + getComputedStyle(x).opacity + ' svgop ' + getComputedStyle(x.querySelector('svg')).opacity); })(), bxLabel: bx && bx.getAttribute('aria-label'), focus: document.activeElement && document.activeElement.className, settingsStillOpen: !!document.querySelector('.cme') }; });
    await P.screenshot({ path: OUT + '/' + tag + '-panel-settings.png' });
    out.bxDebug = await P.evaluate(() => { const p = document.querySelector('.wa-panel:not(.mb-ghost)'); if (!p) return null; const o = [];
        p.querySelectorAll('*').forEach(e => { for (const q of e.getClientRects()) if (q.bottom > 600 && q.width) { o.push(e.tagName + '.' + String(e.className).slice(0, 20) + ' ' + Math.round(q.top) + '-' + Math.round(q.bottom) + ' x' + Math.round(q.left) + '-' + Math.round(q.right)); break; } });
        return { obs: window.LowiBottomClose && window.LowiBottomClose.lifted, o: o.slice(0, 30), sh: p.scrollHeight, chh: p.clientHeight }; });
    /* VR row: state and a tap (desktop has no motion sensor, so it says so and stays off) */
    await P.evaluate(async () => { const x = document.querySelector('.wa-panel:not(.mb-ghost) [data-wa=x]'); if (x) x.click(); await new Promise(r => setTimeout(r, 500)); });
    out.afterClose = await P.evaluate(() => ({ sheet: !!document.querySelector('.wa-panel:not(.mb-ghost)'), scrim: document.querySelectorAll('.wa-scrim').length, settings: !!document.querySelector('.cme'), asked: window.__askCount || 0, orient: window.__orient || 0, stored: localStorage.getItem('lowi.world3d.gyro'), focus: document.activeElement && (document.activeElement.getAttribute('data-cme') || document.activeElement.tagName + '.' + String(document.activeElement.className).slice(0, 30)), rowInert: (() => { const r = document.querySelector('[data-cme="worldSound"]'); return r ? !!r.closest('[inert]') : 'no row'; })() }));
    out.vrRow = await P.evaluate(() => { const b = document.querySelector('[data-cme="vr"]'); return b ? { role: b.getAttribute('role'), checked: b.getAttribute('aria-checked'), dis: b.getAttribute('aria-disabled'), txt: b.innerText.replace(/\s+/g, ' ') } : null; });
    const vrRead = () => P.evaluate(() => { const b = document.querySelector('[data-cme="vr"]'); const g = window.LowiWorld3D && window.LowiWorld3D.gyro; return { checked: b && b.getAttribute('aria-checked'), txt: b && b.innerText.replace(/\s+/g, ' '), gyroOn: g && g.on(), kind: g && g.kind(), settings: !!document.querySelector('.cme'), asked: window.__askCount || 0, orient: window.__orient || 0, stored: localStorage.getItem('lowi.world3d.gyro'), focus: document.activeElement && document.activeElement.getAttribute('data-cme') }; });
    await P.click('[data-cme="vr"]'); await sleep(1200); out.vrAfterOn = await vrRead(); await sleep(2600); out.vrStillOn = await vrRead();
    await P.screenshot({ path: OUT + '/' + tag + '-settings-vr-on.png' });
    await P.click('[data-cme="vr"]'); await sleep(1200); out.vrAfterOff = await vrRead();
    /* keyboard: focus the row, Enter opens, Tab stays inside, Escape closes and focus comes back */
    await P.evaluate(() => { const r = document.querySelector('[data-cme="worldSound"]'); r.scrollIntoView({ block: 'center' }); r.focus(); });
    await P.keyboard.press('Enter'); await sleep(900);
    const tabs = []; for (let i = 0; i < 12; i++) { await P.keyboard.press('Tab'); tabs.push(await P.evaluate(() => { const a = document.activeElement; return (a.closest('.wa-panel') ? 'in:' : 'OUT:') + (a.dataset.wa || a.tagName); })); }
    out.kbTabs = tabs.join(' ');
    out.kbOpener = await P.evaluate(() => 'n/a');
    await P.keyboard.press('Escape'); await sleep(30); out.kbEsc30 = await P.evaluate(() => document.activeElement && (document.activeElement.getAttribute('data-cme') || document.activeElement.tagName)); await sleep(570);
    out.kbAfterEsc = await P.evaluate(() => ({ sheet: !!document.querySelector('.wa-panel:not(.mb-ghost)'), settings: !!document.querySelector('.cme'), focus: document.activeElement && (document.activeElement.getAttribute('data-cme') || document.activeElement.tagName) }));
    out.wide = await P.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    out.errors = h.errors; out.consoleErr = h.consoleErr.filter(t => !/Failed to load resource|net::ERR|supabase|ERR_FAILED/i.test(t)).slice(0, 5);
    console.log(JSON.stringify(out, null, 1));
    await h.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
