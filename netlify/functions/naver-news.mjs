// 네이버 뉴스 검색 API 프록시(키는 서버에만). 10분 메모리 캐시. 키가 없으면 샘플 응답.
const QUERIES = { economy: '경제 증시', society: '사회 이슈', global_markets: '미국 증시', global_economy: '세계 경제', global_tech: '글로벌 테크', politics: '정치 정책', diplomacy: '외교' };
const cache = new Map();
export default async function handler(req) {
  const category = new URL(req.url).searchParams.get('category');
  const query = QUERIES[category];
  const h = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300' };
  if (!query) return new Response(JSON.stringify({ error: 'unknown category' }), { status: 400, headers: h });
  const hit = cache.get(category);
  if (hit && Date.now() - hit.at < 10 * 60e3) return new Response(JSON.stringify(hit.data), { headers: h });
  const id = process.env.NAVER_CLIENT_ID, secret = process.env.NAVER_CLIENT_SECRET;
  let data;
  if (!id || !secret) {
    data = { query, checkedAt: new Date().toISOString(), sample: true, items: [
      { title: `[샘플] ${query} 관련 기사 제목`, link: 'https://news.naver.com/', description: 'NAVER_CLIENT_ID/SECRET 환경변수를 넣으면 실제 뉴스가 표시됩니다.', pubDate: new Date().toUTCString() }
    ] };
  } else {
    const res = await fetch('https://openapi.naver.com/v1/search/news.json?display=12&sort=date&query=' + encodeURIComponent(query), {
      headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret } });
    if (!res.ok) return new Response(JSON.stringify({ error: 'naver api ' + res.status }), { status: 502, headers: h });
    const body = await res.json();
    data = { query, checkedAt: new Date().toISOString(), items: (body.items || []).map(i => ({ title: i.title, link: i.link, originallink: i.originallink, description: i.description, pubDate: i.pubDate })) };
  }
  cache.set(category, { at: Date.now(), data });
  return new Response(JSON.stringify(data), { headers: h });
}
export const config = { path: '/.netlify/functions/naver-news' };
