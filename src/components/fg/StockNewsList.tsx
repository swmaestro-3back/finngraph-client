import { ChevronRight, ExternalLink, Lock } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Badge } from '@/components/fg/Badge'
import { Button } from '@/components/fg/Button'
import { FilterChip } from '@/components/fg/FilterChip'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import type { CandleRes } from '@/lib/apiTypes'
import { formatChange } from '@/lib/format'
import { toneClass } from '@/lib/fg/format'
import { newsDays, opensInModal } from '@/lib/fg/stockNews'
import {
  defaultRange,
  guestStart,
  NEWS_RANGES,
  newsListView,
  toThemeNews,
  type NewsRange,
  type NewsRow,
} from '@/lib/fg/themeNews'
import { useDelayed } from '@/lib/fg/useDelayed'
import { josa } from '@/lib/josa'
import { useMemberGate } from '@/lib/memberGate'
import { useStockNews } from '@/lib/queries/useStockNews'

const GATE_SUBJECT = '지난 뉴스'

function NewsLine({ row, onOpen }: { row: NewsRow; onOpen: (id: string) => void }) {
  const { item } = row
  const text = (
    <span className="fg-tnw__body">
      <span className="fg-tnw__title">{item.title}</span>
      <span className="fg-tnw__meta fg-num">
        {item.analyzed && <Badge>분석</Badge>}
        <span>{row.meta}</span>
      </span>
    </span>
  )
  if (opensInModal(item)) {
    return (
      <button type="button" className="fg-tnw__row" aria-haspopup="dialog" onClick={() => onOpen(item.id)}>
        {text}
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
    )
  }
  return (
    <a className="fg-tnw__row" href={item.url} target="_blank" rel="noopener noreferrer">
      {text}
      <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />
    </a>
  )
}

interface StockNewsListProps {
  ticker: string
  candles: readonly CandleRes[] | null
  today: string
  refreshKey: number
  onOpenNews: (id: string) => void
}

export function StockNewsList({ ticker, candles, today, refreshKey, onOpenNews }: StockNewsListProps) {
  const news = useStockNews(ticker)
  const { locked, pending, promptLogin } = useMemberGate()
  const [rangePick, setRangePick] = useState<NewsRange | null>(null)
  const [onlyAnalyzed, setOnlyAnalyzed] = useState(false)
  const [page, setPage] = useState(1)

  const { refresh } = news
  useEffect(() => {
    if (refreshKey > 0) refresh()
  }, [refreshKey, refresh])

  const all = useMemo(() => candles ?? [], [candles])
  const items = useMemo(() => toThemeNews(news.data ?? [], all.map((c) => c.date)), [news.data, all])
  const dayChange = useMemo(() => new Map(newsDays(items, all).map((day) => [day.tradeDay, day.change])), [items, all])
  const openFrom = locked || pending ? guestStart(today) : null
  const range = rangePick ?? defaultRange(items, today)
  const view = newsListView({ items, selected: null, range, onlyAnalyzed, page, openFrom, today })
  const waiting = useDelayed(news.data === null && news.error === null)
  const none = view.empty === 'none'

  const pickRange = (next: NewsRange) => {
    setRangePick(next)
    setPage(1)
  }
  const toggleAnalyzed = () => {
    setOnlyAnalyzed((on) => !on)
    setPage(1)
  }

  let body: ReactNode
  if (news.error && news.data === null) {
    body = (
      <StateBlock
        kind="error"
        title="뉴스를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={news.refetch}>
            다시 시도
          </Button>
        }
      />
    )
  } else if (news.data === null) {
    body = (
      <div className="fg-snews__wait" aria-hidden="true">
        {waiting && (
          <>
            <Skeleton height={32} width={320} shape="chip" />
            <Skeleton height={56} />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </>
        )}
      </div>
    )
  } else {
    body = (
      <>
        {!none && (
          <div className="fg-tnw__tools fg-snews__tools">
            <div className="fg-tnw__chips" role="group" aria-label="뉴스 기간">
              {NEWS_RANGES.map(({ value, label }) => (
                <FilterChip key={value} pressed={range === value} onClick={() => pickRange(value)}>
                  {label}
                </FilterChip>
              ))}
            </div>
            <FilterChip pressed={onlyAnalyzed} count={view.analyzedCount} onClick={toggleAnalyzed}>
              분석만
            </FilterChip>
          </div>
        )}
        {view.groups.length > 0 && (
          <ol className="fg-tnw__groups" aria-label={`${view.scope} 이 종목 뉴스, 거래일별 최신순`}>
            {view.groups.map((group) => {
              const change = dayChange.get(group.tradeDay) ?? null
              return (
                <li key={group.tradeDay}>
                  <h3 className="fg-tnw__day fg-num">
                    {group.label}
                    <span>· {group.total}건</span>
                    {change !== null && (
                      <span className="fg-snews__dchg">
                        이 날 <b className={toneClass(change)}>{formatChange(change)}</b>
                      </span>
                    )}
                  </h3>
                  <ul className="fg-tnw__list">
                    {group.rows.map((row) => (
                      <li key={row.item.id}>
                        <NewsLine row={row} onOpen={onOpenNews} />
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ol>
        )}
        {none && (
          <StateBlock
            kind="empty"
            title="아직 이 종목이 나온 뉴스가 없어요"
            description="새 뉴스가 나오면 여기에 바로 보여 드려요"
          />
        )}
        {view.empty === 'no-match' && (
          <StateBlock kind="empty" title="조건에 맞는 뉴스가 없어요" description="‘분석만’을 끄거나 다른 기간을 골라 보세요" />
        )}
        {view.more > 0 && (
          <Button className="fg-snews__more" onClick={() => setPage((p) => p + 1)}>
            {`뉴스 ${view.more}건 더 보기`}
          </Button>
        )}
        {view.gated && (
          <div className="fg-tnw__gate">
            <span className="fg-tnw__lock" aria-hidden="true">
              <Lock size={20} strokeWidth={1.75} />
            </span>
            <span className="fg-tnw__gtxt">
              <b>{`${GATE_SUBJECT}${josa(GATE_SUBJECT, '은/는')} 로그인하면 볼 수 있어요`}</b>
              <span>최근 7일 뉴스만 열려 있어요</span>
            </span>
            <Button variant="primary" className="fg-tnw__login" onClick={promptLogin}>
              로그인
            </Button>
          </div>
        )}
        {!none && (
          <p className="fg-sev__note">
            ‘분석’은 Finngraph가 기사에서 기업 사이 관계를 뽑아낸 뉴스예요 · 분석 뉴스는 요약 창으로, 나머지는 매체 원문으로
            가요
          </p>
        )}
      </>
    )
  }

  return (
    <section className="fg-section fg-snews" aria-labelledby="fg-snews-title">
      <div className="fg-snews__head">
        <div className="fg-sev__titles">
          <h2 id="fg-snews-title" className="fg-section__title">
            이 종목이 나온 뉴스
          </h2>
          <p className="fg-section__sub">최근 뉴스를 거래일별로 묶었어요 · 주말·휴장일 기사는 다음 거래일에 들어가요</p>
        </div>
        {news.data !== null && !none && <span className="fg-snews__count fg-num">{view.countText}</span>}
      </div>
      {body}
    </section>
  )
}
