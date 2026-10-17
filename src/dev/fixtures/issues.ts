import { linkedCompaniesFixture, stockIssueFlowsFixture } from '@/dev/fixtures/stockDetail'
import {
  buildIssueBook,
  type IssueArticleItem,
  type IssueBook,
  type IssueDaySeed,
  type IssueExtra,
  type IssueLink,
  type IssueRecord,
  type IssueSeed,
  type IssueStep,
} from '@/lib/fg/issueRecords'
import { shortDate } from '@/lib/fg/stockIssues'
import type { LinkedCompany } from '@/lib/fg/stockLinks'
import { josa } from '@/lib/josa'

type StepRow = readonly [string, string]
type StockRow = readonly [string, number]

function issue(
  id: string,
  title: string,
  media: number,
  articles: number,
  minutesAgo: number,
  theme: string,
  steps: readonly StepRow[],
  summary: string,
  stocks: readonly StockRow[],
  inferred: number,
): IssueSeed {
  return {
    id,
    title,
    media,
    articles,
    minutesAgo,
    theme,
    steps: steps.map(([date, stepTitle]): IssueStep => ({ date, title: stepTitle })),
    summary,
    stocks: stocks.map(([name, change]) => ({ name, ticker: null, change })),
    inferred,
  }
}

const EXPORT_STEPS: readonly StepRow[] = [
  ['09.12', '장비 수출 규제 검토 보도'],
  ['09.24', '반도체 업계 대응 회의'],
  ['10.01', '수출 규제 시행 일정 공개'],
]
const FX_STEPS: readonly StepRow[] = [
  ['09.04', '환율 1,400원 돌파'],
  ['09.17', '외환 당국 구두 개입'],
  ['09.25', '환율 1,390원대로 내려와'],
  ['10.01', '원·달러 환율 1,390원대 마감'],
]
const SHIP_STEPS: readonly StepRow[] = [
  ['08.28', '조선 3사 상반기 수주 실적'],
  ['09.05', 'LNG 운반선 발주 재개'],
  ['09.22', 'LNG 프로젝트 2차 발주'],
  ['10.01', '한결조선, LNG 운반선 2척 수주'],
]

