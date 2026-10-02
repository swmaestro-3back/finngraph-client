import { useMemo } from 'react'
import {
  SUPPLY_RANGES,
  type AnnualFinancials,
  type InvestorFlowRes,
  type StockDetailRes,
} from '@/lib/apiTypes'
import {
  changeColorClass,
  formatChange,
  formatChangeOrDash,
  formatCompactKrw,
  formatPrice,
} from '@/lib/format'
import { FIFTY_TWO_WEEKS, priceRange, type PriceRange } from '@/lib/priceRange'
import { rangeZone } from '@/lib/rangeZone'
import { useCandles } from '@/lib/queries/useCandles'
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
      .find((f) => !f.estimated && (f.operatingMargin !== null || f.debtRatio !== null)) ?? null
  )
}

/**
 * 외국인 보유율 행 — 현재 값과 기간별 증감. 증감은 수급 카드와 같이 그 기간 첫 거래일 대비이고,
 * 보유율끼리의 차이라 %가 아니라 %p다. 보유율이 비어 있는 날은 건너뛰고, 이력이 기간보다 짧으면 비운다.
 */
function foreignRatioRows(flows: InvestorFlowRes[], fallback: number | null): MetricRow[] {
  // 서버 응답 정렬을 신뢰하지 않고 날짜 오름차순으로 정규화
  const ratios = [...flows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((f) => (f.foreignRatio === null ? [] : [f.foreignRatio]))
  const latest = ratios.length > 0 ? ratios[ratios.length - 1] : fallback
  return [
    { label: '현재', value: fixed(latest, 2, '%') },
    // 1개월은 빼고 3개월부터 — 다른 칸과 같은 4행으로 맞춘다
    ...SUPPLY_RANGES.filter((r) => r.key !== '1M').map(({ label, limit }): MetricRow => {
      const change =
        ratios.length < limit ? null : ratios[ratios.length - 1] - ratios[ratios.length - limit]
      return { label, value: change === null ? DASH : `${formatChange(change)}p`, signed: change }
    }),
  ]
}

/** 52주 최저 ──●── 최고 — 데이터가 오기 전에도 같은 높이로 자리를 잡아 카드가 출렁이지 않게 한다 */
function RangeBar({ range }: { range: PriceRange | null }) {
  const pct = range ? range.position * 100 : 0
  const zone = rangeZone(range?.position ?? 0)
  return (
    <div className="mb-3 border-b border-surface-inset pb-3">
      <div className="flex items-center gap-3">
        <span className="w-8 shrink-0 text-xs text-muted-foreground">52주</span>
        <span className="font-mono text-xs font-medium text-foreground">
          {range ? formatPrice(range.low) : DASH}
        </span>
        <div
          role="img"
          aria-label={
            range ? `현재가가 52주 범위의 ${Math.round(pct)}% 위치` : '52주 범위 불러오는 중'
          }
          className="relative h-1.5 flex-1 rounded-full bg-surface-inset"
        >
          {range && (
            <>
              <div className={cn('h-full rounded-full', zone.fill)} style={{ width: `${pct}%` }} />
              <div
                className={cn(
                  'absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background',
                  zone.dot,
                )}
                style={{ left: `${pct}%` }}
              />
            </>
          )}
        </div>
        <span className="font-mono text-xs font-medium text-foreground">
          {range ? formatPrice(range.high) : DASH}
        </span>
      </div>
      <div className="mt-1 flex justify-between pl-11 text-caption text-muted-foreground">
        <span>
          최저 대비{' '}
          <span className="font-mono">{range ? formatChange(range.fromLow) : DASH}</span>
        </span>
        <span>
          최고 대비{' '}
          <span className="font-mono">{range ? formatChange(range.fromHigh) : DASH}</span>
        </span>
      </div>
    </div>
  )
}

export function StockMetricsCard({
  stock,
  financials,
  flows,
}: {
  stock: StockDetailRes
  financials: AnnualFinancials[] | null
  /** 수급 차트가 받아 둔 일별 수급(최대 기간) — 외국인 보유율 증감에 쓴다 */
  flows: InvestorFlowRes[] | null
}) {
  // 기간 수익률은 상세 API에 없어 전종목 목록 캐시에서 가져온다
  const row = useStockIndex()?.get(stock.ticker) ?? null
  const fin = useMemo(() => latestReported(financials ?? []), [financials])
  // 차트의 기간 토글과 무관하게 늘 52주를 봐야 해서 따로 받는다
  // 종목 전환 직후 useApi가 이전 종목 캔들을 유지하므로, 로딩 중에는 범위를 만들지 않는다
  const { data: weekly, loading: weeklyLoading } = useCandles(stock.ticker, 'W', FIFTY_TWO_WEEKS)
  const range = useMemo(
    () => (weeklyLoading ? null : priceRange(weekly ?? [], stock.price)),
    [weekly, weeklyLoading, stock.price],
  )
  const finYear = fin ? ` (${fin.year})` : ''
  const ratioRows = useMemo(
    () => foreignRatioRows(flows ?? [], stock.foreignRatio),
    [flows, stock.foreignRatio],
  )

  // 2열 기준 배치 — 위: 수익성·재무 | 규모·수익률, 아래: 가치평가 | 외국인 보유율
  const groups: MetricGroup[] = [
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
    { title: '외국인 보유율·증감', rows: ratioRows },
  ]

  return (
    <section className="card-surface @container p-4">
      <h2 className="mb-2 text-sm font-semibold text-foreground">투자 지표</h2>
      <RangeBar range={range} />
      {/* 열 수는 화면이 아니라 카드 폭으로 정한다 — 반폭이면 2열, 테마 비교 없이 전체 폭이면 4열 */}
      <div className="grid gap-x-6 gap-y-3 @[22rem]:grid-cols-2 @3xl:grid-cols-4">
        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-0.5 text-caption text-muted-foreground">{group.title}</h3>
            {group.rows.map((r) => (
              <div
                key={r.label}
                className="flex items-baseline justify-between gap-2 border-b border-surface-inset py-[3px] last:border-b-0"
              >
                <span className="text-xs text-muted-foreground">{r.label}</span>
                <span
                  className={cn(
                    'font-mono text-xs font-medium text-foreground',
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
