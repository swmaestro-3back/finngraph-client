import { cn } from '@/lib/utils'

interface ChangeStatusTagProps {
  /** themeMetrics.changeStatusTag()의 결과 */
  tag: { label: string; title: string }
  className?: string
}

/** 거래정지·정리매매처럼 등락률을 못 낸 사유 — 등락률 칸 옆에 작은 테두리 라벨로 */
export function ChangeStatusTag({ tag, className }: ChangeStatusTagProps) {
  return (
    <span
      title={tag.title}
      className={cn(
        'rounded border border-border px-1.5 py-0.5 text-caption leading-none text-muted-foreground',
        className,
      )}
    >
      {tag.label}
    </span>
  )
}
