// Lucian UX/UI Prompt #037 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#037
import { startTransition } from 'react'
import { LogOut } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/fg/Button'
import { LucianIcon } from '@/components/fg/LucianIcon'
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
          <LucianIcon name="user" size={20} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="fg fg-umenu" align="end" sideOffset={8}>
          <DropdownMenu.Label className="fg-umenu__name">{user?.nickname}</DropdownMenu.Label>
          <DropdownMenu.Item asChild className="fg-umenu__item">
            <Link to="/me/account">
              <LucianIcon name="settings" size={17} weight={1.9} className="fg-umenu__ico" />
              계정 설정
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="fg-umenu__item fg-umenu__item--out"
            onSelect={() => {
              const landing = logoutLanding(location.pathname)
              startTransition(() => {
                if (landing) navigate(landing, { replace: true })
                logout()
              })
              toast.success('로그아웃했어요')
            }}
          >
            <LogOut className="fg-umenu__ico" size={17} strokeWidth={1.9} aria-hidden="true" />
            로그아웃
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
