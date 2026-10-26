# Composes the 9:16 promo from the frame-stepped app recordings: gradient stage, phone, zooms, tap ripples, captions, end card.
# python3 compose.py en  -> raw frames piped to ffmpeg -> out/promo-en-video.mp4 (no audio)
import json, sys, math, subprocess, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
LANG=sys.argv[1] if len(sys.argv)>1 else 'en'
P='/home/sprite/PROMO'; FR=P+'/frames'; FPS=30; W,H=1080,1920
SPEC=json.load(open(f'{P}/spec-{LANG}.json'))
TOTAL=SPEC['total']
FONT='/home/sprite/ASO2/fonts/inter/extras/ttf/'
def F(w,s): return ImageFont.truetype(FONT+f'Inter-{w}.ttf',s)
INK=(20,20,51); ACC=(111,92,240); WHITE=(255,255,255)
# ---- stage background ----
def make_bg():
    y=np.linspace(0,1,H)[:,None]; x=np.linspace(0,1,W)[None,:]
    top=np.array([238,233,255]); bot=np.array([226,250,241])
    g=top[None,None,:]*(1-y[...,None])+bot[None,None,:]*y[...,None]
    g=np.broadcast_to(g,(H,W,3)).copy()
    def blob(cx,cy,r,col,a):
        d=np.sqrt((x-cx)**2*(W/H)**2+(y-cy)**2); m=np.clip(1-d/r,0,1)**2*a
        g[:]=g*(1-m[...,None])+np.array(col)[None,None,:]*m[...,None]
    blob(0.15,0.12,0.35,(200,190,255),0.55); blob(0.9,0.55,0.4,(190,240,225),0.6); blob(0.2,0.92,0.35,(215,205,255),0.5)
    return Image.fromarray(g.astype(np.uint8))
BG=make_bg()
# ---- phone geometry ----
CH=664; SB=47; VH=CH+SB  # Playwright iPhone 13 viewport is 390x664 css; we add a 47pt iOS status bar on top
SW=580; SH=round(SW*VH/390); BZ=16; PX=(W-SW)//2; PY=470; RAD=66
screen_mask=Image.new('L',(SW,SH),0); ImageDraw.Draw(screen_mask).rounded_rectangle([0,0,SW-1,SH-1],RAD,fill=255)
def phone_layer():
    L=Image.new('RGBA',(SW+2*BZ+60,SH+2*BZ+60),(0,0,0,0))
    sh=Image.new('RGBA',L.size,(0,0,0,0)); ImageDraw.Draw(sh).rounded_rectangle([30,40,30+SW+2*BZ,40+SH+2*BZ],RAD+BZ,fill=(40,30,90,90))
    sh=sh.filter(ImageFilter.GaussianBlur(22)); L.alpha_composite(sh)
    d=ImageDraw.Draw(L); d.rounded_rectangle([30,30,30+SW+2*BZ,30+SH+2*BZ],RAD+BZ,fill=(16,16,24,255))
    d.rounded_rectangle([31,31,29+SW+2*BZ,29+SH+2*BZ],RAD+BZ-1,outline=(70,70,90,255),width=2)
    return L
PHONE=phone_layer()
_cache={}
def src(scene,idx):
    d=f'{FR}/{scene}'; n=SPEC['nframes'][scene]; idx=max(1,min(n,int(round(idx))))
    k=(scene,idx)
    if k in _cache: return _cache[k]
    if len(_cache)>40: _cache.clear()
    fr=Image.open(f'{d}/f{idx:05d}.jpg').convert('RGB')
    im=Image.new('RGB',(1170,VH*3)); top=np.asarray(fr.crop((0,0,1170,6))).reshape(-1,3).mean(0).astype(int)
    im.paste(tuple(top),(0,0,1170,SB*3)); im.paste(fr,(0,SB*3)); status_bar(im,tuple(top)); _cache[k]=im; return im
