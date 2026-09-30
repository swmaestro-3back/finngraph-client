import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

export const FREE_ISSUE_SLOTS = 3

export function lockedIssueCount(total: number, locked: boolean): number {
  return locked ? Math.max(0, total - FREE_ISSUE_SLOTS) : 0
}

const MEMBER_ONLY_PATHS = ['/me', '/briefing']

export function logoutLanding(pathname: string): string | null {
  const memberOnly = MEMBER_ONLY_PATHS.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  )
  return memberOnly ? '/' : null
}

export interface MemberGate {
  locked: boolean
  pending: boolean
  promptLogin: () => void
}

export function useMemberGate(): MemberGate {
  const { status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const promptLogin = useCallback(() => {
    navigate('/login', { state: { next: location.pathname + location.search } })
  }, [navigate, location.pathname, location.search])

  return {
    locked: status === 'anonymous',
    pending: status === 'loading',
    promptLogin,
  }
}
