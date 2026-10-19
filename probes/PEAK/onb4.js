const st = async f => { await f(); await L.sleep(1800); };
const log = [];
try {
 await h.page.fill('#r2obB', '1997-10-12'); await h.page.dispatchEvent('#r2obB','input'); await L.sleep(1200);
 await st(() => h.page.click('#r2ob [data-r2o="next"]'));
 log.push(await h.page.evaluate(()=>document.getElementById('r2ob').innerText.slice(0,200)));
 for (let i=0;i<6;i++){ const b = await h.page.$('#r2ob [data-r2o="next"], #r2ob [data-r2o="initial"], #r2ob [data-r2o="finish"], #r2ob [data-r2o="shoplater"], #r2ob [data-r2o="go"], #r2ob [data-r2o="keep"]'); if(!b) break; const a = await b.getAttribute('data-r2o'); log.push('click '+a); await b.click(); await L.sleep(2000); }
} catch (e) { log.push('ERR ' + e.message.slice(0, 300)); }
await L.sleep(4000);
const snap = await h.page.evaluate(() => { const s = (window.LowiR2 && LowiR2.S && LowiR2.S()) || {}; return { setupDone: s.setupDone, ledger: (s.ledger || []).map(x => x.eventId+'@'+x.ts), en: LowiSun.energyNow(), misty: (document.getElementById('spHome')||{}).dataset, txt: document.body.innerText.slice(0, 900), comp: localStorage.getItem('lowispike.companion.v1') }; });
return { log, snap };
