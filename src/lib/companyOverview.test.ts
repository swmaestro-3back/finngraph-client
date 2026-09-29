import { describe, expect, it } from 'vitest'
import { dartFilingUrl, describeSource, splitSentences } from '@/lib/companyOverview'

describe('describeSource', () => {
  it('알려진 출처는 사람이 읽을 라벨로 바꾼다', () => {
    expect(describeSource('DART_LLM')).toBe('DART 사업보고서 「사업의 개요」 AI 요약')
    expect(describeSource('NAVER')).toBe('네이버 금융 기업개요')
  })

  it('모르는 출처와 null 은 라벨 없이 넘긴다', () => {
    expect(describeSource('UNKNOWN')).toBeNull()
    expect(describeSource(null)).toBeNull()
  })
})

describe('dartFilingUrl', () => {
  it('접수번호로 DART 원문 뷰어 주소를 만든다', () => {
    expect(dartFilingUrl('20260315000123')).toBe(
      'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260315000123',
    )
  })
})

describe('splitSentences', () => {
  it('~다. 로 끝나는 문장 경계에서 나눈다', () => {
    expect(
      splitSentences('삼성전자는 반도체를 만듭니다. 매출의 3.5%는 해외입니다.  DX 부문도 있습니다.'),
    ).toEqual(['삼성전자는 반도체를 만듭니다.', '매출의 3.5%는 해외입니다.', 'DX 부문도 있습니다.'])
  })

  it('줄바꿈도 문장 경계로 보고 빈 줄은 버린다', () => {
    expect(splitSentences('첫 문장\n\n둘째 문장이다.\n')).toEqual(['첫 문장', '둘째 문장이다.'])
  })

  it('문장 부호가 없으면 통째로 한 문장이다', () => {
    expect(splitSentences('SK하이닉스 메모리 반도체')).toEqual(['SK하이닉스 메모리 반도체'])
  })
})
