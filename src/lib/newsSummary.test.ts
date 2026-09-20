import { describe, expect, it } from 'vitest'
import { segmentByCompanies, splitSentences } from '@/lib/newsSummary'

describe('splitSentences', () => {
  it('종결 부호 뒤 공백을 기준으로 문장을 나눈다', () => {
    expect(splitSentences('비투엔이 인수한다. 지분율은 27.7%다. 상한가를 기록했다.')).toEqual([
      '비투엔이 인수한다.',
      '지분율은 27.7%다.',
      '상한가를 기록했다.',
    ])
  })

  it('숫자 안의 마침표와 공백 없는 마침표는 나누지 않는다', () => {
    expect(splitSentences('납입일은 9.28일이고 상장은 10월8일이다.')).toEqual([
      '납입일은 9.28일이고 상장은 10월8일이다.',
    ])
  })

  it('빈 문자열과 공백만 있는 조각은 버린다', () => {
    expect(splitSentences('')).toEqual([])
    expect(splitSentences('  첫 문장.   ')).toEqual(['첫 문장.'])
  })

  it('물음표·느낌표·줄바꿈도 문장 경계로 본다', () => {
    expect(splitSentences('정말인가? 그렇다!\n마지막이다.')).toEqual([
      '정말인가?',
      '그렇다!',
      '마지막이다.',
    ])
  })
})

describe('segmentByCompanies', () => {
  it('종목명이 없으면 통째로 텍스트 조각 하나다', () => {
    expect(segmentByCompanies('그냥 문장이다.', [])).toEqual([
      { kind: 'text', text: '그냥 문장이다.' },
    ])
  })

  it('모든 등장을 종목 조각으로 나눈다', () => {
    expect(segmentByCompanies('앤씨앤은 앤씨앤이다.', ['앤씨앤'])).toEqual([
      { kind: 'company', text: '앤씨앤' },
      { kind: 'text', text: '은 ' },
      { kind: 'company', text: '앤씨앤' },
      { kind: 'text', text: '이다.' },
    ])
  })

  it('긴 이름을 먼저 매칭해 부분 겹침을 막는다', () => {
    expect(segmentByCompanies('삼성전자우가 올랐다.', ['삼성전자', '삼성전자우'])).toEqual([
      { kind: 'company', text: '삼성전자우' },
      { kind: 'text', text: '가 올랐다.' },
    ])
  })

  it('정규식 특수문자가 든 이름도 안전하게 매칭한다', () => {
    expect(segmentByCompanies('A+B(주)가 있다.', ['A+B(주)'])).toEqual([
      { kind: 'company', text: 'A+B(주)' },
      { kind: 'text', text: '가 있다.' },
    ])
  })
})
