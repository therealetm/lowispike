/* one-ui look check (22 Oct 2026, One UI step 1): opens the profile hub, the Fuel sheet and Misty's cell sheet in Day and Night and
   measures them: same shell (r2-ov sheet, grab handle, round X bottom centre), no dark band behind the grab, the X never covers a
   control or text, the hub fits and keeps every row.
   node tools/one-ui/probe-one-ui.cjs is the runner; this file is its --script body. */
const settle = () => page.waitForFunction(() => { const ov = [...document.querySelectorAll('.r2-ov.on')].pop(); const sh = ov && ov.querySelector('.r2-sh'); if (!sh) return false; const m = getComputedStyle(sh).transform.match(/matrix\(([^)]+)\)/); return !m || Math.abs(+m[1].split(',')[5]) < 1; }, null, { timeout: 8000 }).catch(() => { });
const info = async () => { await settle(); return page.evaluate(() => {
    const ov = [...document.querySelectorAll('.r2-ov.on')].pop(); if (!ov) return null;
    const sh = ov.querySelector('.r2-sh'), g = ov.querySelector('.r2-grab');
    let x = document.querySelector('.wh-x:not([hidden])'); if (!x || !x.getBoundingClientRect().width) x = ov.querySelector('.r2-x');
    const r = sh.getBoundingClientRect(), cs = getComputedStyle(sh), xr = x && x.getBoundingClientRect();
    /* what the X covers: any visible control or text inside the sheet (clipped to the sheet) that sits under the X */
    const covers = [];
    if (xr && xr.width) sh.querySelectorAll('button, [role=button], b, small, p, h2, h3, progress, [class*=bar], [class*=xp]').forEach(n => {
        if (n.closest('.r2-x') || n.closest('.pf-hd')) return; const b = n.getBoundingClientRect(); if (b.width < 2 || b.height < 2) return;
        const top = Math.max(b.top, r.top), bot = Math.min(b.bottom, r.bottom); if (bot - top < 2) return;
        const ix = Math.min(b.right, xr.right) - Math.max(b.left, xr.left), iy = Math.min(bot, xr.bottom) - Math.max(top, xr.top);
        if (ix > 4 && iy > 4) covers.push(n.tagName + '.' + String(n.className).slice(0, 20) + ':' + (n.textContent || '').trim().slice(0, 24));
    });
    const hd = sh.querySelector(':scope > .pf-hd');
    return { cls: ov.className, bg: cs.backgroundImage.slice(0, 50) + '|' + cs.backgroundColor, radius: cs.borderTopLeftRadius,
        rect: [r.left, r.top, r.width, r.height].map(Math.round), vh: innerHeight, grab: !!g, x: xr ? [xr.left, xr.top, xr.width].map(Math.round) : null,
        xBelow: xr ? xr.top >= r.bottom - 1 : null, covers, hdBg: hd ? getComputedStyle(hd).backgroundImage.slice(0, 30) + '|' + getComputedStyle(hd).backgroundColor : null };
}); };
const theme = async m => { await page.evaluate(m => { localStorage.setItem('lowi.theme', m); if (window.LowiR2 && LowiR2.applyTheme) LowiR2.applyTheme(m); else document.documentElement.setAttribute('data-theme', m); }, m); await sleep(500); };
const closeAll = async () => { await page.evaluate(() => { try { window.LowiCommunityMe && LowiCommunityMe.close(); } catch (e) { } try { LowiR2.closeAll(); } catch (e) { } }); await sleep(600); };
const tapOrbit = async k => { const p = await page.evaluate(k => { const e = document.querySelector('#whHud [data-orbit="' + k + '"], [data-home-bubble="' + k + '"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, k); if (!p) return false; await page.touchscreen.tap(p.x, p.y); return true; };
for (const [m, lg] of [['light', 'en'], ['dark', 'de'], ['light', 'es'], ['dark', 'en']]) {
    await theme(m); await page.evaluate(l => { try { window.LowiLang.set(l); } catch (e) { } }, lg); await sleep(500);
    console.log('[cs] --- ' + m + ' ' + lg + ' ' + (await page.evaluate(() => document.documentElement.lang)));
    /* the hub */
    await page.evaluate(() => window.LowiCommunityMe.open()); await sleep(900);
    const hub = await info(); console.log('[cs] ' + m + ' hub ' + JSON.stringify(hub));
    const extra = await page.evaluate(() => { const el = document.getElementById('cmeSheet'); if (!el) return null; const ids = [...el.querySelectorAll('[data-cme],[data-lang]')].map(b => b.getAttribute('data-cme') || b.getAttribute('data-lang'));
        const sc = el.closest('.r2-shb') || el; const small = [...el.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width && (r.width < 40 || r.height < 36); }).map(b => b.getAttribute('data-cme') || b.getAttribute('data-lang'));
        const clip = [...el.querySelectorAll('.cme-tile b, .cme-row b')].filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent);
        return { ids, small, clip, tiles: el.querySelectorAll('.cme-tile').length, overflowX: document.documentElement.scrollWidth > innerWidth + 1 }; });
    console.log('[cs] ' + m + ' hub rows ' + JSON.stringify(extra));
    if (!hub) fail(m + ': hub is not an r2 sheet'); else {
        if (!hub.grab) fail(m + ': hub has no grab handle'); if (!hub.x) fail(m + ': hub has no round X');
        if (hub.covers.length) fail(m + ': hub X covers ' + hub.covers.join(',')); if (hub.xBelow === false) fail(m + ': hub X sits on the sheet');
        if (!/cme-ov/.test(hub.cls)) fail(m + ': hub sheet missing cme-ov');
        if (hub.rect[1] + hub.rect[3] > hub.vh + 1 || hub.rect[0] < 0) fail(m + ': hub off screen ' + hub.rect);
    }
    if (!extra) fail(m + ': no #cmeSheet'); else {
        for (const id of ['me', 'body', 'weight', 'more', 'theme', 'look', 'en', 'de', 'es', 'tutorial', 'account', 'deleteAccount']) if (!extra.ids.includes(id)) fail(m + ': hub missing ' + id);
        if (extra.ids[extra.ids.length - 1] !== 'deleteAccount') fail(m + ': Delete account not last');
        if (extra.tiles < 3) fail(m + ': You items are not tiles'); if (extra.clip.length) fail(m + ': clipped labels ' + extra.clip.join('|'));
        if (extra.small.length) fail(m + ': small targets ' + extra.small.join(',')); if (extra.overflowX) fail(m + ': page overflows sideways');
    }
    await shot(m + '-' + lg + '-hub');
    await page.evaluate(() => { const s = document.querySelector('.r2-ov.on .r2-shb'); if (s) s.scrollTop = 1e5; }); await sleep(300);
    const hubEnd = await info(); if (hubEnd && hubEnd.covers.length) fail(m + ': hub X covers at the end ' + hubEnd.covers.join(','));
    await shot(m + '-' + lg + '-hub-end');
    await closeAll();
    if (await page.evaluate(() => !!document.querySelector('.r2-ov.on') || window.LowiCommunityMe.isOpen())) fail(m + ': hub did not close');
    for (const [n, fn] of [['meal', 'LowiSpirit.meal()'], ['misty', 'LowiMistyHub.open()']]) {
        await page.evaluate(fn => { try { eval(fn); } catch (e) { } }, fn); await sleep(1600);
        const f = await info(); console.log('[cs] ' + m + ' ' + n + ' ' + JSON.stringify(f)); await shot(m + '-' + lg + '-' + n);
        if (!f) { fail(m + ': ' + n + ' did not open'); continue; }
        if (f.covers.length) fail(m + ': ' + n + ' X covers ' + f.covers.join(','));
        if (f.hdBg && !/^none\|rgba\(0, 0, 0, 0\)$/.test(f.hdBg)) fail(m + ': ' + n + ' band behind the grab ' + f.hdBg);
        if (f.xBelow === false) fail(m + ': ' + n + ' X sits on the sheet');
        await closeAll();
    }
}
