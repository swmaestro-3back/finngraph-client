// 관심 즐겨찾기의 단일 원본 — 백엔드 SCRUM-199
//
// Provider로 만든 이유: 별표가 종목 상세·테마 상세·종목 목록·트리맵·마이페이지
// 다섯 군데에 흩어져 있는데, 화면마다 목록을 따로 불러오면 한 곳에서 토글한 결과가
// 다른 곳에 반영되지 않는다. react-query가 없는 저장소라 auth.tsx와 같은 Context 패턴을 쓴다.
//
// 목록 한 벌이 두 가지 용도를 겸한다 — 별표는 키 집합만 보면 되고(파생 Set),
// 마이페이지는 보강 필드까지 쓴다.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import { ApiError, deleteData, getData, patchData, postData, putData } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type {
  FavoriteFolderRes,
  FavoriteItemRes,
  FavoriteKind,
  FavoriteListRes,
  FolderSummaryRes,
} from '@/lib/apiTypes'

/** 키 집합의 원소 형식 — 유형이 달라도 키가 겹칠 수 있어 유형을 접두로 붙인다 */
function favoriteKey(type: FavoriteKind, key: string): string {
  return `${type}:${key}`
}

export interface SaveOrigin {
  label?: string | null
  anchor?: HTMLElement | null
}

export interface FolderTarget {
  type: FavoriteKind
  key: string
}

export interface SavePrompt {
  id: number
  type: FavoriteKind
  key: string
  label: string | null
  anchor: HTMLElement | null
  fresh: boolean
}

interface FavoriteState {
  /** 로그인 상태에서 목록을 한 번이라도 받았는가 — 별표 초기 깜빡임을 막는 데 쓴다 */
  ready: boolean
  error: boolean
  items: FavoriteItemRes[]
  count: number
  limit: number
  isFull: boolean
  folders: FolderSummaryRes[]
  folderLimit: number
  prompt: SavePrompt | null
  has: (type: FavoriteKind, key: string) => boolean
  toggle: (type: FavoriteKind, key: string, origin?: SaveOrigin) => Promise<void>
  remove: (type: FavoriteKind, key: string) => Promise<void>
  refresh: () => Promise<void>
  openPrompt: (type: FavoriteKind, key: string, origin?: SaveOrigin, fresh?: boolean) => void
  closePrompt: () => void
  createFolder: (name: string) => Promise<FavoriteFolderRes | null>
  renameFolder: (id: number, name: string) => Promise<boolean>
  deleteFolder: (id: number) => Promise<boolean>
  reorderFolders: (ids: number[]) => Promise<boolean>
  addToFolder: (folderId: number, type: FavoriteKind, key: string) => Promise<boolean>
  fillFolder: (folderId: number, targets: readonly FolderTarget[]) => Promise<boolean>
  removeFromFolder: (folderId: number, type: FavoriteKind, key: string) => Promise<boolean>
}

const FavoriteContext = createContext<FavoriteState | null>(null)

const LIMIT_FALLBACK = 50
const FOLDER_LIMIT_FALLBACK = 20

function normalize(items: FavoriteItemRes[]): FavoriteItemRes[] {
  return items.map((item) => ({ ...item, folderIds: item.folderIds ?? [] }))
}

function itemPath(type: FavoriteKind, key: string): string {
  return `${type}/${encodeURIComponent(key)}`
}

function emptyItem(type: FavoriteKind, key: string, folderIds: number[]): FavoriteItemRes {
  return { type, key, createdAt: new Date().toISOString(), resolved: false, stock: null, theme: null, folderIds }
}

