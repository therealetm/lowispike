// name + reward steps: speech bubble must stay inside the scene, below the top bar, on screen
const st = async (f) => { await f(); await L.sleep(1600); };
const geo = () => h.page.evaluate(() => { const q = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right) }; }; return { vh: innerHeight, bubble: q('.hs-bubble'), back: q('.hs-back'), top: q('.hs-top'), misty: q('.hs-misty'), copy: q('.hs-copy'), acts: q('.hs-acts') }; });
const out = {};
await st(() => C('text=Say hi')); out.s1 = await geo(); await st(() => C('text=Got it')); await st(() => C('text=Next'));
out.name = await geo();
await h.page.fill('#hsYou', 'Ana'); await st(() => C('text=Nice to meet you')); await L.sleep(1200);
out.reward = await geo();
const bad = []; for (const k of ['name', 'reward']) { const g = out[k]; if (!g.bubble) { bad.push(k + ': no bubble'); continue; } if (g.bubble.t < 0) bad.push(k + ': bubble off top'); const tb = Math.max(g.back ? g.back.b : 0, g.top ? g.top.b : 0); if (g.bubble.t < tb) bad.push(k + ': bubble under top bar ' + g.bubble.t + '<' + tb); if (g.copy && g.misty && g.misty.b > g.copy.t + 2) bad.push(k + ': misty over copy'); if (g.acts && g.copy && g.copy.b > g.acts.t + 2) bad.push(k + ': copy over buttons'); }
return { bad, out };
