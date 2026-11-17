// 페이지 렌더링: 티커·핫토픽·피드·리모컨·자료실(잠금)·달력·뉴스
'use strict';
const D = window.PORTAL_DATA, publicRoom = window.ROOM_DATA;
let R = publicRoom, materialsUnlocked = false, activeMaterial = null, activeArticle = null, selectedDate = R.days.at(-1)?.date;
let studioCategory = '전체', studioLimit = 6, newsCategory = '전체', newsSearch = '';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const page = document.body.dataset.page;
const timeFmt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false });
const dateFmt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit' });

// ---------- 티커 ----------
(function ticker() {
  const host = $('market-ticker'); if (!host) return;
  const items = D.quotes.map(q => `<span title="${esc(q.asOf)}">${esc(q.name)} <b class="${q.tone}">${esc(q.value)} ${esc(q.change)}</b></span>`).join('');
  host.innerHTML = `<div class="ticker-track">${items}${items}</div>`;
})();

// ---------- 기사 모음 ----------
const allArticles = () => [...D.articles, ...(window.LIVE_NEWS || [])];
const findArticle = id => allArticles().find(a => a.id === id);
const scraps = () => { try { return JSON.parse(localStorage.getItem('room-scraps') || '[]'); } catch { return []; } };
function toggleScrapCurrent() {
  if (activeArticle === null) return; let list = scraps();
  list = list.includes(activeArticle) ? list.filter(x => x !== activeArticle) : [...list, activeArticle];
  localStorage.setItem('room-scraps', JSON.stringify(list)); triggerToast(list.includes(activeArticle) ? '스크랩했습니다.' : '스크랩을 해제했습니다.'); $('modal-scrap-btn').textContent = list.includes(activeArticle) ? '★ 스크랩됨' : '☆ 스크랩';
}
function openArticleReader(id) {
  const a = findArticle(id); if (!a) return; activeArticle = id;
  $('read-tag').textContent = a.tag || a.category; $('read-title').textContent = a.title; $('read-meta').textContent = `${a.author || '네이버 뉴스'} · ${a.date}`;
  $('modal-scrap-btn').textContent = scraps().includes(id) ? '★ 스크랩됨' : '☆ 스크랩';
  $('read-body').innerHTML = (a.body?.length ? a.body.map(p => `<p>${esc(p)}</p>`).join('') : `<p>${esc(a.summary)}</p>`) + (a.url ? `<p><a class="btn btn-ghost btn-sm" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">원문 기사 보기 ↗</a></p>` : '');
  const d = $('article-modal'); if (!d.open) d.showModal();
  history.replaceState(null, '', '#article-' + id);
}
function closeArticleReader() { $('article-modal').close(); activeArticle = null; history.replaceState(null, '', location.pathname + location.search); }
async function shareCurrentArticle() { try { await navigator.clipboard.writeText(location.href); triggerToast('이 뉴스의 링크를 복사했습니다.'); } catch { triggerToast('주소창의 링크를 복사해주세요.'); } }
function shareCurrentArticleKakao() { const a = findArticle(activeArticle); if (a) window.kakaoShare?.({ title: a.title, description: a.summary, url: location.href }); }
const feedRow = a => { const at = a.publishedAt || Date.parse(a.date); return `<button class="feed-item" onclick="openArticleReader(${a.id})"><span class="feed-time">${a.publishedAt ? timeFmt.format(at) : '해설'}<br><small>${Number.isFinite(at) ? dateFmt.format(at) : ''}</small></span><span><h4>${esc(a.title)}</h4><p>${esc(a.summary)}</p><span class="feed-meta"><b>${esc(a.tag || a.category)}</b>${esc(a.author || '네이버 뉴스')}</span></span></button>`; };

