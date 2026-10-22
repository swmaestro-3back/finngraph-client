// Lucian UX/UI Prompt #037 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#037
// Lucian UX/UI Prompt #269 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#269
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useState } from 'react'
import { Button } from '@/components/fg/Button'
import { LucianIcon } from '@/components/fg/LucianIcon'
import { SideSheet } from '@/components/fg/SideSheet'
import type { FolderSummaryRes } from '@/lib/apiTypes'
import { useFavorites } from '@/lib/favorites'
import { josa } from '@/lib/josa'

interface FolderMenuProps {
  folder: FolderSummaryRes
  onRename: () => void
  onDeleted: () => void
}

export function FolderMenu({ folder, onRename, onDeleted }: FolderMenuProps) {
  const { folders, reorderFolders, deleteFolder } = useFavorites()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const ids = folders.map((entry) => entry.id)
  const index = ids.indexOf(folder.id)

  const move = (offset: -1 | 1) => {
    const target = index + offset
    if (index < 0 || target < 0 || target >= ids.length) return
    const next = [...ids]
    next[index] = ids[target]
    next[target] = folder.id
    void reorderFolders(next)
  }

  const remove = async () => {
    setBusy(true)
    const ok = await deleteFolder(folder.id)
    setBusy(false)
    setConfirming(false)
    if (ok) onDeleted()
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button type="button" className="fg-iconbtn fg-mine__menu" aria-label={`${folder.name} 메뉴`}>
            <LucianIcon name="more" size={18} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="fg fg-umenu fg-mine__umenu" align="end" sideOffset={8}>
            <DropdownMenu.Item className="fg-umenu__item" onSelect={onRename}>
              <LucianIcon name="edit" size={17} weight={1.9} className="fg-umenu__ico" />
              이름 바꾸기
            </DropdownMenu.Item>
            <DropdownMenu.Item className="fg-umenu__item" disabled={index <= 0} onSelect={() => move(-1)}>
              <ArrowLeft className="fg-umenu__ico" size={17} strokeWidth={1.9} aria-hidden="true" />
              앞으로 옮기기
            </DropdownMenu.Item>
            <DropdownMenu.Item className="fg-umenu__item" disabled={index < 0 || index >= ids.length - 1} onSelect={() => move(1)}>
              <ArrowRight className="fg-umenu__ico" size={17} strokeWidth={1.9} aria-hidden="true" />
              뒤로 옮기기
            </DropdownMenu.Item>
            <DropdownMenu.Item className="fg-umenu__item fg-umenu__item--out fg-mine__danger" onSelect={() => setConfirming(true)}>
              <LucianIcon name="trash" size={17} weight={1.9} className="fg-umenu__ico" />
              테마 지우기
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {confirming && (
        <SideSheet open variant="modal" onOpenChange={(open) => !open && setConfirming(false)} title="테마를 지울까요?" closeLabel="닫기">
          <p className="fg-fname__text fg-fdel__text">
            {`${folder.name}${josa(folder.name, '을/를')} 지워도 담겨 있던 종목과 테마는 전체 관심에 그대로 남아요.`}
          </p>
          <div className="fg-fname__foot fg-fdel__foot">
            <Button onClick={() => setConfirming(false)}>취소</Button>
            <Button variant="primary" busy={busy} disabled={busy} onClick={() => void remove()}>
              지우기
            </Button>
          </div>
        </SideSheet>
      )}
    </>
  )
}
