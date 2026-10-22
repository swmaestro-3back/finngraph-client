// Lucian UX/UI Prompt #067 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#067
import { useState, type CSSProperties, type ReactNode } from 'react'

interface LockNoticeProps {
  seconds: number
  children: ReactNode
}

export function LockNotice({ seconds, children }: LockNoticeProps) {
  const [total, setTotal] = useState(seconds)
  if (seconds > total) setTotal(seconds)
  const progress = total > 0 ? Math.min(1, seconds / total) : 0

  return (
    <div role="alert" className="fg-au-lock" style={{ '--p': progress } as CSSProperties}>
      <span aria-hidden className="fg-au-lock__dial">
        <svg className="fg-au-lock__ring" viewBox="0 0 60 60">
          <circle className="fg-au-lock__t" cx="30" cy="30" r="25" />
          <circle className="fg-au-lock__p" cx="30" cy="30" r="25" pathLength={100} />
        </svg>
        <svg className="fg-au-lock__ic" viewBox="0 0 62 70">
          <path className="fg-au-lock__sh" d="M16 32V22a15 15 0 0 1 30 0v10" />
          <rect className="fg-au-lock__bd" x="6" y="30" width="50" height="38" rx="10" />
          <circle className="fg-au-lock__kh" cx="31" cy="47" r="5" />
          <rect className="fg-au-lock__kh" x="29" y="49" width="4" height="9" rx="2" />
        </svg>
      </span>
      <p className="fg-au-lock__tx">{children}</p>
    </div>
  )
}
