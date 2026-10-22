import { LucianIcon } from '@/components/fg/LucianIcon'
import { cn } from '@/lib/utils'

export const SOURCE_DISCLAIMER = '요약과 연결 정보는 인용된 기사·공시로 만든 참고 자료이며 투자 권유가 아니에요.'

interface DisclaimerProps {
  text?: string
  className?: string
}

export function Disclaimer({ text = SOURCE_DISCLAIMER, className }: DisclaimerProps) {
  return (
    <p className={cn('fg-note', className)}>
      <LucianIcon name="info" size={16} />
      <span>{text}</span>
    </p>
  )
}
