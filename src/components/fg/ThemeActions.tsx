import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import { ButtonLink } from '@/components/fg/Button'
import type { ThemeRes } from '@/lib/apiTypes'
import { themePath } from '@/lib/fg/paths'
import { fromState } from '@/lib/navigation'

type ThemeRef = Pick<ThemeRes, 'id' | 'name'>

interface ThemeLinkProps {
  theme: ThemeRef
  label?: string
  text?: boolean
  className?: string
}

export function ThemeStar({ theme }: { theme: ThemeRef }) {
  return <FavoriteStar type="THEME" targetKey={String(theme.id)} label={theme.name} className="fg-tdet__star" />
}

export function ThemeGraphLink({ theme, label = '관계 탐색', text = false, className }: ThemeLinkProps) {
  const to = `/graph/theme/${encodeURIComponent(theme.name)}`
  if (text) {
    return (
      <Link to={to} className={className ? `fg-sdmore ${className}` : 'fg-sdmore'}>
        {label}
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
      </Link>
    )
  }
  return (
    <ButtonLink to={to} className={className}>
      {label}
    </ButtonLink>
  )
}

export function ThemeDetailLink({ theme, label = '테마 상세 보기', text = false, className }: ThemeLinkProps) {
  const { pathname, search } = useLocation()
  if (text) {
    return (
      <Link
        to={themePath(theme.id)}
        state={fromState(`${pathname}${search}`)}
        className={className ? `fg-sdmore ${className}` : 'fg-sdmore'}
      >
        {label}
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
      </Link>
    )
  }
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
      <ThemeDetailLink theme={theme} text />
      <ThemeGraphLink theme={theme} text />
      <ThemeStar theme={theme} />
    </div>
  )
}
