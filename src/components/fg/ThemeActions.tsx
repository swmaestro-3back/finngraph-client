import { useLocation } from 'react-router-dom'
import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import { ButtonLink } from '@/components/fg/Button'
import type { ThemeRes } from '@/lib/apiTypes'
import { themePath } from '@/lib/fg/paths'
import { fromState } from '@/lib/navigation'

type ThemeRef = Pick<ThemeRes, 'id' | 'name'>

interface ThemeLinkProps {
  theme: ThemeRef
  label?: string
  className?: string
}

export function ThemeStar({ theme }: { theme: ThemeRef }) {
  return <FavoriteStar type="THEME" targetKey={String(theme.id)} label={theme.name} className="fg-tdet__star" />
}

export function ThemeGraphLink({ theme, label = '관계 탐색', className }: ThemeLinkProps) {
  return (
    <ButtonLink to={`/graph/theme/${encodeURIComponent(theme.name)}`} className={className}>
      {label}
    </ButtonLink>
  )
}

export function ThemeDetailLink({ theme, label = '테마 상세 보기', className }: ThemeLinkProps) {
  const { pathname, search } = useLocation()
  return (
    <ButtonLink
      to={themePath(theme.id)}
      state={fromState(`${pathname}${search}`)}
      variant="primary"
      className={className}
    >
      {label}
    </ButtonLink>
  )
}

export function ThemeActions({ theme }: { theme: ThemeRef }) {
  return (
    <div className="fg-tacts">
      <ThemeDetailLink theme={theme} />
      <ThemeGraphLink theme={theme} />
      <ThemeStar theme={theme} />
    </div>
  )
}
