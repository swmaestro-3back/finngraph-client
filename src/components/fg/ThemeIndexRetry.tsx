import { CircleAlert } from 'lucide-react'
import { Button } from '@/components/fg/Button'
import { cn } from '@/lib/utils'

interface ThemeIndexRetryProps {
  message: string
  onRetry: () => void
  className?: string
}

export function ThemeIndexRetry({ message, onRetry, className }: ThemeIndexRetryProps) {
  return (
    <div className={cn('fg-tdp__retry', className)} role="alert">
      <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
      <span>{message}</span>
      <Button onClick={onRetry}>다시 시도</Button>
    </div>
  )
}
