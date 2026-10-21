/* dev helper: open the room thread and print geometry of its parts. node dump.cjs [device] [url] */
'use strict';
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
(async () => {
  const R = await H.open({ engine: 'webkit', device: process.argv[2] || 'iPhone 13', probe: false, url: process.argv[3] || '' }); const p = R.page;
  try {
    await R.goto(); await N.openCommunity(R); await H.sleep(7000);
    await p.locator('.rm-tab[data-rm="chat"]').click({ force: true }).catch(() => { }); await H.sleep(1200);
    await p.locator('.rm-ch[data-ch="galaxy"]').click({ force: true }).catch(() => { }); await H.sleep(2500);
    const out = await p.evaluate((sels) => sels.map(s => { const e = document.querySelector(s); if (!e) return s + ': -'; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return s + ': ' + [r.left, r.top, r.width, r.height].map(Math.round).join(',') + ' ' + cs.display + ' ' + cs.position + ' bg=' + cs.backgroundColor + ' n=' + document.querySelectorAll(s).length; }).concat(['msgs=' + document.querySelectorAll('#cmList .cm-msg').length, 'listHTML=' + (document.getElementById('cmList') || {}).innerHTML.slice(0, 300), 'rmview=' + (document.getElementById('cmPaneChat') || { getAttribute: () => '' }).getAttribute('data-rm-view')]), (process.argv[4] || '.rm-bar,.rm-crumb,#cgThread,.cr-head,.cr-back,.cr-id,#crLink,#crCrew,#cmList,.cm-compose,.cm-inrow,#cmPhoto,#cmInput,#cmSend,[data-chat=mic],#tbTheme,#pfBtn,#tabbar').split(','));
    console.log(out.join('\n'));
    if (process.env.EVAL) console.log(JSON.stringify(await p.evaluate(process.env.EVAL)));
    console.log('errs', JSON.stringify(R.errs.slice(0,4)));
    if (process.argv[5]) await R.shot(process.argv[5]);
  } finally { await R.close(); }
})();
