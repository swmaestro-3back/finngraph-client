// 주식 상세 페이지 더미데이터 (design-specs/stock-detail.md)

import { getMarketCap, hashString } from '@/data/stockMeta'
import { formatAmount } from '@/lib/format'

export interface StockInfo {
  name: string
  code: string
  price: number
  change: number
  themeId: string
  themeName: string
}

export const DEFAULT_STOCK: StockInfo = {
  name: 'SK하이닉스',
  code: '000660',
  price: 9150,
  change: 1.67,
  themeId: '반도체',
  themeName: '반도체',
}

// 요약 스탯 8타일 (§1-5) — 종목 가격/재무 데이터 기반 파라미터화
export interface StatTile {
  label: string
  value: string
}

const EPS_2026E = 22080
const DPS_2026E = 1763

export function getStatTiles(stock: StockInfo, foreignRatio: number): StatTile[] {
  const per = stock.price / EPS_2026E
  const dividendYield = (DPS_2026E / stock.price) * 100

  return [
    // 주식 DB·테마 상세와 같은 값이 나오도록 공유 규칙 사용
    { label: '시가총액', value: `${formatAmount(getMarketCap(stock.code, stock.price))}억` },
    { label: 'PER', value: `${per.toFixed(2)}배` },
    { label: 'PBR', value: '2.35' },
    { label: 'ROE', value: '30.15%' },
    { label: 'EPS', value: `${EPS_2026E.toLocaleString('ko-KR')}원` },
    { label: '배당수익률', value: `${dividendYield.toFixed(2)}%` },
    { label: '외국인 보유율', value: `${foreignRatio.toFixed(1)}%` },
    { label: '전년 대비 매출', value: '+50.8%' },
  ]
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function tradingDayLabel(index: number, count: number): string {
  const base = new Date(2026, 6, 31)
  const d = new Date(base)
  d.setDate(base.getDate() - (count - 1 - index))
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// 투자자별 수급 (최근 40 거래일, §1-6)
export interface SupplyPoint {
  label: string
  foreignRatio: number
  foreignNet: number
  institutionNet: number
  pensionNet: number
}

export function generateSupplyDemand(code: string): SupplyPoint[] {
  const rand = mulberry32(hashString(`supply-${code}`))
  const count = 40
  let ratio = 51.5
  const points: SupplyPoint[] = []
  for (let i = 0; i < count; i++) {
    ratio += (rand() - 0.42) * 0.35
    points.push({
      label: tradingDayLabel(i, count),
      foreignRatio: Math.round(ratio * 100) / 100,
      foreignNet: Math.round((rand() - 0.42) * 180),
      institutionNet: Math.round((rand() - 0.5) * 120),
      pensionNet: Math.round((rand() - 0.48) * 60),
    })
  }
  return points
}

// 이슈 타임라인 (§1-4): 일별 호재/악재 뉴스
export interface IssueNews {
  kind: '호재' | '악재'
  title: string
  press: string
  time: string
}

export interface IssueDay {
  date: string
  good: number
  bad: number
  items: IssueNews[]
}

const GOOD_TITLES = [
  'HBM4 공급 계약 체결 임박 보도',
  '분기 영업이익 컨센서스 상회 전망',
  '외국계 증권사 목표주가 상향',
  '신규 팹 증설 투자 발표',
  'AI 서버 수요 급증에 수혜 전망',
  '주요 고객사와 장기 공급 계약',
]

const BAD_TITLES = [
  '메모리 현물가 단기 조정 우려',
  '경쟁사 증설로 공급 과잉 우려 제기',
  '환율 변동에 따른 수익성 부담',
  '일부 라인 가동률 하락 보도',
  '단기 급등에 따른 차익실현 매물',
]

const PRESS_POOL = ['한국경제', '매일경제', '연합뉴스', '머니투데이', '이데일리', '서울경제', '전자신문']

export function generateIssueTimeline(code: string, count: number): IssueDay[] {
  const rand = mulberry32(hashString(`issue-${code}`))
  const base = new Date(2026, 6, 31)
  const days: IssueDay[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() - (count - 1 - i))
    const total = Math.floor(rand() * 6)
    const good = Math.round(rand() * total)
    const bad = total - good
    const items: IssueNews[] = []
    for (let j = 0; j < total; j++) {
      const isGood = j < good
      const pool = isGood ? GOOD_TITLES : BAD_TITLES
      items.push({
        kind: isGood ? '호재' : '악재',
        title: pool[Math.floor(rand() * pool.length)],
        press: PRESS_POOL[Math.floor(rand() * PRESS_POOL.length)],
        time: `${String(9 + Math.floor(rand() * 7)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`,
      })
    }
    days.push({
      date: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`,
      good,
      bad,
      items,
    })
  }
  return days
}
