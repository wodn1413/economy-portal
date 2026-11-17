# 경제플러스 +지식IN 스타일 포털 — 카카오 연동 완성판

경제 뉴스·시황·회원 전용 자료실 사이트. **카카오 로그인(OAuth) + 카카오톡 공유 + 카카오톡 채널 상담 버튼**이 붙어 있고, Netlify 에 그대로 올리면 동작합니다.
참고 사이트를 어떻게 분석했는지는 [ANALYSIS.md](ANALYSIS.md), 화면은 `docs/screenshots/` 를 보세요.

## 폴더 구조
```
public/                 배포되는 정적 파일
  index.html hot-topics.html research.html news.html library.html calendar.html
  css/site.css          디자인 토큰·라이트/다크 테마
  js/config.js          ★ 공개 설정(카카오 JS 키, 채널 ID, 추천코드 목록)
  js/data.js            ★ 시세·기사·자료 목록·일정 데이터 (여기만 고치면 내용이 바뀜)
  js/layout.js          헤더·메뉴·푸터·다이얼로그 공통 주입
  js/app.js             페이지 렌더링(피드, 자료실 잠금, 달력, 리모컨)
  js/member-auth.js     회원가입/로그인 모달, 카카오 로그인 시작·복귀 처리, 추천코드
  js/kakao.js           카카오 JS SDK: 카톡 공유, 채널 상담 플로팅 버튼
  js/naver-feed.js      서버 함수에서 네이버 뉴스 받아 합치기
  js/community.js       회원 현황 + 200명 이벤트 배너
  assets/               로고, OG 이미지, 자료 미리보기(샘플), PDF 자리표시자
netlify/functions/
  member-auth.mjs       세션·CSRF·추천코드·카카오 OAuth·일반가입·회원정보·회원전용자료
  room-community.mjs    회원 수/오늘 가입/5분 접속 집계
  naver-news.mjs        네이버 뉴스 검색 API 프록시(10분 캐시)
  lib/store.mjs         Netlify Blobs(배포) / JSON 파일(로컬) 저장소
  lib/session.mjs       서명 쿠키, CSRF, scrypt 비밀번호 해시
  lib/materials.mjs     ★ 회원 전용 자료 전체 목록(파일 경로)
scripts/dev.mjs         netlify-cli 없이 로컬 실행 (npm run dev)
scripts/smoke.mjs       함수 자동 테스트 (npm run check)
```

## 1. 로컬에서 바로 실행
```bash
npm install
npm run dev
```
http://localhost:8888 접속. 회원가입·로그인·자료실 잠금까지 전부 로컬에서 동작합니다(저장은 `.data/store.json`).
카카오 로그인만은 카카오 서버로 리다이렉트되므로 아래 2번 설정 후 `.env` 에 키를 넣어야 실제로 됩니다.

테스트:
```bash
npm run check
```

## 2. 카카오 로그인 설정 (Kakao Developers)
1. https://developers.kakao.com → **내 애플리케이션 → 애플리케이션 추가하기** (앱 이름·회사명 입력).
2. **앱 설정 → 앱 키**: `REST API 키` 는 서버 환경변수 `KAKAO_REST_API_KEY` 에, `JavaScript 키` 는 `public/js/config.js` 의 `kakaoJsKey` 에.
3. **앱 설정 → 플랫폼 → Web** 사이트 도메인 등록: `https://내사이트.netlify.app` (로컬 테스트용 `http://localhost:8888` 도 추가).
4. **제품 설정 → 카카오 로그인 → 활성화 ON**, **Redirect URI** 등록:
   ```
   https://내사이트.netlify.app/.netlify/functions/member-auth/callback/kakao
   http://localhost:8888/.netlify/functions/member-auth/callback/kakao
   ```
   (이 값은 `SITE_URL` 환경변수 + 고정 경로와 **글자 하나까지** 같아야 합니다.)
