/* focused: catch-up bubble double tap and cycle Turn on double tap; what view is showing afterwards */
const D = require('./dt-lib.cjs');
(async () => {
    const h = await D.boot(process.argv[2] || 'chromium390', process.env.DTLIVE ? { url: process.env.DTLIVE } : undefined);
    const p = h.page;
    const r = await p.evaluate(() => { try { return LowiEveningCatchup.open(); } catch (e) { return String(e); } });
    await D.sleep(1200);
    const b = await D.at(h, '[data-ec="open"]');
    console.log('ec open ->', r, 'bubble', b);
    if (b) {
        const g = await D.dbl(h, b.x, b.y, 120);
        console.log('ec clicks', JSON.stringify(g));
        console.log('ec view', await p.evaluate(() => { const o = document.querySelector('.ec-opts'), pw = document.querySelector('.ec-popwrap'); return { opts: !!o, pop: !!pw, txt: (document.querySelector('.ec-q,.ec-step') || {}).textContent }; }));
    }
    await p.keyboard.press('Escape'); await D.sleep(800);
    await p.evaluate(() => { try { LowiR2.closeAll && LowiR2.closeAll(); } catch (e) {} });
    await D.sleep(800);
    const c = await p.evaluate(() => { try { return LowiCycle.open(); } catch (e) { return String(e); } });
    await D.sleep(1200);
    const on = await D.at(h, '#cwSheet [data-cw="on"]');
    console.log('cycle open ->', c, 'on', on);
    if (on) {
        const g = await D.dbl(h, on.x, on.y, 120);
        console.log('cycle clicks', JSON.stringify(g));
        console.log('cycle chips on', await p.evaluate(() => [...document.querySelectorAll('#cwSheet .cw-chip')].filter(x => x.getAttribute('aria-pressed') === 'true' || x.classList.contains('on')).map(x => x.textContent.trim())));
    }
    console.log('errors', JSON.stringify(h.log.pageerror.slice(0, 5)));
    await h.browser.close(); h.srv.close();
})().catch(e => { console.error(e); process.exit(1); });
