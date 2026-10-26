const S = require('./sb.cjs'), fs = require('fs');
(async () => { const r = JSON.parse(fs.readFileSync('reader.json')); const a = await S.refresh(r.rt); fs.writeFileSync('reader.json', JSON.stringify({ id: a.user.id, rt: a.refresh_token }));
  const po = await S.get(a.access_token, 'posts?select=*&order=created_at.desc&limit=8'); po.forEach(p => console.log(JSON.stringify(Object.assign({}, p, {art: p.art ? JSON.stringify(p.art).slice(0,300) : null})).slice(0,700)));
  const rx = await S.get(a.access_token, 'reactions?select=*&limit=5'); console.log(rx);
  const pl = await S.get(a.access_token, 'post_likes?select=*&limit=3'); console.log(pl);
})().catch(e => console.log('ERR', e.message));
