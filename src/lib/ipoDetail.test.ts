import { describe, expect, it } from 'vitest'
import type { IpoDetailRes, IpoRes } from '@/lib/apiTypes'
import {
  IPO_NOTICE,
  PLANNED_PRICE_HINT,
  afterListingState,
  filedOnFromRceptNo,
  findIpo,
  formatOfferingAmount,
  formatShareCount,
  fundUsesNotice,
  homepageUrl,
  ipoDetailParams,
  ipoHeaderCountdown,
  ipoIntroSource,
  ipoKey,
  ipoPriceBadge,
  ipoPriceText,
  ipoTarget,
  ipoTargetKey,
  ipoTimeline,
  listedTicker,
  oldShareText,
  putbackText,
  underwriterRoleLabel,
} from '@/lib/ipoDetail'

const DONGWON_DETAIL: IpoDetailRes = {
  corpCode: '00784184',
  ticker: null,
  name: '동원파츠',
  status: 'FILED',
  spac: false,
  schedule: {
    subscrStart: '2026-11-02',
    subscrEnd: '2026-11-03',
    payDate: '2026-11-05',
    refundDate: null,
    listingDate: null,
  },
  offering: {
    price: 23000,
    priceBasis: 'PLANNED',
    shares: 2030000,
    amount: 46690000000,
    method: '일반공모',
    underwriters: [{ name: '삼성증권', role: '대표', shares: 2030000, amount: 46690000000, method: '총액인수' }],
    fundUses: [{ purpose: '시설자금', amount: 31320000000, share: 99.8866 }],
    fundUsesWithheld: false,
    sellers: [],
    oldShareRatio: null,
    putback: null,
  },
  company: {
    ceo: '홍길동',
    establishedOn: '2002-08-07',
    address: '대구광역시 동구 율암로 12',
    homepage: null,
    description: '자동차 부품을 만듭니다. 매출 대부분은 국내 완성차입니다.',
    descriptionSource: 'DART_LLM',
    descriptionRceptNo: '20261001000579',
  },
  afterListing: null,
  filing: {
    firstRceptNo: '20261001000579',
    latestRceptNo: '20261001000579',
    latestReportName: '증권신고서(지분증권)',
  },
  asOf: '2026-10-02T07:30:00+09:00',
}

const KSD_ONLY_DETAIL: IpoDetailRes = {
  corpCode: null,
  ticker: '480370',
  name: '예탁원만',
  status: 'LISTED',
  spac: true,
  schedule: {
    subscrStart: '2026-09-15',
    subscrEnd: '2026-09-16',
    payDate: '2026-09-18',
    refundDate: '2026-09-18',
    listingDate: '2026-09-25',
  },
  offering: {
    price: 2000,
    priceBasis: 'CONFIRMED',
    shares: null,
    amount: null,
    method: null,
    underwriters: null,
    fundUses: null,
    fundUsesWithheld: false,
    sellers: null,
    oldShareRatio: null,
    putback: null,
  },
  company: null,
  afterListing: {
    listingDate: '2026-09-25',
    open: 2600,
    close: 2450,
    openReturn: 30,
    closeReturn: 22.5,
    price: 2300,
    currentReturn: 15,
    priceDate: '2026-10-01',
  },
  filing: null,
  asOf: null,
}

const card = (overrides: Partial<IpoRes>): IpoRes => ({
  ticker: '900001',
  corpCode: null,
  name: '공모',
  status: 'UPCOMING',
  spac: false,
  subscrStart: '2026-10-10',
  subscrEnd: '2026-10-11',
  offerPrice: null,
  priceBasis: 'CONFIRMED',
  leadManagers: null,
  payDate: null,
  refundDate: null,
  listingDate: null,
  ...overrides,
})

describe('공모주 상세 API 계약 — 설계서 §5.3 예시', () => {
  it('DART 연결 공모는 공모 구조·기업·신고서를 모두 싣는다', () => {
    expect([
      DONGWON_DETAIL.offering.underwriters?.length,
      DONGWON_DETAIL.offering.fundUses?.[0].share,
      DONGWON_DETAIL.company?.descriptionSource,
      DONGWON_DETAIL.filing?.latestReportName,
    ]).toEqual([1, 99.8866, 'DART_LLM', '증권신고서(지분증권)'])
  })

  it('예탁원만 있는 공모는 DART 항목·기업·신고서가 null이고 일정·공모가는 남는다', () => {
    expect([
      KSD_ONLY_DETAIL.offering.underwriters,
      KSD_ONLY_DETAIL.offering.sellers,
      KSD_ONLY_DETAIL.company,
      KSD_ONLY_DETAIL.filing,
      KSD_ONLY_DETAIL.offering.price,
      KSD_ONLY_DETAIL.schedule.listingDate,
    ]).toEqual([null, null, null, null, 2000, '2026-09-25'])
  })
})

