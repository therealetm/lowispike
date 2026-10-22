/* Community-only rules. No health, XP, contacts, or room-routing decisions. */
(function(root){
'use strict';
const EMOJI = ['❤️','👏','🙏','🌱','✨'];
const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const type = v => /^[IE][NS][TF][JP]$/.test(String(v || '').toUpperCase()) ? String(v).toUpperCase() : '';
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const image = v => /^https:\/\//.test(String(v || '')) || /^data:image\/(png|jpeg|webp);base64,/.test(String(v || '')) ? v : '';
/* Oct 16 (E-man, handoff Task 11): a chat photo is an ordinary message whose body carries '📷 <public URL>' from OUR media bucket (uid/chat-<id>.jpg). No schema change; older clients still read it as text, and only links from the app's own bucket ever render as a picture. */
const PHOTO_RE = /(^|\s)\u{1F4F7} (https:\/\/[a-z0-9-]{8,40}\.supabase\.co\/storage\/v1\/object\/public\/media\/([A-Za-z0-9_-]{6,64})\/chat-[A-Za-z0-9_-]{4,80}\.(?:jpe?g|webp|png))(?=\s|$)/u;
function photo(text, uid){ const s=String(text||''), m=PHOTO_RE.exec(s); if(!m||(uid&&m[3]!==uid))return null; const caption=(s.slice(0,m.index)+m[1]+s.slice(m.index+m[0].length)).replace(/\s+/g,' ').trim(); return {src:m[2],caption}; }
/* Oct 16 (E-man: "I can't even send voice notes"): a voice note is the same kind of message: '🎤 <public URL>#d=<seconds>', the file at
   <uid>/voice-<id>.<m4a|mp4|aac|webm|ogg> in the same media bucket. Older clients read it as text; only our own bucket links play. */
const VOICE_RE = /(^|\s)\u{1F3A4} (https:\/\/[a-z0-9-]{8,40}\.supabase\.co\/storage\/v1\/object\/public\/media\/([A-Za-z0-9_-]{6,64})\/voice-[A-Za-z0-9_-]{4,80}\.(?:m4a|mp4|aac|webm|ogg))(?:#d=(\d{1,3}))?(?=\s|$)/u;
function voice(text, uid){ const s=String(text||''), m=VOICE_RE.exec(s); if(!m||(uid&&m[3]!==uid))return null; const rest=(s.slice(0,m.index)+m[1]+s.slice(m.index+m[0].length)).replace(/\s+/g,' ').trim(); return {src:m[2],dur:Math.min(600,+m[4]||0),rest}; }
function voiceBody(src, dur){ const s=String(src||''); if(!voice('\u{1F3A4} '+s))return ''; const d=Math.max(1,Math.min(600,Math.round(+dur||0))); return '\u{1F3A4} '+s+'#d='+d; }
function photoBody(src, caption){ const s=String(src||''); if(!photo('\u{1F4F7} '+s))return ''; const c=String(caption||'').replace(/\s+/g,' ').trim().slice(0,600-s.length-4); return '\u{1F4F7} '+s+(c?' '+c:''); }
/* Oct 22 (Seven: "Logging, sharing to the community"): a shared meal is the same kind of message: '🍽 <public URL>#l=<low|mid|high>&n=<dish, URI-encoded> <caption>',
   the photo at <uid>/meal-<id>.jpg in the same media bucket. Only that meal: photo, dish name, spike rating, the caption typed. Never weight or health data. */
const MEAL_RE = /(^|\s)\u{1F37D}\uFE0F? (https:\/\/[a-z0-9-]{8,40}\.supabase\.co\/storage\/v1\/object\/public\/media\/([A-Za-z0-9_-]{6,64})\/meal-[A-Za-z0-9_-]{4,80}\.(?:jpe?g|webp|png))#l=(low|mid|high)&n=([A-Za-z0-9%._~!*'()-]{1,400})(?=\s|$)/u;
function dish(v){ let s=''; try{ s=decodeURIComponent(String(v||'')); }catch(e){ s=''; } return s.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,80); }
function meal(text, uid){ const s=String(text||''), m=MEAL_RE.exec(s); if(!m||(uid&&m[3]!==uid))return null; const name=dish(m[5]); if(!name)return null; const caption=(s.slice(0,m.index)+m[1]+s.slice(m.index+m[0].length)).replace(/\s+/g,' ').trim(); return {src:m[2],lvl:m[4],name,caption}; }
function mealBody(src, name, lvl, caption){ const n=dish(encodeURIComponent(String(name||'').replace(/\s+/g,' ').trim().slice(0,80))), l=lvl==='medium'?'mid':String(lvl||''); if(!n||!/^(low|mid|high)$/.test(l))return ''; const head='\u{1F37D} '+String(src||'')+'#l='+l+'&n='+encodeURIComponent(n).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase()); if(!meal(head))return ''; const c=String(caption||'').replace(/\s+/g,' ').trim().slice(0,Math.max(0,600-head.length-1)); return head+(c?' '+c:''); }
function identity(row){ row=row||{}; return {t:row.share_personality === true ? type(row.personality) : '',s:row.share_sign === true && SIGNS.includes(row.sign) ? row.sign : ''}; }
function quiet(p, now){ p=p||{}; if(p.quietEnabled === false)return false;const hour=(now||new Date()).getHours(),a=Number.isInteger(+p.quietStart)?Math.max(0,Math.min(23,+p.quietStart)):22,b=Number.isInteger(+p.quietEnd)?Math.max(0,Math.min(23,+p.quietEnd)):8; return a===b || (a<b ? hour>=a&&hour<b : hour>=a||hour<b); }
function message(m){if(!m||typeof m.id!=='string'||!m.id||typeof m.uid!=='string'||!m.uid||typeof m.t!=='string')return null;return {...m,by:String(m.by||'Member').slice(0,40),t:m.t.slice(0,600),ts:Number.isFinite(+m.ts)&&+m.ts>0?+m.ts:Date.now(),re:typeof m.re==='string'?m.re:null};}
function visible(messages, outbox, blocks, uid){
 const map=new Map();
 for(const m of (messages||[])){ if(!m || !m.id || !m.uid || m.demo || m.bot || (blocks[m.uid]&&blocks[m.uid].blocked))continue;const safe=message(m);if(safe)map.set(String(m.id),safe); }
 for(const m of (outbox||[])){const safe=message(m);if(safe&&m.uid===uid&&!map.has(String(m.id)))map.set(String(m.id),safe);}
 return [...map.values()].sort((a,b)=>a.ts-b.ts || String(a.id).localeCompare(String(b.id)));
}
function read(storage,key,fallback){try{const v=JSON.parse(storage.getItem(key));return v&&typeof v==='object'?v:fallback;}catch(e){return fallback;}}
function write(storage,key,value){try{storage.setItem(key,JSON.stringify(value));return true;}catch(e){return false;}}
/* Durable outbox IDs survive ambiguous network errors. No automatic sending on reconnect. */
function session(options){
 const {scope,storage,send,changed=()=>{}}=options,key='lowi.community.draft.v1:'+scope;
 const old=read(storage,key,{}); let draft=old.draft&&typeof old.draft.text==='string'?{text:old.draft.text.slice(0,600),reply:typeof old.draft.reply==='string'?old.draft.reply:null,retryId:old.draft.retryId}:{text:'',reply:null};
 let outbox=Array.isArray(old.outbox)?old.outbox.map(message).filter(m=>m&&m.uid===scope).map(m=>({...m,status:'unconfirmed'})):[];
 const busy=new Set(); let storageOK=true;
 const save=()=>{storageOK=write(storage,key,{draft,outbox});changed();};
 function setDraft(text,reply){const retry=outbox.find(m=>m.id===draft.retryId);draft={text:String(text).slice(0,600),reply:reply||null,retryId:retry&&retry.t===String(text).trim()&&retry.re===(reply||null)?retry.id:null};save();}
 function confirm(rows){const ids=new Set((rows||[]).filter(m=>m.uid===scope).map(m=>String(m.id)));const next=outbox.filter(m=>!ids.has(String(m.id)));if(next.length===outbox.length)return;outbox=next;if(draft.retryId&&ids.has(String(draft.retryId)))draft={text:'',reply:null};save();}
 async function submit(by,retryId){
  let m=photoIn&&!retryId?null:outbox.find(x=>x.id===(retryId||draft.retryId));
  if(!m&&photoIn){const pin=photoIn;photoIn=null;if(outbox.length>=20)throw new Error('outbox-full');m={id:pin.id||options.id(),uid:scope,by,t:pin.text,ts:Date.now(),rx:{},re:pin.reply||null,status:'sending'};if(pin.line)m.line=true;outbox.push(m);}
  if(!m){const text=draft.text.trim();if(!text)return null;if(outbox.length>=20)throw new Error('outbox-full');m={id:options.id(),uid:scope,by,t:text,ts:Date.now(),rx:{},re:draft.reply||null,status:'sending'};outbox.push(m);}
  if(busy.has(m.id))return null;
  busy.add(m.id);m.status='sending';
  if(draft.text.trim()===m.t&&draft.reply===m.re)draft={text:'',reply:null};save();
  try{const row=await send(m);if(!row||row.id!==m.id||row.uid!==scope)throw new Error('missing-ack');outbox=outbox.filter(x=>x.id!==m.id);if(draft.retryId===m.id)draft={text:'',reply:null};save();return row;}
  catch(e){if(outbox.some(x=>x.id===m.id)){m.status='unconfirmed';if(!draft.text&&!photo(m.t)&&!voice(m.t)&&!meal(m.t)&&!m.line)draft={text:m.t,reply:m.re,retryId:m.id};save();}throw e;}
  finally{busy.delete(m.id);changed();}
 }
 /* a photo goes out once its picture is uploaded: same outbox, same ack, same retry; its body never lands in the text draft */
 let photoIn=null;
 function submitPhoto(by,text,id,reply){if(!photo(text,scope)&&!voice(text,scope)&&!meal(text,scope))return Promise.reject(new Error('bad-photo'));if(id&&outbox.some(x=>x.id===id))return submit(by,id);photoIn={text,id,reply:reply||null};return submit(by);}
 /* Oct 16 (energy hits): one short line sent on its own (same outbox, ack and retry); it never touches or lands in the text draft */
 function submitLine(by,text){const t=String(text||'').trim().slice(0,600);if(!t)return Promise.reject(new Error('empty'));photoIn={text:t,id:null,reply:null,line:true};return submit(by);}
 function discard(id){if(busy.has(id))return;outbox=outbox.filter(m=>m.id!==id);if(draft.retryId===id)draft={text:'',reply:null};save();}
 return {setDraft,confirm,submit,submitPhoto,submitLine,discard,state:()=>({draft:{...draft},outbox:outbox.map(m=>({...m})),storageOK,busy:busy.size>0})};
}
/* Oct 20 (bug hunt BH-020): a photo upload takes seconds and the composer stays usable meanwhile. When it lands, only what went out
 with the photo leaves the composer: its caption (also as the start of a longer text) and the reply it answered. Anything typed or
 picked during the upload stays. sent/cur = {text, reply}. */
function afterCaption(sent, cur){
 const st=String(sent&&sent.text||''),ct=String(cur&&cur.text||''),sr=sent&&sent.reply||null,cr=cur&&cur.reply||null;
 let text=ct;if(st.trim()){if(ct===st||ct.trim()===st.trim())text='';else if(ct.startsWith(st))text=ct.slice(st.length).replace(/^\s+/,'');}
 return {text,reply:cr&&cr!==sr?cr:null};
}
const api={EMOJI,SIGNS,type,esc,image,photo,photoBody,voice,voiceBody,meal,mealBody,identity,quiet,message,visible,read,write,session,afterCaption};
if(typeof module==='object'&&module.exports)module.exports=api;else root.LowiChatCore=api;
})(typeof window==='object'?window:globalThis);
