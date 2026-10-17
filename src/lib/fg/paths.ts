export function stockPath(ticker: string): string {
  return `/stocks/${encodeURIComponent(ticker)}`
}

export function stockSelectPath(ticker: string): string {
  return `/stocks?code=${encodeURIComponent(ticker)}`
}

export function themePath(id: number | string): string {
  return `/themes/${encodeURIComponent(String(id))}`
}

export function themeSelectPath(id: number | string): string {
  return `/themes?id=${encodeURIComponent(String(id))}`
}

export function issuePath(id: number | string): string {
  return `/issues/${encodeURIComponent(String(id))}`
}
