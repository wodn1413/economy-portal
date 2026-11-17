# 참고 사이트 분석서 — knowledge-economy-room.netlify.app (경제플러스 +지식IN)

> 분석 일시: 2026-11-17 · 방법: HTML/CSS/JS 전수 다운로드, 서버 함수(Netlify Functions) 응답 직접 호출, 쿠키/리다이렉트 헤더 확인

## 1. 한 줄 요약
**정적 HTML + Netlify Functions(서버리스)** 로 만든 경제 뉴스·시황 포털. 핵심 수익/운영 구조는 **"무료 뉴스로 유입 → 자료실(전자책·PDF)은 회원 전용 → 카카오 간편가입으로 전환 → 추천(ref) 코드로 유입 경로 추적"** 입니다. 카카오톡 연동은 **카카오 로그인(OAuth 2.0)** 하나이며, 카카오 채널/오픈채팅/공유 버튼은 없습니다.

## 2. 기술 스택
| 영역 | 사용 기술 | 비고 |
|---|---|---|
| 호스팅 | Netlify (Edge + Functions) | `_redirects` 로 `/news → /news.html` 식 깔끔한 주소 |
| 프런트 | 순수 HTML/CSS/JS (프레임워크 없음) | Tailwind 유틸리티 클래스 이름을 쓰지만 자체 CSS(`utilities.css`)로 구현 |
| 폰트 | Pretendard Variable, Plus Jakarta Sans, JetBrains Mono | jsDelivr / Google Fonts |
| 달력 | FullCalendar 6.1.19 (vendor 번들) | 한국어 로케일 |
| 데이터 | `portal-data.js`(820KB), `room-data-v3.js`(240KB), `calendar-data.js` | **빌드 시점에 JS 파일로 구워 넣음** (DB 없음) |
| 서버 | `/.netlify/functions/member-auth`, `naver-news`, `room-community` | 회원·세션·카카오 OAuth, 네이버 뉴스 프록시, 접속자 집계 |
| 테마 | `data-theme=light|dark` + localStorage(`economy-theme`) | 즉시 적용 인라인 스크립트로 깜빡임 방지 |

## 3. 페이지 구조 (SPA 셸 방식)
`page-shells.js` 에 6개 페이지의 `<main>` HTML이 미리 들어 있고, `page-router.js` 가 링크 클릭을 가로채 `<main>` 만 교체합니다(모바일 스와이프 전환 포함). 직접 접속 시에도 동일 HTML이 서버에서 나옵니다.

| 경로 | 내용 |
|---|---|
| `/` 홈 | 시세 티커 → 자료실 3종 → 주요 일정(미니 달력+다가오는 일정) → **회원 현황·200명 이벤트** → 오늘의 핫토픽(리드 기사+3개 팩트) → 타임라인 피드(좌 8칸)+사이드 위젯(우 4칸: 시황 CTA, HOT 5, VIP 자료실 배너) → 시황·리서치 2종 → 분야별 뉴스 → 반도체 리모컨(삼성전자/SK하이닉스) |
| `/hot-topics` | 편집부 해설 기사 목록 |
| `/research` | 날짜별 시장 브리핑·종목 노트. 비회원은 첫 페이지 상단 이미지만 |
| `/news` | 네이버 뉴스 API + 자체 해설, 카테고리 탭, 검색, 스크랩(localStorage) |
| `/library` | 전자책·보조지표·체크리스트. **🔒 로그인 전 잠금** |
| `/calendar` | FullCalendar 월간 달력 |

공통 UI: 상단 MARKET 티커(일시정지 버튼), 글래스 카드(`backdrop-filter`), 배경 오브(ambient), 기사 리딩 모달(`#article-modal`, `#article-123` 해시로 딥링크), 자료 미리보기 `<dialog>`, 토스트.

## 4. 회원·카카오 로그인 흐름 (핵심)
### 4-1. 프런트 (`member-auth.js`)
1. 로드 즉시 `GET /member-auth/session` → `{authenticated, csrf, member, provider}` 와 **`__Host-room-guest` 쿠키**(HttpOnly, 30분) 수신. CSRF 토큰은 모든 POST에 `X-Room-CSRF` 헤더로 동봉.
2. 동시에 `GET /member-auth/referral?ref=db-3tc93` → `{"slug":"db-3tc93","label":"정석"}`. 유효한 코드만 내부 링크에 `?ref=` 를 계속 붙여 다님(`pageURL()`, `decorateSiteLinks()`). 허용 코드는 정규식 `^db-(3tc93|2r6zb|5r2xj)$` 로 하드코딩.
3. 회원가입 모달: **[카카오로 간편회원가입]**(노란 버튼) / [일반회원 가입] / [로그인].
4. 카카오 버튼 클릭 → 복귀 위치를 `sessionStorage('room-auth-return')` 에 저장 → 추천코드 확인 완료를 기다림 → 대기 애니메이션 → `location.assign('/member-auth/start/kakao')`.
5. 콜백 후 `/?auth=ready` 로 돌아오면 세션을 다시 읽고, 닉네임이 있으면 원래 페이지로 복귀, 없으면 **회원정보 입력(이름·휴대폰·닉네임·개인정보 동의)** 폼을 띄움. 이 단계를 마쳐야 자료실이 열림.
6. 일반가입: 아이디 중복확인 → 이름/휴대폰/닉네임(중복확인) → 비밀번호(6자+특수문자) → 동의 체크. 서버 `/register`.
7. 탭 전환/포커스/`storage` 이벤트마다 `/session` 재조회로 여러 탭 동기화.

