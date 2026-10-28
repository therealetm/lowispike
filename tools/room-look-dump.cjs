/* dump: screenshot of the Room + every visible text element in the top half, with its box and computed colour/opacity */
const H = require('./sim/harness.cjs');
const engine = process.argv[2] || 'webkit', out = process.argv[3] || '/tmp/room-look', root = process.argv[4] || require('path').join(__dirname, '..');
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const o = { engine, members: 16, messages: 30, probe: false, lang: 'de', root };
  if (engine === 'webkit') o.device = 'iPhone 13'; else o.viewport = { width: 390, height: 844 };
  const R = await H.open(o), P = R.page;
  await R.goto(); await H.sleep(8000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  await P.evaluate(() => goTab('foryou')); await H.sleep(1500); await P.evaluate(() => { try { LowiRoomsUI.setTab(false); } catch (e) { } }); await H.sleep(4000);
  await P.screenshot({ path: out + '/room.png' });
  const items = await P.evaluate(() => { const r = []; const walk = n => { for (const c of n.children) { const cs = getComputedStyle(c); if (cs.display === 'none' || cs.visibility === 'hidden') continue; const b = c.getBoundingClientRect(); if (b.width < 1 || b.height < 1 || b.bottom < 0 || b.top > 520) { walk(c); continue; }
      const own = [...c.childNodes].filter(x => x.nodeType === 3).map(x => x.textContent.trim()).join(' ').trim(); let op = 1, e = c; while (e && e !== document.body) { op *= +getComputedStyle(e).opacity; e = e.parentElement; }
      if (own) r.push({ tag: c.tagName, id: c.id, cls: String(c.className).slice(0, 60), t: own.slice(0, 80), l: Math.round(b.left), tp: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), color: cs.color, fs: cs.fontSize, op: +op.toFixed(2) }); walk(c); } }; walk(document.body); return r; });
  for (const i of items) console.log(JSON.stringify(i));
  await R.close && R.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
