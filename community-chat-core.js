/* Community-only rules. No health, XP, contacts, or room-routing decisions. */
(function(root){
'use strict';
const EMOJI = ['❤️','👏','🙏','🌱','✨'];
const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const type = v => /^[IE][NS][TF][JP]$/.test(String(v || '').toUpperCase()) ? String(v).toUpperCase() : '';
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const image = v => /^https:\/\//.test(String(v || '')) || /^data:image\/(png|jpeg|webp);base64,/.test(String(v || '')) ? v : '';
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
  let m=outbox.find(x=>x.id===(retryId||draft.retryId));
  if(!m){const text=draft.text.trim();if(!text)return null;if(outbox.length>=20)throw new Error('outbox-full');m={id:options.id(),uid:scope,by,t:text,ts:Date.now(),rx:{},re:draft.reply||null,status:'sending'};outbox.push(m);}
  if(busy.has(m.id))return null;
  busy.add(m.id);m.status='sending';
  if(draft.text.trim()===m.t&&draft.reply===m.re)draft={text:'',reply:null};save();
  try{const row=await send(m);if(!row||row.id!==m.id||row.uid!==scope)throw new Error('missing-ack');outbox=outbox.filter(x=>x.id!==m.id);if(draft.retryId===m.id)draft={text:'',reply:null};save();return row;}
  catch(e){if(outbox.some(x=>x.id===m.id)){m.status='unconfirmed';if(!draft.text)draft={text:m.t,reply:m.re,retryId:m.id};save();}throw e;}
  finally{busy.delete(m.id);changed();}
 }
 function discard(id){if(busy.has(id))return;outbox=outbox.filter(m=>m.id!==id);if(draft.retryId===id)draft={text:'',reply:null};save();}
 return {setDraft,confirm,submit,discard,state:()=>({draft:{...draft},outbox:outbox.map(m=>({...m})),storageOK,busy:busy.size>0})};
}
const api={EMOJI,SIGNS,type,esc,image,identity,quiet,message,visible,read,write,session};
if(typeof module==='object'&&module.exports)module.exports=api;else root.LowiChatCore=api;
})(typeof window==='object'?window:globalThis);
