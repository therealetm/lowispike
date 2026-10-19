const C = async s => { await h.page.click(s, { timeout: 8000 }); };
const st = async f => { await f(); await L.sleep(1500); };
await h.page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
await h.page.reload({ waitUntil: 'load' }); await L.sleep(6000);
const log = [];
try { await st(() => C('text=Say hi')); await st(() => C('text=Got it')); await st(() => C('text=Next')); await h.page.fill('#hsYou', 'Ana'); await st(() => C('text=Nice to meet you')); log.push('herb ok'); } catch (e) { log.push('herb ERR ' + e.message.slice(0, 200)); }
const snap = await h.page.evaluate(() => { const s = (window.LowiR2 && LowiR2.S && LowiR2.S()) || {}; return { ledger: (s.ledger || []).map(x => [x.eventId || x.src || x.label, x.ts || x.t]), keys: Object.keys(localStorage), txt: document.body.innerText.slice(0, 400) }; });
return { log, snap };
