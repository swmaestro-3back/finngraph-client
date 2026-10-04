/** 글을 쓰는 중인 곳 — 여기서 누른 단축키는 글자이지 명령이 아니다 */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** 수식키 없이 그 키 하나만 눌렀는지 — 브라우저 단축키(⌘/ 등)는 건드리지 않는다 */
export function isBareKey(e: KeyboardEvent, key: string): boolean {
  return e.key === key && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)
}
