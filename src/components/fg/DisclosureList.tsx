import { ExternalLink } from 'lucide-react'

export interface DisclosureItem {
  key: string
  date: string
  title: string
  sub: string
  url: string
}

interface DisclosureListProps {
  label: string
  items: readonly DisclosureItem[]
}

export function DisclosureList({ label, items }: DisclosureListProps) {
  return (
    <ul className="fg-dl" aria-label={label}>
      {items.map((item) => (
        <li key={item.key}>
          <a className="fg-dl__row" href={item.url} target="_blank" rel="noopener noreferrer">
            <span className="fg-dl__date">{item.date}</span>
            <span className="fg-dl__body">
              <span className="fg-dl__title">{item.title}</span>
              <span className="fg-dl__sub">{item.sub}</span>
            </span>
            <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  )
}
