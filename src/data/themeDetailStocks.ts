import { getMarket, getMarketCap, getTradingValue, hashString } from '@/data/stockMeta'
import type { ThemeStock } from '@/data/types'
import { getThemeById } from '@/data/themes'

/** 시장·시가총액은 코드/주가에서 결정적으로 파생 (주식 목록과 동일 규칙) */
type BaseStock = Omit<ThemeStock, 'market' | 'marketCap'>

function withMeta(stock: BaseStock): ThemeStock {
  return {
    ...stock,
    market: getMarket(stock.code),
    marketCap: getMarketCap(stock.code, stock.price),
  }
}

// 테마 상세 관련 종목 (design-specs/theme-detail.md §3.5 — 철강 시안 전사 10행)
const STEEL_BASE: BaseStock[] = [
  { code: '039240', name: '키스트론', price: 6610, change: 5.25, tradingValue: 0, reason: '모회사인 고려제강 국내 철강 산업에서 강자로 자리잡음' },
  { code: '032280', name: '삼일', price: 1077, change: 3.36, tradingValue: 0, reason: '철강제품 물류사업 영위.' },
  { code: '060380', name: '동양에스텍', price: 1249, change: 0.97, tradingValue: 0, reason: '열연코일, 박판 및 후판제품 가공 및 판매' },
  { code: '069730', name: 'DSR제강', price: 5040, change: 0.8, tradingValue: 0, reason: '와이어로프(건설용, 수사업용, 유전시추용, 광업용 등) 및 경강선(각종 스프링용, 압연용, 벌목용 등) 등의 선재 전문 제조업체.' },
  { code: '104700', name: '한국철강', price: 8810, change: 0.69, tradingValue: 0, reason: 'KISCO홀딩스 그룹 계열의 철강업체. 건설, 조선, 단조업에 사용되는 철근, 단조강 등을 주요제품으로 생산, 판매.' },
  { code: '023440', name: '제이스코홀딩스', price: 521, change: 0, tradingValue: 0, reason: '건축자재용 연강선재, BIC이형철근, 보통철선을 제조 판매하는 철강재 제조 업체. 주력제품인 선재제품(Wire-Rod) 이외에 코일형 철근(Bar-in-coil)도 생산/판매중.' },
  { code: '049430', name: '코메론', price: 19260, change: -0.1, tradingValue: 0, reason: '압연사업(특수강, 스텐레스강) 등을 영위. 두께 0.08 ~ 4.0㎜, 폭 4 ~ 400㎜ 까지의 협폭 냉간압연을 생산하여 일부는 당사의 줄자 원재료로 공급하고 있으며, 자동차, 가전 등의 수요처로 내수판매중.' },
  { code: '012620', name: '원일특강', price: 6440, change: -0.46, tradingValue: 0, reason: '특수강 제조(절단, 가공) 및 판매를 주요사업으로 영위하는 종합 특수강업체. 자동차, 기계, 조선, 건설 등의 중요 핵심 부품에 사용되는 특수강을 주로 판매.' },
  { code: '017480', name: '삼현철강', price: 4440, change: -0.56, tradingValue: 0, reason: 'POSCO 열연판매점. POSCO에서 생산되는 열연제품과 후판 등을 매입하여 가공 및 판매하는 사업과 현대제철 형강지정 판매점으로 현대제철에서 생산되는 형강제품 유통사업을 영위. 조선, 교량, 건설중장비, 해양구조물 등에 사용되는 원자재를 도매로 판매.' },
  { code: '025890', name: '한국주강', price: 2150, change: -0.69, tradingValue: 0, reason: '주강사업 등 영위.' },
  // 11행 이후 — 더보기로 노출 (EXTRA 풀 기반 생성 데이터)
  { code: '048470', name: '대동스틸', price: 2415, change: -0.85, tradingValue: 0, reason: '철강 소재 가공 및 유통 사업 영위. 전방 수요 확대 국면에서 실적 레버리지가 큰 편.' },
  { code: '005160', name: '동국산업', price: 2155, change: -1.02, tradingValue: 0, reason: '냉연특수강 전문 제조업체. 자동차 부품용 냉연강판을 주력으로 생산.' },
  { code: '002220', name: '한일철강', price: 4330, change: -1.18, tradingValue: 0, reason: '철강재(열연, 후판) 가공 및 판매 사업 영위.' },
  { code: '002710', name: 'TCC스틸', price: 9600, change: -1.44, tradingValue: 0, reason: '석도강판 등 표면처리강판 전문 제조업체. 2차전지 소재용 니켈도금강판 사업 확대 중.' },
  { code: '053260', name: '금강철강', price: 4975, change: -1.6, tradingValue: 0, reason: 'POSCO 냉연코일 판매점으로 냉연제품 가공 및 판매 사업 영위.' },
]

export const steelDetailStocks: ThemeStock[] = STEEL_BASE.map(withMeta)

// 사유 템플릿 10종 (design-specs/theme-detail.md §3.6)
const REASONS = [
  '관련 핵심 부품을 공급하는 업체로, 국내 점유율 상위권을 유지 중.',
  '장비 설계·제조 사업을 영위. 전방 투자 재개 시 직접 수혜.',
  '소재 가공 및 유통 사업 영위. 전방 수요 확대 국면에서 실적 레버리지가 큰 편.',
  '신규 라인 증설을 발표하며 해당 사업 매출 비중이 빠르게 확대되고 있음.',
  '계열사를 통해 사업에 간접 진출, 지분법 이익으로 실적에 반영.',
  '전방 고객사에 부품을 납품하는 1차 협력사.',
  '관련 원천 특허를 보유해 로열티 매출이 발생.',
  '연구개발 자회사를 두고 정부 국책 과제에 참여 중이며, 상용화 일정은 내년 하반기.',
  '사업 다각화 차원에서 해당 분야에 진출, 수주 잔고가 늘고 있음.',
  '유지보수(MRO) 물량을 담당하는 서비스 사업자.',
]

/** 테마별 관련 종목 (철강은 시안 전사, 나머지는 테마 종목 + 생성 규칙) */
export function getThemeDetailStocks(themeId: string): ThemeStock[] {
  if (themeId === '철강') return steelDetailStocks

  const theme = getThemeById(themeId)
  if (!theme) return []

  return theme.stocks
    .map((stock, index) =>
      withMeta({
        code: stock.code,
        name: stock.name,
        price: stock.price,
        change: stock.change,
        tradingValue: getTradingValue(stock.name, stock.price),
        reason: `${theme.name} ${REASONS[(hashString(stock.name) + index) % REASONS.length]}`,
      }),
    )
    .sort((a, b) => b.change - a.change)
}
