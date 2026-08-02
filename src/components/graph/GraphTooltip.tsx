import type { RefObject } from 'react'

/**
 * 그래프 캔버스의 호버 툴팁 껍데기.
 *
 * 커서를 따라다녀야 해서 radix Tooltip 대신 직접 위치를 잡는다.
 * 내용·위치 갱신은 `@/lib/graphTooltip`의 헬퍼가 담당한다.
 */
export function GraphTooltip({ ref }: { ref: RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-[1000] max-w-[280px] rounded-lg border border-border bg-background/95 px-3 py-2 text-xs text-foreground opacity-0 shadow-[var(--shadow-soft)] transition-opacity duration-100"
    />
  )
}
