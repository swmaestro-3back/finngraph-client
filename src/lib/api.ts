// 공용 fetch 계층 — Design Ref: §5.1 (FR-C01)
//
// 원칙 셋:
// 1. 의존성 0 — react-query·axios를 도입하지 않는다. 데모 트래픽에 캐시 무효화
//    인프라는 과설계이고, 필요해지면 측정 후 도입한다.
// 2. 서버 엔벨로프(DataResponse/PageResponse/ErrorResponse)는 이 파일 밖으로 새지
//    않는다 — 훅과 컴포넌트는 payload 타입만 본다.
// 3. 모든 실패는 ApiError 하나로 정규화 — HTTP 에러·네트워크 단절·타임아웃·파싱
//    실패 전부. 훅의 분기 코드가 단일 타입만 다루게 한다.

import type { AuthTokenRes } from '@/lib/apiTypes'

/** 서버 엔벨로프 — 백엔드 ApiResponse.kt와 1:1. 이 파일 밖에서 import하지 않는다 */
interface DataResponse<T> {
  data: T
}
interface PageResponse<T> {
  data: T[]
  pagination: Pagination
}
export interface Pagination {
  /** 0-기반 (서버 계약 — 1-기반 표기 변환은 UI 몫) */
  page: number
  size: number
  totalElements: number
  totalPages: number
}
interface ErrorResponse {
  error: { code: string; message: string; details?: Record<string, unknown> }
}

/**
 * 모든 실패의 단일 표현.
 * code는 서버 에러 코드 문자열이 1차 분기 기준(FR-I04)이고 HTTP status는 보조다.
 * 서버 코드: NEWS_NOT_FOUND · THEME_NOT_FOUND · STOCK_NOT_FOUND · INVALID_PARAMETER
 *           · DATABASE_ERROR · INTERNAL_ERROR · NOT_FOUND · UNAUTHORIZED
 *           · INVALID_CREDENTIALS · EMAIL_DUPLICATE · TOKEN_EXPIRED
 * 클라 합성: NETWORK_ERROR · TIMEOUT · PARSE_ERROR
 */
export class ApiError extends Error {
  readonly code: string
  /** HTTP 상태. 네트워크 실패·타임아웃은 0 */
  readonly status: number
  readonly details?: Record<string, unknown>

  // 파라미터 프로퍼티 금지 — tsconfig erasableSyntaxOnly (타입 소거만 허용) 준수
  constructor(code: string, status: number, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  /** 503(DB 접속 실패)·네트워크·타임아웃 — 사용자 재시도 버튼이 의미 있는 경우 */
  get isRetryable(): boolean {
    return this.status === 503 || this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT'
  }
}

// base URL — 미설정이면 '/api'(dev proxy 경로). 후행 슬래시 제거로 이중 슬래시 방지
const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api').replace(
  /\/+$/,
  '',
)

// 파라미터화하지 않는다 — 무거운 쿼리는 서버 L0 측정 대상이지 클라 튜닝 대상이 아니다 (§5.1.4)
const TIMEOUT_MS = 10_000

// ── 인증 상태 (Design §5.1) ─────────────────────────────────────────────────
// access 토큰은 JS 메모리 전용 — localStorage에 두지 않아 XSS 시 탈취면을 줄인다.
// refresh는 httpOnly 쿠키라 클라 코드가 만질 수 없고, credentials: 'include'로만 실린다.
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

// refresh까지 실패해 세션이 끝났을 때 AuthProvider가 상태를 anonymous로 되돌리는 훅
let onUnauthorized: (() => void) | null = null

export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorized = handler
}

// 401 → refresh 1회 재시도의 3중 루프 차단: single-flight + retried 플래그 + auth 경로 제외.
// 탭 간 직렬화는 Web Locks — 멀티탭 동시 refresh가 같은 쿠키로 2요청을 만들면
// 후행이 재사용 감지에 걸려 전 탭이 강제 로그아웃되는 상시 재현 시나리오를 막는다.
let refreshing: Promise<AuthTokenRes | null> | null = null

