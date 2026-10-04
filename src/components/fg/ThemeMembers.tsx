import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { Button } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { ChangeText } from '@/components/fg/PriceChange'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import type { ApiError } from '@/lib/api'
import type { ThemeStockRes } from '@/lib/apiTypes'
import { formatPriceWon } from '@/lib/fg/format'
import { stockPath } from '@/lib/fg/paths'
import { MEMBER_LIMIT, memberRows } from '@/lib/fg/themes'
import { useDelayed } from '@/lib/fg/useDelayed'
import { fromState } from '@/lib/navigation'

interface ThemeMembersProps {
  stocks: readonly ThemeStockRes[] | null
  loading: boolean
  error: ApiError | null
  onRetry: () => void
  leaderTicker: string | null
  from: string
}

export function ThemeMembers({ stocks, loading, error, onRetry, leaderTicker, from }: ThemeMembersProps) {
  const [showAll, setShowAll] = useState(false)
  const showSkeleton = useDelayed(loading)
  const rows = useMemo(() => memberRows(stocks ?? [], leaderTicker), [stocks, leaderTicker])

  if (error && !loading) {
    return (
      <StateBlock
        kind="error"
        title="테마 종목을 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        }
      />
    )
  }
  if (stocks === null) {
    return showSkeleton ? (
      <div className="fg-mlist__skel" aria-hidden="true">
        <Skeleton height={56} />
        <Skeleton height={56} />
        <Skeleton height={56} />
      </div>
    ) : null
  }
  if (rows.length === 0) return <p className="fg-tdet__none">테마 종목이 없어요</p>

  const shown = showAll ? rows : rows.slice(0, MEMBER_LIMIT)
  return (
    <>
      <ul className="fg-mlist">
        {shown.map((row) => (
          <li key={row.ticker}>
            <Link to={stockPath(row.ticker)} state={fromState(from)}>
              <CompanyLogo name={row.name} />
              <span className="fg-mlist__body">
                <span className="fg-mlist__top">
                  <span className="fg-mlist__name">{row.name}</span>
                  {row.leader && <Badge>주도주</Badge>}
                </span>
                <span className="fg-mlist__price fg-num">
                  {row.price === null ? '—' : formatPriceWon(row.price)}
                </span>
              </span>
              {row.change === null ? (
                <span className="fg-mlist__chg">—</span>
              ) : (
                <ChangeText value={row.change} className="fg-mlist__chg" />
              )}
            </Link>
          </li>
        ))}
      </ul>
      {!showAll && rows.length > MEMBER_LIMIT && (
        <Button onClick={() => setShowAll(true)}>테마 종목 {rows.length}개 모두 보기</Button>
      )}
    </>
  )
}
