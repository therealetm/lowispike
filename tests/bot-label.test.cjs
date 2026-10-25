'use strict';
/* 23 Oct 2026, 11:40 PM (Emmanuel, call): bots in the chat rooms are clearly marked with "a dash and then bot" next to the name.
   Only confirmed bots: the made-up galaxy companions (uid 'bot:...' listed by LowiGalaxy.bots()) and accounts the server flags
   (profiles.bot, LowiBotAccounts from bot-accounts.js). Never by name, never you, never twice. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const ui=read('tests/community-chat-ui.test.cjs');
const fixture=new Function('require','assert','fs','vm','path','__dirname','K',ui.slice(ui.indexOf('function fixture(){'),ui.indexOf('\ntest('))+'\nreturn fixture;')(require,assert,fs,vm,path,path.join(__dirname),require('../community-chat-core.js'));
/* the server list, the way bot-accounts.js exposes it: ids only */
const botAccounts=ids=>{const s=new Set(ids);return {isBot:p=>s.has(String(p&&typeof p==='object'?(p.uid||p.id||''):p||''))};};
const msg=(id,uid,by,extra)=>Object.assign({id,uid,by,t:'Lunch: lentils and greens',ts:Date.now(),rx:{}},extra||{});

test('a server-flagged bot reads "Name - bot" in the room; a real person with the same kind of name does not',()=>{
 const f=fixture();f.scope('me1');f.win.LowiBotAccounts=botAccounts(['crowd-7']);
 const bot=f.win.LowiCommunity.messageHTML(msg('m1','crowd-7','Lena'),[]);
 assert.match(bot,/<b class="cs-name"[^>]*>Lena<\/b><span class="cs-botd" data-bot="1"> - bot<\/span>/);
 const human=f.win.LowiCommunity.messageHTML(msg('m2','real-1','Lena'),[]);
 assert.match(human,/<b class="cs-name"[^>]*>Lena<\/b>/);assert.doesNotMatch(human,/cs-botd|- bot/,'same name, real account: no mark');
});
test('never inferred from the name: "Botty", "Bot" or "Mia Test 8263" without the server flag stay unmarked',()=>{
 const f=fixture();f.scope('me1');f.win.LowiBotAccounts=botAccounts([]);
 for(const n of ['Botty','Bot','Mia Test 8263','Jonas','Galaxy bot'])assert.doesNotMatch(f.win.LowiCommunity.messageHTML(msg('x'+n,'u-'+n,n),[]),/cs-botd/,n);
 const L=f.win.LowiBotLabel;assert.equal(L.isBot('u-Botty'),false);assert.equal(L.name('Mia Test 8263','u-mia',0),'Mia Test 8263');
});
test('no server list (old database, offline): nobody is marked and nothing breaks',()=>{
 const f=fixture();f.scope('me1');delete f.win.LowiBotAccounts;
 assert.doesNotMatch(f.win.LowiCommunity.messageHTML(msg('m3','crowd-7','Lena'),[]),/cs-botd/);
 f.win.LowiBotAccounts={isBot(){throw new Error('broken');}};
 assert.doesNotMatch(f.win.LowiCommunity.messageHTML(msg('m4','crowd-7','Lena'),[]),/cs-botd/,'a throwing list never marks');
});
test('you are never marked, even if your own id were on the list',()=>{
 const f=fixture();f.scope('me1');f.win.LowiBotAccounts=botAccounts(['me1']);
 assert.doesNotMatch(f.win.LowiCommunity.messageHTML(msg('m5','me1','Fixture A'),[]),/cs-botd|- bot/);
 assert.equal(f.win.LowiBotLabel.isBot('me1'),false);
});
test('no duplicate suffix: a name that already ends in "- bot" is not marked twice',()=>{
 const f=fixture();f.scope('me1');f.win.LowiBotAccounts=botAccounts(['crowd-8']);const L=f.win.LowiBotLabel;
 for(const n of ['Kai - bot','Kai -bot','Kai-Bot','Kai – bot'])assert.equal(L.name(n,'crowd-8',0),n,n);
 assert.equal(L.name('Kai','crowd-8',0),'Kai - bot');assert.equal(L.name('Kai','crowd-8',1),'Kai - Bot');assert.equal(L.name('Kai','crowd-8',2),'Kai - bot');
 assert.doesNotMatch(f.win.LowiCommunity.messageHTML(msg('m6','crowd-8','Kai - bot'),[]),/cs-botd/);
});
test('names are escaped: a bot name with markup cannot inject HTML next to the mark',()=>{
 const f=fixture();f.scope('me1');f.win.LowiBotAccounts=botAccounts(['crowd-9']);
 const h=f.win.LowiCommunity.messageHTML(msg('m7','crowd-9','<img src=x onerror=alert(1)>'),[]);
 assert.doesNotMatch(h,/<img src=x/);assert.match(h,/&lt;img src=x onerror=alert\(1\)&gt;<\/b><span class="cs-botd"/);
});
test('reply quotes and the avatar label carry the mark too',()=>{
 const f=fixture();f.scope('me1');f.win.LowiBotAccounts=botAccounts(['crowd-7']);
 const orig=msg('q1','crowd-7','Lena'),reply=msg('q2','real-1','Tom',{re:'q1'});
 const h=f.win.LowiCommunity.messageHTML(reply,[orig,reply]);assert.match(h,/class="cm-quote"><b>Lena - bot<\/b>/);
 assert.match(f.win.LowiCommunity.messageHTML(orig,[]),/aria-label="Lena - bot · /);
});
/* Oct 25 (Emmanuel: "remove the bots from the galaxy"): the made-up galaxy bots are still bots by id and their chat lines still say
   "- bot", but they no longer get a body in the galaxy at all, so no "Name - bot" name label is drawn there */
test('galaxy bots: the chat line still says "- bot", but no bot has a body or a "- bot" name in the galaxy',()=>{
 const f=fixture();f.scope('a');const b=f.win.LowiCommunity.bots()[0];assert.ok(b&&b.uid.startsWith('bot:'));
 assert.equal(f.win.LowiBotLabel.isBot(b.uid),true);assert.equal(f.win.LowiBotLabel.isBot('bot:not-a-real-one'),false,'a made-up bot: id is not enough');
 for(const x of f.win.LowiCommunity.bots()){assert.ok(!f.nodes.cgField.innerHTML.includes('data-uid="'+x.uid+'"'),x.n+' has no body');assert.doesNotMatch(f.nodes.cgField.innerHTML,new RegExp('<span class="cg-name">'+x.n+'( - bot)?</span>'));}
 const js=read('community-chat.js');assert.match(js,/'<b class="cs-name">'\+esc\(m\.by\)\+'<\/b>'\+botDash\(m\.uid,m\.by\)/);
});
test('the server list arriving repaints the room (lowi-bots event)',()=>{
 const js=read('community-chat.js');
 assert.match(js,/addEventListener\('lowi-bots',\(\)=>refresh\(\)\)/);
});
test('iPhone/iPad layout: the mark stays on the name line, never wraps alone, quieter than the name, in both chat styles',()=>{
 const tg=read('community-tg.css'),room=read('community-room.css'),gal=read('community-galaxy.css');
 assert.match(tg,/\.cr-room \.cp-msg \.cs-by \.cs-botd\{display:inline;white-space:nowrap;font-size:13\.5px!important/);
 assert.match(room,/\.cs-botd\{flex:none;white-space:nowrap/);assert.match(room,/\.cs-by:has\(\.cs-botd\) \.cs-name\{flex:0 1 auto\}/);
 assert.match(gal,/\.cs-sheet h2 \.cs-botd\{white-space:nowrap/);
});
test('test accounts from our own Circles check scripts (Lena, Jonas, Mia Test ####) are never labeled "- bot", even if a list wrongly had them',()=>{
 const f=fixture();f.scope('me1');const list=botAccounts(['t-lena','t-jonas','t-mia','crowd-1']);list.isTest=u=>['t-lena','t-jonas','t-mia'].includes(String(u));f.win.LowiBotAccounts=list;
 for(const [u,n] of [['t-lena','Lena'],['t-jonas','Jonas'],['t-mia','Mia Test 8263']])assert.doesNotMatch(f.win.LowiCommunity.messageHTML(msg('t'+u,u,n),[]),/cs-botd|- bot/,n);
 assert.match(f.win.LowiCommunity.messageHTML(msg('c1','crowd-1','Kai'),[]),/cs-botd/,'a real flagged bot still is');
 delete list.isTest;f.win.LowiTestAccounts={isTestAccount:u=>u==='t-mia'};assert.equal(f.win.LowiBotLabel.isBot('t-mia'),false,'a separate test-account list works too');
});
test('real people like Antje and Emmanuel are never labeled',()=>{
 const f=fixture();f.scope('me1');f.win.LowiBotAccounts=botAccounts(['crowd-1']);
 for(const [u,n] of [['u-antje','Antje'],['u-eman','Emmanuel'],['u-eman2','Eman']]){assert.doesNotMatch(f.win.LowiCommunity.messageHTML(msg('h'+u,u,n),[]),/cs-botd|- bot/,n);assert.equal(f.win.LowiBotLabel.name(n,u,1),n);}
});
