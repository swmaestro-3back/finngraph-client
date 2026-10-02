import { describe, expect, it } from 'vitest'
import type {
  ActionStepRes,
  CalendarEventKind,
  CalendarEventRes,
  CorporateActionRes,
  DividendReactionRes,
  IpoRes,
  StockCalendarRes,
} from '@/lib/apiTypes'
import { emptyFinancials } from '@/lib/annualPeriod'
import { formatChange, formatPercent, formatWon } from '@/lib/format'
import {
  BASIS_LABELS,
  CALENDAR_MAX_RANGE_DAYS,
  EX_PRICE_BASIS_LABELS,
  FAMILY_LABELS,
  IPO_STATUS_LABELS,
  KIND_DESCRIPTIONS,
  KIND_LABELS,
  KIND_SHORT_LABELS,
  STOCK_CALENDAR_WINDOW_DAYS,
  actionKey,
  agendaCountLabel,
  candleIndexOn,
  cellPreview,
  dDay,
  daysBetween,
  defaultSelection,
  eventDetails,
  exPriceMissing,
  findAction,
  findEvent,
  focusStep,
  formatAsOf,
  formatDateSpan,
  formatDayRange,
  formatDayTitle,
  formatFullDate,
  formatMonthParam,
  formatMonthTitle,
  formatRecoverySummary,
  formatSharesPerShare,
  gridRange,
  groupEventsByDate,
  groupIpos,
  ipoCountdown,
  isWeekend,
  keyboardTarget,
  kindFamily,
  kstToday,
  latestPayoutRatio,
  metricText,
  monthGrid,
  monthOf,
  parseDateParam,
  parseMonthParam,
  recoveryLabel,
  selectAction,
  shiftMonth,
  spanCountdown,
  stepState,
  stockCalendarWindow,
  summarizeRecovery,
  summaryFromAction,
  summaryFromRow,
  timelineItems,
  weekdayHolidays,
} from '@/lib/calendar'

const event = (overrides: Partial<CalendarEventRes>): CalendarEventRes => ({
  date: '2026-10-05',
  kind: 'DIV_EX',
  ticker: '000001',
  stockName: '가나',
  endDate: null,
  amount: null,
  ratio: null,
  label: null,
  agenda: [],
  agendaTruncated: false,
  estimated: false,
  favorite: false,
  ...overrides,
})

const ipo = (overrides: Partial<IpoRes>): IpoRes => ({
  ticker: '900001',
  name: '공모',
  status: 'UPCOMING',
  subscrStart: '2026-10-10',
  subscrEnd: '2026-10-11',
  offerPrice: null,
  leadManagers: null,
  payDate: null,
  refundDate: null,
  listingDate: null,
  ...overrides,
})

const SAMSUNG_CALENDAR: StockCalendarRes = {
  ticker: '005930',
  stockName: '삼성전자',
  market: 'KOSPI',
  price: 71200,
  change: 1.2345,
  priceDate: '2026-10-02',
  from: '2026-04-05',
  to: '2027-04-04',
  asOf: '2026-10-02T07:41:00+09:00',
  actions: [
    {
      family: 'DIV',
      label: '분기',
      basisDate: '2026-09-30',
      lastBuyDate: '2026-09-28',
      lastBuyEstimated: false,
      steps: [
        { kind: 'DIV_EX', date: '2026-09-29', endDate: null, estimated: false },
        { kind: 'DIV_RECORD', date: '2026-09-30', endDate: null, estimated: false },
        { kind: 'DIV_PAY', date: '2026-11-20', endDate: null, estimated: false },
      ],
      amount: 361,
      ratio: null,
      agenda: [],
      agendaTruncated: false,
      dividend: { dps: 361, dpsBasis: 'CURRENT', expectedYield: 0.507 },
      rights: null,
      bonus: null,
    },
    {
      family: 'AGM',
      label: '임시총회',
      basisDate: '2026-10-20',
      lastBuyDate: '2026-10-16',
      lastBuyEstimated: false,
      steps: [{ kind: 'AGM', date: '2026-11-09', endDate: null, estimated: false }],
      amount: null,
      ratio: null,
      agenda: [
        { text: '합병승인', tags: ['합병'] },
        { text: '사내이사 선임', tags: [] },
      ],
      agendaTruncated: false,
      dividend: null,
      rights: null,
      bonus: null,
    },
  ],
}

const RIGHTS_ACTION: CorporateActionRes = {
  family: 'RIGHTS',
  label: null,
  basisDate: '2026-08-05',
  lastBuyDate: '2026-08-03',
  lastBuyEstimated: false,
  steps: [
    { kind: 'RIGHTS_EX', date: '2026-08-04', endDate: null, estimated: false },
    { kind: 'RIGHTS_SUBSCRIBE', date: '2026-09-10', endDate: '2026-09-11', estimated: false },
    { kind: 'RIGHTS_LIST', date: '2026-10-02', endDate: null, estimated: false },
  ],
  amount: 20600,
  ratio: 21.58,
  agenda: [],
  agendaTruncated: false,
  dividend: null,
  rights: {
    dilution: 17.7496,
    issuePrice: 20600,
    priceVsIssue: 12.1359,
    exPrice: { theoretical: 24466, basis: 'PREVIOUS_CLOSE', actualOpen: 24350 },
  },
  bonus: null,
}

const BONUS_ACTION: CorporateActionRes = {
  family: 'BONUS',
  label: null,
  basisDate: '2026-11-10',
  lastBuyDate: '2026-11-06',
  lastBuyEstimated: false,
  steps: [
    { kind: 'BONUS_EX', date: '2026-11-09', endDate: null, estimated: false },
    { kind: 'BONUS_LIST', date: '2026-12-01', endDate: null, estimated: false },
  ],
  amount: null,
  ratio: 100,
  agenda: [],
  agendaTruncated: false,
  dividend: null,
  rights: null,
  bonus: {
    exPrice: { theoretical: 15400, basis: 'CURRENT_PRICE', actualOpen: null },
    returnAfter5: null,
    returnAfter20: null,
  },
}

