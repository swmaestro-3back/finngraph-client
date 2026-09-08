import { useLocation, useNavigate } from 'react-router-dom'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface Props {
  name: string
  className?: string
  // stopPropagation이 부모 Link의 onClick(모달 닫기 등)까지 막으므로, 필요한 정리는 콜백으로 직접 받는다
  onNavigate?: () => void
}

// 부모 행이 <a>/<button>인 곳에 중첩되므로 anchor 대신 span role="button" (중첩 anchor 방지)
export function ThemeBadge({ name, className, onNavigate }: Props) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const go = (e: React.SyntheticEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onNavigate?.()
    navigate(`/theme/${encodeURIComponent(name)}`, { state: fromState(pathname) })
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') go(e)
      }}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center truncate rounded bg-muted px-1.5 py-0.5 text-caption font-medium text-muted-foreground hover:text-primary',
        className,
      )}
    >
      {name}
    </span>
  )
}
