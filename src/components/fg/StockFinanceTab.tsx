import { ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { Button } from '@/components/fg/Button'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { FinanceTable, TABLE_TITLE_ID } from '@/components/fg/FinanceTable'
import { FLOW_TITLE_ID, InvestorFlowChart } from '@/components/fg/InvestorFlowChart'
import { RESULTS_TITLE_ID, ResultsChart } from '@/components/fg/ResultsChart'
import { RetryText } from '@/components/fg/RetryText'
import type { TabOption } from '@/components/fg/SegmentedTabs'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { StockContractList } from '@/components/fg/StockContractList'
import type { CandleRes, StockDetailRes } from '@/lib/apiTypes'
import {
  annualPoints,
  financeSummary,
  financeTable,
  quarterPoints,
  shownAnnual,
  summaryBasis,
  type ResultPeriod,
  type SummaryTarget,
  type SummaryTile,
} from '@/lib/fg/financials'
import { flowDays, foreignSummary, FLOW_FETCH_DAYS } from '@/lib/fg/investorFlows'
import { motionAllowed } from '@/lib/fg/motion'
import { contractItems, contractsCaption, CONTRACT_FETCH_LIMIT } from '@/lib/fg/stockContracts'
import { useDelayed } from '@/lib/fg/useDelayed'
import type { ApiState } from '@/lib/queries/useApi'
import { useAnnualFinancials } from '@/lib/queries/useFinancials'
import { useInvestorFlows } from '@/lib/queries/useInvestorFlows'
import { useStockContracts } from '@/lib/queries/useStockContracts'
import { calcSupplyStreaks } from '@/lib/supplyStreak'
import { useGap } from '@/lib/useGap'
import { cn } from '@/lib/utils'

const loadFinanceGap = import.meta.env.DEV
  ? () => import('@/dev/fixtures/stockFinance').then((m) => m.financeGapFixture)
  : null

const SUMMARY_TITLE_ID = 'fg-sf-sum'
const CONTRACTS_TITLE_ID = 'fg-sfc-title'

const TARGET_IDS: Record<SummaryTarget, string> = {
  results: RESULTS_TITLE_ID,
  flow: FLOW_TITLE_ID,
  table: TABLE_TITLE_ID,
}

const RESULT_PERIODS: readonly TabOption<ResultPeriod>[] = [
  { value: 'quarter', label: '분기' },
  { value: 'annual', label: '연간' },
]

interface StockFinanceTabProps {
  stock: StockDetailRes
  candles: CandleRes[] | null
  today: string
  refreshKey: number
}

function goTo(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const el = document.getElementById(id)
  if (!el) return
  event.preventDefault()
  el.scrollIntoView({ behavior: motionAllowed() ? 'smooth' : 'auto', block: 'start' })
  el.focus({ preventScroll: true })
}

function settled<T>(state: ApiState<T>): boolean {
  return state.data !== null || state.error !== null
}

interface SectionHeadProps {
  id: string
  title: string
  sub?: ReactNode
  anchor?: boolean
}

function SectionHead({ id, title, sub, anchor = false }: SectionHeadProps) {
  return (
    <div className="fg-sf__heading">
      <h2 id={id} className={cn('fg-section__title', anchor && 'fg-sf__anchor')} tabIndex={anchor ? -1 : undefined}>
        {title}
      </h2>
      {sub && <p className="fg-section__sub">{sub}</p>}
    </div>
  )
}

function LoadError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <StateBlock
      kind="error"
      title={title}
      description="잠시 후 다시 시도해 주세요"
      action={
        <Button size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      }
    />
  )
}

interface SummaryRetry {
  finance: () => void
  flows: () => void
}

