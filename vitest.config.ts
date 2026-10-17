import path from 'node:path'
import { defineConfig } from 'vitest/config'

// vite.config.ts를 그대로 쓰지 않는다 — react/tailwind 플러그인은 순수 함수 테스트에 필요 없고 기동만 늦춘다
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // 날짜·시각 테스트가 실행 환경의 타임존을 따라가면 UTC 러너에서 9시간 밀려 깨진다.
    // 제품이 KST 기준으로 표시하므로 테스트도 KST 로 고정한다
    env: { TZ: 'Asia/Seoul' },
  },
})
