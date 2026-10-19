const st = async f => { await f(); await L.sleep(1500); };
const log = [];
try { await st(() => h.page.click('.r2-start.hs button:has-text("Next")')); await h.page.fill('#hsYou', 'Ana'); await st(() => h.page.click('text=Nice to meet you')); log.push('herb ok'); } catch (e) { log.push('herb ERR ' + e.message.slice(0, 300)); }
const snap = await h.page.evaluate(() => { const s = (window.LowiR2 && LowiR2.S && LowiR2.S()) || {}; return { ledger: (s.ledger || []).map(x => JSON.stringify(x).slice(0,200)), txt: document.body.innerText.slice(0, 500), en: window.LowiSun && LowiSun.energyNow && LowiSun.energyNow() }; });
return { log, snap };
