await h.page.evaluate(async () => { try { const r = await navigator.serviceWorker.getRegistrations(); for (const x of r) await x.unregister(); const k = await caches.keys(); for (const c of k) await caches.delete(c); } catch (e) {} });
await h.page.reload({ waitUntil: 'load' }); await L.sleep(9000);
const r = await h.page.evaluate(() => { const en = LowiSun.energyNow(); const w = window.LowiWorld3D; return { hasFeel: !!LowiSun.feel, value: en.value, tier: en.tier, welcome: en.welcome, real: en.real, misty: (document.getElementById('spHome')||{}).dataset.misty, feel: window.LowiVigorFeel, look: w && w.feelLook ? w.feelLook() : (w && Object.keys(w).slice(0,40)) }; });
return r;
