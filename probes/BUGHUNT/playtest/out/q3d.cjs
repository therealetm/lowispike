const L=require('../lib.cjs');(async()=>{const h=await L.open({view:process.argv[2]||'chromium390',url:'https://therealetm.github.io/lowispike/',settle:9000});
const r=await h.page.evaluate(()=>({st:window.LowiWorld3D&&window.LowiWorld3D.state,why:window.LowiWorld3D&&window.LowiWorld3D.why,html:document.documentElement.className.slice(0,300),gl:(()=>{try{return !!document.createElement('canvas').getContext('webgl2')}catch(e){return 'x'}})()}));
console.log(JSON.stringify(r),JSON.stringify(h.log.console.slice(0,8)));await h.browser.close();})();
