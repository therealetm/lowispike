// prints a fresh supabase session (JSON) for crowd member N (read-only use in probes; the probe blocks all writes)
const crypto=require('crypto'),fs=require('fs');
const SB='https://vnfwmifmsfecascwaody.supabase.co',KEY='sb_publishable_iVA3wCYxzfWu2q8SSgieWw_adXbx4Qd';
const SEED=fs.readFileSync(process.env.HOME+'/.config/lowispike-crowd/seed','utf8').trim();
const i=+(process.argv[2]||29),email='crowd'+String(i).padStart(3,'0')+'@crowd.lowispike.invalid',pw='C!'+crypto.createHmac('sha256',SEED).update('pw:'+i).digest('base64url').slice(0,28);
fetch(SB+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password:pw})}).then(r=>r.json()).then(s=>{if(!s.access_token){console.error(JSON.stringify(s));process.exit(1);}s.expires_at=s.expires_at||Math.floor(Date.now()/1000)+s.expires_in;process.stdout.write(JSON.stringify(s));});
