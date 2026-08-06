// 주식 DB 리스트 — 전체 테마의 종목을 코드 기준으로 중복 제거해 구성
// 시가총액은 주식 상세 스탯 타일과 동일한 발행주식수 공식 사용(코드 해시), 나머지 지표는 결정적 해시 생성

import { getMarket, getMarketCap, hashString, type Market } from '@/data/stockMeta'
import { themes } from '@/data/themes'

export interface StockListRow {
  code: string
  name: string
  market: Market
  price: number
  change: number
  w1: number
  m1: number
  m3: number
  marketCap: number // 억 단위
  per: number
  pbr: number
  roe: number
  dividendYield: number
  themeId: string
  themeName: string
}

/** 전일 등락률과 같은 방향으로 기울되 기간이 길수록 진폭이 커지도록 생성 (themePerformance와 동일 방식) */
function periodReturn(code: string, change: number, seed: string, scale: number): number {
  const noise = ((hashString(`${code}-${seed}`) % 2001) / 1000 - 1) * scale
  return Math.round((change * scale * 0.6 + noise) * 100) / 100
}

function buildRows(): StockListRow[] {
  const seen = new Set<string>()
  const rows: StockListRow[] = []

  for (const theme of themes) {
    for (const stock of theme.stocks) {
      if (seen.has(stock.code)) continue
      seen.add(stock.code)

      rows.push({
        code: stock.code,
        name: stock.name,
        market: getMarket(stock.code),
        price: stock.price,
        change: stock.change,
        w1: periodReturn(stock.code, stock.change, 'w1', 2.2),
        m1: periodReturn(stock.code, stock.change, 'm1', 5.5),
        m3: periodReturn(stock.code, stock.change, 'm3', 11),
        marketCap: getMarketCap(stock.code, stock.price),
        per: Math.round((5 + (hashString(`${stock.code}-per`) % 4200) / 100) * 100) / 100,
        pbr: Math.round((0.5 + (hashString(`${stock.code}-pbr`) % 550) / 100) * 100) / 100,
        roe: Math.round((-5 + (hashString(`${stock.code}-roe`) % 310) / 10) * 10) / 10,
        dividendYield:
          Math.round((0.1 + (hashString(`${stock.code}-div`) % 490) / 100) * 100) / 100,
        themeId: theme.id,
        themeName: theme.name,
      })
    }
  }
  return rows
}

export const stockListRows: StockListRow[] = buildRows()
