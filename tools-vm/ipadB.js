OUT.length=0;
await page.click('text=Siguiente',{timeout:20000}).catch(e=>OUT.push('miss sig')); await L.sleep(3000);
await page.fill('#hsYou','Lucía',{timeout:15000}).catch(()=>OUT.push('nofill')); await page.click('text=¡Un placer!',{timeout:20000}).catch(()=>OUT.push('miss placer')); await L.sleep(4000); await G2('ipad-reward');
const ov=await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width>0&&/Crea una cuenta/.test(e.textContent))[0]; if(!b) return 'nobtn'; const r=b.getBoundingClientRect(); return JSON.stringify({w:Math.round(r.width),h:Math.round(r.height),left:Math.round(r.left),right:Math.round(r.right),vw:innerWidth,sw:b.scrollWidth,cw:b.clientWidth})});
OUT.push('SAVEBTN '+ov);
await page.screenshot({path:'/home/sprite/es-ipad-reward.png',timeout:60000}).then(()=>OUT.push('shot ok')).catch(e=>OUT.push('shot fail'));
return OUT.join('\n');
