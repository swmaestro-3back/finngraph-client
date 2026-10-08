import { describe, expect, it } from 'vitest'
import { dartFilingUrl, describeSource, profileRows, splitSentences } from '@/lib/companyOverview'

describe('describeSource', () => {
  it('알려진 출처는 사람이 읽을 라벨로 바꾼다', () => {
    expect(describeSource('DART_LLM')).toBe('DART 사업보고서 「사업의 개요」 요약')
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

describe('profileRows', () => {
  const full = {
    ceoName: '전영현, 노태문',
    establishedOn: '1969-01-13',
    listedOn: '1975-06-11',
    fiscalMonth: '12',
    listedShares: 5_846_278_000,
    parValue: 100,
    homepage: 'www.samsung.com/sec',
    address: '경기도 수원시 영통구  삼성로 129 (매탄동)',
  }

  it('값이 있는 항목을 정해진 순서와 표기로 만든다', () => {
    expect(profileRows(full)).toEqual([
      { label: '대표자', value: '전영현, 노태문' },
      { label: '설립일', value: '1969.01.13', numeric: true },
      { label: '상장일', value: '1975.06.11', numeric: true },
      { label: '결산월', value: '12월', numeric: true },
      { label: '상장주식수', value: '5,846,278,000주', numeric: true },
      { label: '액면가', value: '100원', numeric: true },
      { label: '홈페이지', value: 'www.samsung.com/sec', href: 'https://www.samsung.com/sec' },
      { label: '본사 주소', value: '경기도 수원시 영통구 삼성로 129 (매탄동)' },
    ])
  })

  it('홈페이지에 이미 스킴이 있으면 링크는 그대로, 표시는 스킴과 끝 슬래시를 뺀다', () => {
    const rows = profileRows({ ...full, homepage: 'http://www.ecoprobm.co.kr/' })
    expect(rows.find((row) => row.label === '홈페이지')).toEqual({
      label: '홈페이지',
      value: 'www.ecoprobm.co.kr',
      href: 'http://www.ecoprobm.co.kr/',
    })
  })

  it('결산월은 앞자리 0을 떼고, 1~12 밖이면 뺀다', () => {
    expect(profileRows({ ...full, fiscalMonth: '03' }).find((row) => row.label === '결산월')?.value).toBe('3월')
    expect(profileRows({ ...full, fiscalMonth: '13' }).some((row) => row.label === '결산월')).toBe(false)
  })

  it('null·빈 문자열·0 인 항목은 줄째 뺀다', () => {
    const rows = profileRows({
      ...full,
      ceoName: '  ',
      establishedOn: null,
      listedShares: 0,
      parValue: null,
      homepage: '',
      address: null,
    })
    expect(rows.map((row) => row.label)).toEqual(['상장일', '결산월'])
  })

  it('profile 자체가 없으면 빈 배열', () => {
    expect(profileRows(null)).toEqual([])
    expect(profileRows(undefined)).toEqual([])
  })
})
