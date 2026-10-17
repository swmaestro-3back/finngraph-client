import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import type { ReactNode, RefObject } from 'react'
import { cn } from '@/lib/utils'

interface SideSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  meta?: ReactNode
  closeLabel: string
  returnFocusRef?: RefObject<HTMLElement | null>
  variant?: 'side' | 'modal'
  children: ReactNode
}

export function SideSheet({
  open,
  onOpenChange,
  title,
  meta,
  closeLabel,
  returnFocusRef,
  variant = 'side',
  children,
}: SideSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fg-scrim" />
        <Dialog.Content
          className={cn('fg fg-sidesheet', variant === 'modal' && 'fg-sidesheet--modal')}
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            if (!returnFocusRef?.current) return
            event.preventDefault()
            returnFocusRef.current.focus()
          }}
        >
          <div className="fg-sheet__head">
            <div className="fg-sheet__titles">
              {meta}
              <Dialog.Title className="fg-sheet__title">{title}</Dialog.Title>
            </div>
            <Dialog.Close className="fg-close" aria-label={closeLabel}>
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="fg-sheet__body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
