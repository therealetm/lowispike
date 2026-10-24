/* Test accounts made by our live check scripts (Oct 23, 2026). Emmanuel: Lena, Jonas and "Mia Test ####" must never show
   up for real people (Ranking, Community lists, friend lists), marked reliably, not by name. Every check script calls
   markTest(page) right after its anonymous account signs in: lowi_test:true goes into the account's auth metadata, a
   trigger copies it to profiles.test (supabase/proposals/bot_flag_20261023.sql) and the app hides that account from
   everyone but other test accounts (bot-accounts.js). cleanup(page) at the end removes the test profile row where the
   database allows it; the marker stays on the account either way. */
'use strict';
async function markTest(page) {
  return page.evaluate(async () => {
    try { const c = await LOWI_CLOUD_X.client(); const r = await c.auth.updateUser({ data: { lowi_test: true } }); return r && r.error ? 'err:' + r.error.message : 'ok'; }
    catch (e) { return 'err:' + (e && e.message || e); }
  });
}
async function cleanup(page) {
  return page.evaluate(async () => {
    try { const c = await LOWI_CLOUD_X.client(); const uid = LOWI_CLOUD_X.state().uid; if (!uid) return 'no uid';
      const r = await c.from('profiles').delete().eq('id', uid); return r && r.error ? 'err:' + r.error.message : 'ok'; }
    catch (e) { return 'err:' + (e && e.message || e); }
  }).catch(e => 'err:' + (e && e.message || e));
}
module.exports = { markTest, cleanup };