describe('ipoTarget·ipoDetailParams — 상세 조회 키는 하나만', () => {
  it('DART 고유번호가 있으면 그것만, 없으면 종목코드만 쓴다', () => {
    expect(ipoTarget(card({ corpCode: '00784184', ticker: '480370' }))).toEqual({ corpCode: '00784184', ticker: null })
    expect(ipoTarget(card({ corpCode: null, ticker: '480370' }))).toEqual({ corpCode: null, ticker: '480370' })
    expect(ipoTarget(card({ corpCode: '00784184', ticker: null }))).toEqual({ corpCode: '00784184', ticker: null })
  })

  it('키가 둘 다 없으면 상세를 열 수 없다', () => {
    expect(ipoTarget(card({ corpCode: null, ticker: null }))).toBeNull()
  })

  it('요청 파라미터에는 키가 정확히 하나 들어간다', () => {
    expect(ipoDetailParams({ corpCode: '00784184', ticker: null })).toEqual({ corpCode: '00784184' })
    expect(ipoDetailParams({ corpCode: null, ticker: '480370' })).toEqual({ ticker: '480370' })
    expect(ipoDetailParams({ corpCode: '00784184', ticker: '480370' })).toEqual({ corpCode: '00784184' })
  })
})

describe('ipoKey·ipoTargetKey·findIpo — 카드 식별', () => {
  it('종목코드가 없는 신고서 카드끼리도 키가 겹치지 않는다', () => {
    const a = card({ ticker: null, corpCode: '00000001', subscrStart: '2026-11-02' })
    const b = card({ ticker: null, corpCode: '00000002', subscrStart: '2026-11-02' })
    expect(ipoKey(a)).not.toBe(ipoKey(b))
    expect(ipoKey(a)).toBe('00000001||2026-11-02')
  })

  it('모달 대상 키는 고유번호|종목코드', () => {
    expect(ipoTargetKey({ corpCode: '00784184', ticker: null })).toBe('00784184|')
    expect(ipoTargetKey({ corpCode: null, ticker: '480370' })).toBe('|480370')
  })

  it('대상 키로 보드 카드를 찾는다', () => {
    const filed = card({ name: '신고서', ticker: null, corpCode: '00784184' })
    const ksd = card({ name: '예탁원', ticker: '480370', corpCode: null })
    expect(findIpo([ksd, filed], { corpCode: '00784184', ticker: null })?.name).toBe('신고서')
    expect(findIpo([filed, ksd], { corpCode: null, ticker: '480370' })?.name).toBe('예탁원')
    expect(findIpo([filed, ksd], { corpCode: null, ticker: null })).toBeNull()
    expect(findIpo([ksd], { corpCode: '00784184', ticker: null })).toBeNull()
  })
})

describe('filedOnFromRceptNo — 접수번호 앞 8자리가 접수일', () => {
  it('YYYYMMDD로 시작하는 접수번호에서 날짜를 꺼낸다', () => {
    expect(filedOnFromRceptNo('20261001000579')).toBe('2026-10-01')
  })

  it('날짜가 아니면 null', () => {
    expect(filedOnFromRceptNo('20261341000001')).toBeNull()
    expect(filedOnFromRceptNo('rcept')).toBeNull()
  })
})

describe('ipoTimeline — 공모 일정 흐름', () => {
  it('신고서 제출 → 청약 → 납입 → 상장, 환불일이 없으면 환불 단계를 뺀다', () => {
    expect(ipoTimeline(DONGWON_DETAIL)).toEqual([
      { key: 'FILED', label: '신고서 제출', date: '2026-10-01', endDate: null },
      { key: 'SUBSCRIBE', label: '청약', date: '2026-11-02', endDate: '2026-11-03' },
      { key: 'PAY', label: '납입', date: '2026-11-05', endDate: null },
      { key: 'LIST', label: '상장', date: null, endDate: null },
    ])
  })

  it('DART 신고서가 없으면 신고서 단계 없이 예탁원 일정만, 환불일이 있으면 납입 뒤에', () => {
    expect(ipoTimeline(KSD_ONLY_DETAIL).map((item) => [item.key, item.date])).toEqual([
      ['SUBSCRIBE', '2026-09-15'],
      ['PAY', '2026-09-18'],
      ['REFUND', '2026-09-18'],
      ['LIST', '2026-09-25'],
    ])
  })

  it('청약일이 비면 청약 단계는 날짜 없이 남는다', () => {
    const detail = { ...KSD_ONLY_DETAIL, schedule: { ...KSD_ONLY_DETAIL.schedule, subscrStart: null, subscrEnd: null } }
    expect(ipoTimeline(detail)[0]).toEqual({ key: 'SUBSCRIBE', label: '청약', date: null, endDate: null })
  })
})