const DIVIDEND_HISTORY: DividendReactionRes[] = [
  {
    recordDate: '2026-06-30',
    kind: '분기',
    dps: 361,
    exDate: '2026-06-29',
    prevClose: 70100,
    exOpen: 69800,
    theoreticalDrop: 0.515,
    openGap: -0.428,
    recoveryDays: 3,
    pending: false,
  },
]

const step = (kind: CalendarEventKind, date: string, overrides: Partial<ActionStepRes> = {}): ActionStepRes => ({
  kind,
  date,
  endDate: null,
  estimated: false,
  ...overrides,
})

const action = (overrides: Partial<CorporateActionRes>): CorporateActionRes => ({
  ...SAMSUNG_CALENDAR.actions[0],
  ...overrides,
})

const reaction = (overrides: Partial<DividendReactionRes>): DividendReactionRes => ({
  ...DIVIDEND_HISTORY[0],
  ...overrides,
})

describe('kstToday — 사용자 시간대와 무관한 KST 날짜', () => {
  it('UTC 15시 이후는 KST 다음 날이다', () => {
    expect(kstToday(new Date('2026-10-01T15:30:00Z'))).toBe('2026-10-02')
    expect(kstToday(new Date('2026-10-01T14:59:00Z'))).toBe('2026-10-01')
  })
})

describe('월 파라미터', () => {
  it('YYYY-MM만 받는다', () => {
    expect(parseMonthParam('2026-10')).toEqual({ year: 2026, month: 10 })
    expect(parseMonthParam('2026-13')).toBeNull()
    expect(parseMonthParam('2026-1')).toBeNull()
    expect(parseMonthParam('abc')).toBeNull()
    expect(parseMonthParam(null)).toBeNull()
  })

  it('두 자리 월로 되돌리고 연 경계를 넘어 이동한다', () => {
    expect(formatMonthParam({ year: 2026, month: 3 })).toBe('2026-03')
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
    expect(monthOf('2026-10-02')).toEqual({ year: 2026, month: 10 })
    expect(formatMonthTitle({ year: 2026, month: 10 })).toBe('2026년 10월')
  })

  it('날짜 파라미터는 실재하는 날짜만 받는다', () => {
    expect(parseDateParam('2026-10-02')).toBe('2026-10-02')
    expect(parseDateParam('2026-02-30')).toBeNull()
    expect(parseDateParam('2026-10-2')).toBeNull()
    expect(parseDateParam(null)).toBeNull()
  })
})

describe('monthGrid — 일요일 시작 42칸', () => {
  it('목요일에 시작하는 달은 앞 달 일요일부터 채운다', () => {
    const cells = monthGrid({ year: 2026, month: 10 })
    expect(cells).toHaveLength(42)
    expect(cells[0]).toEqual({ date: '2026-09-27', day: 27, weekday: 0, inMonth: false })
    expect(cells[4]).toEqual({ date: '2026-10-01', day: 1, weekday: 4, inMonth: true })
    expect(cells[41]).toEqual({ date: '2026-11-07', day: 7, weekday: 6, inMonth: false })
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31)
  })

  it('일요일에 시작하는 달은 첫 칸이 1일이다', () => {
    const cells = monthGrid({ year: 2026, month: 11 })
    expect(cells[0]).toEqual({ date: '2026-11-01', day: 1, weekday: 0, inMonth: true })
    expect(cells[41].date).toBe('2026-12-12')
  })

  it('4주로 끝나는 2월도 6줄을 채운다', () => {
    const cells = monthGrid({ year: 2026, month: 2 })
    expect(cells[0].date).toBe('2026-02-01')
    expect(cells[27]).toEqual({ date: '2026-02-28', day: 28, weekday: 6, inMonth: true })
    expect(cells[41].date).toBe('2026-03-14')
  })

  it('연 경계를 넘는다', () => {
    const cells = monthGrid({ year: 2027, month: 1 })
    expect(cells[0].date).toBe('2026-12-27')
    expect(cells[5]).toEqual({ date: '2027-01-01', day: 1, weekday: 5, inMonth: true })
    expect(cells[41].date).toBe('2027-02-06')
  })

  it('요일은 칸 순서와 일치한다', () => {
    monthGrid({ year: 2026, month: 10 }).forEach((cell, index) => {
      expect(cell.weekday).toBe(index % 7)
    })
  })
})

describe('gridRange — 그리드 첫 칸 ~ 마지막 칸', () => {
  it('보이는 칸 전체를 조회 구간으로 쓴다', () => {
    expect(gridRange({ year: 2026, month: 10 })).toEqual({ from: '2026-09-27', to: '2026-11-07' })
  })

  it('양끝 포함 일수가 서버 상한 62일을 넘지 않는다', () => {
    for (let month = 1; month <= 12; month++) {
      const { from, to } = gridRange({ year: 2026, month })
      expect(daysBetween(from, to) + 1).toBe(42)
      expect(daysBetween(from, to) + 1).toBeLessThanOrEqual(CALENDAR_MAX_RANGE_DAYS)
    }
  })
})

describe('keyboardTarget — 그리드 방향키 이동', () => {
  it('좌우는 하루, 위아래는 한 주', () => {
    expect(keyboardTarget('2026-10-02', 'ArrowLeft')).toBe('2026-10-01')
    expect(keyboardTarget('2026-10-31', 'ArrowRight')).toBe('2026-11-01')
    expect(keyboardTarget('2026-10-02', 'ArrowUp')).toBe('2026-09-25')
    expect(keyboardTarget('2026-10-02', 'ArrowDown')).toBe('2026-10-09')
  })

  it('Home·End는 그 주의 일요일·토요일', () => {
    expect(keyboardTarget('2026-10-02', 'Home')).toBe('2026-09-27')
    expect(keyboardTarget('2026-10-02', 'End')).toBe('2026-10-03')
  })

  it('PageUp·PageDown은 한 달, 없는 날은 그 달 말일로', () => {
    expect(keyboardTarget('2026-10-02', 'PageUp')).toBe('2026-09-02')
    expect(keyboardTarget('2026-03-31', 'PageUp')).toBe('2026-02-28')
    expect(keyboardTarget('2026-12-15', 'PageDown')).toBe('2027-01-15')
  })

  it('다른 키는 무시한다', () => {
    expect(keyboardTarget('2026-10-02', 'Enter')).toBeNull()
  })
})

