// Live backend check for the auth-handoff edge function (not part of the offline suite: needs network + a service key in env).
// Usage: SB_SERVICE=... node tests/handoff-live.cjs   (creates and deletes its own throwaway accounts; prints no tokens or codes)
const URL = "https://vnfwmifmsfecascwaody.supabase.co";
const ANON = "sb_publishable_iVA3wCYxzfWu2q8SSgieWw_adXbx4Qd";
const SVC = process.env.SB_SERVICE;
const assert = require("node:assert/strict");
const FN = URL + "/functions/v1/auth-handoff";
const j = (r) => r.json().catch(() => ({}));
async function adm(path, method, body) {
  const r = await fetch(URL + "/auth/v1/admin/" + path, { method, headers: { apikey: SVC, Authorization: "Bearer " + SVC, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await j(r) };
}
async function pw(email, password) {
  const r = await fetch(URL + "/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  return j(r);
}
async function fn(body, tok) {
  const h = { apikey: ANON, "Content-Type": "application/json", Origin: "https://therealetm.github.io" };
  if (tok) h.Authorization = "Bearer " + tok;
  const r = await fetch(FN, { method: "POST", headers: h, body: JSON.stringify(body) });
  return { status: r.status, body: await j(r), cors: r.headers.get("access-control-allow-origin") };
}
async function verify(token_hash) {
  const r = await fetch(URL + "/auth/v1/verify", { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash }) });
  return { status: r.status, body: await j(r) };
}
(async () => {
  if (!SVC) throw new Error("SB_SERVICE missing");
  const tag = Date.now().toString(36);
  const mk = async (n) => { const email = "handoff-test-" + n + "-" + tag + "@example.com", password = "T" + Math.random().toString(36).slice(2) + "x9!";
    const c = await adm("users", "POST", { email, password, email_confirm: true }); assert.equal(c.status, 200, "create user"); return { id: c.body.id, email, password }; };
  const A = await mk("a"), B = await mk("b");
  const ids = [A.id, B.id];
  try {
    const sa = await pw(A.email, A.password), sbb = await pw(B.email, B.password);
    assert.ok(sa.access_token && sbb.access_token, "password sign-in");
    // 1 issue + redeem -> session for the SAME user
    let i = await fn({ action: "issue" }, sa.access_token);
    assert.equal(i.status, 200, "issue " + JSON.stringify(i.body)); assert.match(i.body.code, /^[2-9A-HJKMNP-Z]{12}$/); assert.equal(i.body.expires_in, 1800); assert.equal(i.cors, "https://therealetm.github.io");
    const codeA = i.body.code;
    let r = await fn({ action: "redeem", code: "LOWiSPIKE: LOWI-" + codeA.slice(0, 4) + "-" + codeA.slice(4, 8) + "-" + codeA.slice(8) });
    assert.equal(r.status, 200, "redeem " + JSON.stringify(r.body)); assert.ok(r.body.token_hash && !r.body.access_token && !r.body.refresh_token, "only a token hash comes back");
    let v = await verify(r.body.token_hash);
    assert.equal(v.status, 200, "verify " + JSON.stringify(v.body).slice(0,200)); assert.equal(v.body.user.id, A.id, "session belongs to A"); assert.ok(v.body.refresh_token);
    console.log("ok issue -> redeem -> verify gives A's own session");
    // 2 single use
    r = await fn({ action: "redeem", code: codeA }); assert.equal(r.status, 410); console.log("ok code is single use");
    // 3 token hash single use
    // 4 B's code gives B, never A (no cross-user leak)
    i = await fn({ action: "issue" }, sbb.access_token); r = await fn({ action: "redeem", code: i.body.code }); v = await verify(r.body.token_hash);
    assert.equal(v.body.user.id, B.id); console.log("ok B's code gives B only");
    // 5 new code retires the previous open one
    const c1 = (await fn({ action: "issue" }, sa.access_token)).body.code; const c2 = (await fn({ action: "issue" }, sa.access_token)).body.code;
    assert.equal((await fn({ action: "redeem", code: c1 })).status, 410); assert.equal((await fn({ action: "redeem", code: c2 })).status, 200); console.log("ok newer code retires older");
    // 6 revoke (sign out) kills the open code
    const c3 = (await fn({ action: "issue" }, sa.access_token)).body.code; assert.equal((await fn({ action: "revoke" }, sa.access_token)).status, 200);
    assert.equal((await fn({ action: "redeem", code: c3 })).status, 410); console.log("ok revoke kills open code");
    // 7 expiry
    const c4 = (await fn({ action: "issue" }, sa.access_token)).body.code;
    await fetch(URL + "/rest/v1/auth_handoff?user_id=eq." + A.id + "&used_at=is.null", { method: "PATCH", headers: { apikey: SVC, Authorization: "Bearer " + SVC, "Content-Type": "application/json" }, body: JSON.stringify({ expires_at: new Date(Date.now() - 1000).toISOString() }) });
    assert.equal((await fn({ action: "redeem", code: c4 })).status, 410); console.log("ok expired code refused");
    // 8 no auth / bad token / garbage code
    assert.equal((await fn({ action: "issue" })).status, 401); assert.equal((await fn({ action: "issue" }, "nope")).status, 401);
    assert.equal((await fn({ action: "redeem", code: "hello" })).status, 400); assert.equal((await fn({ action: "redeem", code: "ABCDEFGHJKMN" })).status, 410);
    console.log("ok no auth, bad token, garbage code refused");
    // 9 anonymous guest cannot issue
    const an = await j(await fetch(URL + "/auth/v1/signup", { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ data: {} }) }));
    if (an.user && an.user.id) ids.push(an.user.id);
    assert.ok(an.access_token, "anon sign-up"); assert.equal((await fn({ action: "issue" }, an.access_token)).status, 403); console.log("ok anonymous guest cannot issue");
    // 10 table is closed to the public keys
    const pub = await fetch(URL + "/rest/v1/auth_handoff?select=*", { headers: { apikey: ANON, Authorization: "Bearer " + sa.access_token } });
    const pb = await j(pub); assert.ok(pub.status >= 400 || (Array.isArray(pb) && pb.length === 0), "table not readable"); console.log("ok auth_handoff not readable with user keys (" + pub.status + ")");
    // 11 stored as hashes
    const rows = await j(await fetch(URL + "/rest/v1/auth_handoff?select=code_hash&user_id=eq." + A.id, { headers: { apikey: SVC, Authorization: "Bearer " + SVC } }));
    assert.ok(rows.length && rows.every((x) => /^[0-9a-f]{64}$/.test(x.code_hash) && x.code_hash !== codeA)); console.log("ok only hashes stored");
    console.log("ALL LIVE CHECKS PASSED");
  } finally {
    for (const id of ids) await adm("users/" + id, "DELETE");
    console.log("cleaned up", ids.length, "test accounts");
  }
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
