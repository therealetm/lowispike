'use strict';
// Read-only check of what the community crowd created in Supabase (messages, posts, profiles). No secrets printed.
const fs = require('fs');
const SB = require('/home/sprite/BOTS/sb.cjs');
const RF = '/home/sprite/BOTS/reader.json';
const SINCE = process.argv[2] || '2026-10-19T19:15:00Z';
(async () => {
  let tok;
  const r = JSON.parse(fs.readFileSync(RF, 'utf8'));
  try { const a = await SB.refresh(r.rt); tok = a.access_token; fs.writeFileSync(RF, JSON.stringify({ id: a.user.id, rt: a.refresh_token })); console.log('session: refreshed reader account'); }
  catch (e) { console.log('refresh failed:', e.message, '-> using a fresh anonymous reader'); const a = await SB.anon(); tok = a.access_token; fs.writeFileSync(RF, JSON.stringify({ id: a.user.id, rt: a.refresh_token })); }
  const crowd = new Set();
  const people = require('/home/sprite/lowispike/tools/community-crowd/crowd.cjs').people();
  const names = new Set(people.map(p => p.name));
  const profs = await SB.get(tok, 'profiles?select=id,name,lv,xp,look,updated_at&order=updated_at.desc&limit=1000');
  const crowdProfs = profs.filter(p => names.has(p.name));
  crowdProfs.forEach(p => crowd.add(p.id));
  console.log('profiles total readable:', profs.length, '| crowd-name profiles:', crowdProfs.length, '| with look:', crowdProfs.filter(p => p.look).length);
  const msgs = await SB.get(tok, 'messages?select=id,user_id,who,body,reply_to,created_at&room=eq.all&created_at=gte.' + SINCE + '&order=created_at.asc&limit=1000');
  const all = await SB.get(tok, 'messages?select=id,user_id,who&room=eq.all&order=created_at.desc&limit=1000');
  const byId = new Map(all.map(m => [m.id, m])); msgs.forEach(m => byId.set(m.id, m));
  const cm = msgs.filter(m => crowd.has(m.user_id));
  console.log('messages since', SINCE, ':', msgs.length, '| from crowd:', cm.length, '| from others:', msgs.length - cm.length);
  const photos = cm.filter(m => /storage\/v1\/object\/public\/media\//.test(m.body));
  const prod = cm.filter(m => /zucker|sugar|azúcar|g\/100|per 100|pro 100|REWE|EDEKA|Lidl|ALDI|Kaufland|famila|Netto|Penny/i.test(m.body));
  const replies = cm.filter(m => m.reply_to);
  const toHumans = replies.filter(m => { const t = byId.get(m.reply_to); return t && !crowd.has(t.user_id); });
  const nameList = [...names].sort((a, b) => b.length - a.length);
  const atName = b => { if (!/^@/.test(b)) return null; const rest = b.slice(1); return nameList.find(n => rest.toLowerCase().startsWith(n.toLowerCase() + ' ')) || rest.split(' ')[0]; };
  const atHumans = cm.filter(m => { const n = atName(m.body); return n && !names.has(n); });
  const humanMsgs = msgs.filter(m => !crowd.has(m.user_id));
  const answersToHumans = cm.filter(m => humanMsgs.some(h => m.reply_to === h.id || (m.body.toLowerCase().startsWith('@' + String(h.who).toLowerCase() + ' '))));
  console.log('crowd chat photos:', photos.length, '| product talk:', prod.length, '| replies:', replies.length, '| replies to non-crowd people:', toHumans.length, '| @messages to non-crowd:', atHumans.length);
  const show = (lab, arr) => { console.log('--- ' + lab); arr.slice(0, 6).forEach(m => { const t = m.reply_to && byId.get(m.reply_to); console.log(m.created_at.slice(11, 19), m.who + ':', m.body.slice(0, 160).replace(/https:\/\/\S+/, '[photo link]'), t ? ' <- reply to ' + t.who : ''); }); };
  show('all crowd messages (first 6)', cm);
  show('photos', photos); show('product talk', prod); show('replies to non-crowd people', toHumans); show('@ to non-crowd', atHumans); show('crowd answers to the human testers', answersToHumans);
  show('non-crowd messages since launch', msgs.filter(m => !crowd.has(m.user_id)));
  let posts = [];
  try { posts = await SB.get(tok, 'posts?select=id,user_id,who,cap,photo_url,created_at&created_at=gte.' + SINCE + '&order=created_at.asc&limit=500'); } catch (e) { console.log('posts read failed:', e.message); }
  const cp = posts.filter(p => crowd.has(p.user_id));
  console.log('posts since', SINCE, ':', posts.length, '| from crowd:', cp.length);
  cp.slice(0, 6).forEach(p => console.log(p.created_at.slice(11, 19), p.who + ':', p.cap, p.photo_url ? '[photo]' : '[no photo]'));
  const firstPhoto = photos[0] && (photos[0].body.match(/https:\/\/\S+/) || [])[0];
  const firstPost = cp[0] && cp[0].photo_url;
  for (const u of [firstPhoto, firstPost].filter(Boolean)) { try { const x = await fetch(u, { method: 'HEAD' }); console.log('photo HEAD', x.status, x.headers.get('content-type'), x.headers.get('content-length')); } catch (e) { console.log('photo HEAD failed', e.message); } }
})().catch(e => { console.log('FAILED:', e.message); process.exit(1); });
