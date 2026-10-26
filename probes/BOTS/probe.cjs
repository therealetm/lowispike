const S = require('./sb.cjs'), fs = require('fs');
(async () => {
  const a = await S.anon(); fs.writeFileSync('reader.json', JSON.stringify({ id: a.user.id, rt: a.refresh_token }));
  const t = a.access_token;
  const p = await S.get(t, 'profiles?select=id,name,lv,streak,bio,look,updated_at&name=neq.&order=updated_at.desc&limit=50');
  console.log('profiles', p.length); p.forEach(r => console.log(r.id.slice(0,8), JSON.stringify(r.name), r.lv, r.streak, r.look ? 'look' : '-', r.updated_at));
  const m = await S.get(t, 'messages?select=id,user_id,who,body,reply_to,created_at&room=eq.all&order=created_at.desc&limit=30');
  console.log('messages', m.length); m.forEach(r => console.log(r.created_at, r.user_id.slice(0,8), r.who, '|', String(r.body).slice(0,100)));
  const po = await S.get(t, 'posts?select=*&order=created_at.desc&limit=5'); console.log('posts', po.length, po[0] && Object.keys(po[0]).join(','));
})().catch(e => console.log('ERR', e.message));
