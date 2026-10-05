import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { FavoriteKind } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'
import { useFavorites } from '@/lib/favorites'

export interface FavoriteToggle {
  active: boolean
  press: () => boolean
}

export interface FavoriteToggles {
  isActive: (key: string) => boolean
  press: (key: string) => boolean
}

export function useFavoriteToggles(type: FavoriteKind): FavoriteToggles {
  const { status } = useAuth()
  const { has, isFull, toggle, limit } = useFavorites()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const isActive = (key: string) => status === 'authenticated' && has(type, key)
  const press = (key: string) => {
    if (status !== 'authenticated') {
      navigate('/login', { state: { next: pathname + search } })
      return false
    }
    const active = isActive(key)
    if (!active && isFull) {
      toast.error(`관심 목록은 ${limit}개까지예요`)
      return false
    }
    void toggle(type, key)
    return !active
  }
  return { isActive, press }
}

export function useFavoriteToggle(type: FavoriteKind, key: string): FavoriteToggle {
  const { isActive, press } = useFavoriteToggles(type)
  return { active: isActive(key), press: () => press(key) }
}
