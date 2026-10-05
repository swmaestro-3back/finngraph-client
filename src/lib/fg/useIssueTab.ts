import { useLocation } from 'react-router-dom'
import { issueTabSearch, type IssueTab } from '@/lib/fg/issuePage'
import { navState } from '@/lib/fg/stockDetail'

export function useIssueTabTarget() {
  const { pathname, search, state } = useLocation()
  return (tab: IssueTab) => ({
    to: { pathname, search: issueTabSearch(search, tab) },
    state: navState(state),
    replace: true,
  })
}
