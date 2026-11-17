// 함수 동작 확인: 세션→추천코드→아이디/닉네임 확인→가입→자료 열람→로그아웃→로그인, 카카오 시작 리다이렉트
import { spawn } from 'node:child_process';
process.env.PORT = '8899'; process.env.SITE_URL = 'http://localhost:8899'; process.env.LOCAL_STORE_FILE = '.data/smoke-store.json';
process.env.REFERRALS = '{"db-3tc93":"정석"}'; process.env.KAKAO_REST_API_KEY = 'dummy-rest-key';
import('node:fs').then(fs => fs.rmSync('.data/smoke-store.json', { force: true }));
const server = spawn(process.execPath, ['scripts/dev.mjs'], { stdio: 'inherit', env: process.env });
await new Promise(r => setTimeout(r, 800));
const B = 'http://localhost:8899/.netlify/functions/member-auth';
let jar = {}; const cookieHeader = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
async function call(path, body, extra = {}) {
  const res = await fetch(B + path, { method: body ? 'POST' : 'GET', redirect: 'manual', headers: { cookie: cookieHeader(), ...(body ? { 'content-type': 'application/json', 'x-room-csrf': extra.csrf || '' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  for (const c of res.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const [k, v] = kv.split('='); if (v) jar[k] = v; else delete jar[k]; }
  return res;
}
const assert = (c, msg) => { if (!c) { console.error('✗ ' + msg); server.kill(); process.exit(1); } console.log('✓ ' + msg); };
try {
  let r = await call('/session'); let s = await r.json(); assert(r.ok && s.authenticated === false && s.csrf, '세션: 비로그인 + CSRF 발급');
  const csrf = s.csrf;
  r = await call('/referral?ref=db-3tc93'); assert((await r.json()).label === '정석', '추천 코드 db-3tc93 → 정석');
  r = await call('/referral?ref=nope'); assert((await r.json()).slug === null, '없는 추천 코드 → null');
  r = await call('/login-id?value=tester1'); assert((await r.json()).available === true, '아이디 사용 가능');
  r = await call('/nickname?value=테스터'); assert((await r.json()).available === true, '닉네임 사용 가능');
  r = await call('/register', { loginId: 'tester1', password: 'pass!234', passwordConfirm: 'pass!234', name: '홍길동', phone: '010-1234-5678', nickname: '테스터', consent: true, ref: 'db-3tc93' }); assert(r.status === 403, 'CSRF 없는 POST 는 403');
  r = await call('/register', { loginId: 'tester1', password: 'pass!234', passwordConfirm: 'pass!234', name: '홍길동', phone: '010-1234-5678', nickname: '테스터', consent: true, ref: 'db-3tc93' }, { csrf }); s = await r.json(); assert(r.ok && s.member.nickname === '테스터', '일반회원 가입 성공');
  r = await call('/nickname?value=테스터'); assert((await r.json()).available === false, '가입 후 닉네임 중복 → 불가');
  r = await call('/session'); s = await r.json(); assert(s.authenticated && s.provider === 'local', '가입 후 세션 유지');
  r = await call('/materials'); s = await r.json(); assert(r.ok && s.full === true && s.days.length, '회원 전용 자료 목록 수신');
  r = await call('/logout', {}, { csrf }); r = await call('/session'); assert((await r.json()).authenticated === false, '로그아웃');
  r = await call('/materials'); assert(r.status === 401, '비회원 자료 요청 → 401');
  r = await call('/login', { loginId: 'tester1', password: 'wrong' }, { csrf }); assert(r.status === 401, '틀린 비밀번호 → 401');
  r = await call('/login', { loginId: 'tester1', password: 'pass!234' }, { csrf }); assert(r.ok, '로그인 성공');
  r = await call('/profile', { name: '홍길동', phone: '01012345678', nickname: '새닉네임' }, { csrf }); s = await r.json(); assert(r.ok && s.member.nickname === '새닉네임', '회원정보 수정');
  r = await call('/start/kakao?ref=db-3tc93'); const loc = r.headers.get('location') || '';
  assert(r.status === 303 && loc.startsWith('https://kauth.kakao.com/oauth/authorize?') && loc.includes('client_id=dummy-rest-key') && loc.includes(encodeURIComponent('http://localhost:8899/.netlify/functions/member-auth/callback/kakao')) && /state=[^&]+\.db-3tc93/.test(loc), '카카오 시작 → kauth 리다이렉트 + state 쿠키 + ref 전달');
  assert(jar['room-state'], 'state 쿠키 저장');
  r = await call('/callback/kakao?code=x&state=bad'); assert(r.status === 303 && r.headers.get('location').includes('auth=state'), '잘못된 state → auth=state 로 복귀');
  r = await fetch('http://localhost:8899/.netlify/functions/room-community', { method: 'POST', headers: { 'x-room-presence': '1' } }); s = await r.json(); assert(s.members === 1 && s.activeBrowsers === 1, '회원 현황 집계 (회원 1, 접속 1)');
  r = await fetch('http://localhost:8899/.netlify/functions/naver-news?category=economy'); s = await r.json(); assert(r.ok && s.items.length, '뉴스 함수 응답(키 없으면 샘플)');
  for (const p of ['/', '/news', '/library', '/research', '/calendar', '/hot-topics']) { r = await fetch('http://localhost:8899' + p); assert(r.ok && (await r.text()).includes('<main'), '페이지 ' + p); }
  console.log('\n모든 스모크 테스트 통과');
} finally { server.kill(); }
