/* misty-say before shots (22 Oct 2026): Misty's long storm line plus a nudge, as the user saw them on Home. Runs in
   tools/community-settings/probe.cjs --script. Only screenshots and sizes, no pass/fail. */
const theme = async m => { await page.evaluate(m => { localStorage.setItem('lowi.theme', m); if (window.LowiR2 && LowiR2.applyTheme) LowiR2.applyTheme(m); else document.documentElement.setAttribute('data-theme', m); }, m); await sleep(500); };
for (const [m, lg] of [['light', 'de'], ['dark', 'de']]) {
    await theme(m); await page.evaluate(l => { try { window.LowiLang.set(l); } catch (e) { } }, lg); await sleep(600);
    await page.evaluate(() => { const h = document.getElementById('spHome'); if (h && !h.querySelector('[data-bt="bar"].back')) { const d = document.createElement('div'); d.setAttribute('data-bt', 'bar'); d.className = 'back'; d.style.display = 'none'; d.id = 'msFakeTrip'; h.appendChild(d); } try { localStorage.removeItem('lowi.mh.nudges'); } catch (e) { } });
    await sleep(6500);
    await page.evaluate(() => { const H = window.LowiMistyHints; window.LowiPraise.say(H.tr('stormFood', document.documentElement.lang)); });
    await sleep(900);
    const r = await page.evaluate(() => { const g = id => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return { on: e.classList.contains('on'), r: [b.left, b.top, b.width, b.height].map(Math.round) }; }; return { vw: innerWidth, praise: g('lpPraise'), nudge: g('mhNudge') }; });
    console.log('[cs] before ' + m + ' ' + lg + ' ' + JSON.stringify(r));
    await shot('before-' + m + '-' + lg);
    await sleep(12000);
}
