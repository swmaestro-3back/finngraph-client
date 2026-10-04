import { ChevronLeft } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Button, ButtonLink } from '@/components/fg/Button'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { ThemeGraphLink } from '@/components/fg/ThemeActions'
import { ThemeConstituents } from '@/components/fg/ThemeConstituents'
import { ThemeDetailHeader } from '@/components/fg/ThemeDetailHeader'
import { ThemeIndexNews } from '@/components/fg/ThemeIndexNews'
import { ThemeTodayLeaders } from '@/components/fg/ThemeTodayLeaders'
import { ThemeTopThree } from '@/components/fg/ThemeTopThree'
import { useAutoRefresh } from '@/lib/autoRefresh'
import { themeSelectPath } from '@/lib/fg/paths'
import { parseThemeId, themeBasisLabel } from '@/lib/fg/themes'
import { useDelayed } from '@/lib/fg/useDelayed'
import { useBackTarget } from '@/lib/navigation'
import { useThemeDetail } from '@/lib/queries/useThemeDetail'
import { useThemeIndex } from '@/lib/queries/useThemeIndex'
import { useThemeMarket } from '@/lib/queries/useThemeMarket'
import { useThemeStocks } from '@/lib/queries/useThemeStocks'

export default function ThemeDetailPage() {
  const { themeId } = useParams()
  const id = parseThemeId(themeId)
  return <ThemeDetailView key={id ?? 'none'} id={id} />
}

function ThemeDetailView({ id }: { id: number | null }) {
  const { pathname } = useLocation()
  const back = useBackTarget({ to: id === null ? '/themes' : themeSelectPath(id), label: '테마' })
  const detail = useThemeDetail(id)
  const stocks = useThemeStocks(id)
  const index = useThemeIndex(id)
  const market = useThemeMarket()
  const [refreshKey, setRefreshKey] = useState(0)

  const { refresh: refreshDetail } = detail
  const { refresh: refreshStocks } = stocks
  const { refresh: refreshIndex } = index
  const { refresh: refreshMarket } = market
  const refreshPrices = useCallback(() => {
    refreshDetail()
    refreshStocks()
    refreshIndex()
    refreshMarket()
    setRefreshKey((key) => key + 1)
  }, [refreshDetail, refreshStocks, refreshIndex, refreshMarket])
  useAutoRefresh(refreshPrices, market.data)
  const indexFailed = index.error !== null && index.data === null

  const theme = detail.data
  const skeleton = useDelayed(theme === null && detail.error === null)
  const notFound = id === null || detail.error?.isNotFound === true

  let body: ReactNode
  if (notFound) {
    body = (
      <section className="fg-section">
        <StateBlock
          kind="empty"
          title="이 테마를 찾지 못했어요"
          description="목록에서 다른 테마를 골라 주세요"
          action={
            <ButtonLink to="/themes" size="sm">
              테마 목록 보기
            </ButtonLink>
          }
        />
      </section>
    )
  } else if (detail.error && theme === null) {
    body = (
      <section className="fg-section">
        <StateBlock
          kind="error"
          title="데이터를 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요"
          action={
            <Button size="sm" onClick={detail.refetch}>
              다시 시도
            </Button>
          }
        />
      </section>
    )
  } else if (theme === null) {
    body = skeleton ? (
      <>
        <Skeleton height={248} shape="card" />
        <div className="fg-grid" aria-hidden="true">
          <div className="fg-col">
            <Skeleton height={480} shape="card" />
          </div>
          <div className="fg-rail">
            <Skeleton height={200} shape="card" />
          </div>
        </div>
      </>
    ) : null
  } else {
    body = (
      <>
        <ThemeDetailHeader
          theme={theme}
          basis={themeBasisLabel(market.data)}
          index={index.data}
          indexFailed={indexFailed}
          onRetryIndex={index.refetch}
          stocks={stocks.data}
        />
        <div className="fg-grid fg-reveal">
          <div className="fg-col">
            <ThemeTopThree theme={theme} stocks={stocks.data} from={pathname} refreshKey={refreshKey} />
            <ThemeIndexNews
              theme={theme}
              index={index.data}
              indexFailed={indexFailed}
              onRetryIndex={index.refetch}
              refreshKey={refreshKey}
            />
            <ThemeConstituents
              stocks={stocks.data}
              loading={stocks.loading}
              error={stocks.error}
              onRetry={stocks.refetch}
              themeCap={theme.marketCap}
              from={pathname}
            />
          </div>
          <aside className="fg-rail" aria-label="오늘 주도주">
            <div className="fg-tdp__stick">
              <ThemeTodayLeaders theme={theme} stocks={stocks.data} from={pathname} />
              <div className="fg-tdp__go">
                <ThemeGraphLink theme={theme} label="관계 탐색에서 보기" />
              </div>
              <Disclaimer />
            </div>
          </aside>
        </div>
      </>
    )
  }

  return (
    <div className="fg-main fg-wrap fg-tdp">
      <Link to={back.to} className="fg-tdp__back">
        <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
        {back.label}
      </Link>
      {body}
    </div>
  )
}
