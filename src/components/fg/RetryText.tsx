import { CircleAlert } from 'lucide-react'
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
      <CircleAlert size={14} strokeWidth={1.75} aria-hidden="true" />
      다시 시도
    </button>
  )
}

interface QuoteRetryNoteProps {
  onRetry: () => void
  className?: string
}

export function QuoteRetryNote({ onRetry, className }: QuoteRetryNoteProps) {
  return (
    <p className={cn('fg-qretry', className)} role="status">
      <span>시세를 불러오지 못했어요</span>
      <RetryText subject="시세" onRetry={onRetry} />
    </p>
  )
}
