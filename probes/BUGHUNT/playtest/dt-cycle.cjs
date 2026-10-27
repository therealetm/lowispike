/* BH-060: My cycle "Turn on" double tap. Tracking off, open the sheet, tap Turn on twice (2nd tap GAP ms later by the events'
   own clocks) and report what got the 2nd tap and which care chips ended up on. Also: a slow 2nd tap and a quick tap elsewhere. */
const D = require('./dt-lib.cjs');
const gap = +(process.argv[3] || 120);
(async () => {
    const h = await D.boot(process.argv[2] || 'chromium390', process.env.DTLIVE ? { url: process.env.DTLIVE } : undefined);
    const p = h.page;
    const reset = async () => {
        await p.evaluate(() => { try { LowiCycleWorld.close(); } catch (e) {} const s = LowiR2.S(); s.user.gender = 'f'; LowiCycle.setShow(false);
            try { const c = LowiCycle.data(); if (c && c.days) for (const k in c.days) delete c.days[k]; } catch (e) {} });
        await D.sleep(900);
        await p.evaluate(() => LowiCycleWorld.open()); await D.sleep(1400);
    };
    const chipsOn = () => p.evaluate(() => [...document.querySelectorAll('#cwSheet .cw-chip')].filter(x => x.getAttribute('aria-pressed') === 'true').map(x => x.textContent.trim()));
    const run = async (label, secondGap, dx, dy) => {
        await reset();
        const on = await D.at(h, '#cwSheet [data-cw="on"]');
        if (!on) { console.log(label, 'no Turn on button'); return; }
        const t0 = Date.now() / 1000;
        await p.evaluate(() => { window.__got = []; });
        await D.tapAt(h, on.x, on.y, t0);
        await D.sleep(150);
        let tx = on.x + 2, ty = on.y + 1;
        if (dx != null) { ty = on.y - 250; }
        await D.tapAt(h, tx, ty, t0 + secondGap / 1000);
        await D.sleep(900);
        const got = await p.evaluate(() => window.__got.splice(0));
        const under = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); const b = e && e.closest('button'); return b ? b.textContent.trim() : (e ? e.tagName : '-'); }, [on.x, on.y]);
        console.log(label, '| under the Turn on spot now:', JSON.stringify(under), '| clicks', got.length, JSON.stringify(got.map(g => g.el + ' lag' + g.lag)), '| chips on', JSON.stringify(await chipsOn()),
            '| tracking', await p.evaluate(() => LowiCycleWorld.enabled()));
    };
    await run('fast 2nd tap same spot (' + gap + ' ms):', gap);
    await run('slow 2nd tap same spot (600 ms):', 600);
    await run('quick 2nd tap 250 px higher (200 ms):', 200, 1, 1);
    /* Escape still closes, and keyboard Enter on Turn on still works */
    await reset();
    await p.evaluate(() => { const b = document.querySelector('#cwSheet [data-cw="on"]'); b && b.focus(); });
    await p.keyboard.press('Enter'); await D.sleep(600);
    console.log('keyboard Enter on Turn on -> tracking', await p.evaluate(() => LowiCycleWorld.enabled()));
    await p.keyboard.press('Escape'); await D.sleep(900);
    console.log('Escape -> sheet open', await p.evaluate(() => LowiCycleWorld.isOpen()));
    /* reopen right after closing (the old sheet still sliding out) */
    await p.evaluate(() => { LowiCycleWorld.open(); }); await D.sleep(1200); await p.evaluate(() => LowiCycleWorld.close()); await D.sleep(250);
    await p.evaluate(() => LowiCycleWorld.open()); await D.sleep(1200);
    console.log('reopen 250 ms after close -> sheet text', JSON.stringify(await p.evaluate(() => { const o = [...document.querySelectorAll('.cw-ov')].pop(); return o ? o.innerText.replace(/\s+/g, ' ').slice(0, 40) : '-'; })));
    console.log('errors', JSON.stringify(h.log.pageerror.slice(0, 5)));
    await h.browser.close(); h.srv.close();
})().catch(e => { console.error(e); process.exit(1); });
