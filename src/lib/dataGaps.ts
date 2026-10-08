type GapOwner = 'backend' | 'kg-api' | 'etl' | 'data'

interface GapInfo {
  title: string
  needs: string
  owners: readonly GapOwner[]
}

export const GAPS = {
  'stock-quote-ext': {
    title: '거래대금 평소 대비',
    needs: '당일 거래대금의 평소 대비 배수와 평소의 기준(기간·평균 방식)',
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
    title: '이슈 해설',
    needs: '뉴스에 나온 종목별 뉴스 속 역할(AI 한 줄), 근거 시트의 관계 문장',
    owners: ['backend', 'etl'],
  },
  'issue-timeline': {
    title: '이슈 흐름',
    needs: '앞선 이슈와 이어진 흐름(흐름 이름, 노드별 날짜·제목·매체 수·요약)',
    owners: ['backend', 'etl'],
  },
  'stock-issues': {
    title: '종목 이슈 흐름',
    needs: '종목이 나온 이슈를 이어 묶은 흐름(흐름 이름, 흐름 안 순서와 개수, 진행 여부)',
    owners: ['backend', 'kg-api'],
  },
  'linked-companies': {
    title: '이어진 기업',
    needs: '이슈 관계 그래프 미리보기, 최신 이슈 카드의 이어진 기업 수 정의, 관계 이름·경로의 회원 전용 서버 차단(AI 서버 응답이 공개)',
    owners: ['kg-api', 'backend'],
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
