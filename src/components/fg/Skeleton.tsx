import { cn } from '@/lib/utils'

interface SkeletonProps {
  width?: number | string
  height: number | string
  shape?: 'control' | 'chip' | 'card'
  className?: string
}

export function Skeleton({ width = '100%', height, shape = 'control', className }: SkeletonProps) {
  return (
    <div
      className={cn('fg-skel', shape !== 'control' && `fg-skel--${shape}`, className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}
