'use strict';
const L = require('../interface-audit/lib.cjs');
(async () => {
  const s = L.existingSeed({ lang: 'de', state: { settings: { lang: 'de' } } }); s.kv['lowi.news.build']=s.build; s.kv['lowi.news.tourbuild']=s.build; s.kv['lowi.tutorial.v1']=JSON.stringify({v:999,done:true});
  const h = await L.launch({ viewport: { width: 390, height: 844 }, locale: 'de-DE', seed: s });
  await L.openApp(h, { settle: 4000 });
  const r = await h.page.evaluate(() => {
    const out = {};
    for (const k of Object.getOwnPropertyNames(window)) {
      if (!/^Lowi|^lowi|^LIS|^Lis/.test(k)) continue;
      let v; try { v = window[k]; } catch (e) { continue; }
      if (!v || (typeof v !== 'object' && typeof v !== 'function')) continue;
      const fns = []; try { for (const f of Object.keys(v)) { try { if (typeof v[f] === 'function' && /^(open|show|sheet|page|start|launch|enter|panel|view|modal|card|menu|openSheet|openPage|toggle|go)/i.test(f)) fns.push(f); } catch (e) {} } } catch (e) {}
      if (fns.length) out[k] = fns;
    }
    return out;
  });
  console.log(JSON.stringify(r));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
