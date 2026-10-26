import asyncio, edge_tts, json, sys
L=[('connie1','en-US-EmmaMultilingualNeural','Healthy food is so expensive... I don\'t even know what to buy.','-4%','+0Hz'),
   ('connie5','en-US-EmmaMultilingualNeural','Oh... that\'s actually easy.','-4%','+0Hz'),
   ('connie6','en-US-EmmaMultilingualNeural','Wait. That\'s less than I thought.','+0%','+0Hz'),
   ('connie9','en-US-EmmaMultilingualNeural','Okay... today was good.','-10%','+0Hz'),
   ('stranger7','en-US-ChristopherNeural','Oh! Thank you, dear.','-8%','-8Hz')]
async def one(k,v,t,r,p):
    c=edge_tts.Communicate(t,v,rate=r,pitch=p)
    await c.save(k+'.mp3')
async def main():
    await asyncio.gather(*[one(*x) for x in L])
asyncio.run(main())
