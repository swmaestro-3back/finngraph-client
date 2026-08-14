import { memo, useMemo } from 'react'
import type { IssueDay, IssueNews } from '@/data/stockDetail'
import { cn } from '@/lib/utils'

// 이슈 레인에서 고른 칸의 뉴스 — 레인 아래 항상 자리를 지킨다
// (docs/superpowers/specs/2026-08-14-issue-timeline-design.md)
//
// 호버 팝오버를 대신하는 자리다. 고정된 영역이라 커서를 옮기는 동안 사라지지 않고,
// 한 줄이 그대로 뉴스 상세 모달로 이어진다.

const ROW =
  'grid min-h-[48px] w-full grid-cols-[46px_1fr_124px] items-center gap-3 border-b border-surface-inset py-1 text-left hover:bg-muted'

interface IssueNewsPanelProps {
  days: IssueDay[]
  /** null이면 전체 기간을 최신순으로 보여준다 */
  selectedIndex: number | null
  onSelectNews: (newsId: string) => void
  /** 선택을 풀고 전체로 돌아간다 */
  onClearSelection: () => void
}

export const IssueNewsPanel = memo(function IssueNewsPanel({
  days,
  selectedIndex,
  onSelectNews,
  onClearSelection,
}: IssueNewsPanelProps) {
  const selected = selectedIndex === null ? null : days[selectedIndex]
  // 전체 기간 집계는 매 렌더마다 60여 일치를 다시 훑지 않도록 기간이 바뀔 때만 만든다
  const all = useMemo(
    () => ({
      items: days.flatMap((d) => d.items).reverse(),
      good: days.reduce((n, d) => n + d.good, 0),
      bad: days.reduce((n, d) => n + d.bad, 0),
    }),
    [days],
  )
  const { items, good, bad }: { items: IssueNews[]; good: number; bad: number } =
    selected ?? all

  return (
    <section className="flex flex-col rounded-3xl border border-border bg-background p-5">
      <div className="mb-[9px] flex min-h-[30px] flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {selected ? selected.date : `${days[0].date} ~ ${days[days.length - 1].date}`}
        </h3>
        {selected && (
          <button
            type="button"
            onClick={onClearSelection}
            className="cursor-pointer text-[11px] font-medium text-primary"
          >
            전체 보기
          </button>
        )}
      </div>

      <div className="grid grid-cols-[46px_1fr_124px] gap-3 border-b border-border pb-1.5 text-[11px] text-muted-foreground">
        <span>성격</span>
        <span>
          {items.length}건 · 호재 {good} / 악재 {bad}
        </span>
        <span className="text-right">출처 · 시간</span>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted-foreground">
          이 기간에 수집된 뉴스가 없습니다. 다른 칸을 눌러 보세요.
        </p>
      ) : (
        <div className="max-h-[280px] overflow-y-auto">
          {items.map((item, i) => (
            <button
              key={`${item.id}-${i}`}
              type="button"
              onClick={() => onSelectNews(item.id)}
              className={ROW}
            >
              <span
                className={cn(
                  'w-fit rounded-[4px] bg-muted px-1.5 py-[3px] text-[10px] font-semibold',
                  item.kind === '호재' ? 'text-stock-up' : 'text-stock-down',
                )}
              >
                {item.kind}
              </span>
              <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
              <span className="truncate text-right text-[11px] text-muted-foreground">
                {item.meta}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
})
