/* Uses the existing auth client and single shared realtime channel. No second subscription. */
(function(root){
'use strict';
function create(host, changed){
 let phase='idle',error='',flight=null,epoch=0,edits=[],reactionBusy=new Set();
 const uid=()=>host.state().uid||'';
 const still=id=>id&&id===uid();
 const state=()=>({uid:uid(),phase,error,realtime:host.state().chatRealtime||'connecting'});
 async function request(query){const ctl=new AbortController();let timer;try{return await Promise.race([typeof query.abortSignal==='function'?query.abortSignal(ctl.signal):query,new Promise((_,reject)=>{timer=setTimeout(()=>{ctl.abort();reject(new Error('timeout'));},12000);})]);}finally{clearTimeout(timer);}}
 const result=async q=>{const r=await request(q);if(r.error)throw r.error;return r.data;};
 function map(r,reactions){const rx={};(reactions||[]).filter(x=>x.message_id===r.id).forEach(x=>(rx[x.emoji]=rx[x.emoji]||[]).push(x.who||'Member'));return {id:r.id,uid:r.user_id,by:r.who||'Member',t:r.body||'',ts:Date.parse(r.created_at)||Date.now(),re:r.reply_to||null,rx};}
 const fields='id,user_id,who,body,reply_to,created_at,room';
 function notify(event){if(flight&&event&&event.id){const m=host.messages().find(m=>m.id===event.id);edits.push({id:event.id,type:event.type,message:m||null});}changed();}
 function reset(){epoch++;flight=null;edits=[];phase='idle';error='';reactionBusy.clear();}
 async function reload(){
  const id=uid();if(!id)return false;if(flight)return flight;
  const turn=epoch;phase='loading';error='';edits=[];changed();
  const task=(async()=>{try{
   const sb=await host.client();
   const [rows,rx]=await Promise.all([result(sb.from('messages').select(fields).eq('room','all').order('created_at',{ascending:false}).limit(300)),result(sb.from('reactions').select('message_id,user_id,who,emoji').limit(10000))]);
   if(!still(id)||turn!==epoch)return false;
   const merged=new Map((rows||[]).slice().reverse().map(r=>[r.id,map(r,rx)]));
   for(const e of edits){if(e.message)merged.set(e.id,e.message);else merged.delete(e.id);}
   const touched=new Set(edits.map(e=>e.id)),current=host.reactions();
   const mergedRx=(rx||[]).filter(r=>!touched.has(r.message_id)).concat(current.filter(r=>touched.has(r.message_id)&&merged.has(r.message_id)));
   host.replace([...merged.values()].sort((a,b)=>a.ts-b.ts),mergedRx);phase='ready';changed();return true;
  }catch(e){if(still(id)&&turn===epoch){phase='error';error='load';changed();}return false;}finally{if(turn===epoch){flight=null;edits=[];}}})();
  flight=task;return task;
 }
 async function send(m){
  const id=uid();if(!still(m.uid)||!id)throw new Error('auth');const sb=await host.client();if(!still(id))throw new Error('auth');
  // A prior insert may have committed even when its response never arrived.
  let row=await result(sb.from('messages').select(fields).eq('id',m.id).eq('user_id',id).maybeSingle());
  if(!row){row=await result(sb.from('messages').insert({id:m.id,user_id:id,room:'all',who:m.by.slice(0,40),body:m.t,reply_to:m.re}).select(fields).single());}
  if(!still(id)||!row||row.id!==m.id||row.user_id!==id||row.body!==m.t||row.reply_to!==(m.re||null))throw new Error('missing-ack');
  const msg=map(row,host.reactions());host.upsert(msg);changed();return msg;
 }
 async function remove(mid){
  const id=uid(),m=host.messages().find(m=>m.id===mid);if(!id||!m||m.uid!==id)throw new Error('owner');const sb=await host.client();if(!still(id))throw new Error('auth');
  const rows=await result(sb.from('messages').delete().eq('id',mid).eq('user_id',id).select('id'));
  if(!still(id)||!rows||!rows.some(r=>r.id===mid))throw new Error('missing-delete-ack');host.remove(mid);changed();
 }
 async function react(mid,emoji,name){
  const id=uid(),key=mid+':'+emoji;if(!id||!root.LowiChatCore.EMOJI.includes(emoji)||reactionBusy.has(key))return;
  if(!host.messages().some(m=>m.id===mid))return;reactionBusy.add(key);
  const before=host.reactions().filter(x=>x.message_id===mid&&x.user_id===id&&x.emoji===emoji),had=before.length>0;
  const without=()=>host.reactions().filter(x=>!(x.message_id===mid&&x.user_id===id&&x.emoji===emoji));
  host.setReactions(without().concat(had?[]:[{message_id:mid,user_id:id,who:name,emoji}]));changed();
  try{const sb=await host.client();if(!still(id))throw new Error('auth');if(had)await result(sb.from('reactions').delete().match({message_id:mid,user_id:id,emoji}));else await result(sb.from('reactions').insert({message_id:mid,user_id:id,who:name.slice(0,40),emoji}));}
  catch(e){if(still(id)){host.setReactions(without().concat(before));changed();}throw e;}
  finally{reactionBusy.delete(key);}
 }
 async function table(name,action){const id=uid();if(!id)throw new Error('auth');const sb=await host.client();if(!still(id))throw new Error('auth');const data=await result(action(sb.from(name),id));if(!still(id))throw new Error('auth');return data;}
 return {state,reload,send,remove,react,notify,reset,table,reactionBusy:(id,em)=>reactionBusy.has(id+':'+em)};
}
if(typeof module==='object'&&module.exports)module.exports={create};else root.LowiCommunityCloud={create};
})(typeof window==='object'?window:globalThis);
