import type { ReactNode } from 'react'

interface AccountRowProps {
  label: string
  labelId?: string
  children: ReactNode
}

export function AccountRow({ label, labelId, children }: AccountRowProps) {
  return (
    <div className="fg-acct-row">
      <dt id={labelId}>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
