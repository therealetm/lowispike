const log = [];
for (let i=0;i<8;i++){ const b = await h.page.$('#r2ob button.pri, #r2ob [data-r2o="initial"], #r2ob [data-r2o="shoplater"], #r2ob [data-lc="go"], .lc-go'); if(!b){ const any = await h.page.$('text=Continue'); if(any){ await any.click(); log.push('continue'); await L.sleep(2000); continue;} break;} const a = (await b.getAttribute('data-r2o')) || (await b.innerText()); log.push('click '+a); await b.click(); await L.sleep(2200); }
await L.sleep(4000);
const snap = await h.page.evaluate(() => { const s = (window.LowiR2 && LowiR2.S && LowiR2.S()) || {}; return { setupDone: s.setupDone, en: LowiSun.energyNow(), misty: (document.getElementById('spHome')||{}).dataset.misty, ob: !!document.getElementById('r2ob'), txt: document.body.innerText.slice(0, 600), comp: localStorage.getItem('lowispike.companion.v1') }; });
return { log, snap };
