import { MemberVeil } from '@/components/gate/MemberVeil'
import { useMemberGate } from '@/lib/memberGate'
import { cn } from '@/lib/utils'

interface LockedBlockProps {
  title: string
  description?: string
  lines?: number
  size?: 'sm' | 'md'
  className?: string
}

const WIDTHS = ['w-11/12', 'w-4/5', 'w-2/3', 'w-3/4', 'w-1/2']

export function LockedBlock({ title, description, lines = 3, size = 'sm', className }: LockedBlockProps) {
  const { pending, promptLogin } = useMemberGate()
  const count = Math.max(1, Math.min(lines, WIDTHS.length))

  return (
    <div className={cn('relative min-h-[88px] overflow-hidden rounded-lg', className)}>
      <div aria-hidden className="flex flex-col gap-2 px-1 py-2">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={cn('h-3.5 rounded bg-muted', WIDTHS[i])} />
        ))}
      </div>
      <MemberVeil title={title} description={description} size={size} pending={pending} onLogin={promptLogin} />
    </div>
  )
}
