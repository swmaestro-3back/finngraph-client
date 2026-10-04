import { AgendaPanel } from '@/components/calendar/detail/AgendaPanel'
import { BonusPanel } from '@/components/calendar/detail/BonusPanel'
import { DividendPanel } from '@/components/calendar/detail/DividendPanel'
import { RightsPanel } from '@/components/calendar/detail/RightsPanel'
import type { CorporateActionRes } from '@/lib/apiTypes'

interface FamilyPanelProps {
  ticker: string
  action: CorporateActionRes
  price: number | null
  today: string
}

export function FamilyPanel({ ticker, action, price, today }: FamilyPanelProps) {
  switch (action.family) {
    case 'DIV':
      return <DividendPanel ticker={ticker} action={action} price={price} />
    case 'AGM':
      return <AgendaPanel action={action} />
    case 'RIGHTS':
      return <RightsPanel action={action} />
    case 'BONUS':
      return <BonusPanel action={action} today={today} />
  }
}
