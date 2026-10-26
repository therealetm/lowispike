#!/usr/bin/env python3
# App Store product-page mockup (iPhone, light mode), clearly marked as a design concept.
A = '/home/sprite/ASO'
ICON = '/home/sprite/lowispike/icon-512.png'
O = A + '/out/'
CSS = r"""
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=block');
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1290px;height:2796px;overflow:hidden;background:#fff}
body{font-family:-apple-system,'Plus Jakarta Sans',system-ui,sans-serif;color:#000;-webkit-font-smoothing:antialiased;position:relative}
.status{height:150px;display:flex;align-items:flex-end;justify-content:space-between;padding:0 92px 26px 110px;font-weight:700;font-size:48px}
.status .r{display:flex;gap:18px;align-items:center}
.bars{display:flex;gap:6px;align-items:flex-end}.bars i{display:block;width:10px;background:#000;border-radius:3px}
.batt{width:78px;height:38px;border:3px solid rgba(0,0,0,.45);border-radius:12px;padding:3px}.batt i{display:block;height:100%;width:78%;background:#000;border-radius:6px}
.nav{height:120px;display:flex;align-items:center;padding:0 48px;color:#0A84FF;font-size:50px;font-weight:500}
.nav b{font-size:72px;font-weight:400;margin-right:12px;transform:translateY(-4px)}
.head{display:flex;gap:56px;padding:30px 60px 0}
.icon{width:360px;height:360px;border-radius:82px;overflow:hidden;box-shadow:0 0 0 2px rgba(0,0,0,.06),0 18px 40px rgba(50,40,140,.18)}
.icon img{width:100%;height:100%;display:block}
.meta{flex:1;display:flex;flex-direction:column;padding-top:14px}
.name{font-size:72px;font-weight:800;letter-spacing:-.02em}
.subt{font-size:44px;color:#8A8A8E;margin-top:8px;line-height:1.25}
.actions{margin-top:auto;display:flex;align-items:center;justify-content:space-between;padding-bottom:10px}
.cbtn{background:linear-gradient(100deg,#00AFD6,#5B6CFF 60%,#9A5CFF);color:#fff;font-weight:800;font-size:38px;letter-spacing:.06em;
 padding:20px 46px;border-radius:999px;box-shadow:0 10px 30px rgba(91,108,255,.35)}
.share{width:70px;height:70px;border-radius:50%;display:grid;place-items:center;color:#0A84FF;font-size:44px}
.info{margin:64px 60px 0;border-top:2px solid #E5E5EA;border-bottom:2px solid #E5E5EA;display:flex;padding:40px 0}
.info>div{flex:1;text-align:center;border-right:2px solid #E5E5EA;padding:0 10px}
.info>div:last-child{border-right:0}
.info .k{font-size:28px;font-weight:700;color:#8A8A8E;letter-spacing:.08em;text-transform:uppercase}
.info .v{font-size:50px;font-weight:800;color:#5D5D63;margin:16px 0 8px}
.info .s{font-size:30px;color:#8A8A8E}
.banner{margin:44px 60px 0;border-radius:36px;padding:30px 40px;background:linear-gradient(100deg,rgba(0,175,214,.10),rgba(154,92,255,.12));
 border:2px solid rgba(91,108,255,.25);display:flex;gap:28px;align-items:center;font-size:36px;line-height:1.35;color:#2E2F5A}
.banner b{color:#4B3FD1}
.shots{display:flex;gap:36px;padding:52px 0 0 60px;overflow:hidden}
.shots img{width:420px;height:910px;border-radius:44px;box-shadow:0 0 0 2px rgba(0,0,0,.06);flex:0 0 auto;object-fit:cover}
.iphone{display:flex;align-items:center;gap:14px;padding:34px 60px 0;font-size:34px;color:#8A8A8E}
.desc{padding:40px 60px 0;font-size:44px;line-height:1.42;color:#1C1C1E}
.more{color:#0A84FF}
.tabbar{position:absolute;left:0;right:0;bottom:0;height:250px;background:rgba(249,249,251,.94);border-top:2px solid #E5E5EA;
 display:flex;justify-content:space-around;padding-top:30px;font-size:28px;color:#8A8A8E}
.tabbar div{display:flex;flex-direction:column;align-items:center;gap:10px}
.tabbar i{display:block;width:70px;height:62px;border-radius:18px;background:#C7C7CC}
.tabbar .on{color:#0A84FF}.tabbar .on i{background:#0A84FF}
.home{position:absolute;bottom:26px;left:50%;transform:translateX(-50%);width:440px;height:16px;border-radius:10px;background:#000}
"""
html = f'''<!doctype html><html lang="de"><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="status"><span>9:41</span><div class="r"><div class="bars"><i style="height:14px"></i><i style="height:22px"></i><i style="height:30px"></i><i style="height:38px"></i></div><div class="batt"><i></i></div></div></div>
<div class="nav"><b>‹</b>Suchen</div>
<div class="head"><div class="icon"><img src="file://{ICON}"></div>
 <div class="meta"><div class="name">LOWiSPIKE</div><div class="subt">Gesund essen wird ein Spiel</div>
  <div class="actions"><div class="cbtn">DESIGNKONZEPT</div><div class="share">↑</div></div></div></div>
<div class="info">
 <div><div class="k">Kategorie</div><div class="v">♥</div><div class="s">Gesundheit</div></div>
 <div><div class="k">Sprachen</div><div class="v">DE</div><div class="s">+ 2 weitere</div></div>
 <div><div class="k">Begleiter</div><div class="v">Misty</div><div class="s">dein Avatar</div></div>
 <div><div class="k">Status</div><div class="v">Web-App</div><div class="s">noch nicht im Store</div></div>
</div>
<div class="banner"><div style="font-size:54px">✦</div><div><b>Designkonzept:</b> So könnte LOWiSPIKE im App Store aussehen. Die App ist dort nicht erhältlich, es gibt keine Bewertungen oder Downloads.</div></div>
<div class="shots"><img src="file://{O}01-misty.png"><img src="file://{O}02-scan.png"><img src="file://{O}03-essenspause.png"></div>
<div class="iphone">▯ iPhone</div>
<div class="desc">Kümmere dich um Misty, deinen leuchtenden Begleiter. Echte Mahlzeiten, Wasser und Bewegung geben ihr Energie. &hellip; <span class="more">mehr</span></div>
<div class="tabbar"><div><i></i>Heute</div><div><i></i>Spiele</div><div><i></i>Apps</div><div><i></i>Arcade</div><div class="on"><i></i>Suchen</div></div>
<div class="home"></div>
</body></html>'''
open(A + '/html/00-listing.html', 'w').write(html)
print('ok')