export function refreshSession(): Promise<AuthTokenRes | null> {
  refreshing ??= navigator.locks
    .request('auth:refresh', async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        if (!res.ok) return null
        const envelope = (await res.json()) as DataResponse<AuthTokenRes>
        accessToken = envelope.data.accessToken
        return envelope.data
      } catch {
        return null
      }
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

/** 쿼리스트링 — undefined 값은 생략 */
function qs(params?: Record<string, string | number | undefined>): string {
  if (!params) return ''
  const entries = Object.entries(params).filter(
    (pair): pair is [string, string | number] => pair[1] !== undefined,
  )
  if (entries.length === 0) return ''
  const search = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))
  return `?${search.toString()}`
}

interface RequestOptions {
  method?: string
  body?: unknown
  params?: Record<string, string | number | undefined>
  retried?: boolean
}

/** 코어: fetch + 상태검사 + JSON 파싱 + ApiError 정규화. 언래핑은 하지 않는다 (§5.1.3) */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, retried = false } = options

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}${qs(params)}`, {
      method,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // 게이트웨이 직결(cross-origin) 시 refresh 쿠키 송수신에 필수 — 서버 Allow-Credentials와 짝
      credentials: 'include',
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })
  } catch (e) {
    // fetch 자체가 던지면 응답이 없다 — 타임아웃과 네트워크 단절만 구분한다
    if (e instanceof DOMException && e.name === 'TimeoutError') {
      throw new ApiError('TIMEOUT', 0, `요청 시간 초과: ${path}`)
    }
    throw new ApiError('NETWORK_ERROR', 0, `네트워크 오류: ${path}`)
  }

  // access 만료 → refresh 1회 후 재시도. auth 경로 자체는 제외해 refresh 루프를 끊는다
  if (res.status === 401 && !retried && !path.startsWith('/v1/auth/')) {
    const session = await refreshSession()
    if (session) return request<T>(path, { ...options, retried: true })
    onUnauthorized?.()
  }

  if (!res.ok) {
    // 에러 본문은 ErrorResponse가 정상이지만, 프록시 HTML 에러 페이지 등도 견딘다
    let errorBody: ErrorResponse | null = null
    try {
      errorBody = (await res.json()) as ErrorResponse
    } catch {
      errorBody = null
    }
    if (errorBody?.error?.code) {
      throw new ApiError(
        errorBody.error.code,
        res.status,
        errorBody.error.message,
        errorBody.error.details,
      )
    }
    throw new ApiError('PARSE_ERROR', res.status, `비정상 에러 응답 (HTTP ${res.status})`)
  }

  // 204·빈 본문은 json 파싱 생략 — 무조건 res.json()이면 로그아웃·탈퇴에서 PARSE_ERROR 오탐
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T
  }

  try {
    return (await res.json()) as T
  } catch {
    throw new ApiError('PARSE_ERROR', res.status, `응답 JSON 파싱 실패: ${path}`)
  }
}

/** DataResponse 언래핑 — 단건·전체 목록(themes·stocks 등 D4 전체 반환) 공용 */
export async function getData<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const envelope = await request<DataResponse<T>>(path, { params })
  return envelope.data
}

/** PageResponse 언래핑 — 뉴스 계열 전용. pagination을 버리지 않고 함께 돌려준다 */
export async function getPage<T>(
  path: string,
  page: number,
  size: number,
  params?: Record<string, string | number | undefined>,
): Promise<{ items: T[]; pagination: Pagination }> {
  const envelope = await request<PageResponse<T>>(path, { params: { ...params, page, size } })
  return { items: envelope.data, pagination: envelope.pagination }
}

export async function postData<T>(path: string, body?: unknown): Promise<T> {
  const envelope = await request<DataResponse<T> | undefined>(path, { method: 'POST', body })
  return (envelope?.data ?? undefined) as T
}

/** 즐겨찾기 등록 전용 — 멱등 PUT이라 본문 없이 경로만으로 상태를 만든다 */
export async function putData<T>(path: string, body?: unknown): Promise<T> {
  const envelope = await request<DataResponse<T> | undefined>(path, { method: 'PUT', body })
  return (envelope?.data ?? undefined) as T
}

export async function patchData<T>(path: string, body?: unknown): Promise<T> {
  const envelope = await request<DataResponse<T> | undefined>(path, { method: 'PATCH', body })
  return (envelope?.data ?? undefined) as T
}

export async function deleteData(path: string): Promise<void> {
  await request<undefined>(path, { method: 'DELETE' })
}
