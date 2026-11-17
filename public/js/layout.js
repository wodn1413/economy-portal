// 공통 레이아웃(티커·헤더·메뉴·푸터·다이얼로그)을 한 곳에서 주입합니다.
(() => {
  'use strict';
  const C = window.SITE_CONFIG || {};
  const page = document.body.dataset.page || 'home';
  const NAV = [['/', '홈', 'home', '오늘의 주요 소식'], ['/hot-topics', '🔥 핫토픽', 'hot', '주요 이슈'], ['/research', '시황·리서치', 'research', '날짜별 시장 분석'], ['/news', '주요 뉴스', 'news', '경제 · 글로벌 · 정치 · 사회'], ['/library', '자료실', 'library', '전자책 · 보조지표 · 체크리스트'], ['/calendar', '주요 일정', 'calendar', '경제 일정 달력']];
  const KAKAO_ICON = '<svg class="kakao-icon" aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.3 4.8 6.7l-1 3.5c-.1.4.3.7.6.4l4.1-2.8 1.5.1c5.5 0 10-3.5 10-7.9S17.5 3 12 3Z"/></svg>';
  window.KAKAO_ICON = KAKAO_ICON;
  const brand = `<a class="brand" href="/" aria-label="${C.siteName} 홈"><span class="brand-mark" aria-hidden="true">+</span><span>경제플러스<span class="plus">+</span> <b>지식<span class="in">IN</span></b></span></a>`;
  const links = cls => NAV.map(([href, label, key]) => `<a href="${href}" ${key === page ? 'aria-current="page"' : ''}>${label}</a>`).join('');
  const top = `
  <a class="skip-link" href="#main">본문 바로가기</a>
  <div class="mesh" aria-hidden="true"><div class="orb orb-1"></div><div class="orb orb-2"></div><div class="orb orb-3"></div></div>
  <div id="toast" role="status" aria-live="polite"></div>
  <div class="ticker-bar"><span class="ticker-label"><i class="signal-dot"></i> MARKET</span><div class="ticker-viewport"><div id="market-ticker" aria-label="시장 지표"></div></div><button id="motion-toggle" class="icon-button" style="width:28px;height:28px;background:transparent;border-color:#475569;color:#fff" aria-label="움직임 멈추기" aria-pressed="false">Ⅱ</button></div>
  <header class="site-header"><div class="header-inner">
    <button id="site-menu-toggle" class="icon-button" aria-label="전체 메뉴 열기" aria-controls="site-menu" aria-expanded="false">☰</button>
    ${brand}
    <nav class="desktop-nav" aria-label="주요 메뉴">${links()}</nav>
    <div class="header-actions"><button id="theme-toggle" class="icon-button" aria-label="다크모드 전환" title="화면 테마">◐</button><div id="auth-nav-box"></div></div>
  </div><nav class="mobile-nav" aria-label="모바일 메뉴">${links()}</nav></header>
  <dialog id="site-menu" class="site-menu" aria-labelledby="site-menu-title"><div class="dialog-box">
    <div class="dialog-head"><div><span class="eyebrow">ECONOMY PLUS</span><h2 id="site-menu-title">전체 메뉴</h2></div><button class="icon-button" id="site-menu-close" aria-label="닫기">✕</button></div>
    <nav aria-label="전체 메뉴">${NAV.map(([href, label, , desc]) => `<a href="${href}"><span>${label}</span><small>${desc}</small></a>`).join('')}</nav>
  </div></dialog>`;
  const bottom = `
  <footer class="site-footer">${brand}<p>${C.tagline || ''}</p>
    <div class="footer-links"><a href="/news">뉴스·이슈</a><a href="/research">시황 자료실</a><button onclick="openAuthModal('login')">로그인</button><button onclick="openAuthModal('signup')">회원가입·개인정보 안내</button></div>
    <small>출처 기반 요약·분석. 시세와 자료는 각 항목에 표시된 기준 시점의 값입니다.</small><small>© 2026 ${C.siteName}</small></footer>
  <button id="kakao-fab" class="kakao-fab" type="button" hidden>${KAKAO_ICON} 카카오톡 문의</button>
  <dialog id="article-modal" aria-labelledby="read-title"><div class="dialog-box">
    <div class="dialog-head"><span id="read-tag" class="read-tag"></span><button class="icon-button" onclick="closeArticleReader()" aria-label="닫기">✕</button></div>
    <h2 id="read-title" class="read-title"></h2>
    <div class="read-meta"><span id="read-meta"></span><span><button id="modal-scrap-btn" data-member-scrap hidden onclick="toggleScrapCurrent()">★ 스크랩</button> <button onclick="shareCurrentArticle()">링크 복사</button> <button class="share-kakao" onclick="shareCurrentArticleKakao()">${KAKAO_ICON}카톡 공유</button></span></div>
    <div id="read-body" class="read-body"></div>
    <div class="read-foot"><span>출처 기반 요약 · 분석은 별도 표시</span><button class="btn btn-sm" onclick="closeArticleReader()">닫기</button></div>
  </div></dialog>
  <dialog id="material-dialog" aria-labelledby="material-title"><div class="dialog-box">
    <div class="dialog-head"><h2 id="material-title"></h2><button class="icon-button" id="material-close" aria-label="닫기">✕</button></div>
    <div id="material-pages" class="material-pages"></div><div id="material-actions" class="read-foot"></div>
  </div></dialog>`;
  document.body.insertAdjacentHTML('afterbegin', top);
  document.body.insertAdjacentHTML('beforeend', bottom); // layout.js 는 </main> 뒤에서 로드됨

  // 전체 메뉴
  const menu = document.getElementById('site-menu'), toggle = document.getElementById('site-menu-toggle');
  toggle.onclick = () => { menu.showModal(); toggle.setAttribute('aria-expanded', 'true'); };
  document.getElementById('site-menu-close').onclick = () => menu.close();
  menu.addEventListener('close', () => toggle.setAttribute('aria-expanded', 'false'));
  menu.addEventListener('click', e => { if (e.target === menu) menu.close(); });
  document.getElementById('material-close').onclick = () => document.getElementById('material-dialog').close();
  // 테마
  const themeBtn = document.getElementById('theme-toggle');
  themeBtn.onclick = () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; try { localStorage.setItem('economy-theme', next); } catch {} };
  // 움직임 멈춤
  const motion = document.getElementById('motion-toggle');
  motion.onclick = () => { const paused = document.documentElement.classList.toggle('motion-paused'); motion.setAttribute('aria-pressed', String(paused)); motion.textContent = paused ? '▶' : 'Ⅱ'; };
  // 토스트
  let toastTimer; window.triggerToast = text => { const t = document.getElementById('toast'); t.textContent = text; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); };
  // 추천(ref) 코드 유지: 내부 링크에 ?ref= 를 붙여 가입 시까지 전달
  window.pageURL = (file, params = {}) => {
    const url = new URL(file, location.href), ref = new URL(location.href).searchParams.get('ref') || window.ROOM_REFERRAL;
    if (ref && (C.referralCodes || []).includes(ref)) url.searchParams.set('ref', ref);
    for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
    return url.href;
  };
  window.decorateSiteLinks = () => document.querySelectorAll('a[href^="/"]').forEach(a => { const u = new URL(a.getAttribute('href'), location.href); a.href = pageURL(u.pathname + u.search + u.hash); });
  decorateSiteLinks();
  window.openMaterialsPage = () => { location.href = pageURL('/library'); };
  window.openAuthModal = () => triggerToast('로그인 화면을 불러오는 중입니다. 잠시 후 다시 눌러주세요.'); // member-auth.js가 덮어씀
})();
