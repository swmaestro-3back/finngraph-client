import { startTransition } from 'react'
import { User } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/fg/Button'
import { useAuth } from '@/lib/auth'
import { authSlot } from '@/lib/fg/nav'
import { logoutLanding } from '@/lib/memberGate'

export function UserMenu() {
  const { status, user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const slot = authSlot(status, user !== null)

  if (slot === 'pending') return <span className="fg-gh__slot" aria-hidden="true" />

  if (slot === 'login') {
    return (
      <Button
        size="sm"
        onClick={() => navigate('/login', { state: { next: `${location.pathname}${location.search}` } })}
      >
        로그인
      </Button>
    )
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="fg-gh__icon" aria-label="내 정보">
          <User size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="fg fg-umenu" align="end" sideOffset={8}>
          <DropdownMenu.Label className="fg-umenu__name">{user?.nickname}</DropdownMenu.Label>
          <DropdownMenu.Item asChild className="fg-umenu__item">
            <Link to="/me">마이페이지</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className="fg-umenu__item">
            <Link to="/me/account">계정 설정</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="fg-umenu__item"
            onSelect={() => {
              const landing = logoutLanding(location.pathname)
              startTransition(() => {
                if (landing) navigate(landing, { replace: true })
                logout()
              })
              toast.success('로그아웃했어요')
            }}
          >
            로그아웃
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
