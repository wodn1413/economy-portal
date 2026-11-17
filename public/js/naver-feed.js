// 서버 함수(/.netlify/functions/naver-news)에서 카테고리별 최신 뉴스를 받아 LIVE_NEWS로 합칩니다.
(() => {
  'use strict';
  const categories = { economy: '경제·증시', society: '사회이슈', global_markets: '글로벌', global_economy: '글로벌', global_tech: '글로벌', politics: '정치', diplomacy: '정치' };
  const labels = { global_markets: '미국 증시', global_economy: '세계 경제', global_tech: '글로벌 테크', politics: '정치·정책', diplomacy: '외교', economy: '경제·증시', society: '사회' };
  const plain = html => new DOMParser().parseFromString(String(html), 'text/html').body.textContent || '';
  const fmt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const newsId = url => { let h = 0; for (const c of url) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0; return 1e10 + h; };
  const feeds = new Map(); let sample = false;
  function render() {
    const unique = new Map();
    for (const f of feeds.values()) for (const it of f.items) { const p = unique.get(it.url); if (p) { if (!p.categories.includes(it.category)) p.categories.push(it.category); } else unique.set(it.url, { ...it, categories: [it.category] }); }
    window.LIVE_NEWS = [...unique.values()].sort((a, b) => b.publishedAt - a.publishedAt);
    window.renderAfterNews?.();
    const s = document.getElementById('news-status'); if (s) s.textContent = sample ? '샘플 뉴스 표시 중 · 네이버 API 키를 넣으면 실제 뉴스가 나옵니다.' : '기사 확인 ' + fmt.format(new Date()) + ' KST';
  }
  async function load() {
    await Promise.allSettled(Object.keys(categories).map(async key => {
      const res = await fetch('/.netlify/functions/naver-news?category=' + key, { signal: AbortSignal.timeout(16000) }); if (!res.ok) throw 0;
      const data = await res.json(); if (data.sample) sample = true;
      feeds.set(key, { items: (data.items || []).map(i => ({ id: newsId(i.link), url: i.link, category: categories[key], tag: labels[key], title: plain(i.title), summary: plain(i.description), date: fmt.format(new Date(i.pubDate)), publishedAt: Date.parse(i.pubDate), body: [] })) });
      render();
    }));
  }
  document.addEventListener('DOMContentLoaded', load);
  setInterval(() => { if (!document.hidden) load(); }, 36e5);
})();
