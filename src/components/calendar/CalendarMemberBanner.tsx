import type { ReactNode } from 'react'
import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { useFavorites } from '@/lib/favorites'
import { useMemberGate } from '@/lib/memberGate'
import { cn } from '@/lib/utils'

function Strip({ children, action, className }: { children: string; action: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="flex items-center gap-2 text-body text-foreground break-keep">
        <Star aria-hidden className="size-4 shrink-0 text-foreground-secondary" strokeWidth={2} />
        {children}
      </p>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

export function CalendarMemberBanner({ className }: { className?: string }) {
  const { status } = useAuth()
  const { items, ready } = useFavorites()
  const { promptLogin } = useMemberGate()

  if (status === 'anonymous') {
    return (
      <Strip
        className={className}
        action={
          <Button size="sm" onClick={promptLogin}>
            로그인
          </Button>
        }
      >
        로그인하면 관심종목 일정이 함께 보입니다
      </Strip>
    )
  }

  const noStockFavorites = status === 'authenticated' && ready && !items.some((item) => item.type === 'STOCK')
  if (noStockFavorites) {
    return (
      <Strip
        className={className}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/stocks">주식 목록에서 고르기</Link>
          </Button>
        }
      >
        관심종목을 등록하면 그 종목 일정이 별표와 함께 먼저 보입니다
      </Strip>
    )
  }

  return null
}
