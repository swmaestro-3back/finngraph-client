import { Waypoints } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { LucianIcon } from '@/components/fg/LucianIcon'

const FEATURES = [
  {
    icon: <Waypoints strokeWidth={1.9} />,
    title: '기업 관계 그래프',
    body: '공급·투자·인수 관계를 근거 뉴스와 공시까지 따라갑니다.',
  },
  {
    icon: <LucianIcon name="document" size={20} weight={1.9} />,
    title: '관계의 근거 문장',
    body: '간선마다 원문 문장과 출처를 바로 확인합니다.',
  },
  {
    icon: <LucianIcon name="star" size={20} weight={1.9} />,
    title: '관심 종목·테마',
    body: '즐겨찾기로 모아 보고 관련 뉴스를 한곳에서 봅니다.',
  },
]

const rise = (delayMs: number) => ({ animationDelay: `${delayMs}ms` })

export function AuthBrandPanel() {
  return (
    <aside
      aria-label="finngraph 소개"
      className="fg-au-brand hidden lg:flex lg:flex-col lg:p-12 xl:p-14"
    >
      <span aria-hidden className="fg-au-aura fg-au-aura--a" />
      <span aria-hidden className="fg-au-aura fg-au-aura--b" />
      <span aria-hidden className="fg-au-aura fg-au-aura--c" />
      <span aria-hidden className="fg-au-dots" />

      <Link to="/" className="fg-au-brand__logo">
        <Logo tone="onPrimary" height={28} />
      </Link>

      <div className="my-auto max-w-md py-16">
        <h2 className="fg-au-brand__h motion-safe:auth-rise" style={rise(0)}>
          주가가 움직인 <span className="fg-au-grad">'이유'</span>까지,
          <br />
          한 화면에서.
        </h2>
        <p className="fg-au-brand__p motion-safe:auth-rise" style={rise(90)}>
          테마에서 종목으로, 종목에서 뉴스·공시 근거와 기업 관계 그래프로 이어서 탐색합니다.
        </p>

        <ul className="fg-au-feats">
          {FEATURES.map(({ icon, title, body }, index) => (
            <li
              key={title}
              className="fg-au-feat motion-safe:auth-rise"
              style={rise(200 + index * 80)}
            >
              <span aria-hidden className="fg-au-feat__ic">
                {icon}
              </span>
              <div className="min-w-0">
                <p className="fg-au-feat__t">{title}</p>
                <p className="fg-au-feat__b">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="fg-au-brand__disc motion-safe:auth-rise" style={rise(520)}>
        시세와 지표는 거래일 장 마감 후 갱신되며, 제공되는 정보는 투자 판단의 근거로 사용할 수
        없습니다.
      </p>
    </aside>
  )
}