export const issueDaysFixture: { snapshot: string; days: readonly IssueDaySeed[] } = {
  snapshot: '15:30',
  days: [
    {
      date: '2026-10-02',
      issues: [
        issue('export', '반도체 장비 수출 규제, 국내 소재 공급망 재편', 23, 31, 12, '반도체', EXPORT_STEPS,
          '규제 대상 장비를 쓰는 생산라인이 국내 소재 조달을 늘릴 가능성이 거론돼요. 주요 고객사의 증설 일정도 함께 바뀌고 있어요.',
          [['한빛반도체', 1.68], ['솔빛장비', 3.21], ['다온전자', 1.05], ['아라테크', -0.42], ['하늬테크', 0.76], ['윤슬반도체', -1.14]], 9),
        issue('fx', '원·달러 환율 1,380원대로 하락, 외국인 순매수 이어져', 18, 26, 33, '시장 전체', FX_STEPS,
          '원·달러 환율이 1,380원대로 내려왔어요. 외국인은 코스피에서 사흘째 산 금액이 더 많아요.', [], 0),
        issue('sep', '대성화학, 2차전지 분리막 1,240억 원 규모 공급 계약', 9, 11, 41, '2차전지', [['09.30', '해외 셀 업체와 공급 협상 보도']],
          '계약 상대는 해외 셀 제조사이고 기간은 3년이에요. 최근 연매출의 약 18% 규모예요.', [['대성화학', -0.82]], 2),
        issue('grid', '전력망 투자 확대, 변압기·전선 주문 증가', 15, 19, 58, '전력 인프라', [['09.20', '하반기 전력 수요 전망 상향'], ['09.27', '송전망 증설 예산 확대 발표']],
          '송전망 증설 예산이 늘면서 변압기와 초고압 전선 발주가 앞당겨지고 있어요. 일부 업체는 내년 생산 물량까지 계약을 마쳤어요.',
          [['동해전선', 4.12], ['대한변압기', 2.88]], 2),
        issue('rate', '미국 금리 인하 기대에 반도체주 강세', 14, 17, 95, '반도체', [['09.18', '미국 금리 동결, 연내 인하 시사']],
          '미국 기준금리 인하 기대가 커졌다는 분석이 나왔어요. 같은 날 반도체 종목이 대부분 올랐어요.',
          [['한빛반도체', 1.68], ['다온전자', 1.05], ['가람전자', 0.39]], 3),
        issue('ship', '조선사 하반기 수주 목표 상향, 기자재 협력사 일감 늘 듯', 11, 13, 128, '조선', SHIP_STEPS,
          'LNG 운반선 발주가 이어지면서 조선사들이 하반기 수주 목표를 올렸어요. 엔진·배관 협력사의 일감도 늘 것으로 보여요.',
          [['한결조선', 2.43], ['해성엔진', 1.85]], 4),
        issue('dc', '데이터센터 전력 수요 급증, 변압기 수출 늘어', 12, 14, 176, '전력 인프라', [['10.01', '데이터센터 전력 수요 급증 전망']],
          '데이터센터 전력 수요가 빠르게 늘어난다는 전망 속에 변압기 수출 계약이 이어지고 있어요.', [['대한변압기', 2.88], ['동해전선', 4.12]], 3),
        issue('module', '가람전자, 차세대 메모리 모듈 양산 시작', 5, 6, 214, '반도체', [],
          '서버용 고용량 메모리 모듈을 이달부터 양산한다고 밝혔어요. 주요 고객사 인증은 지난달 마쳤어요.', [['가람전자', 0.39]], 0),
        issue('wind', '해상풍력 2차 입찰 결과 발표, 해저 케이블 발주 기대', 8, 9, 236, '에너지', [],
          '해상풍력 2차 입찰에서 4개 단지가 선정됐어요. 해저 케이블과 하부 구조물 발주가 뒤따를 수 있다는 분석이 나왔어요.',
          [['동해전선', 4.12], ['동방밸브', 0.85]], 1),
        issue('bio', '임상 3상 결과 발표 연기, 바이오 투자심리 위축', 7, 8, 251, '바이오', [['07.15', '3상 첫 환자 투약'], ['09.01', '3상 환자 모집 완료']],
          '온누리바이오가 3상 결과 발표를 내년 1분기로 미뤘어요. 같은 날 바이오 종목 대부분이 내렸어요.',
          [['온누리바이오', -6.21], ['새한바이오', -2.06]], 1),
        issue('ess', 'ESS 수요 확대 전망, 에너지 저장 장치 발주 늘어', 6, 7, 302, '에너지', [],
          '전력망 안정화용 ESS(에너지 저장 장치) 발주가 늘 것이라는 전망이 나왔어요.', [['새벽에너지', 3.02], ['한울소재', 1.07]], 2),
        issue('disp', '디스플레이 구동칩 재고 조정 마무리 국면', 4, 5, 366, '디스플레이', [['09.10', '구동칩 재고 증가 우려']],
          '구동칩 재고가 줄어 연말 주문이 다시 늘 수 있다는 분석이 나왔어요.', [['보람디스플레이', -1.38]], 1),
      ],
    },
    {
      date: '2026-10-01',
      issues: [
        issue('export3', '수출 규제 시행 일정 공개', 17, 22, 18, '반도체', EXPORT_STEPS.slice(0, 2),
          '해외 정부가 반도체 장비 수출 규제를 11월 1일부터 시행한다고 발표했어요.', [['한빛반도체', 3.39], ['다온전자', 2.1], ['아라테크', 0.85]], 7),
        issue('fx4', '원·달러 환율 1,390원대 마감', 14, 18, 40, '시장 전체', FX_STEPS.slice(0, 3),
          '원·달러 환율이 1,390원대에서 거래를 마쳤어요. 사흘째 하락이에요.', [], 0),
        issue('dc1', '데이터센터 전력 수요 급증 전망', 12, 15, 95, '전력 인프라', [],
          '국내 데이터센터 전력 수요가 5년 안에 두 배로 늘어난다는 전망이 나왔어요.', [['대한변압기', 1.92], ['동해전선', 2.3]], 2),
        issue('ship5', '한결조선, LNG 운반선 2척 수주', 9, 11, 150, '조선', SHIP_STEPS.slice(0, 3),
          '한결조선이 LNG 운반선 2척을 6,820억 원에 수주했어요.', [['한결조선', 1.1]], 3),
        issue('garam', '가람전자, 1조 8,400억 원 규모 메모리 공급 계약', 8, 9, 210, '반도체', [],
          '가람전자가 한빛반도체에서 메모리를 사 오는 1조 8,400억 원 규모 계약을 맺었어요.', [['가람전자', 1.2], ['한빛반도체', 3.39]], 1),
        issue('chem', '화학 원료 가격 하락, 업계 원가 부담 덜어', 5, 6, 300, '화학', [],
          '주요 화학 원료 가격이 석 달째 내려 원가 부담이 줄 것이라는 분석이 나왔어요.', [['늘봄화학', 0.4]], 0),
      ],
    },
    {
      date: '2026-09-30',
      issues: [
        issue('dram', '4분기 D램 계약가 인상 협상 시작', 15, 19, 30, '반도체',
          [['07.02', '메모리 고정거래가격 석 달 만에 반등'], ['07.29', '메모리 고정거래가격 2개월 연속 상승'], ['08.31', 'D램 고정거래가격 3개월째 올라']],
          '메모리 회사들이 4분기 D램 공급 가격을 올리는 협상을 시작했다고 보도됐어요.', [['한빛반도체', -4.36], ['다온전자', -2.1]], 4),
        issue('fx3', '환율 1,390원대로 내려와', 11, 13, 120, '시장 전체', FX_STEPS.slice(0, 2),
          '원·달러 환율이 1,390원대로 내려왔어요.', [], 0),
        issue('cell', '해외 셀 업체와 분리막 공급 협상 보도', 4, 4, 200, '2차전지', [],
          '대성화학이 해외 셀 제조사와 분리막 공급을 협상하고 있다는 보도가 나왔어요.', [['대성화학', 1.2]], 0),
        issue('engine', '선박 엔진 수출 증가, 기자재 업계 수주 늘어', 6, 7, 260, '조선', [],
          '선박 엔진 수출이 석 달 연속 늘었다는 집계가 나왔어요.', [['해성엔진', 0.9]], 1),
      ],
    },
  ],
}

