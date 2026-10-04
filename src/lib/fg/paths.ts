export function stockPath(ticker: string): string {
  return `/stocks/${encodeURIComponent(ticker)}`
}

export function themePath(id: number | string): string {
  return `/themes/${encodeURIComponent(String(id))}`
}

export function issuePath(id: number | string): string {
  return `/news/${encodeURIComponent(String(id))}`
}
