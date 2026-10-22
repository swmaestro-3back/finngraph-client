// Lucian UX/UI Prompt #090 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#090
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { LucianIcon } from '@/components/fg/LucianIcon'
import { cn } from '@/lib/utils'

type StateKind = 'empty' | 'error' | 'not-ready'

const ICONS = { empty: 'inbox', 'not-ready': 'clock' } as const
const TRY_MS = 1600

interface StateBlockProps {
  kind: StateKind
  title: string
  description?: string
  action?: ReactNode
  art?: ReactNode
  className?: string
}

function UnpluggedArt() {
  return (
    <svg className="fg-state__plug" viewBox="0 0 220 70" aria-hidden="true">
      <g className="fg-state__plugl">
        <path className="fg-state__cord" d="M-14 54C24 54 40 35 72 35" />
        <path className="fg-state__prong" d="M100 28h14M100 42h14" />
        <rect className="fg-state__body" x="68" y="19" width="34" height="32" rx="8" />
      </g>
      <g className="fg-state__spark">
        <path d="M121 20l-2-7M129 24l5-5M113 24l-5-5M121 50l-2 7M129 46l5 5M113 46l-5 5" />
      </g>
      <g className="fg-state__plugr">
        <rect className="fg-state__body" x="124" y="17" width="38" height="36" rx="9" />
        <path className="fg-state__hole" d="M124 28h6M124 42h6" />
        <circle className="fg-state__led" cx="153" cy="25" r="3" />
        <path className="fg-state__cord" d="M162 35C188 35 194 16 236 16" />
      </g>
    </svg>
  )
}

export function StateBlock({ kind, title, description, action, art, className }: StateBlockProps) {
  const [trying, setTrying] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (kind !== 'error' || !(event.target instanceof Element) || !event.target.closest('button, a')) return
    window.clearTimeout(timer.current)
    setTrying(true)
    timer.current = window.setTimeout(() => setTrying(false), TRY_MS)
  }

  let visual: ReactNode
  if (art) {
    visual = (
      <div className="fg-state__art" aria-hidden="true">
        {art}
      </div>
    )
  } else if (kind === 'error') {
    visual = <UnpluggedArt />
  } else {
    visual = (
      <div className="fg-state__icon" aria-hidden="true">
        <LucianIcon name={ICONS[kind]} size={20} />
      </div>
    )
  }

  return (
    <div
      className={cn('fg-state', `fg-state--${kind}`, className)}
      role={kind === 'error' ? 'alert' : 'status'}
      data-try={trying || undefined}
      onClickCapture={onClickCapture}
    >
      {visual}
      <p className="fg-state__title">{title}</p>
      {description && <p className="fg-state__desc">{description}</p>}
      {action}
    </div>
  )
}
