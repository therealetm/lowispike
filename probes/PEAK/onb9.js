await h.page.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>/Not now/.test(x.textContent)); b&&b.click(); });
await L.sleep(2500);
const r = await h.page.evaluate(() => { const out=[]; const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT); let n; while((n=w.nextNode())){ if(/\d\s*%/.test(n.nodeValue)){ const e=n.parentElement; const rc=e.getBoundingClientRect(); out.push([n.nodeValue.trim().slice(0,60), e.className, rc.width>0&&rc.height>0]); } } return out; });
await h.page.screenshot({ path: '/home/sprite/PEAK/home-before.png' });
return r;
