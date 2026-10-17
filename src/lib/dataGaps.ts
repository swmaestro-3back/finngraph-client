type GapOwner = 'backend' | 'kg-api' | 'etl' | 'data'

interface GapInfo {
  title: string
  needs: string
  owners: readonly GapOwner[]
}

export const GAPS = {
  'financials-quarter': {
    title: '추가 재무 지표',
    needs: '유동비율(유동자산·유동부채)',
    owners: ['etl', 'backend'],
  },
  'stock-keystats-compare': {
    title: '핵심 지표 비교',
    needs: 'PER·PBR·ROE·배당수익률의 비교 테마 중앙값과 비교 테마 정보',
    owners: ['backend'],
  },
  issues: {
    title: '이슈 해설',
    needs: '관계 근거 문장이 없는 종목의 뉴스 속 역할, 근거 시트의 관계 문장',
    owners: ['backend', 'etl'],
  },
  'issue-timeline': {
    title: '이슈 흐름',
    needs: '이어진 흐름의 짧은 흐름 이름(첫 이슈 제목과 다른 이름)',
    owners: ['backend', 'etl'],
  },
  'linked-companies': {
    title: '이어진 기업',
    needs: '최신 이슈 카드의 이어진 기업 수 정의, 관계 이름·경로의 회원 전용 서버 차단(AI 서버 응답이 공개)',
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
  logos: {
    title: '종목 로고',
    needs: '종목 로고 이미지와 원천·라이선스',
    owners: ['data'],
  },
} as const satisfies Record<string, GapInfo>

export type GapId = keyof typeof GAPS

export const GAP_IDS = Object.keys(GAPS) as GapId[]
