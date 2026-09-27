import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { kakaoConfigured, startKakaoLogin } from '@/lib/kakao'

interface KakaoSignInProps {
  next: string
  disabled?: boolean
}

function KakaoSymbol() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4.5 fill-current">
      <path d="M12 3C6.48 3 2 6.53 2 10.9c0 2.8 1.86 5.26 4.66 6.65l-1.03 3.8c-.08.3.26.55.52.38l4.55-3.02c.42.05.86.08 1.3.08 5.52 0 10-3.53 10-7.9S17.52 3 12 3Z" />
    </svg>
  )
}

export function KakaoSignIn({ next, disabled = false }: KakaoSignInProps) {
  if (!kakaoConfigured()) return null

  return (
    <>
      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-caption text-muted-foreground">또는</span>
        <Separator className="flex-1" />
      </div>
      <Button
        type="button"
        size="lg"
        className="h-10 w-full gap-2 border-0 bg-[#FEE500] font-semibold text-[#191919] hover:bg-[#FEE500]/90 active:bg-[#FEE500]/80"
        disabled={disabled}
        onClick={() => startKakaoLogin(next)}
      >
        <KakaoSymbol />
        카카오로 시작하기
      </Button>
    </>
  )
}
