/* LOWiSPIKE community inspiration bot "Nibblo" (DOM side).
 * Gives community-chat.js one local timeline line per day (lines()) and
 * renders it (render()). The card is built on this phone from
 * inspo-core.js: no server post, no push, no unread count, no poll. */
(function(W){
  'use strict';
  const D=W.document;
  const FIRST_KEY='lowispike.inspo.first';
  const SEEN_KEY='lowispike.inspo.seen';
  function core(){return W.LowiInspoCore;}
  function lang(){try{const l=(W.LowiLang&&W.LowiLang.get())||localStorage.getItem('lowispike.lang')||'en';return ['en','de','es'].indexOf(l)<0?'en':l;}catch(e){return 'en';}}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function state(){try{return JSON.parse(localStorage.getItem('lowispike.v2')||'{}')||{};}catch(e){return {};}}
  function myName(S){try{return (W.S&&W.S.user&&W.S.user.name)||(S.user&&S.user.name)||'';}catch(e){return '';}}
  /* Oldest thing this account has done (its ledger) or, failing that, the
   * first time this phone showed the card. Only drives the welcome line. */
  function firstSeen(S,now){
    let first=0;
    try{const led=(W.S&&W.S.ledger)||S.ledger||[];for(const e of led){const t=Number(e&&e.ts);if(t>0&&(!first||t<first))first=t;}}catch(e){}
    let mine=0;try{mine=Number(localStorage.getItem(FIRST_KEY))||0;if(!mine){mine=now;localStorage.setItem(FIRST_KEY,String(now));}}catch(e){}
    if(first&&mine)return Math.min(first,mine);
    return first||mine;
  }
  function lines(opts){
    const C=core();if(!C)return [];
    const now=Date.now();const S=state();
    // Only once someone has actually finished setting up the app.
    if(S&&S.onboarded===false)return [];
    const c=C.card({now,lang:(opts&&opts.lang)||lang(),name:myName(S),newMember:C.isNew(firstSeen(S,now),now)});
    if(c.ts>now)return [];
    /* The card arrives the first time this phone shows the room that day and
     * keeps that spot, like a message that came in then; it never jumps to the
     * bottom again and never stacks a second card for the same day. */
    try{const seen=JSON.parse(localStorage.getItem(SEEN_KEY)||'null');
      if(seen&&seen.day===c.day&&seen.ts>=c.ts&&seen.ts<=now)c.ts=seen.ts;
      else{c.ts=now;localStorage.setItem(SEEN_KEY,JSON.stringify({day:c.day,ts:now}));}
    }catch(e){c.ts=now;}
    c.inspo=true;c.local=true;
    return [c];
  }
  const AV='<svg class="ins-av-svg" viewBox="0 0 40 40" aria-hidden="true" focusable="false">'+
    '<defs><radialGradient id="insGlass" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".55" stop-color="#bfe9ff" stop-opacity=".18"/><stop offset="1" stop-color="#7fd0ff" stop-opacity=".10"/></radialGradient></defs>'+
    '<circle cx="20" cy="20" r="18.5" fill="url(#insGlass)" stroke="rgba(255,255,255,.7)" stroke-width="1.2"/>'+
    '<path d="M20 30 C20 25 20 22 20 19" stroke="#2fbf71" stroke-width="2" stroke-linecap="round" fill="none"/>'+
    '<path d="M20 21 C15 21 12 18 12 13 C17 13 20 16 20 21Z" fill="#4cd98a"/>'+
    '<path d="M20 19 C20 14 23 11 28 11 C28 16 25 19 20 19Z" fill="#2fbf71"/>'+
    '<path d="M29 21.5 L30 24 L32.5 25 L30 26 L29 28.5 L28 26 L25.5 25 L28 24Z" fill="#ffd34d" stroke="#f2b705" stroke-width=".5"/>'+
    '<ellipse cx="13.5" cy="10.5" rx="4" ry="2" fill="#fff" opacity=".55" transform="rotate(-30 13.5 10.5)"/>'+
    '</svg>';
  function time(ts,l){try{return new Date(ts).toLocaleTimeString(l,{hour:'2-digit',minute:'2-digit'});}catch(e){return '';}}
  function render(m){
    if(!m||!m.swap)return '';
    const lb=m.label||{};const s=m.swap;const g=m.gold;
    let h='<article class="cm-msg cp-msg cp-start cp-end ins-msg" id="cm-'+esc(m.id)+'" data-inspo="1" data-who="'+esc(m.by)+'" aria-label="'+esc(lb.aria)+'">'+
      '<span class="cs-avatar cp-av ins-av" aria-hidden="true">'+AV+'</span>'+
      '<div class="cm-bub ins-bub">'+
      '<div class="ins-by"><b class="ins-name">'+esc(m.by)+'</b><span class="ins-bot">'+esc(lb.bot)+'</span></div>';
    if(m.welcome)h+='<p class="ins-welcome">'+esc(m.welcome)+'</p>';
    h+='<p class="ins-hi">'+esc(m.intro)+'</p>'+
      '<section class="ins-swap"><h4 class="ins-k">'+esc(lb.swap)+'</h4>'+
      '<div class="ins-row"><span class="ins-from"><small>'+esc(lb.craving)+'</small>'+esc(s.from)+'</span><span class="ins-arrow" aria-hidden="true">→</span>'+
      '<span class="ins-to"><small>'+esc(lb.tryIt)+'</small><span class="ins-e" aria-hidden="true">'+esc(s.e)+'</span> '+esc(s.to)+'</span></div>'+
      '<p class="ins-why">'+esc(s.why)+'</p><p class="ins-src">'+esc(lb.book)+'</p></section>';
    if(g){
      h+='<section class="ins-gold"><h4 class="ins-k ins-gk"><span aria-hidden="true">✦</span> '+esc(g.title)+' <small>'+esc(g.spotted)+'</small></h4>'+
        '<div class="ins-prod">'+(g.photo?'<img class="ins-img" src="'+esc(g.photo)+'" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">':'')+
        '<div class="ins-pt"><b>'+esc(g.name)+'</b><span>'+esc(g.brand)+' · '+esc(g.store)+'</span><span class="ins-nums">'+esc(g.nums)+'</span></div></div>'+
        '<p class="ins-why">'+esc(g.why)+'</p><p class="ins-src">'+esc(g.src)+'</p></section>';
    }
    h+='<div class="cm-foot"><time class="cm-time">'+esc(time(m.ts,m.lang))+'</time></div></div></article>';
    return h;
  }
  W.LowiInspo={lines,render,_firstSeen:firstSeen};
})(window);
