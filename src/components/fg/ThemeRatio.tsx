import { cn } from '@/lib/utils'

interface ThemeRatioProps {
  up: number
  down: number
  flat?: number | null
  large?: boolean
  caption?: boolean
  className?: string
}

export function ThemeRatio({ up, down, flat = null, large = false, caption = true, className }: ThemeRatioProps) {
  return (
    <span className={cn('fg-tratio', large && 'fg-tratio--lg', className)}>
      <span className="fg-ratio" aria-hidden="true">
        {up + down === 0 ? (
          <i className="fg-ratio__none" />
        ) : (
          <>
            {up > 0 && <i className="fg-ratio__up" style={{ flexGrow: up }} />}
            {down > 0 && <i className="fg-ratio__down" style={{ flexGrow: down }} />}
          </>
        )}
      </span>
      {caption && (
        <small className="fg-num">
          {flat === null ? `상승 ${up} · 하락 ${down}` : `상승 ${up} · 보합 ${flat} · 하락 ${down}`}
        </small>
      )}
    </span>
  )
}
