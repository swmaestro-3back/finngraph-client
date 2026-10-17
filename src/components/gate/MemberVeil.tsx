import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MemberVeilProps {
  title: string
  description?: string
  size?: 'sm' | 'md'
  pending?: boolean
  onLogin: () => void
  className?: string
  actionClassName?: string
}

export function MemberVeil({
  title,
  description,
  size = 'md',
  pending = false,
  onLogin,
  className,
  actionClassName,
}: MemberVeilProps) {
  const compact = size === 'sm'

  return (
    <div
      aria-hidden={pending || undefined}
      className={cn(
        'absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 px-4 text-center backdrop-blur-sm',
        compact ? 'gap-1.5' : 'gap-2',
        className,
      )}
    >
      {!pending && (
        <>
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground-secondary',
              compact ? 'size-7' : 'size-9',
            )}
          >
            <Lock className={compact ? 'size-3.5' : 'size-4'} strokeWidth={2} />
          </span>
          <p className="break-keep text-body font-medium text-foreground">{title}</p>
          {description && (
            <p className="max-w-[34ch] text-caption leading-relaxed break-keep text-foreground-secondary [text-wrap:pretty]">
              {description}
            </p>
          )}
          <Button size={compact ? 'xs' : 'sm'} className={cn('mt-1', actionClassName)} onClick={onLogin}>
            로그인하고 보기
          </Button>
        </>
      )}
    </div>
  )
}
