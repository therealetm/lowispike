/* Real-people check for the Ranking (Week / Month / All time) and the add-friend list (Oct 23, 2026).
   Opens the app at iPhone size 390x844 with the REAL Community data: Supabase reads go through, every write
   (profiles upsert, rpc, storage, a new sign-up) is aborted, so the check leaves nothing behind in the database.
   It signs in with an existing anonymous session (SESSION=/path/to/session.json from /auth/v1/signup) so no new
   account is made, and compares what the screen lists against the server flags (profiles.bot / profiles.test)
   read with the same session.
   Passes when no row is a flagged bot or test account and Emmanuel's names (Emmanuel / Eman / Emmy / Manu)
   show at most once in each list.
   Usage: SESSION=/tmp/hum-anon.json [URL=https://therealetm.github.io/lowispike/ | ROOT=.] [SHOT=/tmp/hum]
          node tools/humans-only/check.cjs */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const SB = 'https://vnfwmifmsfecascwaody.supabase.co', KEY = 'sb_publishable_iVA3wCYxzfWu2q8SSgieWw_adXbx4Qd';
const SESSION = JSON.parse(fs.readFileSync(process.env.SESSION || '/tmp/hum-anon.json', 'utf8'));
const ROOT = process.env.ROOT || path.join(__dirname, '..', '..');
const OWN = /emmanuel|^\s*emmy\b|^\s*eman\b|^\s*manu(?!el)/i;
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' };

async function flags() {
  const r = await fetch(SB + '/rest/v1/profiles?select=id,name,bot,test&limit=5000', { headers: { apikey: KEY, Authorization: 'Bearer ' + SESSION.access_token } });
  const d = await r.json(); if (!Array.isArray(d)) throw new Error('profiles read failed: ' + JSON.stringify(d).slice(0, 200));
  return d;
}

function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
      fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
    srv.listen(0, () => res(srv));
  });
}

