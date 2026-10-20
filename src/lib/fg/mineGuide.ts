const GUIDE_KEY = 'fg.mine.guide'
const VIEWED_KEY = 'fg.mine.viewed'

export type GuideStepKey = 'star' | 'folder' | 'fill' | 'returns'

export interface GuideFacts {
  stocks: number
  folders: number
  filled: boolean
  viewed: boolean
}

export interface GuideStepState {
  key: GuideStepKey
  done: boolean
  ready: boolean
}

export const GUIDE_STEPS: Record<GuideStepKey, { title: string; hint: string }> = {
  star: { title: '별을 눌러 관심 종목 담기', hint: '종목 화면의 별을 누르면 여기로 모여요' },
  folder: { title: '나만의 테마 만들기', hint: '관심 종목을 골라 이름을 붙여 묶어요' },
  fill: { title: '테마에 종목 담기', hint: '편집을 누르고 종목마다 폴더 단추로 담아요' },
  returns: { title: '수익률과 종목별 기여 보기', hint: '테마 카드를 누르면 같은 비중 수익률과 누가 끌어올렸는지 보여요' },
}

export function guideState(facts: GuideFacts): GuideStepState[] {
  return [
    { key: 'star', done: facts.stocks > 0, ready: true },
    { key: 'folder', done: facts.folders > 0, ready: true },
    { key: 'fill', done: facts.filled, ready: facts.folders > 0 && facts.stocks > 0 },
    { key: 'returns', done: facts.viewed, ready: facts.filled },
  ]
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    return
  }
}

export function mineGuideClosed(): boolean {
  return readStorage(GUIDE_KEY) === 'closed'
}

export function closeMineGuide(): void {
  writeStorage(GUIDE_KEY, 'closed')
}

export function reopenMineGuide(): void {
  writeStorage(GUIDE_KEY, 'open')
}

export function folderViewed(): boolean {
  return readStorage(VIEWED_KEY) === 'seen'
}

export function markFolderViewed(): void {
  writeStorage(VIEWED_KEY, 'seen')
}
