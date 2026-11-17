// 서명 쿠키 세션 + CSRF 토큰 + 비밀번호 해시
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.SESSION_SECRET || 'dev-only-secret-change-me';
const SESSION_COOKIE = '__Host-room-session';
const GUEST_COOKIE = '__Host-room-guest';
const STATE_COOKIE = '__Host-room-state';
const SESSION_DAYS = 30;

const b64 = buf => Buffer.from(buf).toString('base64url');
const sign = text => b64(createHmac('sha256', SECRET).update(text).digest());

export function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('='); if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
export function cookie(name, value, maxAge) {
  // __Host- 접두사: Secure + Path=/ + 도메인 미지정 (localhost http 개발 시에는 접두사 없는 이름 사용)
  const secure = process.env.LOCAL_DEV ? '' : '; Secure';
  const n = process.env.LOCAL_DEV ? name.replace(/^__Host-/, '') : name;
  return `${n}=${encodeURIComponent(value)}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${maxAge}`;
}
export function readCookie(req, name) {
  const c = parseCookies(req);
  return c[name] ?? c[name.replace(/^__Host-/, '')] ?? null;
}

export function issueToken(payload, days = SESSION_DAYS) {
  const body = b64(JSON.stringify({ ...payload, exp: Date.now() + days * 864e5 }));
  return `${body}.${sign(body)}`;
}
export function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expect = sign(body);
  if (sig.length !== expect.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try { const data = JSON.parse(Buffer.from(body, 'base64url').toString()); return data.exp > Date.now() ? data : null; } catch { return null; }
}

export function sessionCookie(memberId) { return cookie(SESSION_COOKIE, issueToken({ sub: memberId }), SESSION_DAYS * 86400); }
export function clearSessionCookie() { return cookie(SESSION_COOKIE, '', 0); }
export function currentMemberId(req) { return verifyToken(readCookie(req, SESSION_COOKIE))?.sub ?? null; }

// 게스트 식별자(CSRF 토큰 파생 + 접속자 추정용). 30분.
export function guestId(req) { return readCookie(req, GUEST_COOKIE) || null; }
export function guestCookie(id) { return cookie(GUEST_COOKIE, id, 1800); }
// 접속자 집계 전용 익명 쿠키(세션/CSRF용 게스트 쿠키와 분리해 경쟁 상태를 피함)
export function presenceId(req) { return readCookie(req, '__Host-room-presence') || null; }
export function presenceCookie(id) { return cookie('__Host-room-presence', id, 3600); }
export function newGuestId() { return b64(randomBytes(24)); }
export function csrfFor(id) { return sign('csrf:' + id); }

export function stateCookie(state) { return cookie(STATE_COOKIE, state, 600); }
export function readState(req) { return readCookie(req, STATE_COOKIE); }
export function randomState() { return b64(randomBytes(24)); }

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function checkPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':'); if (!salt || !hash) return false;
  const a = scryptSync(password, salt, 64), b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