function past(date: string, id: string, title: string, media: number, articles: number, theme: string, summary: string, stocks: readonly StockRow[]): IssueDaySeed {
  return { date, issues: [issue(id, title, media, articles, 90, theme, [], summary, stocks, 0)] }
}

const ARCHIVE: readonly IssueDaySeed[] = [
  past('2026-09-27', 'grid2', '송전망 증설 예산 확대 발표', 12, 14, '전력 인프라', '정부가 내년 송전망 증설 예산을 늘리겠다고 발표했어요.', [['동해전선', 3.2], ['대한변압기', 2.4]]),
  past('2026-09-24', 'export2', '반도체 업계 대응 회의', 12, 15, '반도체', '주요 반도체 회사들이 모여 장비 수급 대책과 국산 소재 활용 방안을 논의했어요.', [['한빛반도체', 0.8], ['다온전자', 0.52], ['솔빛장비', 1.94]]),
  past('2026-09-22', 'ship3', 'LNG 프로젝트 2차 발주', 8, 10, '조선', '대형 LNG 프로젝트의 2차 운반선 발주가 나왔어요.', [['한결조선', 2.1]]),
  past('2026-09-20', 'grid1', '하반기 전력 수요 전망 상향', 9, 11, '전력 인프라', '하반기 전력 수요 전망이 올라갔어요. 여름철 최대 전력 기록도 새로 썼어요.', [['대한변압기', 1.3]]),
  past('2026-09-18', 'rate1', '미국 금리 동결, 연내 인하 시사', 13, 16, '시장 전체', '미국 중앙은행이 기준금리를 묶어 두면서 연내 인하 가능성을 내비쳤어요.', []),
  past('2026-09-17', 'fx2', '외환 당국 구두 개입', 10, 12, '시장 전체', '외환 당국이 환율이 너무 빠르게 오른다며 시장 안정 조치를 할 수 있다고 밝혔어요.', []),
  past('2026-09-12', 'export1', '장비 수출 규제 검토 보도', 8, 9, '반도체', '해외 정부가 반도체 장비 수출 규제를 검토한다는 보도가 처음 나왔어요.', [['한빛반도체', -1.21], ['솔빛장비', -2.43]]),
  past('2026-09-10', 'disp1', '구동칩 재고 증가 우려', 3, 4, '디스플레이', '디스플레이 구동칩 재고가 쌓이고 있다는 분석이 나왔어요.', [['보람디스플레이', -2.2]]),
  past('2026-09-05', 'ship2', 'LNG 운반선 발주 재개', 7, 8, '조선', '해외 선사들이 미뤘던 LNG 운반선 발주를 다시 시작했어요.', [['한결조선', 1.4], ['해성엔진', 0.9]]),
  past('2026-09-04', 'fx1', '환율 1,400원 돌파', 9, 11, '시장 전체', '원·달러 환율이 1,400원을 넘어섰어요. 다섯 달 만이에요.', []),
  past('2026-09-01', 'bio2', '3상 환자 모집 완료', 5, 6, '바이오', '온누리바이오가 임상 3상 환자 모집을 마쳤어요.', [['온누리바이오', 4.1]]),
  past('2026-08-31', 'dram3', 'D램 고정거래가격 3개월째 올라', 12, 14, '반도체', 'D램 고정거래가격이 석 달째 올랐어요. 서버용 수요가 늘었다는 분석이 함께 나왔어요.', [['한빛반도체', 1.12], ['다온전자', 0.64]]),
  past('2026-08-28', 'ship1', '조선 3사 상반기 수주 실적', 6, 7, '조선', '조선 3사의 상반기 수주가 1년 전보다 늘었다는 집계가 나왔어요.', [['한결조선', 0.6]]),
  past('2026-07-29', 'dram2', '메모리 고정거래가격 2개월 연속 상승', 14, 18, '반도체', 'D램 고정거래가격이 두 달 연속 올랐다는 조사 결과가 나왔어요.', [['한빛반도체', 2.05], ['다온전자', 1.4], ['윤슬반도체', 0.92]]),
  past('2026-07-15', 'bio1', '3상 첫 환자 투약', 4, 5, '바이오', '온누리바이오가 임상 3상의 첫 환자에게 약을 투여했어요.', [['온누리바이오', 2.8]]),
  past('2026-07-02', 'dram1', '메모리 고정거래가격 석 달 만에 반등', 10, 13, '반도체', 'D램 고정거래가격(기업끼리 대량으로 거래하는 가격)이 석 달 만에 올랐어요.', [['한빛반도체', 1.36], ['다온전자', 0.88]]),
]

