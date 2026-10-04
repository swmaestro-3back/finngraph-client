import { cn } from '@/lib/utils'

type LogoSize = 16 | 24 | 32 | 40

interface CompanyLogoProps {
  name: string
  src?: string | null
  size?: LogoSize
  className?: string
}

export function CompanyLogo({ name, src = null, size = 32, className }: CompanyLogoProps) {
  return (
    <i
      className={cn('fg-clogo', size !== 32 && `fg-clogo--${size}`, className)}
      data-img={src ? 'true' : undefined}
      style={src ? { backgroundImage: `url(${JSON.stringify(src)})` } : undefined}
      aria-hidden="true"
    >
      {name.slice(0, 1)}
    </i>
  )
}
