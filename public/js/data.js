// ===== 공개 데이터 (편집해서 쓰세요). 회원 전용 자료는 서버(netlify/functions/lib/materials.mjs)에만 둡니다. =====
window.PORTAL_DATA = {
  checkedAt: '2026-11-17T12:10:00+09:00',
  basis: '11/17 12:10 편집 | KRX 장중 | 미국 16일 마감',
  quotes: [
    { name: 'KOSPI', value: '5,050.70', change: '-0.98%', tone: 'down', asOf: '11/17 12:00 KST' },
    { name: 'KOSDAQ', value: '659.93', change: '-0.86%', tone: 'down', asOf: '11/17 11:59 KST' },
    { name: '삼성전자', value: '192,800', change: '-2.03%', tone: 'down', asOf: '11/17 12:00 KST' },
    { name: 'SK하이닉스', value: '1,137,500', change: '-1.52%', tone: 'down', asOf: '11/17 12:00 KST' },
    { name: 'USD/KRW', value: '1,339.30', change: '+0.21%', tone: 'up', asOf: '11/17 11:59 KST' },
    { name: 'S&P 500', value: '6,710.12', change: '+0.35%', tone: 'up', asOf: '11/16 마감' },
    { name: 'VIX', value: '22.91', change: '-1.80%', tone: 'down', asOf: '11/16 마감' }
  ],
  // 종목 리모컨
  radar: [
    { name: '삼성전자', code: '005930', price: '192,800', change: '-2.03%', tone: 'down', rows: [['전일 종가', '196,800'], ['외국인 순매수', '-5,854억'], ['20일선', '188,420'], ['52주 고가', '201,500']] },
    { name: 'SK하이닉스', code: '000660', price: '1,137,500', change: '-1.52%', tone: 'down', rows: [['전일 종가', '1,155,000'], ['외국인 순매수', '-2,310억'], ['20일선', '1,092,000'], ['52주 고가', '1,188,000']] }
  ],
  leadId: 1,
  topIds: [1, 2, 3, 4, 5],
  leadFacts: [
    { label: '지수', value: 'KOSPI 5,050', detail: '장중 -0.98%, 외국인 현물 매도 확대' },
    { label: '환율', value: '1,339원', detail: '달러 강세 지속, 수출주 체감' },
    { label: '이벤트', value: '엔비디아 실적', detail: '17일 미국장 마감 후 발표' }
  ],
  // 자체 해설 기사(핫토픽). body는 문단 배열.
  articles: [
    { id: 1, category: '핫토픽', tag: '반도체', title: '엔비디아 실적 D-1, 삼성전자·SK하이닉스 수급 점검', date: '2026-11-17 11:40', author: '편집부',
      summary: '외국인 현물 매도가 오전 내내 확대됐습니다. 실적 발표 이후 시나리오를 세 가지로 정리합니다.',
      body: ['17일 오전 외국인은 코스피 현물에서 8,000억 원 넘게 순매도했습니다. 반도체 양대 종목이 하락을 주도했습니다.', '엔비디아 3분기 실적은 한국시간 18일 새벽에 나옵니다. 가이던스가 시장 기대(약 560억 달러)를 넘는지가 핵심입니다.', '시나리오별 체크 가격은 종목 리서치 자료에서 확인하세요.'] },
    { id: 2, category: '경제·증시', tag: '증시', title: '코스피 5,000선 공방, 개인 매수 vs 외국인 매도', date: '2026-11-17 10:20', author: '편집부', summary: '5,000선은 심리적 지지선입니다. 수급 주체별 흐름을 정리했습니다.', body: ['개인은 1조 원 가까이 순매수하며 지수를 받쳤습니다.', '선물 시장에서는 외국인이 소폭 순매수로 전환했습니다.'] },
    { id: 3, category: '글로벌', tag: '미국 증시', title: '미 국채 10년물 4.1%대 안착, 성장주에 우호적', date: '2026-11-17 08:30', author: '편집부', summary: '금리 하락은 기술주 밸류에이션 부담을 낮춥니다.', body: ['16일 미 국채 10년물 수익률은 4.12%로 마감했습니다.'] },
    { id: 4, category: '정치', tag: '정책', title: '반도체 특별법 시행령 입법예고, 세액공제 범위 확대', date: '2026-11-16 17:00', author: '편집부', summary: '시설투자 세액공제 범위에 후공정 장비가 포함됐습니다.', body: ['입법예고 기간은 12월 초까지입니다.'] },
    { id: 5, category: '사회이슈', tag: '사회', title: '연말 소비 심리 지수 반등, 유통주 관심', date: '2026-11-16 15:10', author: '편집부', summary: '소비자심리지수가 석 달 만에 100을 회복했습니다.', body: ['한국은행 11월 소비자동향조사 결과입니다.'] }
  ]
};
// 자료실 공개 목록(미리보기·잠금 표시용). full:false
window.ROOM_DATA = {
  full: false,
  days: [
    { date: '2026-11-13', label: '11월 13일 목요일', status: '일별 자료', basis: '국내 관측일 2026-11-13',
      docs: [
        { title: '오늘의 시장 브리핑', tag: 'MARKET JOURNAL', description: '국내 지수와 미국장·환율·금리·유가 비교.', pages: 2, preview: 'assets/teasers/sample-brief.svg' },
        { title: '종목별 관찰 노트', tag: 'EQUITY NOTES', description: 'SK하이닉스 · 삼성전자 관찰 가격.', pages: 3, preview: 'assets/teasers/sample-notes.svg' } ] },
    { date: '2026-11-14', label: '11월 14일 금요일', status: '일별 자료', basis: '국내 관측일 2026-11-14',
      docs: [
        { title: '오늘의 시장 브리핑', tag: 'MARKET JOURNAL', description: '국내 지수와 미국장·환율·금리·유가 비교.', pages: 2, preview: 'assets/teasers/sample-brief.svg' },
        { title: '종목별 관찰 노트', tag: 'EQUITY NOTES', description: 'SK하이닉스 · 삼성전자 관찰 가격.', pages: 3, preview: 'assets/teasers/sample-notes.svg' } ] }
  ],
  materials: [
    { kind: 'book', title: '코스피 20000의 시대', tag: 'E-BOOK', description: '전자책 (회원 전용 전체 열람).' },
    { kind: 'pdf', title: '매수·매도 타점 체크리스트', tag: 'CHECKLIST', description: '진입·청산 전 점검 항목.' },
    { kind: 'pdf', title: '보조지표 사용법 + Pine 템플릿', tag: 'INDICATOR', description: '지표 설명서와 트레이딩뷰 템플릿.', template: true }
  ]
};
window.ECONOMIC_CALENDAR = {
  verifiedAt: '2026-11-10',
  events: [
    { id: 'nvda-q3', title: '엔비디아 3분기 실적 발표', country: '미국', start: '2026-11-18', timeLabel: '한국시간 새벽', kind: '실적', priority: 5 },
    { id: 'fomc-minutes', title: 'FOMC 의사록 공개', country: '미국', start: '2026-11-20', timeLabel: '한국시간 04:00', kind: '통화정책', priority: 4 },
    { id: 'bok-rate', title: '한국은행 금융통화위원회', country: '한국', start: '2026-11-27', timeLabel: '10:00', kind: '통화정책', priority: 5 },
    { id: 'kr-export', title: '11월 수출입 동향(1~20일)', country: '한국', start: '2026-11-21', timeLabel: '09:00', kind: '지표', priority: 3 },
    { id: 'us-pce', title: '미국 10월 PCE 물가', country: '미국', start: '2026-11-26', timeLabel: '한국시간 22:30', kind: '지표', priority: 4 },
    { id: 'us-thanks', title: '미국 추수감사절 휴장', country: '미국', start: '2026-11-26', timeLabel: '종일', kind: '휴장', priority: 2 },
    { id: 'opec', title: 'OPEC+ 정례회의', country: '글로벌', start: '2026-11-30', timeLabel: '미정', kind: '원자재', priority: 3 },
    { id: 'kr-cpi', title: '11월 소비자물가 발표', country: '한국', start: '2026-12-02', timeLabel: '08:00', kind: '지표', priority: 4 },
    { id: 'us-jobs', title: '미국 11월 고용보고서', country: '미국', start: '2026-12-04', timeLabel: '한국시간 22:30', kind: '지표', priority: 5 },
    { id: 'fomc-dec', title: 'FOMC 금리 결정', country: '미국', start: '2026-12-10', timeLabel: '한국시간 04:00', kind: '통화정책', priority: 5 }
  ]
};
