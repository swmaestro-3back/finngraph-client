// 목록 페이지 안 이름 검색 — 띄어쓰기·대소문자를 무시하고 찾되, 강조는 원래 글자 위치에 입힌다.
// "반도체기판"으로 쳐도 "반도체 기판(FC-BGA…)"이 걸려야 하므로 단순 includes로는 부족하다.

function compact(text: string): { chars: string; index: number[] } {
  let chars = ''
  const index: number[] = []
  for (let i = 0; i < text.length; i++) {
    if (/\s/.test(text[i])) continue
    chars += text[i].toLowerCase()
    index.push(i)
  }
  return { chars, index }
}

/** 검색어가 비었는지 — 띄어쓰기만 친 경우도 빈 검색으로 본다 */
export function isBlankQuery(query: string): boolean {
  return query.trim() === ''
}

/**
 * name 안에서 query가 걸린 원문 구간 [start, end). 못 찾으면 null.
 * 띄어쓰기를 건너뛰고 비교하므로 구간 안에 공백이 끼어 있을 수 있다.
 */
export function matchRange(name: string, query: string): [number, number] | null {
  const q = compact(query).chars
  if (q === '') return null
  const { chars, index } = compact(name)
  const at = chars.indexOf(q)
  if (at < 0) return null
  return [index[at], index[at + q.length - 1] + 1]
}
