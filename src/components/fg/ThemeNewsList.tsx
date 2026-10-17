import { ChevronRight, ExternalLink, Lock, X } from 'lucide-react'
import { Badge } from '@/components/fg/Badge'
import { Button } from '@/components/fg/Button'
import { FilterChip } from '@/components/fg/FilterChip'
import { StateBlock } from '@/components/fg/StateBlock'
import { josa } from '@/lib/josa'
import { NEWS_RANGES, type NewsListView, type NewsMarker, type NewsRange, type NewsRow } from '@/lib/fg/themeNews'

const GATE_SUBJECT = '지난 뉴스'

interface ThemeNewsListProps {
  view: NewsListView
  range: NewsRange
  onlyAnalyzed: boolean
  selected: NewsMarker | null
  selectedCount: number
  onRange: (range: NewsRange) => void
  onToggleAnalyzed: () => void
  onClearSelected: () => void
  onMore: () => void
  onLogin: () => void
  onOpenNews: (id: string) => void
}

function NewsLine({ row, onOpen }: { row: NewsRow; onOpen: (id: string) => void }) {
  const text = (
    <span className="fg-tnw__body">
      <span className="fg-tnw__title">{row.item.title}</span>
      <span className="fg-tnw__meta fg-num">
        {row.item.analyzed && <Badge>분석</Badge>}
        <span>{row.meta}</span>
      </span>
    </span>
  )
  if (row.item.analyzed) {
    return (
      <button type="button" className="fg-tnw__row" onClick={() => onOpen(row.item.id)}>
        {text}
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
    )
  }
  const body = (
    <>
      {text}
      {row.item.url && <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />}
    </>
  )
  if (!row.item.url) return <div className="fg-tnw__row">{body}</div>
  return (
    <a className="fg-tnw__row" href={row.item.url} target="_blank" rel="noopener noreferrer">
      {body}
    </a>
  )
}

export function ThemeNewsList({
  view,
  range,
  onlyAnalyzed,
  selected,
  selectedCount,
  onRange,
  onToggleAnalyzed,
  onClearSelected,
  onMore,
  onLogin,
  onOpenNews,
}: ThemeNewsListProps) {
  const none = view.empty === 'none'
  return (
    <div className="fg-tnw fg-reveal">
      <div className="fg-tnw__head">
        <h3>테마 종목이 나온 뉴스</h3>
        {!none && <span className="fg-num">{view.countText}</span>}
      </div>
      {!none && (
        <div className="fg-tnw__tools">
          <div className="fg-tnw__chips" role="group" aria-label="기간">
            {NEWS_RANGES.map(({ value, label }) => (
              <FilterChip key={value} pressed={selected === null && range === value} onClick={() => onRange(value)}>
                {label}
              </FilterChip>
            ))}
          </div>
          <FilterChip pressed={onlyAnalyzed} count={view.analyzedCount} onClick={onToggleAnalyzed}>
            분석만
          </FilterChip>
          {selected && (
            <FilterChip
              pressed
              className="fg-tnw__clear"
              aria-label={`${selected.label} 선택 풀기`}
              onClick={onClearSelected}
            >
              {`${selected.label} · ${selectedCount}건`}
              <X size={16} strokeWidth={1.75} aria-hidden="true" />
            </FilterChip>
          )}
        </div>
      )}
      {view.groups.length > 0 && (
        <ol className="fg-tnw__groups" aria-label={`${view.scope} 테마 종목 뉴스, 날짜별 최신순`}>
          {view.groups.map((group) => (
            <li key={group.tradeDay}>
              <h4 className="fg-tnw__day fg-num">
                {group.label}
                <span>· {group.total}건</span>
              </h4>
              <ul className="fg-tnw__list">
                {group.rows.map((row) => (
                  <li key={row.item.id}>
                    <NewsLine row={row} onOpen={onOpenNews} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      {none && (
        <StateBlock
          kind="empty"
          title="아직 이 테마 종목이 나온 뉴스가 없어요"
          description="새 뉴스가 나오면 여기에 바로 보여 드려요"
        />
      )}
      {view.empty === 'no-match' && (
        <StateBlock kind="empty" title="조건에 맞는 뉴스가 없어요" description="‘분석만’을 끄거나 다른 기간을 골라 보세요" />
      )}
      {view.more > 0 && (
        <Button className="fg-tnw__more" onClick={onMore}>
          뉴스 {view.more}건 더 보기
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
          <Button variant="primary" className="fg-tnw__login" onClick={onLogin}>
            로그인
          </Button>
        </div>
      )}
      <p className="fg-tdp__cap fg-tnw__note">
        ‘분석’은 Finngraph가 기사에서 기업 사이 관계를 뽑아낸 뉴스예요 · 제목을 누르면 매체 원문으로 가요
      </p>
    </div>
  )
}
