import type { HubFixture, HubFlow, HubIssueNode } from '@/lib/fg/hub'

const MOCK_DAY = '2026-10-02'

interface Story {
  past: readonly HubIssueNode[]
  flow: HubFlow
  inferred: number
}

function node(id: string, day: string, title: string, media: number): HubIssueNode {
  return { id, title, summary: null, day, media }
}

const EXPORT: Story = {
  past: [
    node('export3', '2026-10-01', '수출 규제 시행 일정 공개', 17),
    node('export2', '2026-09-24', '반도체 업계 대응 회의', 12),
    node('export1', '2026-09-12', '장비 수출 규제 검토 보도', 8),
  ],
  flow: { count: 4, since: '2026-09-12' },
  inferred: 9,
}

const GRID: Story = {
  past: [
    node('grid2', '2026-09-27', '송전망 증설 예산 확대 발표', 21),
    node('grid1', '2026-09-20', '하반기 전력 수요 전망 상향', 9),
  ],
  flow: { count: 3, since: '2026-09-20' },
  inferred: 2,
}

const SHIP: Story = {
  past: [
    node('ship3', '2026-09-25', 'LNG선 발주 재개 소식', 14),
    node('ship2', '2026-09-10', '중동 LNG 프로젝트 2차 발주', 9),
    node('ship1', '2026-08-28', '조선 3사 상반기 수주 실적', 6),
  ],
  flow: { count: 6, since: '2026-08-28' },
  inferred: 2,
}

const SEP: Story = {
  past: [node('cell', '2026-09-30', '해외 셀 업체와 공급 협상 보도', 4)],
  flow: { count: 2, since: '2026-09-30' },
  inferred: 1,
}

const BIO: Story = {
  past: [
    node('bio2', '2026-08-20', '3상 환자 모집 완료', 5),
    node('bio1', '2026-07-15', '3상 첫 환자 투약', 4),
  ],
  flow: { count: 3, since: '2026-07-15' },
  inferred: 1,
}

const ESS: Story = {
  past: [],
  flow: { count: 1, since: MOCK_DAY },
  inferred: 0,
}

const ISSUE_ORDER: readonly Story[] = [EXPORT, GRID, SHIP, SEP, BIO]
const STOCK_ORDER: readonly Story[] = [BIO, GRID, ESS, SHIP, EXPORT]

function seed(text: string): number {
  let hash = 7
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 100003
  return hash
}

function stockStory(ticker: string): Story {
  return STOCK_ORDER[seed(ticker) % STOCK_ORDER.length]
}

export const hubFixture: HubFixture = {
  stockFlow: (ticker) => stockStory(ticker).flow,
  issueExtra: (index) => {
    const story = ISSUE_ORDER[index % ISSUE_ORDER.length]
    return { flow: story.flow, past: [...story.past], inferred: story.inferred }
  },
}
