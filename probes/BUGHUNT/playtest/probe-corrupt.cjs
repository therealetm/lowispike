'use strict';
/* Run 52: corrupted / wrong-typed saved data on today's build. Phase 1 plays a normal session (every Home opener once) so the
   new features write their keys. Phase 2, per mode, overwrites every key the app wrote (not the auth/fixture keys) with a
   broken value, reloads, then opens every opener again. Records page errors / rejections per opener and whether Home loads.
   usage: node probe-corrupt.cjs <url|dir> [view] [modes comma list: json,num,str,arr,null,obj,quota] [filterRegex] */
const L = require('./lib.cjs');
const SKIP = /^(LowiOwnerAdmin|LowiHandoff|LowiStudioLockCore|LowiR2\.showGate|LowiPraise|LowiRegionPalsCore|LowiWorldSci|LowiAfterMeal\.shown|LowiRealmBack|LowiCareBoard|LowiForYou|LowiForYouCore|LowiTutorial|LowiK1\.opened|LowiCookTabs\.opening|LowiR2\.openCount|LowiAfterMealCore\.(startedAt|open)|LowiFastEditCore|LowiFastEdit\.startOf|LowiFastStop\.startOf|LowiShopPlan\.showErr|LowiFyEmbed|LowiWorld3D|LowiCellRoom|LowiBloom\.open|LowiArrival|LowiQuickTour)/;
const KEEP = /^(lowi\.auth|lowi\.gate|lowi\.daily\.seen|lowi\.news\.seen|lowispike\.claimprompt\.v1|lowi\.tutorial\.done|sb-)/;
const VAL = { json: '{"v":2,', num: '42', str: '"hello"', arr: '[1,2]', null: 'null', obj: '{"a":{}}', neg: '-1', nan: 'NaN' };
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'chromium390', modes = (process.argv[4] || 'json,num,str,arr,null,obj,quota').split(','), filt = process.argv[5] ? new RegExp(process.argv[5]) : null;
  const pre = "try{localStorage.setItem('lowi.tutorial.done','1');}catch(e){}";
  const h = await L.open({ url, view, lang: 'en', preInit: pre }); const P = h.page;
  async function home() {
    await P.waitForFunction(() => document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 60000 }).catch(() => {});
    await L.sleep(1500);
    await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); }).catch(() => {});
  }
  await home();
  const list = await P.evaluate(() => { const out = []; Object.keys(window).filter(k => /^Lowi/.test(k)).forEach(k => { try { const o = window[k]; if (o && typeof o === 'object') Object.keys(o).filter(n => typeof o[n] === 'function' && /^(open|show)/i.test(n)).forEach(n => out.push(k + '.' + n)); } catch (e) { } }); return out; });
  const todo = list.filter(n => !SKIP.test(n) && (!filt || filt.test(n)));
  async function sweep(tag) {
    const bad = [];
    for (const name of todo) {
      await P.evaluate(() => { for (let i = 0; i < 4; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); try { goTab('home'); } catch (e) { } }).catch(() => {});
      await L.sleep(250);
      await L.snap(h).catch(() => {});
      const r = await P.evaluate(n => { const [o, f] = n.split('.'); try { const r = window[o][f](); if (r && r.catch) r.catch(e => { (window.__bh.rej).push('opener rejected: ' + String(e && e.stack || e).slice(0, 300)); }); return ''; } catch (e) { return String(e && e.stack || e).slice(0, 300); } }, name).catch(e => 'EVAL ' + String(e).slice(0, 120));
      await L.sleep(900);
      const s = await L.snap(h).catch(() => ({ err: [], rej: [] }));
      if (r || s.err.length || s.rej.length) { const row = { tag, name, threw: r, err: s.err, rej: s.rej }; bad.push(row); console.log(JSON.stringify(row)); }
    }
    return bad;
  }
  console.log('openers', todo.length);
  const base = await sweep('normal');
  await P.evaluate(() => { for (let i = 0; i < 4; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); try { goTab('home'); } catch (e) { } });
  await L.sleep(3000);
  const keys = await P.evaluate(() => Object.keys(localStorage));
  const targets = keys.filter(k => !KEEP.test(k));
  console.log('keys', keys.length, 'targets', targets.length);
  const snapshot = await P.evaluate(() => JSON.stringify(Object.assign({}, localStorage)));
  const summary = { normal: base.length };
  for (const m of modes) {
    await P.evaluate(([snap, tg, m, v]) => {
      const o = JSON.parse(snap); localStorage.clear(); Object.keys(o).forEach(k => localStorage.setItem(k, o[k]));
      if (m === 'quota') { sessionStorage.setItem('__bhQuota', '1'); return; }
      sessionStorage.removeItem('__bhQuota');
      tg.forEach(k => localStorage.setItem(k, v));
    }, [snapshot, targets, m, VAL[m] || '']);
    await P.addInitScript(() => { try { if (sessionStorage.getItem('__bhQuota') === '1') { const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (this === window.localStorage && !/^(lowi\.auth|sb-)/.test(k)) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; } return o.call(this, k, v); }; } } catch (e) { } });
    const errs = { pageerror: h.log.pageerror.length };
    await P.reload({ waitUntil: 'load', timeout: 120000 }).catch(e => console.log('reload fail', m, String(e).slice(0, 100)));
    await P.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 60000 }).catch(() => console.log(JSON.stringify({ tag: m, BOOT: 'goTab never defined' })));
    await L.sleep(5000); await home();
    const boot = await P.evaluate(() => ({ orbit: document.querySelectorAll('[data-orbit]').length, tab: (document.querySelector('.tab.active') || {}).id || '', fatal: !!document.querySelector('.boot-fail, #bootFail') })).catch(e => ({ e: String(e).slice(0, 100) }));
    const s0 = await L.snap(h).catch(() => ({ err: [], rej: [] }));
    console.log(JSON.stringify({ tag: m, boot, bootErr: s0.err, bootRej: s0.rej.slice(0, 4), newPageErrors: h.log.pageerror.slice(errs.pageerror).slice(0, 4) }));
    const bad = await sweep(m);
    summary[m] = bad.length;
  }
  await P.evaluate(() => sessionStorage.removeItem('__bhQuota')).catch(() => {});
  console.log('summary', JSON.stringify(summary));
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
