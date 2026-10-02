import { useCallback, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { ChevronDown, ChevronUp, CircleAlert, RotateCw } from 'lucide-react'
import { IpoDetailModal } from '@/components/calendar/IpoDetailModal'
import { NoteBadge, Tag } from '@/components/calendar/detail/DetailParts'
import { Button } from '@/components/ui/button'
import type { IpoRes, IpoStatus } from '@/lib/apiTypes'
import {
  formatAsOf,
  formatDateSpan,
  groupIpos,
  type IpoGroup,
  groupPreview,
  ipoCountdown,
  ipoShowsSettlement,
  previewToggleLabel,
} from '@/lib/calendar'
import { formatWon } from '@/lib/format'
import { PLANNED_PRICE_HINT, findIpo, ipoKey, ipoPriceBadge, ipoTarget, type IpoDetailTarget } from '@/lib/ipoDetail'
import { useIpos } from '@/lib/queries/useIpos'
import { formatShortDate } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

function Field({ term, children, wide = false }: { term: string; children: ReactNode; wide?: boolean }) {
  return (
    <span className={cn('flex min-w-0 items-baseline gap-2', wide && 'col-span-2')}>
      <span className="shrink-0 text-muted-foreground">{term}</span>
      <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 break-keep text-foreground">{children}</span>
    </span>
  )
}

function dateOrPending(isoDate: string | null) {
  return isoDate ? <span className="font-mono tabular-nums">{formatShortDate(isoDate)}</span> : '미정'
}

function IpoCardBody({ item, today }: { item: IpoRes; today: string }) {
  const countdown = ipoCountdown(item, today)
  const urgent = item.status === 'SUBSCRIBING'
  const planned = ipoPriceBadge(item.offerPrice, item.priceBasis) === '예정'

  return (
    <>
      <span className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 break-keep text-sm font-medium text-foreground group-hover:text-primary">
            {item.name}
          </span>
          {item.spac && <Tag>스팩</Tag>}
        </span>
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
      </span>
      <span className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-caption">
        <Field term="청약">
          <span className="font-mono tabular-nums">{formatDateSpan(item.subscrStart, item.subscrEnd)}</span>
        </Field>
        <Field term="공모가">
          {item.offerPrice === null ? '미정' : <span className="font-mono tabular-nums">{formatWon(item.offerPrice)}</span>}
          {planned && <NoteBadge title={PLANNED_PRICE_HINT}>예정</NoteBadge>}
        </Field>
        {ipoShowsSettlement(item) && (
          <>
            <Field term="환불">{dateOrPending(item.refundDate)}</Field>
            <Field term="상장">{dateOrPending(item.listingDate)}</Field>
          </>
        )}
        <Field term="주간사" wide>
          {item.leadManagers ?? '미정'}
        </Field>
      </span>
    </>
  )
}

function IpoCard({ item, today, onOpen }: { item: IpoRes; today: string; onOpen: (target: IpoDetailTarget) => void }) {
  const target = ipoTarget(item)

  return (
    <li className="border-b border-surface-inset transition-colors last:border-b-0 has-[button:hover]:bg-muted has-[button:focus-visible]:bg-muted">
      {target ? (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => onOpen(target)}
          className="group flex w-full cursor-pointer flex-col px-5 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50"
        >
          <IpoCardBody item={item} today={today} />
        </button>
      ) : (
        <div className="flex flex-col px-5 py-3">
          <IpoCardBody item={item} today={today} />
        </div>
      )}
    </li>
  )
}

interface IpoBoardProps {
  today: string
  from: string
  className?: string
}

export function IpoBoard({ today, from, className }: IpoBoardProps) {
  const { data, loading, error, refetch } = useIpos()
  const groups = groupIpos(data?.offerings ?? [])
  const asOf = formatAsOf(data?.asOf ?? null)
  const [target, setTarget] = useState<IpoDetailTarget | null>(null)
  const [expanded, setExpanded] = useState<Partial<Record<IpoStatus, boolean>>>({})
  const fallback = useMemo(() => (target ? findIpo(data?.offerings ?? [], target) : null), [data, target])
  const changeModal = useCallback((open: boolean) => {
    if (!open) setTarget(null)
  }, [])
  const toggleGroup = (group: IpoGroup, open: boolean, event: MouseEvent<HTMLButtonElement>) => {
    const toggle = event.currentTarget
    flushSync(() => setExpanded((current) => ({ ...current, [group.status]: !open })))
    if (open || group.preview === null) {
      toggle.scrollIntoView({ block: 'nearest' })
      return
    }
    const revealed = document
      .getElementById(`ipo-group-list-${group.status}`)
      ?.querySelectorAll('li')
      [group.preview]?.querySelector('button')
    revealed?.focus()
  }

  return (
    <section aria-labelledby="ipo-board-title" className={cn('card-surface flex flex-col', className)}>
      <div className="flex flex-col gap-0.5 border-b border-border px-5 py-4">
        <h2 id="ipo-board-title" className="text-lg font-medium tracking-[-0.4px] text-foreground">
          공모주
        </h2>
        <p className="text-caption text-muted-foreground break-keep [text-wrap:pretty]">
          오늘 기준 2주 전부터 30일 뒤까지의 청약·상장 일정과, 60일 안에 청약할 증권신고서 제출 공모
        </p>
      </div>

      {loading && (
        <div className="flex flex-col gap-2 px-5 py-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
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
        <div className="flex flex-col gap-1 px-5 py-8 text-center">
          <p className="text-body font-medium text-foreground">예정된 청약이 없습니다</p>
          <p className="text-caption leading-relaxed text-muted-foreground break-keep [text-wrap:pretty]">
            증권신고서가 제출되면 청약 60일 전부터 이곳에 표시됩니다
          </p>
        </div>
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="flex flex-col pb-1">
          {groups.map((group) => {
            const open = expanded[group.status] === true
            const { items, hidden } = groupPreview(group, open)
            const collapsible = open || hidden > 0
            return (
              <section
                key={group.status}
                aria-labelledby={`ipo-group-${group.status}`}
                className="border-t border-border pt-4 first:border-t-0"
              >
                <div className="px-5">
                  <h3
                    id={`ipo-group-${group.status}`}
                    className="flex items-baseline gap-1.5 text-sm font-medium text-foreground"
                  >
                    {group.title}
                    <span className="font-mono font-medium tabular-nums text-muted-foreground">{group.items.length}</span>
                  </h3>
                  {group.note && (
                    <p className="mt-0.5 text-caption text-muted-foreground break-keep [text-wrap:pretty]">{group.note}</p>
                  )}
                </div>
                <ul id={`ipo-group-list-${group.status}`} className="mt-1">
                  {items.map((item) => (
                    <IpoCard key={ipoKey(item)} item={item} today={today} onOpen={setTarget} />
                  ))}
                </ul>
                {collapsible && (
                  <div className="px-5 pt-1 pb-3">
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`ipo-group-list-${group.status}`}
                      onClick={(event) => toggleGroup(group, open, event)}
                      className="inline-flex items-center gap-1 rounded-sm text-caption font-medium text-foreground-secondary outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {previewToggleLabel(group, open)}
                      {open ? (
                        <ChevronUp aria-hidden className="size-3.5" />
                      ) : (
                        <ChevronDown aria-hidden className="size-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {asOf && !loading && !error && (
        <p className="mt-auto border-t border-border px-5 py-3 text-caption text-muted-foreground">
          <span className="font-mono tabular-nums">{asOf}</span> 기준
        </p>
      )}

      <IpoDetailModal target={target} fallback={fallback} from={from} today={today} onOpenChange={changeModal} />
    </section>
  )
}
