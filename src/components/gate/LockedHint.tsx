import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'

interface LockedHintProps {
  onLogin: () => void
  children: ReactNode
}

/** 잠긴 구간 안내 — 자물쇠와 문구를 누르면 로그인으로 보낸다 */
export function LockedHint({ onLogin, children }: LockedHintProps) {
  return (
    <button
      type="button"
      onClick={onLogin}
      className="-mx-1 flex cursor-pointer items-center gap-1 rounded-sm px-1 text-caption text-foreground-secondary outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Lock className="size-3 shrink-0" strokeWidth={2.5} />
      {children}
    </button>
  )
}
