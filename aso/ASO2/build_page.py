import base64, sys
sys.path.insert(0, '/home/sprite/ASO2')
from statusbar import statusbar
D = '/home/sprite/ASO2'
def b64(p, mime='image/png'):
    return f'data:{mime};base64,' + base64.b64encode(open(p, 'rb').read()).decode()
FONT = b64(f'{D}/fonts/inter/InterVariable.ttf', 'font/ttf')
ICON = b64('/home/sprite/lowispike/icon-512.png')
S1 = b64(f'{D}/out/02-screenshot-1.png'); S2 = b64(f'{D}/out/03-screenshot-2.png')
G = '#8a8a8e'
BLUE = '#0a7aff'

chev = '<svg width="12" height="20" viewBox="0 0 12 20"><path d="M10 2 2 10l8 8" fill="none" stroke="#111" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
share = '<svg width="20" height="25" viewBox="0 0 20 25"><path d="M10 15V2.5M5.5 6.5 10 2l4.5 4.5" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 9.5H4a2 2 0 0 0-2 2V21a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9.5a2 2 0 0 0-2-2h-2.5" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round"/></svg>'
star = '<svg width="11" height="11" viewBox="0 0 24 24"><path d="M12 2.2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.4l7.1-.6z" fill="#8a8a8e"/></svg>'
dev = '<svg width="26" height="26" viewBox="0 0 26 26"><rect x="1" y="1" width="24" height="24" rx="6" fill="none" stroke="#8a8a8e" stroke-width="1.8"/><circle cx="13" cy="10" r="4" fill="#8a8a8e"/><path d="M5.5 22c1-4 4-6 7.5-6s6.5 2 7.5 6" fill="#8a8a8e"/></svg>'

def tab(icon, label, color='#1c1c1e'):
    return f'<div class="tb"><div class="ti">{icon}</div><div class="tl" style="color:{color}">{label}</div></div>'
I_today = '<svg width="26" height="24" viewBox="0 0 26 24"><rect x="3" y="2" width="20" height="20" rx="4.5" fill="none" stroke="#1c1c1e" stroke-width="2"/><path d="M7 8h12M7 12.5h12M7 17h7" stroke="#1c1c1e" stroke-width="2" stroke-linecap="round"/></svg>'
I_games = '<svg width="28" height="24" viewBox="0 0 28 24"><path d="M8 6h12c3.6 0 6 2.8 6.6 7l.6 3.8c.4 2.6-1.3 4.2-3.3 4.2-1.4 0-2.3-.8-3.2-2l-1.2-1.6H8.5L7.3 19c-.9 1.2-1.8 2-3.2 2-2 0-3.7-1.6-3.3-4.2L1.4 13C2 8.8 4.4 6 8 6z" fill="none" stroke="#1c1c1e" stroke-width="2"/><path d="M8.5 10.5v4M6.5 12.5h4" stroke="#1c1c1e" stroke-width="2" stroke-linecap="round"/><circle cx="19" cy="11.3" r="1.4" fill="#1c1c1e"/><circle cx="21.6" cy="14" r="1.4" fill="#1c1c1e"/></svg>'
I_apps = '<svg width="26" height="24" viewBox="0 0 26 24"><path d="M13 2.5 23.5 8 13 13.5 2.5 8z" fill="none" stroke="#1c1c1e" stroke-width="2" stroke-linejoin="round"/><path d="M2.5 12.2 13 17.7l10.5-5.5M2.5 16.4 13 21.9l10.5-5.5" fill="none" stroke="#1c1c1e" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>'
I_arcade = '<svg width="26" height="24" viewBox="0 0 26 24"><circle cx="13" cy="6" r="3.8" fill="none" stroke="#1c1c1e" stroke-width="2"/><path d="M13 9.8v6" stroke="#1c1c1e" stroke-width="2"/><path d="M3 16.5 13 21.5l10-5L13 12z" fill="none" stroke="#1c1c1e" stroke-width="2" stroke-linejoin="round"/></svg>'
I_search = f'<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="10.2" cy="10.2" r="7" fill="none" stroke="{BLUE}" stroke-width="2.6"/><path d="m15.5 15.5 5.6 5.6" stroke="{BLUE}" stroke-width="2.8" stroke-linecap="round"/></svg>'

