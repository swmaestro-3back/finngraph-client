import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { IpoDetailModal } from '@/components/calendar/IpoDetailModal'
import { Badge } from '@/components/fg/Badge'
import { Button } from '@/components/fg/Button'
import { DataTable, type Column } from '@/components/fg/DataTable'
import { FilterChipGroup } from '@/components/fg/FilterChip'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
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
import { useMediaQuery } from '@/lib/fg/useMediaQuery'
import { formatWon } from '@/lib/format'
import { PLANNED_PRICE_HINT, findIpo, ipoKey, ipoPriceBadge, ipoTarget, type IpoDetailTarget } from '@/lib/ipoDetail'
import { useIpos } from '@/lib/queries/useIpos'
import { formatMonthDay } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

function Field({ term, children, wide = false }: { term: string; children: ReactNode; wide?: boolean }) {
  return (
    <span className={cn('fg-cal-ipo__field', wide && 'fg-cal-ipo__field--wide')}>
      <span className="fg-cal-ipo__term">{term}</span>
      <span className="fg-cal-ipo__value">{children}</span>
    </span>
  )
}

function dateOrPending(isoDate: string | null) {
  return isoDate ? <span className="fg-num">{formatMonthDay(isoDate)}</span> : '미정'
}

function IpoCardBody({ item, today }: { item: IpoRes; today: string }) {
  const countdown = ipoCountdown(item, today)
  const urgent = item.status === 'SUBSCRIBING'
  const planned = ipoPriceBadge(item.offerPrice, item.priceBasis) === '예정'

  return (
    <>
      <span className="fg-cal-ipo__top">
        <span className="fg-cal-ipo__id">
          <span className="fg-cal-ipo__name">{item.name}</span>
          {item.spac && <Badge className="fg-cal-ipo__badge">스팩</Badge>}
        </span>
        {countdown && (
          <span className={cn('fg-cal-ipo__dday fg-num', urgent && 'fg-cal-ipo__dday--urgent')}>{countdown}</span>
        )}
      </span>
      <span className="fg-cal-ipo__fields">
        <Field term="청약">
          <span className="fg-num">{formatDateSpan(item.subscrStart, item.subscrEnd)}</span>
        </Field>
        <Field term="공모가">
          {item.offerPrice === null ? '미정' : <span className="fg-num">{formatWon(item.offerPrice)}</span>}
          {planned && (
            <Badge tone="event" title={PLANNED_PRICE_HINT} className="fg-cal-ipo__badge">
              예정
            </Badge>
          )}
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
    <li>
      {target ? (
        <button type="button" aria-haspopup="dialog" onClick={() => onOpen(target)} className="fg-cal-ipo__row">
          <IpoCardBody item={item} today={today} />
        </button>
      ) : (
        <div className="fg-cal-ipo__row">
          <IpoCardBody item={item} today={today} />
        </div>
      )}
    </li>
  )
}

const NARROW = '(max-width: 767px)'

function IpoName({ item, onOpen }: { item: IpoRes; onOpen: (target: IpoDetailTarget) => void }) {
  const target = ipoTarget(item)
  const name = (
    <>
      <span className="fg-cal-ipo__name">{item.name}</span>
      {item.spac && <Badge className="fg-cal-ipo__badge">스팩</Badge>}
    </>
  )
  if (!target) return <span className="fg-cal-ipo__id">{name}</span>
  return (
    <button type="button" aria-haspopup="dialog" className="fg-cal-ipo__open" onClick={() => onOpen(target)}>
      {name}
    </button>
  )
}