describe('daysBetween', () => {
  it('뒤 날짜에서 앞 날짜를 뺀 일수', () => {
    expect(daysBetween('2026-10-02', '2026-10-06')).toBe(4)
    expect(daysBetween('2026-10-06', '2026-10-02')).toBe(-4)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
  })
})

describe('groupEventsByDate — 날짜별 묶기와 정렬', () => {
  it('같은 날은 관심 → kind 순서 → 종목명 순', () => {
    const grouped = groupEventsByDate([
      event({ kind: 'AGM', stockName: '다라', ticker: '3' }),
      event({ kind: 'DIV_RECORD', stockName: '나다', ticker: '2' }),
      event({ kind: 'DIV_EX', stockName: '하하', ticker: '4' }),
      event({ kind: 'DIV_EX', stockName: '가가', ticker: '5' }),
      event({ kind: 'AGM', stockName: '마마', ticker: '1', favorite: true }),
      event({ date: '2026-10-06', kind: 'BONUS_EX', stockName: '바바', ticker: '6' }),
    ])
    expect([...grouped.keys()]).toEqual(['2026-10-05', '2026-10-06'])
    expect(grouped.get('2026-10-05')?.map((e) => e.ticker)).toEqual(['1', '5', '4', '2', '3'])
    expect(grouped.get('2026-10-06')?.map((e) => e.ticker)).toEqual(['6'])
  })

  it('kind 순서는 배당락·배당 기준일·배당 지급·무상·유상·주총', () => {
    const kinds = [
      'AGM',
      'RIGHTS_LIST',
      'RIGHTS_SUBSCRIBE',
      'RIGHTS_EX',
      'BONUS_LIST',
      'BONUS_EX',
      'DIV_PAY',
      'DIV_RECORD',
      'DIV_EX',
    ] as const
    const grouped = groupEventsByDate(kinds.map((kind) => event({ kind })))
    expect(grouped.get('2026-10-05')?.map((e) => e.kind)).toEqual([...kinds].reverse())
  })

  it('날짜 키는 오름차순', () => {
    const grouped = groupEventsByDate([event({ date: '2026-10-09' }), event({ date: '2026-10-01' })])
    expect([...grouped.keys()]).toEqual(['2026-10-01', '2026-10-09'])
  })
})

describe('cellPreview — 칩 최대 3개 + 나머지 개수', () => {
  it('3개 이하는 전부 보인다', () => {
    expect(cellPreview([1, 2, 3])).toEqual({ shown: [1, 2, 3], more: 0 })
  })

  it('넘치면 앞 3개와 나머지 개수', () => {
    expect(cellPreview([1, 2, 3, 4, 5])).toEqual({ shown: [1, 2, 3], more: 2 })
    expect(cellPreview([], 3)).toEqual({ shown: [], more: 0 })
  })
})

describe('라벨', () => {
  it('kind 9종의 한국어 라벨', () => {
    expect(KIND_LABELS).toEqual({
      DIV_EX: '배당락',
      DIV_RECORD: '배당 기준일',
      DIV_PAY: '배당 지급',
      BONUS_EX: '무상 권리락',
      BONUS_LIST: '무상 신주상장',
      RIGHTS_EX: '유상 권리락',
      RIGHTS_SUBSCRIBE: '유상 청약',
      RIGHTS_LIST: '유상 신주상장',
      AGM: '주총',
    })
  })

  it('칸 칩은 계열 색이 앞에 붙으므로 사건 이름만 짧게 쓴다', () => {
    expect(KIND_SHORT_LABELS).toEqual({
      DIV_EX: '배당락',
      DIV_RECORD: '기준일',
      DIV_PAY: '지급',
      BONUS_EX: '권리락',
      BONUS_LIST: '신주상장',
      RIGHTS_EX: '권리락',
      RIGHTS_SUBSCRIBE: '청약',
      RIGHTS_LIST: '신주상장',
      AGM: '주총',
    })
  })

  it('kind는 배당·무상증자·유상증자·주총 계열로 묶인다', () => {
    expect(kindFamily('DIV_PAY')).toBe('DIV')
    expect(kindFamily('BONUS_LIST')).toBe('BONUS')
    expect(kindFamily('RIGHTS_SUBSCRIBE')).toBe('RIGHTS')
    expect(kindFamily('AGM')).toBe('AGM')
    expect(FAMILY_LABELS).toEqual({ DIV: '배당', BONUS: '무상증자', RIGHTS: '유상증자', AGM: '주총' })
  })

  it('공모 상태 4종의 한국어 라벨', () => {
    expect(IPO_STATUS_LABELS).toEqual({
      UPCOMING: '청약 예정',
      SUBSCRIBING: '청약 중',
      LISTING_PENDING: '상장 예정',
      LISTED: '상장',
    })
  })
})

describe('휴장·주말', () => {
  it('평일 휴장만 따로 고른다 — 주말은 closedDates에 있어도 제외', () => {
    const holidays = weekdayHolidays(['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-09'])
    expect([...holidays].sort()).toEqual(['2026-10-05', '2026-10-09'])
  })

  it('토·일은 주말', () => {
    expect(isWeekend('2026-10-03')).toBe(true)
    expect(isWeekend('2026-10-04')).toBe(true)
    expect(isWeekend('2026-10-05')).toBe(false)
  })
})

describe('defaultSelection', () => {
  it('오늘이 보이는 달이면 오늘, 아니면 그 달 1일', () => {
    expect(defaultSelection({ year: 2026, month: 10 }, '2026-10-02')).toBe('2026-10-02')
    expect(defaultSelection({ year: 2026, month: 11 }, '2026-10-02')).toBe('2026-11-01')
  })
})

