import { useMemo } from 'react'
import type { AnnualFinancials, StockDetailRes } from '@/lib/apiTypes'
import { changeColorClass, formatChangeOrDash, formatCompactKrw } from '@/lib/format'
import { useStockIndex } from '@/lib/queries/useStocksCached'
import { cn } from '@/lib/utils'

interface MetricRow {
  label: string
  value: string
  /** 등락처럼 부호에 따라 색을 입히는 값 */
  signed?: number | null
}

interface MetricGroup {
  title: string
  rows: MetricRow[]
}

const DASH = '—'

function fixed(value: number | null, digits: number, suffix = ''): string {
  return value === null ? DASH : `${value.toFixed(digits)}${suffix}`
}

function won(value: number | null): string {
  return value === null ? DASH : `${Math.round(value).toLocaleString('ko-KR')}원`
}

function signedRow(label: string, value: number | null): MetricRow {
  return { label, value: formatChangeOrDash(value), signed: value }
}

/** BPS = 현재가 ÷ PBR — 상세 API에 BPS가 없어 계산한다 */
function bps(price: number | null, pbr: number | null): number | null {
  return price === null || pbr === null || pbr === 0 ? null : price / pbr
}

/**
 * 재무 파생 지표의 기준 연도 행 — 추정치(E)를 빼고, 아래 지표가 하나라도 있는 가장 최근 연도.
 * 지표마다 다른 연도를 섞어 쓰지 않도록 한 행으로 고정한다.
 */
function latestReported(rows: AnnualFinancials[]): AnnualFinancials | null {
  return (
    [...rows]
      .sort((a, b) => b.year - a.year)
      .find(
        (f) =>
          !f.estimated &&
          [f.operatingMargin, f.debtRatio, f.dps, f.payoutRatio].some((v) => v !== null),
      ) ?? null
  )
}

export function StockMetricsCard({
  stock,
  financials,
}: {
  stock: StockDetailRes
  financials: AnnualFinancials[] | null
}) {
  // 기간 수익률은 상세 API에 없어 전종목 목록 캐시에서 가져온다
  const row = useStockIndex()?.get(stock.ticker) ?? null
  const fin = useMemo(() => latestReported(financials ?? []), [financials])
  const finYear = fin ? ` (${fin.year})` : ''

  const groups: MetricGroup[] = [
    {
      title: '규모·수익률',
      rows: [
        { label: '시가총액', value: formatCompactKrw(stock.marketCap) },
        signedRow('1주', row?.w1 ?? null),
        signedRow('1개월', row?.m1 ?? null),
        signedRow('3개월', row?.m3 ?? null),
      ],
    },
    {
      title: '가치평가',
      rows: [
        { label: 'PER', value: fixed(stock.per, 2, '배') },
        { label: 'PBR', value: fixed(stock.pbr, 2) },
        { label: 'EPS', value: won(stock.eps) },
        { label: 'BPS', value: won(bps(stock.price, stock.pbr)) },
      ],
    },
    {
      title: `수익성·재무${finYear}`,
      rows: [
        { label: 'ROE', value: fixed(stock.roe, 2, '%') },
        { label: '영업이익률', value: fixed(fin?.operatingMargin ?? null, 1, '%') },
        { label: '부채비율', value: fixed(fin?.debtRatio ?? null, 1, '%') },
        signedRow('전년 대비 매출', stock.revenueGrowth),
      ],
    },
    {
      title: `배당·지분${finYear}`,
      rows: [
        { label: '배당수익률', value: fixed(stock.dividendYield, 2, '%') },
        { label: 'DPS', value: won(fin?.dps ?? null) },
        { label: '배당성향', value: fixed(fin?.payoutRatio ?? null, 1, '%') },
        { label: '외국인 보유율', value: fixed(stock.foreignRatio, 1, '%') },
      ],
    },
  ]

  return (
    <section className="card-surface @container p-4">
      <h2 className="mb-2 text-body font-semibold text-foreground">투자 지표</h2>
      {/* 열 수는 화면이 아니라 카드 폭으로 정한다 — 반폭이면 2열, 테마 비교 없이 전체 폭이면 4열 */}
      <div className="grid gap-x-6 gap-y-3 @[22rem]:grid-cols-2 @3xl:grid-cols-4">
        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-0.5 text-micro text-muted-foreground">{group.title}</h3>
            {group.rows.map((r) => (
              <div
                key={r.label}
                className="flex items-baseline justify-between gap-2 border-b border-surface-inset py-[3px] last:border-b-0"
              >
                <span className="text-caption text-muted-foreground">{r.label}</span>
                <span
                  className={cn(
                    'font-mono text-caption font-medium text-foreground',
                    r.signed != null && changeColorClass(r.signed),
                  )}
                >
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
