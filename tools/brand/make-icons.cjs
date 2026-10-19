'use strict';
/* Oct 19 old-design purge: the app icons are drawn from the current Misty (the same glass cell as Home), not the old round-1 pulse-line logo.
   node tools/brand/make-icons.cjs  -> writes /tmp/lowi-icon-1024.png; tools/brand/make-icons.py resizes it into icon-*.png + favicon. */
const path = require('path');
const L = require(process.env.BH_LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
(async () => {
  const server = await L.serve(path.resolve(__dirname, '..', '..'));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const h = await L.open({ url, view: 'chromium390', settle: 7000 });
  const ok = await h.page.evaluate(() => {
    const T = window.LowiHerbTamagotchi, c = T && T.current && T.current();
    if (!c || !T.plantHTML) return 'no misty';
    const st = document.createElement('div');
    st.id = 'lowiIconStage';
    st.style.cssText = 'position:fixed;left:0;top:0;width:1024px;height:1024px;z-index:2147483647;overflow:hidden;' +
      'background:radial-gradient(circle at 50% 44%,#163a7a 0%,#0a1f48 38%,#050d22 70%,#03050a 100%);';
    st.innerHTML = '<style>#lowiIconStage *{animation-play-state:paused!important;transition:none!important}' +
      '#lowiIconStage .ring{position:absolute;left:112px;top:112px;width:800px;height:800px;border-radius:50%;' +
      'background:radial-gradient(circle at 36% 30%,rgba(255,255,255,.22),rgba(150,210,255,.08) 38%,rgba(40,90,180,.10) 70%,rgba(140,200,255,.20) 100%);' +
      'box-shadow:inset 0 0 0 5px rgba(255,255,255,.34),inset 0 0 60px rgba(150,215,255,.25),0 0 90px rgba(90,170,255,.28)}' +
      '#lowiIconStage .m{position:absolute;left:192px;top:186px;width:640px;height:640px}' +
      '#lowiIconStage .m svg{width:100%!important;height:100%!important;display:block;overflow:visible}</style>' +
      '<div class="ring"></div><div class="m">' + T.plantHTML(c.m, 'node', c.p, { label: 'Misty' }) + '</div>';
    document.body.appendChild(st);
    return 'ok';
  });
  if (ok !== 'ok') throw new Error(ok);
  await h.page.setViewportSize({ width: 1024, height: 1024 });
  await L.sleep(2500);
  await h.page.evaluate(() => { document.getAnimations().forEach(a => { try { a.pause(); } catch (e) { } }); });
  await h.page.locator('#lowiIconStage').screenshot({ path: '/tmp/lowi-icon-1024.png' });
  await h.browser.close(); server.close();
  console.log('wrote /tmp/lowi-icon-1024.png');
})().catch(e => { console.error(e); process.exit(1); });