function ipoColumns(group: IpoGroup, today: string, onOpen: (target: IpoDetailTarget) => void): Column<IpoRes>[] {
  const settles = group.items.some(ipoShowsSettlement)
  const counts = group.items.some((item) => ipoCountdown(item, today) !== null)
  const columns: Column<IpoRes>[] = [
    {
      key: 'name',
      header: '종목',
      align: 'left',
      cell: (item) => <IpoName item={item} onOpen={onOpen} />,
    },
    {
      key: 'subscr',
      header: '청약',
      cell: (item) => <span className="fg-num">{formatDateSpan(item.subscrStart, item.subscrEnd)}</span>,
    },
    {
      key: 'price',
      header: '공모가',
      cell: (item) => (
        <span className="fg-cal-ipo__price">
          {item.offerPrice === null ? '미정' : <span className="fg-num">{formatWon(item.offerPrice)}</span>}
          {ipoPriceBadge(item.offerPrice, item.priceBasis) === '예정' && (
            <Badge tone="event" title={PLANNED_PRICE_HINT} className="fg-cal-ipo__badge">
              예정
            </Badge>
          )}
        </span>
      ),
    },
  ]
  if (settles) {
    columns.push(
      {
        key: 'refund',
        header: '환불',
        cell: (item) => (ipoShowsSettlement(item) ? dateOrPending(item.refundDate) : '—'),
      },
      {
        key: 'listing',
        header: '상장',
        cell: (item) => (ipoShowsSettlement(item) ? dateOrPending(item.listingDate) : '—'),
      },
    )
  }
  columns.push({
    key: 'managers',
    header: '주간사',
    align: 'left',
    cell: (item) => <span className="fg-cal-ipo__mgr">{item.leadManagers ?? '미정'}</span>,
  })
  if (!counts) return columns
  columns.push({
    key: 'dday',
    header: '남은 기간',
    cell: (item) => {
      const countdown = ipoCountdown(item, today)
      if (!countdown) return '—'
      return (
        <span className={cn('fg-cal-ipo__dday fg-num', item.status === 'SUBSCRIBING' && 'fg-cal-ipo__dday--urgent')}>
          {countdown}
        </span>
      )
    },
  })
  return columns
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
  const narrow = useMediaQuery(NARROW)
  const [target, setTarget] = useState<IpoDetailTarget | null>(null)
  const [picked, setPicked] = useState<IpoStatus | null>(null)
  const [expanded, setExpanded] = useState(false)
  const group = groups.find((candidate) => candidate.status === picked) ?? groups[0] ?? null
  const fallback = useMemo(() => (target ? findIpo(data?.offerings ?? [], target) : null), [data, target])
  const changeModal = useCallback((open: boolean) => {
    if (!open) setTarget(null)
  }, [])
  const pickGroup = (status: IpoStatus) => {
    setPicked(status)
    setExpanded(false)
  }

  let body: ReactNode = null
  if (group) {
    const { items, hidden } = groupPreview(group, expanded)
    const listId = `ipo-group-list-${group.status}`
    body = (
      <>
        <FilterChipGroup
          label="공모 단계"
          options={groups.map((candidate) => ({
            value: candidate.status,
            label: candidate.title,
            count: candidate.items.length,
          }))}
          value={group.status}
          onChange={pickGroup}
          className="fg-cal-ipo__tabs"
        />
        {group.note && <p className="fg-cal-ipo__gnote">{group.note}</p>}
        <div id={listId}>
          {narrow ? (
            <ul className="fg-cal-ipo__list">
              {items.map((item) => (
                <IpoCard key={ipoKey(item)} item={item} today={today} onOpen={setTarget} />
              ))}
            </ul>
          ) : (
            <DataTable
              label={`${group.title} 공모주`}
              columns={ipoColumns(group, today, setTarget)}
              rows={items}
              rowKey={ipoKey}
              className="fg-cal-ipo__table"
            />
          )}
        </div>
        {(expanded || hidden > 0) && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded((open) => !open)}
            className="fg-cal-ipo__more"
          >
            {previewToggleLabel(group, expanded)}
            {expanded ? (
              <ChevronUp size={16} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        )}
      </>
    )
  }

  return (
    <section aria-labelledby="ipo-board-title" className={cn('fg-section fg-cal-ipo', className)}>
      <div className="fg-cal-ipo__head">
        <div>
          <h2 id="ipo-board-title" className="fg-section__title">
            공모주
          </h2>
          <p className="fg-cal-ipo__desc">
            오늘 기준 2주 전부터 30일 뒤까지의 청약·상장 일정과, 60일 안에 청약할 증권신고서 제출 공모
          </p>
        </div>
        {asOf && !loading && !error && (
          <span className="fg-cal-ipo__asof">
            <span className="fg-num">{asOf}</span> 기준
          </span>
        )}
      </div>

      {loading && (
        <div className="fg-cal-ipo__skel" aria-hidden="true">
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
        </div>
      )}

      {!loading && error && (
        <StateBlock
          kind="error"
          title={
            error.isRetryable
              ? '공모 일정을 잠시 불러올 수 없습니다.'
              : '공모 일정을 불러오지 못했습니다. 페이지를 새로 고치면 다시 요청합니다.'
          }
          action={
            error.isRetryable ? (
              <Button size="sm" onClick={refetch}>
                다시 시도
              </Button>
            ) : undefined
          }
          className="fg-cal-ipo__state"
        />
      )}

      {!loading && !error && groups.length === 0 && (
        <StateBlock
          kind="empty"
          title="예정된 청약이 없습니다"
          description="증권신고서가 제출되면 청약 60일 전부터 이곳에 표시됩니다"
          className="fg-cal-ipo__state"
        />
      )}

      {!loading && !error && body}

      <IpoDetailModal target={target} fallback={fallback} from={from} today={today} onOpenChange={changeModal} />
    </section>
  )
}