html = f"""<!doctype html><html><head><meta charset=utf-8><style>
@font-face{{font-family:Inter;src:url('{FONT}') format('truetype');font-weight:100 900}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:393px;height:852px;overflow:hidden;background:#fff;font-family:Inter;-webkit-font-smoothing:antialiased;color:#000;font-feature-settings:'cv11','ss03'}}
.gl{{position:absolute;top:55px;width:44px;height:44px;border-radius:22px;background:rgba(255,255,255,.92);box-shadow:0 0 0 .5px rgba(0,0,0,.07),0 2px 10px rgba(0,0,0,.10);display:flex;align-items:center;justify-content:center}}
.icon{{position:absolute;left:20px;top:114px;width:106px;height:106px;border-radius:24px;overflow:hidden;box-shadow:0 0 0 .5px rgba(0,0,0,.10)}}
.icon img{{width:100%;height:100%;display:block}}
.t{{position:absolute;left:141px;right:18px;top:112px;font:700 21px/25px Inter;letter-spacing:-.45px}}
.st{{position:absolute;left:141px;right:18px;top:164px;font:400 15px/19px Inter;letter-spacing:-.2px;color:{G}}}
.get{{position:absolute;left:141px;top:190px;width:70px;height:30px;border-radius:15px;background:{BLUE};color:#fff;font:700 15px/30px Inter;text-align:center;letter-spacing:-.1px}}
.iap{{position:absolute;left:220px;top:192px;font:400 10.5px/12.5px Inter;color:{G};letter-spacing:-.05px}}
.hr{{position:absolute;left:20px;right:0;height:.5px;background:#d6d6db}}
.info{{position:absolute;left:0;top:246px;height:76px;display:flex;white-space:nowrap}}
.cell{{width:96px;text-align:center;position:relative;flex:none}}
.cell+.cell:before{{content:'';position:absolute;left:0;top:12px;height:44px;width:.5px;background:#d6d6db}}
.lab{{font:600 10.5px/13px Inter;color:{G};letter-spacing:.35px;text-transform:uppercase;margin-top:8px}}
.val{{font:700 20px/24px Inter;color:#8a8a8e;margin-top:4px;letter-spacing:-.3px;height:26px;display:flex;align-items:center;justify-content:center}}
.cap{{font:500 12.5px/15px Inter;color:{G};margin-top:2px;letter-spacing:-.1px}}
.stars{{display:flex;gap:1.5px;justify-content:center;margin-top:4px}}
.shot{{position:absolute;top:340px;width:228px;height:{228*2796/1290:.1f}px;border-radius:24px;overflow:hidden;box-shadow:0 0 0 .5px rgba(0,0,0,.12)}}
.shot img{{width:100%;height:100%;display:block}}
.fade{{position:absolute;left:0;right:0;bottom:0;height:120px;background:linear-gradient(to bottom,rgba(255,255,255,0),rgba(255,255,255,.55))}}
.bar{{position:absolute;left:18px;bottom:26px;width:283px;height:62px;border-radius:31px;background:rgba(248,248,250,.78);-webkit-backdrop-filter:blur(18px) saturate(1.6);backdrop-filter:blur(18px) saturate(1.6);box-shadow:0 0 0 .5px rgba(0,0,0,.08),0 6px 22px rgba(0,0,0,.12);display:flex;justify-content:space-around;align-items:center;padding:0 8px}}
.srch{{position:absolute;right:18px;bottom:26px;width:62px;height:62px;border-radius:31px;background:rgba(248,248,250,.78);-webkit-backdrop-filter:blur(18px) saturate(1.6);backdrop-filter:blur(18px) saturate(1.6);box-shadow:0 0 0 .5px rgba(0,0,0,.08),0 6px 22px rgba(0,0,0,.12);display:flex;flex-direction:column;align-items:center;justify-content:center}}
.tb{{display:flex;flex-direction:column;align-items:center;width:64px}}
.ti{{height:26px;display:flex;align-items:center}}
.tl{{font:500 10px/12px Inter;margin-top:2px;letter-spacing:-.05px}}
.home{{position:absolute;left:50%;bottom:8px;width:136px;height:5px;margin-left:-68px;border-radius:3px;background:#000}}
</style></head><body>
{statusbar('#000','9:41',393)}
<div class=gl style="left:21px">{chev}</div>
<div class=gl style="left:330px">{share}</div>
<div class=icon><img src="{ICON}"></div>
<div class=t>LOWiSPIKE: Dein<br>Essens-Begleiter</div>
<div class=st>Gesund essen wird ein Spiel</div>
<div class=get>Get</div>
<div class=iap>In-App<br>Purchases</div>
<div class=hr style="top:242px"></div>
<div class=info>
 <div class=cell style="margin-left:16px"><div class=lab>3.6K Ratings</div><div class=val>4.9</div><div class=stars>{star*5}</div></div>
 <div class=cell><div class=lab>Age Rating</div><div class=val>9+</div><div class=cap>Years</div></div>
 <div class=cell><div class=lab>Chart</div><div class=val>No. 13</div><div class=cap>Health &amp; Fitness</div></div>
 <div class=cell><div class=lab>Developer</div><div class=val>{dev}</div><div class=cap>LOWiSPIKE</div></div>
</div>
<div class=hr style="top:328px"></div>
<div class=shot style="left:20px"><img src="{S1}"></div>
<div class=shot style="left:262px"><img src="{S2}"></div>
<div class=fade></div>
<div class=bar>{tab(I_today,'Today')}{tab(I_games,'Games')}{tab(I_apps,'Apps')}{tab(I_arcade,'Arcade')}</div>
<div class=srch><div class=ti>{I_search}</div><div class=tl style="color:{BLUE};font-weight:600">Search</div></div>
<div class=home></div>
</body></html>"""
open(f'{D}/html/page.html', 'w').write(html)
print('ok')
