import { Button } from '@/components/fg/Button'
import { LucianIcon } from '@/components/fg/LucianIcon'
import { cn } from '@/lib/utils'

interface ThemeIndexRetryProps {
  message: string
  onRetry: () => void
  className?: string
}

export function ThemeIndexRetry({ message, onRetry, className }: ThemeIndexRetryProps) {
  return (
    <div className={cn('fg-tdp__retry', className)} role="alert">
      <LucianIcon name="alert" size={16} />
      <span>{message}</span>
      <Button onClick={onRetry}>다시 시도</Button>
    </div>
  )
}
