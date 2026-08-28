import type { NewsItem } from '@/data/news'
import { cn } from '@/lib/utils'

interface NewsSectionProps {
  title: string
  items: NewsItem[]
  className?: string
  listClassName?: string
  onItemClick?: (item: NewsItem) => void
}

const ROW =
  'flex w-full flex-col items-start gap-0.5 border-b border-surface-inset py-2.5 text-left hover:bg-muted'

export function NewsSection({
  title,
  items,
  className,
  listClassName,
  onItemClick,
}: NewsSectionProps) {
  return (
    <section
      className={cn(
        'flex flex-col card-surface p-5',
        className,
      )}
    >
      <h2 className="mb-[9px] flex min-h-[30px] items-center text-lg font-medium tracking-[-0.5px] text-foreground">
        {title}
      </h2>

      <div className="border-b border-border pb-1.5 text-caption text-muted-foreground">
        최신순 · {items.length}건
      </div>

      <div className={cn(listClassName)}>
        {items.map((item) => (
          <button key={item.id} type="button" onClick={() => onItemClick?.(item)} className={ROW}>
            <span className="w-full truncate text-sm font-medium text-foreground">
              {item.title}
            </span>
            <span className="text-caption text-muted-foreground">{item.meta}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
