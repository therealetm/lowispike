'use strict';
/* Run 7 probe: does Home show the companion the user was given in onboarding (birth companion: sign colour + look)?
   usage: node probe-look.cjs <view> <url|dir> [bday=1997-10-10] [btime=] */
const L = require('./lib.cjs');
(async () => {
    const view = process.argv[2] || 'chromium390', target = process.argv[3] || 'https://therealetm.github.io/lowispike/';
    const bday = process.argv[4] || '1997-10-10', btime = process.argv[5] || '';
    let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const pre = `try{localStorage.setItem('lowispike.companion.v1',JSON.stringify({v:1,bday:'${bday}',btime:'${btime}',n:0,name:'Koji',created:1}));const s=JSON.parse(localStorage.getItem('lowispike.v2')||'null');if(s){s.user=s.user||{};s.user.bday='${bday}';localStorage.setItem('lowispike.v2',JSON.stringify(s));}}catch(e){}`;
    const preV2 = `try{if(!localStorage.getItem('lowispike.v2'))localStorage.setItem('lowispike.v2',JSON.stringify({v:2,setupDone:true,onboarded:true,user:{name:'Fixture',bday:'${bday}'},xp:900,ledger:[],logs:[],settings:{lang:'en'}}));}catch(e){}`;
    const h = await L.open({ view, url, preInit: preV2 + pre, settle: 9000 });
    const { page } = h;
    const r = await page.evaluate(() => {
        const o = {};
        try { const c = window.LowiBirthCompanion.get(); o.birth = { name: c.name, sign: c.sign, palette: c.palette, look: c.look, misty: !!c.misty }; } catch (e) { o.birth = 'ERR ' + e.message; }
        try { const t = window.LowiHerbTamagotchi, c = t.current(); o.herb = { sign: c.m && c.m.profile && (c.m.profile.sign || c.m.profile.id), palette: c.m && c.m.profile && c.m.profile.palette, keys: Object.keys(c.m.profile || {}).slice(0, 30) }; } catch (e) { o.herb = 'ERR ' + e.message; }
        const b = document.querySelector('#spBubble'); o.sp = b ? { html: b.innerHTML.length, cls: b.className, fills: [...new Set([...b.querySelectorAll('[fill],[stop-color]')].map(e => e.getAttribute('stop-color') || e.getAttribute('fill')).filter(v => /^#/.test(v || '')))].slice(0, 20), canvas: !!b.querySelector('canvas'), img: !!b.querySelector('img') } : null;
        const d = document.createElement('div'); d.id = 'bhLook'; d.style.cssText = 'position:fixed;left:10px;top:60px;width:200px;height:200px;z-index:99999;background:#06122a'; d.innerHTML = window.LowiBirthCompanion.svg(null, { size: 200 }); document.body.appendChild(d);
        return o;
    });
    await page.screenshot({ path: __dirname + '/out/look-' + view + '.png' });
    const s = await L.snap(h);
    console.log(JSON.stringify({ view, r, err: s.err, rej: s.rej, pageerror: h.log.pageerror }, null, 1));
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(2); });
