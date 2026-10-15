import { describe, expect, it } from 'vitest'
import { localLogoUrl, logoSources, stockLogoUrl } from '@/lib/stockLogo'

describe('stockLogoUrl', () => {
  it('토스 CDN 경로에 티커를 그대로 붙인다', () => {
    expect(stockLogoUrl('005930')).toBe('https://static.toss.im/png-icons/securities/icn-sec-fill-005930.png')
  })
  it('경로에 못 들어가는 문자는 인코딩한다', () => {
    expect(stockLogoUrl('BRK/B')).toContain('icn-sec-fill-BRK%2FB.png')
  })
})

describe('localLogoUrl', () => {
  it('public/logos 아래 티커 이름 파일을 가리킨다', () => {
    expect(localLogoUrl('005930')).toBe('/logos/005930.png')
  })
})

describe('logoSources', () => {
  it('받아둔 파일을 먼저, CDN 을 다음에 둔다', () => {
    expect(logoSources('005930')).toEqual(['/logos/005930.png', stockLogoUrl('005930')])
  })
})
