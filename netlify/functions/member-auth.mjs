// 회원 인증 API (Netlify Functions v2). 경로: /.netlify/functions/member-auth/<route>
//  GET  /session          현재 세션 + CSRF 토큰
//  GET  /referral?ref=    추천 코드 → 표시 이름
//  GET  /nickname?value=  닉네임 중복 확인      GET /login-id?value=  아이디 중복 확인
//  GET  /start/kakao      카카오 로그인 시작(303 → kauth.kakao.com)
//  GET  /callback/kakao   카카오 콜백(code 교환 → 회원 조회/생성 → 세션 쿠키 → 사이트로 복귀)
//  POST /register /login /logout /profile   일반 가입·로그인·로그아웃·회원정보 저장
//  GET  /materials        회원 전용 자료 목록(비회원 401)
import * as store from './lib/store.mjs';
import * as S from './lib/session.mjs';
import { FULL_MATERIALS } from './lib/materials.mjs';

const json = (data, status = 200, headers = []) => {
  const h = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  for (const c of headers) h.append('set-cookie', c);
  return new Response(JSON.stringify(data), { status, headers: h });
};
const redirect = (location, cookies = []) => {
  const h = new Headers({ location, 'cache-control': 'no-store' });
  for (const c of cookies) h.append('set-cookie', c);
  return new Response(null, { status: 303, headers: h });
};
const siteURL = () => (process.env.SITE_URL || process.env.URL || 'http://localhost:8888').replace(/\/$/, '');
const normNick = v => String(v || '').normalize('NFKC').trim();
const normId = v => String(v || '').normalize('NFKC').trim().toLowerCase();
const NICK_RE = /^[\w가-힣]{2,20}$/u, ID_RE = /^[a-z0-9_]{2,20}$/, PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;

function publicMember(m) {
  if (!m) return null;
  return { id: m.id, name: m.name || '', phone: m.phone || '', nickname: m.nickname || '', login_id: m.loginId || '', createdAt: m.createdAt };
}
async function sessionPayload(req) {
  let guest = S.guestId(req); const cookies = [];
  if (!guest) { guest = S.newGuestId(); cookies.push(S.guestCookie(guest)); }
  const id = S.currentMemberId(req);
  const member = id ? await store.getJSON('member:' + id) : null;
  return { cookies, guest, data: member
    ? { authenticated: true, csrf: S.csrfFor(guest), provider: member.provider, member: publicMember(member) }
    : { authenticated: false, csrf: S.csrfFor(guest) } };
}
function checkCSRF(req) {
  const guest = S.guestId(req);
  return guest && req.headers.get('x-room-csrf') === S.csrfFor(guest);
}
function referralLabel(slug) {
  try { const map = JSON.parse(process.env.REFERRALS || '{}'); return typeof map[slug] === 'string' ? map[slug] : null; } catch { return null; }
}
async function createMember(fields) {
  const id = S.newGuestId().slice(0, 16);
  const member = { id, createdAt: new Date().toISOString(), ...fields };
  await store.setJSON('member:' + id, member);
  return member;
}

