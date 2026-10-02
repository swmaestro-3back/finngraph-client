// 목록 페이지(테마 목록·주식 목록)의 페이지·정렬 상태를 주소 쿼리로 읽고 쓰는 순수 함수.
// 상세에 다녀와도 보던 목록으로 돌아오게 하려고 상태를 컴포넌트가 아니라 주소에 둔다.
// 기본값은 주소에 적지 않는다 — /stocks 는 항상 1페이지·기본 정렬이다.

/** 페이지 번호를 몇 개씩 끊어 보여 줄지 */
export const PAGE_BLOCK = 5

/** page가 속한 묶음의 페이지 번호들 — 1~5, 6~10 … 마지막 묶음은 totalPages에서 끊긴다 */
export function pageBlock(page: number, totalPages: number, size = PAGE_BLOCK): number[] {
  const start = Math.floor((page - 1) / size) * size + 1
  const end = Math.min(totalPages, start + size - 1)
  const list: number[] = []
  for (let n = start; n <= end; n++) list.push(n)
  return list
}

/** ?page= — 없거나 숫자가 아니면 1 */
export function readPage(params: URLSearchParams): number {
  const page = Number(params.get('page'))
  return Number.isInteger(page) && page >= 1 ? page : 1
}

export function writePage(params: URLSearchParams, page: number): void {
  if (page > 1) params.set('page', String(page))
  else params.delete('page')
}

export interface SortState<K extends string> {
  key: K
  desc: boolean
}

/** ?sort=&dir= — 모르는 컬럼이면 기본 컬럼, dir은 asc일 때만 오름차순 */
export function readSort<K extends string>(
  params: URLSearchParams,
  keys: readonly K[],
  fallback: K,
): SortState<K> {
  const raw = params.get('sort')
  const key = keys.find((k) => k === raw) ?? fallback
  return { key, desc: params.get('dir') !== 'asc' }
}

export function writeSort<K extends string>(
  params: URLSearchParams,
  sort: SortState<K>,
  fallback: K,
): void {
  if (sort.key === fallback) params.delete('sort')
  else params.set('sort', sort.key)
  if (sort.desc) params.delete('dir')
  else params.set('dir', 'asc')
}

/** ?q= — 목록 안 이름 검색어. 앞뒤 공백만 있는 값은 적지 않는다 */
export function readQuery(params: URLSearchParams): string {
  return params.get('q') ?? ''
}

export function writeQuery(params: URLSearchParams, query: string): void {
  if (query.trim() === '') params.delete('q')
  else params.set('q', query)
}
