import type { ReactNode } from 'react'

interface RowExpansionProps {
  children: ReactNode
  opening?: boolean
  closing?: boolean
}

export function RowExpansion({ children, opening = false, closing = false }: RowExpansionProps) {
  return (
    <div
      className="fg-trow__more"
      role="row"
      data-opening={opening ? 'true' : undefined}
      data-closing={closing ? 'true' : undefined}
      inert={closing || undefined}
    >
      <div role="cell" className="fg-trow__exp">
        <div className="fg-trow__expin">{children}</div>
      </div>
    </div>
  )
}
