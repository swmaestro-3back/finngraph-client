import type { ButtonHTMLAttributes, Ref } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'text'
type ButtonSize = 'md' | 'sm' | 'lg'

function buttonClass(variant: ButtonVariant, size: ButtonSize, className?: string): string {
  return cn('fg-btn', `fg-btn--${variant}`, size !== 'md' && `fg-btn--${size}`, className)
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  busy?: boolean
  ref?: Ref<HTMLButtonElement>
}

export function Button({
  variant = 'tertiary',
  size = 'md',
  busy = false,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} aria-busy={busy || undefined} {...rest}>
      {busy && <span className="fg-spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function ButtonLink({ variant = 'tertiary', size = 'md', className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />
}
