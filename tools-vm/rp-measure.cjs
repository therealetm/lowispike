const pw=require('/tmp/pw/node_modules/playwright');
(async()=>{const b=await pw.webkit.launch();const p=await b.newPage();await p.setContent('<div id=x style="font:600 13px -apple-system,system-ui,sans-serif"></div>');
const S=['Open recipe','Rezept öffnen','Abrir receta','Cook it','Kochen','Cocinar','Save','Saved','Merken','Gemerkt','Guardar','Guardada','Recipe','Rezept','Receta','Add to kitchen','In die Küche','A mi cocina','5 in your kitchen','5 in deiner Küche','5 en tu cocina','Undo','Rückgängig','Deshacer','All in your kitchen','Alles in deiner Küche','Todo en tu cocina','📖','☆'];
const r=await p.evaluate(S=>{const x=document.getElementById('x');return S.map(s=>{x.innerHTML='<span>'+s+'</span>';return s+'='+Math.round(x.firstChild.getBoundingClientRect().width)})},S);
console.log(r.join('  '));console.log(await p.evaluate(()=>getComputedStyle(document.getElementById('x')).fontFamily));await b.close()})();