5. **카카오 로그인 → 동의항목**: `닉네임` 필수, `카카오계정(이메일)` 은 선택(심사 없이 쓰려면 "선택 동의").
6. **카카오 로그인 → 보안 → Client Secret**: 켰다면 코드값을 `KAKAO_CLIENT_SECRET` 에. 안 켜면 비워둡니다.
7. 앱이 **개발 중** 상태면 팀원으로 등록된 카카오 계정만 로그인됩니다. 모두에게 열려면 **비즈니스 → 비즈 앱 전환**(사업자 정보 필요) 후 공개.

### 카카오톡 채널 상담 버튼 (선택)
- https://center-pf.kakao.com 에서 채널 개설 → **채널 관리 → 채널 정보 → 채널 공개 ID**(`_xxxxx`) 를 `config.js` 의 `kakaoChannelPublicId` 에.
- Kakao Developers 앱 **플랫폼 → 카카오톡 채널 연결**에서 같은 채널을 연결해야 `Kakao.Channel.chat()` 이 열립니다.
- 채널 대신 오픈채팅으로 받으려면 `kakaoOpenChatUrl` 에 오픈채팅 링크만 넣으면 됩니다(SDK 불필요).

### 카카오톡 공유
`kakaoJsKey` 만 있으면 기사 모달의 **[카톡 공유]** 가 `Kakao.Share.sendDefault(feed)` 로 동작합니다. 플랫폼 Web 도메인에 사이트 주소가 등록돼 있어야 합니다.

## 3. 네이버 뉴스 (선택)
https://developers.naver.com → 애플리케이션 등록 → API: **검색** 체크 → `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`. 없으면 샘플 기사 1건이 표시됩니다.

## 4. Netlify 배포
1. 이 폴더를 GitHub 저장소로 올리고 Netlify **Add new site → Import** (빌드 명령 없음, Publish directory `public` — `netlify.toml` 에 이미 있음).
2. **Site configuration → Environment variables** 에 `.env.example` 의 값을 넣습니다:
   `SESSION_SECRET`(길고 무작위), `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`(선택), `SITE_URL`, `REFERRALS`, `NAVER_CLIENT_ID/SECRET`(선택).
3. 배포 후 Kakao Developers 의 Redirect URI/도메인을 실제 주소로 맞춥니다.
4. 회원 데이터는 **Netlify Blobs**(`members` 스토어)에 저장됩니다. 대시보드 Blobs 메뉴에서 확인·삭제 가능.

## 5. 내용 바꾸기
| 바꿀 것 | 위치 |
|---|---|
| 시세 티커·리모컨 숫자, 핫토픽 기사, HOT 5 | `public/js/data.js` → `PORTAL_DATA` |
| 자료실 공개 미리보기 목록 | `public/js/data.js` → `ROOM_DATA` (미리보기 이미지만) |
| 회원 전용 자료 실제 파일 경로 | `netlify/functions/lib/materials.mjs` + `public/assets/library/` |
| 경제 일정 | `public/js/data.js` → `ECONOMIC_CALENDAR` |
| 추천(ref) 코드 → 추천인 이름 | 환경변수 `REFERRALS` + `config.js` 의 `referralCodes` |
| 이벤트 문구·경품 | `public/js/community.js` |
| 색상·브랜드 | `public/css/site.css` 의 `:root` 변수, `layout.js` 의 `brand` |

추천 링크는 `https://내사이트/?ref=db-3tc93` 처럼 배포하면 되고, 가입한 회원 레코드에 `referral` 로 남습니다.

## 6. 주의
- 자료실 PDF 는 `public/` 에 두면 주소를 아는 사람은 누구나 받을 수 있습니다. 완전 차단이 필요하면 파일도 함수(또는 Netlify Blobs)로 내려주고 세션을 검사하도록 바꾸세요(`/materials` 와 같은 방식).
- 휴대폰 번호를 본인인증 없이 받습니다. 개인정보 처리방침 문구(가입 모달 안)를 운영 조건에 맞게 수정하세요.
- 시세는 실시간이 아니라 `data.js` 를 갱신해 배포하는 방식입니다(참고 사이트와 동일). 자동화하려면 GitHub Actions 로 주기적으로 `data.js` 를 생성해 커밋하면 됩니다.
