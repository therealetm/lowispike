const log = [];
const click = async s => { const b = await h.page.$(s); if (!b) return false; await b.click(); log.push(s); await L.sleep(2200); return true; };
await click('#r2ob [data-r2o="initial"]');
log.push(await h.page.evaluate(()=>{const e=document.getElementById('r2ob');return e?e.innerText.slice(0,150):'gone'}));
for (let i=0;i<4;i++){ if(!(await click('#r2ob [data-r2o="next"], #r2ob [data-r2o="finish"], #r2ob [data-r2o="shoplater"]'))) break; log.push(await h.page.evaluate(()=>{const e=document.getElementById('r2ob');return e?e.innerText.slice(0,120):'gone'})); }
await L.sleep(5000);
const snap = await h.page.evaluate(() => { const s = (window.LowiR2 && LowiR2.S && LowiR2.S()) || {}; const card = document.querySelector('.ms-card, .ms-row, [class*="ms-"]'); return { setupDone: s.setupDone, en: LowiSun.energyNow().value, tier: LowiSun.energyNow().tier, misty: (document.getElementById('spHome')||{}).dataset.misty, ob: !!document.getElementById('r2ob'), txt: document.body.innerText.slice(0, 700) }; });
await h.page.screenshot({ path: '/home/sprite/PEAK/home-before.png' });
return { log, snap };
