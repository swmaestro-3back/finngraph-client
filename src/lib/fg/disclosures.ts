import { addDays, daysBetween } from '@/lib/calendar'

export interface DisclosureFixture {
  date: string
  title: string
  summary: string
  url: string
}

export interface DisclosuresFixture {
  anchor: string
  listUrl: string
  items: readonly DisclosureFixture[]
}

export interface DisclosureRow extends DisclosureFixture {
  key: string
}

export function placeDisclosures(fixture: DisclosuresFixture, lastDate: string | null): DisclosureRow[] {
  const shift = lastDate ? daysBetween(fixture.anchor, lastDate) : 0
  return fixture.items
    .map((item) => {
      const date = addDays(item.date, shift)
      return { ...item, date, key: `${date}-${item.title}` }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}
