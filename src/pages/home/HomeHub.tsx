import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { HubIssues } from '@/components/fg/HubIssues'
import { HubStocks } from '@/components/fg/HubStocks'
import { HubThemes } from '@/components/fg/HubThemes'
import type { HubLayout, HubTabLink, HubTabProps } from '@/components/fg/TimelineHub'
import type { ThemeMarketRes, ThemeRes } from '@/lib/apiTypes'
import { HUB_TABS, hubSearch, parseHubQuery, type HubQuery } from '@/lib/fg/hub'
import { themeBasisLabel } from '@/lib/fg/themes'
import { useMediaQuery } from '@/lib/fg/useMediaQuery'
import type { ApiState } from '@/lib/queries/useApi'
import { priceBasisSuffix, QUOTE_SOURCE_LABEL } from '@/lib/referenceDate'

const WIDE = '(min-width: 1024px)'
const NARROW = '(max-width: 767px)'

function pickOf(query: HubQuery): string | null {
  if (query.hub === 'issues') return query.issue
  if (query.hub === 'stocks') return query.stock
  return query.theme === null ? null : String(query.theme)
}

interface HomeHubProps {
  market: ThemeMarketRes | null
  hot: ApiState<ThemeRes[] | null>
  today: string
  refreshKey: number
}

export function HomeHub({ market, hot, today, refreshKey }: HomeHubProps) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const query = useMemo(() => parseHubQuery(search), [search])
  const wide = useMediaQuery(WIDE)
  const narrow = useMediaQuery(NARROW)
  const layout: HubLayout = wide ? 'wide' : narrow ? 'mobile' : 'inline'

  const tab = query.hub
  const onPick = useCallback(
    (next: string | null) => {
      const target = hubSearch(search, tab, next)
      if (target !== search) navigate({ pathname, search: target }, { replace: true })
    },
    [navigate, pathname, search, tab],
  )
  const tabs = useMemo<HubTabLink[]>(
    () => HUB_TABS.map((option) => ({ key: option.value, label: option.label, to: `${pathname}${hubSearch(search, option.value, null)}` })),
    [pathname, search],
  )
  const basisShort = market?.baseDate ? `${priceBasisSuffix(market)} · ${QUOTE_SOURCE_LABEL}` : null
  const props: HubTabProps = {
    layout,
    tabs,
    basis: themeBasisLabel(market),
    basisShort,
    market,
    pick: pickOf(query),
    onPick,
    today,
    from: `${pathname}${search}`,
    refreshKey,
  }
  if (tab === 'issues') return <HubIssues {...props} />
  if (tab === 'themes') return <HubThemes {...props} hot={hot} />
  return <HubStocks {...props} />
}