### 4-2. 서버 (`/.netlify/functions/member-auth`)
| 메서드·경로 | 동작(실측) |
|---|---|
| GET `/session` | 200, `cache-control: no-store`, `set-cookie: __Host-room-guest=…; HttpOnly; Secure; SameSite=Lax; Max-Age=1800`, 본문 `{"authenticated":false,"csrf":"…"}` |
| GET `/referral?ref=` | 코드→라벨 매핑 |
| GET `/start/kakao` | **303** → `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=<REST키>&redirect_uri=https://…/.netlify/functions/member-auth/callback/kakao&state=<랜덤>` + `__Host-room-state` 쿠키(10분) |
| GET `/callback/kakao` | code→토큰 교환, `kapi.kakao.com/v2/user/me` 로 식별자 조회, 회원 생성/조회, 세션 쿠키 발급, `/?auth=ready` 로 복귀 (추정: 표준 흐름) |
| POST `/register` `/login` `/logout` `/profile` | CSRF 필요 |
| GET `/nickname?value=` `/login-id?value=` | 중복 확인 |
| GET `room-data-full.js` | 회원 전용 자료 목록. **비로그인 401** (엣지에서 쿠키 검사) |

보안 포인트: `__Host-` 접두 쿠키, HttpOnly, SameSite=Lax, CSRF 토큰, OAuth `state` 검증, `no-store`, `referrer-policy: no-referrer`, HSTS preload.

## 5. 뉴스·시세 데이터
- **네이버 뉴스 검색 API** 를 서버 함수가 대신 호출(`/naver-news?category=economy|society|global_markets|global_economy|global_tech|politics|diplomacy`), 응답 `{query, checkedAt, items[{title, link, originallink, description, pubDate}]}`. 프런트는 1시간 sessionStorage 캐시 + 1시간마다 갱신.
- 시세(KOSPI, KOSDAQ, 삼성전자, SK하이닉스, 환율, 미국 지수, VIX)는 **운영자가 주기적으로 `portal-data.js` 를 재생성해 배포**(네이버 금융 모바일 API 출처 표기). 실시간이 아니라 "기준 시점" 을 표시.
- 자체 해설 기사(`D.articles`)와 리드 기사·TOP5(`leadId`, `topIds`)도 같은 파일.

## 6. 커뮤니티/이벤트 장치
`/room-community`: `{"members":28,"today":0,"activeBrowsers":0,"asOf":…,"windowMinutes":5}`. 회원 200명 달성 추첨 이벤트(1등 삼성전자 1주, 2등 상품권 10만원, 3등 배민 3만원×3)를 진행바로 보여주며 가입을 유도. GPC/DNT 브라우저는 집계에서 제외.

## 7. 디자인 토큰
`--paper:#f3f6fc --ink:#14213b --muted:#64748b --line:#dce4f0 --accent:#2861df --soft:#eaf0fc`, 카카오 `#fee500/#191919`, 라운드 20px 글래스 카드, 브랜드 그라데이션(blue-600→indigo-600→violet-500).

## 8. 그대로 쓸 수 없는 것 / 바꿔야 하는 것
1. **카카오 앱 키·네이버 API 키**는 본인 것으로 새로 발급 (참고 사이트의 `client_id` 는 그 사이트 도메인에만 묶여 있음).
2. 원본 전자책·PDF·시세 데이터·기사 본문은 저작물이므로 **구조만 참고**하고 내용은 직접 채워야 함.
3. 이벤트 경품 문구는 경품법·표시광고법 관점에서 본인 운영 조건에 맞게 수정.
4. 휴대폰 번호를 "본인인증 없이" 수집하고 있는데, 이는 개인정보 처리방침에 명시 필요(참고 사이트도 안내문에 명시).

## 9. 이번에 만든 프로젝트와의 대응
| 참고 사이트 | 이 프로젝트 |
|---|---|
| page-shells + 라우터 SPA | 6개 정적 HTML + `layout.js` 공통 주입 (단순화, SEO 동일) |
| member-auth.js / Functions | `public/js/member-auth.js` / `netlify/functions/member-auth.mjs` (동일 라우트 이름) |
| room-data-full.js(401) | `GET /member-auth/materials`(401) |
| naver-news, room-community | 동일 이름으로 구현 |
| 카카오 로그인만 | 카카오 로그인 + **카카오톡 공유 + 채널 상담/오픈채팅 플로팅 버튼** 추가 |
| FullCalendar | 의존성 없는 자체 달력 |
| 저장소: 불명(엣지 KV 추정) | **Netlify Blobs** (로컬은 JSON 파일) |
