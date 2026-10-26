/* FAKE demo account for the Connie promo (no real person, no real posts, no production writes: harness cloud is simulated). */
const H = require('/home/sprite/wt-promo4/tools/sim/harness.cjs');
const OUT = '/home/sprite/PROMO4/screens/';
require('fs').mkdirSync(OUT, { recursive: true });
const SEED = () => { try {
  if (sessionStorage.getItem('p4.seeded')) return; sessionStorage.setItem('p4.seeded', '1');
  const pad = n => String(n).padStart(2, '0');
  const day = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const now = Date.now(), d0 = new Date(now); d0.setHours(0, 0, 0, 0); const at = h => d0.getTime() + h * 3600e3, k = day(now);
  const m1 = at(8.2), m2 = at(13.1), m3 = at(19.6);
  localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Connie', bday: '1993-06-14' }, xp: 2400, settings: { lang: 'en' },
    ledger: [{ eventId: 'herb-first:planted', ts: now - 20 * 86400e3, src: 'herb-first', xp: 0 },
      { day: k, ts: at(8.3), amt: 5, src: 'meal', label: 'Meal', eventId: 'x1' }, { day: k, ts: at(13.2), amt: 5, src: 'meal', label: 'Meal', eventId: 'x2' }, { day: k, ts: at(19.7), amt: 5, src: 'meal', label: 'Meal', eventId: 'x3' },
      { day: k, ts: at(10), amt: 2, src: 'water', label: 'Glass of water', eventId: 'w1' }, { day: k, ts: at(12), amt: 2, src: 'water', label: 'Glass of water', eventId: 'w2' }, { day: k, ts: at(15), amt: 2, src: 'water', label: 'Glass of water', eventId: 'w3' }, { day: k, ts: at(18), amt: 2, src: 'water', label: 'Glass of water', eventId: 'w4' },
      { day: k, ts: at(20.2), amt: 8, src: 'move:mirror', label: 'Mirror mode', eventId: 'mv1' }],
    logs: [
      { id: 'meal:p4-1', eventId: 'meal:p4-1', ts: m1, day: day(m1), t: 'Greek yogurt with berries', lvl: 'low', r: 'ja', e: '🥣', slot: 'breakfast' },
      { id: 'meal:p4-2', eventId: 'meal:p4-2', ts: m2, day: day(m2), t: 'Chicken salad with avocado', lvl: 'low', r: 'ja', e: '🥗', slot: 'lunch' },
      { id: 'meal:p4-3', eventId: 'meal:p4-3', ts: m3, day: day(m3), t: 'Spinach omelette with peppers', lvl: 'low', r: 'ja', e: '🍳', slot: 'dinner' }], saved: [] }));
  localStorage.setItem('lowispike.companion.v1', JSON.stringify({ v: 1, bday: '1993-06-14', btime: '08:30', n: 0, name: 'Nova', created: 1 }));
  const wt = {}; wt[k] = 6; localStorage.setItem('lowi_fast_v1', JSON.stringify({ last: m3, water: wt }));
  localStorage.setItem('lowispike.move.v1', JSON.stringify({ sessions: [{ day: k, moved: 12 * 60, at: at(20.2) }], steps: {} }));
  localStorage.setItem('lowi.daily.seen', k);
  localStorage.setItem('lowispike.companionprefs.v1', JSON.stringify({ share: true, traits: true, born: now - 20 * 86400e3 }));
  localStorage.setItem('lowi.pad.hint', '1'); localStorage.setItem('lowi.wh.hint.v1', '{"travelled":1,"opens":9}'); localStorage.setItem('lowi.hint.holdCommunity', '1'); localStorage.setItem('lowi.hint.communityHold', '1');
  localStorage.setItem('lowispike.tutorial-auto.v1', JSON.stringify({ s: 'done' })); localStorage.setItem('lowi.g1.auto', '1');
  localStorage.setItem('lowi.giftBasket.server.v1', JSON.stringify({ ok: true, at: Date.now() }));
} catch (e) { } };
const FAKEGB = () => { const t = setInterval(() => { if (window.LowiGiftBasket) { clearInterval(t);
  const ago = h => new Date(Date.now() - h * 3600e3).toISOString();
  const rows = [
    { id: 'p4-a', user_id: 'u-walter', first_name: 'Walter', anon: false, city: 'Flensburg', items: [{ n: 'Eggs', q: 1 }, { n: 'Plain yoghurt', q: 2 }, { n: 'Broccoli', q: 1 }, { n: 'Tomatoes', q: 1 }, { n: 'Frozen berries', q: 1 }], total_eur: 14.6, pay_url: 'https://ko-fi.com/example', created_at: ago(2) },
    { id: 'p4-b', user_id: 'u-sam', first_name: 'Sam', anon: false, city: '', items: [{ n: 'Chicken breast', q: 1 }, { n: 'Spinach', q: 1 }, { n: 'Cucumber', q: 2 }, { n: 'Almonds', q: 1 }], total_eur: 18.2, pay_url: 'https://ko-fi.com/example2', created_at: ago(5) },
    { id: 'p4-c', user_id: 'u-anon', first_name: '', anon: true, city: 'Kiel', items: [{ n: 'Tuna', q: 3 }, { n: 'Bell pepper', q: 2 }, { n: 'Olive oil', q: 1 }], total_eur: 12.9, pay_url: 'https://ko-fi.com/example3', created_at: ago(9) }];
  window.LowiGiftBasket._api = { uid: () => 'me', ready: async () => true, open: async () => rows, mine: async () => [], given: async () => [], trust: async () => [] }; } }, 50); };
(async () => {
  const which = process.argv[2] || 'all';
  const R = await H.open({ engine: 'webkit', device: 'iPhone 13', root: '/home/sprite/wt-promo4', lang: 'en', name: 'Connie', members: 4, messages: 4, probe: false });
  const P = R.page;
  await R.ctx.addInitScript(SEED); await R.ctx.addInitScript(FAKEGB);
  await R.goto(); await H.sleep(9000);
  const shot = async n => { await P.screenshot({ path: OUT + n + '.png' }); console.log('shot', n); };
  const ev = async (f, a) => { try { return await P.evaluate(f, a); } catch (e) { console.log('ERR', e.message.slice(0, 200)); } };
  await shot('home');
  if (which === 'all' || which === 'recap') {
    console.log(await ev(() => { if (!window.LowiDayRecap) return 'no recap'; window.LowiDayRecap.open(); return 'ok'; }));
    for (let i = 0; i < 6; i++) { await H.sleep(700); await shot('recap' + i); }
    await ev(() => window.LowiDayRecap.close()); await H.sleep(1500);
  }
  if (which === 'all' || which === 'gift') {
    console.log(await ev(() => { window.LowiGiftBasket.open('shop', 'give'); return 'ok'; }));
    for (let i = 0; i < 4; i++) { await H.sleep(900); await shot('gift' + i); }
    await ev(() => window.LowiGiftBasket.close()); await H.sleep(1500);
  }
  if (which === 'all' || which === 'mirror') {
    console.log(await ev(() => { window.LowiMirror.open(); return 'ok'; }));
    for (let i = 0; i < 3; i++) { await H.sleep(900); await shot('mirror' + i); }
  }
  const errs = R.errs.filter(e => !/supabase|realtime|websocket/i.test(e.m)); console.log('errs', JSON.stringify(errs.slice(0, 3)).slice(0, 400));
  await R.close(); process.exit(0);
})();
