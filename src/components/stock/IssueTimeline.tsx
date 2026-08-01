import { useState } from 'react'
import type { IssueDay } from '@/data/stockDetail'
import { cn } from '@/lib/utils'

// 이슈 타임라인 (design-specs/stock-detail.md §1-4)
const UP = '#cf202f'
const DOWN = '#0052ff'
const NEUTRAL = '#a8acb3'

// "2026.07.31" → "7/31"
function shortDate(date: string): string {
  const [, m, d] = date.split('.')
  return `${Number(m)}/${Number(d)}`
}

interface IssueTimelineProps {
  days: IssueDay[]
}

export function IssueTimeline({ days }: IssueTimelineProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const maxCount = Math.max(...days.map((d) => d.good + d.bad), 1)
  const slot = 100 / days.length
  const dateIndexes = [0, 0.33, 0.66, 0.99].map((f) =>
    Math.min(days.length - 1, Math.round(f * (days.length - 1))),
  )

  return (
    <div>
      <div className="mb-[9px] flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-foreground">일별 호재·악재</span>
        <span className="text-[11px] text-muted-foreground">최근 {days.length}거래일 뉴스 건수</span>
      </div>
      <div className="relative h-[max(52px,4.861vw)] border-b border-border">
        {days.map((day, i) => {
          const total = day.good + day.bad
          const color = day.good > day.bad ? UP : day.bad > day.good ? DOWN : NEUTRAL
          const opacity = total === 0 ? 0 : 0.4 + (0.55 * Math.abs(day.good - day.bad)) / total
          const isHovered = hovered === i
          return (
            <div
              key={day.date}
              className="absolute bottom-0 h-full"
              style={{ left: `${i * slot}%`, width: `${slot}%` }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="absolute bottom-0 left-[18%] w-[64%] rounded-t-[2px]"
                style={{
                  height: `${Math.max((total / maxCount) * 100, 4)}%`,
                  backgroundColor: color,
                  opacity: isHovered ? 1 : opacity,
                  outline: isHovered && total > 0 ? '2px solid #0a0b0d' : undefined,
                }}
              />
              {isHovered && total > 0 && (
                <div
                  className={cn(
                    'absolute bottom-full z-20 mb-2.5 w-[260px] rounded-2xl border border-border bg-background p-3 shadow-[0_4px_12px_rgba(0,0,0,0.04)]',
                    i < days.length / 4
                      ? 'left-0'
                      : i > (days.length * 3) / 4
                        ? 'right-0'
                        : 'left-1/2 -translate-x-1/2',
                  )}
                >
                  <div className="mb-1 font-mono text-xs font-medium text-foreground">
                    {day.date}
                  </div>
                  <div className="mb-2 text-[11px] text-muted-foreground">
                    {total}건 · 호재 {day.good} / 악재 {day.bad}
                  </div>
                  <div className="flex max-h-[170px] flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {day.items.map((item, j) => (
                      <div key={j} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'rounded-[4px] bg-muted px-1.5 py-[3px] text-[9px] font-semibold',
                              item.kind === '호재' ? 'text-stock-up' : 'text-stock-down',
                            )}
                          >
                            {item.kind}
                          </span>
                          <span className="truncate text-[11px] font-medium text-foreground">
                            {item.title}
                          </span>
                        </div>
                        <span className="pl-0.5 text-[10px] text-muted-foreground">
                          {item.press} · {item.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 날짜 라벨 */}
      <div className="relative mt-1.5 h-[18px]">
        {dateIndexes.map((idx, k) => (
          <span
            key={k}
            className="absolute font-mono text-[10px] font-medium text-muted-foreground"
            style={{ left: `${[0, 33, 66, 99][k]}%` }}
          >
            {shortDate(days[idx].date)}
          </span>
        ))}
      </div>
    </div>
  )
}