(async () => {
  const all = await flags();
  const flagged = new Map(all.filter(p => p.bot || p.test).map(p => [p.id, p]));
  const flaggedNames = new Set(all.filter(p => p.bot).map(p => String(p.name || '').trim()).filter(Boolean));
  const humanNames = new Set(all.filter(p => !p.bot && !p.test).map(p => String(p.name || '').trim()));
  const botOnlyNames = new Set([...flaggedNames].filter(n => !humanNames.has(n)));
  console.log('server: ' + all.length + ' profiles, ' + all.filter(p => p.bot).length + ' bot, ' + all.filter(p => p.test).length + ' test');
  const srv = process.env.URL ? null : await serve();
  const url = process.env.URL || 'http://localhost:' + srv.address().port + '/index.html';
  let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const browser = await pw.chromium.launch(Object.assign({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }, process.env.CHROME ? { executablePath: process.env.CHROME } : {}));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const blocked = [];
  await ctx.route('**/*', r => {
    const q = r.request(), u = q.url(), m = q.method();
    if (/^http:\/\/localhost:/.test(u) || (process.env.URL && u.startsWith(process.env.URL.replace(/\/[^/]*$/, '/')))) return r.continue();
    if (u.startsWith(SB)) {
      if (m === 'OPTIONS') return r.continue();
      if (m === 'GET' && /\/rest\/v1\//.test(u)) return r.continue();
      if (m === 'GET' && /\/auth\/v1\/user/.test(u)) return r.continue();
      blocked.push(m + ' ' + u.replace(SB, '').split('?')[0]); return r.abort();
    }
    return r.abort();
  });
  await ctx.addInitScript(s => { try {
    localStorage.setItem('lowi.auth', s); localStorage.setItem('lowi.gate', 'done');
    const dd = new Date(); localStorage.setItem('lowi.daily.seen', dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
    sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999');
    localStorage.setItem('lowispike.v2', JSON.stringify({ setupDone: true, onboarded: true, xp: 40, ledger: [], user: { name: 'Probe Visitor', bday: '1990-01-01' } }));
  } catch (e) {} }, JSON.stringify(Object.assign({}, SESSION, { expires_at: Math.floor(Date.now() / 1000) + 3000 })));
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'hc=' + Date.now(), { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(12000);
  /* an anonymous visitor gets the sign-in gate on top; the lists are what sits behind it */
  await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
  const st = await page.evaluate(() => ({ live: !!(window.LOWI_CLOUD && LOWI_CLOUD.live && LOWI_CLOUD.live()), people: window.LOWI_CLOUD && LOWI_CLOUD.people ? LOWI_CLOUD.people().length : -1,
    bots: window.LowiBotAccounts ? LowiBotAccounts.size() : -1, build: window.LOWI_BUILD || (document.querySelector('meta[name="lowi-build"]') || {}).content || '' }));
  console.log('app: ' + JSON.stringify(st));
  ok(st.live && st.people > 0, 'live Community data loaded (' + st.people + ' people)');
  ok(st.bots >= flagged.size, 'bot list loaded from the server (' + st.bots + ' of ' + flagged.size + ' flagged)');
  const people = await page.evaluate(() => LOWI_CLOUD.people().map(p => ({ uid: p.uid, n: p.n })));
  const byName = new Map(); people.forEach(p => { const k = String(p.n || '').trim(); if (!byName.has(k)) byName.set(k, []); byName.get(k).push(p.uid); });
  const check = (where, names) => {
    const bad = names.filter(n => botOnlyNames.has(n.trim()));
    const own = names.filter(n => OWN.test(n));
    ok(names.length > 0, where + ': ' + names.length + ' rows: ' + names.join(', '));
    ok(!bad.length, where + ': no bot account names' + (bad.length ? ' (found ' + bad.join(', ') + ')' : ''));
    ok(own.length <= 1, where + ': Emmanuel at most once (' + (own.join(', ') || 'not shown') + ')');
  };
  await page.evaluate(() => { try { window.LowiR3F && LowiR3F.openBoardTab ? LowiR3F.openBoardTab() : LowiRanking.open(); } catch (e) { LowiRanking.open(); } });
  await page.waitForTimeout(2500);
  for (const [k, label] of [['all', 'All time'], ['m', 'Month'], ['w', 'Week']]) {
    await page.evaluate(k => LowiRanking.setPeriod(k), k);
    await page.waitForTimeout(1200);
    const rows = await page.evaluate(() => [...document.querySelectorAll('#cmPaneChat [data-rk="open"]')].filter(e => !e.dataset.me).map(e => ({ n: e.dataset.who || '', uid: e.dataset.uid || '' })));
    const seen = new Set(), uniq = rows.filter(r => { const k = r.uid || r.n; if (seen.has(k)) return false; seen.add(k); return true; });
    const names = uniq.map(r => r.n), flaggedRows = uniq.filter(r => flagged.has(r.uid));
    ok(!flaggedRows.length, 'Ranking ' + label + ': no flagged bot/test account ids' + (flaggedRows.length ? ' (found ' + flaggedRows.map(r => r.n).join(', ') + ')' : ''));
    check('Ranking ' + label, names);
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-rank-' + k + '.png', fullPage: false });
  }
  await page.evaluate(() => { try { window.LowiR2 && LowiR2.closeAll && LowiR2.closeAll(); } catch (e) {} });
  await page.waitForTimeout(500);
  await page.evaluate(() => LowiCellRoom.openTree());
  await page.waitForTimeout(800);
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = document.querySelector('[data-cr="addOpen"].cr-go'); if (b) b.click(); });
  await page.waitForTimeout(800);
  console.log('friends panel: ' + JSON.stringify(await page.evaluate(() => ({ ov: !!document.querySelector('.cr-ov-tree'), add: !!document.querySelector('.cr-add'), sub: [...document.querySelectorAll('.cr-add .cr-sub')].map(e => e.textContent.slice(0, 80)), li: document.querySelectorAll('.cr-ppl li').length, btns: [...document.querySelectorAll('.cr-ov-tree [data-cr]')].map(b => b.dataset.cr + ':' + b.className + ':' + (b.getBoundingClientRect().width|0)).slice(0, 30), top: (() => { const e = document.elementFromPoint(195, 600); return e ? e.className + '/' + (e.closest('[id]') || {}).id : ''; })() }))));
  const frRows = await page.evaluate(() => [...document.querySelectorAll('.cr-ppl li')].map(li => ({ n: (li.querySelector('b') || {}).textContent || '', uid: (li.querySelector('[data-uid]') || { dataset: {} }).dataset.uid || '' })));
  const fr = frRows.map(r => r.n.trim()), frFlag = frRows.filter(r => flagged.has(r.uid));
  ok(!frFlag.length, 'Add friend list: no flagged bot/test account ids' + (frFlag.length ? ' (found ' + frFlag.map(r => r.n).join(', ') + ')' : ''));
  check('Add friend list', fr);
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-friends.png' });
  for (const q of ['eman', 'emmanuel', 'manu']) {
    await page.evaluate(q => { const i = document.querySelector('.cr-q'); if (i) { i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })); } }, q);
    await page.waitForTimeout(600);
    const hits = await page.evaluate(() => [...document.querySelectorAll('.cr-ppl li b')].map(b => b.textContent.trim()));
    ok(hits.filter(n => OWN.test(n)).length <= 1, 'Add friend search "' + q + '": Emmanuel at most once (' + (hits.join(', ') || 'none') + ')');
  }
  ok(!errs.length, 'no page errors ' + errs.join(' / '));
  console.log('writes aborted: ' + (blocked.length ? [...new Set(blocked)].join(', ') : 'none'));
  await browser.close(); if (srv) srv.close();
  console.log(fail ? fail + ' FAILED' : 'all passed'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
