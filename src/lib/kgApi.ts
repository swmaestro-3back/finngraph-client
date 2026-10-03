import { ApiError, TIMEOUT_MS, parseJsonBody, qs, toFetchError } from '@/lib/api'

const KG_API_BASE = (
  (import.meta.env.VITE_KG_API_BASE_URL as string | undefined) ?? '/kg/api'
).replace(/\/+$/, '')

/**
 * kg-api 전용 GET — 메인 백엔드와 달리 인증·refresh·엔벨로프가 없고,
 * 에러 본문이 FastAPI `detail` 문자열이라 request()를 그대로 쓰지 않는다.
 */
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
    throw toFetchError(e, path)
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

  return parseJsonBody<T>(res, path)
}
