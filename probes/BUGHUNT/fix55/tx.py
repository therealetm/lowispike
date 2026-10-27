import re,sys,glob,os
os.chdir(sys.argv[1])
files=[f for f in glob.glob('*.js')]+['index.html']
GUARD='(o => o && typeof o === "object" ? o : {})('
total=0;report=[]
for f in files:
    s=open(f,encoding='utf-8').read(); out=[]; i=0; n=0
    while True:
        j=s.find('JSON.parse(',i)
        if j<0: out.append(s[i:]); break
        # balanced parens
        k=j+len('JSON.parse('); depth=1; q=None
        while k<len(s) and depth:
            c=s[k]
            if q:
                if c=='\\': k+=1
                elif c==q: q=None
            elif c in '"\'`': q=c
            elif c=='(': depth+=1
            elif c==')': depth-=1
            k+=1
        call=s[j:k]
        m=re.match(r'\s*\|\|\s*\{\s*\}',s[k:])
        if m and ('getItem' in call or 'localStorage' in call) and s[max(0,j-len(GUARD)):j]!=GUARD:
            out.append(s[i:j]); out.append(GUARD+call+')'); i=k+m.end(); n+=1
            report.append(f"{f}:{s.count(chr(10),0,j)+1}")
        else:
            out.append(s[i:k]); i=k
    if n:
        open(f,'w',encoding='utf-8').write(''.join(out)); total+=n
print(total); print('\n'.join(report))
