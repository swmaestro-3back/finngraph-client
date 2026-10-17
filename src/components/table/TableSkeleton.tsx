import { cn } from '@/lib/utils'

interface TableSkeletonProps {
  rows: number
  /** 행 높이 — 기본 h-8, 뉴스 목록은 h-10 */
  rowClassName?: string
}

/** 목록이 오기 전 자리 — 행 수와 높이만 다르고 틀은 같다 */
export function TableSkeleton({ rows, rowClassName = 'h-8' }: TableSkeletonProps) {
  return (
    <div className="card-surface overflow-hidden p-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={cn('mb-2 animate-pulse rounded bg-muted', rowClassName)} />
      ))}
    </div>
  )
}
