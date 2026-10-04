import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { FavoriteKind } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'
import { useFavorites } from '@/lib/favorites'

export interface FavoriteToggle {
  active: boolean
  press: () => boolean
}

export function useFavoriteToggle(type: FavoriteKind, key: string): FavoriteToggle {
  const { status } = useAuth()
  const { has, isFull, toggle, limit } = useFavorites()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const active = status === 'authenticated' && has(type, key)
  const press = () => {
    if (status !== 'authenticated') {
      navigate('/login', { state: { next: pathname + search } })
      return false
    }
    if (!active && isFull) {
      toast.error(`관심 목록은 ${limit}개까지예요`)
      return false
    }
    void toggle(type, key)
    return !active
  }
  return { active, press }
}
