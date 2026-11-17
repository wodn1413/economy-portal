// 회원 다이얼로그: 카카오 간편가입/로그인, 일반 가입, 로그인, 회원정보 입력, 마이페이지, 추천(ref) 코드 처리
(() => {
  'use strict';
  const endpoint = '/.netlify/functions/member-auth';
  const K = window.KAKAO_ICON;
  let state = null, busy = false, mode = 'signup', source = null, providerStarting = false, waitTimer = null;
  const incomingRef = new URL(location.href).searchParams.get('ref');
  // 추천 코드 확인(가입·카카오 시작 전에 완료를 기다림)
  const referralReady = request('/referral' + (incomingRef ? '?ref=' + encodeURIComponent(incomingRef) : '')).then(d => { source = d; window.ROOM_REFERRAL = d.slug; window.decorateSiteLinks?.(); if (d.label && !sessionStorage.getItem('room-ref-toast')) { triggerToast(`${d.label}님의 추천으로 방문하셨습니다.`); try { sessionStorage.setItem('room-ref-toast', '1'); } catch {} } return null; }).catch(e => e);

  const dialog = document.createElement('dialog'); dialog.id = 'member-dialog'; dialog.setAttribute('aria-labelledby', 'member-title');
  dialog.innerHTML = `<div class="dialog-box"><div class="dialog-head"><h2 id="member-title">자료실 회원가입</h2><button class="icon-button" id="member-close" aria-label="닫기">✕</button></div><p id="member-message" class="member-message" role="status" aria-live="polite"></p><div id="member-content"></div></div>`;
  document.body.append(dialog);
  const content = dialog.querySelector('#member-content'), message = dialog.querySelector('#member-message'), title = dialog.querySelector('#member-title');
  dialog.querySelector('#member-close').onclick = () => dialog.close();
  const notice = (t, s = 'pending') => { message.textContent = t; message.dataset.state = s; };

  async function request(path, body) {
    const res = await fetch(endpoint + path, { credentials: 'same-origin', cache: 'no-store', ...(body === undefined ? { signal: AbortSignal.timeout(10000) } : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Room-CSRF': state?.csrf || '' }, body: JSON.stringify(body) }) });
    let data; try { data = await res.json(); } catch { throw new Error('로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.'); }
    if (!res.ok) throw new Error(data.error || '저장하지 못했습니다. 다시 시도해주세요.'); return data;
  }
  function waiting(h, p) {
    clearTimeout(waitTimer); title.textContent = '로그인'; notice('');
    content.innerHTML = `<div class="auth-wait"><div class="auth-mark">${K}</div><h3>${h}</h3><p>${p}</p></div><div id="auth-wait-help" hidden style="text-align:center;font-size:12px;color:var(--muted)"><p>연결이 조금 길어지고 있어요.</p><button id="member-retry" class="btn btn-ghost btn-sm">다시 시도</button></div>`;
    waitTimer = setTimeout(() => { const h = content.querySelector('#auth-wait-help'); if (h) h.hidden = false; }, 8000);
  }
  // 헤더 우측 로그인/회원 메뉴
  function nav() {
    window.setMaterialAccess?.(state);
    document.querySelectorAll('[data-member-scrap]').forEach(el => { el.hidden = !state?.authenticated; }); document.querySelectorAll('[data-guest-only]').forEach(el => { el.hidden = Boolean(state?.authenticated); });
    const box = document.getElementById('auth-nav-box'); if (!box) return;
    if (state?.authenticated) {
      box.innerHTML = `<details id="member-menu" class="member-menu"><summary>${state.member?.nickname || state.member?.name || '내 계정'}님</summary><div class="member-menu-panel"><span class="member-menu-label">내 계정</span><button id="menu-mypage">마이페이지 <span>→</span></button><button id="menu-materials">전체 자료실 <span>→</span></button><button id="menu-logout">로그아웃</button></div></details>`;
      box.querySelector('#menu-mypage').onclick = () => open('account');
      box.querySelector('#menu-materials').onclick = () => { if (state.member?.nickname) openMaterialsPage(); else open('profile'); };
      box.querySelector('#menu-logout').onclick = logout;
    } else {
      box.innerHTML = `<button class="btn btn-ghost btn-sm" id="member-nav-login">로그인</button><button class="btn btn-sm" id="member-nav-signup">회원가입</button>`;
      box.querySelector('#member-nav-login').onclick = () => open('login'); box.querySelector('#member-nav-signup').onclick = () => open('signup');
    }
  }
  async function logout() { try { await request('/logout', {}); state = await request('/session'); mode = 'login'; nav(); if (!dialog.open) dialog.showModal(); render(); notice('로그아웃했습니다.', 'success'); } catch (e) { notice(e.message, 'error'); } }
  function account() {
    title.textContent = '마이페이지'; const m = state.member, kakao = state.provider === 'kakao';
    content.innerHTML = `<div class="account-cover"><span class="eyebrow">MY PERSONAL DESK</span><div class="account-hero"><span class="avatar">${(m.nickname || '?').slice(0, 1)}</span><div><strong>${m.nickname}님</strong>${kakao ? `<span class="badge-kakao">${K}카카오 연결됨</span>` : '<span class="pill">일반회원</span>'}</div></div><p style="margin:0;font-size:13px;color:var(--muted)">관심 있는 뉴스와 필요한 자료를 한곳에서.</p></div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:14px"><span>내 프로필</span><button id="account-profile" style="font-size:12px;color:var(--accent)">회원정보 수정 ↗</button></div>
      <dl class="account-info"><dt>이름</dt><dd>${m.name || '-'}</dd><dt>휴대폰 번호</dt><dd>${(m.phone || '').replace(/^(\d{3})\d+(\d{4})$/, '$1-****-$2') || '-'}</dd></dl>
      <div class="account-actions"><button id="account-scraps"><i>☆</i><strong>내 스크랩</strong><span>이 브라우저에 저장한 기사</span></button><button id="account-materials"><i>▤</i><strong>나의 자료실</strong><span>날짜별 시황 · 전자책 · 고정 자료</span></button></div>
      <div class="account-bottom"><span>${window.SITE_CONFIG.siteName}</span><button id="account-logout">로그아웃</button></div>`;
    content.querySelector('#account-profile').onclick = () => { mode = 'profile'; render(); };
    content.querySelector('#account-scraps').onclick = () => { location.href = pageURL('/news', { category: '스크랩' }); };
    content.querySelector('#account-materials').onclick = () => { dialog.close(); openMaterialsPage(); };
    content.querySelector('#account-logout').onclick = logout;
  }
  function success(result) {
    state = { ...state, ...result }; nav(); notice('회원 정보가 저장됐습니다.', 'success');
    content.innerHTML = `<p style="font-size:14px">뉴스와 자료를 자유롭게 볼 수 있습니다.</p><button class="btn btn-block" id="member-view">전체 자료 보기 →</button>`;
    content.querySelector('#member-view').onclick = () => { dialog.close(); openMaterialsPage(); };
  }
  function render() {
    clearTimeout(waitTimer); const auth = state?.authenticated; notice('');
    if (!auth && mode === 'account') mode = 'signup';
    if (auth && state.member?.nickname && mode !== 'profile') { account(); return; }
    const local = mode === 'register' && !auth, login = mode === 'login' && !auth;
    title.textContent = auth ? (state.member?.nickname ? '내 회원 정보' : '회원정보 입력') : login ? '로그인' : local ? '일반회원 가입' : '회원가입';
    if (!auth && mode === 'signup') {
      content.innerHTML = `<a class="provider provider-kakao" href="${endpoint}/start/kakao">${K}카카오로 간편회원가입</a><button type="button" id="member-register" class="provider provider-general">일반회원 가입</button><div class="member-options"><span>이미 회원이신가요?</span><button type="button" id="member-login">로그인</button></div>`; return;
    }
    content.innerHTML = `<form id="member-form" class="member-form">
      ${local || login ? `<label for="m-id">아이디</label><div class="row"><input id="m-id" name="loginId" autocomplete="username" required minlength="2" maxlength="20" placeholder="영문 소문자·숫자 2~20자">${local ? '<button type="button" id="id-check">중복 확인</button>' : ''}</div><p id="id-status" class="field-note" role="status"></p>` : ''}
      ${login ? '' : `<label for="m-name">이름</label><input id="m-name" name="name" autocomplete="name" required maxlength="80" placeholder="이름을 입력해주세요"><label for="m-phone">휴대폰 번호</label><input id="m-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required maxlength="14" placeholder="010-0000-0000">
      <label for="m-nick">닉네임</label><div class="row"><input id="m-nick" name="nickname" autocomplete="nickname" required minlength="2" maxlength="20" placeholder="한글·영문·숫자·밑줄 2~20자"><button type="button" id="nick-check">중복 확인</button></div><p id="nick-status" class="field-note" role="status"></p>`}
      ${local || login ? `<label for="m-pw">비밀번호</label><input type="password" id="m-pw" name="password" autocomplete="${login ? 'current-password' : 'new-password'}" required minlength="${login ? 1 : 6}" maxlength="128" placeholder="${login ? '비밀번호' : '6자 이상 · 특수문자 포함'}">` : ''}
      ${local ? '<label for="m-pw2">비밀번호 확인</label><input type="password" id="m-pw2" name="passwordConfirm" autocomplete="new-password" required minlength="6" maxlength="128" placeholder="비밀번호를 한 번 더 입력해주세요">' : ''}
      ${login || (auth && state.member?.nickname) ? '' : `<details class="privacy"><summary>개인정보 수집·이용 안내</summary><p>수집 항목: 이름, 휴대폰 번호, 닉네임, 동의 일시, 가입 시 IP 주소. 간편가입은 로그인 제공사와 계정 식별자, 일반가입은 아이디와 비밀번호 해시를 추가로 저장합니다.<br>이용 목적: 회원 식별, 자료 제공 및 이용 안내, 부정 가입 방지.<br>보유 기간: 회원 탈퇴 시까지.<br>동의를 거부할 수 있으며, 이 경우 회원가입과 회원 자료 이용이 제한됩니다.</p></details><label class="consent"><input type="checkbox" id="m-consent" required><span>[필수] 개인정보 수집·이용에 동의합니다.</span></label>`}
      <button type="submit" class="btn btn-block">${login ? '로그인' : state?.member?.nickname ? '회원 정보 저장' : '정보입력하고 가입 완료하기'}</button></form>
      ${login ? `<div class="divider">간편 로그인</div><a class="provider provider-kakao" href="${endpoint}/start/kakao">${K}카카오로 로그인</a><div class="member-options"><span>아직 회원이 아니신가요?</span><button type="button" id="member-back">회원가입</button></div>` : `<div class="member-options"><button type="button" id="${auth ? 'member-logout' : 'member-back'}">${auth ? '로그아웃' : '다른 회원가입 방법'}</button></div>`}`;
    const form = content.querySelector('#member-form'), nick = form.querySelector('#m-nick'), nickStatus = form.querySelector('#nick-status'), idInput = form.querySelector('#m-id'), idStatus = form.querySelector('#id-status');
    if (!login) { form.querySelector('#m-name').value = state?.member?.name || ''; form.querySelector('#m-phone').value = state?.member?.phone || ''; nick.value = state?.member?.nickname || ''; }
    let checkedNick = nick?.value || '', checkedId = '';
    const check = async (input, status, path, key, setter) => { const v = input.value; try { const r = await request(`${path}?value=${encodeURIComponent(v)}`); if (input.value !== v) return; setter(r.available ? r[key] : ''); status.textContent = r.available ? '사용할 수 있습니다.' : '이미 사용 중입니다.'; status.dataset.state = r.available ? 'success' : 'error'; } catch (e) { setter(''); status.textContent = e.message; status.dataset.state = 'error'; } };
    if (nick) { nick.oninput = () => { checkedNick = ''; nickStatus.textContent = ''; }; form.querySelector('#nick-check').onclick = () => check(nick, nickStatus, '/nickname', 'nickname', v => checkedNick = v); }
    if (local) { idInput.oninput = () => { checkedId = ''; idStatus.textContent = ''; }; form.querySelector('#id-check').onclick = () => check(idInput, idStatus, '/login-id', 'loginId', v => checkedId = v); }
    form.onsubmit = async e => {
      e.preventDefault(); if (busy) return;
      if (local && (!checkedId || checkedId !== idInput.value.normalize('NFKC').trim().toLowerCase())) { idStatus.textContent = '아이디 중복 확인을 해주세요.'; idStatus.dataset.state = 'error'; idInput.focus(); return; }
      if (!login && (!checkedNick || checkedNick !== nick.value.normalize('NFKC').trim())) { nickStatus.textContent = '닉네임 중복 확인을 해주세요.'; nickStatus.dataset.state = 'error'; nick.focus(); return; }
      const body = Object.fromEntries(new FormData(form));
      if (local && body.password !== body.passwordConfirm) { notice('입력한 비밀번호가 서로 달라요.', 'error'); return; }
      if (form.querySelector('#m-consent')) body.consent = form.querySelector('#m-consent').checked;
      body.ref = source?.slug || undefined;
      busy = true; notice(login ? '로그인 중…' : auth ? '저장 중…' : '가입 처리 중…'); form.querySelector('[type=submit]').disabled = true;
      try { const err = await referralReady; if (err) throw err; success(await request(login ? '/login' : local ? '/register' : '/profile', body)); notice(login ? '로그인했습니다.' : '회원 정보가 저장됐습니다.', 'success'); }
      catch (e2) { notice(e2.message, 'error'); form.querySelector('[type=submit]').disabled = false; } finally { busy = false; }
    };
    content.querySelector('#member-logout')?.addEventListener('click', logout);
  }
  // 카카오 버튼: 복귀 위치 저장 → 추천 코드 확인 완료 대기 → 서버 /start/kakao 로 이동
  content.addEventListener('click', async e => {
    const provider = e.target.closest('a.provider-kakao');
    if (provider?.href) {
      e.preventDefault(); if (providerStarting) return; providerStarting = true;
      try {
        const back = new URL(location.href); back.searchParams.delete('auth'); if (activeArticleId()) back.hash = 'article-' + activeArticleId();
        try { sessionStorage.setItem('room-auth-return', back.pathname + back.search + back.hash); } catch {}
        waiting('카카오로 연결하고 있어요', '잠시 후 카카오 로그인 화면으로 이동합니다.');
        const err = await referralReady; if (err) throw err;
        const dest = new URL(provider.href); if (source?.slug) dest.searchParams.set('ref', source.slug);
        location.assign(dest.href);
      } catch { clearTimeout(waitTimer); providerStarting = false; render(); notice('카카오에 연결하지 못했어요. 다시 눌러주세요.', 'error'); }
      return;
    }
    const id = e.target.closest('button')?.id;
    if (id === 'member-retry') { providerStarting = false; sessionReady = loadSession(); state = null; open('login'); return; }
    if (['member-register', 'member-login', 'member-back'].includes(id)) { mode = id === 'member-register' ? 'register' : id === 'member-login' ? 'login' : 'signup'; render(); }
  });
  const activeArticleId = () => (location.hash.match(/^#article-(\d+)$/) || [])[1];
  async function open(view = 'signup') {
    document.getElementById('material-dialog')?.close();
    mode = ['login', 'profile', 'account'].includes(view) ? view : 'signup'; if (!dialog.open) dialog.showModal(); notice('');
    if (state) { render(); return; }
    waiting('로그인을 준비하고 있어요', '곧 이어집니다. 잠시만 기다려주세요.');
    const r = await sessionReady; if (r instanceof Error) { clearTimeout(waitTimer); notice('연결이 지연되고 있어요. 다시 시도해주세요.', 'error'); content.innerHTML = '<button id="member-retry" class="provider provider-general">다시 시도</button>'; } else render();
  }
  window.openAuthModal = open;
  const loadSession = () => request('/session').then(d => { state = d; nav(); return d; }).catch(e => e);
  let sessionReady = loadSession();
  nav();
  // 카카오 콜백 복귀(?auth=ready | state | token | profile)
  const url = new URL(location.href), result = url.searchParams.get('auth');
  if (result) {
    url.searchParams.delete('auth'); history.replaceState(null, '', url);
    if (!dialog.open) dialog.showModal(); waiting('카카오 연결을 마무리하고 있어요', '로그인이 끝나면 이어서 안내할게요.');
    sessionReady.then(data => {
      clearTimeout(waitTimer);
      if (data instanceof Error) { notice('연결이 지연되고 있어요. 다시 시도해주세요.', 'error'); return; }
      let target = null; try { target = sessionStorage.getItem('room-auth-return'); sessionStorage.removeItem('room-auth-return'); } catch {}
      if (result === 'ready' && data.authenticated && data.member?.nickname && target) { const back = new URL(target, location.href); if (source?.slug) back.searchParams.set('ref', source.slug); if (back.pathname !== url.pathname) { location.replace(back.href); return; } }
      mode = result === 'ready' ? (data.member?.nickname ? 'account' : 'profile') : 'login'; render();
      if (result !== 'ready') notice('카카오 로그인이 완료되지 않았습니다. 다시 시작해주세요.', 'error');
      else if (!data.member?.nickname) notice('카카오 연결 완료! 자료실 이용을 위해 회원정보를 입력해주세요.', 'success');
    });
  }
  // 다른 탭/복귀 시 세션 동기화
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state) request('/session').then(d => { state = d; nav(); }).catch(() => {}); });
  window.addEventListener('pageshow', e => { if (e.persisted) { providerStarting = false; if (state) render(); } });
  document.addEventListener('click', e => { if (!e.target.closest('#member-menu')) { const m = document.getElementById('member-menu'); if (m) m.open = false; } });
})();