function SummaryTiles({ tiles, retry }: { tiles: readonly SummaryTile[]; retry: SummaryRetry }) {
  return (
    <ul className="fg-fsum">
      {tiles.map((tile) => (
        <li key={tile.key}>
          {tile.failed ? (
            <div className="fg-fsum__box">
              <span className="fg-fsum__k">
                <span>{tile.label}</span>
              </span>
              <span className="fg-fsum__fail">불러오지 못했어요</span>
              <RetryText subject={tile.label} onRetry={tile.key === 'foreign' ? retry.flows : retry.finance} />
            </div>
          ) : (
            <a href={`#${TARGET_IDS[tile.target]}`} onClick={(event) => goTo(event, TARGET_IDS[tile.target])}>
              <span className="fg-fsum__k">
                <span>{tile.label}</span>
                <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className={cn('fg-fsum__v fg-num', tile.tone && `fg-${tile.tone}`)}>{tile.value}</span>
              {tile.note && <span className="fg-fsum__n fg-num">{tile.note}</span>}
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}

function Section({ id, title, anchor, children }: { id: string; title: string; anchor?: boolean; children: ReactNode }) {
  return (
    <section className="fg-section" aria-labelledby={id}>
      <SectionHead id={id} title={title} anchor={anchor} />
      {children}
    </section>
  )
}

export function StockFinanceTab({ stock, candles, today, refreshKey }: StockFinanceTabProps) {
  const financials = useAnnualFinancials(stock.ticker)
  const flows = useInvestorFlows(stock.ticker, FLOW_FETCH_DAYS)
  const contracts = useStockContracts(stock.ticker, CONTRACT_FETCH_LIMIT)
  const gap = useGap('financials-quarter', loadFinanceGap)
  const fixture = gap.status === 'mock' ? gap.data : null
  const [period, setPeriod] = useState<ResultPeriod>('annual')
  const refYear = Number(today.slice(0, 4))

  const { refresh: refreshFlows } = flows
  useEffect(() => {
    if (refreshKey === 0) return
    refreshFlows()
  }, [refreshKey, refreshFlows])

  const rows = financials.data
  const tradingDays = useMemo(() => candles?.map((candle) => candle.date), [candles])
  const days = useMemo(() => flowDays(flows.data ?? [], candles), [flows.data, candles])
  const streaks = useMemo(() => calcSupplyStreaks(flows.data ?? [], tradingDays), [flows.data, tradingDays])
  const annual = useMemo(() => annualPoints(rows ?? []), [rows])
  const quarters = useMemo(() => (fixture ? quarterPoints(fixture.quarters) : null), [fixture])
  const table = useMemo(() => financeTable(rows ?? [], fixture), [rows, fixture])
  const items = useMemo(() => contractItems(contracts.data ?? [], today), [contracts.data, today])

  const finWaiting = useDelayed(!settled(financials))
  const flowWaiting = useDelayed(!settled(flows))
  const contractWaiting = useDelayed(!settled(contracts))
  const hasFinance = (rows ?? []).length > 0
  const quarterly = period === 'quarter' && quarters !== null
  const latestYear = hasFinance && table.years.length > 0 ? table.years[table.years.length - 1] : null
  const lastFlow = days.length > 0 ? days[days.length - 1].date : null

  const financeFailed = rows === null && financials.error !== null
  const flowsFailed = flows.data === null && flows.error !== null
  const summaryRetry = { finance: financials.refetch, flows: flows.refetch }
  let summary: ReactNode
  if (!settled(financials) || !settled(flows)) summary = finWaiting || flowWaiting ? <Skeleton height={104} /> : null
  else if (financeFailed && flowsFailed)
    summary = (
      <LoadError
        title="한눈에 보기를 불러오지 못했어요"
        onRetry={() => {
          financials.refetch()
          flows.refetch()
        }}
      />
    )
  else if (!financeFailed && !flowsFailed && !hasFinance && days.length === 0)
    summary = <StateBlock kind="empty" title="아직 볼 실적·수급이 없어요" description="사업보고서와 장 마감 집계가 쌓이면 보여 드려요" />
  else
    summary = (
      <SummaryTiles
        tiles={financeSummary(rows ?? [], foreignSummary(days, streaks), { finance: financeFailed, flows: flowsFailed })}
        retry={summaryRetry}
      />
    )

  let results: ReactNode
  if (rows === null)
    results = (
      <Section id={RESULTS_TITLE_ID} title="실적" anchor>
        {financials.error ? (
          <LoadError title="실적을 불러오지 못했어요" onRetry={financials.refetch} />
        ) : (
          finWaiting && <Skeleton height={300} />
        )}
      </Section>
    )
  else if (!hasFinance && !quarterly)
    results = (
      <Section id={RESULTS_TITLE_ID} title="실적" anchor>
        <StateBlock kind="empty" title="실적 정보가 없어요" description="사업보고서가 나오면 보여 드려요" />
      </Section>
    )
  else
    results = (
      <ResultsChart
        shown={quarterly ? quarters : shownAnnual(annual)}
        all={quarterly ? quarters : annual}
        period={quarterly ? 'quarter' : 'annual'}
        periods={quarters ? RESULT_PERIODS : null}
        mock={quarterly}
        onPeriod={setPeriod}
      />
    )

  let flowPart: ReactNode
  if (flows.data === null)
    flowPart = (
      <Section id={FLOW_TITLE_ID} title="투자자별 매매" anchor>
        {flows.error ? (
          <LoadError title="투자자별 매매를 불러오지 못했어요" onRetry={flows.refetch} />
        ) : (
          flowWaiting && <Skeleton height={520} />
        )}
      </Section>
    )
  else if (days.length === 0)
    flowPart = (
      <Section id={FLOW_TITLE_ID} title="투자자별 매매" anchor>
        <StateBlock kind="empty" title="투자자별 매매 정보가 없어요" description="장 마감 집계가 쌓이면 보여 드려요" />
      </Section>
    )
  else flowPart = <InvestorFlowChart days={days} streaks={streaks} />

  let tableBody: ReactNode
  if (rows === null)
    tableBody = financials.error ? (
      <LoadError title="재무 지표를 불러오지 못했어요" onRetry={financials.refetch} />
    ) : (
      finWaiting && <Skeleton height={480} />
    )
  else if (!hasFinance) tableBody = <StateBlock kind="empty" title="재무 지표가 없어요" description="사업보고서가 나오면 보여 드려요" />
  else tableBody = <FinanceTable table={table} mock={fixture !== null} />

  let contractBody: ReactNode
  if (contracts.data === null)
    contractBody = contracts.error ? (
      <LoadError title="공급계약을 불러오지 못했어요" onRetry={contracts.refetch} />
    ) : (
      contractWaiting && <Skeleton height={240} />
    )
  else if (items.length === 0)
    contractBody = <StateBlock kind="empty" title="최근 1년 공급계약 공시가 없어요" description="단일판매·공급계약 공시가 나오면 보여 드려요" />
  else contractBody = <StockContractList items={items} />

  return (
    <div className="fg-grid fg-reveal">
      <div className="fg-col">
        <section className="fg-section" aria-labelledby={SUMMARY_TITLE_ID}>
          <SectionHead id={SUMMARY_TITLE_ID} title="한눈에 보기" sub={summaryBasis(latestYear, lastFlow, refYear)} />
          {summary}
        </section>
        {results}
        {flowPart}
        <section className="fg-section" aria-labelledby={TABLE_TITLE_ID}>
          <SectionHead
            id={TABLE_TITLE_ID}
            title="재무 지표"
            sub="연간 사업보고서 기준이에요 · PER·PBR은 개요의 핵심 지표에서 현재가로 계산해 보여 줘요"
            anchor
          />
          {tableBody}
        </section>
      </div>
      <aside className="fg-rail" aria-label="공급계약">
        <section className="fg-section fg-sfc fg-rail__wide" aria-labelledby={CONTRACTS_TITLE_ID}>
          <div className="fg-sfc__head">
            <h2 id={CONTRACTS_TITLE_ID} className="fg-section__title">
              공급계약
            </h2>
            <span className="fg-sfc__cap">{contractsCaption(items.length)}</span>
          </div>
          {contractBody}
        </section>
        <Disclaimer />
      </aside>
    </div>
  )
}
