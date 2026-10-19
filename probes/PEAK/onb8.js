const log = [];
const ev = s => h.page.evaluate(s => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, s);
await ev('#r2ob [data-r2g="m"]'); await L.sleep(500); await ev('#r2ob [data-r2tag="Energy"]'); await L.sleep(500);
for (let i=0;i<4;i++){ const ok = await ev('#r2ob [data-r2o="next"], #r2ob [data-r2o="finish"], #r2ob [data-r2o="shoplater"]'); log.push(ok); await L.sleep(2500); if(!ok) break; }
await L.sleep(6000);
const snap = await h.page.evaluate(() => { const s = (window.LowiR2 && LowiR2.S && LowiR2.S()) || {}; return { setupDone: s.setupDone, en: LowiSun.energyNow().value, tier: LowiSun.energyNow().tier, misty: (document.getElementById('spHome')||{}).dataset.misty, ob: !!document.getElementById('r2ob'), txt: document.body.innerText.slice(0, 900) }; });
await h.page.screenshot({ path: '/home/sprite/PEAK/home-before.png' });
return { log, snap };
