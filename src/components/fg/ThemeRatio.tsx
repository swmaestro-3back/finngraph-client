import { cn } from '@/lib/utils'

interface ThemeRatioProps {
  up: number
  down: number
  large?: boolean
  caption?: boolean
}

export function ThemeRatio({ up, down, large = false, caption = true }: ThemeRatioProps) {
  return (
    <span className={cn('fg-tratio', large && 'fg-tratio--lg')}>
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
          상승 {up} · 하락 {down}
        </small>
      )}
    </span>
  )
}
