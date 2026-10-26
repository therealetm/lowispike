# Builds spec-<lang>.json for compose.py: scene segments timed to the voiceover (VO starts at O seconds).
import json,sys,os
LANG=sys.argv[1] if len(sys.argv)>1 else 'en'
P='/home/sprite/PROMO'; FR=P+'/frames'
def meta(s): return json.load(open(f'{FR}/{s}/meta.json'))
def nf(s): return meta(s)['frames']
C=json.load(open(f'{P}/caps-{LANG}.json'))
segs=C['segs']; scenes=sorted({x['scene'] for x in segs})
for x in segs:
    if x.get('fb')=='end': x['fb']=nf(x['scene'])
spec={'total':C['total'],'segs':segs,'nframes':{s:nf(s) for s in scenes},'taps':{s:meta(s).get('taps',[]) for s in scenes},
 'caps':C['caps'],'chips':C.get('chips'),'end':C['end'],'brand':None}
json.dump(spec,open(f'{P}/spec-{LANG}.json','w'),indent=1); print('ok',scenes)