const POINT_LABELS = ['무엇이 바뀌나요', '누가 직접 영향받나요', '어디로 이어지나요'] as const

function points(texts: readonly [string, string, string]) {
  return texts.map((text, i) => ({ label: POINT_LABELS[i], text }))
}

const EXTRAS: Readonly<Record<string, IssueExtra>> = {
  export: {
    shortTitle: '국내 소재 공급망 재편',
    flowTitle: '반도체 장비 수출 규제',
    detail:
      '반도체 장비의 해외 반출을 막는 수출 규제가 11월 1일부터 시행돼요. 규제 대상 장비를 쓰는 한빛반도체 등은 해외 소재 대신 국산 소재 조달을 늘리겠다고 밝혔어요. 소재·부품 협력사의 납품이 늘 수 있다는 전망이 함께 나와요.',
    points: points([
      '규제 대상 장비의 해외 반출이 11월 1일부터 막혀요.',
      '한빛반도체·다온전자처럼 규제 대상 장비를 쓰는 생산라인을 가진 회사예요.',
      '국산 소재·부품을 공급하는 협력사로 주문이 옮겨 갈 수 있어요.',
    ]),
  },
  fx: {
    flowTitle: '원·달러 환율 하락',
    detail:
      '원·달러 환율이 한 달 만에 1,380원대로 내려왔어요. 외국인은 코스피에서 사흘째 판 금액보다 산 금액이 많아요. 수출 기업의 원화 환산 이익이 줄 수 있다는 분석도 함께 나와요.',
    points: points([
      '원·달러 환율이 1,380원대까지 내려왔어요.',
      '해외 매출 비중이 큰 수출 기업과 외화 빚이 많은 기업이에요.',
      '외국인 매수가 이어지면 시장 전체 수급에 힘이 될 수 있어요.',
    ]),
  },
  grid: {
    flowTitle: '전력망 투자 확대',
    detail:
      '송전망 증설 예산이 늘면서 변압기와 초고압 전선 발주가 앞당겨지고 있어요. 동해전선·대한변압기 등은 내년 생산 물량까지 계약을 마쳤다고 밝혔어요. 설비를 늘리는 업체의 부품 협력사 주문도 늘 수 있다는 전망이 나와요.',
    points: points([
      '송전망 증설 예산이 늘어 변압기·전선 발주가 앞당겨져요.',
      '동해전선·대한변압기처럼 변압기와 초고압 전선을 만드는 회사예요.',
      '설비를 늘리는 업체의 소재·부품 협력사로 주문이 이어질 수 있어요.',
    ]),
  },
  ship: { flowTitle: '조선 수주 확대' },
  rate: { flowTitle: '미국 금리 인하 기대' },
  bio: { flowTitle: '임상 3상 일정' },
  disp: { flowTitle: '디스플레이 구동칩 재고' },
  dram: { flowTitle: '메모리 가격 반등' },
  dc: { flowTitle: '데이터센터 전력 수요' },
  sep: { flowTitle: '분리막 공급 계약' },
  module: { flowTitle: '메모리 모듈 양산' },
  wind: { flowTitle: '해상풍력 입찰' },
  ess: { flowTitle: 'ESS 수요 확대' },
  garam: { flowTitle: '메모리 공급 계약' },
  chem: { flowTitle: '화학 원료 가격 하락' },
  engine: { flowTitle: '선박 엔진 수출' },
}

