// 공용 fetch 계층 — Design Ref: §5.1 (FR-C01)
//
// 원칙 셋:
// 1. 의존성 0 — react-query·axios를 도입하지 않는다. 데모 트래픽에 캐시 무효화
//    인프라는 과설계이고, 필요해지면 측정 후 도입한다.
// 2. 서버 엔벨로프(DataResponse/PageResponse/ErrorResponse)는 이 파일 밖으로 새지
//    않는다 — 훅과 컴포넌트는 payload 타입만 본다.
// 3. 모든 실패는 ApiError 하나로 정규화 — HTTP 에러·네트워크 단절·타임아웃·파싱
//    실패 전부. 훅의 분기 코드가 단일 타입만 다루게 한다.

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
 *           · DATABASE_ERROR · INTERNAL_ERROR · NOT_FOUND
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

/** 코어: fetch + 상태검사 + JSON 파싱 + ApiError 정규화. 언래핑은 하지 않는다 (§5.1.3) */
async function request<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}${qs(params)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (e) {
    // fetch 자체가 던지면 응답이 없다 — 타임아웃과 네트워크 단절만 구분한다
    if (e instanceof DOMException && e.name === 'TimeoutError') {
      throw new ApiError('TIMEOUT', 0, `요청 시간 초과: ${path}`)
    }
    throw new ApiError('NETWORK_ERROR', 0, `네트워크 오류: ${path}`)
  }

  if (!res.ok) {
    // 에러 본문은 ErrorResponse가 정상이지만, 프록시 HTML 에러 페이지 등도 견딘다
    let body: ErrorResponse | null = null
    try {
      body = (await res.json()) as ErrorResponse
    } catch {
      body = null
    }
    if (body?.error?.code) {
      throw new ApiError(body.error.code, res.status, body.error.message, body.error.details)
    }
    throw new ApiError('PARSE_ERROR', res.status, `비정상 에러 응답 (HTTP ${res.status})`)
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
  const envelope = await request<DataResponse<T>>(path, params)
  return envelope.data
}

/** PageResponse 언래핑 — 뉴스 계열 전용. pagination을 버리지 않고 함께 돌려준다 */
export async function getPage<T>(
  path: string,
  page: number,
  size: number,
  params?: Record<string, string | number | undefined>,
): Promise<{ items: T[]; pagination: Pagination }> {
  const envelope = await request<PageResponse<T>>(path, { ...params, page, size })
  return { items: envelope.data, pagination: envelope.pagination }
}