describe('날짜·시각 표기', () => {
  it('선택일 제목은 "10월 2일 (금)"', () => {
    expect(formatDayTitle('2026-10-02')).toBe('10월 2일 (금)')
    expect(formatDayTitle('2026-10-04')).toBe('10월 4일 (일)')
  })

  it('asOf는 KST "MM/DD HH:mm"', () => {
    expect(formatAsOf('2026-10-02T07:41:12+09:00')).toBe('10/02 07:41')
    expect(formatAsOf('2026-10-01T22:41:12Z')).toBe('10/02 07:41')
    expect(formatAsOf(null)).toBeNull()
    expect(formatAsOf('invalid')).toBeNull()
  })

  it('기간은 기존 짧은 날짜 표기를 잇는다', () => {
    expect(formatDateSpan('2026-10-02', '2026-10-06')).toBe('10/2–10/6')
    expect(formatDateSpan('2026-10-02', '2026-10-02')).toBe('10/2')
    expect(formatDateSpan('2026-10-02', null)).toBe('10/2')
  })
})

describe('formatSharesPerShare — 배정률(%)을 1주당 주식 수로', () => {
  it('100%는 1주당 1주, 소수는 4자리까지', () => {
    expect(formatSharesPerShare(100)).toBe('1주당 1주')
    expect(formatSharesPerShare(30)).toBe('1주당 0.3주')
    expect(formatSharesPerShare(21.58)).toBe('1주당 0.2158주')
    expect(formatSharesPerShare(250)).toBe('1주당 2.5주')
  })
})

describe('eventDetails — 일정 값 문구', () => {
  it('배당은 주당 금액, 없으면 미정', () => {
    expect(eventDetails(event({ kind: 'DIV_EX', amount: 1000, ratio: 20 }))).toEqual(['주당 1,000원'])
    expect(eventDetails(event({ kind: 'DIV_PAY', amount: null }))).toEqual(['배당금 미정'])
  })

  it('무상증자는 배정 주식 수', () => {
    expect(eventDetails(event({ kind: 'BONUS_EX', ratio: 100 }))).toEqual(['1주당 1주'])
    expect(eventDetails(event({ kind: 'BONUS_LIST', ratio: null }))).toEqual(['배정 비율 미정'])
  })

  it('유상증자는 발행가와 배정 주식 수, 청약은 마감일까지', () => {
    expect(eventDetails(event({ kind: 'RIGHTS_EX', amount: 20600, ratio: 21.58 }))).toEqual([
      '발행가 20,600원',
      '1주당 0.2158주',
    ])
    expect(
      eventDetails(event({ kind: 'RIGHTS_SUBSCRIBE', date: '2026-08-13', endDate: '2026-08-14', amount: null, ratio: null })),
    ).toEqual(['청약 8/13–8/14', '발행가 미정'])
  })

  it('주총은 값 문구 없이 안건으로 보여준다', () => {
    expect(eventDetails(event({ kind: 'AGM', agenda: ['정관변경'] }))).toEqual([])
  })
})

describe('groupIpos — 상태별 묶음', () => {
  it('청약 중 → 청약 예정 → 상장 예정 → 최근 상장, 빈 묶음은 뺀다', () => {
    const groups = groupIpos([
      ipo({ name: '상장됨', status: 'LISTED', listingDate: '2026-09-25' }),
      ipo({ name: '예정', status: 'UPCOMING' }),
      ipo({ name: '청약중', status: 'SUBSCRIBING' }),
    ])
    expect(groups.map((g) => [g.status, g.title, g.items.map((i) => i.name)])).toEqual([
      ['SUBSCRIBING', '청약 중', ['청약중']],
      ['UPCOMING', '청약 예정', ['예정']],
      ['LISTED', '최근 상장', ['상장됨']],
    ])
  })

  it('청약 중은 마감 임박순, 예정은 시작순, 상장 예정은 상장일순(미정은 뒤), 최근 상장은 최신순', () => {
    const groups = groupIpos([
      ipo({ name: 'S2', status: 'SUBSCRIBING', subscrEnd: '2026-10-06' }),
      ipo({ name: 'S1', status: 'SUBSCRIBING', subscrEnd: '2026-10-03' }),
      ipo({ name: 'U2', status: 'UPCOMING', subscrStart: '2026-10-20' }),
      ipo({ name: 'U1', status: 'UPCOMING', subscrStart: '2026-10-12' }),
      ipo({ name: 'P3', status: 'LISTING_PENDING', listingDate: null }),
      ipo({ name: 'P2', status: 'LISTING_PENDING', listingDate: '2026-10-15' }),
      ipo({ name: 'P1', status: 'LISTING_PENDING', listingDate: '2026-10-08' }),
      ipo({ name: 'L1', status: 'LISTED', listingDate: '2026-09-20' }),
      ipo({ name: 'L2', status: 'LISTED', listingDate: '2026-10-01' }),
    ])
    expect(groups.map((g) => g.items.map((i) => i.name))).toEqual([
      ['S1', 'S2'],
      ['U1', 'U2'],
      ['P1', 'P2', 'P3'],
      ['L2', 'L1'],
    ])
  })

  it('빈 목록은 빈 묶음', () => {
    expect(groupIpos([])).toEqual([])
  })
})

