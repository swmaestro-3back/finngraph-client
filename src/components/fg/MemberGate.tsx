import { Lock } from 'lucide-react'
import { Button } from '@/components/fg/Button'
import { josa } from '@/lib/josa'
import { useMemberGate } from '@/lib/memberGate'
import { cn } from '@/lib/utils'

const GHOST_ROWS: Record<'block' | 'compact', number[][]> = {
  block: [
    [14, 26, 12, 12, 10],
    [14, 26, 12, 12, 10],
    [14, 26, 12, 12, 10],
    [14, 26, 12, 12, 10],
    [14, 26, 12, 12, 10],
  ],
  compact: [
    [30, 24],
    [40, 18],
    [26, 22],
  ],
}

interface MemberGateProps {
  subject: string
  scope?: string | null
  variant?: 'block' | 'compact'
  className?: string
}

export function MemberGate({ subject, scope = null, variant = 'block', className }: MemberGateProps) {
  const { promptLogin } = useMemberGate()
  return (
    <div className={cn('fg-gate', variant === 'compact' && 'fg-gate--compact', className)}>
      <div className="fg-gate__ghost" aria-hidden="true">
        {GHOST_ROWS[variant].map((widths, row) => (
          <span key={row}>
            {widths.map((width, col) => (
              <i key={col} style={{ width: `${width}%` }} />
            ))}
          </span>
        ))}
      </div>
      <div className="fg-gate__over">
        <span className="fg-gate__lock" aria-hidden="true">
          <Lock size={20} strokeWidth={1.75} />
        </span>
        <p className={cn('fg-gate__title', variant === 'compact' && 'fg-gate__title--compact')}>
          {`${subject}${josa(subject, '은/는')} 로그인하면 볼 수 있어요`}
        </p>
        {variant === 'block' && scope && <p className="fg-gate__scope">{scope}</p>}
        <Button variant="primary" onClick={promptLogin}>
          로그인
        </Button>
      </div>
    </div>
  )
}
