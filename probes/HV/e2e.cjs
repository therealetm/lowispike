/* End-to-end in the real app (local build, network blocked): mocked room messages, real community-chat.js + home-visit.js */
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const out = [], ok = (c, m) => { out.push((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const live = arg('url', ''); const srv = live ? { close() { } } : await L.serve(arg('root', '/home/sprite/wt-home-visit')); const url = live || `http://127.0.0.1:${srv.address().port}/index.html`;
  const view = arg('view', 'iphone13'), rm = arg('rm', '0') === '1';
  const h = await L.open({ url, view, settle: 7000, reducedMotion: rm }); const P = h.page;
  const errs = []; P.on('pageerror', e => errs.push(String(e)));
  out.push('INFO build ' + await P.evaluate(() => (document.querySelector('script[src*="home-visit.js"]') || {}).src || 'no home-visit.js'));
  await P.evaluate(() => {
    const now = Date.now();
    window.__MS = [{ id: 'm0', uid: 'me-1', by: 'Emmanuel', t: 'hello room', ts: now - 60000 }, { id: 'm1', uid: 'u-t', by: 'Thiago M.', t: '@Emmanuel old one', ts: now - 50000 }];
    window.__UID = 'me-1';
    const H = window.LowiCommunityHost;
    H.state = () => ({ uid: window.__UID, phase: 'ready', ready: true });
    const idf = H.identity; H.identity = () => Object.assign({}, idf.call(H), { n: 'Emmanuel' });
    H.messages = () => window.__MS.filter(m => window.__UID);
    H.people = () => [{ uid: 'u-t', n: 'Thiago M.', lv: 3 }, { uid: 'u-l', n: 'Luis A.', lv: 2 }, { uid: 'u-p', n: 'Paolo H.', lv: 4 }, { uid: 'u-s', n: 'Sofía', lv: 1 }, { uid: 'me-1', n: 'Emmanuel', lv: 5 }];
    window.__push = (m) => { window.__MS.push(Object.assign({ ts: Date.now() }, m)); document.dispatchEvent(new CustomEvent('lowi:chat', { detail: { type: 'insert', id: m.id } })); };
    window.LowiHomeVisit.scan();
  });
  await L.sleep(800);
  let s = await P.evaluate(() => window.LowiHomeVisit.state());
  ok(s.scope === 'me-1' && !s.current && !s.queue.length, 'boot: scope me-1, old history does not visit ' + JSON.stringify(s));
  ok(await P.evaluate(() => window.LowiHomeVisit.homeFront()), 'Home is in front');
  /* 1. a mention from Thiago */
  await P.evaluate(() => window.__push({ id: 'n1', uid: 'u-t', by: 'Thiago M.', t: '@Emmanuel are you coming to dinner?' }));
  const innerW = await P.evaluate(() => innerWidth);
  await L.sleep(650);
  const mid = await P.evaluate(() => { const f = document.querySelector('#hvLayer .hv-flier'); if (!f) return null; const r = f.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, op: getComputedStyle(f).opacity, flying: document.getElementById('hvLayer').classList.contains('hv-flying') }; });
  if (!rm) ok(mid && mid.flying && mid.w < 60 && mid.x > -20 && mid.x < innerW + 20 && mid.y > -20, 'mid-flight: small, travelling, in view ' + JSON.stringify(mid));
  await L.sleep(1700);
  const land = await P.evaluate(() => { const L = document.getElementById('hvLayer'); if (!L) return null; const f = L.querySelector('.hv-flier').getBoundingClientRect(), c = L.querySelector('.hv-card').getBoundingClientRect();
    const ring = [...document.querySelectorAll('[data-orbit], #whPad, #spBubble')].map(e => e.getBoundingClientRect()).filter(r => r.width > 2);
    const hit = ring.filter(r => !(c.right < r.left || c.left > r.right || c.bottom < r.top || c.top > r.bottom)).length;
    return { mode: L.dataset.mode, here: L.classList.contains('hv-here'), face: !!L.querySelector('.hv-face svg'), name: L.querySelector('.hv-name').textContent, text: L.querySelector('.hv-text').textContent, reply: L.querySelector('.hv-reply').textContent, sr: L.querySelector('.hv-sr').textContent, card: [c.left, c.top, c.right, c.bottom].map(Math.round), orb: [f.left, f.top, f.width].map(Math.round), vw: innerWidth, vh: innerHeight, hit, cardOp: getComputedStyle(L.querySelector('.hv-card')).opacity, toast: !!document.querySelector('#cgToast[data-on]') }; });
  ok(land && land.here && land.face, 'arrived as a hologram with the sender\'s own companion drawing ' + JSON.stringify(land));
  ok(land && land.name === 'Thiago M.' && land.text === 'are you coming to dinner?', 'real name and message (leading @you stripped)');
  ok(land && land.card[0] >= 0 && land.card[2] <= land.vw && land.card[3] <= land.vh, 'card on screen');
  ok(land && land.hit === 0, 'card does not cover the Home ring (mode ' + (land && land.mode) + ')');
  ok(land && !land.toast, 'no room toast on top of it');
  const ops = []; for (let i = 0; i < 4; i++) { ops.push(await P.evaluate(() => getComputedStyle(document.querySelector('#hvLayer .hv-card')).opacity)); await L.sleep(150); }
  ok(ops[ops.length - 1] === '1', 'speech bubble fully visible ' + ops.join(','));
  await P.screenshot({ path: `/home/sprite/HV/visit-${view}${rm ? '-rm' : ''}.png` });
  /* 2. queue: two more people while Thiago is here + Thiago again (updates in place) */
  await P.evaluate(() => { window.__push({ id: 'n2', uid: 'u-l', by: 'Luis A.', t: '@Emmanuel bro check my lunch' }); window.__push({ id: 'n3', uid: 'u-p', by: 'Paolo H.', t: 'replying to you', re: 'm0' }); window.__push({ id: 'n4', uid: 'u-t', by: 'Thiago M.', t: '@Emmanuel 8pm ok?' }); window.__push({ id: 'n5', uid: 'u-s', by: 'Sofía', t: '@Luis not for Emmanuel' }); });
  await L.sleep(700);
  s = await P.evaluate(() => ({ st: window.LowiHomeVisit.state(), text: document.querySelector('#hvLayer .hv-text')?.textContent, more: document.querySelector('#hvLayer .hv-more')?.textContent, layers: document.querySelectorAll('.hv-layer').length }));
  ok(s.layers === 1 && s.text === '8pm ok?' && s.st.current.ids.length === 2, 'Thiago again: same visit, new words, one layer ' + JSON.stringify(s));
  ok(s.st.queue.map(q => q.uid).join() === 'u-l,u-p', 'Luis (mention) and Paolo (reply) wait their turn; Sofía to Luis does not come ' + JSON.stringify(s.st.queue));
  /* 3. close with x -> Luis flies in next */
  await P.click('#hvLayer .hv-x');
  await L.sleep(rm ? 1300 : 3200);
  s = await P.evaluate(() => ({ st: window.LowiHomeVisit.state(), name: document.querySelector('#hvLayer .hv-name')?.textContent, layers: document.querySelectorAll('.hv-layer').length }));
  ok(s.name === 'Luis A.' && s.layers === 1, 'after closing, the next visitor comes ' + JSON.stringify(s));
  /* 4. a sheet opens mid-visit (Settings) -> visit leaves; nothing stacked */
  const opened = await P.evaluate(() => { const b = document.querySelector('[data-orbit="settings"]') || document.querySelector('[data-orbit]'); if (b) b.click(); return b ? b.dataset.orbit : null; });
  await L.sleep(1500);
  s = await P.evaluate(() => ({ st: window.LowiHomeVisit.state(), front: window.LowiHomeVisit.homeFront(), layers: document.querySelectorAll('.hv-layer').length }));
  ok(!s.front && s.layers === 0, `opening ${opened}: the visitor steps away ` + JSON.stringify(s));
  await P.keyboard.press('Escape'); await L.sleep(400);
  await P.evaluate(() => { const x = document.querySelector('.sheet.on .sheet-x, [aria-modal="true"] [data-close], .ss2-close, [data-act="close"]'); if (x) x.click(); if (typeof closeSheet === 'function') try { closeSheet(); } catch (e) { } });
  await L.sleep(2600);
  s = await P.evaluate(() => ({ st: window.LowiHomeVisit.state(), front: window.LowiHomeVisit.homeFront(), name: document.querySelector('#hvLayer .hv-name')?.textContent }));
  out.push('INFO after closing the sheet: ' + JSON.stringify(s));
  /* 5. tap the bubble -> Community opens on that message */
  for (let i = 0; i < 10 && !(await P.$('#hvLayer .hv-card.on')); i++) await L.sleep(500);
  const who = await P.evaluate(() => document.querySelector('#hvLayer .hv-name')?.textContent);
  if (await P.$('#hvLayer .hv-card.on')) {
    await P.click('#hvLayer .hv-open'); await L.sleep(1500);
    s = await P.evaluate(() => ({ tab: document.querySelector('#tab-foryou')?.classList.contains('active'), layers: document.querySelectorAll('.hv-layer').length, st: window.LowiHomeVisit.state(), thread: !!document.querySelector('#cgThread[data-open]'), focus: document.querySelector('#cgThread [data-id].cg-focus, #cgThread .cg-focus, #cgThread [data-focus]')?.textContent?.slice(0,80), to: (document.querySelector('#cgTo, .cg-to, .cg-tochip, [data-act="to-clear"]')||{}).textContent }));
    ok(s.tab && s.layers === 0, `tapping ${who}'s bubble opens Community ` + JSON.stringify(s));
    ok(!s.st.queue.length, 'Community open: the rest is waiting there, not queued for Home');
  } else ok(false, 'no visitor to tap');
  /* 6. back to Home: a message while on Community does not fly in later; toast/room takes it */
  await P.evaluate(() => window.__push({ id: 'n6', uid: 'u-l', by: 'Luis A.', t: '@Emmanuel while you are in Community' }));
  await L.sleep(800);
  await P.evaluate(() => { if (typeof goTab === 'function') goTab('home'); });
  await L.sleep(2500);
  s = await P.evaluate(() => ({ st: window.LowiHomeVisit.state(), layers: document.querySelectorAll('.hv-layer').length }));
  ok(s.layers === 0 && !s.st.queue.length, 'a message read in Community does not visit Home later ' + JSON.stringify(s));
  /* 7. reload-like: a fresh tracker sees the visited ids in localStorage */
  const mem = await P.evaluate(() => JSON.parse(localStorage.getItem('lowispike.homeVisit.v1') || '{}'));
  ok(Array.isArray(mem['me-1']) && mem['me-1'].includes('n1') && mem['me-1'].includes('n2'), 'shown visits remembered per account ' + JSON.stringify(mem));
  /* 8. account switch while a visit shows */
  await P.evaluate(() => window.__push({ id: 'n7', uid: 'u-p', by: 'Paolo H.', t: '@Emmanuel one more' }));
  await L.sleep(900);
  const had = await P.evaluate(() => document.querySelectorAll('.hv-layer').length);
  await P.evaluate(() => { window.__UID = 'other-2'; document.dispatchEvent(new CustomEvent('lowi:chat', { detail: { type: 'ready' } })); });
  await L.sleep(800);
  s = await P.evaluate(() => ({ st: window.LowiHomeVisit.state(), layers: document.querySelectorAll('.hv-layer').length }));
  ok(had === 1 && s.layers === 0 && s.st.scope === 'other-2' && !s.st.queue.length, 'switching account removes the other account\'s visitor at once ' + JSON.stringify(s));
  /* 9. idle cleanup */
  await L.sleep(1500);
  s = await P.evaluate(() => ({ st: window.LowiHomeVisit.state(), anims: document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.hv-layer')).length }));
  ok(!s.st.timer && s.anims === 0, 'idle: no timer, no animations left ' + JSON.stringify(s));
  ok(!errs.length, 'no page errors ' + errs.join(' | ').slice(0, 300));
  console.log(view + (rm ? ' reduced-motion' : '') + '\n' + out.join('\n'));
  await h.browser.close(); srv.close();
})().catch(e => { console.log('CRASH', e); process.exit(1); });