// ---------- 홈 ----------
function renderOverview() {
  const lead = findArticle(D.leadId); if (!$('lead-story') || !lead) return;
  $('lead-story').innerHTML = `<span class="tag">${esc(lead.tag)}</span><h3>${esc(lead.title)}</h3><p>${esc(lead.summary)}</p><div class="facts">${D.leadFacts.map(f => `<div class="fact"><small>${esc(f.label)}</small><strong>${esc(f.value)}</strong><span>${esc(f.detail)}</span></div>`).join('')}</div><button class="btn" onclick="openArticleReader(${lead.id})">해설 전체 읽기 →</button>`;
  $('update-status').textContent = D.basis;
}
function studioRows() {
  return allArticles().filter(a => studioCategory === '전체' || (studioCategory === '핫토픽' && D.articles.includes(a)) || (studioCategory === '반도체' && /삼성전자|하이닉스|반도체|엔비디아/.test(a.title + a.tag)) || a.category === studioCategory || a.categories?.includes(studioCategory))
    .sort((a, b) => (b.publishedAt || Date.parse(b.date) || 0) - (a.publishedAt || Date.parse(a.date) || 0));
}
function studioFilterNews(v) { studioCategory = v; studioLimit = 6; renderStudioFeed(); }
function studioMoreNews() { studioLimit += 6; renderStudioFeed(); }
function renderStudioFeed() {
  const host = $('studio-feed'); if (!host) return;
  document.querySelectorAll('[data-f]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === studioCategory)));
  const rows = studioRows(); host.innerHTML = rows.slice(0, studioLimit).map(feedRow).join('') || '<p class="empty">표시할 뉴스가 없습니다.</p>';
  $('studio-more').hidden = rows.length <= studioLimit;
}
function renderRanking() { const host = $('studio-ranking'); if (!host) return; host.innerHTML = D.topIds.map((id, i) => { const a = findArticle(id); return a ? `<button onclick="openArticleReader(${id})"><i>${String(i + 1).padStart(2, '0')}</i><span>${esc(a.title)}</span></button>` : ''; }).join(''); }
let radarIndex = 0;
function selectRadar(i) { radarIndex = i; renderRadar(); }
function renderRadar() {
  const host = $('radar-cards'); if (!host) return;
  document.querySelectorAll('[data-stock]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.stock) === radarIndex)));
  const s = D.radar[radarIndex];
  host.innerHTML = `<div class="radar"><small style="color:var(--muted)">${esc(s.code)} · ${esc(D.quotes.find(q => q.name === s.name)?.asOf || '')}</small><div><span class="price">${esc(s.price)}</span><span class="chg ${s.tone}">${esc(s.change)}</span></div><dl>${s.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>`;
}
function renderHomeNews() {
  const host = $('home-news-grid'); if (!host) return;
  const cats = ['경제·증시', '글로벌', '정치', '사회이슈'];
  host.innerHTML = cats.map(c => { const a = allArticles().filter(x => x.category === c || x.categories?.includes(c)).sort((a, b) => (b.publishedAt || Date.parse(b.date) || 0) - (a.publishedAt || Date.parse(a.date) || 0))[0]; return a ? `<button class="glass-card news-card" onclick="openArticleReader(${a.id})"><small>${esc(c)}</small><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p></button>` : ''; }).join('');
}

// ---------- 자료실 ----------
const materialEdition = d => `${d.pages || ''}쪽 · ${d.tag}`;
function renderLatestResearch() {
  const host = $('latest-research-list'); if (!host) return; const day = R.days.find(d => d.date === selectedDate) || R.days.at(-1); if (!day) return;
  host.innerHTML = day.docs.slice(0, 2).map((d, i) => `<button class="glass-card research-highlight" onclick="location.href=pageURL('/research',{date:'${day.date}'})"><span class="research-cover"><small>${i ? 'RESEARCH' : 'MARKET'}</small><b>${i ? '종목<br>리서치' : '시장<br>브리핑'}</b><span>경제플러스</span></span><span class="research-copy"><small>${esc(day.label)} · ${esc(materialEdition(d))}</small><strong>${esc(d.title)}</strong><span>${esc(d.description)}</span><em>${materialsUnlocked ? '전체 열람' : '상단 미리보기'} ↗</em></span></button>`).join('');
}
function renderHomeMaterials() {
  const host = $('home-materials-container'); if (!host) return;
  host.innerHTML = R.materials.slice(0, 3).map((d, i) => `<button class="glass-card material" style="text-align:left" onclick="previewFixed(${i})"><div class="top"><span class="kind">${d.kind === 'book' ? 'E-BOOK' : d.template ? 'PINE + PDF' : 'PDF'}</span><span>${materialsUnlocked ? '회원 열람' : '🔒 회원 전용'}</span></div><h3>${esc(d.title)}</h3><p>${esc(d.description)}</p></button>`).join('');
}
function renderVault() {
  const tabs = $('date-tabs'), host = $('vault-grid'); if (!host) return;
  const wanted = new URL(location.href).searchParams.get('date'); if (wanted && R.days.some(d => d.date === wanted)) selectedDate = wanted;
  if (tabs) tabs.innerHTML = R.days.map(d => `<button aria-pressed="${d.date === selectedDate}" onclick="selectedDate='${d.date}';renderVault()">${esc(d.label)}</button>`).join('');
  const day = R.days.find(d => d.date === selectedDate);
  if ($('vault-basis')) $('vault-basis').textContent = day ? `${day.status} · ${day.basis}` : '';
  const docs = [...(day?.docs || []), ...R.materials];
  host.innerHTML = docs.map((d, i) => { const fixed = i >= (day?.docs.length || 0), locked = fixed && !materialsUnlocked;
    return `<article class="glass-card material"><div class="top"><span class="kind">${d.kind === 'book' ? 'E-BOOK' : d.template ? 'PINE + PDF' : 'PDF'}</span><span style="color:var(--muted)">${locked ? '회원 전용' : fixed ? '고정 자료' : esc(materialEdition(d))}</span></div><h3>${esc(d.title)}</h3><p>${esc(d.description)}</p>
    ${!materialsUnlocked ? (fixed ? '<div class="locked"><span>🔒</span><p style="margin:0">로그인 후 열람할 수 있는 자료입니다.</p></div>' : `<div class="teaser"><img src="${esc(d.preview)}" alt="${esc(d.title)} 첫 페이지 상단" loading="lazy"></div>`) : ''}
    <div class="actions">${materialsUnlocked ? `<button style="color:var(--accent)" onclick="previewDoc(${i})">자료 보기 →</button><a href="${esc(d.path)}" target="_blank" rel="noopener noreferrer">${d.kind === 'book' ? '전자책 원본' : 'PDF 전체'} ↗</a>${d.template ? `<a style="color:var(--accent)" href="${esc(d.template)}" download>템플릿 받기 ↓</a>` : ''}` : `<button class="btn btn-sm" onclick="openAuthModal('login')">로그인하여 전체 확인 →</button>`}</div></article>`; }).join('');
}
function previewFixed(i) { if (!materialsUnlocked) { openAuthModal('login'); return; } location.href = pageURL('/library'); }
function previewDoc(i) {
  const day = R.days.find(d => d.date === selectedDate), docs = [...(day?.docs || []), ...R.materials], d = docs[i]; if (!d) return;
  const fixed = i >= (day?.docs.length || 0); if (fixed && !materialsUnlocked) { openAuthModal('login'); return; }
  activeMaterial = i; $('material-title').textContent = d.title;
  const pages = materialsUnlocked ? (d.pageImages || [d.preview]) : [d.preview];
  $('material-pages').innerHTML = pages.map((p, j) => `<img src="${esc(p)}" alt="${esc(d.title)} ${j + 1}페이지">`).join('');
  $('material-actions').innerHTML = materialsUnlocked ? `<span>회원 전체 열람</span><a class="btn btn-sm" href="${esc(d.path)}" target="_blank" rel="noopener noreferrer">${d.kind === 'book' ? '전자책 원본 보기' : 'PDF 전체 보기'} ↗</a>` : `<span>첫 페이지 미리보기 · 로그인 후 전체 자료를 볼 수 있습니다.</span><button class="btn btn-sm" onclick="openAuthModal('login')">로그인하고 전체 보기 →</button>`;
  const dlg = $('material-dialog'); if (!dlg.open) dlg.showModal();
}
// 로그인 상태에 따라 회원 전용 목록(서버)을 받아와 교체. member-auth.js가 세션 변화 때마다 호출.
async function setMaterialAccess(session) {
  const allowed = Boolean(session?.authenticated && session.member?.nickname);
  if (allowed && !materialsUnlocked) {
    try { const res = await fetch('/.netlify/functions/member-auth/materials', { credentials: 'same-origin', cache: 'no-store' }); if (!res.ok) throw 0; const full = await res.json(); if (!Array.isArray(full.days)) throw 0; R = full; materialsUnlocked = true; }
    catch { R = publicRoom; materialsUnlocked = false; triggerToast('전체 자료를 불러오지 못했습니다. 다시 로그인해주세요.'); }
  } else if (!allowed) { R = publicRoom; materialsUnlocked = false; }
  if (!R.days.some(d => d.date === selectedDate)) selectedDate = R.days.at(-1)?.date;
  renderVault(); renderLatestResearch(); renderHomeMaterials();
}
window.setMaterialAccess = setMaterialAccess;

// ---------- 달력 ----------
const EV = window.ECONOMIC_CALENDAR?.events || [];
const kstToday = () => new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
let calMonth = kstToday().slice(0, 7);
function monthGrid(ym) { const [y, m] = ym.split('-').map(Number); const first = new Date(Date.UTC(y, m - 1, 1)); const start = new Date(first); start.setUTCDate(1 - first.getUTCDay()); return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setUTCDate(start.getUTCDate() + i); return d.toISOString().slice(0, 10); }); }
function renderMiniCalendar() {
  const host = $('home-calendar'); if (!host) return; const today = kstToday(), ym = today.slice(0, 7);
  host.innerHTML = `<header><span>${ym.replace('-', '년 ')}월</span><a class="link-more" href="/calendar">전체 ↗</a></header><div class="days">${['일', '월', '화', '수', '목', '금', '토'].map(d => `<span class="dow">${d}</span>`).join('')}${monthGrid(ym).map(d => `<span class="d ${d.slice(0, 7) !== ym ? 'other' : ''} ${d === today ? 'today' : ''} ${EV.some(e => e.start === d) ? 'has' : ''}">${Number(d.slice(8))}</span>`).join('')}</div>`;
  const up = $('upcoming-events'); if (up) up.innerHTML = EV.filter(e => e.start >= today).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 5).map(e => `<div class="event"><time>${e.start.slice(5).replace('-', '/')}</time><div>${esc(e.title)}<small>${esc(e.country)} · ${esc(e.timeLabel)} · ${esc(e.kind)}</small></div></div>`).join('');
}
function renderFullCalendar() {
  const host = $('full-calendar'); if (!host) return; const today = kstToday();
  $('cal-title').textContent = calMonth.replace('-', '년 ') + '월';
  host.innerHTML = ['일', '월', '화', '수', '목', '금', '토'].map(d => `<div class="dow" style="text-align:center;font-size:11px;color:var(--muted);font-weight:800">${d}</div>`).join('') + monthGrid(calMonth).map(d => `<div class="cal-cell ${d.slice(0, 7) !== calMonth ? 'other' : ''} ${d === today ? 'today' : ''}"><b>${Number(d.slice(8))}</b>${EV.filter(e => e.start === d).map(e => `<span class="ev" title="${esc(e.title)}">${esc(e.title)}</span>`).join('')}</div>`).join('');
  const list = $('cal-list'); if (list) list.innerHTML = EV.filter(e => e.start.startsWith(calMonth)).sort((a, b) => a.start.localeCompare(b.start)).map(e => `<div class="event"><time>${e.start.slice(5).replace('-', '/')}</time><div>${esc(e.title)} ${'★'.repeat(e.priority || 0)}<small>${esc(e.country)} · ${esc(e.timeLabel)} · ${esc(e.kind)}</small></div></div>`).join('') || '<p class="empty">이 달의 등록된 일정이 없습니다.</p>';
}
function shiftMonth(n) { const [y, m] = calMonth.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); calMonth = d.toISOString().slice(0, 7); renderFullCalendar(); }

