import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Popover } from 'radix-ui'
import { cn } from '@/lib/utils'

interface InfoPopoverProps {
  /** 버튼 접근성 이름이자 팝오버 제목 */
  title: string
  className?: string
  children: ReactNode
}

/** 제목 옆 작은 ⓘ — 누르면 계산 방식·읽는 법을 띄운다 (테마 대시보드 트리맵, 종목 상세 테마 내 비교) */
export function InfoPopover({ title, className, children }: InfoPopoverProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={title}
          className={cn(
            'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors -m-3 hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary',
            className,
          )}
        >
          <Info className="size-3.5" aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className="z-50 w-[min(320px,calc(100vw-32px))] rounded-xl border border-border bg-background p-4 shadow-soft outline-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <p className="mb-2 text-caption font-semibold text-foreground">{title}</p>
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
