import { DetailSection, SectionNotice } from '@/components/calendar/detail/DetailParts'
import type { CorporateActionRes } from '@/lib/apiTypes'
import { cn } from '@/lib/utils'

export function AgendaPanel({ action }: { action: CorporateActionRes }) {
  const flagged = action.agenda.filter((item) => item.tags.length > 0).length

  return (
    <DetailSection id="agenda-panel-title" title="주총 안건">
      {action.agenda.length === 0 ? (
        <SectionNotice>안건 정보가 아직 없습니다.</SectionNotice>
      ) : (
        <>
          {flagged > 0 && (
            <p className="mb-3 text-caption text-foreground-secondary break-keep">
              주목 안건 <span className="font-mono tabular-nums">{flagged}</span>건 — 이사 선임·보수 한도·정관 변경 같은 정례 안건이 아닌 것에 표시합니다.
            </p>
          )}
          <ol aria-label="주총 안건" className="flex flex-col gap-2">
            {action.agenda.map((item, index) => (
              <li key={`${index}-${item.text}`} className="flex gap-2">
                <span className="w-5 shrink-0 text-right font-mono text-caption leading-relaxed tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span
                    className={cn(
                      'break-keep text-body leading-relaxed',
                      item.tags.length > 0 ? 'font-medium text-foreground' : 'text-foreground-secondary',
                    )}
                  >
                    {item.text}
                  </span>
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-border px-1.5 text-micro font-medium leading-tight text-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ol>
          {action.agendaTruncated && <p className="mt-3 text-caption text-muted-foreground">외 다수 — 일부 안건만 받았습니다</p>}
        </>
      )}
    </DetailSection>
  )
}
