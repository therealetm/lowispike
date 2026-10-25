'use strict';
/* Oct 25, 2026 (For You fix release): READ-ONLY look at the real posts table for one account, as a marked test account
   (tools/test-account.cjs), so no real person sees it and its profile row is removed at the end. It reads only.
   Usage: OWNER=<user uuid> IDS=id1,id2 node tools/foryou-fix/server-check.cjs */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const TA = require('../test-account.cjs');
const URL = process.env.URL || 'https://therealetm.github.io/lowispike/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { try { if (sessionStorage.getItem('sc')) return; sessionStorage.setItem('sc', '1'); localStorage.setItem('lowi.gate', 'done');
    localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true, v: 99 }));
    localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 0, ledger: [], logs: [], saved: [], lang: 'en', user: { name: 'Server Check Test', bday: '1990-01-01', tags: [] } })); } catch (e) { } });
  const page = await ctx.newPage();
  await page.goto(URL + '?sc=' + Date.now(), { waitUntil: 'load', timeout: 90000 });
  let uid = ''; for (let i = 0; i < 120 && !uid; i++) { uid = await page.evaluate(() => { try { return LOWI_CLOUD_X.state().uid || ''; } catch (e) { return ''; } }); if (!uid) await sleep(500); }
  if (!uid) { console.log('no cloud sign-in'); await browser.close(); process.exit(2); }
  console.log('mark test:', await TA.markTest(page));
  const res = await page.evaluate(async ([owner, ids]) => {
    const c = await LOWI_CLOUD_X.client();
    const all = await c.from('posts').select('id,created_at,plat,cap,url,who').eq('user_id', owner).order('created_at', { ascending: false });
    const want = await c.from('posts').select('id,created_at,plat,cap,url,user_id').in('id', ids);
    return { err: (all.error && all.error.message) || (want.error && want.error.message) || '', count: (all.data || []).length, latest: (all.data || []).slice(0, 4), want: want.data || [] };
  }, [process.env.OWNER, (process.env.IDS || '').split(',')]);
  console.log(JSON.stringify(res));
  console.log('cleanup:', await TA.cleanup(page));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
