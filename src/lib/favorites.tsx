// 관심 즐겨찾기의 단일 원본 — 백엔드 SCRUM-199
//
// Provider로 만든 이유: 별표가 종목 상세·테마 상세·종목 목록·트리맵·마이페이지
// 다섯 군데에 흩어져 있는데, 화면마다 목록을 따로 불러오면 한 곳에서 토글한 결과가
// 다른 곳에 반영되지 않는다. react-query가 없는 저장소라 auth.tsx와 같은 Context 패턴을 쓴다.
//
// 목록 한 벌이 두 가지 용도를 겸한다 — 별표는 키 집합만 보면 되고(파생 Set),
// 마이페이지는 보강 필드까지 쓴다. 등록은 상세·목록에서만 일어나고 마이페이지는
// 해제만 하므로, 등록 직후 보강이 비어 있는 항목이 화면에 노출되는 경로가 없다.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import { ApiError, deleteData, getData, putData } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { FavoriteItemRes, FavoriteKind, FavoriteListRes } from '@/lib/apiTypes'

/** 키 집합의 원소 형식 — 유형이 달라도 키가 겹칠 수 있어 유형을 접두로 붙인다 */
export function favoriteKey(type: FavoriteKind, key: string): string {
  return `${type}:${key}`
}

interface FavoriteState {
  /** 로그인 상태에서 목록을 한 번이라도 받았는가 — 별표 초기 깜빡임을 막는 데 쓴다 */
  ready: boolean
  error: boolean
  items: FavoriteItemRes[]
  count: number
  limit: number
  isFull: boolean
  has: (type: FavoriteKind, key: string) => boolean
  toggle: (type: FavoriteKind, key: string) => Promise<void>
  remove: (type: FavoriteKind, key: string) => Promise<void>
  refresh: () => Promise<void>
}

const FavoriteContext = createContext<FavoriteState | null>(null)

const LIMIT_FALLBACK = 50

export function FavoriteProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const [items, setItems] = useState<FavoriteItemRes[]>([])
  const [limit, setLimit] = useState(LIMIT_FALLBACK)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const list = await getData<FavoriteListRes>('/v1/me/favorites')
      setItems(list.items)
      setLimit(list.limit)
      setReady(true)
      setError(false)
    } catch (e) {
      setError(true)
      throw e
    }
  }, [])

  // 로그인 상태가 확정될 때만 움직인다 — loading 중 호출은 401을 유발한다
  useEffect(() => {
    if (status !== 'authenticated') {
      setItems([])
      setReady(false)
      setError(false)
      return
    }
    let cancelled = false
    getData<FavoriteListRes>('/v1/me/favorites').then(
      (list) => {
        if (cancelled) return
        setItems(list.items)
        setLimit(list.limit)
        setReady(true)
        setError(false)
      },
      () => {
        // 목록을 못 받아도 화면은 살아 있어야 한다 — 별표만 비활성처럼 보인다
        if (cancelled) return
        setReady(false)
        setError(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [status])

  const keys = useMemo(
    () => new Set(items.map((it) => favoriteKey(it.type, it.key))),
    [items],
  )

  const has = useCallback(
    (type: FavoriteKind, key: string) => keys.has(favoriteKey(type, key)),
    [keys],
  )

  // 실패 매핑이 다섯 호출처에서 모두 같아 여기 한 곳에 둔다
  const notifyFailure = useCallback((err: unknown) => {
    if (!(err instanceof ApiError)) {
      toast.error('요청을 처리하지 못했어요')
      return
    }
    if (err.code === 'FAVORITE_LIMIT_EXCEEDED') {
      toast.error(`관심 목록은 ${limit}개까지예요`)
      return
    }
    if (err.code === 'FAVORITE_TARGET_NOT_FOUND') {
      toast.error('존재하지 않는 종목 또는 테마예요')
      return
    }
    if (err.status === 401) {
      toast.error('로그인이 필요해요')
      return
    }
    toast.error('요청을 처리하지 못했어요')
  }, [limit])

  const add = useCallback(
    async (type: FavoriteKind, key: string) => {
      // 낙관적 반영 — 서버 응답을 기다리면 별표가 굼뜨게 느껴진다.
      // createdAt은 임시값이고 보강 필드는 비운다(마이페이지에서 등록하는 경로가 없어 노출되지 않는다)
      const optimistic: FavoriteItemRes = {
        type,
        key,
        createdAt: new Date().toISOString(),
        resolved: false,
        stock: null,
        theme: null,
      }
      setItems((prev) => [optimistic, ...prev])
      try {
        await putData<unknown>(`/v1/me/favorites/${type}/${encodeURIComponent(key)}`)
        await refresh()
      } catch (err) {
        setItems((prev) => prev.filter((it) => !(it.type === type && it.key === key)))
        notifyFailure(err)
      }
    },
    [notifyFailure, refresh],
  )

  const remove = useCallback(
    async (type: FavoriteKind, key: string) => {
      const snapshot = items
      setItems((prev) => prev.filter((it) => !(it.type === type && it.key === key)))
      try {
        await deleteData(`/v1/me/favorites/${type}/${encodeURIComponent(key)}`)
      } catch (err) {
        setItems(snapshot)
        notifyFailure(err)
      }
    },
    [items, notifyFailure],
  )

  const toggle = useCallback(
    async (type: FavoriteKind, key: string) => {
      if (has(type, key)) return remove(type, key)
      return add(type, key)
    },
    [add, has, remove],
  )

  const value = useMemo(
    () => ({
      ready,
      error,
      items,
      count: items.length,
      limit,
      isFull: items.length >= limit,
      has,
      toggle,
      remove,
      refresh,
    }),
    [ready, error, items, limit, has, toggle, remove, refresh],
  )

  return <FavoriteContext.Provider value={value}>{children}</FavoriteContext.Provider>
}

export function useFavorites(): FavoriteState {
  const context = useContext(FavoriteContext)
  if (!context) throw new Error('useFavorites는 FavoriteProvider 안에서만 쓸 수 있다')
  return context
}
