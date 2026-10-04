import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import { ButtonLink } from '@/components/fg/Button'
import type { ThemeRes } from '@/lib/apiTypes'

type ThemeRef = Pick<ThemeRes, 'id' | 'name'>

export function ThemeStar({ theme }: { theme: ThemeRef }) {
  return <FavoriteStar type="THEME" targetKey={String(theme.id)} label={theme.name} className="fg-tdet__star" />
}

export function ThemeGraphLink({ theme }: { theme: ThemeRef }) {
  return <ButtonLink to={`/graph/theme/${encodeURIComponent(theme.name)}`}>관계 탐색</ButtonLink>
}

export function ThemeActions({ theme }: { theme: ThemeRef }) {
  return (
    <div className="fg-tacts">
      <ThemeGraphLink theme={theme} />
      <ThemeStar theme={theme} />
    </div>
  )
}
