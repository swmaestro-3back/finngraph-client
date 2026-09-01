import { ApiError } from '@/lib/api'

const KG_API_BASE = (
  (import.meta.env.VITE_KG_API_BASE_URL as string | undefined) ?? '/kg/api'
).replace(/\/+$/, '')

const TIMEOUT_MS = 10_000

function qs(params?: Record<string, string | number | undefined>): string {
  if (!params) return ''
  const entries = Object.entries(params).filter(
    (pair): pair is [string, string | number] => pair[1] !== undefined,
  )
  if (entries.length === 0) return ''
  const search = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))
  return `?${search.toString()}`
}

export async function getKgData<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${KG_API_BASE}${path}${qs(params)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError') {
      throw new ApiError('TIMEOUT', 0, `요청 시간 초과: ${path}`)
    }
    throw new ApiError('NETWORK_ERROR', 0, `네트워크 오류: ${path}`)
  }

  if (!res.ok) {
    let detail: string | null = null
    try {
      const body = (await res.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') detail = body.detail
    } catch {
      detail = null
    }
    throw new ApiError(
      res.status === 404 ? 'NOT_FOUND' : 'KG_ERROR',
      res.status,
      detail ?? `비정상 에러 응답 (HTTP ${res.status})`,
    )
  }

  try {
    return (await res.json()) as T
  } catch {
    throw new ApiError('PARSE_ERROR', res.status, `응답 JSON 파싱 실패: ${path}`)
  }
}
