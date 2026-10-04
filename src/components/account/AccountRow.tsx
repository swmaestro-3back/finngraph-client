import type { ReactNode } from 'react'

interface AccountRowProps {
  label: string
  labelId?: string
  children: ReactNode
}

export function AccountRow({ label, labelId, children }: AccountRowProps) {
  return (
    <div className="grid gap-1.5 border-b border-surface-inset py-3.5 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-4">
      <dt id={labelId} className="pt-1 text-caption text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-body text-foreground">{children}</dd>
    </div>
  )
}
