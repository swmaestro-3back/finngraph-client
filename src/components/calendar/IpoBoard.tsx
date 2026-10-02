import type { ReactNode } from 'react'
import { CircleAlert, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { IpoRes } from '@/lib/apiTypes'
import { formatAsOf, formatDateSpan, groupIpos, ipoCountdown } from '@/lib/calendar'
import { formatWon } from '@/lib/format'
import { useIpos } from '@/lib/queries/useIpos'
import { formatShortDate } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

function Field({ term, children, wide = false }: { term: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn('flex min-w-0 items-baseline gap-2', wide && 'col-span-2')}>
      <dt className="shrink-0 text-muted-foreground">{term}</dt>
      <dd className="min-w-0 break-keep text-foreground">{children}</dd>
    </div>
  )
}

function dateOrPending(isoDate: string | null) {
  return isoDate ? <span className="font-mono tabular-nums">{formatShortDate(isoDate)}</span> : '미정'
}

function IpoRow({ item, today }: { item: IpoRes; today: string }) {
  const countdown = ipoCountdown(item, today)
  const urgent = item.status === 'SUBSCRIBING'

  return (
    <li className="border-b border-surface-inset py-3 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 break-keep text-sm font-medium text-foreground">{item.name}</span>
        {countdown && (
          <span
            className={cn(
              'shrink-0 font-mono text-caption tabular-nums',
              urgent ? 'font-semibold text-foreground' : 'text-foreground-secondary',
            )}
          >
            {countdown}
          </span>
        )}
      </div>
      <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-caption">
        <Field term="청약">
          <span className="font-mono tabular-nums">{formatDateSpan(item.subscrStart, item.subscrEnd)}</span>
        </Field>
        <Field term="공모가">
          {item.offerPrice === null ? '미정' : <span className="font-mono tabular-nums">{formatWon(item.offerPrice)}</span>}
        </Field>
        <Field term="환불">{dateOrPending(item.refundDate)}</Field>
        <Field term="상장">{dateOrPending(item.listingDate)}</Field>
        <Field term="주간사" wide>
          {item.leadManagers ?? '미정'}
        </Field>
      </dl>
    </li>
  )
}

export function IpoBoard({ today, className }: { today: string; className?: string }) {
  const { data, loading, error, refetch } = useIpos()
  const groups = groupIpos(data?.offerings ?? [])
  const asOf = formatAsOf(data?.asOf ?? null)

  return (
    <section aria-labelledby="ipo-board-title" className={cn('card-surface flex flex-col', className)}>
      <div className="flex flex-col gap-0.5 border-b border-border px-5 py-4">
        <h2 id="ipo-board-title" className="text-lg font-medium tracking-[-0.4px] text-foreground">
          공모주
        </h2>
        <p className="text-caption text-muted-foreground break-keep">오늘 기준 2주 전부터 30일 뒤까지의 청약·상장 일정</p>
      </div>

      <div className="px-5">
        {loading && (
          <div className="flex flex-col gap-2 py-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CircleAlert className="size-6 text-muted-foreground" />
            <p className="text-caption text-muted-foreground">
              {error.isRetryable
                ? '공모 일정을 잠시 불러올 수 없습니다.'
                : '공모 일정을 불러오지 못했습니다. 페이지를 새로 고치면 다시 요청합니다.'}
            </p>
            {error.isRetryable && (
              <Button variant="outline" size="sm" onClick={refetch}>
                <RotateCw data-icon="inline-start" />
                다시 시도
              </Button>
            )}
          </div>
        )}

        {!loading && !error && groups.length === 0 && (
          <div className="flex flex-col gap-1 py-8 text-center">
            <p className="text-body font-medium text-foreground">예정된 청약이 없습니다</p>
            <p className="text-caption leading-relaxed text-muted-foreground break-keep [text-wrap:pretty]">
              공모주는 공모가 확정 후 청약 며칠 전에 표시됩니다
            </p>
          </div>
        )}

        {!loading && !error && groups.length > 0 && (
          <div className="flex flex-col pb-1">
            {groups.map((group) => (
              <section key={group.status} aria-labelledby={`ipo-group-${group.status}`} className="pt-4">
                <h3
                  id={`ipo-group-${group.status}`}
                  className="flex items-baseline gap-1.5 text-caption font-semibold text-foreground-secondary"
                >
                  {group.title}
                  <span className="font-mono font-medium tabular-nums text-muted-foreground">{group.items.length}</span>
                </h3>
                <ul>
                  {group.items.map((item) => (
                    <IpoRow key={`${item.ticker}-${item.subscrStart}`} item={item} today={today} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {asOf && !loading && !error && (
        <p className="mt-auto border-t border-border px-5 py-3 text-caption text-muted-foreground">
          <span className="font-mono tabular-nums">{asOf}</span> 기준
        </p>
      )}
    </section>
  )
}
