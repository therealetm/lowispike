await h.page.reload({ waitUntil: 'load' }); await L.sleep(9000);
const a = await h.page.evaluate(() => [LowiWorld3D.feelLook(), performance.now()]); await L.sleep(2000);
const b = await h.page.evaluate(() => [LowiWorld3D.feelLook(), performance.now(), LowiWorld3D.fps(), LowiWorld3D.state]);
return { a, b };
