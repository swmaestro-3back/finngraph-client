import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// 커스텀 타이포 토큰(index.css --text-*)을 폰트 크기 그룹으로 등록한다.
// 안 하면 tailwind-merge가 text-caption을 색상으로 오인해
// text-foreground 같은 색 클래스와 충돌 처리하며 지워 버린다.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["micro", "caption", "body", "title", "display"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
