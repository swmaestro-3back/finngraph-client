type GapOwner = 'backend' | 'kg-api' | 'etl' | 'data'

interface GapInfo {
  title: string
  needs: string
  owners: readonly GapOwner[]
}

export const GAPS = {
  'stock-quote-ext': {
    title: '52주 범위·변동액·거래대금',
    needs: '종목 응답에 52주 최고·최저와 날짜, 신고가·신저가 여부, 변동액, 당일 거래대금과 평소 대비 배수, 시장 안 시가총액 순위',
    owners: ['backend'],
  },
  'stock-themes': {
    title: '종목 소속 테마',
    needs: '종목 상세에 소속 테마 전체(id·이름·표시 순서)',
    owners: ['backend'],
  },
  'financials-quarter': {
    title: '분기 실적·추가 재무 지표',
    needs: '분기 매출액·영업이익, BPS, 유동비율',
    owners: ['backend', 'etl'],
  },
  'stock-keystats-compare': {
    title: '핵심 지표 비교',
    needs: 'PER·PBR·ROE·배당수익률의 비교 테마 중앙값과 비교 테마 정보',
    owners: ['backend'],
  },
  issues: {
    title: '이슈',
    needs: '날짜별 이슈 목록·상세·묶인 기사·뉴스에 나온 종목, 서로 다른 매체 수, 이슈 요약',
    owners: ['backend', 'etl'],
  },
  'issue-timeline': {
    title: '이슈 흐름',
    needs: '앞선 이슈와 이어지는 이슈의 흐름(노드별 날짜·제목·매체 수·요약)',
    owners: ['backend', 'etl'],
  },
  'theme-issue': {
    title: '테마 대표 이슈',
    needs: '테마별 대표 이슈(id·제목·매체 수)와 선정 규칙',
    owners: ['backend'],
  },
  'stock-issues': {
    title: '종목이 나온 이슈',
    needs: '종목별 이슈·흐름, 이슈 날짜의 주가 매핑, 대표 이슈',
    owners: ['backend', 'kg-api'],
  },
  'watchlist-issues': {
    title: '관심 종목 소식',
    needs: '관심 종목별 날짜별 관련 이슈 수와 최근 이슈',
    owners: ['backend'],
  },
  'linked-companies': {
    title: '이어진 기업',
    needs: '이런 기업은 어때요?(대상·경로·관계 유형·근거 강도·근거 문장), 비회원 공개 집계, 회원 전용 서버 차단',
    owners: ['kg-api', 'backend', 'etl'],
  },
  disclosures: {
    title: '공시',
    needs: '일반 공시 목록(접수 시각·공시명·요지 한 줄·원문 링크)',
    owners: ['etl', 'backend'],
  },
  'investor-flow-amount': {
    title: '투자자별 순매수 금액',
    needs: '외국인·기관·개인 순매수 금액(원)',
    owners: ['etl', 'backend'],
  },
  movers: {
    title: '많이 움직인 종목 선정',
    needs: '대상 규칙(유니버스·제외 조건)과 대표 이슈를 서버가 정한 목록',
    owners: ['backend'],
  },
  search: {
    title: '검색',
    needs: '종목·테마·이슈를 한 번에 찾는 검색 API(별칭 포함)',
    owners: ['backend'],
  },
  logos: {
    title: '종목 로고',
    needs: '종목 로고 이미지와 원천·라이선스',
    owners: ['data'],
  },
} as const satisfies Record<string, GapInfo>

export type GapId = keyof typeof GAPS

export const GAP_IDS = Object.keys(GAPS) as GapId[]
