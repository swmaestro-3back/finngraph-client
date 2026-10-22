// Lucian UX/UI Prompt #077 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#077
// Lucian UX/UI Prompt #252 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#252
import { Check, ChevronRight } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FolderCheck } from '@/components/favorite/FolderCheck'
import { Button } from '@/components/fg/Button'
import { LucianIcon } from '@/components/fg/LucianIcon'
import { NotchField } from '@/components/fg/NotchField'
import { SideSheet } from '@/components/fg/SideSheet'
import { Skeleton } from '@/components/fg/Skeleton'
import { getData } from '@/lib/api'
import type { FolderSuggestRes } from '@/lib/apiTypes'
import { useFavorites, type SavePrompt } from '@/lib/favorites'
import { useMediaQuery } from '@/lib/fg/useMediaQuery'
import { josa } from '@/lib/josa'
import { useKeyed } from '@/lib/queries/useKeyed'
import { cn } from '@/lib/utils'

const NARROW = '(max-width: 767px)'
const FOLDER_NAME_MAX = 20
const PICK_LIMIT = 2

interface Anchor {
  getBoundingClientRect: () => DOMRect
  contextElement?: Element
}

function loadSuggest(joined: string): Promise<FolderSuggestRes> {
  const [, type, key] = joined.split('|')
  return getData<FolderSuggestRes>('/v1/me/favorite-folders/suggest', { type, key })
}

function promptTitle(prompt: SavePrompt): string {
  return prompt.fresh ? '관심에 담았어요' : '테마에 담기'
}

function matchedText(theme: string, matched: readonly string[]): string {
  const shown = matched.slice(0, 2).join('·')
  const list = matched.length > 2 ? `${shown} 외 ${matched.length - 2}개` : shown
  return `같은 ${theme} 종목 ${list}${josa(list, '이/가')} 담겨 있어요`
}

interface SaveBodyProps {
  prompt: SavePrompt
  narrow: boolean
  onClose: () => void
}

