import { DATA_SOURCE_NOTICE } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

interface DataNoticeProps {
  className?: string
}

export function DataNotice({ className }: DataNoticeProps) {
  return (
    <p className={cn('text-caption text-muted-foreground break-keep [text-wrap:pretty]', className)}>
      {DATA_SOURCE_NOTICE}
    </p>
  )
}
