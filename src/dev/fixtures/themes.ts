import type { IssueOf, ThemeIssueRef } from '@/lib/fg/themes'

const ISSUES: readonly ThemeIssueRef[] = [
  { id: 101, title: '전력망 투자 확대, 변압기·전선 주문 증가', mediaCount: 15 },
  { id: 102, title: '데이터센터 전력 수요 급증, 변압기 수출 늘어', mediaCount: 12 },
  { id: 103, title: '반도체 장비 수출 규제, 국내 소재 공급망 재편', mediaCount: 23 },
  { id: 104, title: '미국 금리 인하 기대에 반도체주 강세', mediaCount: 14 },
  { id: 105, title: '임상 3상 결과 발표 연기, 바이오 투자심리 위축', mediaCount: 7 },
]

export const themeIssueFixture: IssueOf = (theme) =>
  theme.id % 3 === 0 ? null : ISSUES[theme.id % ISSUES.length]
