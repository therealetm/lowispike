import json, sys
r = json.load(open(sys.argv[1]))
print(r['how'], r['back'], 'still' if r['still'] else '', 'black' if r['black'] else '', r['errors'])
for s in r['out']:
    print(s['tag'], 'B' if s.get('black') else '-', s.get('dataTheme',''), s['t'], s['tab'], s['slide'], 'rw', s['rwShow'], s['rwVis'], round(s['rwOp'], 2), s['rwAnims'], 'bw3', s['bw3Vis'], s['w3'], 'pull', s['pull'], 'd', s.get('dist'), 'still', s.get('mvStill'), 'sc', s['scene'], s['cls'][:90], '|', s['guess'][:40], '|', s['bodyBg'], s['mvBg'])
