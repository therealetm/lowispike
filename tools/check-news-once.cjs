'use strict';
/* What's New must show ONCE per build (g1 card or, since 233642, the tutorial mini tour #ltTour) (Oct 23 hotfix, Eman: "New in this update keeps appearing, I click Show me, Got it, it appears again").
   A returning user (tour done, an older news id seen) opens the app on a build with unseen news:
   A) one announcement appears; "Got it" closes it; it never comes back (watch 20 s, then reload 3x).
   B) fresh state again: "Show me" runs the mini tour to the end (Next ... Done); nothing reopens afterwards, also after 3 reloads.
   C) never two "New in this update" cards in a row.
   node tools/check-news-once.cjs [device] [url] [lang]   device: 'iPhone 13' | 'iPad Pro 11'. Exit 1 on failure. */
const H = require('./sim/harness.cjs');
const A = process.argv.slice(2), device = A[0] || 'iPhone 13', url = A[1] || 'https://therealetm.github.io/lowispike/index.html', lang = A[2] || 'de';
const look = P => P.evaluate(() => {
  const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.height > 10 && c.visibility !== 'hidden' && c.display !== 'none' && +c.opacity > .1; };
  const ob = document.getElementById('g1Ob'), tr = document.getElementById('g1Tour'), g = window.LowiG1, ltm = window.LowiTutorial && LowiTutorial.mode ? LowiTutorial.mode() : '', lt = ltm ? document.getElementById('ltTour') : null;
  const card = vis(ob) ? ob : (vis(tr) ? tr.querySelector('.g1-card') : (vis(lt) ? lt : null));
  const btns = card ? [...card.querySelectorAll('button')].filter(vis).map(b => ({ t: b.textContent.trim().slice(0, 30), k: b.getAttribute('data-ob') || b.getAttribute('data-g1') || b.getAttribute('data-lt') })) : [];
  return { state: g && g.state(), news: g && g.news && g.news.id, ob: vis(ob), tour: vis(tr) || vis(lt), lt: ltm, text: card ? card.innerText.replace(/\s+/g, ' ').slice(0, 90) : null, btns };
});
const click = (P, keys) => P.evaluate(ks => { const vis = e => e && e.getBoundingClientRect().height > 4;
  for (const k of ks) { const b = [...document.querySelectorAll('#g1Ob [data-ob="' + k + '"], #g1Tour [data-g1="' + k + '"], #ltTour [data-lt="' + k + '"]')].find(vis); if (b) { b.click(); return k; } } return ''; }, keys);
(async () => {
  const R = await H.open({ device, engine: process.env.ENGINE || 'chromium', url, probe: false, lang, members: 5, messages: 5 });
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowi.g1.auto', '1'); localStorage.setItem('lowispike.lang', l);
    if (sessionStorage.getItem('np') !== localStorage.getItem('np.round')) { sessionStorage.setItem('np', localStorage.getItem('np.round') || '');
      localStorage.setItem('lowi.news.seen', JSON.stringify(['older-news-1', 'older-news-2'])); localStorage.removeItem('lowi.g1.bn'); localStorage.removeItem('lowi.news.toured'); localStorage.removeItem('lowi.news.build'); localStorage.removeItem('lowispike.news.seenbuild'); ['lowi.news.tourseen', 'lowi.news.tourbuild', 'lowispike.news.tourbuild'].forEach(k => localStorage.removeItem(k)); localStorage.setItem('lowi.g1', JSON.stringify({ t: 'done', n: 'older-news-2' })); } } catch (e) { } }, lang);
  if (process.env.STEPS) await R.ctx.route('**/version.json*', async route => { /* STEPS=1|3: the live news with 1 or 3 steps, to walk the Show me tour too */
    const r = await route.fetch(); let j; try { j = JSON.parse(await r.text()); } catch (e) { return route.fulfill({ response: r }); } if (!j || !j.news) return route.fulfill({ response: r, json: j }); const t = j.news && j.news.text; const n = +process.env.STEPS;
    if (j.news) j.news.steps = [{ tab: 'home', text: t }, { tab: 'move', text: { en: 'Move', de: 'Move', es: 'Move' } }, { tab: 'eat', text: { en: 'Eat', de: 'Essen', es: 'Comer' } }].slice(0, n);
    await route.fulfill({ response: r, json: j }); });
  const P = R.page, res = { device, url, lang }, fails = [];
  const waitCard = async (n) => { for (let i = 0; i < n; i++) { await H.sleep(1000); const s = await look(P); if (s.ob || s.tour) return s; } return look(P); };
  const watch = async (secs, tag) => { const seen = []; for (let i = 0; i < secs; i++) { await H.sleep(1000); const s = await look(P); if (s.ob || s.tour) seen.push(s.text); } if (seen.length) fails.push(tag + ': reappeared: ' + seen[0]); return seen.length; };
  const round = async (tag, path) => {
    await P.evaluate(t => { localStorage.setItem('np.round', t); }, tag); await P.reload({ waitUntil: 'load' });
    const first = await waitCard(25); res[tag + '_first'] = first;
    if (!first.ob && !first.tour) { fails.push(tag + ': no announcement at all'); return; }
    let cards = 1, steps = [];
    if (path === 'gotit') { const k = await click(P, ['later', 'done', 'skipall', 'skip', 'next']); steps.push(k || 'NOTHING CLICKED'); await H.sleep(1500); }
    else {
      const k = first.lt ? 'tutorial-card' : await click(P, ['showme']); steps.push(k || 'NO SHOWME'); if (!k) fails.push(tag + ': no Show me button');
      for (let i = 0; i < 12; i++) { await H.sleep(1400); const s = await look(P); if (!s.ob && !s.tour && !s.lt) break; if (!s.ob && !s.tour) continue; /* tutorial between two steps (tab switch) */
        if (s.ob && /Neu in diesem|New in this|Nuevo en esta/.test(s.text || '') && !(s.state && s.state.kind === 'news')) { cards++; }
        const kk = await click(P, ['next', 'done', 'later']); if (s.lt) steps.push((s.text || '').slice(0, 40)); steps.push(kk); if (!kk) break; }
    }
    res[tag + '_steps'] = steps; if (cards > 1) fails.push(tag + ': ' + cards + ' announcement cards in a row');
    res[tag + '_after'] = await look(P);
    if (res[tag + '_after'].ob || res[tag + '_after'].tour) fails.push(tag + ': still open after closing');
    await watch(20, tag + ' (20 s)');
    for (let r = 1; r <= 3; r++) { await P.reload({ waitUntil: 'load' }); await watch(10, tag + ' (reload ' + r + ')'); }
  };
  await R.goto();
  await round('gotit', 'gotit');
  await round('showme', 'showme');
  res.errs = R.errs.filter(e => !/access control|Failed to load resource/.test(e.m)).slice(0, 5);
  res.fails = fails;
  console.log(JSON.stringify(res, null, 1));
  console.log(fails.length ? 'FAIL' : 'PASS');
  try { await R.shot('/tmp/news-once-' + device.replace(/\W/g, '') + '.png'); } catch (e) { }
  await R.close(); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.log('TOOL ERROR', e && e.stack); process.exit(1); });