def status_bar(im,bg):
    d=ImageDraw.Draw(im); lum=0.3*bg[0]+0.59*bg[1]+0.11*bg[2]; c=(255,255,255) if lum<140 else (0,0,0)
    d.rounded_rectangle([585-188,33,585+188,33+111],56,fill=(0,0,0))
    f=F('SemiBold',51); tw=d.textlength('9:41',font=f); d.text((228-tw/2,48),'9:41',font=f,fill=c)
    x=860
    for i in range(4): d.rounded_rectangle([x+i*18,96-(i+1)*9,x+i*18+12,96],3,fill=c)
    x=945; d.arc([x,52,x+51,103],225,315,fill=c,width=8); d.arc([x+12,64,x+39,91],225,315,fill=c,width=8); d.ellipse([x+21,79,x+30,88],fill=c)
    x=1015; d.rounded_rectangle([x,58,x+69,94],11,outline=c,width=3); d.rounded_rectangle([x+6,64,x+56,88],7,fill=c); d.rounded_rectangle([x+73,69,x+78,83],2,fill=c)
def ease(t): t=max(0,min(1,t)); return t*t*(3-2*t)
def seg_at(t):
    for s in SPEC['segs']:
        if s['a']<=t<s['b']: return s
    return None
def zoom_at(s,t):
    z,cx,cy=1.0,195,VH/2
    for zm in s.get('zoom',[]):
        a,b,zz,x,y=zm['a'],zm['b'],zm['z'],zm['x'],zm['y']; ramp=zm.get('ramp',0.45)
        if a<=t<=b:
            k=ease((t-a)/ramp) if t<a+ramp else (ease((b-t)/ramp) if (zm.get('out',True) and t>b-ramp) else 1)
            y=y+SB; z=1+(zz-1)*k; cx=195+(x-195)*k; cy=VH/2+(y-VH/2)*k
    return z,cx,cy
def screen_img(s,t):
    u=(t-s['a'])/(s['b']-s['a']); idx=s['fa']+(s['fb']-s['fa'])*u
    im=src(s['scene'],idx)
    z,cx,cy=zoom_at(s,t)
    # crop in css px (390xVH), image is 3x
    cw,ch=390/z,VH/z; x0=min(max(cx-cw/2,0),390-cw); y0=min(max(cy-ch/2,0),VH-ch)
    box=[int(x0*3),int(y0*3),int((x0+cw)*3),int((y0+ch)*3)]
    out=im.crop(box).resize((SW,SH),Image.LANCZOS)
    return out,(z,x0,y0,idx)
def draw_taps(img,s,info,t):
    z,x0,y0,idx=info; d=ImageDraw.Draw(img,'RGBA')
    for tp in SPEC['taps'].get(s['scene'],[]):
        age=(idx-tp['f'])/FPS/ max(0.4,(s['fb']-s['fa'])/FPS/(s['b']-s['a']))
        if -0.12<=age<=0.55:
            sx=(tp['x']-x0)*z*SW/390; sy=(tp['y']+SB-y0)*z*SH/VH
            if age<0:
                r=26; a=int(150*(1+age/0.12)); d.ellipse([sx-r,sy-r,sx+r,sy+r],fill=(255,255,255,a))
            else:
                k=age/0.55; r=26+44*k; a=int(200*(1-k))
                d.ellipse([sx-r,sy-r,sx+r,sy+r],outline=(255,255,255,a),width=6)
                r2=24*(1-k*0.6); d.ellipse([sx-r2,sy-r2,sx+r2,sy+r2],fill=(255,255,255,int(120*(1-k))))
# ---- captions ----
def wrap_words(words,font,maxw,draw):
    lines=[[]]; 
    for w in words:
        test=' '.join(x[0] for x in lines[-1]+[w])
        if lines[-1] and draw.textlength(test,font=font)>maxw: lines.append([w])
        else: lines[-1].append(w)
    return lines
def parse(text):
    out=[]
    for w in text.split(' '):
        hl=w.startswith('*') or w.endswith('*') or '*' in w
        out.append((w.replace('*',''),hl))
    # highlight spans between *...*
    res=[];on=False
    for w in text.split(' '):
        st=w.startswith('*'); en=w.endswith('*') and len(w)>1
        if st: on=True
        res.append((w.replace('*',''),on))
        if en: on=False
    return res
