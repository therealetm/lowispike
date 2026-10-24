#!/usr/bin/env node
/* 24 Oct 2026 (chat redesign): does the live server accept the standard reactions (👍 ❤️ 😂 😮 😢 🙏) and reactions on a
   Circle message? One anonymous test account (marked lowi_test, hidden from real people) in Chromium on the live site:
   makes a test circle, writes one message in it, adds and removes each reaction, then deletes the circle and the test
   profile. Nothing touches the community room or a real person's message.
   node tools/chat-switch/live-react-check.cjs [url] */
'use strict';
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const TA = require('../user-rooms/test-account.cjs');
const url = process.argv[2] || 'https://therealetm.github.io/lowispike/';
const seed = ({ name }) => { try {
  localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowispike.lang', 'en'); localStorage.setItem('lowi.lang', 'en'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 0, ledger: [], logs: [], saved: [], lang: 'en', user: { name, bday: '1990-01-01', tags: [] } }));
} catch (e) { } };
(async () => {
  const br = await pw.chromium.launch(), ctx = await br.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(seed, { name: 'Mia Test ' + String(Date.now()).slice(-4) });
  const page = await ctx.newPage();
  await page.goto(url + '?rx=' + Date.now(), { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.LOWI_CLOUD_X && window.LowiUserRooms, null, { timeout: 120000 });
  let uid = ''; for (let i = 0; i < 80 && !uid; i++) { uid = await page.evaluate(() => { try { return LOWI_CLOUD_X.state().uid || ''; } catch (e) { return ''; } }); if (!uid) await page.waitForTimeout(500); }
  const out = { uid: !!uid, marked: await TA.markTest(page) };
  Object.assign(out, await page.evaluate(async () => {
    const c = await LOWI_CLOUD_X.client(), me = LOWI_CLOUD_X.state().uid, r = {};
    const room = await c.from('user_rooms').insert({ owner_id: me, owner_name: 'Mia Test', name: 'rx test ' + Date.now().toString(36), topic: '', icon: '🌙' }).select('id').single();
    if (room.error) return { room: 'err:' + room.error.message };
    const rid = room.data.id; r.room = 'ok';
    const mid = 'u' + Date.now().toString(36) + 'rx';
    const m = await c.from('messages').insert({ id: mid, user_id: me, room: 'u:' + rid, who: 'Mia Test', body: 'reaction check' });
    r.msg = m.error ? 'err:' + m.error.message : 'ok';
    if (!m.error) for (const em of ['👍', '❤️', '😂', '😮', '😢', '🙏']) {
      const a = await c.from('reactions').insert({ message_id: mid, user_id: me, who: 'Mia Test', emoji: em });
      const b = await c.from('reactions').select('emoji').eq('message_id', mid).eq('emoji', em);
      const d = await c.from('reactions').delete().match({ message_id: mid, user_id: me, emoji: em });
      r[em] = (a.error ? 'insert err:' + a.error.code + ' ' + a.error.message : 'insert ok') + ' / read ' + (b.data ? b.data.length : 'err') + ' / delete ' + (d.error ? 'err' : 'ok');
    }
    if (!m.error) { const md = await c.from('messages').delete().eq('id', mid); r.msgDeleted = md.error ? 'err:' + md.error.message : 'ok'; }
    const del = await c.from('user_rooms').delete().eq('id', rid).eq('owner_id', me); r.roomDeleted = del.error ? 'err:' + del.error.message : 'ok';
    return r;
  }));
  out.cleanup = await TA.cleanup(page);
  console.log(JSON.stringify(out, null, 1));
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
