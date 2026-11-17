// 회원 현황 집계: GET → 숫자만 조회, POST(X-Room-Presence) → 익명 접속 기록 후 조회
import * as store from './lib/store.mjs';
import * as S from './lib/session.mjs';

export default async function handler(req) {
  const cookies = [];
  let guest = S.presenceId(req);
  if (req.method === 'POST' && req.headers.get('x-room-presence') === '1') {
    if (!guest) { guest = S.newGuestId(); cookies.push(S.presenceCookie(guest)); }
    await store.setJSON('presence:' + guest, Date.now());
  }
  const now = Date.now(), windowMs = 5 * 60e3;
  const memberKeys = await store.listKeys('member:');
  const members = memberKeys.length;
  const today = new Date(now + 9 * 36e5).toISOString().slice(0, 10); // KST
  let todayCount = 0;
  for (const key of memberKeys) { const m = await store.getJSON(key); if (m?.createdAt && new Date(Date.parse(m.createdAt) + 9 * 36e5).toISOString().slice(0, 10) === today) todayCount++; }
  let active = 0;
  for (const key of await store.listKeys('presence:')) {
    const ts = await store.getJSON(key);
    if (now - ts < windowMs) active++; else if (now - ts > 36e5) await store.del(key);
  }
  const h = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  for (const c of cookies) h.append('set-cookie', c);
  return new Response(JSON.stringify({ members, today: todayCount, activeBrowsers: active, asOf: new Date(now).toISOString(), windowMinutes: 5 }), { headers: h });
}
export const config = { path: '/.netlify/functions/room-community' };
