// Lucian UX/UI Prompt #210 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#210
// Lucian UX/UI Prompt #228 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#228
import { Link } from 'react-router-dom'
import { LogoStack } from '@/components/fg/LogoStack'
import { LucianIcon } from '@/components/fg/LucianIcon'
import type { FavoriteItemRes, FolderSummaryRes } from '@/lib/apiTypes'
import { KIND_LABELS, daysBetween } from '@/lib/calendar'
import { formatChange } from '@/lib/format'
import {
  folderEvent,
  itemName,
  kindLabel,
  returnPath,
  viewSearch,
  type FavoriteView,
  type StockSignal,
} from '@/lib/fg/folders'
import { toneClass, toneOf } from '@/lib/fg/format'
import { useCursorGlow } from '@/lib/fg/useCursorGlow'
import { cn } from '@/lib/utils'

const SPARK_W = 96
const SPARK_H = 36
const AVATAR_LIMIT = 3

function Spark({ values }: { values: readonly number[] }) {
  const path = returnPath(values, SPARK_W, SPARK_H, 3)
  if (!path || values.length < 2) return null
  const tone = toneOf(values[values.length - 1])
  return (
    <svg
      className={cn('fg-mine__spark', `fg-mine__spark--${tone}`)}
      width={SPARK_W}
      height={SPARK_H}
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      aria-hidden="true"
    >
      <polyline points={path.line} />
    </svg>
  )
}

function percent(value: number | null): string {
  return value === null ? '–' : formatChange(value)
}

function memberLine(members: readonly FavoriteItemRes[]): string {
  if (members.length === 0) return '아직 비어 있어요'
  const first = itemName(members[0])
  return members.length === 1 ? first : `${first} 외 ${members.length - 1}개`
}

interface FolderCardsProps {
  folders: readonly FolderSummaryRes[]
  items: readonly FavoriteItemRes[]
  view: FavoriteView
  signals: ReadonlyMap<string, StockSignal>
  today: string
  canCreate: boolean
  folderLimit: number
  onCreate: () => void
}

export function FolderCards({ folders, items, view, signals, today, canCreate, folderLimit, onCreate }: FolderCardsProps) {
  const glow = useCursorGlow<HTMLAnchorElement>()
  return (
    <ul className="fg-mine__cards" aria-label="내가 만든 테마">
      {folders.map((folder) => {
        const members = items.filter((item) => item.folderIds.includes(folder.id))
        const logos = members.filter((item) => item.type === 'STOCK').slice(0, AVATAR_LIMIT)
        const selected = view.kind === 'folder' && view.id === folder.id
        const event = folderEvent(members, signals)
        const days = event ? daysBetween(today, event.date) : null
        return (
          <li key={folder.id}>
            <Link
              to={{ search: viewSearch(selected ? { kind: 'all' } : { kind: 'folder', id: folder.id }) }}
              replace
              aria-current={selected ? 'true' : undefined}
              title={selected ? '다시 누르면 전체 관심으로 돌아가요' : undefined}
              className="fg-mine__card fg-glow"
              onPointerMove={glow.onPointerMove}
              onPointerLeave={glow.onPointerLeave}
            >
              <span className="fg-mine__cardtop">
                <span className="fg-mine__cardname">{folder.name}</span>
                {event && days !== null ? (
                  <span className="fg-mine__cardevent">{`${KIND_LABELS[event.kind]} ${days === 0 ? '오늘' : `D-${days}`}`}</span>
                ) : (
                  <span className="fg-mine__cardmeta">{kindLabel(members)}</span>
                )}
              </span>
              <span className="fg-mine__cardmid">
                <span className="fg-mine__cardnums fg-num">
                  <span className={cn('fg-mine__cardchg', toneClass(folder.change))}>{percent(folder.change)}</span>
                  <span className="fg-mine__cardsub">
                    1개월 <b className={toneClass(folder.return1m)}>{percent(folder.return1m)}</b>
                    <span className="fg-mine__cardcount">{` · ${members.length}개`}</span>
                  </span>
                </span>
                <Spark values={folder.spark} />
              </span>
              <span className="fg-mine__cardfoot">
                {logos.length > 0 && (
                  <span className="fg-mine__avatars" aria-hidden="true">
                    <LogoStack items={logos.map((member) => ({ name: itemName(member), ticker: member.key }))} max={AVATAR_LIMIT} />
                  </span>
                )}
                <span className="fg-mine__cardwho">{memberLine(members)}</span>
              </span>
            </Link>
          </li>
        )
      })}
      <li>
        <button type="button" className="fg-mine__card fg-mine__card--new" onClick={onCreate} disabled={!canCreate}>
          <span className="fg-mine__newtitle">
            <LucianIcon name="plus" size={18} />
            새 테마 만들기
          </span>
          <span className="fg-mine__newsub">
            {canCreate ? '관심 종목을 골라 나만의 묶음을 만들어요' : `나만의 테마는 ${folderLimit}개까지 만들 수 있어요`}
          </span>
        </button>
      </li>
    </ul>
  )
}
