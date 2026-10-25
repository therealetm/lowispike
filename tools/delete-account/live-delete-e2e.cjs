'use strict';
/* Delete my account, end to end on the LIVE build (25 Oct 2026).
   node tools/delete-account/live-delete-e2e.cjs [--url https://therealetm.github.io/lowispike/] [--engine webkit|chromium] [--out DIR]
   Opens the live app in a fresh browser at 390x844 (iPhone 13 size). The app signs in anonymously as it does for everyone, so this
   is a brand-new account that belongs to no real person. It is marked as a test account (user metadata lowi_test, which hides
   it from Community) BEFORE it gets a name, then gets rows: profile, synced state, cycle sync. Then, in the app:
     1. Community hold hub > Delete account in EN, DE and ES: screenshot each dialog, check the title, text and buttons are the
        right language and fit on the screen, then "Keep my account".
     2. The delete call is made to fail once (request blocked): the dialog must say the delFail line, and the rows must all still
        be there (checked by the caller with SQL).
     3. Delete for real: the server says ok and the app clears the phone and reloads.
   Prints one JSON line {uid, build, steps...}. The rows before/after are counted from the VM with
   tools/delete-account/count-rows.sh <uid> (needs the Supabase CLI login), so this script never holds a service key. */
const fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const URL0 = arg('url', 'https://therealetm.github.io/lowispike/'), ENG = arg('engine', 'webkit'), OUT = arg('out', '/tmp/delacct-shots');
const PAUSE = arg('pause-file', '');  /* when set, waits for this file to exist before the real delete (so the caller can count rows) */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const WANT = {
  en: { title: 'Delete your account?', go: 'Delete my account', keep: 'Keep my account', fail: 'Nothing was deleted' },
  de: { title: 'Konto l\u00f6schen?', go: 'Mein Konto l\u00f6schen', keep: 'Konto behalten', fail: 'Es wurde nichts gel\u00f6scht' },
  es: { title: '\u00bfEliminar tu cuenta?', go: 'Eliminar mi cuenta', keep: 'Conservar mi cuenta', fail: 'No se ha borrado nada' }
};
const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  if (!sessionStorage.getItem('qa.init')) {
    sessionStorage.setItem('qa.init', '1');
    localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
    localStorage.setItem('lowi.tutorial.v1', JSON.stringify({ v: 999, at: Date.now(), done: true }));
    localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: '', tags: [] }, xp: 0, ledger: [] }));
  }
} catch (e) { }`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const res = { engine: ENG, steps: [], fails: [] };
  const fail = m => res.fails.push(m);
  const browser = await pw[ENG].launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: ENG !== 'webkit' ? true : true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', serviceWorkers: 'block' });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  let blockDelete = false, deleteCalls = [];
  await ctx.route('**/functions/v1/delete-my-account', async r => {
    const q = r.request(); if (q.method() !== 'POST') return r.continue();
    if (blockDelete) { deleteCalls.push('blocked'); return r.abort('failed'); }
    const resp = await r.fetch(); let j = null; try { j = await resp.json(); } catch (e) { }
    let body = {}; try { body = JSON.parse(q.postData() || '{}'); } catch (e) { }
    deleteCalls.push({ status: resp.status(), body: j, sent: Object.keys(body) });
    return r.fulfill({ response: resp, json: j });
  });
  try {
    await page.goto(URL0 + '?tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => { const X = window.LOWI_CLOUD_X, s = X && X.state && X.state(); return !!(s && s.live && s.uid); }, null, { timeout: 90000 });
    res.build = await page.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || window.LOWI_BUILD || '');
    try { res.build = res.build || (await (await page.request.get(URL0 + 'version.json?tb=' + Date.now())).json()).build; } catch (e) { }
    res.uid = await page.evaluate(() => window.LOWI_CLOUD_X.state().uid);
    /* mark it a test account first, then give it rows */
    const made = await page.evaluate(async () => {
      const c = await window.LOWI_CLOUD_X.client(), uid = window.LOWI_CLOUD_X.state().uid, out = {};
      const u = await c.auth.updateUser({ data: { lowi_test: 'true' } }); out.flag = u.error ? u.error.message : 'ok';
      const p = await c.from('profiles').upsert({ id: uid, name: 'QA delete test', test: true }); out.profile = p.error ? p.error.message : 'ok';
      const s = await c.from('user_state').upsert({ id: uid, data: { qa: 'delete-test' } }); out.state = s.error ? s.error.message : 'ok';
      const y = await c.from('cycle_sync').upsert({ id: uid, data: { qa: 'delete-test' } }); out.cycle = y.error ? y.error.message : 'ok';
      return out;
    });
    res.steps.push({ made });
    console.log('UID ' + res.uid);
    await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiHomeSettingsSleepV2 && window.LowiCommunityMe, null, { timeout: 90000 });
    await sleep(3000);
    /* the hub sheet scrolls inside itself and animates in, so rows are scrolled into view and tapped like a finger would */
    const tap = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; e.scrollIntoView({ block: 'center' }); e.click(); return true; }, sel);
    const openHub = async () => {
      await page.evaluate(() => { if (!window.LowiCommunityMe.isOpen()) window.LowiHomeSettingsSleepV2.openSettings(); });
      await page.waitForSelector('#cmeSheet', { state: 'attached', timeout: 15000 }); await sleep(700);
    };
    const openAsk = async () => {
      await openHub();
      await page.waitForSelector('[data-cme="deleteAccount"]', { state: 'attached', timeout: 15000 });
      await tap('[data-cme="deleteAccount"]');
      await page.waitForSelector('[data-cme="delGo"]', { state: 'attached', timeout: 10000 });
      await page.evaluate(() => { const e = document.querySelector('[data-cme="delGo"]'); const box = e.closest('.cme-sec') || e; box.scrollIntoView({ block: 'center' }); });
      await sleep(500);
    };
    const read = () => page.evaluate(() => {
      const q = s => document.querySelector(s), box = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) }; };
      const go = q('[data-cme="delGo"]'), keep = q('[data-cme="delCancel"]'), tx = q('.cme-del-tx'), h = q('#cmeDelT');
      const fits = [go, keep, tx, h].every(e => { const b = box(e); return b && b.l >= 0 && b.r <= innerWidth && b.t >= 0 && b.b <= innerHeight; });
      const clipped = [go, keep, tx, h].filter(e => e && e.scrollWidth > e.clientWidth + 1).length;
      return { lang: document.documentElement.lang, title: h && h.textContent, text: tx && tx.textContent, go: go && go.textContent, keep: keep && keep.textContent, fits, clipped, vw: innerWidth, vh: innerHeight };
    });
    for (const l of ['en', 'es', 'de']) {  /* German last: its dialog stays open for the failure and the real delete */
      await openHub();
      await page.waitForSelector('[data-lang="' + l + '"]', { state: 'attached', timeout: 15000 });
      await tap('[data-lang="' + l + '"]'); await sleep(900);
      await openAsk();
      const r = await read();
      await page.screenshot({ path: path.join(OUT, ENG + '-dialog-' + l + '.png') });
      const w = WANT[l];
      if (r.title !== w.title) fail(l + ' title ' + JSON.stringify(r.title));
      if (r.go !== w.go) fail(l + ' go ' + JSON.stringify(r.go));
      if (r.keep !== w.keep) fail(l + ' keep ' + JSON.stringify(r.keep));
      if (!r.fits) fail(l + ' dialog does not fit 390x844');
      if (r.clipped) fail(l + ' clipped text ' + r.clipped);
      res.steps.push({ lang: l, dialog: r });
      if (l !== 'de') { await tap('[data-cme="delCancel"]'); await sleep(500); }
    }
    /* the failure path, in German: the call is blocked once */
    blockDelete = true;
    await tap('[data-cme="delGo"]');
    await page.waitForFunction(() => { const t = document.querySelector('.cme-del-tx'); return t && t.getAttribute('role') === 'alert'; }, null, { timeout: 30000 });
    const f = await read();
    await page.screenshot({ path: path.join(OUT, ENG + '-dialog-de-failed.png') });
    if (!f.text || !f.text.includes(WANT.de.fail)) fail('de fail text ' + JSON.stringify(f.text));
    if (f.go !== WANT.de.go) fail('button not restored after failure: ' + JSON.stringify(f.go));
    res.steps.push({ failedCall: f });
    blockDelete = false;
    console.log('BLOCKED_DONE');
    if (PAUSE) { const until = Date.now() + 180000; while (!fs.existsSync(PAUSE) && Date.now() < until) await sleep(500); }
    /* delete for real, from the same dialog (German) */
    const nav = page.waitForNavigation({ timeout: 60000 }).catch(() => null);
    await tap('[data-cme="delGo"]');
    await nav; await sleep(4000);
    res.steps.push({ deleteCalls });
    const after = await page.evaluate(() => ({ local: Object.keys(localStorage).filter(k => /lowispike\.v2|lowi\.auth/.test(k)).length, uid: (window.LOWI_CLOUD_X && window.LOWI_CLOUD_X.state && window.LOWI_CLOUD_X.state().uid) || '' }));
    res.steps.push({ afterReload: { oldAccountDataOnPhone: after.local, newSessionIsNewUid: !!after.uid && after.uid !== res.uid } });
    const ok = deleteCalls.filter(c => c && c.status === 200 && c.body && c.body.ok);
    if (!ok.length) fail('no ok from delete-my-account: ' + JSON.stringify(deleteCalls));
    if (after.uid === res.uid) fail('still signed in as the deleted account');
    res.newUid = after.uid || '';
  } catch (e) { fail('threw ' + String(e && e.stack || e).slice(0, 500)); }
  errs.forEach(e => fail('page error ' + e));
  await browser.close();
  console.log('RESULT ' + JSON.stringify(res));
  process.exit(res.fails.length ? 1 : 0);
})();
