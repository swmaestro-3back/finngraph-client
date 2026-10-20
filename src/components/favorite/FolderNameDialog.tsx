import { useState, type FormEvent } from 'react'
import { Button } from '@/components/fg/Button'
import { SideSheet } from '@/components/fg/SideSheet'
import type { FavoriteItemRes } from '@/lib/apiTypes'
import { useFavorites } from '@/lib/favorites'
import { itemName } from '@/lib/fg/folders'

const NAME_MAX = 20

interface FolderNameDialogProps {
  mode: 'create' | 'rename'
  folder: { id: number; name: string } | null
  onClose: () => void
  onCreated?: (id: number) => void
}

function pickKey(item: Pick<FavoriteItemRes, 'type' | 'key'>): string {
  return `${item.type}:${item.key}`
}

export function FolderNameDialog({ mode, folder, onClose, onCreated }: FolderNameDialogProps) {
  const { items, createFolder, renameFolder, fillFolder } = useFavorites()
  const [name, setName] = useState(folder?.name ?? '')
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const trimmed = name.trim()
  const choices = items.filter((item) => item.resolved && item.type === 'STOCK')

  const flip = (item: FavoriteItemRes) => {
    setPicked((prev) => {
      const next = new Set(prev)
      const id = pickKey(item)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!trimmed || busy) return
    setBusy(true)
    if (mode === 'rename' && folder) {
      const ok = trimmed === folder.name || (await renameFolder(folder.id, trimmed))
      setBusy(false)
      if (ok) onClose()
      return
    }
    const created = await createFolder(trimmed)
    if (!created) {
      setBusy(false)
      return
    }
    await fillFolder(created.id, choices.filter((choice) => picked.has(pickKey(choice))))
    setBusy(false)
    onCreated?.(created.id)
    onClose()
  }

  return (
    <SideSheet
      open
      variant="modal"
      onOpenChange={(open) => !open && onClose()}
      title={mode === 'create' ? '새 테마 만들기' : '테마 이름 바꾸기'}
      closeLabel="닫기"
    >
      <form className="fg-fname" onSubmit={submit}>
        <label className="fg-fname__label">
          <span>테마 이름</span>
          <input
            className="fg-fname__input"
            type="text"
            value={name}
            maxLength={NAME_MAX}
            autoFocus
            placeholder="예: 반도체 관찰, 배당 모으기"
            onChange={(event) => setName(event.target.value)}
          />
          <span className="fg-fname__count fg-num">{`${trimmed.length}/${NAME_MAX}`}</span>
        </label>
        {mode === 'create' && choices.length > 0 && (
          <fieldset className="fg-fname__pick">
            <legend className="fg-fname__legend">{`담을 관심 고르기 · ${picked.size}개`}</legend>
            <ul className="fg-fname__list">
              {choices.map((item) => (
                <li key={pickKey(item)}>
                  <label className="fg-fsave__row">
                    <input type="checkbox" checked={picked.has(pickKey(item))} onChange={() => flip(item)} />
                    <span className="fg-fsave__rowname">{itemName(item)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        <div className="fg-fname__foot">
          <Button onClick={onClose}>취소</Button>
          <Button type="submit" variant="primary" busy={busy} disabled={busy || trimmed === ''}>
            {mode === 'create' ? '만들기' : '바꾸기'}
          </Button>
        </div>
      </form>
    </SideSheet>
  )
}
