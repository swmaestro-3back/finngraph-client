import type { ReactNode } from 'react'
import { Star } from 'lucide-react'
import { Button, ButtonLink } from '@/components/fg/Button'
import { useAuth } from '@/lib/auth'
import { useFavorites } from '@/lib/favorites'
import { useMemberGate } from '@/lib/memberGate'
import { cn } from '@/lib/utils'

function Strip({ children, action, className }: { children: string; action: ReactNode; className?: string }) {
  return (
    <div className={cn('fg-section fg-cal-banner', className)}>
      <p className="fg-cal-banner__text">
        <span className="fg-cal-banner__icon" aria-hidden="true">
          <Star size={16} strokeWidth={1.75} />
        </span>
        {children}
      </p>
      {action}
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
          <Button variant="primary" size="sm" onClick={promptLogin}>
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
          <ButtonLink size="sm" to="/stocks">
            주식 목록에서 고르기
          </ButtonLink>
        }
      >
        관심종목을 등록하면 그 종목 일정이 별표와 함께 먼저 보입니다
      </Strip>
    )
  }

  return null
}
