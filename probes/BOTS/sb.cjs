'use strict';
const URL = 'https://vnfwmifmsfecascwaody.supabase.co', KEY = 'sb_publishable_iVA3wCYxzfWu2q8SSgieWw_adXbx4Qd';
async function j(r){ const t = await r.text(); let b; try { b = t ? JSON.parse(t) : null; } catch(e){ b = t; } if (!r.ok) { const e = new Error(r.status + ' ' + (typeof b === 'string' ? b : JSON.stringify(b)).slice(0, 300)); e.status = r.status; throw e; } return b; }
async function anon(){ return j(await fetch(URL + '/auth/v1/signup', { method:'POST', headers:{ apikey:KEY, 'Content-Type':'application/json' }, body: JSON.stringify({ data:{} }) })); }
async function refresh(rt){ return j(await fetch(URL + '/auth/v1/token?grant_type=refresh_token', { method:'POST', headers:{ apikey:KEY, 'Content-Type':'application/json' }, body: JSON.stringify({ refresh_token: rt }) })); }
function H(tok, extra){ return Object.assign({ apikey:KEY, Authorization:'Bearer ' + tok, 'Content-Type':'application/json' }, extra || {}); }
async function get(tok, path){ return j(await fetch(URL + '/rest/v1/' + path, { headers:H(tok) })); }
async function post(tok, table, row, upsert){ return j(await fetch(URL + '/rest/v1/' + table, { method:'POST', headers:H(tok, { Prefer: (upsert ? 'resolution=merge-duplicates,' : '') + 'return=representation' }), body: JSON.stringify(row) })); }
async function del(tok, path){ return j(await fetch(URL + '/rest/v1/' + path, { method:'DELETE', headers:H(tok) })); }
module.exports = { URL, KEY, anon, refresh, get, post, del };
