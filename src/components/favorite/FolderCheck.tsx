// Lucian UX/UI Prompt #014 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#014
import type { InputHTMLAttributes } from 'react'

type FolderCheckProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>

export function FolderCheck(props: FolderCheckProps) {
  return (
    <>
      <input type="checkbox" className="fg-fcheck__in" {...props} />
      <span className="fg-fcheck" aria-hidden="true">
        <svg viewBox="0 0 22 22">
          <path d="M6.6 11.4l3.1 3.1 5.8-6.3" />
        </svg>
      </span>
    </>
  )
}
