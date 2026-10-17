import { useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAutoRefresh } from '@/lib/autoRefresh'
import { kstToday } from '@/lib/calendar'
import { HUB_HOT_COUNT, parseHubQuery } from '@/lib/fg/hub'
import { themeBasisLabel } from '@/lib/fg/themes'
import { useHotThemes } from '@/lib/queries/useHotThemes'
import { useThemeIssues } from '@/lib/queries/useHubSlots'
import { refreshStocks } from '@/lib/queries/useStocksCached'
import { useThemeMarket } from '@/lib/queries/useThemeMarket'
import { HomeHub } from '@/pages/home/HomeHub'
import { HomeFeed, HomeMovers, HomeNote, HomeStockTable, HomeThemeTable, HomeWatchlist } from '@/pages/home/HomeSlots'

export default function HomePage() {
  const [today] = useState(() => kstToday(new Date()))
  const [refreshKey, setRefreshKey] = useState(0)
  const { search } = useLocation()
  const hubTab = useMemo(() => parseHubQuery(search).hub, [search])
  const market = useThemeMarket()
  const hot = useHotThemes(HUB_HOT_COUNT)
  const { refresh: refreshMarket } = market
  const { refresh: refreshHot } = hot
  const refresh = useCallback(() => {
    refreshMarket()
    refreshHot()
    refreshStocks()
    setRefreshKey((key) => key + 1)
  }, [refreshMarket, refreshHot])
  useAutoRefresh(refresh, market.data)
  const hotIds = useMemo(() => (hot.data ?? []).map((theme) => theme.id), [hot.data])
  const themeIssues = useThemeIssues(hotIds, null)
  const basis = themeBasisLabel(market.data)

  return (
    <div className="fg-main fg-wrap fg-home">
      <HomeHub market={market.data} hot={hot} today={today} refreshKey={refreshKey} />
      <div className="fg-home__grid">
        <div className="fg-home__col">
          <div className="fg-home__slot" data-slot="feed">
            <HomeFeed hot={hot.data} themeIssues={themeIssues} today={today} />
          </div>
          <div className="fg-home__slot" data-slot="hub-table">
            {hubTab === 'themes' && <HomeThemeTable hot={hot} issues={themeIssues} basis={basis} />}
            {hubTab === 'stocks' && <HomeStockTable basis={basis} />}
          </div>
        </div>
        <aside className="fg-home__rail" aria-label="종목에서 이슈로">
          <div className="fg-home__slot" data-slot="movers">
            <HomeMovers market={market.data} />
          </div>
          <div className="fg-home__slot" data-slot="watchlist">
            <HomeWatchlist market={market.data} />
          </div>
          <div className="fg-home__slot" data-slot="note">
            <HomeNote />
          </div>
        </aside>
      </div>
    </div>
  )
}
