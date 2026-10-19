await h.page.evaluate(() => { window.LowiMistyHub.open(); }); await L.sleep(2500);
const r = await h.page.evaluate(() => { const t = document.body.innerText; const i = t.indexOf('welcome energy'); return { found: i >= 0, around: i >= 0 ? t.slice(Math.max(0, i - 160), i + 160) : t.slice(0, 300), pct: (t.match(/\d+\s?%/g)||[]).slice(0,5) }; });
await h.page.screenshot({ path: '/home/sprite/PEAK/hub-new.png' });
return r;
