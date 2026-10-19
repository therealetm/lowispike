await h.page.reload({ waitUntil: 'load' }); await L.sleep(9000);
await h.page.evaluate(() => { const e = document.getElementById('spHome'); e && e.click(); }); await L.sleep(2500);
return await h.page.evaluate(() => { const t = document.body.innerText; const i = t.indexOf('welcome energy'); return { found: i >= 0, around: i >= 0 ? t.slice(Math.max(0, i - 120), i + 160) : t.slice(0, 300) }; });
