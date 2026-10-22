// Lucian Icons · MIT License (c) 2026 Lucian · https://lucianlabs.dev/icons/
import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { LucianIconName } from '@/vendor/lucian-icons'
import '@/vendor/lucian-icons'

interface LucianIconProps {
  name: LucianIconName
  size?: number
  weight?: number
  state?: string
  label?: string
  className?: string
}

const WORD = /^[a-z]+$/
const BASE_WEIGHT = 1.75

function markup(name: LucianIconName, size: number, weight: number, state: string | undefined): string {
  const stroke = weight === BASE_WEIGHT ? '' : ` weight="${weight}"`
  const initial = state && WORD.test(state) ? ` state="${state}"` : ''
  return `<lucian-${name} tone="line" size="${size}"${stroke}${initial}></lucian-${name}>`
}

function IconHost({ name, size = 24, weight = BASE_WEIGHT, state, label, className }: LucianIconProps) {
  const host = useRef<HTMLSpanElement>(null)
  const [html] = useState(() => markup(name, size, weight, state))
  useLayoutEffect(() => {
    const icon = host.current?.firstElementChild
    if (icon && state && WORD.test(state) && icon.getAttribute('state') !== state) icon.setAttribute('state', state)
  }, [state])
  return (
    <span
      ref={host}
      className={cn('fg-li', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export function LucianIcon(props: LucianIconProps) {
  const { name, size = 24, weight = BASE_WEIGHT } = props
  return <IconHost key={`${name}:${size}:${weight}`} {...props} />
}
