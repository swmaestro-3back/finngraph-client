import { useState } from 'react'
import { ExternalLink, Lock } from 'lucide-react'
import { MonoText } from '@/components/stock/MonoText'
import type { NewsDetail, StockContractRes } from '@/lib/apiTypes'
import { changeColorClass, formatChange, formatCompactKrw, pressOf } from '@/lib/format'
import {
  MOVE_CRITERIA_TEXT,
  NO_ISSUE_DETAIL,
  NO_ISSUE_TITLE,
  NO_MOVES_TEXT,
  evidenceCountText,
  flowText,
  limitText,
  volumeRatioText,
  type NotableMove,
} from '@/lib/moves'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MOBILE_PREVIEW = 5

export function dayLabel(date: string): { day: string; weekday: string } {
  const [y, m, d] = date.split('-').map(Number)
  return { day: `${m}/${d}`, weekday: WEEKDAYS[new Date(y, m - 1, d).getDay()] }
}

function clues(move: NotableMove): string[] {
  const list: string[] = []
  if (move.halted) list.push('거래 정지')
  const limit = limitText(move)
  if (limit) list.push(limit)
  if (move.volumeRatio !== null) list.push(volumeRatioText(move.volumeRatio))
  const flows = flowText(move.flows)
  if (flows) list.push(flows)
  list.push(evidenceCountText(move))
  return list
}

export function NewsEvidence({ item, onSelectNews }: { item: NewsDetail; onSelectNews: (id: string) => void }) {
  const content = (
    <>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{item.title}</span>
      <span className="hidden max-w-40 shrink-0 truncate text-caption text-muted-foreground sm:inline">
        {pressOf(item.url)}
      </span>
    </>
  )
  const className =
    'flex w-full min-w-0 items-baseline gap-3 rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50'
  if (item.tripleExtracted !== true && item.url) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    )
  }
  return (
    <button type="button" onClick={() => onSelectNews(item.id)} className={cn(className, 'cursor-pointer')}>
      {content}
    </button>
  )
}

function ContractEvidence({ row }: { row: StockContractRes }) {
  return (
    <a
      href={row.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full min-w-0 items-baseline gap-3 rounded-md px-2 py-1.5 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="shrink-0 text-caption font-medium text-foreground-secondary">공시</span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {row.contractName ?? row.contractType ?? row.reportName}
        {row.counterpartyName && <span className="text-muted-foreground"> · {row.counterpartyName}</span>}
      </span>
      <span className="shrink-0 font-mono text-caption tabular-nums text-foreground">
        {formatCompactKrw(row.contractAmount)}
      </span>
      <ExternalLink aria-hidden className="size-3.5 shrink-0 self-center text-muted-foreground" strokeWidth={2} />
    </a>
  )
}

interface ReasonTabProps {
  moves: NotableMove[] | null
  newsLockedBefore: string | null
  onPick: (date: string) => void
  onSelectNews: (id: string) => void
  onLogin: () => void
}

export function ReasonTab({ moves, newsLockedBefore, onPick, onSelectNews, onLogin }: ReasonTabProps) {
  const [expanded, setExpanded] = useState(false)
  const hiddenOnMobile = moves !== null && !expanded ? Math.max(0, moves.length - MOBILE_PREVIEW) : 0

  return (
    <div className="card-surface p-5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 className="text-body font-semibold text-foreground">최근 큰 움직임</h2>
          {moves && moves.length > 0 && (
            <span className="font-mono text-caption tabular-nums text-muted-foreground">{moves.length}건</span>
          )}
        </div>
        <p className="text-caption text-muted-foreground break-keep">{MOVE_CRITERIA_TEXT}</p>
      </div>

      {moves === null && (
        <div className="flex flex-col gap-2 pt-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
          ))}
        </div>
      )}

      {moves !== null && moves.length === 0 && (
        <p className="py-10 text-center text-body text-muted-foreground">{NO_MOVES_TEXT}</p>
      )}

      {moves !== null && moves.length > 0 && (
        <ol className="flex flex-col">
          {moves.map((move, index) => {
            const { day, weekday } = dayLabel(move.date)
            const newsLocked = newsLockedBefore !== null && move.date < newsLockedBefore && move.news.length > 0
            const hasEvidence = move.news.length > 0 || move.contracts.length > 0
            return (
              <li
                key={move.date}
                className={cn(
                  'grid grid-cols-1 gap-y-2 border-t border-surface-inset py-4 first:border-t-0 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-4',
                  !expanded && index >= MOBILE_PREVIEW && 'max-lg:hidden',
                )}
              >
                <button
                  type="button"
                  onClick={() => onPick(move.date)}
                  aria-label={`${day} ${move.change === null ? '' : formatChange(move.change)} 차트에서 보기`}
                  className="group flex cursor-pointer flex-wrap items-baseline gap-x-2.5 gap-y-0.5 self-start rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:flex-col sm:items-start"
                >
                  <span className="flex items-baseline gap-1">
                    <span className="font-mono text-sm font-medium tabular-nums text-foreground">{day}</span>
                    <span className="text-caption text-muted-foreground">{weekday}</span>
                  </span>
                  <span
                    className={cn(
                      'font-mono text-title font-medium leading-tight tabular-nums',
                      move.change === null ? 'text-muted-foreground' : changeColorClass(move.change),
                    )}
                  >
                    {move.change === null ? '—' : formatChange(move.change)}
                  </span>
                  <span className="text-micro text-muted-foreground group-hover:text-primary">차트에서 보기</span>
                </button>

                <div className="min-w-0">
                  <ul className="flex flex-wrap gap-1.5">
                    {clues(move).map((clue) => (
                      <li key={clue} className="rounded-md bg-surface-inset px-2 py-0.5 text-caption text-foreground-secondary">
                        <MonoText>{clue}</MonoText>
                      </li>
                    ))}
                  </ul>

                  {hasEvidence ? (
                    <div className="-mx-2 mt-2 flex flex-col">
                      {newsLocked ? (
                        <button
                          type="button"
                          onClick={onLogin}
                          className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-caption text-foreground-secondary outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <Lock className="size-3 shrink-0" strokeWidth={2.5} />
                          이 날 뉴스 {move.news.length}건은 로그인 후 볼 수 있어요
                        </button>
                      ) : (
                        move.news.map((item) => <NewsEvidence key={item.id} item={item} onSelectNews={onSelectNews} />)
                      )}
                      {move.contracts.map((row) => (
                        <ContractEvidence key={row.rceptNo} row={row} />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-caption">
                      <span className="font-medium text-foreground">{NO_ISSUE_TITLE}</span>
                      <span className="text-muted-foreground"> · {NO_ISSUE_DETAIL}</span>
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {hiddenOnMobile > 0 && (
        <div className="pt-2 text-center lg:hidden">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="cursor-pointer rounded text-xs font-semibold text-foreground-secondary outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            더 보기 · {hiddenOnMobile}건
          </button>
        </div>
      )}
    </div>
  )
}
