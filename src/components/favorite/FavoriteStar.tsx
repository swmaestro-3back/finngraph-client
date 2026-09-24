// 관심 등록 토글 별표 — 종목 상세·테마 상세·목록 행·트리맵이 공유한다
//
// 비회원에게도 별표를 보여주는 이유: 로그인하면 무엇이 생기는지 알려주는 자리가
// 여기뿐이다. 숨기면 기능의 존재 자체가 전달되지 않는다.
import { Star } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { FavoriteKind } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'
import { useFavorites } from '@/lib/favorites'
import { cn } from '@/lib/utils'

interface FavoriteStarProps {
  type: FavoriteKind
  /** STOCK이면 종목코드, THEME이면 테마 id를 문자열로 */
  targetKey: string
  /** 스크린리더와 툴팁에 쓸 대상 이름 */
  label: string
  size?: 'sm' | 'md'
  className?: string
}

const SIZE_CLASS = {
  sm: 'size-4',
  md: 'size-5',
} as const

export function FavoriteStar({
  type,
  targetKey,
  label,
  size = 'md',
  className,
}: FavoriteStarProps) {
  const { status } = useAuth()
  const { has, isFull, toggle, limit } = useFavorites()
  const navigate = useNavigate()
  const location = useLocation()

  const active = status === 'authenticated' && has(type, targetKey)

  // 목록 행 안에 있을 때가 많아 부모의 클릭(상세 이동)까지 번지면 안 된다
  const onClick = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (status !== 'authenticated') {
      navigate('/login', { state: { next: location.pathname + location.search } })
      return
    }
    // 상한은 서버도 409로 막지만, 이미 아는 값이라 왕복 없이 즉시 알린다
    if (!active && isFull) {
      toast.error(`관심 목록은 ${limit}개까지예요`)
      return
    }
    void toggle(type, targetKey)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `${label} 관심 해제` : `${label} 관심 등록`}
      title={active ? '관심 해제' : '관심 등록'}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded p-1 transition-colors',
        'outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        'text-muted-foreground hover:text-foreground',
        active && 'text-foreground hover:text-foreground-secondary',
        className,
      )}
    >
      <Star className={cn(SIZE_CLASS[size], active && 'fill-current')} />
    </button>
  )
}