describe('ipoCountdown — 오늘(KST) 기준 남은 날', () => {
  const today = '2026-10-02'

  it('청약 예정은 시작까지', () => {
    expect(ipoCountdown(ipo({ status: 'UPCOMING', subscrStart: '2026-10-05' }), today)).toBe('청약 D-3')
    expect(ipoCountdown(ipo({ status: 'UPCOMING', subscrStart: '2026-10-03' }), today)).toBe('내일 청약')
  })

  it('청약 중은 마감까지', () => {
    expect(ipoCountdown(ipo({ status: 'SUBSCRIBING', subscrEnd: '2026-10-06' }), today)).toBe('마감 D-4')
    expect(ipoCountdown(ipo({ status: 'SUBSCRIBING', subscrEnd: '2026-10-02' }), today)).toBe('오늘 마감')
  })

  it('상장 예정은 상장일이 정해졌을 때만', () => {
    expect(ipoCountdown(ipo({ status: 'LISTING_PENDING', listingDate: '2026-10-09' }), today)).toBe('상장 D-7')
    expect(ipoCountdown(ipo({ status: 'LISTING_PENDING', listingDate: '2026-10-02' }), today)).toBe('오늘 상장')
    expect(ipoCountdown(ipo({ status: 'LISTING_PENDING', listingDate: null }), today)).toBeNull()
  })

  it('서버 상태와 클라 날짜가 어긋나 지난 날이면 표시하지 않는다', () => {
    expect(ipoCountdown(ipo({ status: 'UPCOMING', subscrStart: '2026-10-01' }), today)).toBeNull()
    expect(ipoCountdown(ipo({ status: 'SUBSCRIBING', subscrEnd: '2026-10-01' }), today)).toBeNull()
    expect(ipoCountdown(ipo({ status: 'LISTED', listingDate: '2026-09-30' }), today)).toBeNull()
  })
})

describe('종목 일정 API 계약 — 설계서 §4.1·§4.2 예시', () => {
  it('계열별 지표 블록은 자기 계열에만 있다', () => {
    expect(
      [...SAMSUNG_CALENDAR.actions, RIGHTS_ACTION, BONUS_ACTION].map((a) => [
        a.family,
        a.dividend !== null,
        a.rights !== null,
        a.bonus !== null,
      ]),
    ).toEqual([
      ['DIV', true, false, false],
      ['AGM', false, false, false],
      ['RIGHTS', false, true, false],
      ['BONUS', false, false, true],
    ])
  })

  it('권리락 이론가는 확정·참고 기준을 함께 싣고 배당락 반응은 회복일이 비어 올 수 있다', () => {
    expect(RIGHTS_ACTION.rights?.exPrice.basis).toBe('PREVIOUS_CLOSE')
    expect(BONUS_ACTION.bonus?.exPrice.actualOpen).toBeNull()
    expect(DIVIDEND_HISTORY[0].recoveryDays).toBe(3)
  })
})

describe('stockCalendarWindow — 클릭한 일정일 앞뒤 180일', () => {
  it('양끝 포함 361일이라 서버 상한 366일 안이다', () => {
    const { from, to } = stockCalendarWindow('2026-10-02')
    expect([from, to]).toEqual(['2026-04-05', '2027-03-31'])
    expect(daysBetween(from, to) + 1).toBe(STOCK_CALENDAR_WINDOW_DAYS * 2 + 1)
    expect(daysBetween(from, to) + 1).toBeLessThanOrEqual(366)
  })

  it('윤년 2월을 넘어도 일수가 같다', () => {
    const { from, to } = stockCalendarWindow('2028-02-29')
    expect([from, to]).toEqual(['2027-09-02', '2028-08-27'])
    expect(daysBetween(from, to) + 1).toBe(361)
  })
})

describe('findEvent — 모달 대상 행', () => {
  const rows = [
    event({ ticker: '005930', kind: 'DIV_EX', date: '2026-09-29', label: null }),
    event({ ticker: '005930', kind: 'DIV_RECORD', date: '2026-09-30', label: null }),
    event({ ticker: '000660', kind: 'DIV_EX', date: '2026-09-29', label: null }),
  ]

  it('종목·종류·날짜가 모두 같은 행', () => {
    expect(findEvent(rows, { ticker: '005930', kind: 'DIV_RECORD', date: '2026-09-30', label: null })).toBe(rows[1])
    expect(findEvent(rows, { ticker: '000660', kind: 'DIV_EX', date: '2026-09-29', label: null })).toBe(rows[2])
  })

  it('없으면 null', () => {
    expect(findEvent(rows, { ticker: '005930', kind: 'DIV_PAY', date: '2026-11-20', label: null })).toBeNull()
  })

  it('같은 날 같은 종류 행이 둘이면 라벨까지 같은 행', () => {
    const twins = [
      event({ ticker: '005930', kind: 'DIV_PAY', date: '2026-11-20', label: '결산' }),
      event({ ticker: '005930', kind: 'DIV_PAY', date: '2026-11-20', label: '분기' }),
    ]
    expect(findEvent(twins, { ticker: '005930', kind: 'DIV_PAY', date: '2026-11-20', label: '분기' })).toBe(twins[1])
    expect(findEvent(twins, { ticker: '005930', kind: 'DIV_PAY', date: '2026-11-20', label: '결산' })).toBe(twins[0])
  })
})

describe('actionKey — 서버 묶음 키', () => {
  it('계열|기준일|라벨, 라벨이 없으면 빈 칸', () => {
    expect(actionKey(SAMSUNG_CALENDAR.actions[1])).toBe('AGM|2026-10-20|임시총회')
    expect(actionKey(RIGHTS_ACTION)).toBe('RIGHTS|2026-08-05|')
  })
})

describe('findAction — 클릭한 (종류, 날짜)가 든 묶음', () => {
  it('단계에 같은 종류·날짜가 있는 묶음', () => {
    expect(findAction(SAMSUNG_CALENDAR.actions, 'DIV_RECORD', '2026-09-30')).toBe(SAMSUNG_CALENDAR.actions[0])
    expect(findAction(SAMSUNG_CALENDAR.actions, 'AGM', '2026-11-09')).toBe(SAMSUNG_CALENDAR.actions[1])
  })

  it('없으면 null', () => {
    expect(findAction(SAMSUNG_CALENDAR.actions, 'DIV_PAY', '2027-04-20')).toBeNull()
  })

  it('같은 날 같은 종류 묶음이 둘이면 행의 라벨과 같은 묶음, 라벨이 안 맞으면 첫 묶음', () => {
    const yearEnd = action({ label: '결산', basisDate: '2026-06-30', steps: [step('DIV_PAY', '2026-11-20')] })
    const quarter = SAMSUNG_CALENDAR.actions[0]
    expect(findAction([yearEnd, quarter], 'DIV_PAY', '2026-11-20', '분기')).toBe(quarter)
    expect(findAction([yearEnd, quarter], 'DIV_PAY', '2026-11-20')).toBe(yearEnd)
    expect(findAction([yearEnd, quarter], 'DIV_PAY', '2026-11-20', '반기')).toBe(yearEnd)
  })
})