CAP_CACHE={}
def caption_img(text,size):
    k=(text,size)
    if k in CAP_CACHE: return CAP_CACHE[k]
    font=F('ExtraBold',size); tmp=Image.new('RGBA',(W,10)); d=ImageDraw.Draw(tmp)
    words=parse(text); lines=wrap_words(words,font,940,d)
    lh=int(size*1.16); hgt=lh*len(lines)+30
    im=Image.new('RGBA',(W,hgt),(0,0,0,0)); d=ImageDraw.Draw(im)
    sp=d.textlength(' ',font=font)
    for i,ln in enumerate(lines):
        tw=sum(d.textlength(w,font=font) for w,_ in ln)+sp*(len(ln)-1); x=(W-tw)/2; y=10+i*lh
        for w,hl in ln:
            d.text((x,y),w,font=font,fill=ACC if hl else INK); x+=d.textlength(w,font=font)+sp
    # soft white halo for contrast over anything
    a=im.split()[3].filter(ImageFilter.GaussianBlur(10)).point(lambda v:min(255,int(v*0.9)))
    halo=Image.new('RGBA',im.size,(255,255,255,0)); halo.putalpha(a)
    halo.alpha_composite(im); CAP_CACHE[k]=halo; return halo
CAP_TOP=170; CAP_BOTTOM=440
def draw_caption(frame,t):
    for c in SPEC['caps']:
        if c['a']<=t<c['b']:
            im=caption_img(c['t'],c.get('size',74))
            k=ease((t-c['a'])/0.16); ko=ease((c['b']-t)/0.10)
            sc=0.9+0.1*k; al=min(k,ko)
            w2,h2=int(im.width*sc),int(im.height*sc); im2=im.resize((w2,h2),Image.LANCZOS)
            if al<1:
                a=im2.split()[3].point(lambda v:int(v*al)); im2.putalpha(a)
            cy=(CAP_TOP+CAP_BOTTOM)//2
            frame.alpha_composite(im2,((W-w2)//2,cy-h2//2))
# ---- chips (language beat) ----
def draw_chips(frame,t):
    ch=SPEC.get('chips')
    if not ch or not(ch['a']<=t<ch['b']): return
    labels=ch['labels']; cur=int((t-ch['a'])/((ch['b']-ch['a'])/len(labels)))
    f=F('Bold',44); d=ImageDraw.Draw(frame)
    ws=[d.textlength(l,font=f)+64 for l in labels]; gap=20; x=(W-sum(ws)-gap*(len(ws)-1))/2; y=(CAP_TOP+CAP_BOTTOM)//2-38
    for i,l in enumerate(labels):
        on=i==cur; d.rounded_rectangle([x,y,x+ws[i],y+76],38,fill=ACC if on else (255,255,255),outline=None if on else (210,205,240),width=2)
        d.text((x+32,y+14),l,font=f,fill=WHITE if on else INK); x+=ws[i]+gap
# ---- brand chip and end card ----
ICON=Image.open(P+'/app/icon-512.png').convert('RGBA')
def rounded(im,r):
    m=Image.new('L',im.size,0); ImageDraw.Draw(m).rounded_rectangle([0,0,im.width-1,im.height-1],r,fill=255); im=im.copy(); im.putalpha(m); return im
ICON_R=rounded(ICON,112)
def end_card(frame,t):
    e=SPEC['end']; a=e['a']
    if t<a: return False
    k=ease((t-a)/0.5)
    ov=BG.copy().convert('RGBA'); 
    if k<1: ov.putalpha(int(255*k))
    frame.alpha_composite(ov)
    d=ImageDraw.Draw(frame)
    s=int(300*(0.8+0.2*ease((t-a-0.1)/0.45))); ic=ICON_R.resize((s,s),Image.LANCZOS)
    if k<1: ic.putalpha(ic.split()[3].point(lambda v:int(v*k)))
    frame.alpha_composite(ic,((W-s)//2,640-s//2))
    def ctext(txt,font,y,fill,t0):
        kk=ease((t-a-t0)/0.35)
        if kk<=0: return
        im=Image.new('RGBA',(W,font.size*2),(0,0,0,0)); dd=ImageDraw.Draw(im); tw=dd.textlength(txt,font=font)
        dd.text(((W-tw)/2,0),txt,font=font,fill=fill); 
        if kk<1: im.putalpha(im.split()[3].point(lambda v:int(v*kk)))
        frame.alpha_composite(im,(0,int(y+20*(1-kk))))
    ctext('LOWiSPIKE',F('Black',112),830,INK,0.25)
    ctext(e['tag'],F('Bold',54),975,(70,70,110),0.5)
    kk=ease((t-a-0.9)/0.35)
    if kk>0:
        f=F('ExtraBold',64); tw=d.textlength(e['cta'],font=f); pw=tw+120; pulse=1+0.04*math.sin((t-a)*6) if t>a+1.3 else 1
        bw,bh=int(pw*pulse),int(120*pulse); x0=(W-bw)//2; y0=1110+int(20*(1-kk))
        b=Image.new('RGBA',(bw,bh),(0,0,0,0)); bd=ImageDraw.Draw(b); bd.rounded_rectangle([0,0,bw-1,bh-1],bh//2,fill=ACC)
        bd.text(((bw-tw)/2,(bh-78)/2),e['cta'],font=f,fill=WHITE)
        if kk<1: b.putalpha(b.split()[3].point(lambda v:int(v*kk)))
        frame.alpha_composite(b,(x0,y0))
    ctext(e['url'],F('SemiBold',40),1290,(90,90,130),1.2)
    return True
def brand_chip(frame,t):
    b=SPEC.get('brand')
    if not b or not(b['a']<=t<b['b']): return
    k=ease((t-b['a'])/0.25); ko=ease((b['b']-t)/0.2); al=min(k,ko)
    s=int(150*(0.7+0.3*k)); ic=ICON_R.resize((s,s),Image.LANCZOS)
    if al<1: ic.putalpha(ic.split()[3].point(lambda v:int(v*al)))
    frame.alpha_composite(ic,((W-s)//2,CAP_BOTTOM+20))
def render(t):
    frame=BG.copy().convert('RGBA')
    s=seg_at(t)
    if s:
        # phone entrance
        pin=ease(t/0.35) if t<0.35 else 1
        oy=int((1-pin)*120)
        scr,info=screen_img(s,t)
        # push transition from previous segment
        tr=0.2
        if s.get('push') and t<s['a']+tr:
            prev=[x for x in SPEC['segs'] if abs(x['b']-s['a'])<1e-6]
            if prev:
                pimg,_=screen_img(prev[0],s['a']-0.001); k=ease((t-s['a'])/tr)
                comb=Image.new('RGB',(SW,SH)); comb.paste(pimg,(int(-SW*k),0)); comb.paste(scr,(int(SW*(1-k)),0)); scr=comb
        scr=scr.convert('RGBA'); draw_taps(scr,s,info,t)
        frame.alpha_composite(PHONE,(PX-BZ-30,PY-BZ-30+oy))
        scr.putalpha(screen_mask); frame.alpha_composite(scr,(PX,PY+oy))
    draw_caption(frame,t); draw_chips(frame,t); brand_chip(frame,t)
    end_card(frame,t)
    if SPEC['end']['a']<=t: 
        pass
    return frame.convert('RGB')
if __name__=='__main__':
    out=f'{P}/out/promo-{LANG}-video.mp4'; os.makedirs(P+'/out',exist_ok=True)
    only=os.environ.get('ONLY')
    if only:
        for tt in only.split(','): render(float(tt)).save(f'{P}/out/still-{LANG}-{tt}.png')
        sys.exit(0)
    n=int(round(TOTAL*FPS))
    ff=subprocess.Popen(['ffmpeg','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-r',str(FPS),out],stdin=subprocess.PIPE)
    for i in range(n):
        ff.stdin.write(render(i/FPS).tobytes())
        if i%150==0: print('frame',i,'/',n,flush=True)
    ff.stdin.close(); ff.wait(); print('done',out)
