// 회원 전용 자료 목록(전체). 공개용 목록은 public/js/data.js 의 ROOM_DATA (미리보기만).
// 실제 PDF/이미지는 public/assets/library/ 아래에 두고, 비회원에게 주소가 노출되지 않도록
// 파일명은 추측하기 어려운 값(해시)을 쓰는 것을 권장합니다.
export const FULL_MATERIALS = {
  full: true,
  days: [
    {
      date: '2026-11-14', label: '11월 14일 금요일', status: '일별 자료',
      basis: '국내 관측일 2026-11-14',
      docs: [
        { title: '오늘의 시장 브리핑', tag: 'MARKET JOURNAL', description: '국내 지수와 미국장·환율·금리·유가 비교.', pages: 2,
          preview: 'assets/teasers/sample-brief.svg', path: 'assets/library/daily/2026-11-14-brief.pdf',
          pageImages: ['assets/teasers/sample-brief.svg', 'assets/teasers/sample-brief-2.svg'] },
        { title: '종목별 관찰 노트', tag: 'EQUITY NOTES', description: 'SK하이닉스 · 삼성전자 관찰 가격.', pages: 3,
          preview: 'assets/teasers/sample-notes.svg', path: 'assets/library/daily/2026-11-14-notes.pdf',
          pageImages: ['assets/teasers/sample-notes.svg'] }
      ]
    }
  ],
  materials: [
    { kind: 'book', title: '코스피 20000의 시대', tag: 'E-BOOK', description: '전자책 전체(회원 전용).', path: 'assets/library/books/kospi-20000.pdf', pageImages: ['assets/teasers/sample-book.svg'] },
    { kind: 'pdf', title: '매수·매도 타점 체크리스트', tag: 'CHECKLIST', description: '진입·청산 전 점검 항목.', path: 'assets/library/fixed/checklist.pdf', pageImages: ['assets/teasers/sample-check.svg'] },
    { kind: 'pdf', title: '보조지표 사용법 + Pine 템플릿', tag: 'INDICATOR', description: '지표 설명서와 트레이딩뷰 템플릿.', path: 'assets/library/fixed/indicator.pdf', template: 'assets/library/fixed/indicator.pine', pageImages: ['assets/teasers/sample-ind.svg'] }
  ]
};
