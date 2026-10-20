import { ArrowRight, ChevronRight, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { RetryNote } from '@/components/fg/RetryText'
import { Skeleton } from '@/components/fg/Skeleton'
import { useFavorites } from '@/lib/favorites'
import { fitCompanies, innerLinks, linkArrow } from '@/lib/fg/folders'
import { buildLinkedCompanies, EMPTY_LINK_GRAPH, ISSUE_LINK_SOURCES } from '@/lib/fg/linkedCompanies'
import { stockPath } from '@/lib/fg/paths'
import { linkEvidenceCount } from '@/lib/fg/stockLinks'
import { fromState } from '@/lib/navigation'
import { useIssueLinks, useLinkGraphs } from '@/lib/queries/useLinkedCompanies'

const FIT_LIMIT = 3

interface FolderRailProps {
  members: readonly { name: string; ticker: string }[]
  folder: { id: number; name: string } | null
}

export function FolderRail({ members, folder }: FolderRailProps) {
  const { pathname, search } = useLocation()
  const { has, toggle, addToFolder } = useFavorites()
  const sources = useMemo(() => members.slice(0, ISSUE_LINK_SOURCES), [members])
  const graphs = useLinkGraphs(sources.map((member) => member.ticker))
  const links = useIssueLinks(sources.length > 0 ? sources : null, null)
  const state = fromState(`${pathname}${search}`)
  const scope = folder ? folder.name : '관심 종목'

  const inner = useMemo(() => {
    if (!graphs.data) return null
    const lists = new Map(
      sources.map((member) => [
        member.ticker,
        buildLinkedCompanies(graphs.data?.get(member.ticker) ?? EMPTY_LINK_GRAPH, member.ticker, member.name),
      ]),
    )
    return innerLinks(members, lists)
  }, [graphs.data, sources, members])

  const fits = useMemo(() => {
    if (!links.links) return null
    const held = new Set(members.map((member) => member.ticker))
    return fitCompanies(
      links.links.filter((link) => link.company.code === null || !held.has(link.company.code)),
      FIT_LIMIT,
    )
  }, [links.links, members])

  if (members.length === 0) return null

  const add = (ticker: string, name: string, anchor: HTMLElement) => {
    if (folder) void addToFolder(folder.id, 'STOCK', ticker)
    else void toggle('STOCK', ticker, { label: name, anchor })
  }

  return (
    <>
      <section className="fg-section fg-mine__rsec" aria-labelledby="fg-mine-inner">
        <div className="fg-mine__rhead">
          <h2 id="fg-mine-inner" className="fg-section__title">
            담은 종목끼리 이어진 관계
          </h2>
          <p className="fg-mine__rsub">
            {inner && inner.length > 0
              ? `공급망 관계 ${inner.length}곳 · 근거가 있는 연결만`
              : `${scope} 안의 공급·고객·투자 관계 · 근거가 있는 연결만`}
          </p>
        </div>
        {graphs.error ? (
          <RetryNote subject="관계" onRetry={graphs.retry} />
        ) : inner === null ? (
          <Skeleton height={72} />
        ) : inner.length === 0 ? (
          <p className="fg-mine__rempty">아직 담은 종목끼리 직접 이어진 관계가 없어요</p>
        ) : (
          <ol className="fg-mine__links">
            {inner.map((link) => {
              const arrow = linkArrow(link)
              return (
                <li key={link.key}>
                  {arrow ? (
                    <>
                      <span className="fg-sr">{link.company.title}</span>
                      <span className="fg-mine__arrowline" aria-hidden="true">
                        <b>{arrow.from}</b>
                        <ArrowRight size={16} strokeWidth={1.75} className="fg-mine__arrow" />
                        <b>{arrow.to}</b>
                        <span className="fg-mine__linktag">{arrow.label}</span>
                      </span>
                    </>
                  ) : (
                    link.company.title
                  )}
                </li>
              )
            })}
          </ol>
        )}
        <Link to={`/graph/${encodeURIComponent(members[0].ticker)}`} state={state} className="fg-sdmore">
          {folder ? '관계 탐색에서 이 테마 지도로 보기' : '관계 탐색에서 지도로 보기'}
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </section>

      <section className="fg-section fg-mine__rsec" aria-labelledby="fg-mine-fit">
        <div className="fg-mine__rhead">
          <h2 id="fg-mine-fit" className="fg-section__title">
            {folder ? '이 테마에 어울리는 기업' : '관심 종목과 이어진 기업'}
          </h2>
          <p className="fg-mine__rsub">아직 담지 않았지만 관계로 이어진 기업이에요</p>
        </div>
        {links.error ? (
          <RetryNote subject="이어진 기업" onRetry={links.retry} />
        ) : fits === null ? (
          <Skeleton height={120} />
        ) : fits.length === 0 ? (
          <p className="fg-mine__rempty">관계로 이어진 상장 기업을 아직 찾지 못했어요</p>
        ) : (
          <ul className="fg-mine__fits">
            {fits.map(({ company }) => {
              const ticker = company.code ?? ''
              const held = has('STOCK', ticker)
              return (
                <li key={company.id} className="fg-mine__fit">
                  <span className="fg-mine__fittop">
                    <Link to={stockPath(ticker)} state={state} className="fg-mine__fitname">
                      <CompanyLogo name={company.name} ticker={ticker} size={24} />
                      {company.name}
                    </Link>
                    {!company.confirmed && <span className="fg-mine__ai">AI 추론</span>}
                  </span>
                  <span className="fg-mine__fitwhy">
                    {company.title}
                    {linkEvidenceCount(company) > 0 && (
                      <b className="fg-mine__fitev fg-num">{` · 근거 ${linkEvidenceCount(company)}건`}</b>
                    )}
                  </span>
                  {!held || folder ? (
                    <Button
                      size="sm"
                      onClick={(event) => add(ticker, company.name, event.currentTarget)}
                    >
                      <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
                      {folder ? `${folder.name}에 담기` : '관심에 담기'}
                    </Button>
                  ) : (
                    <span className="fg-mine__fitheld">관심에 담겨 있어요</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
