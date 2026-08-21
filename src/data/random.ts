// 목업 데이터용 결정적 난수.
//
// 시세·수급·뉴스 건수는 매 렌더 같은 값이 나와야 하므로 Math.random을 쓸 수 없다.
// 문자열 시드(종목 코드·테마 id 등)를 넣으면 항상 같은 수열이 나온다.

/** FNV-1a 32비트 해시 */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32 — 시드 하나로 [0, 1) 난수를 뽑는 함수를 만든다 */
export function createRandom(seed: string): () => number {
  let state = hashSeed(seed) || 1
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 시드에서 [min, max] 범위의 값 하나 */
export function seededRange(seed: string, min: number, max: number): number {
  return min + (hashSeed(seed) / 4294967296) * (max - min)
}

/** 배열에서 시드로 하나 고른다 */
export function seededPick<T>(seed: string, items: readonly T[]): T {
  return items[hashSeed(seed) % items.length]
}

/** 소수 자리 맞춤 */
export function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
