const r = await h.page.evaluate(()=>{const e=document.getElementById('r2ob');return e?e.innerHTML.replace(/<svg.*?<\/svg>/g,'').slice(0,1500):'gone'});
return r;
