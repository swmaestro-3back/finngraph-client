// 받침 유무에 따른 조사 선택 — 숫자는 한국어 독음 기준(0=영, 1=일 …)
const DIGIT_SOUND = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
const LETTER_SOUND: Readonly<Record<string, string>> = { L: '엘', M: '엠', N: '엔', R: '알' }

function lastSoundChar(word: string): string | null {
  for (let i = word.length - 1; i >= 0; i--) {
    const ch = word[i]
    if (/[0-9]/.test(ch)) return DIGIT_SOUND[Number(ch)]
    if (/[A-Za-z]/.test(ch)) return LETTER_SOUND[ch.toUpperCase()] ?? '이'
    if (/[가-힣]/.test(ch)) return ch
  }
  return null
}

export function josa(word: string, pair: '이/가' | '으로/로' | '은/는' | '와/과' | '을/를'): string {
  const ch = lastSoundChar(word)
  const final = ch ? (ch.charCodeAt(0) - 0xac00) % 28 : 0
  if (pair === '이/가') return final > 0 ? '이' : '가'
  if (pair === '은/는') return final > 0 ? '은' : '는'
  if (pair === '와/과') return final > 0 ? '과' : '와'
  if (pair === '을/를') return final > 0 ? '을' : '를'
  // ㄹ 받침(종성 인덱스 8)은 '로'와 결합한다 (예: 일로, 팔로)
  return final > 0 && final !== 8 ? '으로' : '로'
}
