// 사이트 공개 설정 (브라우저에 노출되어도 되는 값만!)
window.SITE_CONFIG = {
  siteName: '경제플러스 +지식IN',
  tagline: '뉴스의 흐름을 읽고, 시장을 더 깊이 이해하다.',
  // Kakao Developers > 앱 키 > JavaScript 키 (공유하기·채널 상담 버튼용. REST API 키는 서버 환경변수에만!)
  kakaoJsKey: '',
  // 카카오톡 채널 관리자센터 > 채널 정보 > 채널 공개 ID (예: _AbCdE). 비우면 채널 상담 버튼이 숨겨집니다.
  kakaoChannelPublicId: '',
  // 오픈채팅방 주소(선택). 채널 대신 오픈채팅으로 연결하고 싶을 때.
  kakaoOpenChatUrl: '',
  // 허용할 추천(ref) 코드 목록. 서버 REFERRALS 환경변수와 맞춰주세요.
  referralCodes: ['db-3tc93', 'db-2r6zb']
};
