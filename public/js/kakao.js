// 카카오 JavaScript SDK: 카카오톡 공유 + 채널 상담(또는 오픈채팅) 버튼
(() => {
  'use strict';
  const C = window.SITE_CONFIG || {}, fab = document.getElementById('kakao-fab');
  if (C.kakaoOpenChatUrl && !C.kakaoChannelPublicId) { fab.hidden = false; fab.onclick = () => window.open(C.kakaoOpenChatUrl, '_blank', 'noopener'); }
  if (!C.kakaoJsKey) { window.kakaoShare = () => triggerToast('카카오 JavaScript 키를 설정하면 카톡 공유가 켜집니다.'); return; }
  const s = document.createElement('script');
  s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js'; s.crossOrigin = 'anonymous'; // integrity 값은 developers.kakao.com SDK 문서의 값을 복사해 추가 권장
  s.onload = () => {
    if (!window.Kakao.isInitialized()) window.Kakao.init(C.kakaoJsKey);
    if (C.kakaoChannelPublicId) { fab.hidden = false; fab.onclick = () => window.Kakao.Channel.chat({ channelPublicId: C.kakaoChannelPublicId }); }
  };
  document.head.append(s);
  window.kakaoShare = ({ title, description, url, imageUrl }) => {
    if (!window.Kakao?.isInitialized()) { triggerToast('카카오 SDK를 불러오는 중입니다.'); return; }
    window.Kakao.Share.sendDefault({ objectType: 'feed',
      content: { title, description: description || '', imageUrl: imageUrl || location.origin + '/assets/og-image.png', link: { mobileWebUrl: url, webUrl: url } },
      buttons: [{ title: '기사 보기', link: { mobileWebUrl: url, webUrl: url } }] });
  };
})();