// ---------- 뉴스 페이지 ----------
function switchCategory(c) { newsCategory = c; renderNews(); }
function renderNews() {
  const host = $('news-container'); if (!host) return;
  document.querySelectorAll('[data-nc]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.nc === newsCategory)));
  const q = newsSearch.trim().toLowerCase(), mine = scraps();
  const rows = allArticles().filter(a => newsCategory === '전체' || (newsCategory === '스크랩' ? mine.includes(a.id) : a.category === newsCategory || a.categories?.includes(newsCategory)))
    .filter(a => !q || (a.title + a.summary).toLowerCase().includes(q)).sort((a, b) => (b.publishedAt || Date.parse(b.date) || 0) - (a.publishedAt || Date.parse(a.date) || 0));
  host.innerHTML = rows.map(feedRow).join('') || '<p class="empty">조건에 맞는 뉴스가 없습니다.</p>';
}
function renderHot() { const host = $('hot-list'); if (!host) return; host.innerHTML = D.articles.map(a => `<button class="glass-card news-card" onclick="openArticleReader(${a.id})"><small>${esc(a.tag)}</small><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p></button>`).join(''); }

// 라이브 뉴스가 갱신될 때 다시 그리기
window.renderAfterNews = () => { renderStudioFeed(); renderHomeNews(); renderNews(); };
document.addEventListener('DOMContentLoaded', () => {
  renderOverview(); renderStudioFeed(); renderRanking(); renderRadar(); renderHomeNews(); renderHomeMaterials(); renderLatestResearch(); renderVault(); renderMiniCalendar(); renderFullCalendar(); renderNews(); renderHot();
  const search = $('feed-search-input'); if (search) { search.oninput = () => { newsSearch = search.value; renderNews(); }; const u = new URL(location.href); if (u.searchParams.get('category')) switchCategory(u.searchParams.get('category')); if (u.searchParams.get('search')) search.focus(); }
  const a = location.hash.match(/^#article-(\d+)$/); if (a) openArticleReader(Number(a[1]));
});