describe('ipoPriceText·ipoPriceBadge — 공모가 표기', () => {
  it('가격이 없으면 미정이고 배지도 없다', () => {
    expect(ipoPriceText(null)).toBe('미정')
    expect(ipoPriceBadge(null, 'PLANNED')).toBeNull()
  })

  it('신고서 예정가는 예정, 확정가는 확정', () => {
    expect(ipoPriceText(23000)).toBe('23,000원')
    expect(ipoPriceBadge(23000, 'PLANNED')).toBe('예정')
    expect(ipoPriceBadge(23000, 'CONFIRMED')).toBe('확정')
  })

  it('예정가 hint는 희망 공모가 범위가 아님을 밝힌다', () => {
    expect(PLANNED_PRICE_HINT).toBe('희망 공모가 범위가 아니라 증권신고서에 적힌 예정가입니다')
  })
})

describe('formatOfferingAmount·formatShareCount — 공모 금액·수량', () => {
  it('1억 이상은 억원, 1조 이상은 조원', () => {
    expect(formatOfferingAmount(46690000000)).toBe('467억원')
    expect(formatOfferingAmount(1234500000000)).toBe('1.2조원')
  })

  it('1억 미만은 0억이 아니라 만원으로', () => {
    expect(formatOfferingAmount(35557833)).toBe('3,556만원')
    expect(formatOfferingAmount(5000)).toBe('5,000원')
  })

  it('반올림으로 단위가 넘어가면 윗단위로 올린다', () => {
    expect(formatOfferingAmount(99995000)).toBe('1억원')
    expect(formatOfferingAmount(999960000000)).toBe('1.0조원')
  })

  it('수량은 주 단위 콤마', () => {
    expect(formatShareCount(2030000)).toBe('2,030,000주')
  })
})

describe('oldShareText — 구주매출 비중', () => {
  it('서버 비중이 있으면 그대로 %로', () => {
    expect(oldShareText({ sellers: [], oldShareRatio: 12.5 })).toBe('12.50%')
  })

  it('매출인이 없으면 전량 신주', () => {
    expect(oldShareText({ sellers: [], oldShareRatio: null })).toBe('없음 · 전량 신주')
  })

  it('매출인은 있는데 비중이 없으면 계산 불가, 신고서 연결이 없으면 미정', () => {
    expect(
      oldShareText({ sellers: [{ holder: '최대주주', relation: null, before: 100, sold: 10, after: 90 }], oldShareRatio: null }),
    ).toBe('—')
    expect(oldShareText({ sellers: null, oldShareRatio: null })).toBe('미정')
  })
})

describe('underwriterRoleLabel — 인수인 구분', () => {
  it('DART 구분값을 읽기 쉬운 이름으로, 모르는 값은 그대로', () => {
    expect(['대표', '공동', '인수', '주선'].map(underwriterRoleLabel)).toEqual(['대표 주관', '공동 주관', '인수', '주선'])
  })

  it('구분값이 없으면 —', () => {
    expect(underwriterRoleLabel(null)).toBe('—')
  })
})

describe('homepageUrl — 홈페이지 링크', () => {
  it('스킴이 없으면 http를 붙이고 있으면 그대로', () => {
    expect(homepageUrl('www.dongwonparts.co.kr')).toBe('http://www.dongwonparts.co.kr')
    expect(homepageUrl(' https://example.com ')).toBe('https://example.com')
    expect(homepageUrl('example.com:8080')).toBe('http://example.com:8080')
  })

  it('비었거나 웹이 아닌 스킴이면 링크를 만들지 않는다', () => {
    expect(homepageUrl(null)).toBeNull()
    expect(homepageUrl('  ')).toBeNull()
    expect(homepageUrl('javascript:alert(1)')).toBeNull()
  })
})

describe('ipoIntroSource — 기업 소개 출처', () => {
  it('DART_LLM은 증권신고서 AI 요약', () => {
    expect(ipoIntroSource('DART_LLM')).toEqual({ ai: true, label: '증권신고서 「사업의 내용」 요약', linkLabel: '증권신고서 원문' })
  })

  it('그 밖의 출처는 AI 표기 없이 기존 출처 이름', () => {
    expect(ipoIntroSource('NAVER')).toEqual({ ai: false, label: '네이버 금융 기업개요', linkLabel: '원문 공시' })
    expect(ipoIntroSource(null)).toEqual({ ai: false, label: null, linkLabel: '원문 공시' })
  })
})