const ARTICLE = 'https://news.test/finngraph-mock'

const SEJIN: LinkedCompany = {
  id: 'sejin',
  code: null,
  name: '세진정밀',
  market: 'KOSDAQ',
  price: 11420,
  change: 2.15,
  gapFromHigh: -24.9,
  position: 0.289,
  type: 'supply',
  relation: '솔빛장비의 부품 공급사',
  tag: '정밀 부품 공급',
  title: '세진정밀은 솔빛장비의 부품 공급사예요',
  hops: [{ edge: 'supply', node: '세진정밀' }],
  strength: 2,
  confirmed: false,
  evidence: [
    { kind: 'news', quote: '세진정밀은 솔빛장비가 만드는 식각 장비에 들어가는 정밀 부품을 납품한다.', source: '예시일보', date: '09.24', url: ARTICLE },
    { kind: 'news', quote: '장비 수출 규제로 국산 부품 수요가 늘 수 있다는 업계 관측이 나온다.', source: '예시경제', date: '10.02', url: ARTICLE },
  ],
}

const EXPORT_ORDER = ['nuri', 'sejin', 'garam', 'ieum', 'neulbom', 'dasol', 'ongyeol', 'boram', 'saegyeol']

function exportLinks(): IssueLink[] {
  const hanbit = linkedCompaniesFixture('한빛반도체')
  return EXPORT_ORDER.flatMap((id): IssueLink[] => {
    if (id === 'sejin') return [{ from: '솔빛장비', company: SEJIN }]
    const company = hanbit.find((c) => c.id === id)
    return company ? [{ from: '한빛반도체', company }] : []
  })
}

function linksOf(seed: IssueSeed): IssueLink[] {
  if (seed.id === 'export') return exportLinks()
  const source = seed.stocks[0]
  if (!source || seed.inferred === 0) return []
  return linkedCompaniesFixture(source.name)
    .filter((company) => company.hops.length === 1)
    .slice(0, seed.inferred)
    .map((company) => ({ from: source.name, company }))
}

