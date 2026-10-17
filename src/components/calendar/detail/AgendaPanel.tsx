import { DetailNote, DetailSection, SectionNotice, Tag } from '@/components/calendar/detail/DetailParts'
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
            <DetailNote>
              주목 안건 <b className="fg-num">{flagged}</b>건 — 이사 선임·보수 한도·정관 변경 같은 정례 안건이 아닌 것에 표시합니다.
            </DetailNote>
          )}
          <ol aria-label="주총 안건" className="fg-cal-agenda">
            {action.agenda.map((item, index) => (
              <li key={`${index}-${item.text}`}>
                <span className="fg-cal-agenda__no fg-num">{index + 1}</span>
                <span className="fg-cal-agenda__item">
                  <span className={cn('fg-cal-agenda__text', item.tags.length > 0 && 'fg-cal-agenda__text--flag')}>
                    {item.text}
                  </span>
                  {item.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </span>
              </li>
            ))}
          </ol>
          {action.agendaTruncated && <DetailNote>외 다수 — 일부 안건만 받았습니다</DetailNote>}
        </>
      )}
    </DetailSection>
  )
}
