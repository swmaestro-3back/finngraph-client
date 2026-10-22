import { LucianIcon } from '@/components/fg/LucianIcon'
import { otherScheme, setColorScheme, useColorScheme } from '@/lib/fg/colorTheme'

export function ColorThemeToggle() {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const label = dark ? '라이트 모드로 바꾸기' : '다크 모드로 바꾸기'
  return (
    <button
      type="button"
      className="fg-gh__icon"
      aria-label={label}
      title={label}
      onClick={() => setColorScheme(otherScheme(scheme))}
    >
      {dark ? (
        <LucianIcon name="sun" size={20} />
      ) : (
        <LucianIcon name="moon" size={20} />
      )}
    </button>
  )
}
