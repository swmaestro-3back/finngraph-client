const SOURCE_LABELS: Record<string, string> = {
  DART_LLM: 'DART 사업보고서 「사업의 개요」 AI 요약',
  NAVER: '네이버 금융 기업개요',
}

export function describeSource(source: string | null): string | null {
  if (source === null) return null
  return SOURCE_LABELS[source] ?? null
}

export function dartFilingUrl(rceptNo: string): string {
  return `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${encodeURIComponent(rceptNo)}`
}

export function splitSentences(text: string): string[] {
  return text
    .split(/\n+|(?<=[다요]\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
}
