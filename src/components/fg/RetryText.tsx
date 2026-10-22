import { LucianIcon } from '@/components/fg/LucianIcon'
import { josa } from '@/lib/josa'
import { cn } from '@/lib/utils'

interface RetryTextProps {
  subject: string
  onRetry: () => void
  className?: string
}

export function RetryText({ subject, onRetry, className }: RetryTextProps) {
  return (
    <button
      type="button"
      className={cn('fg-retry', className)}
      aria-label={`${subject}${josa(subject, '을/를')} 불러오지 못했어요. 다시 시도`}
      onClick={onRetry}
    >
      <LucianIcon name="alert" size={14} />
      다시 시도
    </button>
  )
}

export function RetryNote({ subject, onRetry, className }: RetryTextProps) {
  return (
    <p className={cn('fg-qretry', className)} role="status">
      <span>{`${subject}${josa(subject, '을/를')} 불러오지 못했어요`}</span>
      <RetryText subject={subject} onRetry={onRetry} />
    </p>
  )
}

interface QuoteRetryNoteProps {
  onRetry: () => void
  className?: string
}

export function QuoteRetryNote({ onRetry, className }: QuoteRetryNoteProps) {
  return <RetryNote subject="시세" onRetry={onRetry} className={className} />
}
