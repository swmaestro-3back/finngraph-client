import { FileText, Star, Waypoints } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'

const FEATURES = [
  {
    icon: Waypoints,
    title: '기업 관계 그래프',
    body: '공급·투자·인수 관계를 근거 뉴스와 공시까지 따라갑니다.',
  },
  {
    icon: FileText,
    title: '관계의 근거 문장',
    body: '간선마다 원문 문장과 출처를 바로 확인합니다.',
  },
  {
    icon: Star,
    title: '관심 종목·테마',
    body: '즐겨찾기로 모아 보고 관련 뉴스를 한곳에서 봅니다.',
  },
]

const rise = (delayMs: number) => ({ animationDelay: `${delayMs}ms` })

export function AuthBrandPanel() {
  return (
    <aside
      aria-label="finngraph 소개"
      className="hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:p-12 xl:p-14"
    >
      <Link to="/" className="self-start">
        <Logo tone="onPrimary" height={28} />
      </Link>

      <div className="my-auto max-w-md py-16">
        <h2
          className="text-display font-semibold leading-[1.15] tracking-[-0.8px] break-keep [text-wrap:balance] motion-safe:auth-rise"
          style={rise(0)}
        >
          주가가 움직인 '이유'까지,
          <br />
          한 화면에서.
        </h2>
        <p
          className="mt-5 max-w-[34ch] text-body leading-relaxed text-primary-foreground/80 break-keep [text-wrap:pretty] motion-safe:auth-rise"
          style={rise(90)}
        >
          테마에서 종목으로, 종목에서 뉴스·공시 근거와 기업 관계 그래프로 이어서 탐색합니다.
        </p>

        <ul className="mt-12 divide-y divide-primary-foreground/15 border-y border-primary-foreground/15">
          {FEATURES.map(({ icon: Icon, title, body }, index) => (
            <li
              key={title}
              className="flex gap-4 py-4 motion-safe:auth-rise"
              style={rise(200 + index * 80)}
            >
              <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
              <div className="min-w-0">
                <p className="text-body font-medium">{title}</p>
                <p className="mt-1 text-caption leading-relaxed text-primary-foreground/75 break-keep">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p
        className="max-w-[44ch] text-caption leading-relaxed text-primary-foreground/60 break-keep motion-safe:auth-rise"
        style={rise(520)}
      >
        시세와 지표는 거래일 장 마감 후 갱신되며, 제공되는 정보는 투자 판단의 근거로 사용할 수
        없습니다.
      </p>
    </aside>
  )
}
