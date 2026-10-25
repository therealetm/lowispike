/* End-to-end phone push through Mozilla's real push service (autopush), no browser needed.
   Acts as a phone: registers with wss://push.services.mozilla.com, saves the subscription with the live n1-push function,
   then waits for real pushes and decrypts them (RFC 8291 aes128gcm) with its own keys, exactly what a service worker does.
   1) "test": the same request as the Test button in Settings > Reminders.
   2) optional energy: with ENERGY_SQL_CMD set, runs that command (it links this subscription to a test account and inserts
      one energy_gifts row from another test account); the database trigger must make n1-push push it within a minute.
   Finally unsubscribes (the n1_push row is deleted). Usage: node tools/lis-push/mozilla-e2e.cjs [de|en|es] */
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');
const FN = 'https://vnfwmifmsfecascwaody.supabase.co/functions/v1/n1-push';
const LANG = process.argv[2] || 'de';
const b64u = b => Buffer.from(b).toString('base64url');
const hkdf = (salt, ikm, info, len) => Buffer.from(crypto.hkdfSync('sha256', ikm, salt, info, len));

const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
const uaPub = ecdh.getPublicKey(); const authSecret = crypto.randomBytes(16);

function decrypt(body) {
  const salt = body.subarray(0, 16), rs = body.readUInt32BE(16), idlen = body[20], asPub = body.subarray(21, 21 + idlen), ct = body.subarray(21 + idlen);
  const shared = ecdh.computeSecret(asPub);
  const ikm = hkdf(authSecret, shared, Buffer.concat([Buffer.from('WebPush: info\0'), uaPub, asPub]), 32);
  const cek = hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);
  const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.subarray(ct.length - 16));
  const pt = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  let end = pt.length - 1; while (end >= 0 && pt[end] === 0) end--; /* padding delimiter 0x02 */
  void rs; return pt.subarray(0, end).toString('utf8');
}

const ws = new WebSocket('wss://push.services.mozilla.com/');
const waiters = []; const got = [];
const send = o => ws.send(JSON.stringify(o));
const seen = new Set();
const next = (pred, ms) => new Promise((res, rej) => { const old = got.find(g => !seen.has(g) && pred(g)); if (old) { seen.add(old); return res(old); } const t = setTimeout(() => rej(new Error('timeout')), ms); waiters.push({ pred, res: v => { seen.add(v); clearTimeout(t); res(v); } }); });
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.messageType === 'notification') { send({ messageType: 'ack', updates: [{ channelID: m.channelID, version: m.version }] });
    try { m.plain = decrypt(Buffer.from(m.data, 'base64url')); } catch (e) { m.plain = 'DECRYPT FAILED ' + e.message; } got.push(m); }
  for (let i = 0; i < waiters.length; i++) if (waiters[i].pred(m)) { waiters.splice(i, 1)[0].res(m); break; }
};
const post = o => fetch(FN, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(o) }).then(r => r.json());

(async () => {
  await new Promise(r => ws.onopen = r);
  send({ messageType: 'hello', use_webpush: true, uaid: '', broadcasts: {} });
  await next(m => m.messageType === 'hello', 10000);
  const channelID = crypto.randomUUID();
  send({ messageType: 'register', channelID, key: undefined });
  const reg = await next(m => m.messageType === 'register', 10000);
  const endpoint = reg.pushEndpoint; console.log('subscribed:', endpoint.slice(0, 60) + '...');
  const sub = { endpoint, keys: { p256dh: b64u(uaPub), auth: b64u(authSecret) } };
  const st = { lang: LANG, tz: 'Europe/Berlin', tzo: -60, qs: 24, qe: 0, enabled: true, pillars: { a: false, b: false, c: true, d: false }, cn: 'QA Misty', seen: Date.now() - 864e5 };
  let ok = true;
  try {
    const t = await post({ a: 'test', sub, st }); console.log('test request:', JSON.stringify(t));
    const n1 = await next(m => m.messageType === 'notification', 30000);
    const p1 = JSON.parse(n1.plain); console.log('TEST PUSH RECEIVED + DECRYPTED:', JSON.stringify(p1));
    if (!p1.t || !p1.b) ok = false;
    if (process.env.ENERGY_SQL_CMD) {
      process.env.E2E_ENDPOINT = endpoint;
      const out = execSync(process.env.ENERGY_SQL_CMD, { env: process.env }).toString(); console.log('energy sql:', out.trim().slice(0, 300));
      const n2 = await next(m => m.messageType === 'notification', 90000);
      const p2 = JSON.parse(n2.plain); console.log('ENERGY PUSH RECEIVED + DECRYPTED:', JSON.stringify(p2));
      if (!/\u26a1/.test(p2.t) || p2.q !== 'community') ok = false;
    }
  } catch (e) { ok = false; console.log('FAILED:', e.message, 'received so far:', got.map(g => g.plain)); }
  const u = await post({ a: 'unsub', sub }); console.log('unsub:', JSON.stringify(u));
  send({ messageType: 'unregister', channelID }); setTimeout(() => { ws.close(); console.log(ok ? 'E2E PASS' : 'E2E FAIL'); process.exit(ok ? 0 : 1); }, 800);
})();
