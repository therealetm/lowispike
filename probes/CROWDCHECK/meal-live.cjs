'use strict';
// Live check: one crowd member logs one meal into its own user_state row, then we read it back. No secrets printed.
process.env.CROWD_STATE = '/tmp/crowd-meal-check-state.json';
const C = require('/home/sprite/wt-crowd-meals/tools/community-crowd/crowd.cjs');
const T = C._t;
(async () => {
  const now = Date.now(), st = T.load();
  const p = C.people().slice(0, 30).find(x => T.slotAt(x, now));
  if (!p) { console.log('no member in a meal window right now'); return; }
  console.log('member', p.i, p.name, p.tz, 'local slot', T.slotAt(p, now), 'local day', T.dayIn(p.tz, now));
  const log = await T.logMealFor(st, p, now);
  console.log('logged:', log ? JSON.stringify(log) : 'skipped (slot already logged today)');
  const tok = await T.session(st, p);
  const r = await fetch('https://vnfwmifmsfecascwaody.supabase.co/rest/v1/user_state?select=updated_at,data&id=eq.' + st.bots[p.i].id, { headers: { apikey: 'sb_publishable_iVA3wCYxzfWu2q8SSgieWw_adXbx4Qd', Authorization: 'Bearer ' + tok } });
  const rows = await r.json();
  const s = JSON.parse((rows[0] && rows[0].data && rows[0].data['lowispike.v2']) || '{}');
  console.log('read back: HTTP', r.status, '| updated_at', rows[0] && rows[0].updated_at, '| logs in row:', (s.logs || []).length, '| last:', JSON.stringify((s.logs || []).slice(-1)[0]));
  const again = await T.logMealFor(st, p, now + 1000);
  console.log('second try same slot:', again ? 'LOGGED TWICE (bug)' : 'skipped, as it should');
  console.log('stats', JSON.stringify(T.stats));
})().catch(e => { console.log('FAILED:', e.message); process.exit(1); });
