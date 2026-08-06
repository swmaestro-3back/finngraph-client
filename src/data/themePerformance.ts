// 테마 DB 기간별 수익률 — 테마 id 해시 기반 더미값 (실제 수익률 아님)
// change(전일)는 themes.ts의 값 사용, 여기는 1주/1개월/3개월 + 종목수

import { themes } from '@/data/themes'

export interface ThemePerformance {
  w1: number
  m1: number
  m3: number
  stockCount: number
}

function hashString(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** 전일 등락률과 같은 방향으로 기울되 기간이 길수록 진폭이 커지도록 생성 */
function periodReturn(id: string, change: number, seed: string, scale: number): number {
  const noise = ((hashString(`${id}-${seed}`) % 2001) / 1000 - 1) * scale
  return Math.round((change * scale * 0.6 + noise) * 100) / 100
}

function buildPerformance(): Record<string, ThemePerformance> {
  const map: Record<string, ThemePerformance> = {}
  for (const theme of themes) {
    map[theme.id] = {
      w1: periodReturn(theme.id, theme.change, 'w1', 2.2),
      m1: periodReturn(theme.id, theme.change, 'm1', 5.5),
      m3: periodReturn(theme.id, theme.change, 'm3', 11),
      stockCount: theme.stocks.length,
    }
  }
  return map
}

export const themePerformance: Record<string, ThemePerformance> = buildPerformance()
