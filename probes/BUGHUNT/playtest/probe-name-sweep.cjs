'use strict';
/* Run 45 (P-HARDCODED-NAME): a user whose companion is named "Zorbo" walks the app. After each step, every visible text node,
   aria-label, title and placeholder is scanned for the default name "Misty". Mock cloud.
   usage: node probe-name-sweep.cjs <url|dir> [view] [lang] */
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'chromium390', lang = process.argv[4] || 'en';
  const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
  const pre = "try{localStorage.setItem('lowi.tutorial.done','1');localStorage.setItem('lowispike.companion.v1',JSON.stringify({v:1,bday:'1990-01-01',btime:'',n:0,name:'Zorbo',created:1}));}catch(e){}";
  const h = await L.open({ url, view, lang, preInit: pre, ctxHook: async ctx => require(WT + '/tools/sim/mock-cloud.cjs').install(ctx, { members: 20, messages: 10, me: 'Fixture' }) });
  const P = h.page;
  await P.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(4000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
  const scan = label => P.evaluate(label => {
    const out = []; const vis = e => { for (let x = e; x && x.nodeType === 1; x = x.parentElement) { if (x.hidden) return false; const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden') return false; } return true; };
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = tw.nextNode())) { if (/\bMisty/.test(n.nodeValue) && n.parentElement && !/SCRIPT|STYLE/.test(n.parentElement.tagName) && vis(n.parentElement)) out.push('text<' + n.parentElement.tagName.toLowerCase() + (n.parentElement.className && typeof n.parentElement.className === 'string' ? '.' + n.parentElement.className.split(' ')[0] : '') + (n.parentElement.id ? '#' + n.parentElement.id : '') + '>: ' + n.nodeValue.trim().slice(0, 90)); }
    document.querySelectorAll('[aria-label],[title],[placeholder],[alt]').forEach(e => { ['aria-label', 'title', 'placeholder', 'alt'].forEach(a => { const v = e.getAttribute(a); if (v && /\bMisty/.test(v) && vis(e)) out.push(a + '<' + e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : '') + '>: ' + v.slice(0, 90)); }); });
    return out;
  }, label);
  const name = await P.evaluate(() => { try { return LowiBirthCompanion.displayName(); } catch (e) { return 'ERR ' + e.message; } });
  console.log('displayName', name);
  const steps = [
    ['home', "goTab('home')"],
    ['companion card', "LowiWorldHome.openMisty('aura')"],
    ['close card', "document.querySelectorAll('.wh-ms-x,[data-ms=close],.xbtn').forEach(b=>{try{b.click()}catch(e){}});goTab('home')"],
    ['pad auto chip', "LowiPad.mode('auto')"],
    ['pad call home', "(function(){const b=document.getElementById('spBubble');if(b){b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));}})()"],
    ['pad off', "LowiPad.mode('')"],
    ['today', "goTab('today')"],
    ['move', "goTab('move')"],
    ['shelf', "goTab('shelf')"],
    ['scan', "goTab('scan')"],
    ['profile', "goTab('profile')"],
    ['community', "goTab('foryou')"],
    ['ranking', "LowiRanking.open()"],
    ['home2', "goTab('home')"]
  ];
  const seen = new Map();
  for (const [lbl, code] of steps) {
    const err = await P.evaluate(code => { try { (0, eval)(code); return ''; } catch (e) { return e.message; } }, code);
    await L.sleep(lbl === 'pad call home' ? 300 : 1800);
    const hits = await scan(lbl);
    const fresh = hits.filter(x => !seen.has(x)); fresh.forEach(x => seen.set(x, lbl));
    console.log('STEP', lbl, err ? 'ERR ' + err : '', fresh.length ? '\n  ' + fresh.join('\n  ') : '(none new)');
  }
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }));
  console.log(seen.size ? 'FAIL ' + seen.size + ' Misty hits' : 'PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