const STOCK_PAGE_SUBJECT = '한빛반도체'
const LINKED_FLOWS = new Set(['export', 'memory'])
const SUBJECT_CHANGES = [1.24, -0.86, 2.31, 0.42, -1.57] as const
const WITH_CHANGES = [0.65, -0.38, 1.12] as const

const STOCK_FLOWS = stockIssueFlowsFixture.flows.filter((flow) => !LINKED_FLOWS.has(flow.id))

const STOCK_FLOW_DAYS: readonly IssueDaySeed[] = STOCK_FLOWS.flatMap((flow, f) =>
  flow.issues.map((item, k): IssueDaySeed => ({
    date: item.date,
    issues: [
      issue(
        `${flow.id}-${k}`,
        item.title,
        item.media,
        item.articles,
        90,
        '반도체',
        flow.issues.slice(0, k).map((prev): StepRow => [shortDate(prev.date), prev.title]),
        item.summary,
        [
          [STOCK_PAGE_SUBJECT, SUBJECT_CHANGES[(f + k) % SUBJECT_CHANGES.length]],
          ...(item.with ?? []).map((name, i): StockRow => [name, WITH_CHANGES[(f + i) % WITH_CHANGES.length]]),
        ],
        0,
      ),
    ],
  })),
)

const STOCK_FLOW_EXTRAS: Readonly<Record<string, IssueExtra>> = Object.fromEntries(
  STOCK_FLOWS.flatMap((flow) => flow.issues.map((_, k) => [`${flow.id}-${k}`, { flowTitle: flow.title }])),
)

const PRESS = [
  '예시경제', '예시비즈', '예시방송', '예시온라인', '예시타임스', '예시테크', '예시프레스', '예시IT뉴스',
  '예시머니', '예시파이낸스', '예시일보', '예시데일리', '예시라디오', '예시통신', '예시투데이', '예시증권신문',
  '예시와이어', '예시헤럴드', '예시인베스트', '예시마켓', '예시산업신문', '예시미디어', '예시주간',
] as const

type ArticleRow = readonly [string, string, string]

const EXPORT_ARTICLES: readonly ArticleRow[] = [
  ['15:30', '예시경제', '반도체 장비 수출 규제 11월 시행…국내 생산라인 대응 분주'],
  ['15:12', '예시비즈', '한빛반도체, 국산 소재 조달 비중 확대 검토'],
  ['14:59', '예시방송', '수출 규제 앞두고 소재·부품 공급망 재편 속도'],
  ['14:45', '예시온라인', '"국산 감광액 써 보자"…반도체 업계 공급처 다변화'],
  ['14:32', '예시타임스', '장비 수출 규제 발표에 반도체 소재주 강세'],
  ['14:14', '예시테크', '솔빛장비, 규제 대상과 비슷한 장비 국산화 주목'],
  ['14:00', '예시프레스', '다온전자도 국산 소재 시험 확대'],
  ['13:47', '예시IT뉴스', '정부 "소재·부품 국산화 지원 확대 검토"'],
  ['13:33', '예시머니', '반도체 공급망 재편, 중소 소재사에 기회 될까'],
  ['13:16', '예시파이낸스', '규제 대상 장비 쓰는 라인 어디까지…업계 점검'],
  ['13:02', '예시일보', '해외 장비 유지보수 업체 "11월 이후 일정 불투명"'],
  ['12:48', '예시데일리', '감광액·세정액 국산화율 아직 30%대'],
  ['12:35', '예시라디오', '[분석] 수출 규제가 메모리 생산에 미칠 영향'],
  ['12:17', '예시통신', '아라테크, 해외 장비 유지보수 매출 비중 커 우려'],
  ['12:04', '예시투데이', '반도체 장비 규제, 국내 협력사 납품 늘어날까'],
  ['11:50', '예시증권신문', '업계 "대체 장비 검증에 6개월 이상 걸려"'],
  ['11:36', '예시와이어', '반도체 장비 수출 규제 11월 시행…국내 생산라인 대응 분주'],
  ['11:19', '예시헤럴드', '한빛반도체, 국산 소재 조달 비중 확대 검토'],
  ['11:05', '예시인베스트', '수출 규제 앞두고 소재·부품 공급망 재편 속도'],
  ['10:52', '예시마켓', '"국산 감광액 써 보자"…반도체 업계 공급처 다변화'],
  ['10:38', '예시산업신문', '장비 수출 규제 발표에 반도체 소재주 강세'],
  ['10:20', '예시미디어', '솔빛장비, 규제 대상과 비슷한 장비 국산화 주목'],
  ['10:07', '예시주간', '다온전자도 국산 소재 시험 확대'],
  ['09:53', '예시IT뉴스', '정부 "소재·부품 국산화 지원 확대 검토"'],
  ['09:40', '예시데일리', '반도체 공급망 재편, 중소 소재사에 기회 될까'],
  ['09:22', '예시증권신문', '규제 대상 장비 쓰는 라인 어디까지…업계 점검'],
  ['09:08', '예시마켓', '해외 장비 유지보수 업체 "11월 이후 일정 불투명"'],
  ['08:55', '예시경제', '감광액·세정액 국산화율 아직 30%대'],
  ['08:41', '예시타임스', '[분석] 수출 규제가 메모리 생산에 미칠 영향'],
  ['08:24', '예시IT뉴스', '아라테크, 해외 장비 유지보수 매출 비중 커 우려'],
  ['08:12', '예시데일리', '반도체 장비 규제, 국내 협력사 납품 늘어날까'],
]

