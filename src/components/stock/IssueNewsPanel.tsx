import { memo, useMemo, type ReactNode } from 'react'
import type { IssueDay, IssueKind, IssueNews } from '@/data/stockDetail'
import { cn } from '@/lib/utils'


interface IssueNewsPanelProps {
  days: IssueDay[]
  selectedIndex: number | null
  onSelectNews: (newsId: string) => void
  onClearSelection: () => void
  extra?: ReactNode
}

function KindColumn({
  kind,
  items,
  onSelectNews,
}: {
  kind: IssueKind
  items: IssueNews[]
  onSelectNews: (newsId: string) => void
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-lg border border-surface-inset p-3">
      <div className="mb-1 flex items-baseline justify-between border-b border-border pb-1.5">
        <span
          className={cn(
            'text-xs font-semibold',
            kind === '호재' && 'text-stock-up',
            kind === '악재' && 'text-stock-down',
            kind === '중립' && 'text-foreground',
          )}
        >
          {kind === '중립' ? '뉴스' : kind}
        </span>
        <span className="font-mono text-caption text-muted-foreground">{items.length}건</span>
      </div>

      {items.length === 0 ? (
        <p className="py-5 text-center text-caption text-muted-foreground">
          이 기간 {kind === '중립' ? '' : kind} 뉴스가 없습니다
        </p>
      ) : (
        <div className="max-h-[240px] overflow-y-auto">
          {items.map((item, i) => (
            <button
              key={`${item.id}-${i}`}
              type="button"
              onClick={() => onSelectNews(item.id)}
              className="w-full border-b border-surface-inset py-2 text-left last:border-0 hover:bg-muted"
            >
              <span className="block truncate text-sm font-medium text-foreground">
                {item.title}
              </span>
              <span className="mt-0.5 block truncate text-caption text-muted-foreground">
                {item.meta}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export const IssueNewsPanel = memo(function IssueNewsPanel({
  days,
  selectedIndex,
  onSelectNews,
  onClearSelection,
  extra,
}: IssueNewsPanelProps) {
  const selected = selectedIndex === null ? null : days[selectedIndex]
  const all = useMemo(
    () => ({
      items: days.flatMap((d) => d.items).reverse(),
      good: days.reduce((n, d) => n + d.good, 0),
      bad: days.reduce((n, d) => n + d.bad, 0),
      neutral: days.reduce((n, d) => n + d.neutral, 0),
    }),
    [days],
  )
  const { items, good, bad }: { items: IssueNews[]; good: number; bad: number } =
    selected ?? all

  const goodItems = useMemo(() => items.filter((item) => item.kind === '호재'), [items])
  const badItems = useMemo(() => items.filter((item) => item.kind === '악재'), [items])
  const neutralOnly = good + bad === 0

  return (
    <section className="flex flex-col card-surface p-5">
      <div className="mb-[9px] flex min-h-[30px] flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {selected ? selected.date : `${days[0].date} ~ ${days[days.length - 1].date}`}
          </h3>
          <span className="text-caption text-muted-foreground">
            {neutralOnly ? `${items.length}건` : `${items.length}건 · 호재 ${good} / 악재 ${bad}`}
          </span>
        </div>
        {selected && (
          <button
            type="button"
            onClick={onClearSelection}
            className="cursor-pointer text-caption font-medium text-primary"
          >
            전체 보기
          </button>
        )}
      </div>

      {selected && extra}

      {items.length === 0 ? (
        <p className="py-6 text-center text-body text-muted-foreground">
          이 기간에 수집된 뉴스가 없습니다. 다른 칸을 눌러 보세요.
        </p>
      ) : (
        neutralOnly ? (
        <KindColumn kind="중립" items={items} onSelectNews={onSelectNews} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <KindColumn kind="호재" items={goodItems} onSelectNews={onSelectNews} />
          <KindColumn kind="악재" items={badItems} onSelectNews={onSelectNews} />
        </div>
        )
      )}
    </section>
  )
})