export function FavoriteProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const [items, setItems] = useState<FavoriteItemRes[]>([])
  const [limit, setLimit] = useState(LIMIT_FALLBACK)
  const [folders, setFolders] = useState<FolderSummaryRes[]>([])
  const [folderLimit, setFolderLimit] = useState(FOLDER_LIMIT_FALLBACK)
  const [prompt, setPrompt] = useState<SavePrompt | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const promptSeq = useRef(0)

  const apply = useCallback((list: FavoriteListRes) => {
    setItems(normalize(list.items))
    setLimit(list.limit)
    setFolders(list.folders ?? [])
    setFolderLimit(list.folderLimit ?? FOLDER_LIMIT_FALLBACK)
    setReady(true)
    setError(false)
  }, [])

  const refresh = useCallback(async () => {
    try {
      apply(await getData<FavoriteListRes>('/v1/me/favorites'))
    } catch (e) {
      setError(true)
      throw e
    }
  }, [apply])

  // 로그인 상태가 확정될 때만 움직인다 — loading 중 호출은 401을 유발한다
  useEffect(() => {
    if (status !== 'authenticated') {
      setItems([])
      setFolders([])
      setPrompt(null)
      setReady(false)
      setError(false)
      return
    }
    let cancelled = false
    getData<FavoriteListRes>('/v1/me/favorites').then(
      (list) => {
        if (cancelled) return
        apply(list)
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
  }, [status, apply])

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
    if (err.code === 'FAVORITE_FOLDER_LIMIT_EXCEEDED') {
      toast.error(`나만의 테마는 ${folderLimit}개까지 만들 수 있어요`)
      return
    }
    if (err.code === 'FAVORITE_FOLDER_NAME_DUPLICATE') {
      toast.error('같은 이름의 테마가 이미 있어요')
      return
    }
    if (err.code === 'FAVORITE_FOLDER_NOT_FOUND') {
      toast.error('이미 지워진 테마예요')
      return
    }
    if (err.code === 'INVALID_PARAMETER') {
      toast.error('테마 이름은 1~20자로 지어 주세요')
      return
    }
    if (err.status === 401) {
      toast.error('로그인이 필요해요')
      return
    }
    toast.error('요청을 처리하지 못했어요')
  }, [limit, folderLimit])

  const openPrompt = useCallback((type: FavoriteKind, key: string, origin?: SaveOrigin, fresh = false) => {
    promptSeq.current += 1
    setPrompt({ id: promptSeq.current, type, key, label: origin?.label ?? null, anchor: origin?.anchor ?? null, fresh })
  }, [])

  const closePrompt = useCallback(() => setPrompt(null), [])

  const add = useCallback(
    async (type: FavoriteKind, key: string, origin?: SaveOrigin) => {
      // 낙관적 반영 — 서버 응답을 기다리면 별표가 굼뜨게 느껴진다.
      setItems((prev) => [emptyItem(type, key, []), ...prev])
      if (type === 'STOCK') openPrompt(type, key, origin, true)
      try {
        await putData<unknown>(`/v1/me/favorites/${itemPath(type, key)}`)
        if (type === 'THEME') toast.success('관심 테마에 담았어요', { description: '나만의 테마에서 모아 볼 수 있어요' })
        await refresh()
      } catch (err) {
        setItems((prev) => prev.filter((it) => !(it.type === type && it.key === key)))
        setPrompt((current) => (current && current.type === type && current.key === key ? null : current))
        notifyFailure(err)
      }
    },
    [notifyFailure, openPrompt, refresh],
  )

  const remove = useCallback(
    async (type: FavoriteKind, key: string) => {
      const snapshot = items
      setItems((prev) => prev.filter((it) => !(it.type === type && it.key === key)))
      try {
        await deleteData(`/v1/me/favorites/${itemPath(type, key)}`)
        if (folders.length > 0) await refresh().catch(() => {})
      } catch (err) {
        setItems(snapshot)
        notifyFailure(err)
      }
    },
    [items, folders.length, notifyFailure, refresh],
  )

  const toggle = useCallback(
    async (type: FavoriteKind, key: string, origin?: SaveOrigin) => {
      if (has(type, key)) return remove(type, key)
      return add(type, key, origin)
    },
    [add, has, remove],
  )

  const mutate = useCallback(
    async (request: () => Promise<unknown>, rollback?: () => void): Promise<boolean> => {
      try {
        await request()
        await refresh().catch(() => {})
        return true
      } catch (err) {
        rollback?.()
        notifyFailure(err)
        if (err instanceof ApiError && err.code === 'FAVORITE_FOLDER_NOT_FOUND') await refresh().catch(() => {})
        return false
      }
    },
    [notifyFailure, refresh],
  )

  const createFolder = useCallback(
    async (name: string): Promise<FavoriteFolderRes | null> => {
      try {
        const folder = await postData<FavoriteFolderRes>('/v1/me/favorite-folders', { name })
        setFolders((prev) => [
          ...prev,
          { id: folder.id, name: folder.name, position: folder.position, count: 0, change: null, return1m: null, spark: [] },
        ])
        return folder
      } catch (err) {
        notifyFailure(err)
        return null
      }
    },
    [notifyFailure],
  )

  const renameFolder = useCallback(
    (id: number, name: string) => {
      const snapshot = folders
      setFolders((prev) => prev.map((folder) => (folder.id === id ? { ...folder, name } : folder)))
      return mutate(() => patchData<FavoriteFolderRes>(`/v1/me/favorite-folders/${id}`, { name }), () => setFolders(snapshot))
    },
    [folders, mutate],
  )

  const deleteFolder = useCallback(
    (id: number) => {
      const snapshot = { folders, items }
      setFolders((prev) => prev.filter((folder) => folder.id !== id))
      setItems((prev) => prev.map((item) => ({ ...item, folderIds: item.folderIds.filter((value) => value !== id) })))
      return mutate(
        () => deleteData(`/v1/me/favorite-folders/${id}`),
        () => {
          setFolders(snapshot.folders)
          setItems(snapshot.items)
        },
      )
    },
    [folders, items, mutate],
  )

  const reorderFolders = useCallback(
    (ids: number[]) => {
      const snapshot = folders
      const byId = new Map(folders.map((folder) => [folder.id, folder]))
      setFolders(
        ids.flatMap((id, position) => {
          const folder = byId.get(id)
          return folder ? [{ ...folder, position }] : []
        }),
      )
      return mutate(() => putData<unknown>('/v1/me/favorite-folders/order', { ids }), () => setFolders(snapshot))
    },
    [folders, mutate],
  )

  const addToFolder = useCallback(
    (folderId: number, type: FavoriteKind, key: string) => {
      const snapshot = items
      setItems((prev) => {
        const held = prev.some((it) => it.type === type && it.key === key)
        if (!held) return [emptyItem(type, key, [folderId]), ...prev]
        return prev.map((it) =>
          it.type === type && it.key === key && !it.folderIds.includes(folderId)
            ? { ...it, folderIds: [...it.folderIds, folderId] }
            : it,
        )
      })
      return mutate(
        () => putData<unknown>(`/v1/me/favorite-folders/${folderId}/items/${itemPath(type, key)}`),
        () => setItems(snapshot),
      )
    },
    [items, mutate],
  )

  const fillFolder = useCallback(
    (folderId: number, targets: readonly FolderTarget[]) => {
      if (targets.length === 0) return Promise.resolve(true)
      const wanted = new Set(targets.map((target) => favoriteKey(target.type, target.key)))
      setItems((prev) =>
        prev.map((it) =>
          wanted.has(favoriteKey(it.type, it.key)) && !it.folderIds.includes(folderId)
            ? { ...it, folderIds: [...it.folderIds, folderId] }
            : it,
        ),
      )
      return mutate(async () => {
        for (const target of targets) {
          await putData<unknown>(`/v1/me/favorite-folders/${folderId}/items/${itemPath(target.type, target.key)}`)
        }
      })
    },
    [mutate],
  )

  const removeFromFolder = useCallback(
    (folderId: number, type: FavoriteKind, key: string) => {
      const snapshot = items
      setItems((prev) =>
        prev.map((it) =>
          it.type === type && it.key === key ? { ...it, folderIds: it.folderIds.filter((value) => value !== folderId) } : it,
        ),
      )
      return mutate(
        () => deleteData(`/v1/me/favorite-folders/${folderId}/items/${itemPath(type, key)}`),
        () => setItems(snapshot),
      )
    },
    [items, mutate],
  )

  const value = useMemo(
    () => ({
      ready,
      error,
      items,
      count: items.length,
      limit,
      isFull: items.length >= limit,
      folders,
      folderLimit,
      prompt,
      has,
      toggle,
      remove,
      refresh,
      openPrompt,
      closePrompt,
      createFolder,
      renameFolder,
      deleteFolder,
      reorderFolders,
      addToFolder,
      fillFolder,
      removeFromFolder,
    }),
    [
      ready,
      error,
      items,
      limit,
      folders,
      folderLimit,
      prompt,
      has,
      toggle,
      remove,
      refresh,
      openPrompt,
      closePrompt,
      createFolder,
      renameFolder,
      deleteFolder,
      reorderFolders,
      addToFolder,
      fillFolder,
      removeFromFolder,
    ],
  )

  return <FavoriteContext.Provider value={value}>{children}</FavoriteContext.Provider>
}

export function useFavorites(): FavoriteState {
  const context = useContext(FavoriteContext)
  if (!context) throw new Error('useFavorites는 FavoriteProvider 안에서만 쓸 수 있다')
  return context
}