type Base = Omit<IssueRecord, 'articleList'>

const TITLES: readonly ((r: Base) => string)[] = [
  (r) => r.title,
  (r) => `${r.shortTitle}…업계 반응은`,
  (r) => `[분석] ${r.flowTitle}, 무엇이 달라지나`,
  (r) => `${r.flowTitle}, 시장은 어떻게 봤나`,
  (r) => `${r.flowTitle} 관련 종목 움직임 정리`,
]

const FIRST_REPORT = '08:12'

function minutesOf(clock: string): number {
  const [h, m] = clock.split(':').map(Number)
  return h * 60 + m
}

function clock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function mockArticle(record: Base, k: number, [time, press, title]: ArticleRow): IssueArticleItem {
  return {
    id: `${record.id}-a${k}`,
    title,
    url: ARTICLE,
    press,
    pressKey: press,
    day: record.date,
    time,
    summary: null,
    analyzed: false,
  }
}

function articlesOf(record: Base): IssueArticleItem[] {
  if (record.id === 'export') return EXPORT_ARTICLES.map((row, k) => mockArticle(record, k, row))
  const n = record.articles
  const end = minutesOf(record.updated)
  const start = Math.min(minutesOf(FIRST_REPORT), end)
  return Array.from({ length: n }, (_, k) => {
    const at = n === 1 ? end : end - Math.round(((end - start) * k) / (n - 1))
    const press = PRESS[k < record.media ? k : (k - record.media) % record.media]
    return mockArticle(record, k, [clock(at), press, TITLES[k % TITLES.length](record)])
  })
}

interface Quote {
  market: 'KOSPI' | 'KOSDAQ'
  price: number
  gapFromHigh: number
  position: number
}

const QUOTES: Readonly<Record<string, Quote>> = {
  한빛반도체: { market: 'KOSPI', price: 72400, gapFromHigh: -3.3, position: 0.932 },
  솔빛장비: { market: 'KOSDAQ', price: 23900, gapFromHigh: -5.8, position: 0.9 },
  다온전자: { market: 'KOSPI', price: 54700, gapFromHigh: -11.6, position: 0.62 },
  아라테크: { market: 'KOSDAQ', price: 12350, gapFromHigh: -22.0, position: 0.35 },
  하늬테크: { market: 'KOSDAQ', price: 7980, gapFromHigh: -17.3, position: 0.44 },
  윤슬반도체: { market: 'KOSDAQ', price: 15600, gapFromHigh: -26.5, position: 0.21 },
  가람전자: { market: 'KOSPI', price: 128500, gapFromHigh: -8.9, position: 0.704 },
  늘봄화학: { market: 'KOSDAQ', price: 15240, gapFromHigh: -19.4, position: 0.41 },
  보람디스플레이: { market: 'KOSPI', price: 6450, gapFromHigh: -31.2, position: 0.17 },
  다솔머티리얼: { market: 'KOSDAQ', price: 8830, gapFromHigh: -2.4, position: 0.96 },
}