describe('selectAction — 모달 초점의 묶음', () => {
  it('키가 있으면 키로만 찾는다', () => {
    expect(
      selectAction(SAMSUNG_CALENDAR.actions, { key: 'AGM|2026-10-20|임시총회', kind: 'DIV_EX', date: '2026-09-29' }),
    ).toBe(SAMSUNG_CALENDAR.actions[1])
    expect(selectAction(SAMSUNG_CALENDAR.actions, { key: 'RIGHTS|2026-08-05|', kind: 'DIV_EX', date: '2026-09-29' })).toBeNull()
  })

  it('키가 없으면 (종류, 날짜)와 라벨로 찾는다', () => {
    expect(selectAction(SAMSUNG_CALENDAR.actions, { key: null, kind: 'DIV_EX', date: '2026-09-29' }, '분기')).toBe(
      SAMSUNG_CALENDAR.actions[0],
    )
  })
})

describe('stepState — 오늘(KST) 기준 단계 상태', () => {
  it('하루짜리 단계는 지남·오늘·예정', () => {
    expect(stepState({ date: '2026-10-01', endDate: null }, '2026-10-02')).toBe('past')
    expect(stepState({ date: '2026-10-02', endDate: null }, '2026-10-02')).toBe('today')
    expect(stepState({ date: '2026-10-03', endDate: null }, '2026-10-02')).toBe('upcoming')
  })

  it('기간 단계는 마지막 날까지 오늘이다', () => {
    const span = { date: '2026-10-01', endDate: '2026-10-05' }
    expect(stepState(span, '2026-09-30')).toBe('upcoming')
    expect(stepState(span, '2026-10-01')).toBe('today')
    expect(stepState(span, '2026-10-05')).toBe('today')
    expect(stepState(span, '2026-10-06')).toBe('past')
  })
})

describe('dDay·spanCountdown — 남은 날 표기', () => {
  it('dDay는 오늘·D-n·D+n', () => {
    expect(dDay('2026-10-02', '2026-10-02')).toBe('오늘')
    expect(dDay('2026-10-05', '2026-10-02')).toBe('D-3')
    expect(dDay('2026-09-29', '2026-10-02')).toBe('D+3')
  })

  it('지난 단계는 지남, 기간 단계가 진행 중이면 진행 중', () => {
    expect(spanCountdown({ date: '2026-10-05', endDate: null }, '2026-10-02')).toBe('D-3')
    expect(spanCountdown({ date: '2026-10-02', endDate: null }, '2026-10-02')).toBe('오늘')
    expect(spanCountdown({ date: '2026-09-29', endDate: null }, '2026-10-02')).toBe('지남')
    expect(spanCountdown({ date: '2026-10-01', endDate: '2026-10-05' }, '2026-10-02')).toBe('진행 중')
    expect(spanCountdown({ date: '2026-10-01', endDate: '2026-10-05' }, '2026-10-05')).toBe('진행 중')
    expect(spanCountdown({ date: '2026-10-01', endDate: '2026-10-05' }, '2026-10-06')).toBe('지남')
    expect(spanCountdown({ date: '2026-10-02', endDate: '2026-10-02' }, '2026-10-02')).toBe('오늘')
  })
})

describe('focusStep — 묶음의 대표 단계', () => {
  const dividend = SAMSUNG_CALENDAR.actions[0]

  it('지나지 않은 첫 단계, 오늘인 단계 포함', () => {
    expect(focusStep(dividend, '2026-10-02')?.kind).toBe('DIV_PAY')
    expect(focusStep(dividend, '2026-09-30')?.kind).toBe('DIV_RECORD')
    expect(focusStep(RIGHTS_ACTION, '2026-09-11')?.kind).toBe('RIGHTS_SUBSCRIBE')
  })

  it('모두 지났으면 마지막 단계, 단계가 없으면 null', () => {
    expect(focusStep(dividend, '2026-12-01')?.kind).toBe('DIV_PAY')
    expect(focusStep(action({ steps: [] }), '2026-10-02')).toBeNull()
  })
})

describe('formatDayRange — 요약의 날짜 표기', () => {
  it('하루는 선택일 제목 형식, 기간은 양끝을 같은 형식으로', () => {
    expect(formatDayRange('2026-09-29', null)).toBe('9월 29일 (화)')
    expect(formatDayRange('2026-09-29', '2026-09-29')).toBe('9월 29일 (화)')
    expect(formatDayRange('2026-09-10', '2026-09-11')).toBe('9월 10일 (목) – 9월 11일 (금)')
  })
})