export default async function handler(req) {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^.*\/member-auth/, '') || '/';
  const method = req.method;
  try {
    if (method === 'GET' && route === '/session') { const s = await sessionPayload(req); return json(s.data, 200, s.cookies); }

    if (method === 'GET' && route === '/referral') {
      const ref = url.searchParams.get('ref'); const label = ref ? referralLabel(ref) : null;
      return json(label ? { slug: ref, label } : { slug: null, label: null });
    }
    if (method === 'GET' && route === '/nickname') {
      const nickname = normNick(url.searchParams.get('value'));
      if (!NICK_RE.test(nickname)) return json({ error: '닉네임은 한글·영문·숫자·밑줄 2~20자여야 합니다.' }, 400);
      const taken = await store.getJSON('index:nick:' + nickname.toLowerCase());
      return json({ available: !taken, nickname });
    }
    if (method === 'GET' && route === '/login-id') {
      const loginId = normId(url.searchParams.get('value'));
      if (!ID_RE.test(loginId)) return json({ error: '아이디는 영문 소문자·숫자·밑줄 2~20자여야 합니다.' }, 400);
      return json({ available: !(await store.getJSON('index:login:' + loginId)), loginId });
    }

    // ---------- 카카오 로그인 ----------
    if (method === 'GET' && route === '/start/kakao') {
      const key = process.env.KAKAO_REST_API_KEY;
      if (!key) return json({ error: 'KAKAO_REST_API_KEY 환경변수가 없습니다.' }, 500);
      const state = S.randomState();
      const ref = url.searchParams.get('ref');
      const auth = new URL('https://kauth.kakao.com/oauth/authorize');
      auth.searchParams.set('response_type', 'code');
      auth.searchParams.set('client_id', key);
      auth.searchParams.set('redirect_uri', siteURL() + '/.netlify/functions/member-auth/callback/kakao');
      auth.searchParams.set('state', state + (ref && referralLabel(ref) ? '.' + ref : ''));
      return redirect(auth.href, [S.stateCookie(state)]);
    }
    if (method === 'GET' && route === '/callback/kakao') {
      const code = url.searchParams.get('code'), [state, ref] = (url.searchParams.get('state') || '').split('.');
      const expected = S.readState(req);
      const fail = reason => redirect(siteURL() + '/?auth=' + encodeURIComponent(reason), [S.stateCookie('')]);
      if (!code || !state || !expected || state !== expected) return fail('state');
      const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: process.env.KAKAO_REST_API_KEY,
        redirect_uri: siteURL() + '/.netlify/functions/member-auth/callback/kakao', code });
      if (process.env.KAKAO_CLIENT_SECRET) body.set('client_secret', process.env.KAKAO_CLIENT_SECRET);
      const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', { method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' }, body });
      const token = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !token.access_token) return fail('token');
      const meRes = await fetch('https://kapi.kakao.com/v2/user/me', { headers: { authorization: 'Bearer ' + token.access_token } });
      const me = await meRes.json().catch(() => ({}));
      if (!meRes.ok || !me.id) return fail('profile');
      const kakaoId = String(me.id);
      let memberId = await store.getJSON('index:kakao:' + kakaoId), member = memberId ? await store.getJSON('member:' + memberId) : null;
      if (!member) {
        member = await createMember({ provider: 'kakao', providerId: kakaoId,
          name: me.kakao_account?.profile?.nickname || '', email: me.kakao_account?.email || '',
          referral: ref && referralLabel(ref) ? ref : null, ip: req.headers.get('x-nf-client-connection-ip') || '' });
        await store.setJSON('index:kakao:' + kakaoId, member.id);
      }
      // 프런트는 ?auth=ready 를 보고 sessionStorage에 저장해 둔 원래 페이지로 복귀합니다.
      return redirect(siteURL() + '/?auth=ready', [S.sessionCookie(member.id), S.stateCookie('')]);
    }

    // ---------- 쓰기 요청: CSRF 확인 ----------
    if (method === 'POST') {
      if (!checkCSRF(req)) return json({ error: '세션이 만료됐습니다. 새로고침 후 다시 시도해주세요.' }, 403);
      const body = await req.json().catch(() => ({}));

      if (route === '/logout') return json({ ok: true }, 200, [S.clearSessionCookie()]);

      if (route === '/register') {
        const loginId = normId(body.loginId), nickname = normNick(body.nickname), name = String(body.name || '').trim(), phone = String(body.phone || '').replace(/\s/g, '');
        if (!ID_RE.test(loginId)) return json({ error: '아이디 형식을 확인해주세요.' }, 400);
        if (!NICK_RE.test(nickname)) return json({ error: '닉네임 형식을 확인해주세요.' }, 400);
        if (!name || !PHONE_RE.test(phone)) return json({ error: '이름과 휴대폰 번호를 확인해주세요.' }, 400);
        if (String(body.password || '').length < 6 || !/[\p{P}\p{S}]/u.test(body.password)) return json({ error: '비밀번호는 6자 이상, 특수문자를 포함해야 합니다.' }, 400);
        if (body.password !== body.passwordConfirm) return json({ error: '비밀번호가 서로 다릅니다.' }, 400);
        if (body.consent !== true) return json({ error: '개인정보 수집·이용에 동의해주세요.' }, 400);
        if (await store.getJSON('index:login:' + loginId)) return json({ error: '이미 사용 중인 아이디입니다.' }, 409);
        if (await store.getJSON('index:nick:' + nickname.toLowerCase())) return json({ error: '이미 사용 중인 닉네임입니다.' }, 409);
        const ref = body.ref && referralLabel(body.ref) ? body.ref : null;
        const member = await createMember({ provider: 'local', loginId, passwordHash: S.hashPassword(body.password), name, phone: phone.replace(/-/g, ''), nickname,
          referral: ref, consentAt: new Date().toISOString(), ip: req.headers.get('x-nf-client-connection-ip') || '' });
        await store.setJSON('index:login:' + loginId, member.id);
        await store.setJSON('index:nick:' + nickname.toLowerCase(), member.id);
        return json({ authenticated: true, provider: 'local', member: publicMember(member) }, 200, [S.sessionCookie(member.id)]);
      }
      if (route === '/login') {
        const loginId = normId(body.loginId);
        const id = await store.getJSON('index:login:' + loginId), member = id ? await store.getJSON('member:' + id) : null;
        if (!member || !S.checkPassword(String(body.password || ''), member.passwordHash)) return json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, 401);
        return json({ authenticated: true, provider: 'local', member: publicMember(member) }, 200, [S.sessionCookie(member.id)]);
      }
      if (route === '/profile') {
        const id = S.currentMemberId(req), member = id ? await store.getJSON('member:' + id) : null;
        if (!member) return json({ error: '로그인이 필요합니다.' }, 401);
        const nickname = normNick(body.nickname), name = String(body.name || '').trim(), phone = String(body.phone || '').replace(/[\s-]/g, '');
        if (!NICK_RE.test(nickname)) return json({ error: '닉네임 형식을 확인해주세요.' }, 400);
        if (!name || !PHONE_RE.test(phone)) return json({ error: '이름과 휴대폰 번호를 확인해주세요.' }, 400);
        if (!member.consentAt && body.consent !== true) return json({ error: '개인정보 수집·이용에 동의해주세요.' }, 400);
        const owner = await store.getJSON('index:nick:' + nickname.toLowerCase());
        if (owner && owner !== member.id) return json({ error: '이미 사용 중인 닉네임입니다.' }, 409);
        if (member.nickname && member.nickname.toLowerCase() !== nickname.toLowerCase()) await store.del('index:nick:' + member.nickname.toLowerCase());
        Object.assign(member, { name, phone, nickname, consentAt: member.consentAt || new Date().toISOString() });
        await store.setJSON('member:' + member.id, member);
        await store.setJSON('index:nick:' + nickname.toLowerCase(), member.id);
        return json({ authenticated: true, provider: member.provider, member: publicMember(member) });
      }
    }

    if (method === 'GET' && route === '/materials') {
      const id = S.currentMemberId(req), member = id ? await store.getJSON('member:' + id) : null;
      if (!member?.nickname) return json({ error: '회원 전용 자료입니다.' }, 401);
      return json(FULL_MATERIALS);
    }
    return json({ error: 'not found' }, 404);
  } catch (error) {
    console.error('[member-auth]', error);
    return json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }, 500);
  }
}
export const config = { path: '/.netlify/functions/member-auth/*' };
