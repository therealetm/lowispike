'use strict';
/* Weight & BMI sheet probe. usage: node tools/probe-body-stats.cjs <view> <url|dir> <lang> [outPrefix]
   Opens Settings by tapping the Settings bubble, taps Weight & BMI, types a weight + height, picks a sex, saves, then adds two
   older weigh-ins so the Then/Now level track shows. Reports BMI/category/fat text, level, whether every control can be tapped
   (on screen, not covered), sheet bounds vs the viewport, the hook card, and page errors. Screenshots top + bottom. */
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
(async () => {
    const view = process.argv[2] || 'iphone13', target = process.argv[3] || 'https://therealetm.github.io/lowispike/', lang = process.argv[4] || 'en', out = process.argv[5] || '/tmp/bs';
    let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 6000, lang });
    const { page } = h, res = { view, lang };
    await page.evaluate(l => { try { window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) { } }, lang);
    await L.sleep(800);
    for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await L.sleep(250); }
    res.build = await page.evaluate(() => { try { return document.querySelector('meta[name="lowi-build"]') ? document.querySelector('meta[name="lowi-build"]').content : (window.LOWI_BUILD || null); } catch (e) { return null; } });
    res.loaded = await page.evaluate(() => !!(window.LowiBodyStats && window.LowiBodyStatsCore));
    /* Settings bubble -> Weight & BMI row, by real taps */
    const sb = await L.center(h, '#whHud .o8-settings') || await L.center(h, '[data-orbit="settings"]');
    if (sb) { await L.tap(h, sb.x, sb.y); await L.sleep(900); }
    const row = await L.center(h, '[data-ss2="body"]');
    res.row = row ? await page.evaluate(() => document.querySelector('[data-ss2="body"]').textContent.trim()) : null;
    if (row) { await L.tap(h, row.x, row.y); await L.sleep(900); }
    if (!await page.$('#bsOv')) { res.openedBy = 'api'; await page.evaluate(() => window.LowiBodyStats && LowiBodyStats.open()); await L.sleep(600); } else res.openedBy = 'settings-row';
    res.settingsClosed = await page.evaluate(() => !document.querySelector('[data-ss2="body"]') || !document.querySelector('[data-ss2="body"]').getBoundingClientRect().width);
    await page.fill('#bsKg', lang === 'en' ? '95.4' : '95,4');
    if (await page.$('#bsCm')) await page.fill('#bsCm', '180');
    const sx = await L.center(h, '[data-bs-sex="m"]'); if (sx) { await L.tap(h, sx.x, sx.y); await L.sleep(300); }
    const go = await L.center(h, '.bs-go'); if (go) await L.tap(h, go.x, go.y);
    await L.sleep(700);
    res.afterSave = await page.evaluate(() => { const S = LowiR2.S(); return { weight: S.health.weight, heightCm: S.health.heightCm, gender: S.user.gender, n: (S.health.body.weights || []).length, stored: !!localStorage.getItem('lowispike.v2') && /"heightCm":180/.test(localStorage.getItem('lowispike.v2') || '') }; });
    /* two older weigh-ins (as if weighed a month and two weeks ago) so the Then/Now level track shows */
    await page.evaluate(() => { const S = LowiR2.S(), C = LowiBodyStatsCore, now = Date.now(); const b = S.health.body; b.weights.unshift({ ts: now - 30 * 864e5, kg: 99.2, source: 'weigh-in' }, { ts: now - 14 * 864e5, kg: 97.1, source: 'weigh-in' }); LowiR2.save(); LowiBodyStats.close(); });
    await L.sleep(400); await page.evaluate(() => LowiBodyStats.open()); await L.sleep(700);
    const info = await page.evaluate(async () => {
        const ov = document.getElementById('bsOv'), sh = ov.querySelector('.bs-sheet'), r = sh.getBoundingClientRect();
        const txt = s => { const e = ov.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
        const bad = [], ok = [];
        for (const e of [...ov.querySelectorAll('button, input')].filter(e => e.getBoundingClientRect().width)) {
            e.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 80));
            const b = e.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
            const lab = (e.className || e.id) + ':' + (e.textContent || e.value || '').trim().slice(0, 20);
            if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) { bad.push('offscreen ' + lab); continue; }
            const t = document.elementFromPoint(cx, cy);
            if (!(t === e || e.contains(t))) bad.push('covered ' + lab + ' by ' + (t && (t.id || t.className)));
            else if (b.height < 43.5 && !/bs-x|bs-close/.test(e.className) && e.tagName === 'BUTTON') bad.push('small ' + lab + ' ' + Math.round(b.height)); else ok.push(lab);
        }
        sh.scrollTop = 0;
        const over = [...sh.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > r.right + 1 || b.left < r.left - 1); }).map(e => e.className && e.className.baseVal != null ? e.className.baseVal : e.className).slice(0, 5);
        return { stats: txt('.bs-stats'), range: txt('.bs-range'), note: txt('.bs-note'), track: txt('.bs-arrow'), line: txt('.bs-track > p'), hist: ov.querySelectorAll('.bs-hist li').length,
            sheet: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], vp: [innerWidth, innerHeight], inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, overflowX: over, bad, ok: ok.length,
            modal: ov.getAttribute('aria-modal'), card: (() => { const d = document.createElement('div'); d.innerHTML = LowiBodyStats.cardHTML(); return d.textContent.replace(/\s+/g, ' ').trim(); })() };
    });
    Object.assign(res, info);
    await page.screenshot({ path: out + '-' + view + '-' + lang + '-top.png' });
    await page.evaluate(() => { const sh = document.querySelector('#bsOv .bs-sheet'); sh.scrollTop = sh.scrollHeight; });
    await L.sleep(300);
    await page.screenshot({ path: out + '-' + view + '-' + lang + '-bottom.png' });
    /* Escape closes, nothing left behind */
    await page.keyboard.press('Escape'); await L.sleep(400);
    res.closed = await page.evaluate(() => !document.getElementById('bsOv'));
    const s = await L.snap(h); res.errors = h.log.pageerror.concat(s.err, s.rej);
    console.log(JSON.stringify(res, null, 1));
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(1); });