describe('timelineItems — 권리 일정 흐름', () => {
  it('배당은 기준일 단계가 이미 있어 단계만', () => {
    const items = timelineItems(SAMSUNG_CALENDAR.actions[0])
    expect(items.map((i) => [i.kind, i.label, i.date])).toEqual([
      ['LAST_BUY', '매수 마감', '2026-09-28'],
      ['DIV_EX', '배당락', '2026-09-29'],
      ['DIV_RECORD', '배당 기준일', '2026-09-30'],
      ['DIV_PAY', '배당 지급', '2026-11-20'],
    ])
  })

  it('주총은 매수 마감 → 주주명부 기준일 → 주총일', () => {
    expect(timelineItems(SAMSUNG_CALENDAR.actions[1])).toEqual([
      { key: 'LAST_BUY|2026-10-16', kind: 'LAST_BUY', label: '매수 마감', date: '2026-10-16', endDate: null, estimated: false },
      { key: 'BASIS|2026-10-20', kind: 'BASIS', label: '주주명부 기준일', date: '2026-10-20', endDate: null, estimated: false },
      { key: 'AGM|2026-11-09', kind: 'AGM', label: '주총', date: '2026-11-09', endDate: null, estimated: false },
    ])
  })

  it('유상은 권리락 뒤에 신주배정 기준일을 날짜 순서대로 끼운다', () => {
    expect(timelineItems(RIGHTS_ACTION).map((i) => i.label)).toEqual([
      '매수 마감',
      '유상 권리락',
      '신주배정 기준일',
      '유상 청약',
      '유상 신주상장',
    ])
    expect(timelineItems(RIGHTS_ACTION)[3].endDate).toBe('2026-09-11')
  })

  it('기준일 단계가 없는 배당은 배당 기준일을 끼우고, 같은 날짜면 단계 뒤에 둔다', () => {
    expect(
      timelineItems(action({ basisDate: '2026-09-30', steps: [step('DIV_PAY', '2026-11-20')] })).map((i) => i.kind),
    ).toEqual(['LAST_BUY', 'BASIS', 'DIV_PAY'])
    expect(
      timelineItems(
        action({
          family: 'RIGHTS',
          basisDate: '2026-08-04',
          steps: [step('RIGHTS_EX', '2026-08-04'), step('RIGHTS_LIST', '2026-10-02')],
        }),
      ).map((i) => i.kind),
    ).toEqual(['LAST_BUY', 'RIGHTS_EX', 'BASIS', 'RIGHTS_LIST'])
  })

  it('매수 마감이 추정이면 흐름 항목에도 추정으로 싣는다', () => {
    const items = timelineItems(action({ lastBuyDate: '2027-06-11', lastBuyEstimated: true }))
    expect(items[0]).toEqual({
      key: 'LAST_BUY|2027-06-11',
      kind: 'LAST_BUY',
      label: '매수 마감',
      date: '2027-06-11',
      endDate: null,
      estimated: true,
    })
  })
})

describe('모달 문구 상수', () => {
  it('계열별 기준일 이름', () => {
    expect(BASIS_LABELS).toEqual({
      DIV: '배당 기준일',
      BONUS: '신주배정 기준일',
      RIGHTS: '신주배정 기준일',
      AGM: '주주명부 기준일',
    })
  })

  it('종류별 한 줄 설명', () => {
    expect(KIND_DESCRIPTIONS).toEqual({
      DIV_EX: '이날부터 산 주식은 이번 배당을 받지 못합니다. 배당만큼 주가가 낮게 출발하기도 합니다.',
      DIV_RECORD: '이날 주주명부에 오른 주주가 배당을 받습니다. 결제에 2거래일이 걸려 매수는 그 전에 끝내야 합니다.',
      DIV_PAY: '배당금이 주주 계좌로 들어오는 날입니다.',
      BONUS_EX: '이날부터 산 주식은 무상 신주를 받지 못합니다. 늘어나는 주식 수만큼 기준가가 낮게 조정됩니다.',
      BONUS_LIST: '무상으로 받은 신주가 상장돼 거래할 수 있게 되는 날입니다.',
      RIGHTS_EX: '이날부터 산 주식은 유상 신주를 배정받지 못합니다. 기준가가 권리락 이론가로 조정됩니다.',
      RIGHTS_SUBSCRIBE: '신주를 배정받은 주주가 발행가로 청약하는 기간입니다.',
      RIGHTS_LIST: '유상으로 발행한 신주가 상장돼 거래할 수 있게 되는 날입니다.',
      AGM: '주주가 안건에 의결권을 행사하는 날입니다. 기준일에 주주명부에 올라 있어야 참석할 수 있습니다.',
    })
  })
})

describe('agendaCountLabel — 행의 안건 표기', () => {
  it('건수만, 잘렸으면 이상', () => {
    expect(agendaCountLabel(event({ kind: 'AGM', agenda: ['정관변경', '사내이사 선임', '합병승인'] }))).toBe('안건 3건')
    expect(agendaCountLabel(event({ kind: 'AGM', agenda: ['정관변경'], agendaTruncated: true }))).toBe('안건 1건 이상')
    expect(agendaCountLabel(SAMSUNG_CALENDAR.actions[1])).toBe('안건 2건')
  })

  it('안건이 없으면 null', () => {
    expect(agendaCountLabel(event({ kind: 'AGM', agenda: [] }))).toBeNull()
  })
})

describe('eventDetails — 행이 아닌 값 묶음도 받는다', () => {
  it('묶음의 금액·비율과 단계의 날짜로 같은 문구를 만든다', () => {
    expect(eventDetails({ kind: 'RIGHTS_EX', date: '2026-08-04', endDate: null, amount: null, ratio: 30 })).toEqual([
      '발행가 미정',
      '1주당 0.3주',
    ])
  })
})

describe('summaryFromAction·summaryFromRow — 일정 요약 모델', () => {
  it('묶음에서 초점 단계의 날짜와 묶음 값·매수 마감일', () => {
    expect(summaryFromAction(SAMSUNG_CALENDAR.actions[0], 'DIV_EX', '2026-09-29')).toEqual({
      kind: 'DIV_EX',
      date: '2026-09-29',
      endDate: null,
      estimated: false,
      label: '분기',
      details: ['주당 361원'],
      lastBuy: { date: '2026-09-28', estimated: false },
    })
  })

  it('청약 단계는 기간과 발행가·배정 비율', () => {
    const summary = summaryFromAction(RIGHTS_ACTION, 'RIGHTS_SUBSCRIBE', '2026-09-10')
    expect(summary.endDate).toBe('2026-09-11')
    expect(summary.details).toEqual(['청약 9/10–9/11', '발행가 20,600원', '1주당 0.2158주'])
  })

  it('묶음을 못 찾으면 행 정보로, 매수 마감일은 없다', () => {
    const row = event({ ticker: '005930', kind: 'DIV_PAY', date: '2026-11-20', label: '분기', amount: null })
    expect(summaryFromRow({ ticker: '005930', kind: 'DIV_PAY', date: '2026-11-20', label: null }, row)).toEqual({
      kind: 'DIV_PAY',
      date: '2026-11-20',
      endDate: null,
      estimated: false,
      label: '분기',
      details: ['배당금 미정'],
      lastBuy: null,
    })
  })

  it('행도 없으면 종류·날짜만, 값 문구 없이', () => {
    expect(summaryFromRow({ ticker: '005930', kind: 'AGM', date: '2026-11-09', label: null }, null)).toEqual({
      kind: 'AGM',
      date: '2026-11-09',
      endDate: null,
      estimated: false,
      label: null,
      details: [],
      lastBuy: null,
    })
  })
})

