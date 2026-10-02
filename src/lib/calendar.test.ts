import { describe, expect, it } from 'vitest'
import type { CalendarEventRes, IpoRes } from '@/lib/apiTypes'
import {
  CALENDAR_MAX_RANGE_DAYS,
  FAMILY_LABELS,
  IPO_STATUS_LABELS,
  KIND_LABELS,
  KIND_SHORT_LABELS,
  cellPreview,
  daysBetween,
  defaultSelection,
  eventDetails,
  formatAsOf,
  formatDateSpan,
  formatDayTitle,
  formatMonthParam,
  formatMonthTitle,
  formatSharesPerShare,
  gridRange,
  groupEventsByDate,
  groupIpos,
  ipoCountdown,
  isWeekend,
  keyboardTarget,
  kindFamily,
  kstToday,
  monthGrid,
  monthOf,
  parseDateParam,
  parseMonthParam,
  shiftMonth,
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