function SaveBody({ prompt, narrow, onClose }: SaveBodyProps) {
  const { items, folders, folderLimit, createFolder, addToFolder, removeFromFolder, remove } = useFavorites()
  const { pathname } = useLocation()
  const suggest = useKeyed(`${prompt.id}|${prompt.type}|${prompt.key}`, loadSuggest)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const { type, key } = prompt
  const item = items.find((entry) => entry.type === type && entry.key === key)
  const joined = new Set(item?.folderIds ?? [])
  const name = prompt.label ?? item?.stock?.name ?? item?.theme?.name ?? key
  const settled = suggest.data !== null || suggest.error !== null
  const known = new Set(folders.map((folder) => folder.id))
  const picks = (suggest.data?.folders ?? [])
    .filter((folder) => folder.recommended && known.has(folder.id))
    .slice(0, PICK_LIMIT)
  const pickIds = new Set(picks.map((folder) => folder.id))
  const others = folders.filter((folder) => !pickIds.has(folder.id))
  const canCreate = folders.length < folderLimit
  const newName = suggest.data?.newName ?? null
  const themeName = newName && !folders.some((folder) => folder.name === newName) ? newName : null

  const flip = (folderId: number) => {
    if (joined.has(folderId)) void removeFromFolder(folderId, type, key)
    else void addToFolder(folderId, type, key)
  }

  const createWith = async (raw: string) => {
    const value = raw.trim()
    if (!value || busy) return
    setBusy(true)
    const folder = await createFolder(value)
    if (folder) {
      await addToFolder(folder.id, type, key)
      setDraft('')
    }
    setBusy(false)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void createWith(draft)
  }

  const unfavorite = () => {
    void remove(type, key)
    onClose()
  }

  return (
    <div className="fg-fsave__body">
      {!narrow && (
        <div className="fg-fsave__head">
          <span className="fg-fsave__ok" aria-hidden="true">
            <Check size={16} strokeWidth={2.25} />
          </span>
          <div className="fg-fsave__titles">
            <h2 id={`fsave-${prompt.id}`} className="fg-fsave__title">
              {promptTitle(prompt)}
            </h2>
            <p className="fg-fsave__sub">
              {prompt.fresh
                ? `${name}${josa(name, '을/를')} 어느 테마에 넣을까요? 안 골라도 전체 관심에는 들어 있어요.`
                : `${name}${josa(name, '을/를')} 담을 테마를 골라 주세요. 여러 테마에 함께 담을 수 있어요.`}
            </p>
          </div>
        </div>
      )}
      {narrow && (
        <p className="fg-fsave__sub">{`${name}${josa(name, '을/를')} 어느 테마에 넣을까요? 여러 테마에 함께 담을 수 있어요.`}</p>
      )}

      {!settled && folders.length > 0 ? (
        <Skeleton height={56} shape="card" />
      ) : (
        <>
          {(picks.length > 0 || (themeName && canCreate)) && (
            <div className="fg-fsave__group">
              <p className="fg-fsave__label">
                <span className="fg-fsave__pick">추천</span>
              </p>
              {picks.map((folder) => (
                <label key={folder.id} className={cn('fg-fsave__opt fg-fsave__opt--pick', joined.has(folder.id) && 'is-on')}>
                  <FolderCheck checked={joined.has(folder.id)} onChange={() => flip(folder.id)} />
                  <span className="fg-fsave__optbody">
                    <span className="fg-fsave__optname">{folder.name}</span>
                    {folder.theme && <span className="fg-fsave__why">{matchedText(folder.theme.name, folder.matched)}</span>}
                  </span>
                </label>
              ))}
              {themeName && canCreate && (
                <button type="button" className="fg-fsave__new" disabled={busy} onClick={() => void createWith(themeName)}>
                  <LucianIcon name="plus" size={18} />
                  <span className="fg-fsave__optbody">
                    <span className="fg-fsave__optname">{`'${themeName}' 테마 새로 만들기`}</span>
                    <span className="fg-fsave__why">이 종목이 속한 테마 이름으로 바로 만들어요</span>
                  </span>
                </button>
              )}
            </div>
          )}

          {others.length > 0 && (
            <div className="fg-fsave__group">
              {(picks.length > 0 || (themeName && canCreate)) && (
                <p className="fg-fsave__label">{picks.length > 0 ? '다른 테마' : '내 테마'}</p>
              )}
              <ul className="fg-fsave__list">
                {others.map((folder) => (
                  <li key={folder.id}>
                    <label className="fg-fsave__row">
                      <FolderCheck checked={joined.has(folder.id)} onChange={() => flip(folder.id)} />
                      <span className="fg-fsave__rowname">{folder.name}</span>
                      <span className="fg-fsave__count fg-num">{`${folder.count}개`}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {folders.length === 0 && !themeName && (
            <p className="fg-fsave__empty">아직 만든 테마가 없어요. 이름을 지어 첫 테마를 만들어 보세요.</p>
          )}
        </>
      )}

      {canCreate ? (
        <form className="fg-fsave__form" onSubmit={submit}>
          <NotchField
            className="fg-fsave__notch"
            label="직접 이름 짓기 (예: 2차전지)"
            srLabel="새 테마 이름"
            icon={<LucianIcon name="plus" size={18} />}
            type="text"
            value={draft}
            maxLength={FOLDER_NAME_MAX}
            placeholder="직접 이름 짓기 (예: 2차전지)"
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" size="sm" disabled={busy || draft.trim() === ''}>
            만들기
          </Button>
        </form>
      ) : (
        <p className="fg-fsave__empty">{`나만의 테마는 ${folderLimit}개까지 만들 수 있어요`}</p>
      )}

      <div className="fg-fsave__foot">
        {narrow && prompt.fresh ? (
          <Button onClick={unfavorite}>관심 해제</Button>
        ) : prompt.fresh && pathname !== '/me' ? (
          <Link to="/me" className="fg-sdmore">
            나만의 테마에서 보기
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        ) : (
          <p className="fg-fsave__hint">담으면 그 테마 수익률에 바로 반영돼요</p>
        )}
        <Button variant="primary" className="fg-fsave__done" onClick={onClose}>
          완료
        </Button>
      </div>
    </div>
  )
}

function PromptPopover({ prompt, onClose }: { prompt: SavePrompt; onClose: () => void }) {
  const anchor = useMemo(() => {
    const element = prompt.anchor
    const virtual: Anchor = {
      getBoundingClientRect: () => {
        if (element && element.isConnected) return element.getBoundingClientRect()
        return DOMRect.fromRect({ x: window.innerWidth - 24, y: 72, width: 0, height: 0 })
      },
      contextElement: element?.isConnected ? element : undefined,
    }
    return { current: virtual }
  }, [prompt.anchor])
  const content = useRef<HTMLDivElement>(null)
  return (
    <Popover.Root open onOpenChange={(open) => !open && onClose()}>
      <Popover.Anchor virtualRef={anchor} />
      <Popover.Portal>
        <Popover.Content
          ref={content}
          className="fg fg-fsave"
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={16}
          aria-labelledby={`fsave-${prompt.id}`}
          tabIndex={-1}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            content.current?.focus({ preventScroll: true })
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (prompt.anchor?.isConnected) prompt.anchor.focus({ preventScroll: true })
          }}
        >
          <SaveBody prompt={prompt} narrow={false} onClose={onClose} />
          <Popover.Arrow className="fg-fsave__arrow" width={16} height={8} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function FolderSavePrompt() {
  const { prompt, closePrompt } = useFavorites()
  const narrow = useMediaQuery(NARROW)
  const { pathname } = useLocation()
  const opened = useRef(pathname)

  useEffect(() => {
    if (prompt === null) {
      opened.current = pathname
      return
    }
    if (opened.current !== pathname) closePrompt()
  }, [pathname, prompt, closePrompt])

  if (prompt === null) return null
  if (narrow) {
    return (
      <SideSheet open onOpenChange={(open) => !open && closePrompt()} title={promptTitle(prompt)} closeLabel="닫기">
        <SaveBody key={prompt.id} prompt={prompt} narrow onClose={closePrompt} />
      </SideSheet>
    )
  }
  return <PromptPopover key={prompt.id} prompt={prompt} onClose={closePrompt} />
}
