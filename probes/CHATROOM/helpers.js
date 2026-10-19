/* Oct 19 community room (E-man: "the chat looks so boring ... it actually takes them to a community chat room"): the Chat view is a
   room with a header (title, real voices in the last 24 h, connection state), recent real speakers and day markers. Counts only real,
   unblocked members from the loaded history; bots and demos never count, and nothing claims who is online. */
function dayKey(ts){const d=new Date(+ts||0);return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();}
function dayName(ts){const d=new Date(+ts||0),n=new Date(),y=new Date(n.getFullYear(),n.getMonth(),n.getDate()-1);if(dayKey(d)===dayKey(n))return tr('today');if(dayKey(d)===dayKey(y))return tr('yesterday');
 try{return d.toLocaleDateString(['en','de','es'][Math.max(0,lang())],Object.assign({weekday:'short',day:'numeric',month:'short'},d.getFullYear()!==n.getFullYear()?{year:'numeric'}:{}));}catch(e){return d.toDateString();}}
function dayLine(m,prev){if(!(+m.ts)||(prev&&dayKey(prev.ts)===dayKey(m.ts)))return '';return '<div class="cr-day" role="separator"><span>'+esc(dayName(m.ts))+'</span></div>';}
function roomPeople(ms){const real=ms.filter(x=>x&&x.uid&&!x.demo&&!x.bot&&!x.local&&!x.status&&!blocked(x.uid)),since=Date.now()-864e5,voices=new Set(),crew=[],seen=new Set();
 for(const x of real)if(+x.ts>=since)voices.add(x.uid);
 for(let i=real.length-1;i>=0&&crew.length<8;i--){const x=real[i];if(x.uid===scope||seen.has(x.uid))continue;seen.add(x.uid);crew.push({uid:x.uid,n:x.by||''});}
 return {voices:voices.size,crew};}
function roomHead(q,ms,state){const rp=roomPeople(ms),meta=q('#crMeta'),link=q('#crLink'),crew=q('#crCrew');
 if(meta){const t=rp.voices===1?tr('roomVoice'):rp.voices>1?fill('roomVoices',rp.voices):tr('roomOpen');if(meta.textContent!==t)meta.textContent=t;}
 if(link){const k={live:'linkLive',connecting:'linkSync',loading:'linkSync',offline:'linkOff',error:'linkErr',auth:'linkAuth'}[state]||'linkLive',h='<i aria-hidden="true"></i>'+esc(tr(k));if(link.dataset)link.dataset.state=state;if(link.innerHTML!==h)link.innerHTML=h;}
 if(crew){const h=rp.crew.length?'<span class="cr-crewl">'+esc(tr('roomCrew'))+'</span><div class="cr-crews">'+rp.crew.map(p=>button('profile',mate(p.uid,'cr'+sid(p.uid)),'data-uid="'+esc(p.uid)+'" data-name="'+esc(p.n)+'" aria-label="'+esc(p.n)+' · '+tr('profile')+'" style="--chat-color:'+hueColor(p.uid,false)+'"','cr-mate')).join('')+'</div>':'';if(crew.__html!==h){crew.innerHTML=h;crew.__html=h;}}}
