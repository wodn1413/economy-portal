// 회원 현황(가입 회원 · 오늘 가입 · 최근 5분 접속)과 200명 이벤트 배너
(() => {
  'use strict';
  const API = '/.netlify/functions/room-community', GOAL = 200;
  const host = document.getElementById('community'); if (!host) return;
  const n = v => Number.isSafeInteger(v) ? v.toLocaleString('ko-KR') : '—';
  host.innerHTML = `<div class="cm-stats glass-card"><div><span class="cm-label">함께하는 회원</span><strong data-cm="members">—</strong><small>가입 완료 계정</small></div><div><span class="cm-label">오늘 가입</span><strong data-cm="today">—</strong><small>한국시간 기준</small></div><div><span class="cm-label">최근 5분 접속</span><strong data-cm="activeBrowsers">—</strong><small>브라우저 수 · 추정</small></div><div><span class="cm-label">첫 목표</span><strong>${GOAL}<span style="font-size:14px">명</span></strong><small>달성 기념 · 총 5명 추첨</small></div></div>
  <p class="status-line" data-cm-status>회원 현황을 확인하고 있습니다.</p>
  <div class="cm-event glass-card"><span class="eyebrow">MEMBERS EVENT · 가입 회원 대상</span><h2>함께하는 회원 <em>${GOAL}명,</em><br>감사의 선물을 드립니다.</h2><p style="color:var(--muted);font-size:14px">가입 완료 회원 중 총 5분을 추첨합니다. 별도 응모나 구매는 필요하지 않습니다.</p>
  <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:800"><b data-cm-progress>현황 확인 중</b><span>목표 ${GOAL}명</span></div><progress max="${GOAL}" value="0" data-cm-bar></progress><small class="status-line" data-cm-remaining></small>
  <div class="prizes"><div class="prize"><span class="rank">1등</span><span>삼성전자 1주</span><strong>1명</strong></div><div class="prize"><span class="rank">2등</span><span>신세계상품권 10만 원</span><strong>1명</strong></div><div class="prize"><span class="rank">3등</span><span>배달의민족 상품권 3만 원</span><strong>3명</strong></div></div>
  <button class="btn btn-block" style="margin-top:16px" onclick="openAuthModal('signup')">회원가입 · 내 회원정보 →</button></div>`;
  let latest = null, failed = false, busy = false;
  function paint() {
    for (const k of ['members', 'today', 'activeBrowsers']) host.querySelector(`[data-cm="${k}"]`).textContent = failed ? '—' : n(latest?.[k]);
    host.querySelector('[data-cm-status]').textContent = failed ? '집계 연결을 확인하지 못했습니다.' : latest ? new Date(latest.asOf).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' KST 확인 · 1분 간격' : '';
    const c = failed ? null : latest?.members;
    host.querySelector('[data-cm-progress]').textContent = Number.isSafeInteger(c) ? `${n(c)} / ${GOAL}` : '현황 확인 중';
    host.querySelector('[data-cm-bar]').value = Number.isSafeInteger(c) ? Math.min(c, GOAL) : 0;
    host.querySelector('[data-cm-remaining]').textContent = Number.isSafeInteger(c) ? (c >= GOAL ? '목표 달성 · 추첨 일정은 자료실 공지로 안내합니다.' : `첫 목표까지 ${n(GOAL - c)}명 남았습니다.`) : '';
  }
  async function refresh() {
    if (document.hidden || busy) return; busy = true;
    try { const priv = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
      const res = await fetch(API, { method: priv ? 'GET' : 'POST', headers: priv ? {} : { 'X-Room-Presence': '1' }, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw 0; latest = await res.json(); failed = false; } catch { failed = true; } finally { busy = false; paint(); }
  }
  paint(); refresh(); setInterval(refresh, 60000);
})();
