/* Double-tap close sweep: open a screen by its API, then for each of its buttons double-tap it (2nd tap 120 ms later by the
   events' own clocks) and report when the 2nd tap reached something that was already on the page before the screen opened
   (the 1st tap closed the screen and uncovered it). Usage: node dt-sweep.cjs <view> <group> [gap] */
const D = require('./dt-lib.cjs');
const GROUPS = require('./dt-screens.cjs');
const SKIP = /sign ?out|log ?out|abmelden|cerrar sesi|delete|löschen|lösch|borrar|eliminar|reset|zurücksetzen|account|konto|install|share|teilen|compartir|camera|kamera|cámara|photo|foto|upload|record|aufnehmen/i;
(async () => {
    const view = process.argv[2] || 'chromium390', group = process.argv[3] || 'a', gap = +(process.argv[4] || 120);
    const list = GROUPS[group];
    const h = await D.boot(view, { lang: process.env.LANG2 || 'en' });
    const page = h.page;
    const reset = async () => {
        await D.sleep(750);
        await page.evaluate(() => { try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch (e) {} });
        for (let i = 0; i < 3; i++) await page.keyboard.press('Escape').catch(() => {});
        await page.evaluate(() => { try { window.LowiR2 && LowiR2.closeAll && LowiR2.closeAll(); } catch (e) {} try { typeof closeSheet === 'function' && closeSheet(); } catch (e) {}
            try { if (typeof TAB !== 'undefined' && TAB !== 'home' && typeof goTab === 'function') goTab('home'); } catch (e) {} });
        await D.sleep(700);
    };
    const openScreen = async js => page.evaluate(js => {
        const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
            const c = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2))); return !!c && (c === e || e.contains(c)); };
        window.__pre = new WeakSet([...document.querySelectorAll('*')]);
        const before = new Set([...document.querySelectorAll('button,[role=button],a[href],.chip,[data-act]')].filter(vis));
        try { (0, eval)(js); } catch (e) { return { err: String(e).slice(0, 120) }; }
        return new Promise(res => setTimeout(() => {
            const now = [...document.querySelectorAll('button,[role=button],a[href],.chip,[data-act]')].filter(vis).filter(e => !before.has(e) || !window.__pre.has(e));
            window.__new = now;
            res({ n: now.length, btns: now.map((e, i) => { const r = e.getBoundingClientRect(); return { i, x: r.left + r.width / 2, y: r.top + r.height / 2, t: ((e.getAttribute('aria-label') || '') + ' ' + (e.textContent || '')).replace(/\s+/g, ' ').trim().slice(0, 40), c: (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '')).slice(0, 60) }; }) });
        }, 1100));
    }, js);
    const out = [];
    for (const [name, js] of list) { try {
        await reset();
        const s = await openScreen(js);
        if (!s || s.err || !s.n) { console.log('SCREEN', name, 'nothing', s && s.err || ''); continue; }
        console.log('SCREEN', name, s.n, 'buttons');
        const btns = s.btns.slice(0, 14);
        for (const b of btns) {
            if (SKIP.test(b.t + ' ' + b.c)) { console.log('  skip', b.c, JSON.stringify(b.t)); continue; }
            await reset();
            const s2 = await openScreen(js);
            const bb = s2 && s2.btns && (s2.btns.find(z => z.c === b.c && z.t === b.t) || null);
            let bb2 = bb;
            if (!bb2) { await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {}); await D.sleep(7000); await reset(); const s3 = await openScreen(js).catch(() => null); bb2 = s3 && s3.btns && s3.btns.find(z => z.c === b.c && z.t === b.t); }
            if (!bb2) { console.log('  gone', b.c, JSON.stringify(b.t)); continue; }
            const bbX = bb2;
            await page.evaluate(() => { window.__got2 = []; const pre = window.__pre; window.__dtL = e => { if (!e.isTrusted) return; window.__got2.push({ pre: pre.has(e.target), el: (e.target.closest && e.target.closest('button,[role=button],a,input,label,[data-act]') || e.target).outerHTML.slice(0, 110), ts: Math.round(e.timeStamp) }); };
                addEventListener('click', window.__dtL, true); });
            const t0 = Date.now() / 1000;
            await D.tapAt(h, bbX.x, bbX.y, t0);
            await D.tapAt(h, bbX.x + 2, bbX.y + 1, t0 + gap / 1000);
            await D.sleep(1000);
            const r = await page.evaluate(() => { removeEventListener('click', window.__dtL, true); return window.__got2.splice(0); });
            const second = r[1];
            const tag = !second ? 'ok-swallowed' : (second.pre ? 'LEAK' : (r[0] && r[0].el === second.el ? 'same' : 'other'));
            const line = (tag === 'LEAK' ? '  LEAK ' : '  ' + tag + ' ') + bbX.c + ' ' + JSON.stringify(bbX.t) + (second ? ' -> ' + second.el.replace(/\s+/g, ' ') : '');
            console.log(line);
            if (tag === 'LEAK' || tag === 'other') out.push(name + ': ' + line.trim());
        }
    } catch (err) { console.log('SCREEN', name, 'ERR', String(err).slice(0, 160)); await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {}); await D.sleep(7000); } }
    console.log('==== SUMMARY ' + view + ' ' + group);
    console.log(out.join('\n'));
    console.log('errors', JSON.stringify(h.log.pageerror.slice(0, 10)));
    await h.browser.close(); h.srv.close();
})().catch(e => { console.error(e); process.exit(1); });