describe('summarizeRecovery·formatRecoverySummary — 5거래일 내 회복 요약', () => {
  const rows = [
    reaction({ recoveryDays: 1 }),
    reaction({ recoveryDays: 5 }),
    reaction({ recoveryDays: 6 }),
    reaction({ recoveryDays: null }),
    reaction({ recoveryDays: null, pending: true }),
  ]

  it('집계 중 회차는 분모·분자에서 빼고 따로 센다', () => {
    expect(summarizeRecovery(rows)).toEqual({ total: 4, recovered: 2, pending: 1 })
    expect(summarizeRecovery([])).toEqual({ total: 0, recovered: 0, pending: 0 })
  })

  it('N회 중 M회, 집계 중이 있으면 덧붙인다', () => {
    expect(formatRecoverySummary(summarizeRecovery(rows))).toBe('4회 중 2회 5거래일 내 회복 · 1회 집계 중')
    expect(formatRecoverySummary({ total: 3, recovered: 3, pending: 0 })).toBe('3회 중 3회 5거래일 내 회복')
  })

  it('확정 회차가 없으면 집계 중만, 기록이 없으면 null', () => {
    expect(formatRecoverySummary({ total: 0, recovered: 0, pending: 1 })).toBe('1회 집계 중')
    expect(formatRecoverySummary({ total: 0, recovered: 0, pending: 0 })).toBeNull()
  })
})

describe('recoveryLabel — 회차별 회복 칸', () => {
  it('당일·n거래일째·미회복·집계 중', () => {
    expect(recoveryLabel(reaction({ recoveryDays: 1 }))).toBe('당일 회복')
    expect(recoveryLabel(reaction({ recoveryDays: 3 }))).toBe('3거래일째 회복')
    expect(recoveryLabel(reaction({ recoveryDays: null }))).toBe('60거래일 내 미회복')
    expect(recoveryLabel(reaction({ recoveryDays: null, pending: true }))).toBe('집계 중')
  })
})

describe('latestPayoutRatio — 최근 연도 배당성향', () => {
  it('추정이 아니고 값이 있는 가장 최근 연도', () => {
    expect(
      latestPayoutRatio([
        { ...emptyFinancials(2023), payoutRatio: 30.1 },
        { ...emptyFinancials(2025), payoutRatio: null },
        { ...emptyFinancials(2024), payoutRatio: 25.5 },
        { ...emptyFinancials(2026), payoutRatio: 40, estimated: true },
      ]),
    ).toEqual({ year: 2024, value: 25.5 })
  })

  it('값이 하나도 없으면 null', () => {
    expect(latestPayoutRatio([])).toBeNull()
    expect(latestPayoutRatio([emptyFinancials(2025)])).toBeNull()
  })
})

describe('candleIndexOn — 차트에서 강조할 일봉', () => {
  const candles = [{ date: '2026-09-28' }, { date: '2026-09-29' }, { date: '2026-09-30' }]

  it('날짜가 정확히 같은 일봉', () => {
    expect(candleIndexOn(candles, '2026-09-29')).toBe(1)
  })

  it('휴장일·구간 밖·미래는 강조하지 않는다', () => {
    expect(candleIndexOn(candles, '2026-09-27')).toBeNull()
    expect(candleIndexOn(candles, '2026-10-01')).toBeNull()
    expect(candleIndexOn([], '2026-09-29')).toBeNull()
  })
})

describe('formatFullDate — 연도가 섞이는 표의 날짜', () => {
  it('YYYY.MM.DD', () => {
    expect(formatFullDate('2026-06-30')).toBe('2026.06.30')
  })
})

describe('metricText — 미정과 계산 불가 구분', () => {
  it('원천 값이 없으면 미정', () => {
    expect(metricText(null, formatWon, true)).toBe('미정')
    expect(metricText(0.507, formatPercent, true)).toBe('미정')
  })

  it('원천은 있는데 계산값이 없으면 —', () => {
    expect(metricText(null, formatPercent, false)).toBe('—')
  })

  it('값이 있으면 그 포맷', () => {
    expect(metricText(361, formatWon, false)).toBe('361원')
    expect(metricText(0.507, formatPercent, false)).toBe('0.51%')
    expect(metricText(-3.2, formatChange, false)).toBe('−3.20%')
  })
})

describe('EX_PRICE_BASIS_LABELS — 이론가의 확정·참고 구분', () => {
  it('기준별 설명', () => {
    expect(EX_PRICE_BASIS_LABELS).toEqual({
      PREVIOUS_CLOSE: '권리락 전날 종가로 계산한 확정값',
      CURRENT_PRICE: '현재가로 계산한 참고값',
    })
  })
})

describe('exPriceMissing — 이론가의 미정 판정', () => {
  it('현재가 참고값은 계산 입력(발행가·배정 비율)이 없으면 미정', () => {
    expect(exPriceMissing('CURRENT_PRICE', true)).toBe(true)
    expect(exPriceMissing('CURRENT_PRICE', false)).toBe(false)
  })

  it('권리락이 지난 확정값은 거래소 기준가라 입력이 없어도 미정이 아니다', () => {
    expect(exPriceMissing('PREVIOUS_CLOSE', true)).toBe(false)
  })
})
