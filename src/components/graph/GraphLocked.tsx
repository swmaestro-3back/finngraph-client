import { useId } from 'react'
import { ChevronRight, FileText, Layers, Lock, Search, Share2 } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { GraphBackdrop } from '@/components/graph/GraphBackdrop'
import { Button } from '@/components/ui/button'
import type { GraphFocus } from '@/data/graphTypes'
import { useIsMobile } from '@/hooks/use-mobile'
import { EXAMPLE_PATH } from '@/lib/graphStart'
import { useStockIndex } from '@/lib/queries/useStocksCached'
import { cn } from '@/lib/utils'

interface Props {
  focus: GraphFocus
  ready: boolean
}

const PERKS = [
  { Icon: Share2, title: '공급처·납품처·지분 관계', text: '누가 누구에게 무엇을 대는지 한눈에' },
  { Icon: FileText, title: '관계마다 근거 기사·공시', text: '어디서 나온 관계인지 문장으로 확인' },
  { Icon: Layers, title: '2·3단계로 넓혀 보기', text: '이어진 기업의 그다음 연결까지' },
] as const

export function GraphLocked({ focus, ready }: Props) {
  const isMobile = useIsMobile()
  const titleId = useId()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const stocks = useStockIndex()
  const isTheme = focus.kind === 'theme'
  const name = isTheme ? focus.name : (stocks?.get(focus.ticker)?.name ?? focus.ticker)
  const next = `${pathname}${search}`

  return (
    <GraphBackdrop>
      <button
        type="button"
        onClick={() => navigate('/graph')}
        aria-label={`${name} — 다른 기업 고르기`}
        className="absolute top-3 left-3 z-10 flex h-10.5 max-w-[calc(100%-1.5rem)] cursor-pointer items-center gap-2 rounded-lg border border-border bg-background/90 pr-3 pl-3 shadow-soft backdrop-blur hover:border-border-strong md:h-11.5 md:pr-3.5"
      >
        <span className="min-w-0 truncate text-body font-semibold text-foreground md:text-[15px]">{name}</span>
        <span className="shrink-0 font-mono text-caption text-muted-foreground">
          {isTheme ? '테마' : focus.ticker}
        </span>
        <Search className="ml-1.5 size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
      </button>
      {ready && (
        <section
          aria-labelledby={titleId}
          className={cn(
            'absolute z-10 flex flex-col gap-4 bg-background text-foreground',
            isMobile
              ? 'inset-x-0 bottom-0 rounded-t-2xl px-4 pt-5 pb-5 shadow-[0_-12px_28px_-8px_rgb(0_0_0/0.25)] animate-in fade-in-0 slide-in-from-bottom-6 duration-300 motion-reduce:animate-none'
              : 'top-1/2 left-1/2 w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-[0_24px_48px_-12px_rgb(0_0_0/0.3)] animate-in fade-in-0 zoom-in-95 duration-200 motion-reduce:animate-none',
          )}
        >
          <div className="flex flex-col gap-1.5">
            <span className="grid size-9 place-items-center rounded-full border border-border text-foreground-secondary">
              <Lock className="size-4" strokeWidth={2} />
            </span>
            <h2 id={titleId} className="m-0 mt-1 text-lg leading-[1.4] font-semibold tracking-[-0.3px] break-keep">
              {isTheme ? `${name} 테마의 기업들은 로그인하면 보여요` : `${name}의 관계는 로그인하면 보여요`}
            </h2>
            <p className="m-0 text-body text-muted-foreground">
              {isTheme
                ? '이 테마에 속한 기업과 서로 이어진 관계를 한 화면에 모아 보여 드려요.'
                : '이 기업과 공급·투자·이벤트로 이어진 곳을 한 화면에 모아 보여 드려요.'}
            </p>
          </div>
          <ul className="m-0 flex list-none flex-col gap-2.5 rounded-xl bg-muted px-3.5 py-3">
            {PERKS.map(({ Icon, title, text }) => (
              <li key={title} className="flex items-start gap-2.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2} />
                <div className="flex flex-col">
                  <span className="text-body font-semibold text-foreground">{title}</span>
                  <span className="text-caption text-muted-foreground">{text}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" onClick={() => navigate('/login', { state: { next } })}>
              로그인하고 보기
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/signup', { state: { next } })}>
              회원가입
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link to={EXAMPLE_PATH} className="fg-sdmore">
              예시 그래프 둘러보기
              <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <Link
              to="/graph"
              className="text-body text-muted-foreground underline decoration-border underline-offset-[3px] hover:text-foreground"
            >
              다른 기업 고르기
            </Link>
          </div>
        </section>
      )}
    </GraphBackdrop>
  )
}
