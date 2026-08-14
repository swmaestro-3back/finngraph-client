// 주식 상세 페이지 더미데이터 (design-specs/stock-detail.md)

import type { CandleDate } from '@/data/candles'
import { toNewsItem, type NewsItem } from '@/data/news'
import { listNews } from '@/data/newsDetail'
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
    // 주식 목록·테마 상세와 같은 값이 나오도록 공유 규칙 사용
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

// 이슈 타임라인 (§1-4): 캔들과 같은 축 위의 호재/악재 뉴스
// (docs/superpowers/specs/2026-08-14-issue-timeline-design.md)

export type IssueKind = '호재' | '악재'

/** 뉴스 한 줄 + 그 뉴스의 성격 — id가 있으므로 뉴스 상세 모달로 그대로 이어진다 */
export interface IssueNews extends NewsItem {
  kind: IssueKind
}

/** 축 한 칸 = 하루(일봉) / 한 주(주봉) / 한 달(월봉) */
export interface IssueDay {
  /** 캔들과 동일한 축 라벨 */
  label: string
  /** 패널 제목용 전체 날짜 */
  date: string
  good: number
  bad: number
  items: IssueNews[]
}

/**
 * 뉴스의 호재/악재 판정 — **가정된 값이다**.
 * 목업 뉴스 테이블(NewsDetail)에 감성 필드가 없어 id 해시로 결정적으로 부여한다.
 * 백엔드가 감성을 내려주면 이 함수만 그 값을 읽도록 바꾸면 된다.
 */
function issueKind(newsId: string): IssueKind {
  return hashString(`sentiment-${newsId}`) % 5 < 3 ? '호재' : '악재'
}

/**
 * 종목의 이슈 타임라인 — 축 날짜를 그대로 받아 그 칸에 실제 뉴스를 결정적으로 배분한다.
 * 캔들과 버킷 개수·라벨이 정의상 같아지므로 두 차트가 세로로 정렬된다.
 */
export function generateIssueTimeline(code: string, dates: CandleDate[]): IssueDay[] {
  const all = listNews()
  const rand = mulberry32(hashString(`issue-${code}`))
  let cursor = hashString(code) % Math.max(all.length, 1)

  return dates.map(({ label, date }) => {
    const total = all.length === 0 ? 0 : Math.floor(rand() * 6)
    // 호재를 위로 모아 패널에서도 막대와 같은 순서로 읽힌다
    const goodItems: IssueNews[] = []
    const badItems: IssueNews[] = []
    for (let j = 0; j < total; j++) {
      const news = all[cursor % all.length]
      cursor++
      const item = { ...toNewsItem(news), kind: issueKind(news.id) }
      ;(item.kind === '호재' ? goodItems : badItems).push(item)
    }
    return {
      label,
      date,
      good: goodItems.length,
      bad: badItems.length,
      items: [...goodItems, ...badItems],
    }
  })
}