describe('afterListingState·listedTicker — 상장 후 성과와 종목 상세 링크', () => {
  it('성과가 있으면 보이고 종목 상세로 갈 수 있다', () => {
    expect(afterListingState(KSD_ONLY_DETAIL)).toBe('show')
    expect(listedTicker(KSD_ONLY_DETAIL)).toBe('480370')
  })

  it('상장했는데 시세가 아직 없으면 안내만, 종목 상세 링크는 숨긴다', () => {
    const pending = { ...KSD_ONLY_DETAIL, afterListing: null }
    expect(afterListingState(pending)).toBe('pending')
    expect(listedTicker(pending)).toBeNull()
  })

  it('상장 전이면 섹션 자체가 없다', () => {
    expect(afterListingState(DONGWON_DETAIL)).toBe('hidden')
    expect(listedTicker(DONGWON_DETAIL)).toBeNull()
  })
})

describe('IPO_NOTICE — 출처 고지', () => {
  it('DART·예탁원 기준과 투자 판단 고지를 함께 단다', () => {
    expect(IPO_NOTICE).toBe(
      '공모 정보는 DART 증권신고서와 예탁원(KSD) 공모 일정 기준이며 정정 공시로 바뀔 수 있습니다. 참고용이며 투자 결과에 대한 책임은 지지 않습니다.',
    )
  })
})

describe('ipoHeaderCountdown — 모달 헤더의 남은 날', () => {
  it('보드 카드와 같은 문구로 청약까지 남은 날을 낸다', () => {
    expect(ipoHeaderCountdown(DONGWON_DETAIL, '2026-10-02')).toBe('청약 D-31')
    expect(ipoHeaderCountdown(DONGWON_DETAIL, '2026-11-01')).toBe('내일 청약')
  })

  it('청약 중이면 마감까지, 지난 공모나 청약일이 없으면 표시하지 않는다', () => {
    const subscribing = { ...DONGWON_DETAIL, status: 'SUBSCRIBING' as const }
    expect(ipoHeaderCountdown(subscribing, '2026-11-02')).toBe('마감 D-1')
    expect(ipoHeaderCountdown(subscribing, '2026-11-03')).toBe('오늘 마감')
    expect(ipoHeaderCountdown(KSD_ONLY_DETAIL, '2026-10-02')).toBeNull()
    const undated = { ...DONGWON_DETAIL, schedule: { ...DONGWON_DETAIL.schedule, subscrStart: null, subscrEnd: null } }
    expect(ipoHeaderCountdown(undated, '2026-10-02')).toBeNull()
  })
})

describe('putbackText — 환매청구권 값 표기', () => {
  it('숫자만 있는 행사 가격·부여 수량에 단위를 붙이고 숫자로 표시한다', () => {
    expect(putbackText('price', '14,760')).toEqual({ text: '14,760원', numeric: true })
    expect(putbackText('shares', '445,000')).toEqual({ text: '445,000주', numeric: true })
  })

  it('글이거나 이미 단위가 있으면 원문 그대로', () => {
    expect(putbackText('price', '공모가격의 90%')).toEqual({ text: '공모가격의 90%', numeric: false })
    expect(putbackText('shares', '445,000주')).toEqual({ text: '445,000주', numeric: false })
    expect(putbackText('period', '상장후 3개월까지')).toEqual({ text: '상장후 3개월까지', numeric: false })
  })
})

describe('fundUsesNotice — 자금 용도 안내', () => {
  it('서버가 원천 불일치로 숨기면 그 이유를 말한다', () => {
    expect(fundUsesNotice({ fundUses: [], fundUsesWithheld: true })).toBe(
      '증권신고서의 자금 용도 금액이 공모 총액과 맞지 않아 표시하지 않습니다.',
    )
  })

  it('항목이 없으면 없다고, 있으면 안내 없음', () => {
    expect(fundUsesNotice({ fundUses: [], fundUsesWithheld: false })).toBe('증권신고서에 금액이 적힌 자금 용도가 없습니다.')
    expect(fundUsesNotice({ fundUses: null, fundUsesWithheld: false })).toBe('증권신고서에 금액이 적힌 자금 용도가 없습니다.')
    expect(fundUsesNotice(DONGWON_DETAIL.offering)).toBeNull()
  })
})