function seedOf(name: string): number {
  let hash = 7
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 100003
  return hash
}

function quoteOf(name: string): Quote {
  const known = QUOTES[name]
  if (known) return known
  const h = seedOf(name)
  const gap = -((h % 280) / 10 + 1)
  return {
    market: h % 2 === 0 ? 'KOSPI' : 'KOSDAQ',
    price: 3000 + (h % 120) * 850,
    gapFromHigh: Math.round(gap * 10) / 10,
    position: Math.round((1 + gap / 32) * 1000) / 1000,
  }
}

const EXPORT_ROLES: Readonly<Record<string, string>> = {
  한빛반도체: '규제 대상 장비를 쓰는 생산라인을 가진 회사로, 국산 소재 조달을 늘린다는 계획이 보도됐어요.',
  솔빛장비: '규제 대상과 비슷한 장비를 국산으로 만드는 회사로 거론됐어요.',
  다온전자: '한빛반도체와 같은 규제 대상 장비를 쓰는 라인을 운영해요.',
  아라테크: '해외 장비 유지보수 매출 비중이 높아 규제 영향이 거론됐어요.',
  하늬테크: '장비 부품을 수입에 많이 기대는 회사로 언급됐어요.',
  윤슬반도체: '국산 장비 도입을 검토한다고 보도됐어요.',
}
const EXPORT_MENTIONS = [18, 9, 6, 5, 3, 2] as const

function roleOf(record: IssueRecord, name: string): string {
  if (record.id === 'export' && EXPORT_ROLES[name]) return EXPORT_ROLES[name]
  const subject = `${name}${josa(name, '은/는')}`
  return `${subject} 이 이슈 기사에서 ${record.theme} 관련 종목으로 거론됐어요.`
}

function mentionsOf(record: IssueRecord, index: number): number {
  if (record.id === 'export') return EXPORT_MENTIONS[index] ?? 1
  return Math.min(record.articles, Math.max(1, Math.round((record.articles * 0.6) / (index + 1))))
}

function mentionIdsOf(list: readonly IssueArticleItem[], name: string, count: number, index: number): string[] {
  const n = list.length
  const start = (index * 5) % n
  const rotated = Array.from({ length: n }, (_, k) => list[(start + k) % n])
  const ordered = [...rotated.filter((a) => a.title.includes(name)), ...rotated.filter((a) => !a.title.includes(name))]
  const picked = new Set(ordered.slice(0, count).map((a) => a.id))
  return list.filter((a) => picked.has(a.id)).map((a) => a.id)
}

function withStockDetail(record: IssueRecord): IssueRecord {
  return {
    ...record,
    stocks: record.stocks.map((stock, index) => {
      const mentions = mentionsOf(record, index)
      return {
        ...stock,
        ...quoteOf(stock.name),
        role: roleOf(record, stock.name),
        mentions,
        mentionIds: mentionIdsOf(record.articleList, stock.name, mentions, index),
      }
    }),
  }
}

const builtBook = buildIssueBook({
  snapshot: issueDaysFixture.snapshot,
  days: issueDaysFixture.days,
  archive: [...ARCHIVE, ...STOCK_FLOW_DAYS],
  extras: { ...EXTRAS, ...STOCK_FLOW_EXTRAS },
  links: linksOf,
  articles: articlesOf,
  titleAliases: { '해외 셀 업체와 공급 협상 보도': 'cell' },
  aliases: {
    '101': 'grid',
    '102': 'dc',
    '103': 'export',
    '104': 'rate',
    '105': 'bio',
    'export-0': 'export1',
    'export-1': 'export2',
    'export-2': 'export3',
    'export-3': 'export',
    'memory-0': 'dram1',
    'memory-1': 'dram2',
    'memory-2': 'dram3',
    'memory-3': 'dram',
  },
})

export const issueBookFixture: IssueBook = { ...builtBook, records: builtBook.records.map(withStockDetail) }
